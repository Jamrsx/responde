<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\SyncBarangayMapsJob;
use App\Models\Lgu;
use App\Models\LguBarangayMap;
use App\Models\MapAsset;
use App\Models\MapSyncRun;
use App\Services\BarangayMapSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class MapController extends Controller
{
    public function index(BarangayMapSyncService $sync): Response
    {
        $sourceError = null;
        $sourceFiles = [];

        try {
            $sourceFiles = $sync->sourceFiles();
        } catch (Throwable $exception) {
            $sourceError = $exception->getMessage();
        }

        $storedHashes = LguBarangayMap::query()->pluck('source_hash', 'psgc_code');
        $missingPsgcs = array_values(array_diff(array_keys($sourceFiles), $storedHashes->keys()->all()));
        $outdatedPsgcs = [];

        foreach ($sourceFiles as $psgc => $file) {
            $storedHash = $storedHashes->get($psgc);

            if ($storedHash !== null && $storedHash !== ($file['sha'] ?? null)) {
                $outdatedPsgcs[] = $psgc;
            }
        }

        $registeredLgus = Lgu::query()
            ->whereNotNull('psgc_code')
            ->get(['id', 'name', 'psgc_code'])
            ->keyBy('psgc_code');
        $registeredMissing = $registeredLgus
            ->filter(fn (Lgu $lgu): bool => ! $storedHashes->has((string) $lgu->psgc_code))
            ->values();
        $municipalityMap = MapAsset::query()->where('key', 'ph-municities')->first();

        return Inertia::render('admin/maps/index', [
            'stats' => [
                'sourceTotal' => count($sourceFiles),
                'storedTotal' => $storedHashes->count(),
                'missingTotal' => count($missingPsgcs),
                'outdatedTotal' => count($outdatedPsgcs),
                'registeredMissingTotal' => $registeredMissing->count(),
            ],
            'municipalityMap' => $municipalityMap
                ? [
                    'ready' => true,
                    'featureCount' => $municipalityMap->feature_count,
                    'syncedAt' => $municipalityMap->synced_at?->diffForHumans(),
                ]
                : [
                    'ready' => false,
                    'featureCount' => 0,
                    'syncedAt' => null,
                ],
            'missingMaps' => collect($missingPsgcs)
                ->take(100)
                ->map(fn (string $psgc): array => [
                    'psgc' => $psgc,
                    'lguName' => $registeredLgus->get($psgc)?->name,
                ])
                ->values(),
            'outdatedMaps' => collect($outdatedPsgcs)
                ->take(100)
                ->map(fn (string $psgc): array => [
                    'psgc' => $psgc,
                    'lguName' => $registeredLgus->get($psgc)?->name,
                ])
                ->values(),
            'registeredMissing' => $registeredMissing->map(fn (Lgu $lgu): array => [
                'id' => $lgu->id,
                'name' => $lgu->name,
                'psgc' => $lgu->psgc_code,
            ]),
            'latestRun' => $this->formatRun(
                MapSyncRun::query()->with('requestedBy:id,name')->latest()->first(),
            ),
            'sourceError' => $sourceError,
        ]);
    }

    public function sync(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'mode' => ['required', Rule::in(['missing', 'registered', 'all'])],
        ]);

        $activeRun = MapSyncRun::query()
            ->whereIn('status', ['queued', 'running'])
            ->latest()
            ->first();

        if ($activeRun !== null) {
            return back()->with('error', 'A map sync is already queued or running.');
        }

        $run = MapSyncRun::query()->create([
            'requested_by_user_id' => $request->user()?->id,
            'mode' => $validated['mode'],
            'status' => 'queued',
        ]);

        SyncBarangayMapsJob::dispatch($run->id);

        Log::info('Admin queued barangay map sync.', [
            'map_sync_run_id' => $run->id,
            'mode' => $run->mode,
            'actor_user_id' => $request->user()?->id,
        ]);

        return back()->with('success', 'Map synchronization was queued.');
    }

    public function status(): JsonResponse
    {
        $run = MapSyncRun::query()
            ->with('requestedBy:id,name')
            ->latest()
            ->first();

        return response()->json(['run' => $this->formatRun($run)]);
    }

    public function startDownload(Request $request, BarangayMapSyncService $sync): JsonResponse
    {
        $validated = $request->validate([
            'mode' => ['required', Rule::in(['missing', 'registered', 'all'])],
            'force' => ['sometimes', 'boolean'],
        ]);

        $force = (bool) ($validated['force'] ?? true);

        $activeRun = MapSyncRun::query()
            ->whereIn('status', ['queued', 'running'])
            ->latest()
            ->first();

        if ($activeRun !== null) {
            $isStale = $activeRun->updated_at === null
                || $activeRun->updated_at->lt(now()->subSeconds(90));

            // Browser downloads die on refresh; always allow an intentional restart.
            if ($force || $isStale || $activeRun->status === 'queued') {
                Cache::forget($this->pendingCacheKey($activeRun->id));
                $activeRun->update([
                    'status' => 'failed',
                    'error_message' => $isStale
                        ? 'Stopped because the previous download stalled.'
                        : 'Replaced by a new map download.',
                    'completed_at' => now(),
                    'current_psgc' => null,
                ]);
            } else {
                return response()->json([
                    'message' => 'A map download is already running.',
                    'run' => $this->formatRun($activeRun),
                ], 409);
            }
        }

        try {
            $sourceFiles = $sync->sourceFiles(refresh: true);
            $scopedFiles = $this->scopeSourceFiles($sourceFiles, $validated['mode']);
            $selection = $sync->pendingFiles(
                $scopedFiles,
                missingOnly: $validated['mode'] === 'missing',
            );
        } catch (Throwable $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        // Progress should reflect actual download work left, not already-stored maps.
        $pendingCount = count($selection['pending']);
        $workTotal = $pendingCount + $selection['skipped'];

        $run = MapSyncRun::query()->create([
            'requested_by_user_id' => $request->user()?->id,
            'mode' => $validated['mode'],
            'status' => 'running',
            'source_total' => count($sourceFiles),
            'total' => max(1, $workTotal),
            'processed' => $selection['skipped'],
            'synced' => 0,
            'skipped' => $selection['skipped'],
            'failed' => 0,
            'started_at' => now(),
        ]);

        Cache::put(
            $this->pendingCacheKey($run->id),
            $selection['pending'],
            now()->addHours(2),
        );

        Log::info('Admin started realtime barangay map download.', [
            'map_sync_run_id' => $run->id,
            'mode' => $run->mode,
            'pending' => $pendingCount,
            'actor_user_id' => $request->user()?->id,
        ]);

        $done = $selection['pending'] === [];

        if ($done) {
            $run->update([
                'status' => 'completed',
                'completed_at' => now(),
                'current_psgc' => null,
                'processed' => $run->total,
            ]);
            Cache::forget($this->pendingCacheKey($run->id));
        }

        return response()->json([
            'done' => $done,
            'run' => $this->formatRun($run->fresh('requestedBy')),
            'remaining' => $pendingCount,
        ]);
    }

    public function cancelDownload(Request $request): JsonResponse
    {
        $activeRuns = MapSyncRun::query()
            ->whereIn('status', ['queued', 'running'])
            ->get();

        foreach ($activeRuns as $run) {
            Cache::forget($this->pendingCacheKey($run->id));
            $run->update([
                'status' => 'failed',
                'error_message' => 'Cancelled by admin.',
                'completed_at' => now(),
                'current_psgc' => null,
            ]);
        }

        Log::info('Admin cancelled map downloads.', [
            'cancelled' => $activeRuns->pluck('id')->all(),
            'actor_user_id' => $request->user()?->id,
        ]);

        return response()->json([
            'message' => 'Active map downloads were cancelled.',
            'cancelled' => $activeRuns->count(),
        ]);
    }

    public function downloadBatch(Request $request, BarangayMapSyncService $sync): JsonResponse
    {
        $validated = $request->validate([
            'run_id' => ['required', 'integer', 'exists:map_sync_runs,id'],
            'batch_size' => ['nullable', 'integer', 'min:5', 'max:40'],
        ]);

        $run = MapSyncRun::query()
            ->with('requestedBy:id,name')
            ->findOrFail($validated['run_id']);

        if (! in_array($run->status, ['running', 'queued'], true)) {
            return response()->json([
                'done' => true,
                'run' => $this->formatRun($run),
                'remaining' => 0,
            ]);
        }

        $pending = Cache::get($this->pendingCacheKey($run->id));

        if (! is_array($pending)) {
            $sourceFiles = $sync->sourceFiles();
            $scopedFiles = $this->scopeSourceFiles($sourceFiles, $run->mode);
            $pending = $sync->pendingFiles(
                $scopedFiles,
                missingOnly: $run->mode === 'missing',
            )['pending'];
        }

        if ($pending === []) {
            $run->update([
                'status' => $run->failed > 0 ? 'partial' : 'completed',
                'current_psgc' => null,
                'completed_at' => now(),
            ]);
            Cache::forget($this->pendingCacheKey($run->id));

            return response()->json([
                'done' => true,
                'run' => $this->formatRun($run->fresh('requestedBy')),
                'remaining' => 0,
            ]);
        }

        $batchSize = (int) ($validated['batch_size'] ?? 25);
        $batch = array_slice($pending, 0, $batchSize, true);
        $remaining = array_slice($pending, $batchSize, null, true);
        $result = $sync->syncBatch($batch);
        $errors = array_slice(
            array_merge($run->errors ?? [], $result['errors']),
            -50,
            null,
            true,
        );

        $run->increment('processed', count($batch));
        $run->increment('synced', $result['synced']);
        $run->increment('failed', $result['failed']);
        $run->update([
            'status' => 'running',
            'current_psgc' => array_key_last($batch),
            'errors' => $errors === [] ? null : $errors,
        ]);

        Cache::put($this->pendingCacheKey($run->id), $remaining, now()->addHours(2));

        $done = $remaining === [];

        if ($done) {
            $run->refresh();
            $run->update([
                'status' => $run->failed > 0 ? 'partial' : 'completed',
                'current_psgc' => null,
                'completed_at' => now(),
            ]);
            Cache::forget($this->pendingCacheKey($run->id));
        }

        return response()->json([
            'done' => $done,
            'run' => $this->formatRun($run->fresh('requestedBy')),
            'remaining' => count($remaining),
            'batchSynced' => $result['synced'],
            'batchFailed' => $result['failed'],
        ]);
    }

    /**
     * @param  array<string, array{name: string, download_url: string, sha: string|null}>  $files
     * @return array<string, array{name: string, download_url: string, sha: string|null}>
     */
    private function scopeSourceFiles(array $files, string $mode): array
    {
        if ($mode === 'all' || $mode === 'missing') {
            return $files;
        }

        $registeredPsgcs = Lgu::query()
            ->whereNotNull('psgc_code')
            ->pluck('psgc_code')
            ->map(fn (string $code): string => preg_replace('/\D+/', '', $code) ?? '')
            ->filter()
            ->all();

        return array_intersect_key($files, array_flip($registeredPsgcs));
    }

    private function pendingCacheKey(int $runId): string
    {
        return "maps.sync-run.{$runId}.pending";
    }

    /**
     * @return array<string, mixed>|null
     */
    private function formatRun(?MapSyncRun $run): ?array
    {
        if ($run === null) {
            return null;
        }

        $percent = $run->total > 0
            ? min(100, (int) round(($run->processed / $run->total) * 100))
            : 0;

        return [
            'id' => $run->id,
            'mode' => $run->mode,
            'status' => $run->status,
            'sourceTotal' => $run->source_total,
            'total' => $run->total,
            'processed' => $run->processed,
            'synced' => $run->synced,
            'skipped' => $run->skipped,
            'failed' => $run->failed,
            'currentPsgc' => $run->current_psgc,
            'percent' => $percent,
            'errors' => $run->errors ?? [],
            'errorMessage' => $run->error_message,
            'requestedBy' => $run->requestedBy?->name,
            'createdAt' => $run->created_at?->diffForHumans(),
            'completedAt' => $run->completed_at?->diffForHumans(),
        ];
    }
}

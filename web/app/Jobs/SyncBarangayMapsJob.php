<?php

namespace App\Jobs;

use App\Models\Lgu;
use App\Models\MapSyncRun;
use App\Services\BarangayMapSyncService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class SyncBarangayMapsJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 1800;

    public int $tries = 2;

    public function __construct(public int $runId) {}

    public function handle(BarangayMapSyncService $sync): void
    {
        $run = MapSyncRun::query()->findOrFail($this->runId);
        $run->update([
            'status' => 'running',
            'started_at' => now(),
            'error_message' => null,
        ]);

        $files = $sync->sourceFiles(refresh: true);
        $run->source_total = count($files);

        if ($run->mode === 'registered') {
            $registeredPsgcs = Lgu::query()
                ->whereNotNull('psgc_code')
                ->pluck('psgc_code')
                ->map(fn (string $code): string => preg_replace('/\D+/', '', $code) ?? '')
                ->filter()
                ->all();
            $files = array_intersect_key($files, array_flip($registeredPsgcs));
        }

        $selection = $sync->pendingFiles(
            $files,
            missingOnly: $run->mode === 'missing',
        );
        $pending = $selection['pending'];
        $run->fill([
            'total' => count($files),
            'processed' => $selection['skipped'],
            'skipped' => $selection['skipped'],
        ])->save();

        $errors = [];

        foreach (array_chunk($pending, 15, true) as $batch) {
            $result = $sync->syncBatch($batch);
            $errors = array_slice(
                array_merge($errors, $result['errors']),
                -50,
                null,
                true,
            );

            $run->increment('processed', count($batch));
            $run->increment('synced', $result['synced']);
            $run->increment('failed', $result['failed']);
            $run->update([
                'current_psgc' => array_key_last($batch),
                'errors' => $errors === [] ? null : $errors,
            ]);
        }

        $run->refresh();
        $run->update([
            'status' => $run->failed > 0 ? 'partial' : 'completed',
            'current_psgc' => null,
            'completed_at' => now(),
        ]);
    }

    public function failed(?Throwable $exception): void
    {
        MapSyncRun::query()
            ->whereKey($this->runId)
            ->update([
                'status' => 'failed',
                'error_message' => $exception?->getMessage() ?? 'The queued map sync failed.',
                'completed_at' => now(),
            ]);
    }
}

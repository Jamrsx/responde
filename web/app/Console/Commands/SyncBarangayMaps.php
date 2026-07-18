<?php

namespace App\Console\Commands;

use App\Models\Lgu;
use App\Models\LguBarangayMap;
use Illuminate\Console\Command;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class SyncBarangayMaps extends Command
{
    private const SOURCE_INDEX = 'https://api.github.com/repos/faeldon/philippines-json-maps/contents/2023/geojson/municities/lowres';

    private const USER_AGENT = 'responde-barangay-map-sync';

    protected $signature = 'maps:sync-barangays
        {--psgc= : Sync one city or municipality PSGC code}
        {--registered-only : Sync only LGUs registered in Responde (default)}
        {--all : Sync every barangay map found in the source}
        {--force : Download maps even when the source hash is unchanged}
        {--concurrency=10 : Number of maps downloaded in each concurrent batch}
        {--also-files : Also write public/maps/barangays/*.json files}';

    protected $description = 'Download and cache official LGU barangay GeoJSON maps';

    public function handle(): int
    {
        $psgc = preg_replace('/\D+/', '', (string) $this->option('psgc')) ?? '';
        $syncAll = (bool) $this->option('all');
        $concurrency = max(1, min(25, (int) $this->option('concurrency')));

        if ($psgc !== '' && strlen($psgc) !== 10) {
            $this->error('The --psgc value must contain exactly 10 digits.');

            return self::FAILURE;
        }

        if ($syncAll && $psgc !== '') {
            $this->error('Use either --all or --psgc, not both.');

            return self::FAILURE;
        }

        $this->components->info('Listing barangay maps from the source...');

        try {
            $files = $this->sourceFiles();
        } catch (Throwable $exception) {
            $this->error("Unable to list source maps: {$exception->getMessage()}");

            return self::FAILURE;
        }

        $files = $this->scopeFiles($files, $psgc, $syncAll);

        if ($files === []) {
            $this->warn('No matching barangay map files were found.');

            return self::SUCCESS;
        }

        $existingHashes = LguBarangayMap::query()
            ->whereIn('psgc_code', array_keys($files))
            ->pluck('source_hash', 'psgc_code');

        $force = (bool) $this->option('force');
        $pending = [];
        $skipped = 0;

        foreach ($files as $code => $file) {
            if (! $force && $existingHashes->get($code) === ($file['sha'] ?? null)) {
                $skipped++;

                continue;
            }

            $pending[$code] = $file;
        }

        $total = count($files);
        $this->line(sprintf(
            'Found %d map(s): %d to download, %d already up to date. Concurrency: %d.',
            $total,
            count($pending),
            $skipped,
            $concurrency,
        ));

        $progress = $this->output->createProgressBar($total);
        $progress->setFormat(' %current%/%max% [%bar%] %percent:3s%%  %message%');
        $progress->setMessage($skipped > 0 ? "{$skipped} cached" : 'Starting');
        $progress->start();

        if ($skipped > 0) {
            $progress->advance($skipped);
        }

        $synced = 0;
        $failed = 0;

        foreach (array_chunk($pending, $concurrency, true) as $batch) {
            $responses = Http::pool(function (Pool $pool) use ($batch): array {
                $requests = [];

                foreach ($batch as $code => $file) {
                    $requests[] = $pool
                        ->as($code)
                        ->withHeaders([
                            'Accept' => 'application/json',
                            'User-Agent' => self::USER_AGENT,
                        ])
                        ->timeout(45)
                        ->retry(3, 500)
                        ->get($file['download_url']);
                }

                return $requests;
            });

            foreach ($batch as $code => $file) {
                $progress->setMessage("PSGC {$code}");

                try {
                    $response = $responses[$code] ?? null;

                    if (! $response instanceof Response || ! $response->successful()) {
                        $status = $response instanceof Response ? $response->status() : 'network error';
                        throw new RuntimeException("download failed ({$status})");
                    }

                    $geojson = $this->normalizeGeoJson($response->json(), $code);
                    $encoded = json_encode(
                        $geojson,
                        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR,
                    );

                    LguBarangayMap::query()->updateOrCreate(
                        ['psgc_code' => $code],
                        [
                            'barangay_count' => count($geojson['features']),
                            'geojson' => $encoded,
                            'source_hash' => $file['sha'] ?? hash('sha256', $encoded),
                            'synced_at' => now(),
                        ],
                    );

                    if ((bool) $this->option('also-files')) {
                        $directory = public_path('maps/barangays');
                        File::ensureDirectoryExists($directory);
                        File::put("{$directory}/{$code}.json", $encoded);
                    }

                    $synced++;
                } catch (Throwable $exception) {
                    $failed++;
                    $progress->clear();
                    $this->newLine();
                    $this->warn("PSGC {$code}: {$exception->getMessage()}");
                    $progress->display();
                }

                $progress->advance();
            }
        }

        $progress->setMessage('Complete');
        $progress->finish();
        $this->newLine(2);
        $this->components->info(
            "Barangay map sync complete: {$synced} synced, {$skipped} unchanged, {$failed} failed.",
        );

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }

    /**
     * @return array<string, array{name: string, download_url: string, sha: string|null}>
     */
    private function sourceFiles(): array
    {
        $response = Http::acceptJson()
            ->withUserAgent(self::USER_AGENT)
            ->timeout(45)
            ->retry(3, 750)
            ->get(self::SOURCE_INDEX)
            ->throw();

        $files = [];

        foreach ($response->json() as $file) {
            $name = (string) ($file['name'] ?? '');

            if (! preg_match('/^bgysubmuns-municity-(\d{10})/', $name, $matches)) {
                continue;
            }

            $downloadUrl = (string) ($file['download_url'] ?? '');

            if ($downloadUrl === '') {
                continue;
            }

            $files[$matches[1]] = [
                'name' => $name,
                'download_url' => $downloadUrl,
                'sha' => isset($file['sha']) ? (string) $file['sha'] : null,
            ];
        }

        ksort($files);

        return $files;
    }

    /**
     * @param  array<string, array{name: string, download_url: string, sha: string|null}>  $files
     * @return array<string, array{name: string, download_url: string, sha: string|null}>
     */
    private function scopeFiles(array $files, string $psgc, bool $syncAll): array
    {
        if ($psgc !== '') {
            return isset($files[$psgc]) ? [$psgc => $files[$psgc]] : [];
        }

        if ($syncAll) {
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

    /**
     * @param  array<string, mixed>  $source
     * @return array{
     *     type: string,
     *     properties: array{lgu_psgc: string, count: int},
     *     features: array<int, array<string, mixed>>
     * }
     */
    private function normalizeGeoJson(array $source, string $psgc): array
    {
        $features = [];

        foreach ($source['features'] ?? [] as $feature) {
            $properties = $feature['properties'] ?? [];
            $barangayPsgc = preg_replace(
                '/\D+/',
                '',
                (string) ($properties['adm4_psgc'] ?? ''),
            ) ?? '';
            $name = trim((string) ($properties['adm4_en'] ?? ''));

            if ($barangayPsgc === '' || $name === '') {
                continue;
            }

            $features[] = [
                'type' => 'Feature',
                'properties' => [
                    'psgc' => $barangayPsgc,
                    'name' => $name,
                    'lgu_psgc' => (string) (
                        $properties['adm3_psgc']
                        ?? $properties['adm2_psgc']
                        ?? $psgc
                    ),
                    'area_km2' => $properties['area_km2'] ?? 0,
                ],
                'geometry' => $feature['geometry'] ?? null,
            ];
        }

        if ($features === []) {
            throw new RuntimeException('source contained no valid barangay features');
        }

        return [
            'type' => 'FeatureCollection',
            'properties' => [
                'lgu_psgc' => $psgc,
                'count' => count($features),
            ],
            'features' => $features,
        ];
    }
}

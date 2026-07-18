<?php

namespace App\Services;

use App\Models\LguBarangayMap;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class BarangayMapSyncService
{
    private const SOURCE_TREE = 'https://api.github.com/repos/faeldon/philippines-json-maps/git/trees/master?recursive=1';

    private const USER_AGENT = 'responde-barangay-map-sync';

    private const MAP_PATH_PREFIX = '2023/geojson/municities/lowres/bgysubmuns-municity-';

    private const RAW_BASE = 'https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/';

    private const INVENTORY_CACHE_KEY = 'maps.barangays.source-inventory';

    /**
     * @return array<string, array{name: string, download_url: string, sha: string|null}>
     */
    public function sourceFiles(bool $refresh = false): array
    {
        if ($refresh) {
            Cache::forget(self::INVENTORY_CACHE_KEY);
        }

        return Cache::remember(
            self::INVENTORY_CACHE_KEY,
            now()->addHour(),
            fn (): array => $this->fetchSourceFiles(),
        );
    }

    /**
     * @param  array<string, array{name: string, download_url: string, sha: string|null}>  $files
     * @return array{
     *     pending: array<string, array{name: string, download_url: string, sha: string|null}>,
     *     skipped: int
     * }
     */
    public function pendingFiles(
        array $files,
        bool $force = false,
        bool $missingOnly = false,
    ): array {
        $existingHashes = LguBarangayMap::query()
            ->whereIn('psgc_code', array_keys($files))
            ->pluck('source_hash', 'psgc_code');

        $pending = [];
        $skipped = 0;

        foreach ($files as $code => $file) {
            $existingHash = $existingHashes->get($code);
            $shouldSkip = $missingOnly
                ? $existingHash !== null
                : ! $force && $existingHash === ($file['sha'] ?? null);

            if ($shouldSkip) {
                $skipped++;

                continue;
            }

            $pending[$code] = $file;
        }

        return ['pending' => $pending, 'skipped' => $skipped];
    }

    /**
     * @param  array<string, array{name: string, download_url: string, sha: string|null}>  $batch
     * @return array{synced: int, failed: int, errors: array<string, string>}
     */
    public function syncBatch(array $batch): array
    {
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

        $synced = 0;
        $failed = 0;
        $errors = [];

        foreach ($batch as $code => $file) {
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
                $synced++;
            } catch (Throwable $exception) {
                $failed++;
                $errors[$code] = $exception->getMessage();
            }
        }

        return compact('synced', 'failed', 'errors');
    }

    /**
     * @return array<string, array{name: string, download_url: string, sha: string|null}>
     */
    private function fetchSourceFiles(): array
    {
        $response = Http::acceptJson()
            ->withUserAgent(self::USER_AGENT)
            ->timeout(90)
            ->retry(3, 750)
            ->get(self::SOURCE_TREE)
            ->throw();

        if ($response->json('truncated') === true) {
            throw new RuntimeException('GitHub returned a truncated repository tree.');
        }

        $files = [];

        foreach ($response->json('tree') ?? [] as $file) {
            $path = (string) ($file['path'] ?? '');

            if (
                ! str_starts_with($path, self::MAP_PATH_PREFIX)
                || ! preg_match('/bgysubmuns-municity-(\d{9,10})\.0\.001\.json$/', $path, $matches)
            ) {
                continue;
            }

            $psgc = str_pad($matches[1], 10, '0', STR_PAD_LEFT);
            $files[$psgc] = [
                'name' => basename($path),
                'download_url' => self::RAW_BASE.$path,
                'sha' => isset($file['sha']) ? (string) $file['sha'] : null,
            ];
        }

        ksort($files);

        return $files;
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
        $isEmptyCollection = (
            ($source['type'] ?? null) === 'FeatureCollection'
            && is_array($source['features'] ?? null)
        ) || (
            ($source['type'] ?? null) === 'GeometryCollection'
            && is_array($source['geometries'] ?? null)
            && $source['geometries'] === []
        );

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

        if ($features === [] && ! $isEmptyCollection) {
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

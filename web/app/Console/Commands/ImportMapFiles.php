<?php

namespace App\Console\Commands;

use App\Models\LguBarangayMap;
use App\Models\MapAsset;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use JsonException;
use SplFileInfo;
use Throwable;

class ImportMapFiles extends Command
{
    protected $signature = 'maps:import-files
        {--force : Replace database rows that already exist}';

    protected $description = 'Import legacy public map JSON files into the database';

    public function handle(): int
    {
        $mapsDirectory = public_path('maps');

        if (! File::isDirectory($mapsDirectory)) {
            $this->warn('No public/maps directory exists. Nothing to import.');

            return self::SUCCESS;
        }

        $force = (bool) $this->option('force');
        $failed = 0;

        $municipalitiesPath = "{$mapsDirectory}/ph-municities.json";

        if (File::isFile($municipalitiesPath)) {
            try {
                $this->importAsset($municipalitiesPath, $force);
                $this->components->info('Imported nationwide municipality map.');
            } catch (Throwable $exception) {
                $failed++;
                $this->error("Municipality map import failed: {$exception->getMessage()}");
            }
        }

        $barangaysDirectory = "{$mapsDirectory}/barangays";
        $files = collect(
            File::isDirectory($barangaysDirectory)
                ? File::files($barangaysDirectory)
                : [],
        )
            ->filter(fn (SplFileInfo $file): bool => preg_match('/^\d{9,10}\.json$/', $file->getFilename()) === 1)
            ->values();

        if ($files->isEmpty()) {
            $this->warn('No legacy barangay map files were found.');

            return $failed > 0 ? self::FAILURE : self::SUCCESS;
        }

        $this->line("Importing {$files->count()} barangay map file(s)...");
        $progress = $this->output->createProgressBar($files->count());
        $progress->setFormat(' %current%/%max% [%bar%] %percent:3s%%  %message%');
        $progress->setMessage('Starting');
        $progress->start();

        $imported = 0;
        $skipped = 0;

        foreach ($files as $file) {
            $psgc = str_pad($file->getBasename('.json'), 10, '0', STR_PAD_LEFT);
            $progress->setMessage("PSGC {$psgc}");

            try {
                $exists = LguBarangayMap::query()
                    ->where('psgc_code', $psgc)
                    ->exists();

                if ($exists && ! $force) {
                    $skipped++;
                    $progress->advance();

                    continue;
                }

                $payload = File::get($file->getPathname());
                $decoded = $this->decodeFeatureCollection($payload);

                LguBarangayMap::query()->updateOrCreate(
                    ['psgc_code' => $psgc],
                    [
                        'barangay_count' => count($decoded['features']),
                        'geojson' => $payload,
                        'source_hash' => hash('sha256', $payload),
                        'synced_at' => now(),
                    ],
                );
                $imported++;
            } catch (Throwable $exception) {
                $failed++;
                $progress->clear();
                $this->newLine();
                $this->warn("{$file->getFilename()}: {$exception->getMessage()}");
                $progress->display();
            }

            $progress->advance();
        }

        $progress->setMessage('Complete');
        $progress->finish();
        $this->newLine(2);
        $this->components->info(
            "{$imported} imported, {$skipped} already stored, {$failed} failed.",
        );

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }

    private function importAsset(string $path, bool $force): void
    {
        if (! $force && MapAsset::query()->where('key', 'ph-municities')->exists()) {
            return;
        }

        $payload = File::get($path);
        $decoded = $this->decodeFeatureCollection($payload);

        MapAsset::query()->updateOrCreate(
            ['key' => 'ph-municities'],
            [
                'feature_count' => count($decoded['features']),
                'geojson' => $payload,
                'source_hash' => hash('sha256', $payload),
                'synced_at' => now(),
            ],
        );
    }

    /**
     * @return array{type: string, features: array<int, mixed>}
     */
    private function decodeFeatureCollection(string $payload): array
    {
        try {
            $decoded = json_decode($payload, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new JsonException("Invalid JSON: {$exception->getMessage()}");
        }

        if (
            ! is_array($decoded)
            || ($decoded['type'] ?? null) !== 'FeatureCollection'
            || ! is_array($decoded['features'] ?? null)
        ) {
            throw new JsonException('Expected a GeoJSON FeatureCollection.');
        }

        return $decoded;
    }
}

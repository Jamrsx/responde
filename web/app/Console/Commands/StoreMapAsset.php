<?php

namespace App\Console\Commands;

use App\Models\MapAsset;
use Illuminate\Console\Command;
use JsonException;

class StoreMapAsset extends Command
{
    protected $signature = 'maps:store-asset {key : Stable asset key, such as ph-municities}';

    protected $description = 'Store a GeoJSON map asset read from standard input';

    public function handle(): int
    {
        $key = strtolower(trim((string) $this->argument('key')));

        if (preg_match('/^[a-z0-9][a-z0-9-]{1,99}$/', $key) !== 1) {
            $this->error('The asset key may contain only lowercase letters, numbers, and hyphens.');

            return self::FAILURE;
        }

        $payload = stream_get_contents(STDIN);

        if (! is_string($payload) || trim($payload) === '') {
            $this->error('No GeoJSON was provided on standard input.');

            return self::FAILURE;
        }

        try {
            $decoded = json_decode($payload, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            $this->error("Invalid JSON: {$exception->getMessage()}");

            return self::FAILURE;
        }

        if (
            ! is_array($decoded)
            || ($decoded['type'] ?? null) !== 'FeatureCollection'
            || ! is_array($decoded['features'] ?? null)
        ) {
            $this->error('The payload must be a GeoJSON FeatureCollection.');

            return self::FAILURE;
        }

        MapAsset::query()->updateOrCreate(
            ['key' => $key],
            [
                'feature_count' => count($decoded['features']),
                'geojson' => $payload,
                'source_hash' => hash('sha256', $payload),
                'synced_at' => now(),
            ],
        );

        $this->components->info(
            sprintf('Stored map asset "%s" with %d feature(s).', $key, count($decoded['features'])),
        );

        return self::SUCCESS;
    }
}

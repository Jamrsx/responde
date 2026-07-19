<?php

namespace App\Support;

use App\Models\Emergency;
use App\Models\EmergencyType;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class HighRiskAreaDetector
{
    public const RADIUS_METERS = 500;

    public const ACCIDENT_MIN_COUNT = 5;

    public const ACCIDENT_WINDOW_DAYS = 7;

    public const FIRE_MIN_COUNT = 3;

    public const FIRE_WINDOW_DAYS = 30;

    public const CACHE_SECONDS = 60;

    /**
     * Approximate cell size for 500m neighbor searches (~280m).
     */
    private const GRID_CELL_DEGREES = 0.0025;

    /**
     * @return array{
     *     areas: list<array<string, mixed>>,
     *     warnings: list<array<string, mixed>>,
     *     summary: array<string, mixed>,
     *     generated_at: string
     * }
     */
    public function detectNationwide(bool $forceRefresh = false): array
    {
        $cacheKey = $this->cacheKey();

        if ($forceRefresh) {
            Cache::forget($cacheKey);
        }

        return Cache::remember(
            $cacheKey,
            self::CACHE_SECONDS,
            fn (): array => $this->compute(),
        );
    }

    public function forget(): void
    {
        Cache::forget($this->cacheKey());
    }

    /**
     * @return array{
     *     areas: list<array<string, mixed>>,
     *     warnings: list<array<string, mixed>>,
     *     summary: array<string, mixed>,
     *     generated_at: string
     * }
     */
    private function compute(): array
    {
        $windowEnd = now();
        $accidentWindowStart = $windowEnd->copy()->subDays(self::ACCIDENT_WINDOW_DAYS);
        $fireWindowStart = $windowEnd->copy()->subDays(self::FIRE_WINDOW_DAYS);

        $typeIds = EmergencyType::query()
            ->whereIn('code', ['accident', 'house_fire'])
            ->pluck('id', 'code');

        $accidentTypeId = $typeIds->get('accident');
        $fireTypeId = $typeIds->get('house_fire');

        $accidentAreas = [];
        $accidentPingCount = 0;

        if ($accidentTypeId !== null) {
            $accidents = $this->loadPings((int) $accidentTypeId, $accidentWindowStart, $windowEnd);
            $accidentPingCount = $accidents->count();
            $accidentAreas = $this->buildHighRiskAreas(
                category: 'accident',
                label: 'Accident high-risk',
                points: $accidents,
                minCount: self::ACCIDENT_MIN_COUNT,
                windowDays: self::ACCIDENT_WINDOW_DAYS,
                windowStart: $accidentWindowStart,
                windowEnd: $windowEnd,
            );
        } else {
            Log::warning('Accident emergency type is missing; accident high-risk detection skipped.');
        }

        $fireAreas = [];
        $fireWarnings = [];
        $firePingCount = 0;

        if ($fireTypeId !== null) {
            $fires = $this->loadPings((int) $fireTypeId, $fireWindowStart, $windowEnd);
            $firePingCount = $fires->count();
            $fireAreas = $this->buildHighRiskAreas(
                category: 'fire',
                label: 'Fire high-risk',
                points: $fires,
                minCount: self::FIRE_MIN_COUNT,
                windowDays: self::FIRE_WINDOW_DAYS,
                windowStart: $fireWindowStart,
                windowEnd: $windowEnd,
            );

            $highRiskFireIds = collect($fireAreas)
                ->flatMap(fn (array $area): array => $area['emergency_ids'] ?? [])
                ->flip();

            $fireWarnings = $fires
                ->reject(fn (Emergency $fire): bool => $highRiskFireIds->has($fire->id))
                ->values()
                ->map(fn (Emergency $fire): array => $this->serializeWarning($fire, $fireWindowStart, $windowEnd))
                ->all();
        } else {
            Log::warning('House fire emergency type is missing; fire high-risk detection skipped.');
        }

        $areas = collect([...$accidentAreas, ...$fireAreas])
            ->sortByDesc('count')
            ->values()
            ->map(function (array $area): array {
                unset($area['emergency_ids']);

                return $area;
            })
            ->all();

        Log::info('[Responde] Nationwide high-risk areas detected', [
            'accident_ping_count' => $accidentPingCount,
            'fire_ping_count' => $firePingCount,
            'accident_area_count' => count($accidentAreas),
            'fire_area_count' => count($fireAreas),
            'fire_warning_count' => count($fireWarnings),
        ]);

        return [
            'areas' => $areas,
            'warnings' => $fireWarnings,
            'summary' => [
                'high_risk_area_count' => count($areas),
                'accident_area_count' => count($accidentAreas),
                'fire_area_count' => count($fireAreas),
                'fire_warning_count' => count($fireWarnings),
                'accident_ping_count' => $accidentPingCount,
                'fire_ping_count' => $firePingCount,
                'accident_threshold' => self::ACCIDENT_MIN_COUNT,
                'accident_window_days' => self::ACCIDENT_WINDOW_DAYS,
                'fire_threshold' => self::FIRE_MIN_COUNT,
                'fire_window_days' => self::FIRE_WINDOW_DAYS,
                'radius_meters' => self::RADIUS_METERS,
                'accident_window_start' => $accidentWindowStart->toIso8601String(),
                'accident_window_end' => $windowEnd->toIso8601String(),
                'fire_window_start' => $fireWindowStart->toIso8601String(),
                'fire_window_end' => $windowEnd->toIso8601String(),
            ],
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * @return Collection<int, Emergency>
     */
    private function loadPings(
        int $emergencyTypeId,
        CarbonInterface $windowStart,
        CarbonInterface $windowEnd,
    ): Collection {
        return Emergency::query()
            ->with([
                'barangay:id,name',
                'lgu:id,name',
            ])
            ->where('emergency_type_id', $emergencyTypeId)
            ->where('status', '!=', 'cancelled')
            ->where('created_at', '>=', $windowStart)
            ->where('created_at', '<=', $windowEnd)
            ->orderBy('created_at')
            ->get([
                'id',
                'lgu_id',
                'barangay_id',
                'latitude',
                'longitude',
                'address_text',
                'created_at',
            ]);
    }

    /**
     * @param  Collection<int, Emergency>  $points
     * @return list<array<string, mixed>>
     */
    private function buildHighRiskAreas(
        string $category,
        string $label,
        Collection $points,
        int $minCount,
        int $windowDays,
        CarbonInterface $windowStart,
        CarbonInterface $windowEnd,
    ): array {
        return $this->cluster($points)
            ->filter(fn (Collection $cluster): bool => $cluster->count() >= $minCount)
            ->values()
            ->map(function (Collection $cluster, int $index) use (
                $category,
                $label,
                $minCount,
                $windowDays,
                $windowStart,
                $windowEnd,
            ): array {
                $lat = round((float) $cluster->avg(fn (Emergency $item): float => (float) $item->latitude), 7);
                $lng = round((float) $cluster->avg(fn (Emergency $item): float => (float) $item->longitude), 7);
                $latest = $cluster
                    ->sortByDesc(fn (Emergency $item) => $item->created_at?->timestamp ?? 0)
                    ->first();

                $lgus = $cluster
                    ->map(fn (Emergency $item): ?string => $item->lgu?->name)
                    ->filter()
                    ->unique()
                    ->values()
                    ->take(5)
                    ->all();

                $barangays = $cluster
                    ->map(fn (Emergency $item): ?string => $item->barangay?->name)
                    ->filter()
                    ->unique()
                    ->values()
                    ->take(5)
                    ->all();

                $addresses = $cluster
                    ->map(fn (Emergency $item): ?string => $item->address_text)
                    ->filter()
                    ->unique()
                    ->values()
                    ->take(3)
                    ->all();

                return [
                    'id' => "{$category}-".($index + 1).'-'.substr(md5("{$lat}:{$lng}"), 0, 8),
                    'category' => $category,
                    'label' => $label,
                    'severity' => 'high',
                    'latitude' => $lat,
                    'longitude' => $lng,
                    'radius_meters' => self::RADIUS_METERS,
                    'count' => $cluster->count(),
                    'threshold' => $minCount,
                    'window_days' => $windowDays,
                    'latest_at' => $latest?->created_at?->toIso8601String(),
                    'latest_at_human' => $latest?->created_at?->diffForHumans(),
                    'lgus' => array_values($lgus),
                    'barangays' => array_values($barangays),
                    'sample_addresses' => array_values($addresses),
                    'window_start' => $windowStart->toIso8601String(),
                    'window_end' => $windowEnd->toIso8601String(),
                    'reason' => $category === 'accident'
                        ? "{$cluster->count()} accident pings within ".self::RADIUS_METERS."m in {$windowDays} days"
                        : "{$cluster->count()} house-fire pings within ".self::RADIUS_METERS."m in {$windowDays} days",
                    'emergency_ids' => $cluster->pluck('id')->all(),
                ];
            })
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeWarning(
        Emergency $fire,
        CarbonInterface $windowStart,
        CarbonInterface $windowEnd,
    ): array {
        return [
            'id' => 'fire-warning-'.$fire->id,
            'category' => 'fire',
            'label' => 'Fire warning',
            'severity' => 'warning',
            'latitude' => (float) $fire->latitude,
            'longitude' => (float) $fire->longitude,
            'radius_meters' => self::RADIUS_METERS,
            'count' => 1,
            'threshold' => self::FIRE_MIN_COUNT,
            'window_days' => self::FIRE_WINDOW_DAYS,
            'latest_at' => $fire->created_at?->toIso8601String(),
            'latest_at_human' => $fire->created_at?->diffForHumans(),
            'lgus' => array_values(array_filter([$fire->lgu?->name])),
            'barangays' => array_values(array_filter([$fire->barangay?->name])),
            'sample_addresses' => array_values(array_filter([$fire->address_text])),
            'window_start' => $windowStart->toIso8601String(),
            'window_end' => $windowEnd->toIso8601String(),
            'reason' => 'House-fire ping recorded. Becomes high-risk at '.self::FIRE_MIN_COUNT.' within '.self::RADIUS_METERS.'m in '.self::FIRE_WINDOW_DAYS.' days.',
        ];
    }

    /**
     * Grid-accelerated connected clustering with exact Haversine confirmation.
     *
     * @param  Collection<int, Emergency>  $points
     * @return Collection<int, Collection<int, Emergency>>
     */
    private function cluster(Collection $points): Collection
    {
        $indexed = $points->values();
        $grid = [];

        foreach ($indexed as $index => $point) {
            $key = $this->gridKey((float) $point->latitude, (float) $point->longitude);
            $grid[$key][] = $index;
        }

        $visited = [];
        $clusters = collect();

        foreach ($indexed as $index => $point) {
            if (isset($visited[$index])) {
                continue;
            }

            $queue = [$index];
            $visited[$index] = true;
            $cluster = collect();

            while ($queue !== []) {
                $currentIndex = array_shift($queue);
                /** @var Emergency $current */
                $current = $indexed[$currentIndex];
                $cluster->push($current);

                foreach ($this->neighborIndexes($grid, (float) $current->latitude, (float) $current->longitude) as $candidateIndex) {
                    if (isset($visited[$candidateIndex])) {
                        continue;
                    }

                    /** @var Emergency $candidate */
                    $candidate = $indexed[$candidateIndex];

                    if ($this->distanceMeters(
                        (float) $current->latitude,
                        (float) $current->longitude,
                        (float) $candidate->latitude,
                        (float) $candidate->longitude,
                    ) <= self::RADIUS_METERS) {
                        $visited[$candidateIndex] = true;
                        $queue[] = $candidateIndex;
                    }
                }
            }

            $clusters->push($cluster);
        }

        return $clusters;
    }

    /**
     * @param  array<string, list<int>>  $grid
     * @return list<int>
     */
    private function neighborIndexes(array $grid, float $latitude, float $longitude): array
    {
        $latCell = (int) floor($latitude / self::GRID_CELL_DEGREES);
        $lngCell = (int) floor($longitude / self::GRID_CELL_DEGREES);
        $neighbors = [];

        // Cover at least 500m with ~278m cells (needs ±2).
        for ($latOffset = -2; $latOffset <= 2; $latOffset++) {
            for ($lngOffset = -2; $lngOffset <= 2; $lngOffset++) {
                $key = ($latCell + $latOffset).':'.($lngCell + $lngOffset);

                if (! isset($grid[$key])) {
                    continue;
                }

                foreach ($grid[$key] as $index) {
                    $neighbors[] = $index;
                }
            }
        }

        return $neighbors;
    }

    private function gridKey(float $latitude, float $longitude): string
    {
        return ((int) floor($latitude / self::GRID_CELL_DEGREES)).':'.((int) floor($longitude / self::GRID_CELL_DEGREES));
    }

    private function distanceMeters(
        float $lat1,
        float $lng1,
        float $lat2,
        float $lng2,
    ): float {
        $earthRadius = 6_371_000;
        $latFrom = deg2rad($lat1);
        $latTo = deg2rad($lat2);
        $latDelta = deg2rad($lat2 - $lat1);
        $lngDelta = deg2rad($lng2 - $lng1);

        $a = sin($latDelta / 2) ** 2
            + cos($latFrom) * cos($latTo) * sin($lngDelta / 2) ** 2;

        return 2 * $earthRadius * asin(min(1, sqrt($a)));
    }

    private function cacheKey(): string
    {
        return 'responde:high-risk:nationwide';
    }
}

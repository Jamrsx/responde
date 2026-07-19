<?php

namespace App\Support;

use App\Models\EmergencyAssignment;
use App\Models\Station;
use Illuminate\Support\Collection;

class StationSatisfactionScore
{
    public const BASE_SCORE = 50;

    public const MAX_SCORE = 100;

    /**
     * @return array{
     *     score: int,
     *     average_rating: float|null,
     *     rating_count: int,
     *     has_ratings: bool
     * }
     */
    public static function forStation(Station|int $station): array
    {
        $stationId = $station instanceof Station ? $station->id : $station;

        $ratings = EmergencyAssignment::query()
            ->where('station_id', $stationId)
            ->where('status', 'completed')
            ->whereNotNull('public_rating')
            ->pluck('public_rating');

        return self::fromRatings($ratings);
    }

    /**
     * @param  Collection<int, int|float|string|null>  $ratings
     * @return array{
     *     score: int,
     *     average_rating: float|null,
     *     rating_count: int,
     *     has_ratings: bool
     * }
     */
    public static function fromRatings(Collection $ratings): array
    {
        $valid = $ratings
            ->map(fn ($rating): int => (int) $rating)
            ->filter(fn (int $rating): bool => $rating >= 1 && $rating <= 5)
            ->values();

        return self::fromAverage(
            $valid->isEmpty() ? null : (float) $valid->avg(),
            $valid->count(),
        );
    }

    /**
     * @return array{
     *     score: int,
     *     average_rating: float|null,
     *     rating_count: int,
     *     has_ratings: bool
     * }
     */
    public static function fromAverage(?float $average, int $ratingCount): array
    {
        if ($average === null || $ratingCount < 1) {
            return [
                'score' => self::BASE_SCORE,
                'average_rating' => null,
                'rating_count' => 0,
                'has_ratings' => false,
            ];
        }

        $average = round(max(1, min(5, $average)), 2);
        $score = (int) min(
            self::MAX_SCORE,
            self::BASE_SCORE + (int) round($average * 10),
        );

        return [
            'score' => $score,
            'average_rating' => $average,
            'rating_count' => $ratingCount,
            'has_ratings' => true,
        ];
    }
}

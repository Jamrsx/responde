<?php

namespace App\Http\Controllers\Chief;

use App\Http\Controllers\Controller;
use App\Models\EmergencyAssignment;
use App\Models\Station;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ResponseReportController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var Station $station */
        $station = $request->attributes->get('current_station');
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'period' => ['nullable', Rule::in(['30', '90', '365', 'all'])],
        ]);
        $search = trim((string) ($filters['search'] ?? ''));
        $period = (string) ($filters['period'] ?? '365');

        $completedBase = EmergencyAssignment::query()
            ->where('station_id', $station->id)
            ->where('status', 'completed')
            ->whereNotNull('completed_at');

        $performance = (clone $completedBase)
            ->selectRaw('COUNT(*) as completed_count')
            ->selectRaw('AVG(CASE WHEN notified_at IS NOT NULL AND accepted_at IS NOT NULL THEN TIMESTAMPDIFF(SECOND, notified_at, accepted_at) END) as average_acknowledgement_seconds')
            ->selectRaw('AVG(CASE WHEN accepted_at IS NOT NULL THEN TIMESTAMPDIFF(SECOND, accepted_at, completed_at) END) as average_completion_seconds')
            ->selectRaw('AVG(public_rating) as average_rating')
            ->selectRaw('COUNT(public_rating) as rating_count')
            ->first();

        $trendStart = now()->startOfMonth()->subMonths(11);
        $trendRows = (clone $completedBase)
            ->where('completed_at', '>=', $trendStart)
            ->selectRaw("DATE_FORMAT(completed_at, '%Y-%m') as month_key")
            ->selectRaw('COUNT(*) as completed_count')
            ->selectRaw('AVG(public_rating) as average_rating')
            ->groupBy('month_key')
            ->orderBy('month_key')
            ->get()
            ->keyBy('month_key');

        $trend = collect(range(0, 11))->map(function (int $offset) use (
            $trendRows,
            $trendStart,
        ): array {
            $month = $trendStart->copy()->addMonths($offset);
            $row = $trendRows->get($month->format('Y-m'));

            return [
                'month' => $month->format('M Y'),
                'completed' => (int) ($row?->completed_count ?? 0),
                'average_rating' => $row?->average_rating !== null
                    ? round((float) $row->average_rating, 1)
                    : null,
            ];
        });

        $historyQuery = (clone $completedBase)
            ->with([
                'emergency:id,emergency_type_id,description,address_text,created_at',
                'emergency.emergencyType:id,name,code',
                'responder:id,name,position_title',
            ]);

        if ($period !== 'all') {
            $historyQuery->where(
                'completed_at',
                '>=',
                now()->subDays((int) $period),
            );
        }

        if ($search !== '') {
            $historyQuery->where(function (Builder $query) use ($search): void {
                $query
                    ->whereHas('emergency', function (Builder $emergency) use ($search): void {
                        $emergency
                            ->where('description', 'like', "%{$search}%")
                            ->orWhere('address_text', 'like', "%{$search}%")
                            ->orWhereHas(
                                'emergencyType',
                                fn (Builder $type) => $type->where('name', 'like', "%{$search}%"),
                            );
                    })
                    ->orWhereHas(
                        'responder',
                        fn (Builder $responder) => $responder->where('name', 'like', "%{$search}%"),
                    );
            });
        }

        $history = $historyQuery
            ->latest('completed_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (EmergencyAssignment $assignment): array => [
                'id' => $assignment->id,
                'emergency_id' => $assignment->emergency_id,
                'type' => $assignment->emergency?->emergencyType?->name ?? 'Emergency',
                'description' => $assignment->emergency?->description,
                'address' => $assignment->emergency?->address_text,
                'responder' => $assignment->responder?->name,
                'responder_position' => $assignment->responder?->position_title,
                'acknowledgement_time' => $this->durationBetween(
                    $assignment->notified_at,
                    $assignment->accepted_at,
                ),
                'completion_time' => $this->durationBetween(
                    $assignment->accepted_at,
                    $assignment->completed_at,
                ),
                'public_rating' => $assignment->public_rating,
                'public_feedback' => $assignment->public_feedback,
                'completed_at' => $assignment->completed_at?->format('M j, Y g:i A'),
            ]);

        return Inertia::render('chief/reports/index', [
            'station' => [
                'id' => $station->id,
                'name' => $station->name,
            ],
            'filters' => [
                'search' => $search,
                'period' => $period,
            ],
            'summary' => [
                'completed' => (int) ($performance?->completed_count ?? 0),
                'average_acknowledgement' => $this->formatSeconds(
                    $performance?->average_acknowledgement_seconds,
                ),
                'average_completion' => $this->formatSeconds(
                    $performance?->average_completion_seconds,
                ),
                'average_rating' => $performance?->average_rating !== null
                    ? round((float) $performance->average_rating, 1)
                    : null,
                'rating_count' => (int) ($performance?->rating_count ?? 0),
            ],
            'trend' => $trend,
            'history' => $history,
        ]);
    }

    private function durationBetween(
        ?CarbonInterface $start,
        ?CarbonInterface $end,
    ): ?string {
        if ($start === null || $end === null) {
            return null;
        }

        return $this->formatSeconds($start->diffInSeconds($end));
    }

    private function formatSeconds(int|float|string|null $seconds): ?string
    {
        if ($seconds === null) {
            return null;
        }

        $totalSeconds = (int) round((float) $seconds);

        if ($totalSeconds < 60) {
            return "{$totalSeconds}s";
        }

        $minutes = intdiv($totalSeconds, 60);
        $remainingSeconds = $totalSeconds % 60;

        if ($minutes < 60) {
            return $remainingSeconds > 0
                ? "{$minutes}m {$remainingSeconds}s"
                : "{$minutes}m";
        }

        $hours = intdiv($minutes, 60);
        $remainingMinutes = $minutes % 60;

        return $remainingMinutes > 0
            ? "{$hours}h {$remainingMinutes}m"
            : "{$hours}h";
    }
}

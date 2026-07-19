<?php

namespace App\Http\Controllers\Chief;

use App\Http\Controllers\Controller;
use App\Models\EmergencyAssignment;
use App\Models\Lgu;
use App\Models\Station;
use App\Models\User;
use App\Support\HighRiskAreaDetector;
use App\Support\StationSatisfactionScore;
use App\UserRole;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(
        Request $request,
        HighRiskAreaDetector $detector,
    ): Response {
        /** @var Station $station */
        $station = $request->attributes->get('current_station');
        /** @var Lgu $lgu */
        $lgu = $request->attributes->get('current_lgu');

        $staff = User::query()
            ->where('role', UserRole::Staff)
            ->where('station_id', $station->id)
            ->get(['id', 'availability_status']);

        $assignments = EmergencyAssignment::query()
            ->where('station_id', $station->id)
            ->get(['id', 'status', 'public_rating', 'public_feedback', 'rated_at', 'completed_at', 'created_at']);

        $satisfaction = StationSatisfactionScore::fromRatings(
            $assignments->pluck('public_rating'),
        );

        $completedResponses = $assignments->where('status', 'completed')->count();
        $activeAssignments = $assignments
            ->whereIn('status', ['notified', 'accepted', 'en_route'])
            ->count();

        $recentFeedback = EmergencyAssignment::query()
            ->with('emergency:id,description,address_text,created_at')
            ->where('station_id', $station->id)
            ->whereNotNull('public_rating')
            ->latest('rated_at')
            ->limit(5)
            ->get()
            ->map(fn (EmergencyAssignment $assignment): array => [
                'id' => $assignment->id,
                'public_rating' => $assignment->public_rating,
                'public_feedback' => $assignment->public_feedback,
                'rated_at' => $assignment->rated_at?->diffForHumans(),
                'emergency' => $assignment->emergency?->description
                    ?? $assignment->emergency?->address_text
                    ?? 'Emergency response',
            ]);

        $highRisk = $detector->detectNationwide();

        return Inertia::render('chief/dashboard', [
            'station' => [
                'id' => $station->id,
                'name' => $station->name,
                'type' => $station->stationType?->name,
                'type_code' => $station->stationType?->code,
                'status' => $station->status,
            ],
            'lgu' => [
                'id' => $lgu->id,
                'name' => $lgu->name,
            ],
            'satisfaction' => [
                'score' => $satisfaction['score'],
                'max_score' => StationSatisfactionScore::MAX_SCORE,
                'average_rating' => $satisfaction['average_rating'],
                'rating_count' => $satisfaction['rating_count'],
                'has_ratings' => $satisfaction['has_ratings'],
                'label' => 'Emergency Response Score',
            ],
            'stats' => [
                'staff' => $staff->count(),
                'available_staff' => $staff
                    ->where('availability_status', 'available')
                    ->count(),
                'on_duty_staff' => $staff
                    ->whereIn('availability_status', ['available', 'unavailable'])
                    ->count(),
                'completed_responses' => $completedResponses,
                'active_assignments' => $activeAssignments,
                'public_ratings' => $satisfaction['rating_count'],
                'high_risk_areas' => $highRisk['summary']['high_risk_area_count'],
                'fire_warnings' => $highRisk['summary']['fire_warning_count'],
                'accident_ping_count' => $highRisk['summary']['accident_ping_count'],
                'fire_ping_count' => $highRisk['summary']['fire_ping_count'],
            ],
            'recentFeedback' => $recentFeedback,
        ]);
    }
}

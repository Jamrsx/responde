<?php

namespace App\Http\Controllers\Lgu;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Lgu\Concerns\ResolvesCurrentLgu;
use App\Models\Barangay;
use App\Models\Station;
use App\Models\User;
use App\UserRole;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    use ResolvesCurrentLgu;

    public function index(Request $request): Response
    {
        $lgu = $this->currentLgu($request);

        $barangayCount = Barangay::query()->where('lgu_id', $lgu->id)->count();
        $captainCount = Barangay::query()
            ->where('lgu_id', $lgu->id)
            ->whereNotNull('captain_user_id')
            ->count();
        $stationCount = Station::query()
            ->where('lgu_id', $lgu->id)
            ->where('approval_status', 'approved')
            ->count();
        $pendingOutposts = Station::query()
            ->where('lgu_id', $lgu->id)
            ->where('approval_status', 'pending')
            ->count();
        $stationsWithoutChief = Station::query()
            ->where('lgu_id', $lgu->id)
            ->where('approval_status', 'approved')
            ->whereNull('chief_user_id')
            ->whereHas('stationType', fn ($query) => $query->where('code', '!=', 'tanod'))
            ->count();

        $recentStations = Station::query()
            ->with(['stationType:id,name,code', 'barangay:id,name', 'chief:id,name'])
            ->where('lgu_id', $lgu->id)
            ->latest()
            ->take(5)
            ->get()
            ->map(fn (Station $station): array => [
                'id' => $station->id,
                'name' => $station->name,
                'type' => $station->stationType?->name,
                'barangay' => $station->barangay?->name,
                'chief' => $station->chief?->name,
                'status' => $station->status,
                'approval_status' => $station->approval_status,
                'created_at' => $station->created_at?->diffForHumans(),
            ]);

        $recentCaptains = User::query()
            ->where('role', UserRole::BarangayCaptain)
            ->where('lgu_id', $lgu->id)
            ->with(['captainedBarangays' => fn ($query) => $query->select('id', 'name', 'captain_user_id')])
            ->latest()
            ->take(5)
            ->get()
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'barangay' => $user->captainedBarangays->first()?->name,
                'created_at' => $user->created_at?->diffForHumans(),
            ]);

        return Inertia::render('lgu/dashboard', [
            'lgu' => [
                'id' => $lgu->id,
                'name' => $lgu->name,
                'municipality' => $lgu->municipality,
                'province' => $lgu->province,
                'psgc_code' => $lgu->psgc_code,
            ],
            'stats' => [
                'barangays' => $barangayCount,
                'captains' => $captainCount,
                'stations' => $stationCount,
                'pending_outposts' => $pendingOutposts,
                'stations_without_chief' => $stationsWithoutChief,
            ],
            'recentStations' => $recentStations,
            'recentCaptains' => $recentCaptains,
        ]);
    }
}

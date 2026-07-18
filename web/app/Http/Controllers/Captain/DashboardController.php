<?php

namespace App\Http\Controllers\Captain;

use App\Http\Controllers\Controller;
use App\Models\Barangay;
use App\Models\Station;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var Barangay $barangay */
        $barangay = $request->attributes->get('current_barangay');
        $lgu = $request->attributes->get('current_lgu');

        $outposts = Station::query()
            ->with('stationType:id,name,code')
            ->where('barangay_id', $barangay->id)
            ->where('lgu_id', $barangay->lgu_id)
            ->whereHas('stationType', fn ($query) => $query->where('code', 'tanod'))
            ->latest()
            ->get()
            ->map(fn (Station $station): array => [
                'id' => $station->id,
                'name' => $station->name,
                'contact_number' => $station->contact_number,
                'address' => $station->address,
                'latitude' => $station->latitude,
                'longitude' => $station->longitude,
                'status' => $station->status,
                'approval_status' => $station->approval_status,
                'created_at' => $station->created_at?->diffForHumans(),
            ]);

        return Inertia::render('captain/dashboard', [
            'barangay' => [
                'id' => $barangay->id,
                'name' => $barangay->name,
                'code' => $barangay->code,
            ],
            'lgu' => [
                'id' => $lgu->id,
                'name' => $lgu->name,
                'psgc_code' => $lgu->psgc_code,
            ],
            'outposts' => $outposts,
            'stats' => [
                'total' => $outposts->count(),
                'pending' => $outposts->where('approval_status', 'pending')->count(),
                'approved' => $outposts->where('approval_status', 'approved')->count(),
                'rejected' => $outposts->where('approval_status', 'rejected')->count(),
            ],
            'mapUrl' => $lgu->psgc_code
                ? "/maps/barangays/{$lgu->psgc_code}.json"
                : null,
        ]);
    }
}

<?php

namespace App\Http\Controllers\Chief;

use App\Http\Controllers\Controller;
use App\Models\Lgu;
use App\Models\Station;
use App\Support\HighRiskAreaDetector;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class HighRiskAreaController extends Controller
{
    public function index(
        Request $request,
        HighRiskAreaDetector $detector,
    ): Response {
        /** @var Station $station */
        $station = $request->attributes->get('current_station');
        /** @var Lgu $lgu */
        $lgu = $request->attributes->get('current_lgu');

        $result = $detector->detectNationwide();

        Log::info('[Responde Chief] High-risk areas page loaded', [
            'station_id' => $station->id,
            'lgu_id' => $lgu->id,
            'high_risk_area_count' => $result['summary']['high_risk_area_count'],
            'fire_warning_count' => $result['summary']['fire_warning_count'],
        ]);

        return Inertia::render('chief/high-risk-areas/index', [
            'station' => [
                'id' => $station->id,
                'name' => $station->name,
                'latitude' => $station->latitude,
                'longitude' => $station->longitude,
            ],
            'lgu' => [
                'id' => $lgu->id,
                'name' => $lgu->name,
            ],
            'areas' => $result['areas'],
            'warnings' => $result['warnings'],
            'summary' => $result['summary'],
            'generatedAt' => $result['generated_at'],
        ]);
    }

    public function refresh(
        Request $request,
        HighRiskAreaDetector $detector,
    ): RedirectResponse {
        $detector->detectNationwide(forceRefresh: true);

        Log::info('[Responde Chief] High-risk areas refreshed', [
            'chief_user_id' => $request->user()?->id,
            'station_id' => $request->attributes->get('current_station')?->id,
        ]);

        return back();
    }
}

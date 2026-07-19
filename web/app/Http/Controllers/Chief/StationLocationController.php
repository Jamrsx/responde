<?php

namespace App\Http\Controllers\Chief;

use App\Http\Controllers\Controller;
use App\Http\Requests\Chief\RequestStationLocationUpdateRequest;
use App\Models\AuditLog;
use App\Models\Lgu;
use App\Models\Station;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class StationLocationController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var Station $station */
        $station = $request->attributes->get('current_station');
        /** @var Lgu $lgu */
        $lgu = $request->attributes->get('current_lgu');

        return Inertia::render('chief/station-location/index', [
            'station' => [
                'id' => $station->id,
                'name' => $station->name,
                'latitude' => $station->latitude,
                'longitude' => $station->longitude,
                'logo_url' => $station->logoUrl(),
                'icon_key' => $station->icon_key,
                'type_code' => $station->stationType?->code,
                'proposed_latitude' => $station->proposed_latitude,
                'proposed_longitude' => $station->proposed_longitude,
                'location_update_status' => $station->location_update_status,
                'location_update_note' => $station->location_update_note,
                'location_update_review_note' => $station->location_update_review_note,
                'location_update_requested_at' => $station->location_update_requested_at?->diffForHumans(),
                'location_update_reviewed_at' => $station->location_update_reviewed_at?->diffForHumans(),
            ],
            'lgu' => [
                'name' => $lgu->name,
                'latitude' => $lgu->latitude,
                'longitude' => $lgu->longitude,
            ],
            'mapUrl' => $lgu->psgc_code
                ? route('map-data.barangays.show', ['psgc' => $lgu->psgc_code], absolute: false)
                : null,
        ]);
    }

    public function store(
        RequestStationLocationUpdateRequest $request,
    ): RedirectResponse {
        /** @var Station $station */
        $station = $request->attributes->get('current_station');

        if ($station->location_update_status === 'pending') {
            return back()->with(
                'error',
                'This station already has a pending location update request.',
            );
        }

        $validated = $request->validated();

        if (
            abs((float) $station->latitude - (float) $validated['latitude']) < 0.000001
            && abs((float) $station->longitude - (float) $validated['longitude']) < 0.000001
        ) {
            throw ValidationException::withMessages([
                'latitude' => 'Choose a different location before sending the request.',
            ]);
        }

        $oldValues = $station->only([
            'proposed_latitude',
            'proposed_longitude',
            'location_update_status',
            'location_update_note',
        ]);

        $station->update([
            'proposed_latitude' => $validated['latitude'],
            'proposed_longitude' => $validated['longitude'],
            'location_update_status' => 'pending',
            'location_update_note' => $validated['note'] ?? null,
            'location_update_review_note' => null,
            'location_update_requested_at' => now(),
            'location_update_reviewed_at' => null,
        ]);

        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'action' => 'station.location_update_requested',
            'auditable_type' => Station::class,
            'auditable_id' => $station->id,
            'old_values' => $oldValues,
            'new_values' => $station->fresh()?->only([
                'proposed_latitude',
                'proposed_longitude',
                'location_update_status',
                'location_update_note',
            ]),
        ]);

        Log::info('Chief requested a station location update.', [
            'station_id' => $station->id,
            'chief_user_id' => $request->user()?->id,
            'proposed_latitude' => $validated['latitude'],
            'proposed_longitude' => $validated['longitude'],
        ]);

        return back()->with(
            'success',
            'Your location update request was sent to the LGU for review.',
        );
    }
}

<?php

namespace App\Http\Controllers\Chief;

use App\Http\Controllers\Controller;
use App\Http\Requests\Chief\UpdateStationSettingsRequest;
use App\Models\AuditLog;
use App\Models\Lgu;
use App\Models\Station;
use App\Support\ScopedUpdateSignal;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class StationSettingsController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var Station $station */
        $station = $request->attributes->get('current_station');
        /** @var Lgu $lgu */
        $lgu = $request->attributes->get('current_lgu');

        return Inertia::render('chief/station-settings/index', [
            'station' => [
                'id' => $station->id,
                'name' => $station->name,
                'type' => $station->stationType?->name,
                'logo_url' => $station->logoUrl(),
                'status' => $station->status,
                'contact_number' => $station->contact_number,
                'address' => $station->address,
                'latitude' => $station->latitude,
                'longitude' => $station->longitude,
            ],
            'lgu' => [
                'id' => $lgu->id,
                'name' => $lgu->name,
            ],
        ]);
    }

    public function update(
        UpdateStationSettingsRequest $request,
        ScopedUpdateSignal $signals,
    ): RedirectResponse {
        /** @var Station $station */
        $station = $request->attributes->get('current_station');
        $validated = $request->validated();
        $oldValues = $station->only(['status', 'contact_number', 'address']);

        $station->update($validated);

        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'action' => 'station.settings_updated_by_chief',
            'auditable_type' => Station::class,
            'auditable_id' => $station->id,
            'old_values' => $oldValues,
            'new_values' => $station->fresh()?->only([
                'status',
                'contact_number',
                'address',
            ]),
        ]);

        $signals->publishLgu(
            (int) $station->lgu_id,
            'station.settings.updated',
        );
        $signals->publishStation(
            $station->id,
            'station.settings.updated',
        );

        Log::info('Chief updated station settings.', [
            'station_id' => $station->id,
            'chief_user_id' => $request->user()?->id,
            'status' => $validated['status'],
        ]);

        return back()->with('success', 'Station settings were updated.');
    }
}

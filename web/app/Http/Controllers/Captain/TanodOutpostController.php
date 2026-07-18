<?php

namespace App\Http\Controllers\Captain;

use App\Http\Controllers\Controller;
use App\Http\Requests\Captain\StoreTanodOutpostRequest;
use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\Station;
use App\Models\StationType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class TanodOutpostController extends Controller
{
    public function store(StoreTanodOutpostRequest $request): RedirectResponse
    {
        /** @var Barangay $barangay */
        $barangay = $request->attributes->get('current_barangay');
        $tanodType = StationType::query()->where('code', 'tanod')->first();

        if ($tanodType === null) {
            throw ValidationException::withMessages([
                'name' => 'Tanod Outpost station type is not configured yet.',
            ]);
        }

        $station = Station::query()->create([
            'lgu_id' => $barangay->lgu_id,
            'station_type_id' => $tanodType->id,
            'barangay_id' => $barangay->id,
            'submitted_by_user_id' => $request->user()?->id,
            'name' => $request->string('name')->toString(),
            'contact_number' => $request->filled('contact_number')
                ? $request->string('contact_number')->toString()
                : null,
            'address' => $request->filled('address')
                ? $request->string('address')->toString()
                : null,
            'latitude' => $request->input('latitude'),
            'longitude' => $request->input('longitude'),
            'status' => 'inactive',
            'approval_status' => 'pending',
        ]);

        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'action' => 'tanod_outpost.submitted',
            'auditable_type' => Station::class,
            'auditable_id' => $station->id,
            'new_values' => $station->only([
                'name',
                'barangay_id',
                'latitude',
                'longitude',
                'approval_status',
            ]),
        ]);

        Log::info('Tanod outpost submitted for approval.', [
            'station_id' => $station->id,
            'barangay_id' => $barangay->id,
            'actor_user_id' => $request->user()?->id,
        ]);

        return back()->with(
            'success',
            "{$station->name} was submitted for LGU approval.",
        );
    }

    public function update(
        StoreTanodOutpostRequest $request,
        Station $station,
    ): RedirectResponse {
        /** @var Barangay $barangay */
        $barangay = $request->attributes->get('current_barangay');
        $this->assertOwnedOutpost($station, $barangay);

        $station->update([
            'name' => $request->string('name')->toString(),
            'contact_number' => $request->filled('contact_number')
                ? $request->string('contact_number')->toString()
                : null,
            'address' => $request->filled('address')
                ? $request->string('address')->toString()
                : null,
            'latitude' => $request->input('latitude'),
            'longitude' => $request->input('longitude'),
            'status' => 'inactive',
            'approval_status' => 'pending',
        ]);

        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'action' => 'tanod_outpost.updated',
            'auditable_type' => Station::class,
            'auditable_id' => $station->id,
            'new_values' => $station->only([
                'name',
                'latitude',
                'longitude',
                'approval_status',
            ]),
        ]);

        Log::info('Tanod outpost updated and re-submitted.', [
            'station_id' => $station->id,
            'actor_user_id' => $request->user()?->id,
        ]);

        return back()->with(
            'success',
            "{$station->name} was updated and sent back for LGU approval.",
        );
    }

    public function destroy(Request $request, Station $station): RedirectResponse
    {
        /** @var Barangay $barangay */
        $barangay = $request->attributes->get('current_barangay');
        $this->assertOwnedOutpost($station, $barangay);

        $name = $station->name;
        $station->delete();

        Log::info('Tanod outpost deleted by captain.', [
            'station_id' => $station->id,
            'actor_user_id' => $request->user()?->id,
        ]);

        return back()->with('success', "{$name} was removed.");
    }

    private function assertOwnedOutpost(Station $station, Barangay $barangay): void
    {
        if (
            $station->barangay_id !== $barangay->id
            || $station->lgu_id !== $barangay->lgu_id
        ) {
            abort(403);
        }

        $station->loadMissing('stationType:id,code');

        if ($station->stationType?->code !== 'tanod') {
            abort(403);
        }
    }
}
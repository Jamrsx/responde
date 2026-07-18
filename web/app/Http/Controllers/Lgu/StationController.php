<?php

namespace App\Http\Controllers\Lgu;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Lgu\Concerns\ResolvesCurrentLgu;
use App\Http\Requests\Lgu\StoreStationRequest;
use App\Http\Requests\Lgu\UpdateStationRequest;
use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\Station;
use App\Models\StationType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class StationController extends Controller
{
    use ResolvesCurrentLgu;

    public function index(Request $request): Response
    {
        $lgu = $this->currentLgu($request);

        $stations = Station::query()
            ->with([
                'stationType:id,name,code',
                'barangay:id,name',
                'chief:id,name,email',
            ])
            ->where('lgu_id', $lgu->id)
            ->latest()
            ->get()
            ->map(fn (Station $station): array => $this->serializeStation($station));

        return Inertia::render('lgu/stations/index', [
            'lgu' => [
                'id' => $lgu->id,
                'name' => $lgu->name,
                'psgc_code' => $lgu->psgc_code,
                'latitude' => $lgu->latitude,
                'longitude' => $lgu->longitude,
            ],
            'stations' => $stations,
            'stationTypes' => StationType::query()
                ->where('is_active', true)
                ->where('code', '!=', 'tanod')
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
            'barangays' => Barangay::query()
                ->where('lgu_id', $lgu->id)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
            'mapUrl' => $lgu->psgc_code
                ? route('map-data.barangays.show', ['psgc' => $lgu->psgc_code], absolute: false)
                : null,
        ]);
    }

    public function create(Request $request): Response
    {
        $lgu = $this->currentLgu($request);

        Log::info('LGU station create page opened.', [
            'lgu_id' => $lgu->id,
            'actor_user_id' => $request->user()?->id,
        ]);

        return Inertia::render('lgu/stations/create', [
            'lgu' => [
                'id' => $lgu->id,
                'name' => $lgu->name,
                'psgc_code' => $lgu->psgc_code,
                'latitude' => $lgu->latitude,
                'longitude' => $lgu->longitude,
            ],
            'stationTypes' => StationType::query()
                ->where('is_active', true)
                ->where('code', '!=', 'tanod')
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
            'barangays' => Barangay::query()
                ->where('lgu_id', $lgu->id)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
            'mapUrl' => $lgu->psgc_code
                ? route('map-data.barangays.show', ['psgc' => $lgu->psgc_code], absolute: false)
                : null,
        ]);
    }

    public function store(StoreStationRequest $request): RedirectResponse
    {
        $lgu = $this->currentLgu($request);
        $this->assertBarangayBelongsToLgu($request->integer('barangay_id') ?: null, $lgu->id);

        $station = Station::query()->create([
            ...$request->validated(),
            'lgu_id' => $lgu->id,
            'approval_status' => 'approved',
            'submitted_by_user_id' => $request->user()?->id,
        ]);

        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'action' => 'station.created',
            'auditable_type' => Station::class,
            'auditable_id' => $station->id,
            'new_values' => $station->only([
                'name',
                'station_type_id',
                'other_type_name',
                'barangay_id',
                'latitude',
                'longitude',
                'status',
                'approval_status',
            ]),
        ]);

        Log::info('LGU station created.', [
            'station_id' => $station->id,
            'lgu_id' => $lgu->id,
            'actor_user_id' => $request->user()?->id,
        ]);

        return redirect()
            ->route('lgu.stations.index')
            ->with('success', "{$station->name} was added successfully.");
    }

    public function update(UpdateStationRequest $request, Station $station): RedirectResponse
    {
        $lgu = $this->currentLgu($request);
        $this->assertOwnedStation($station, $lgu->id);
        $this->assertBarangayBelongsToLgu($request->integer('barangay_id') ?: null, $lgu->id);

        $station->loadMissing('stationType:id,code');
        $type = StationType::query()->findOrFail($request->integer('station_type_id'));

        if ($station->stationType?->code !== 'tanod' && $type->code === 'tanod') {
            throw ValidationException::withMessages([
                'station_type_id' => 'Convert a station to Tanod Outpost from the captain portal instead.',
            ]);
        }

        $old = $station->only([
            'name',
            'station_type_id',
            'other_type_name',
            'barangay_id',
            'latitude',
            'longitude',
            'status',
            'approval_status',
        ]);

        $station->update($request->validated());

        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'action' => 'station.updated',
            'auditable_type' => Station::class,
            'auditable_id' => $station->id,
            'old_values' => $old,
            'new_values' => $station->fresh()?->only(array_keys($old)),
        ]);

        Log::info('LGU station updated.', [
            'station_id' => $station->id,
            'actor_user_id' => $request->user()?->id,
        ]);

        return back()->with('success', "{$station->name} was updated successfully.");
    }

    public function approve(Request $request, Station $station): RedirectResponse
    {
        $lgu = $this->currentLgu($request);
        $this->assertOwnedStation($station, $lgu->id);

        if ($station->approval_status !== 'pending') {
            return back()->with('error', 'Only pending outposts can be approved.');
        }

        $station->update([
            'approval_status' => 'approved',
            'status' => 'active',
        ]);

        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'action' => 'station.approved',
            'auditable_type' => Station::class,
            'auditable_id' => $station->id,
            'new_values' => ['approval_status' => 'approved'],
        ]);

        Log::info('Tanod outpost approved.', [
            'station_id' => $station->id,
            'actor_user_id' => $request->user()?->id,
        ]);

        return back()->with('success', "{$station->name} was approved.");
    }

    public function reject(Request $request, Station $station): RedirectResponse
    {
        $lgu = $this->currentLgu($request);
        $this->assertOwnedStation($station, $lgu->id);

        if ($station->approval_status !== 'pending') {
            return back()->with('error', 'Only pending outposts can be rejected.');
        }

        $station->update([
            'approval_status' => 'rejected',
            'status' => 'inactive',
        ]);

        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'action' => 'station.rejected',
            'auditable_type' => Station::class,
            'auditable_id' => $station->id,
            'new_values' => ['approval_status' => 'rejected'],
        ]);

        Log::info('Tanod outpost rejected.', [
            'station_id' => $station->id,
            'actor_user_id' => $request->user()?->id,
        ]);

        return back()->with('success', "{$station->name} was rejected.");
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeStation(Station $station): array
    {
        $typeLabel = $station->stationType?->code === 'other' && filled($station->other_type_name)
            ? "Other · {$station->other_type_name}"
            : $station->stationType?->name;

        return [
            'id' => $station->id,
            'name' => $station->name,
            'contact_number' => $station->contact_number,
            'address' => $station->address,
            'latitude' => $station->latitude,
            'longitude' => $station->longitude,
            'status' => $station->status,
            'approval_status' => $station->approval_status,
            'station_type_id' => $station->station_type_id,
            'barangay_id' => $station->barangay_id,
            'other_type_name' => $station->other_type_name,
            'type' => $typeLabel,
            'type_code' => $station->stationType?->code,
            'barangay' => $station->barangay?->name,
            'chief' => $station->chief
                ? [
                    'id' => $station->chief->id,
                    'name' => $station->chief->name,
                    'email' => $station->chief->email,
                ]
                : null,
        ];
    }

    private function assertOwnedStation(Station $station, int $lguId): void
    {
        if ($station->lgu_id !== $lguId) {
            abort(403);
        }
    }

    private function assertBarangayBelongsToLgu(?int $barangayId, int $lguId): void
    {
        if ($barangayId === null) {
            return;
        }

        $exists = Barangay::query()
            ->whereKey($barangayId)
            ->where('lgu_id', $lguId)
            ->exists();

        if (! $exists) {
            throw ValidationException::withMessages([
                'barangay_id' => 'The selected barangay does not belong to your LGU.',
            ]);
        }
    }
}

<?php

namespace App\Http\Controllers\Lgu;

use App\Actions\Users\CreateStationChiefAccount;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Lgu\Concerns\ResolvesCurrentLgu;
use App\Http\Requests\Lgu\StoreStationRequest;
use App\Http\Requests\Lgu\UpdateStationRequest;
use App\Mail\StationChiefCredentialsMail;
use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\Station;
use App\Models\StationType;
use App\Support\StationSatisfactionScore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

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
            ->withAvg([
                'emergencyAssignments as public_rating_average' => fn ($query) => $query
                    ->where('status', 'completed')
                    ->whereNotNull('public_rating'),
            ], 'public_rating')
            ->withCount([
                'emergencyAssignments as public_rating_count' => fn ($query) => $query
                    ->where('status', 'completed')
                    ->whereNotNull('public_rating'),
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
            'stationTypes' => $this->activeStationTypes(),
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
        $existingStations = Station::query()
            ->with('stationType:id,name,code')
            ->where('lgu_id', $lgu->id)
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->orderBy('name')
            ->get()
            ->map(fn (Station $station): array => [
                'id' => $station->id,
                'name' => $station->name,
                'latitude' => $station->latitude,
                'longitude' => $station->longitude,
                'approval_status' => $station->approval_status,
                'icon_key' => $this->resolveIconKey($station),
                'logo_url' => $station->logoUrl(),
                'type' => $station->stationType?->name,
                'type_code' => $station->stationType?->code,
            ]);

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
            'stationTypes' => $this->activeStationTypes(),
            'barangays' => Barangay::query()
                ->where('lgu_id', $lgu->id)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
            'existingStations' => $existingStations,
            'mapUrl' => $lgu->psgc_code
                ? route('map-data.barangays.show', ['psgc' => $lgu->psgc_code], absolute: false)
                : null,
        ]);
    }

    public function store(
        StoreStationRequest $request,
        CreateStationChiefAccount $createStationChiefAccount,
    ): RedirectResponse {
        $lgu = $this->currentLgu($request);
        $actor = $request->user();
        abort_if($actor === null, 403);

        $this->assertBarangayBelongsToLgu($request->integer('barangay_id') ?: null, $lgu->id);
        $validated = $request->safe()->except(['logo']);
        $logoPath = $this->storeStationLogo($request->file('logo'));

        try {
            $station = DB::transaction(function () use (
                $actor,
                $lgu,
                $validated,
                $logoPath,
                $createStationChiefAccount,
            ): Station {
                $station = Station::query()->create([
                    'station_type_id' => $validated['station_type_id'],
                    'icon_key' => $validated['icon_key'],
                    'logo_path' => $logoPath,
                    'other_type_name' => $validated['other_type_name'] ?? null,
                    'barangay_id' => $validated['barangay_id'] ?? null,
                    'name' => $validated['name'],
                    'contact_number' => $validated['contact_number'] ?? null,
                    'address' => $validated['address'] ?? null,
                    'latitude' => $validated['latitude'],
                    'longitude' => $validated['longitude'],
                    'status' => $validated['status'],
                    'lgu_id' => $lgu->id,
                    'approval_status' => 'approved',
                    'submitted_by_user_id' => $actor->id,
                ]);

                AuditLog::query()->create([
                    'user_id' => $actor->id,
                    'action' => 'station.created',
                    'auditable_type' => Station::class,
                    'auditable_id' => $station->id,
                    'new_values' => $station->only([
                        'name',
                        'station_type_id',
                        'icon_key',
                        'logo_path',
                        'other_type_name',
                        'barangay_id',
                        'latitude',
                        'longitude',
                        'status',
                        'approval_status',
                    ]),
                ]);

                if ($validated['assign_chief']) {
                    $temporaryPassword = filled($validated['chief_password'] ?? null)
                        ? (string) $validated['chief_password']
                        : Str::password(
                            length: 8,
                            letters: true,
                            numbers: true,
                            symbols: false,
                            spaces: false,
                        );
                    $station->load('stationType:id,code');

                    $chief = $createStationChiefAccount->execute(
                        $actor,
                        $station,
                        [
                            'name' => $validated['chief_name'],
                            'email' => $validated['chief_email'],
                            'password' => $temporaryPassword,
                            'phone' => null,
                        ],
                    );

                    Mail::to($chief->email)->send(
                        new StationChiefCredentialsMail(
                            chiefName: $chief->name,
                            stationName: $station->name,
                            lguName: $lgu->name,
                            emailAddress: $chief->email,
                            temporaryPassword: $temporaryPassword,
                            loginUrl: route('login', absolute: true),
                        ),
                    );
                }

                return $station;
            });
        } catch (Throwable $exception) {
            if ($logoPath !== null) {
                Storage::disk('public')->delete($logoPath);
            }

            report($exception);
            Log::error('Station and chief creation failed.', [
                'actor_user_id' => $actor->id,
                'lgu_id' => $lgu->id,
                'station_name' => $validated['name'],
                'chief_email' => $validated['chief_email'] ?? null,
                'error' => $exception->getMessage(),
            ]);

            return back()
                ->withInput()
                ->with(
                    'error',
                    'The station was not created because the chief account email could not be sent. Check the email address and mail settings, then try again.',
                );
        }

        Log::info('LGU station created.', [
            'station_id' => $station->id,
            'lgu_id' => $lgu->id,
            'actor_user_id' => $actor->id,
        ]);

        $message = $validated['assign_chief']
            ? "{$station->name} and its chief account were added. Login credentials were emailed to {$validated['chief_email']}."
            : "{$station->name} was added successfully.";

        return redirect()
            ->route('lgu.stations.index')
            ->with('success', $message);
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
            'icon_key',
            'logo_path',
            'other_type_name',
            'barangay_id',
            'latitude',
            'longitude',
            'status',
            'approval_status',
        ]);

        $data = $request->safe()->except(['logo', 'remove_logo']);
        $previousLogoPath = $station->logo_path;
        $newLogoPath = null;

        if ($request->hasFile('logo')) {
            $newLogoPath = $this->storeStationLogo($request->file('logo'));
            $data['logo_path'] = $newLogoPath;
        } elseif ($request->boolean('remove_logo')) {
            $data['logo_path'] = null;
        }

        $station->update($data);

        if (
            ($newLogoPath !== null || $request->boolean('remove_logo'))
            && filled($previousLogoPath)
            && $previousLogoPath !== $station->logo_path
        ) {
            Storage::disk('public')->delete($previousLogoPath);
        }

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
            'logo_replaced' => $newLogoPath !== null,
            'logo_removed' => $request->boolean('remove_logo') && $newLogoPath === null,
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

    public function approveLocationUpdate(
        Request $request,
        Station $station,
    ): RedirectResponse {
        $lgu = $this->currentLgu($request);
        $this->assertOwnedStation($station, $lgu->id);

        if (
            $station->location_update_status !== 'pending'
            || $station->proposed_latitude === null
            || $station->proposed_longitude === null
        ) {
            return back()->with('error', 'This station has no pending location request.');
        }

        $oldValues = $station->only([
            'latitude',
            'longitude',
            'location_update_status',
        ]);

        $station->update([
            'latitude' => $station->proposed_latitude,
            'longitude' => $station->proposed_longitude,
            'location_update_status' => 'approved',
            'location_update_review_note' => null,
            'location_update_reviewed_at' => now(),
        ]);

        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'action' => 'station.location_update_approved',
            'auditable_type' => Station::class,
            'auditable_id' => $station->id,
            'old_values' => $oldValues,
            'new_values' => $station->fresh()?->only([
                'latitude',
                'longitude',
                'location_update_status',
            ]),
        ]);

        Log::info('LGU approved a station location update.', [
            'station_id' => $station->id,
            'actor_user_id' => $request->user()?->id,
        ]);

        return back()->with(
            'success',
            "{$station->name}'s map location was updated.",
        );
    }

    public function rejectLocationUpdate(
        Request $request,
        Station $station,
    ): RedirectResponse {
        $lgu = $this->currentLgu($request);
        $this->assertOwnedStation($station, $lgu->id);

        if ($station->location_update_status !== 'pending') {
            return back()->with('error', 'This station has no pending location request.');
        }

        $validated = $request->validate([
            'review_note' => ['nullable', 'string', 'max:1000'],
        ], [
            'review_note.max' => 'The review note must be 1,000 characters or fewer.',
        ]);

        $station->update([
            'location_update_status' => 'rejected',
            'location_update_review_note' => $validated['review_note'] ?? null,
            'location_update_reviewed_at' => now(),
        ]);

        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'action' => 'station.location_update_rejected',
            'auditable_type' => Station::class,
            'auditable_id' => $station->id,
            'new_values' => $station->fresh()?->only([
                'proposed_latitude',
                'proposed_longitude',
                'location_update_status',
                'location_update_review_note',
            ]),
        ]);

        Log::info('LGU rejected a station location update.', [
            'station_id' => $station->id,
            'actor_user_id' => $request->user()?->id,
        ]);

        return back()->with(
            'success',
            "{$station->name}'s location request was rejected.",
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeStation(Station $station): array
    {
        $typeLabel = $station->stationType?->code === 'other' && filled($station->other_type_name)
            ? "Other · {$station->other_type_name}"
            : $station->stationType?->name;
        $ratingAverage = $station->getAttribute('public_rating_average');
        $satisfaction = StationSatisfactionScore::fromAverage(
            $ratingAverage !== null ? (float) $ratingAverage : null,
            (int) $station->getAttribute('public_rating_count'),
        );

        return [
            'id' => $station->id,
            'name' => $station->name,
            'contact_number' => $station->contact_number,
            'address' => $station->address,
            'latitude' => $station->latitude,
            'longitude' => $station->longitude,
            'proposed_latitude' => $station->proposed_latitude,
            'proposed_longitude' => $station->proposed_longitude,
            'location_update_status' => $station->location_update_status,
            'location_update_note' => $station->location_update_note,
            'location_update_review_note' => $station->location_update_review_note,
            'location_update_requested_at' => $station->location_update_requested_at?->diffForHumans(),
            'location_update_reviewed_at' => $station->location_update_reviewed_at?->diffForHumans(),
            'status' => $station->status,
            'approval_status' => $station->approval_status,
            'station_type_id' => $station->station_type_id,
            'barangay_id' => $station->barangay_id,
            'icon_key' => $this->resolveIconKey($station),
            'logo_url' => $station->logoUrl(),
            'other_type_name' => $station->other_type_name,
            'type' => $typeLabel,
            'type_code' => $station->stationType?->code,
            'barangay' => $station->barangay?->name,
            'satisfaction' => $satisfaction,
            'chief' => $station->chief
                ? [
                    'id' => $station->chief->id,
                    'name' => $station->chief->name,
                    'email' => $station->chief->email,
                ]
                : null,
        ];
    }

    /**
     * @return Collection<int, StationType>
     */
    private function activeStationTypes()
    {
        return StationType::query()
            ->where('is_active', true)
            ->where('code', '!=', 'tanod')
            ->orderByRaw("CASE WHEN code = 'other' THEN 1 ELSE 0 END")
            ->orderBy('name')
            ->get(['id', 'name', 'code']);
    }

    private function storeStationLogo(?UploadedFile $logo): ?string
    {
        if ($logo === null) {
            return null;
        }

        $path = $logo->store('station-logos', 'public');
        Log::info('Station logo stored.', ['path' => $path]);

        return $path;
    }

    private function resolveIconKey(Station $station): string
    {
        $allowed = [
            'police',
            'fire',
            'disaster',
            'medical',
            'security',
            'rescue',
            'government',
            'generic',
        ];

        $stored = (string) ($station->icon_key ?? '');

        if ($stored !== '' && $stored !== 'generic' && in_array($stored, $allowed, true)) {
            return $stored;
        }

        $fromType = match ($station->stationType?->code) {
            'pnp' => 'police',
            'bfp' => 'fire',
            'drrmo' => 'disaster',
            'health' => 'medical',
            'tanod' => 'security',
            default => null,
        };

        if ($fromType !== null) {
            return $fromType;
        }

        return in_array($stored, $allowed, true) ? $stored : 'generic';
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

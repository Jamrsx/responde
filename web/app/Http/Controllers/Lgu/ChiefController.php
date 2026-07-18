<?php

namespace App\Http\Controllers\Lgu;

use App\Actions\Users\CreateStationChiefAccount;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Lgu\Concerns\ResolvesCurrentLgu;
use App\Http\Requests\Lgu\StoreChiefRequest;
use App\Models\AuditLog;
use App\Models\Station;
use App\Models\User;
use App\UserRole;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ChiefController extends Controller
{
    use ResolvesCurrentLgu;

    public function index(Request $request): Response
    {
        $lgu = $this->currentLgu($request);

        $chiefs = User::query()
            ->where('role', UserRole::Chief)
            ->where('lgu_id', $lgu->id)
            ->with(['station:id,name,station_type_id,latitude,longitude', 'station.stationType:id,name,code'])
            ->latest()
            ->get()
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'station_id' => $user->station_id,
                'station' => $user->station?->name,
                'station_type' => $user->station?->stationType?->name,
                'latitude' => $user->station?->latitude,
                'longitude' => $user->station?->longitude,
                'created_at' => $user->created_at?->diffForHumans(),
            ]);

        $stations = Station::query()
            ->with([
                'stationType:id,name,code',
                'chief:id,name,email,phone',
                'barangay:id,name',
            ])
            ->where('lgu_id', $lgu->id)
            ->where('approval_status', 'approved')
            ->whereHas('stationType', fn ($query) => $query->where('code', '!=', 'tanod'))
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'station_type_id',
                'barangay_id',
                'chief_user_id',
                'latitude',
                'longitude',
                'address',
            ]);

        $stationsWithoutChief = $stations
            ->whereNull('chief_user_id')
            ->values();

        return Inertia::render('lgu/chiefs/index', [
            'lgu' => [
                'id' => $lgu->id,
                'name' => $lgu->name,
                'psgc_code' => $lgu->psgc_code,
                'latitude' => $lgu->latitude,
                'longitude' => $lgu->longitude,
            ],
            'chiefs' => $chiefs,
            'stations' => $stations->map(fn (Station $station): array => [
                'id' => $station->id,
                'name' => $station->name,
                'type' => $station->stationType?->name,
                'type_code' => $station->stationType?->code,
                'barangay' => $station->barangay?->name,
                'address' => $station->address,
                'latitude' => $station->latitude,
                'longitude' => $station->longitude,
                'has_chief' => $station->chief_user_id !== null,
                'chief' => $station->chief
                    ? [
                        'id' => $station->chief->id,
                        'name' => $station->chief->name,
                        'email' => $station->chief->email,
                        'phone' => $station->chief->phone,
                    ]
                    : null,
            ]),
            'stationsWithoutChief' => $stationsWithoutChief->map(fn (Station $station): array => [
                'id' => $station->id,
                'name' => $station->name,
                'type' => $station->stationType?->name,
            ]),
            'mapUrl' => $lgu->psgc_code
                ? route('map-data.barangays.show', ['psgc' => $lgu->psgc_code], absolute: false)
                : null,
            'stats' => [
                'totalStations' => $stations->count(),
                'withChief' => $stations->whereNotNull('chief_user_id')->count(),
                'withoutChief' => $stationsWithoutChief->count(),
                'chiefs' => $chiefs->count(),
            ],
        ]);
    }

    public function store(
        StoreChiefRequest $request,
        CreateStationChiefAccount $createStationChiefAccount,
    ): RedirectResponse {
        $lgu = $this->currentLgu($request);
        $station = Station::query()
            ->with('stationType:id,code')
            ->whereKey($request->integer('station_id'))
            ->where('lgu_id', $lgu->id)
            ->firstOrFail();

        $account = $createStationChiefAccount->execute($request->user(), $station, [
            'name' => $request->string('name')->toString(),
            'email' => $request->string('email')->toString(),
            'password' => $request->string('password')->toString(),
            'phone' => $request->filled('phone') ? $request->string('phone')->toString() : null,
        ]);

        return back()->with(
            'success',
            "{$account->name} was assigned as chief of {$station->name}.",
        );
    }

    public function replace(Request $request, User $chief): RedirectResponse
    {
        $lgu = $this->currentLgu($request);

        if ($chief->role !== UserRole::Chief || $chief->lgu_id !== $lgu->id) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', 'min:8'],
            'phone' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
        ]);

        $station = Station::query()
            ->with('stationType:id,code')
            ->whereKey($chief->station_id)
            ->where('lgu_id', $lgu->id)
            ->first();

        if ($station === null) {
            throw ValidationException::withMessages([
                'station_id' => 'This chief is not linked to a valid station.',
            ]);
        }

        $replacement = DB::transaction(function () use ($request, $chief, $station, $validated): User {
            $station->update(['chief_user_id' => null]);
            $chief->delete();

            $account = User::query()->create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
                'phone' => $validated['phone'] ?? null,
                'role' => UserRole::Chief,
                'lgu_id' => $station->lgu_id,
                'station_id' => $station->id,
            ]);

            $station->update(['chief_user_id' => $account->id]);

            AuditLog::query()->create([
                'user_id' => $request->user()?->id,
                'action' => 'station_chief.replaced',
                'auditable_type' => User::class,
                'auditable_id' => $account->id,
                'old_values' => ['previous_chief_id' => $chief->id],
                'new_values' => [
                    'name' => $account->name,
                    'email' => $account->email,
                    'station_id' => $station->id,
                ],
            ]);

            return $account;
        });

        Log::info('Station chief replaced.', [
            'previous_chief_id' => $chief->id,
            'new_chief_id' => $replacement->id,
            'station_id' => $station->id,
            'actor_user_id' => $request->user()?->id,
        ]);

        return back()->with(
            'success',
            "{$replacement->name} replaced the previous chief for {$station->name}.",
        );
    }

    public function deactivate(Request $request, User $chief): RedirectResponse
    {
        $lgu = $this->currentLgu($request);

        if ($chief->role !== UserRole::Chief || $chief->lgu_id !== $lgu->id) {
            abort(403);
        }

        DB::transaction(function () use ($request, $chief): void {
            Station::query()
                ->where('chief_user_id', $chief->id)
                ->update(['chief_user_id' => null]);

            $chief->delete();

            AuditLog::query()->create([
                'user_id' => $request->user()?->id,
                'action' => 'station_chief.deactivated',
                'auditable_type' => User::class,
                'auditable_id' => $chief->id,
                'old_values' => [
                    'name' => $chief->name,
                    'station_id' => $chief->station_id,
                ],
            ]);
        });

        Log::info('Station chief deactivated.', [
            'chief_id' => $chief->id,
            'actor_user_id' => $request->user()?->id,
        ]);

        return back()->with('success', "{$chief->name} was deactivated.");
    }
}

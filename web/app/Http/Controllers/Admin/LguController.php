<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Users\CreateManagedAccount;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreLguRequest;
use App\Http\Requests\Admin\UpdateLguRequest;
use App\Mail\LguAdminCredentialsMail;
use App\Models\AuditLog;
use App\Models\Lgu;
use App\UserRole;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class LguController extends Controller
{
    public function index(): Response
    {
        $lgus = Lgu::query()
            ->withCount([
                'stations',
                'users as lgu_admins_count' => fn ($query) => $query->where('role', UserRole::LguAdmin),
            ])
            ->orderBy('region')
            ->orderBy('name')
            ->get()
            ->map(fn (Lgu $lgu): array => $this->listItem($lgu));

        return Inertia::render('admin/lgus/index', [
            'lgus' => $lgus,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/lgus/create');
    }

    public function store(
        StoreLguRequest $request,
        CreateManagedAccount $createManagedAccount,
    ): RedirectResponse {
        $actor = $request->user();
        abort_if($actor === null, 403);

        $validated = $request->validated();

        try {
            $lgu = DB::transaction(function () use (
                $actor,
                $validated,
                $createManagedAccount,
            ): Lgu {
                $lgu = Lgu::query()->create([
                    'name' => $validated['name'],
                    'code' => $validated['code'] ?? null,
                    'province' => $validated['province'] ?? null,
                    'municipality' => $validated['municipality'] ?? null,
                    'contact_number' => $validated['contact_number'] ?? null,
                    'psgc_code' => $validated['psgc_code'] ?? null,
                    'classification' => $validated['classification'] ?? null,
                    'region' => $validated['region'] ?? null,
                    'latitude' => $validated['latitude'] ?? null,
                    'longitude' => $validated['longitude'] ?? null,
                    'area_km2' => $validated['area_km2'] ?? null,
                ]);

                AuditLog::query()->create([
                    'user_id' => $actor->id,
                    'action' => 'lgu.created',
                    'auditable_type' => Lgu::class,
                    'auditable_id' => $lgu->id,
                    'new_values' => $lgu->only([
                        'name',
                        'code',
                        'province',
                        'municipality',
                        'psgc_code',
                        'classification',
                        'region',
                        'latitude',
                        'longitude',
                        'area_km2',
                    ]),
                ]);

                $temporaryPassword = filled($validated['admin_password'] ?? null)
                    ? (string) $validated['admin_password']
                    : Str::password(
                        length: 8,
                        letters: true,
                        numbers: true,
                        symbols: false,
                        spaces: false,
                    );

                $admin = $createManagedAccount->execute($actor, [
                    'name' => $validated['admin_name'],
                    'email' => $validated['admin_email'],
                    'password' => $temporaryPassword,
                    'phone' => $validated['admin_phone'] ?? null,
                    'lgu_id' => $lgu->id,
                    'station_id' => null,
                ]);

                Mail::to($admin->email)->send(
                    new LguAdminCredentialsMail(
                        adminName: $admin->name,
                        lguName: $lgu->name,
                        emailAddress: $admin->email,
                        temporaryPassword: $temporaryPassword,
                        loginUrl: route('login', absolute: true),
                    ),
                );

                return $lgu;
            });
        } catch (Throwable $exception) {
            report($exception);
            Log::error('LGU and administrator creation failed.', [
                'actor_user_id' => $actor->id,
                'lgu_name' => $validated['name'],
                'admin_email' => $validated['admin_email'],
                'error' => $exception->getMessage(),
            ]);

            return back()
                ->withInput()
                ->with(
                    'error',
                    'The LGU was not created because the administrator account email could not be sent. Check the mail settings and try again.',
                );
        }

        Log::info('LGU and administrator created.', [
            'lgu_id' => $lgu->id,
            'actor_user_id' => $actor->id,
            'admin_email' => $validated['admin_email'],
        ]);

        return redirect()
            ->route('admin.lgus.index')
            ->with(
                'success',
                "{$lgu->name} and its administrator account were added. Login credentials were emailed to {$validated['admin_email']}.",
            );
    }

    public function edit(Lgu $lgu): Response
    {
        return Inertia::render('admin/lgus/edit', [
            'lgu' => [
                'id' => $lgu->id,
                'name' => $lgu->name,
                'code' => $lgu->code,
                'province' => $lgu->province,
                'municipality' => $lgu->municipality,
                'contact_number' => $lgu->contact_number,
                'psgc_code' => $lgu->psgc_code,
                'classification' => $lgu->classification,
                'region' => $lgu->region,
                'latitude' => $lgu->latitude,
                'longitude' => $lgu->longitude,
                'area_km2' => $lgu->area_km2,
                'is_active' => $lgu->is_active,
            ],
        ]);
    }

    public function update(UpdateLguRequest $request, Lgu $lgu): RedirectResponse
    {
        $original = $lgu->only([
            'name',
            'code',
            'province',
            'municipality',
            'contact_number',
            'psgc_code',
            'classification',
            'region',
            'latitude',
            'longitude',
            'area_km2',
            'is_active',
        ]);

        // Jurisdiction / map identity is immutable after create.
        $editable = collect($request->validated())->only([
            'code',
            'contact_number',
            'is_active',
        ])->all();

        $lgu->update($editable);

        Log::info('LGU update locked jurisdiction fields.', [
            'lgu_id' => $lgu->id,
            'psgc_code' => $lgu->psgc_code,
            'actor_user_id' => $request->user()?->id,
        ]);

        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'action' => 'lgu.updated',
            'auditable_type' => Lgu::class,
            'auditable_id' => $lgu->id,
            'old_values' => $original,
            'new_values' => $lgu->only(array_keys($original)),
        ]);

        Log::info('LGU updated.', ['lgu_id' => $lgu->id, 'actor_user_id' => $request->user()?->id]);

        return redirect()
            ->route('admin.lgus.index')
            ->with('success', "{$lgu->name} was updated successfully.");
    }

    public function toggleStatus(Request $request, Lgu $lgu): RedirectResponse
    {
        $actor = $request->user();

        if ($actor === null || $actor->role !== UserRole::SuperAdmin) {
            abort(403);
        }

        $wasActive = $lgu->is_active;
        $lgu->update(['is_active' => ! $wasActive]);

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'action' => $wasActive ? 'lgu.deactivated' : 'lgu.activated',
            'auditable_type' => Lgu::class,
            'auditable_id' => $lgu->id,
            'old_values' => ['is_active' => $wasActive],
            'new_values' => ['is_active' => $lgu->is_active],
        ]);

        Log::info('LGU status toggled.', [
            'lgu_id' => $lgu->id,
            'is_active' => $lgu->is_active,
            'actor_user_id' => $actor->id,
        ]);

        $message = $lgu->is_active
            ? "{$lgu->name} was activated successfully."
            : "{$lgu->name} was deactivated successfully.";

        return redirect()
            ->route('admin.lgus.index')
            ->with('success', $message);
    }

    /**
     * @return array{
     *     id: int,
     *     name: string,
     *     code: string|null,
     *     province: string|null,
     *     municipality: string|null,
     *     contact_number: string|null,
     *     psgc_code: string|null,
     *     classification: string|null,
     *     region: string|null,
     *     latitude: mixed,
     *     longitude: mixed,
     *     area_km2: mixed,
     *     is_active: bool,
     *     stations_count: int|null,
     *     lgu_admins_count: int|null,
     *     created_at: string|null
     * }
     */
    private function listItem(Lgu $lgu): array
    {
        return [
            'id' => $lgu->id,
            'name' => $lgu->name,
            'code' => $lgu->code,
            'province' => $lgu->province,
            'municipality' => $lgu->municipality,
            'contact_number' => $lgu->contact_number,
            'psgc_code' => $lgu->psgc_code,
            'classification' => $lgu->classification,
            'region' => $lgu->region,
            'latitude' => $lgu->latitude,
            'longitude' => $lgu->longitude,
            'area_km2' => $lgu->area_km2,
            'is_active' => $lgu->is_active,
            'stations_count' => $lgu->stations_count,
            'lgu_admins_count' => $lgu->lgu_admins_count,
            'created_at' => $lgu->created_at?->format('M j, Y'),
        ];
    }
}

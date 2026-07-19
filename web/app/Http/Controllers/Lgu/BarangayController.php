<?php

namespace App\Http\Controllers\Lgu;

use App\Actions\Users\CreateCaptainAccount;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Lgu\Concerns\ResolvesCurrentLgu;
use App\Http\Requests\Lgu\ImportBarangaysRequest;
use App\Http\Requests\Lgu\StoreCaptainRequest;
use App\Mail\BarangayCaptainCredentialsMail;
use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\User;
use App\UserRole;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class BarangayController extends Controller
{
    use ResolvesCurrentLgu;

    public function index(Request $request): Response
    {
        $lgu = $this->currentLgu($request);

        $barangays = Barangay::query()
            ->with('captain:id,name,email,phone')
            ->where('lgu_id', $lgu->id)
            ->orderBy('name')
            ->get()
            ->map(fn (Barangay $barangay): array => [
                'id' => $barangay->id,
                'name' => $barangay->name,
                'code' => $barangay->code,
                'is_active' => $barangay->is_active,
                'captain' => $barangay->captain
                    ? [
                        'id' => $barangay->captain->id,
                        'name' => $barangay->captain->name,
                        'email' => $barangay->captain->email,
                        'phone' => $barangay->captain->phone,
                    ]
                    : null,
            ]);

        return Inertia::render('lgu/barangays/index', [
            'lgu' => [
                'id' => $lgu->id,
                'name' => $lgu->name,
                'psgc_code' => $lgu->psgc_code,
                'latitude' => $lgu->latitude,
                'longitude' => $lgu->longitude,
            ],
            'barangays' => $barangays,
            'mapUrl' => $lgu->psgc_code
                ? route('map-data.barangays.show', ['psgc' => $lgu->psgc_code], absolute: false)
                : null,
        ]);
    }

    public function import(ImportBarangaysRequest $request): RedirectResponse
    {
        $lgu = $this->currentLgu($request);

        if (! $lgu->psgc_code) {
            throw ValidationException::withMessages([
                'barangays' => 'This LGU has no PSGC code, so official barangays cannot be imported.',
            ]);
        }

        $imported = 0;
        $skipped = 0;

        DB::transaction(function () use ($request, $lgu, &$imported, &$skipped): void {
            $lguPsgc = preg_replace('/\D+/', '', (string) $lgu->psgc_code) ?? '';
            // 10-digit PSGC: city/municipality uses the first 6 digits; last 4 identify the barangay.
            $lguPrefix = strlen($lguPsgc) >= 6 ? substr($lguPsgc, 0, 6) : $lguPsgc;

            foreach ($request->validated('barangays') as $item) {
                $psgc = preg_replace('/\D+/', '', (string) $item['psgc']) ?? '';
                $name = trim((string) $item['name']);

                if ($psgc === '' || $name === '') {
                    $skipped += 1;

                    continue;
                }

                // Official barangay PSGC must belong to this LGU prefix.
                if ($lguPrefix === '' || ! str_starts_with($psgc, $lguPrefix)) {
                    Log::warning('Skipped barangay import: PSGC does not match LGU.', [
                        'lgu_id' => $lgu->id,
                        'lgu_psgc' => $lguPsgc,
                        'lgu_prefix' => $lguPrefix,
                        'barangay_psgc' => $psgc,
                        'barangay_name' => $name,
                    ]);
                    $skipped += 1;

                    continue;
                }

                $existing = Barangay::query()->where('code', $psgc)->first();

                if ($existing !== null) {
                    if ($existing->lgu_id !== $lgu->id) {
                        $skipped += 1;

                        continue;
                    }

                    $skipped += 1;

                    continue;
                }

                Barangay::query()->create([
                    'lgu_id' => $lgu->id,
                    'name' => $name,
                    'code' => $psgc,
                    'is_active' => true,
                ]);

                $imported += 1;
            }

            AuditLog::query()->create([
                'user_id' => $request->user()?->id,
                'action' => 'barangays.imported',
                'auditable_type' => $lgu::class,
                'auditable_id' => $lgu->id,
                'new_values' => [
                    'imported' => $imported,
                    'skipped' => $skipped,
                ],
            ]);
        });

        Log::info('LGU barangays imported from map.', [
            'lgu_id' => $lgu->id,
            'imported' => $imported,
            'skipped' => $skipped,
            'actor_user_id' => $request->user()?->id,
        ]);

        if ($imported > 0) {
            $message = "{$imported} barangay(s) imported successfully.";

            if ($skipped > 0) {
                $message .= " {$skipped} already registered or invalid were skipped.";
            }

            return back()->with('success', $message);
        }

        return back()->with(
            'success',
            $skipped > 0
                ? 'No new barangays were imported. Selected barangays may already be registered or have invalid PSGC codes.'
                : 'No new barangays were imported.',
        );
    }

    public function storeCaptain(
        StoreCaptainRequest $request,
        CreateCaptainAccount $createCaptainAccount,
    ): RedirectResponse {
        $lgu = $this->currentLgu($request);
        $actor = $request->user();
        abort_if($actor === null, 403);

        $barangay = Barangay::query()
            ->whereKey($request->integer('barangay_id'))
            ->where('lgu_id', $lgu->id)
            ->firstOrFail();
        $validated = $request->validated();

        try {
            $account = DB::transaction(function () use (
                $actor,
                $barangay,
                $lgu,
                $validated,
                $createCaptainAccount,
            ): User {
                $temporaryPassword = filled($validated['password'] ?? null)
                    ? (string) $validated['password']
                    : Str::password(
                        length: 8,
                        letters: true,
                        numbers: true,
                        symbols: false,
                        spaces: false,
                    );

                $account = $createCaptainAccount->execute(
                    $actor,
                    $barangay,
                    [
                        'name' => $validated['name'],
                        'email' => $validated['email'],
                        'password' => $temporaryPassword,
                        'phone' => $validated['phone'],
                    ],
                );

                Mail::to($account->email)->send(
                    new BarangayCaptainCredentialsMail(
                        captainName: $account->name,
                        barangayName: $barangay->name,
                        lguName: $lgu->name,
                        emailAddress: $account->email,
                        temporaryPassword: $temporaryPassword,
                        loginUrl: route('login', absolute: true),
                    ),
                );

                return $account;
            });
        } catch (Throwable $exception) {
            report($exception);
            Log::error('Barangay captain creation failed.', [
                'actor_user_id' => $actor->id,
                'lgu_id' => $lgu->id,
                'barangay_id' => $barangay->id,
                'captain_email' => $validated['email'],
                'error' => $exception->getMessage(),
            ]);

            return back()
                ->withInput()
                ->with(
                    'error',
                    'The captain account was not created because the credentials email could not be sent. Check the email address and mail settings, then try again.',
                );
        }

        return back()->with(
            'success',
            "{$account->name} was assigned as captain of {$barangay->name}. Login credentials were emailed to {$account->email}.",
        );
    }

    public function updateCaptain(Request $request, Barangay $barangay): RedirectResponse
    {
        $lgu = $this->currentLgu($request);

        if ($barangay->lgu_id !== $lgu->id) {
            abort(403);
        }

        $captain = $barangay->captain;

        if ($captain === null) {
            throw ValidationException::withMessages([
                'barangay_id' => 'This barangay has no captain account to update.',
            ]);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', "unique:users,email,{$captain->id}"],
            'phone' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
        ], [
            'phone.regex' => 'Phone must be 11 digits and start with 09.',
        ]);

        $oldValues = [
            'name' => $captain->name,
            'email' => $captain->email,
            'phone' => $captain->phone,
        ];

        $captain->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
        ]);

        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'action' => 'barangay_captain.updated',
            'auditable_type' => User::class,
            'auditable_id' => $captain->id,
            'old_values' => $oldValues,
            'new_values' => $validated,
        ]);

        Log::info('Barangay captain details updated.', [
            'captain_id' => $captain->id,
            'barangay_id' => $barangay->id,
            'actor_user_id' => $request->user()?->id,
        ]);

        return back()->with(
            'success',
            "Captain details for {$barangay->name} were updated.",
        );
    }

    public function replaceCaptain(Request $request, Barangay $barangay): RedirectResponse
    {
        $lgu = $this->currentLgu($request);

        if ($barangay->lgu_id !== $lgu->id) {
            abort(403);
        }

        $previous = $barangay->captain;

        if ($previous === null) {
            throw ValidationException::withMessages([
                'barangay_id' => 'This barangay has no captain to replace. Use "Add captain" instead.',
            ]);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', 'min:8'],
            'phone' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
        ], [
            'phone.regex' => 'Phone must be 11 digits and start with 09.',
        ]);

        $replacement = DB::transaction(function () use ($request, $barangay, $previous, $validated): User {
            $barangay->update(['captain_user_id' => null]);
            // Previous captain loses access; soft delete keeps audit history intact.
            $previous->delete();

            $account = User::query()->create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
                'phone' => $validated['phone'] ?? null,
                'role' => UserRole::BarangayCaptain,
                'lgu_id' => $barangay->lgu_id,
                'station_id' => null,
            ]);

            $barangay->update(['captain_user_id' => $account->id]);

            AuditLog::query()->create([
                'user_id' => $request->user()?->id,
                'action' => 'barangay_captain.replaced',
                'auditable_type' => User::class,
                'auditable_id' => $account->id,
                'old_values' => [
                    'previous_captain_id' => $previous->id,
                    'previous_captain_name' => $previous->name,
                ],
                'new_values' => [
                    'name' => $account->name,
                    'email' => $account->email,
                    'barangay_id' => $barangay->id,
                ],
            ]);

            return $account;
        });

        Log::info('Barangay captain replaced.', [
            'previous_captain_id' => $previous->id,
            'new_captain_id' => $replacement->id,
            'barangay_id' => $barangay->id,
            'actor_user_id' => $request->user()?->id,
        ]);

        return back()->with(
            'success',
            "{$replacement->name} replaced {$previous->name} as captain of {$barangay->name}.",
        );
    }

    public function toggleStatus(Request $request, Barangay $barangay): RedirectResponse
    {
        $lgu = $this->currentLgu($request);

        if ($barangay->lgu_id !== $lgu->id) {
            abort(403);
        }

        $barangay->update(['is_active' => ! $barangay->is_active]);

        Log::info('Barangay status toggled.', [
            'barangay_id' => $barangay->id,
            'is_active' => $barangay->is_active,
            'actor_user_id' => $request->user()?->id,
        ]);

        return back()->with(
            'success',
            $barangay->is_active
                ? "{$barangay->name} was activated."
                : "{$barangay->name} was deactivated.",
        );
    }
}

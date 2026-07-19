<?php

namespace App\Http\Controllers\Chief;

use App\Actions\Users\CreateManagedAccount;
use App\Http\Controllers\Controller;
use App\Http\Requests\Chief\StoreStaffRequest;
use App\Mail\StaffCredentialsMail;
use App\Models\Lgu;
use App\Models\Station;
use App\Models\User;
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

class StaffController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var Station $station */
        $station = $request->attributes->get('current_station');
        /** @var Lgu $lgu */
        $lgu = $request->attributes->get('current_lgu');

        $staff = User::query()
            ->where('role', UserRole::Staff)
            ->where('station_id', $station->id)
            ->latest()
            ->get()
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'position_title' => $user->position_title,
                'created_at' => $user->created_at?->diffForHumans(),
            ]);

        return Inertia::render('chief/staff/index', [
            'station' => [
                'id' => $station->id,
                'name' => $station->name,
                'type' => $station->stationType?->name,
            ],
            'lgu' => [
                'id' => $lgu->id,
                'name' => $lgu->name,
            ],
            'staff' => $staff,
            'positionSuggestions' => [
                'Rescuer',
                'Dispatcher',
                'Medic',
                'Driver',
                'Firefighter',
                'Police Officer',
                'Support Staff',
            ],
        ]);
    }

    public function store(
        StoreStaffRequest $request,
        CreateManagedAccount $createManagedAccount,
    ): RedirectResponse {
        /** @var Station $station */
        $station = $request->attributes->get('current_station');
        /** @var Lgu $lgu */
        $lgu = $request->attributes->get('current_lgu');
        $actor = $request->user();
        abort_if($actor === null, 403);

        $validated = $request->validated();
        $temporaryPassword = filled($validated['password'] ?? null)
            ? (string) $validated['password']
            : Str::password(
                length: 8,
                letters: true,
                numbers: true,
                symbols: false,
                spaces: false,
            );

        try {
            $account = DB::transaction(function () use (
                $actor,
                $createManagedAccount,
                $validated,
                $temporaryPassword,
                $station,
                $lgu,
            ): User {
                $account = $createManagedAccount->execute($actor, [
                    'name' => $validated['name'],
                    'email' => $validated['email'],
                    'password' => $temporaryPassword,
                    'phone' => $validated['phone'] ?? null,
                    'position_title' => $validated['position_title'],
                    'lgu_id' => null,
                    'station_id' => null,
                ]);

                Mail::to($account->email)->send(
                    new StaffCredentialsMail(
                        staffName: $account->name,
                        stationName: $station->name,
                        lguName: $lgu->name,
                        positionTitle: $account->position_title ?: $validated['position_title'],
                        emailAddress: $account->email,
                        temporaryPassword: $temporaryPassword,
                        loginUrl: route('login', absolute: true),
                    ),
                );

                return $account;
            });
        } catch (Throwable $exception) {
            report($exception);
            Log::error('Chief staff creation failed.', [
                'actor_user_id' => $actor->id,
                'station_id' => $station->id,
                'email' => $validated['email'],
                'error' => $exception->getMessage(),
            ]);

            return back()
                ->withInput()
                ->with(
                    'error',
                    'The staff account was not created because the credentials email could not be sent. Check the email address and mail settings, then try again.',
                );
        }

        Log::info('[Responde Chief] Staff account created', [
            'staff_id' => $account->id,
            'station_id' => $station->id,
            'actor_user_id' => $actor->id,
        ]);

        return back()->with(
            'success',
            "{$account->name} was added to {$station->name}. Login credentials were emailed to {$account->email}.",
        );
    }

    public function destroy(Request $request, User $staff): RedirectResponse
    {
        /** @var Station $station */
        $station = $request->attributes->get('current_station');
        $actor = $request->user();
        abort_if($actor === null, 403);

        if (
            $staff->role !== UserRole::Staff
            || $staff->station_id !== $station->id
        ) {
            abort(403);
        }

        abort_unless($actor->can('delete', $staff), 403);

        $staffName = $staff->name;
        $staff->delete();

        Log::info('[Responde Chief] Staff account deactivated', [
            'staff_id' => $staff->id,
            'station_id' => $station->id,
            'actor_user_id' => $actor->id,
        ]);

        return back()->with(
            'success',
            "{$staffName} was deactivated and can no longer sign in.",
        );
    }
}

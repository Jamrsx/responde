<?php

namespace App\Http\Controllers;

use App\Actions\Users\CreateManagedAccount;
use App\Http\Requests\StoreManagedAccountRequest;
use App\Mail\LguAdminCredentialsMail;
use App\Models\Lgu;
use App\Models\User;
use App\UserRole;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

class ManagedAccountController extends Controller
{
    public function store(
        StoreManagedAccountRequest $request,
        CreateManagedAccount $createManagedAccount,
    ): RedirectResponse {
        $data = $request->accountData();
        $temporaryPassword = filled($data['password'] ?? null)
            ? (string) $data['password']
            : Str::password(
                length: 8,
                letters: true,
                numbers: true,
                symbols: false,
                spaces: false,
            );

        $data['password'] = $temporaryPassword;
        $actor = $request->user();

        try {
            $account = DB::transaction(function () use (
                $actor,
                $createManagedAccount,
                $data,
                $temporaryPassword,
            ): User {
                $account = $createManagedAccount->execute($actor, $data);

                if ($account->role === UserRole::LguAdmin) {
                    $lgu = Lgu::query()->find($account->lgu_id);

                    Mail::to($account->email)->send(
                        new LguAdminCredentialsMail(
                            adminName: $account->name,
                            lguName: $lgu?->name ?? 'your LGU',
                            emailAddress: $account->email,
                            temporaryPassword: $temporaryPassword,
                            loginUrl: route('login', absolute: true),
                        ),
                    );
                }

                return $account;
            });
        } catch (Throwable $exception) {
            report($exception);
            Log::error('Managed account creation failed.', [
                'actor_user_id' => $actor?->id,
                'email' => $data['email'],
                'error' => $exception->getMessage(),
            ]);

            return back()
                ->withInput()
                ->with(
                    'error',
                    'The account was not created because the credentials email could not be sent. Check the email address and mail settings, then try again.',
                );
        }

        $message = $account->role === UserRole::LguAdmin
            ? "{$account->name}'s administrator account was created. Login credentials were emailed to {$account->email}."
            : "{$account->name}'s {$account->role->value} account was created successfully.";

        return back()->with('success', $message);
    }
}

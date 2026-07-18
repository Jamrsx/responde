<?php

namespace App\Actions\Users;

use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\User;
use App\UserRole;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class CreateCaptainAccount
{
    /**
     * @param  array{
     *     name: string,
     *     email: string,
     *     password: string,
     *     phone: string|null
     * }  $data
     */
    public function execute(User $actor, Barangay $barangay, array $data): User
    {
        if ($actor->role !== UserRole::LguAdmin || $actor->lgu_id !== $barangay->lgu_id) {
            throw new AuthorizationException('You can only assign captains within your LGU.');
        }

        if ($barangay->captain_user_id !== null) {
            throw ValidationException::withMessages([
                'barangay_id' => 'This barangay already has a captain account.',
            ]);
        }

        return DB::transaction(function () use ($actor, $barangay, $data): User {
            $account = User::query()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'phone' => $data['phone'] ?? null,
                'role' => UserRole::BarangayCaptain,
                'lgu_id' => $barangay->lgu_id,
                'station_id' => null,
            ]);

            $barangay->update(['captain_user_id' => $account->id]);

            AuditLog::query()->create([
                'user_id' => $actor->id,
                'action' => 'barangay_captain.created',
                'auditable_type' => User::class,
                'auditable_id' => $account->id,
                'new_values' => [
                    'name' => $account->name,
                    'email' => $account->email,
                    'role' => $account->role->value,
                    'lgu_id' => $account->lgu_id,
                    'barangay_id' => $barangay->id,
                ],
            ]);

            Log::info('Barangay captain account created.', [
                'actor_user_id' => $actor->id,
                'created_user_id' => $account->id,
                'barangay_id' => $barangay->id,
                'lgu_id' => $barangay->lgu_id,
            ]);

            return $account;
        });
    }
}

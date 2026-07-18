<?php

namespace App\Actions\Users;

use App\Models\AuditLog;
use App\Models\User;
use App\UserRole;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CreateManagedAccount
{
    /**
     * @param  array{
     *     name: string,
     *     email: string,
     *     password: string,
     *     phone: string|null,
     *     lgu_id: int|null,
     *     station_id: int|null
     * }  $data
     */
    public function execute(User $actor, array $data): User
    {
        $managedRole = $actor->role->managedRole();

        if ($managedRole === null) {
            throw new AuthorizationException('Your account cannot create managed users.');
        }

        [$lguId, $stationId] = match ($actor->role) {
            UserRole::SuperAdmin => [$data['lgu_id'], null],
            UserRole::LguAdmin => [$actor->lgu_id, $data['station_id']],
            UserRole::Chief => [$actor->lgu_id, $actor->station_id],
            default => [null, null],
        };

        if ($lguId === null || ($managedRole !== UserRole::LguAdmin && $stationId === null)) {
            throw new AuthorizationException('Your account is missing its required LGU or station assignment.');
        }

        return DB::transaction(function () use ($actor, $data, $managedRole, $lguId, $stationId): User {
            $account = User::query()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'phone' => $data['phone'] ?? null,
                'role' => $managedRole,
                'lgu_id' => $lguId,
                'station_id' => $stationId,
            ]);

            AuditLog::query()->create([
                'user_id' => $actor->id,
                'action' => 'managed_account.created',
                'auditable_type' => User::class,
                'auditable_id' => $account->id,
                'new_values' => [
                    'name' => $account->name,
                    'email' => $account->email,
                    'role' => $account->role->value,
                    'lgu_id' => $account->lgu_id,
                    'station_id' => $account->station_id,
                ],
            ]);

            Log::info('Managed account created.', [
                'actor_user_id' => $actor->id,
                'created_user_id' => $account->id,
                'role' => $account->role->value,
                'lgu_id' => $account->lgu_id,
                'station_id' => $account->station_id,
            ]);

            return $account;
        });
    }
}

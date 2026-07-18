<?php

namespace App\Actions\Users;

use App\Models\AuditLog;
use App\Models\Station;
use App\Models\User;
use App\UserRole;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class CreateStationChiefAccount
{
    /**
     * @param  array{
     *     name: string,
     *     email: string,
     *     password: string,
     *     phone: string|null
     * }  $data
     */
    public function execute(User $actor, Station $station, array $data): User
    {
        if ($actor->role !== UserRole::LguAdmin || $actor->lgu_id !== $station->lgu_id) {
            throw new AuthorizationException('You can only assign chiefs within your LGU.');
        }

        if ($station->stationType?->code === 'tanod') {
            throw ValidationException::withMessages([
                'station_id' => 'Tanod outposts do not use station chief accounts.',
            ]);
        }

        if ($station->chief_user_id !== null) {
            throw ValidationException::withMessages([
                'station_id' => 'This station already has an active chief. Replace the chief instead.',
            ]);
        }

        return DB::transaction(function () use ($actor, $station, $data): User {
            $account = User::query()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'phone' => $data['phone'] ?? null,
                'role' => UserRole::Chief,
                'lgu_id' => $station->lgu_id,
                'station_id' => $station->id,
            ]);

            $station->update(['chief_user_id' => $account->id]);

            AuditLog::query()->create([
                'user_id' => $actor->id,
                'action' => 'station_chief.created',
                'auditable_type' => User::class,
                'auditable_id' => $account->id,
                'new_values' => [
                    'name' => $account->name,
                    'email' => $account->email,
                    'role' => $account->role->value,
                    'lgu_id' => $account->lgu_id,
                    'station_id' => $station->id,
                ],
            ]);

            Log::info('Station chief account created.', [
                'actor_user_id' => $actor->id,
                'created_user_id' => $account->id,
                'station_id' => $station->id,
                'lgu_id' => $station->lgu_id,
            ]);

            return $account;
        });
    }
}

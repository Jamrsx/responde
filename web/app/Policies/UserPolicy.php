<?php

namespace App\Policies;

use App\Models\User;
use App\UserRole;

class UserPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->role->canCreateAccounts();
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, User $model): bool
    {
        if ($user->is($model)) {
            return true;
        }

        return match ($user->role) {
            UserRole::SuperAdmin => true,
            UserRole::LguAdmin => $model->lgu_id === $user->lgu_id
                && in_array($model->role, [UserRole::Chief, UserRole::Staff], true),
            UserRole::Chief => $model->station_id === $user->station_id
                && $model->role === UserRole::Staff,
            default => false,
        };
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->role->canCreateAccounts();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, User $model): bool
    {
        return $this->view($user, $model);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, User $model): bool
    {
        return ! $user->is($model) && $this->view($user, $model);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, User $model): bool
    {
        return $this->view($user, $model);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, User $model): bool
    {
        return false;
    }
}

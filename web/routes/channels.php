<?php

use App\Models\User;
use App\UserRole;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('lgu.{lguId}', function (User $user, int $lguId): bool {
    return $user->role === UserRole::LguAdmin
        && $user->lgu_id === $lguId;
});

Broadcast::channel('station.{stationId}', function (
    User $user,
    int $stationId,
): bool {
    return in_array($user->role, [UserRole::Chief, UserRole::Staff], true)
        && $user->station_id === $stationId;
});

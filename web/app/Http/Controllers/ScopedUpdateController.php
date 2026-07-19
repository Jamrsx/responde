<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\ScopedUpdateSignal;
use App\UserRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScopedUpdateController extends Controller
{
    public function __invoke(
        Request $request,
        ScopedUpdateSignal $signals,
    ): JsonResponse {
        /** @var User $user */
        $user = $request->user();
        [$scope, $scopeId] = $this->scopeFor($user);

        if ($scope === null || $scopeId === null) {
            return response()->json([
                'scope' => null,
                'scope_id' => null,
                'version' => 'initial',
            ]);
        }

        $state = $signals->state($scope, $scopeId);

        return response()->json([
            'scope' => $scope,
            'scope_id' => $scopeId,
            'version' => $state['version'],
            'topic' => $state['topic'],
        ])->header('Cache-Control', 'no-store, private');
    }

    /**
     * @return array{0: string|null, 1: int|null}
     */
    private function scopeFor(User $user): array
    {
        return match ($user->role) {
            UserRole::LguAdmin => [
                'lgu',
                $user->lgu_id !== null ? (int) $user->lgu_id : null,
            ],
            UserRole::Chief, UserRole::Staff => [
                'station',
                $user->station_id !== null ? (int) $user->station_id : null,
            ],
            default => [null, null],
        };
    }
}

<?php

namespace App\Http\Middleware;

use App\Models\Station;
use App\Models\User;
use App\UserRole;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        /** @var User|null $user */
        $user = $request->user();

        if ($user?->role === UserRole::Chief) {
            $user->loadMissing('station:id,logo_path');
        }

        $avatarUrl = $user?->role === UserRole::Chief
            ? $user->station?->logoUrl()
            : null;

        if ($avatarUrl === null && filled($user?->profile_photo_path)) {
            $avatarUrl = '/storage/'.ltrim((string) $user->profile_photo_path, '/');
        }

        $pendingLocationUpdates = [];

        if ($user?->role === UserRole::LguAdmin && $user->lgu_id !== null) {
            $pendingLocationUpdates = Station::query()
                ->where('lgu_id', $user->lgu_id)
                ->where('location_update_status', 'pending')
                ->whereNotNull('proposed_latitude')
                ->whereNotNull('proposed_longitude')
                ->orderBy('location_update_requested_at')
                ->get(['id', 'name', 'location_update_requested_at'])
                ->map(fn (Station $station): array => [
                    'id' => $station->id,
                    'name' => $station->name,
                    'requested_at' => $station->location_update_requested_at?->diffForHumans(),
                ])
                ->values()
                ->all();
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user
                    ? [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'role' => $user->role->value,
                        'profile_photo_path' => $user->profile_photo_path,
                        'avatar_url' => $avatarUrl,
                    ]
                    : null,
            ],
            'notifications' => [
                'pending_location_updates' => $pendingLocationUpdates,
                'pending_location_update_count' => count($pendingLocationUpdates),
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}

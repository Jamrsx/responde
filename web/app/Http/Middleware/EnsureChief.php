<?php

namespace App\Http\Middleware;

use App\Models\Station;
use App\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureChief
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->role !== UserRole::Chief) {
            abort(403, 'Only station chiefs can access this area.');
        }

        if ($user->lgu_id === null || $user->station_id === null) {
            abort(403, 'Your account is not assigned to a station.');
        }

        $station = Station::query()
            ->with([
                'lgu:id,name,is_active,psgc_code,latitude,longitude',
                'stationType:id,name,code',
            ])
            ->whereKey($user->station_id)
            ->where('lgu_id', $user->lgu_id)
            ->where('chief_user_id', $user->id)
            ->whereNull('deleted_at')
            ->first();

        if (
            $station === null
            || $station->lgu === null
            || ! $station->lgu->is_active
            || $station->approval_status !== 'approved'
        ) {
            abort(403, 'Your assigned station is inactive or unavailable.');
        }

        $request->attributes->set('current_station', $station);
        $request->attributes->set('current_lgu', $station->lgu);

        return $next($request);
    }
}

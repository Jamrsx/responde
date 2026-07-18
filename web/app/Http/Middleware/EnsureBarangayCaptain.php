<?php

namespace App\Http\Middleware;

use App\Models\Barangay;
use App\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureBarangayCaptain
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->role !== UserRole::BarangayCaptain) {
            abort(403, 'Only barangay captains can access this area.');
        }

        if ($user->lgu_id === null) {
            abort(403, 'Your account is not assigned to an LGU.');
        }

        $barangay = Barangay::query()
            ->with('lgu:id,name,is_active,psgc_code,latitude,longitude')
            ->where('captain_user_id', $user->id)
            ->where('lgu_id', $user->lgu_id)
            ->where('is_active', true)
            ->first();

        if ($barangay === null || $barangay->lgu === null || ! $barangay->lgu->is_active) {
            abort(403, 'Your assigned barangay is inactive or unavailable.');
        }

        $request->attributes->set('current_barangay', $barangay);
        $request->attributes->set('current_lgu', $barangay->lgu);

        return $next($request);
    }
}

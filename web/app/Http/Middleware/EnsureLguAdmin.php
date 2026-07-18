<?php

namespace App\Http\Middleware;

use App\Models\Lgu;
use App\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureLguAdmin
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->role !== UserRole::LguAdmin) {
            abort(403, 'Only LGU administrators can access this area.');
        }

        if ($user->lgu_id === null) {
            abort(403, 'Your account is not assigned to an LGU.');
        }

        $lgu = Lgu::query()->find($user->lgu_id);

        if ($lgu === null || ! $lgu->is_active) {
            abort(403, 'Your assigned LGU is inactive or unavailable.');
        }

        $request->attributes->set('current_lgu', $lgu);

        return $next($request);
    }
}

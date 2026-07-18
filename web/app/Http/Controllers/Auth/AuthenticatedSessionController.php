<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\UserRole;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('auth/login');
    }

    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();
        $request->session()->regenerate();

        $user = $request->user();

        Log::info('Web login succeeded.', [
            'user_id' => $user?->id,
        ]);

        $defaultRoute = $user?->role === UserRole::SuperAdmin
            ? route('admin.dashboard', absolute: false)
            : route('home', absolute: false);

        return redirect()->intended($defaultRoute);
    }

    public function destroy(Request $request): RedirectResponse
    {
        $userId = $request->user()?->id;

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        Log::info('Web logout completed.', [
            'user_id' => $userId,
        ]);

        return redirect()->route('login');
    }
}

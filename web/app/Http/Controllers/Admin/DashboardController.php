<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Lgu;
use App\Models\Station;
use App\Models\User;
use App\UserRole;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $recentLgus = Lgu::query()
            ->latest()
            ->take(5)
            ->get(['id', 'name', 'province', 'municipality', 'is_active', 'created_at'])
            ->map(fn (Lgu $lgu): array => [
                'id' => $lgu->id,
                'name' => $lgu->name,
                'province' => $lgu->province,
                'municipality' => $lgu->municipality,
                'is_active' => $lgu->is_active,
                'created_at' => $lgu->created_at?->diffForHumans(),
            ]);

        $recentAdmins = User::query()
            ->where('role', UserRole::LguAdmin)
            ->with('lgu:id,name')
            ->latest()
            ->take(5)
            ->get(['id', 'name', 'email', 'lgu_id', 'created_at'])
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'lgu_name' => $user->lgu?->name,
                'created_at' => $user->created_at?->diffForHumans(),
            ]);

        return Inertia::render('admin/dashboard', [
            'stats' => [
                'totalLgus' => Lgu::query()->count(),
                'activeLgus' => Lgu::query()->where('is_active', true)->count(),
                'lguAdmins' => User::query()->where('role', UserRole::LguAdmin)->count(),
                'stations' => Station::query()->count(),
            ],
            'recentLgus' => $recentLgus,
            'recentAdmins' => $recentAdmins,
        ]);
    }
}

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Lgu;
use App\Models\User;
use App\UserRole;
use Inertia\Inertia;
use Inertia\Response;

class LguAdminController extends Controller
{
    public function index(): Response
    {
        $admins = User::query()
            ->where('role', UserRole::LguAdmin)
            ->with('lgu:id,name')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'phone', 'lgu_id', 'created_at'])
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'lgu_name' => $user->lgu?->name,
                'created_at' => $user->created_at?->format('M j, Y'),
            ]);

        $lgus = Lgu::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('admin/lgu-admins/index', [
            'admins' => $admins,
            'lgus' => $lgus,
        ]);
    }
}

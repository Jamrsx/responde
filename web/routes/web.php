<?php

use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\LguAdminController;
use App\Http\Controllers\Admin\LguController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\ManagedAccountController;
use App\Http\Controllers\ProfileController;
use App\UserRole;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('guest')->group(function (): void {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])
        ->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])
        ->name('login.store');
});

Route::middleware('auth')->group(function (): void {
    Route::get('/', function () {
        $user = auth()->user();

        if ($user?->role === UserRole::SuperAdmin) {
            return redirect()->route('admin.dashboard');
        }

        return Inertia::render('welcome');
    })->name('home');

    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');

    Route::get('/profile', [ProfileController::class, 'edit'])
        ->name('profile.edit');
    Route::put('/profile', [ProfileController::class, 'update'])
        ->name('profile.update');
    Route::put('/profile/password', [ProfileController::class, 'updatePassword'])
        ->middleware('throttle:6,1')
        ->name('profile.password.update');
    Route::delete('/profile/photo', [ProfileController::class, 'destroyPhoto'])
        ->name('profile.photo.destroy');

    Route::post('/managed-accounts', [ManagedAccountController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('managed-accounts.store');

    Route::middleware('super_admin')->prefix('admin')->group(function (): void {
        Route::get('/', [DashboardController::class, 'index'])
            ->name('admin.dashboard');

        Route::get('/lgus', [LguController::class, 'index'])
            ->name('admin.lgus.index');
        Route::get('/lgus/create', [LguController::class, 'create'])
            ->name('admin.lgus.create');
        Route::post('/lgus', [LguController::class, 'store'])
            ->name('admin.lgus.store');
        Route::get('/lgus/{lgu}/edit', [LguController::class, 'edit'])
            ->name('admin.lgus.edit');
        Route::put('/lgus/{lgu}', [LguController::class, 'update'])
            ->name('admin.lgus.update');
        Route::patch('/lgus/{lgu}/status', [LguController::class, 'toggleStatus'])
            ->name('admin.lgus.toggle-status');

        Route::get('/lgu-admins', [LguAdminController::class, 'index'])
            ->name('admin.lgu-admins.index');
    });
});

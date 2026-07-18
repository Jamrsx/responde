<?php

use App\Http\Controllers\ManagedAccountController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::post('/managed-accounts', [ManagedAccountController::class, 'store'])
    ->middleware(['auth', 'throttle:10,1'])
    ->name('managed-accounts.store');

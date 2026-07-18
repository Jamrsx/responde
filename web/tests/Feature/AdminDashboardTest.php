<?php

use App\Models\Lgu;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('super admin can view the admin dashboard', function () {
    $user = User::factory()->superAdmin()->create();

    Lgu::query()->create(['name' => 'Sample City', 'province' => 'Sample Province']);
    Lgu::query()->create(['name' => 'Inactive Town', 'is_active' => false]);

    $this->actingAs($user)
        ->get(route('admin.dashboard'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/dashboard')
            ->where('stats.totalLgus', 2)
            ->where('stats.activeLgus', 1)
            ->has('recentLgus', 2)
            ->has('recentAdmins'));
});

test('super admin dashboard reports stats', function () {
    $user = User::factory()->superAdmin()->create();

    $this->actingAs($user)
        ->get(route('admin.dashboard'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/dashboard')
            ->where('stats.totalLgus', 0)
            ->where('stats.lguAdmins', 0)
            ->where('stats.stations', 0));
});

test('non super admin users cannot access the admin dashboard', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('admin.dashboard'))
        ->assertForbidden();
});

test('guests are redirected to login from the admin dashboard', function () {
    $this->get(route('admin.dashboard'))
        ->assertRedirect(route('login'));
});

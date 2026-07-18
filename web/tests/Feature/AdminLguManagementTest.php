<?php

use App\Models\Lgu;
use App\Models\User;
use App\UserRole;
use Inertia\Testing\AssertableInertia as Assert;

test('super admin can view the lgus page', function () {
    $user = User::factory()->superAdmin()->create();

    Lgu::query()->create(['name' => 'Sample City']);

    $this->actingAs($user)
        ->get(route('admin.lgus.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/lgus/index')
            ->has('lgus', 1));
});

test('super admin can create an lgu', function () {
    $user = User::factory()->superAdmin()->create();

    $this->actingAs($user)
        ->post(route('admin.lgus.store'), [
            'name' => 'City of Ozamiz',
            'code' => 'OZC',
            'province' => 'Misamis Occidental',
            'municipality' => 'Ozamiz City',
            'contact_number' => '088-123-4567',
        ])
        ->assertRedirect(route('admin.lgus.index'))
        ->assertSessionHas('success');

    $this->assertDatabaseHas(Lgu::class, [
        'name' => 'City of Ozamiz',
        'code' => 'OZC',
        'is_active' => true,
    ]);
});

test('super admin can open the create and edit lgu pages', function () {
    $user = User::factory()->superAdmin()->create();
    $lgu = Lgu::query()->create(['name' => 'Opol']);

    $this->actingAs($user)
        ->get(route('admin.lgus.create'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page->component('admin/lgus/create'));

    $this->actingAs($user)
        ->get(route('admin.lgus.edit', $lgu))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/lgus/edit')
            ->where('lgu.id', $lgu->id)
            ->where('lgu.name', 'Opol'));
});

test('super admin can create an lgu with map boundary details', function () {
    $user = User::factory()->superAdmin()->create();

    $this->actingAs($user)
        ->post(route('admin.lgus.store'), [
            'name' => 'Opol',
            'municipality' => 'Opol',
            'province' => 'Misamis Oriental',
            'region' => 'Region X (Northern Mindanao)',
            'psgc_code' => '1004315000',
            'classification' => 'Municipality',
            'latitude' => 8.5211,
            'longitude' => 124.5751,
            'area_km2' => 105,
        ])
        ->assertRedirect(route('admin.lgus.index'))
        ->assertSessionHas('success');

    $this->assertDatabaseHas(Lgu::class, [
        'name' => 'Opol',
        'psgc_code' => '1004315000',
        'classification' => 'Municipality',
    ]);
});

test('an lgu psgc code cannot be registered twice', function () {
    $user = User::factory()->superAdmin()->create();

    Lgu::query()->create(['name' => 'Opol', 'psgc_code' => '1004315000']);

    $this->actingAs($user)
        ->post(route('admin.lgus.store'), [
            'name' => 'Opol Duplicate',
            'psgc_code' => '1004315000',
        ])
        ->assertSessionHasErrors('psgc_code');
});

test('lgu creation requires a name', function () {
    $user = User::factory()->superAdmin()->create();

    $this->actingAs($user)
        ->post(route('admin.lgus.store'), ['name' => ''])
        ->assertSessionHasErrors('name');
});

test('lgu code must be unique', function () {
    $user = User::factory()->superAdmin()->create();

    Lgu::query()->create(['name' => 'First City', 'code' => 'FST']);

    $this->actingAs($user)
        ->post(route('admin.lgus.store'), [
            'name' => 'Second City',
            'code' => 'FST',
        ])
        ->assertSessionHasErrors('code');
});

test('super admin can update and deactivate an lgu', function () {
    $user = User::factory()->superAdmin()->create();

    $lgu = Lgu::query()->create([
        'name' => 'Old Name',
        'psgc_code' => '1001803000',
        'province' => 'Camiguin',
        'municipality' => 'Mahinog',
        'is_active' => true,
    ]);

    $this->actingAs($user)
        ->put(route('admin.lgus.update', $lgu), [
            'name' => 'Hacked Name',
            'code' => '9104',
            'province' => 'Misamis Occidental',
            'municipality' => 'Other Place',
            'psgc_code' => '9999999999',
            'contact_number' => '088-123-4567',
            'is_active' => false,
        ])
        ->assertRedirect(route('admin.lgus.index'))
        ->assertSessionHas('success');

    $this->assertDatabaseHas(Lgu::class, [
        'id' => $lgu->id,
        'name' => 'Old Name',
        'psgc_code' => '1001803000',
        'province' => 'Camiguin',
        'municipality' => 'Mahinog',
        'code' => '9104',
        'contact_number' => '088-123-4567',
        'is_active' => false,
    ]);
});

test('non super admin cannot manage lgus', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('admin.lgus.index'))
        ->assertForbidden();

    $this->actingAs($user)
        ->post(route('admin.lgus.store'), ['name' => 'Blocked City'])
        ->assertForbidden();
});

test('super admin can view the lgu admins page', function () {
    $user = User::factory()->superAdmin()->create();

    $lgu = Lgu::query()->create(['name' => 'Sample City']);
    User::factory()->lguAdmin($lgu)->create();

    $this->actingAs($user)
        ->get(route('admin.lgu-admins.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/lgu-admins/index')
            ->has('admins', 1)
            ->has('lgus', 1));
});

test('super admin can deactivate and activate an lgu from the list', function () {
    $user = User::factory()->superAdmin()->create();
    $lgu = Lgu::query()->create(['name' => 'Asuncion', 'is_active' => true]);

    $this->actingAs($user)
        ->patch(route('admin.lgus.toggle-status', $lgu))
        ->assertRedirect(route('admin.lgus.index'))
        ->assertSessionHas('success');

    $this->assertDatabaseHas(Lgu::class, [
        'id' => $lgu->id,
        'is_active' => false,
    ]);

    $this->actingAs($user)
        ->patch(route('admin.lgus.toggle-status', $lgu))
        ->assertRedirect(route('admin.lgus.index'))
        ->assertSessionHas('success');

    $this->assertDatabaseHas(Lgu::class, [
        'id' => $lgu->id,
        'is_active' => true,
    ]);
});

test('non super admin cannot toggle lgu status', function () {
    $user = User::factory()->create();
    $lgu = Lgu::query()->create(['name' => 'Asuncion']);

    $this->actingAs($user)
        ->patch(route('admin.lgus.toggle-status', $lgu))
        ->assertForbidden();
});

test('managed account phone must be 11 digits starting with 09', function () {
    $user = User::factory()->superAdmin()->create();
    $lgu = Lgu::query()->create(['name' => 'Sample City']);

    $this->actingAs($user)
        ->post(route('managed-accounts.store'), [
            'name' => 'Maria Santos',
            'email' => 'maria-phone@example.com',
            'phone' => '0917123456',
            'lgu_id' => $lgu->id,
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
        ])
        ->assertSessionHasErrors('phone');

    $this->actingAs($user)
        ->post(route('managed-accounts.store'), [
            'name' => 'Maria Santos',
            'email' => 'maria-phone2@example.com',
            'phone' => '08171234567',
            'lgu_id' => $lgu->id,
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
        ])
        ->assertSessionHasErrors('phone');
});

test('super admin can create an lgu admin from the managed accounts endpoint', function () {
    $user = User::factory()->superAdmin()->create();

    $lgu = Lgu::query()->create(['name' => 'Sample City']);

    $this->actingAs($user)
        ->post(route('managed-accounts.store'), [
            'name' => 'Maria Santos',
            'email' => 'maria@example.com',
            'phone' => '09171234567',
            'lgu_id' => $lgu->id,
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->assertDatabaseHas(User::class, [
        'email' => 'maria@example.com',
        'role' => UserRole::LguAdmin->value,
        'lgu_id' => $lgu->id,
    ]);
});

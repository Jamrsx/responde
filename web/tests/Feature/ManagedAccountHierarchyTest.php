<?php

use App\Models\AuditLog;
use App\Models\Lgu;
use App\Models\Station;
use App\Models\StationType;
use App\Models\User;
use App\UserRole;

test('super admin creates an LGU admin assigned to the selected LGU', function () {
    $lgu = createHierarchyLgu();
    $superAdmin = User::factory()->superAdmin()->create();

    $this->actingAs($superAdmin)
        ->from('/')
        ->post(route('managed-accounts.store'), managedAccountPayload([
            'email' => 'lgu-admin@example.com',
            'lgu_id' => $lgu->id,
        ]))
        ->assertRedirect('/')
        ->assertSessionHasNoErrors();

    $this->assertDatabaseHas(User::class, [
        'email' => 'lgu-admin@example.com',
        'role' => UserRole::LguAdmin->value,
        'lgu_id' => $lgu->id,
        'station_id' => null,
    ]);
});

test('LGU admin creates a chief only for a station in their LGU', function () {
    [$lgu, $station] = createHierarchyStation();
    $lguAdmin = User::factory()->lguAdmin($lgu)->create();

    $this->actingAs($lguAdmin)
        ->from('/')
        ->post(route('managed-accounts.store'), managedAccountPayload([
            'email' => 'chief@example.com',
            'station_id' => $station->id,
        ]))
        ->assertRedirect('/')
        ->assertSessionHasNoErrors();

    $this->assertDatabaseHas(User::class, [
        'email' => 'chief@example.com',
        'role' => UserRole::Chief->value,
        'lgu_id' => $lgu->id,
        'station_id' => $station->id,
    ]);
});

test('LGU admin cannot create a chief for another LGU station', function () {
    [$lgu] = createHierarchyStation();
    [, $otherStation] = createHierarchyStation('Other LGU');
    $lguAdmin = User::factory()->lguAdmin($lgu)->create();

    $this->actingAs($lguAdmin)
        ->from('/')
        ->post(route('managed-accounts.store'), managedAccountPayload([
            'email' => 'invalid-chief@example.com',
            'station_id' => $otherStation->id,
        ]))
        ->assertRedirect('/')
        ->assertSessionHasErrors('station_id');

    $this->assertDatabaseMissing(User::class, [
        'email' => 'invalid-chief@example.com',
    ]);
});

test('chief creates staff assigned to the chiefs LGU and station', function () {
    [$lgu, $station] = createHierarchyStation();
    $chief = User::factory()->chief($station)->create();

    $this->actingAs($chief)
        ->from('/')
        ->post(route('managed-accounts.store'), managedAccountPayload([
            'email' => 'staff@example.com',
        ]))
        ->assertRedirect('/')
        ->assertSessionHasNoErrors();

    $this->assertDatabaseHas(User::class, [
        'email' => 'staff@example.com',
        'role' => UserRole::Staff->value,
        'lgu_id' => $lgu->id,
        'station_id' => $station->id,
    ]);

    expect(AuditLog::query()->where('action', 'managed_account.created')->exists())->toBeTrue();
});

test('staff cannot create another account', function () {
    [, $station] = createHierarchyStation();
    $staff = User::factory()->staff($station)->create();

    $this->actingAs($staff)
        ->post(route('managed-accounts.store'), managedAccountPayload([
            'email' => 'blocked@example.com',
        ]))
        ->assertForbidden();

    $this->assertDatabaseMissing(User::class, [
        'email' => 'blocked@example.com',
    ]);
});

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function managedAccountPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Managed User',
        'email' => 'managed@example.com',
        'phone' => '09171234567',
        'set_password' => true,
        'password' => 'SecurePassword123!',
    ], $overrides);
}

function createHierarchyLgu(string $name = 'Test LGU'): Lgu
{
    return Lgu::query()->create([
        'name' => $name,
        'code' => fake()->unique()->bothify('LGU-####'),
    ]);
}

/**
 * @return array{Lgu, Station}
 */
function createHierarchyStation(string $lguName = 'Test LGU'): array
{
    $lgu = createHierarchyLgu($lguName);
    $stationType = StationType::query()->create([
        'name' => 'Police Station',
        'code' => fake()->unique()->bothify('POLICE-####'),
    ]);
    $station = Station::query()->create([
        'lgu_id' => $lgu->id,
        'station_type_id' => $stationType->id,
        'name' => "{$lguName} Police Station",
        'latitude' => 10.3157,
        'longitude' => 123.8854,
    ]);

    return [$lgu, $station];
}

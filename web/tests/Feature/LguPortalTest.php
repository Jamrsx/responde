<?php

use App\Models\Barangay;
use App\Models\Lgu;
use App\Models\Station;
use App\Models\StationType;
use App\Models\User;
use App\UserRole;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    foreach (
        [
            ['name' => 'PNP Police Station', 'code' => 'pnp'],
            ['name' => 'Tanod Outpost', 'code' => 'tanod'],
            ['name' => 'Health Center', 'code' => 'health'],
        ] as $type
    ) {
        StationType::query()->updateOrCreate(
            ['code' => $type['code']],
            ['name' => $type['name'], 'is_active' => true],
        );
    }
});

test('lgu admin is redirected to the lgu dashboard', function () {
    $lgu = Lgu::query()->create([
        'name' => 'City of Cagayan De Oro',
        'psgc_code' => '1030500000',
        'is_active' => true,
    ]);
    $admin = User::factory()->lguAdmin($lgu)->create([
        'password' => 'password123',
    ]);

    $this->post(route('login.store'), [
        'email' => $admin->email,
        'password' => 'password123',
    ])->assertRedirect(route('lgu.dashboard'));
});

test('lgu admin can create a station and its chief together', function () {
    $lgu = Lgu::query()->create([
        'name' => 'Opol',
        'psgc_code' => '1043210000',
        'is_active' => true,
    ]);
    $admin = User::factory()->lguAdmin($lgu)->create();
    $type = StationType::query()->where('code', 'pnp')->firstOrFail();

    $this->withSession(['_token' => 'test-csrf-token'])
        ->actingAs($admin)
        ->post(route('lgu.stations.store'), [
            '_token' => 'test-csrf-token',
            'station_type_id' => $type->id,
            'name' => 'Opol Police Station',
            'contact_number' => '09171234567',
            'latitude' => 8.5214,
            'longitude' => 124.5711,
            'status' => 'active',
            'assign_chief' => true,
            'chief_name' => 'Chief Test',
            'chief_email' => 'chief.station@example.com',
            'chief_phone' => '09181234567',
            'chief_password' => 'password123',
            'chief_password_confirmation' => 'password123',
        ])
        ->assertRedirect(route('lgu.stations.index'))
        ->assertSessionHas('success');

    $station = Station::query()
        ->where('name', 'Opol Police Station')
        ->firstOrFail();
    $chief = User::query()
        ->where('email', 'chief.station@example.com')
        ->firstOrFail();

    expect($chief->role)->toBe(UserRole::Chief)
        ->and($chief->station_id)->toBe($station->id)
        ->and($chief->lgu_id)->toBe($lgu->id)
        ->and($station->chief_user_id)->toBe($chief->id)
        ->and(Hash::check('password123', $chief->password))->toBeTrue();
});

test('chief details are required when creating a station with a chief', function () {
    $lgu = Lgu::query()->create([
        'name' => 'Opol',
        'psgc_code' => '1043210001',
        'is_active' => true,
    ]);
    $admin = User::factory()->lguAdmin($lgu)->create();
    $type = StationType::query()->where('code', 'health')->firstOrFail();

    $this->withSession(['_token' => 'test-csrf-token'])
        ->actingAs($admin)
        ->from(route('lgu.stations.create'))
        ->post(route('lgu.stations.store'), [
            '_token' => 'test-csrf-token',
            'station_type_id' => $type->id,
            'name' => 'Opol Health Center',
            'latitude' => 8.5214,
            'longitude' => 124.5711,
            'status' => 'active',
            'assign_chief' => true,
        ])
        ->assertRedirect(route('lgu.stations.create'))
        ->assertSessionHasErrors([
            'chief_name',
            'chief_email',
            'chief_password',
        ]);

    $this->assertDatabaseMissing(Station::class, [
        'name' => 'Opol Health Center',
    ]);
});

test('lgu admin can import barangays and create a captain', function () {
    $lgu = Lgu::query()->create([
        'name' => 'City of Cagayan De Oro',
        'psgc_code' => '1030500000',
        'is_active' => true,
    ]);
    $admin = User::factory()->lguAdmin($lgu)->create();

    $this->actingAs($admin)
        ->post(route('lgu.barangays.import'), [
            'barangays' => [
                ['psgc' => '1030500001', 'name' => 'Agusan'],
                ['psgc' => '9999900001', 'name' => 'Outside'],
            ],
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->assertDatabaseHas(Barangay::class, [
        'lgu_id' => $lgu->id,
        'code' => '1030500001',
        'name' => 'Agusan',
    ]);
    $this->assertDatabaseMissing(Barangay::class, [
        'code' => '9999900001',
    ]);

    $barangay = Barangay::query()->where('code', '1030500001')->firstOrFail();

    $this->actingAs($admin)
        ->post(route('lgu.barangays.captains.store'), [
            'barangay_id' => $barangay->id,
            'name' => 'Captain Agusan',
            'email' => 'captain.agusan@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'phone' => '09171234567',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $captain = User::query()->where('email', 'captain.agusan@example.com')->first();
    expect($captain)->not->toBeNull()
        ->and($captain->role)->toBe(UserRole::BarangayCaptain)
        ->and($barangay->fresh()->captain_user_id)->toBe($captain->id);
});

test('lgu admin cannot manage another lgu station', function () {
    $lguA = Lgu::query()->create(['name' => 'LGU A', 'psgc_code' => '1000000001', 'is_active' => true]);
    $lguB = Lgu::query()->create(['name' => 'LGU B', 'psgc_code' => '1000000002', 'is_active' => true]);
    $admin = User::factory()->lguAdmin($lguA)->create();
    $type = StationType::query()->where('code', 'pnp')->firstOrFail();

    $station = Station::query()->create([
        'lgu_id' => $lguB->id,
        'station_type_id' => $type->id,
        'name' => 'Other Station',
        'latitude' => 8.1,
        'longitude' => 124.1,
        'status' => 'active',
        'approval_status' => 'approved',
    ]);

    $this->actingAs($admin)
        ->put(route('lgu.stations.update', $station), [
            'station_type_id' => $type->id,
            'name' => 'Hacked',
            'latitude' => 8.2,
            'longitude' => 124.2,
            'status' => 'active',
        ])
        ->assertForbidden();
});

test('station can only have one active chief', function () {
    $lgu = Lgu::query()->create(['name' => 'LGU A', 'psgc_code' => '1000000003', 'is_active' => true]);
    $admin = User::factory()->lguAdmin($lgu)->create();
    $type = StationType::query()->where('code', 'pnp')->firstOrFail();
    $station = Station::query()->create([
        'lgu_id' => $lgu->id,
        'station_type_id' => $type->id,
        'name' => 'Police Station 1',
        'latitude' => 8.1,
        'longitude' => 124.1,
        'status' => 'active',
        'approval_status' => 'approved',
    ]);

    $this->actingAs($admin)
        ->post(route('lgu.chiefs.store'), [
            'station_id' => $station->id,
            'name' => 'Chief One',
            'email' => 'chief1@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])
        ->assertRedirect();

    $this->actingAs($admin)
        ->post(route('lgu.chiefs.store'), [
            'station_id' => $station->id,
            'name' => 'Chief Two',
            'email' => 'chief2@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])
        ->assertSessionHasErrors('station_id');

    expect(User::query()->where('role', UserRole::Chief)->where('station_id', $station->id)->count())
        ->toBe(1);
});

test('captain can submit tanod outpost for approval and lgu can approve', function () {
    $lgu = Lgu::query()->create(['name' => 'LGU A', 'psgc_code' => '1030500000', 'is_active' => true]);
    $admin = User::factory()->lguAdmin($lgu)->create();
    $captain = User::factory()->barangayCaptain($lgu)->create();
    $barangay = Barangay::query()->create([
        'lgu_id' => $lgu->id,
        'name' => 'Agusan',
        'code' => '1030500001',
        'captain_user_id' => $captain->id,
        'is_active' => true,
    ]);

    $this->actingAs($captain)
        ->post(route('captain.outposts.store'), [
            'name' => 'Agusan Tanod Post',
            'latitude' => 8.48,
            'longitude' => 124.75,
            'address' => 'Near hall',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $outpost = Station::query()->where('name', 'Agusan Tanod Post')->first();
    expect($outpost)->not->toBeNull()
        ->and($outpost->approval_status)->toBe('pending')
        ->and($outpost->barangay_id)->toBe($barangay->id);

    $this->actingAs($admin)
        ->patch(route('lgu.stations.approve', $outpost))
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($outpost->fresh()->approval_status)->toBe('approved')
        ->and($outpost->fresh()->status)->toBe('active');
});

test('captain cannot access another barangay outpost', function () {
    $lgu = Lgu::query()->create(['name' => 'LGU A', 'psgc_code' => '1030500000', 'is_active' => true]);
    $captain = User::factory()->barangayCaptain($lgu)->create();
    Barangay::query()->create([
        'lgu_id' => $lgu->id,
        'name' => 'Agusan',
        'code' => '1030500001',
        'captain_user_id' => $captain->id,
        'is_active' => true,
    ]);
    $otherBarangay = Barangay::query()->create([
        'lgu_id' => $lgu->id,
        'name' => 'Bulua',
        'code' => '1030500003',
        'is_active' => true,
    ]);
    $tanod = StationType::query()->where('code', 'tanod')->firstOrFail();
    $outpost = Station::query()->create([
        'lgu_id' => $lgu->id,
        'station_type_id' => $tanod->id,
        'barangay_id' => $otherBarangay->id,
        'name' => 'Other Outpost',
        'latitude' => 8.5,
        'longitude' => 124.6,
        'status' => 'inactive',
        'approval_status' => 'pending',
    ]);

    $this->actingAs($captain)
        ->delete(route('captain.outposts.destroy', $outpost))
        ->assertForbidden();
});

test('lgu admin can view dashboard', function () {
    $lgu = Lgu::query()->create(['name' => 'LGU A', 'psgc_code' => '1030500000', 'is_active' => true]);
    $admin = User::factory()->lguAdmin($lgu)->create();

    $this->actingAs($admin)
        ->get(route('lgu.dashboard'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('lgu/dashboard')
            ->where('lgu.name', 'LGU A'));
});

test('password remains hashed when creating captains', function () {
    $lgu = Lgu::query()->create(['name' => 'LGU A', 'psgc_code' => '1030500000', 'is_active' => true]);
    $admin = User::factory()->lguAdmin($lgu)->create();
    $barangay = Barangay::query()->create([
        'lgu_id' => $lgu->id,
        'name' => 'Agusan',
        'code' => '1030500001',
        'is_active' => true,
    ]);

    $this->actingAs($admin)
        ->post(route('lgu.barangays.captains.store'), [
            'barangay_id' => $barangay->id,
            'name' => 'Captain',
            'email' => 'cap@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

    $captain = User::query()->where('email', 'cap@example.com')->firstOrFail();
    expect(Hash::check('password123', $captain->password))->toBeTrue();
});

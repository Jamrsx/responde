<?php

use App\Mail\StaffCredentialsMail;
use App\Models\Emergency;
use App\Models\EmergencyAssignment;
use App\Models\Lgu;
use App\Models\Station;
use App\Models\StationType;
use App\Models\User;
use App\Support\StationSatisfactionScore;
use App\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('chief is redirected to the chief dashboard after login home', function () {
    [$lgu, $station] = createChiefPortalStation();
    $chief = User::factory()->chief($station)->create();
    $station->update(['chief_user_id' => $chief->id]);

    $this->actingAs($chief)
        ->get(route('home'))
        ->assertRedirect(route('chief.dashboard'));
});

test('chief can open dashboard and staff pages for their station', function () {
    [$lgu, $station] = createChiefPortalStation();
    $chief = User::factory()->chief($station)->create();
    $station->update(['chief_user_id' => $chief->id]);

    $this->actingAs($chief)
        ->get(route('chief.dashboard'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('chief/dashboard')
            ->where('station.name', $station->name)
            ->where('satisfaction.score', 50)
            ->where('satisfaction.has_ratings', false));

    $this->actingAs($chief)
        ->get(route('chief.staff.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('chief/staff/index')
            ->where('station.id', $station->id));
});

test('chief can create staff and credentials are emailed', function () {
    Mail::fake();

    [$lgu, $station] = createChiefPortalStation();
    $chief = User::factory()->chief($station)->create();
    $station->update(['chief_user_id' => $chief->id]);

    $this->actingAs($chief)
        ->post(route('chief.staff.store'), [
            'name' => 'Rescuer One',
            'email' => 'rescuer.one@example.com',
            'phone' => '09171234567',
            'position_title' => 'Rescuer',
            'set_password' => true,
            'password' => 'TempPass12',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $staff = User::query()->where('email', 'rescuer.one@example.com')->first();

    expect($staff)->not->toBeNull()
        ->and($staff->role)->toBe(UserRole::Staff)
        ->and($staff->station_id)->toBe($station->id)
        ->and($staff->position_title)->toBe('Rescuer');

    Mail::assertSent(StaffCredentialsMail::class, function (StaffCredentialsMail $mail) use ($staff, $station): bool {
        return $mail->hasTo($staff->email)
            && $mail->stationName === $station->name
            && $mail->temporaryPassword === 'TempPass12';
    });
});

test('chief can deactivate staff from their station only', function () {
    [$lgu, $station] = createChiefPortalStation();
    [, $otherStation] = createChiefPortalStation('Other LGU');
    $chief = User::factory()->chief($station)->create();
    $station->update(['chief_user_id' => $chief->id]);
    $ownStaff = User::factory()->staff($station)->create();
    $foreignStaff = User::factory()->staff($otherStation)->create();

    $this->actingAs($chief)
        ->delete(route('chief.staff.destroy', $ownStaff))
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($ownStaff->fresh()->trashed())->toBeTrue();

    $this->actingAs($chief)
        ->delete(route('chief.staff.destroy', $foreignStaff))
        ->assertForbidden();
});

test('station satisfaction score starts at 50 and caps at 100', function () {
    expect(StationSatisfactionScore::fromRatings(collect())['score'])->toBe(50)
        ->and(StationSatisfactionScore::fromRatings(collect([1]))['score'])->toBe(60)
        ->and(StationSatisfactionScore::fromRatings(collect([5, 5]))['score'])->toBe(100)
        ->and(StationSatisfactionScore::fromRatings(collect([4, 5]))['score'])->toBe(95);
});

test('station score updates from completed assignment public ratings', function () {
    [$lgu, $station] = createChiefPortalStation();
    $civilian = User::factory()->create(['role' => UserRole::Civilian]);
    $emergency = Emergency::query()->create([
        'civilian_user_id' => $civilian->id,
        'lgu_id' => $lgu->id,
        'description' => 'House fire',
        'latitude' => 8.5,
        'longitude' => 124.6,
        'status' => 'resolved',
        'resolved_at' => now(),
    ]);

    EmergencyAssignment::query()->create([
        'emergency_id' => $emergency->id,
        'station_id' => $station->id,
        'status' => 'completed',
        'completed_at' => now(),
        'public_rating' => 5,
        'public_feedback' => 'Fast response',
        'rated_at' => now(),
    ]);

    expect(StationSatisfactionScore::forStation($station)['score'])->toBe(100)
        ->and(StationSatisfactionScore::forStation($station)['rating_count'])->toBe(1)
        ->and(StationSatisfactionScore::forStation($station)['has_ratings'])->toBeTrue();
});

/**
 * @return array{Lgu, Station}
 */
function createChiefPortalStation(string $lguName = 'Chief Portal LGU'): array
{
    $lgu = Lgu::query()->create([
        'name' => $lguName,
        'code' => fake()->unique()->bothify('LGU-####'),
        'is_active' => true,
    ]);

    $stationType = StationType::query()->create([
        'name' => 'DRRMO',
        'code' => fake()->unique()->bothify('DRRMO-####'),
        'is_active' => true,
    ]);

    $station = Station::query()->create([
        'lgu_id' => $lgu->id,
        'station_type_id' => $stationType->id,
        'name' => "{$lguName} Response Station",
        'latitude' => 8.5214,
        'longitude' => 124.5711,
        'status' => 'active',
        'approval_status' => 'approved',
    ]);

    return [$lgu, $station];
}

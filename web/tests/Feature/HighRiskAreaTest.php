<?php

use App\Models\Emergency;
use App\Models\EmergencyType;
use App\Models\Lgu;
use App\Models\Station;
use App\Models\StationType;
use App\Models\User;
use App\Support\HighRiskAreaDetector;
use App\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Cache::flush();

    EmergencyType::query()->create([
        'name' => 'Accident',
        'code' => 'accident',
        'is_active' => true,
    ]);

    EmergencyType::query()->create([
        'name' => 'House Fire',
        'code' => 'house_fire',
        'is_active' => true,
    ]);
});

test('chief can open the nationwide high-risk areas page', function () {
    [$lgu, $station] = createHighRiskStation();
    $chief = User::factory()->chief($station)->create();
    $station->update(['chief_user_id' => $chief->id]);

    $this->actingAs($chief)
        ->get(route('chief.high-risk-areas.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('chief/high-risk-areas/index')
            ->where('summary.accident_threshold', 5)
            ->where('summary.accident_window_days', 7)
            ->where('summary.fire_threshold', 3)
            ->where('summary.fire_window_days', 30)
            ->where('summary.radius_meters', 500)
            ->has('areas')
            ->has('warnings'));
});

test('legacy accident prone url redirects to high risk areas', function () {
    [$lgu, $station] = createHighRiskStation();
    $chief = User::factory()->chief($station)->create();
    $station->update(['chief_user_id' => $chief->id]);

    $this->actingAs($chief)
        ->get(route('chief.accident-prone-areas.index'))
        ->assertRedirect('/chief/high-risk-areas');
});

test('non chief cannot open high risk areas', function () {
    [$lgu] = createHighRiskStation();
    $admin = User::factory()->lguAdmin($lgu)->create();

    $this->actingAs($admin)
        ->get(route('chief.high-risk-areas.index'))
        ->assertForbidden();
});

test('dashboard includes nationwide high risk summary for chiefs', function () {
    [$lgu, $station] = createHighRiskStation();
    $chief = User::factory()->chief($station)->create();
    $station->update(['chief_user_id' => $chief->id]);

    createPingCluster($lgu, 'accident', 8.5214, 124.5711, 5);

    $this->actingAs($chief)
        ->get(route('chief.dashboard'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('chief/dashboard')
            ->where('stats.high_risk_areas', 1)
            ->where('stats.accident_ping_count', 5));
});

test('detector marks accident high risk after five pings within 500 meters in seven days', function () {
    [$lgu] = createHighRiskStation();
    createPingCluster($lgu, 'accident', 8.5214, 124.5711, 5);

    $result = app(HighRiskAreaDetector::class)->detectNationwide(forceRefresh: true);

    expect($result['summary']['accident_area_count'])->toBe(1)
        ->and($result['summary']['accident_ping_count'])->toBe(5)
        ->and($result['areas'][0]['category'])->toBe('accident')
        ->and($result['areas'][0]['count'])->toBe(5);
});

test('detector does not mark accident high risk below five pings', function () {
    [$lgu] = createHighRiskStation();
    createPingCluster($lgu, 'accident', 8.5214, 124.5711, 4);

    $result = app(HighRiskAreaDetector::class)->detectNationwide(forceRefresh: true);

    expect($result['summary']['accident_area_count'])->toBe(0)
        ->and($result['summary']['accident_ping_count'])->toBe(4)
        ->and($result['areas'])->toBeEmpty();
});

test('detector shows fire warnings and marks fire high risk after three pings in thirty days', function () {
    [$lgu] = createHighRiskStation();
    createPingCluster($lgu, 'house_fire', 8.5214, 124.5711, 2);

    $withWarnings = app(HighRiskAreaDetector::class)->detectNationwide(forceRefresh: true);

    expect($withWarnings['summary']['fire_warning_count'])->toBe(2)
        ->and($withWarnings['summary']['fire_area_count'])->toBe(0)
        ->and($withWarnings['warnings'])->toHaveCount(2);

    createPingAt($lgu, 'house_fire', 8.5215, 124.5712);

    $withHighRisk = app(HighRiskAreaDetector::class)->detectNationwide(forceRefresh: true);

    expect($withHighRisk['summary']['fire_area_count'])->toBe(1)
        ->and($withHighRisk['summary']['fire_warning_count'])->toBe(0)
        ->and($withHighRisk['areas'][0]['category'])->toBe('fire')
        ->and($withHighRisk['areas'][0]['count'])->toBe(3);
});

test('detector ignores pings farther than 500 meters from a cluster', function () {
    [$lgu] = createHighRiskStation();
    createPingCluster($lgu, 'accident', 8.5214, 124.5711, 4);
    createPingAt($lgu, 'accident', 8.5295, 124.5711);

    $result = app(HighRiskAreaDetector::class)->detectNationwide(forceRefresh: true);

    expect($result['summary']['accident_ping_count'])->toBe(5)
        ->and($result['summary']['accident_area_count'])->toBe(0);
});

test('detector ignores cancelled and out of window pings', function () {
    [$lgu] = createHighRiskStation();
    createPingCluster($lgu, 'accident', 8.5214, 124.5711, 4);
    createPingAt($lgu, 'accident', 8.5215, 124.5712, [
        'status' => 'cancelled',
        'cancelled_at' => now(),
    ]);
    createPingAt($lgu, 'accident', 8.5216, 124.5713, [
        'created_at' => now()->subDays(8),
        'updated_at' => now()->subDays(8),
    ]);

    $result = app(HighRiskAreaDetector::class)->detectNationwide(forceRefresh: true);

    expect($result['summary']['accident_ping_count'])->toBe(4)
        ->and($result['summary']['accident_area_count'])->toBe(0);
});

test('chief can see high risk areas from other lgus nationwide', function () {
    [$homeLgu, $station] = createHighRiskStation('Home LGU');
    [$otherLgu] = createHighRiskStation('Other LGU');
    $chief = User::factory()->chief($station)->create();
    $station->update(['chief_user_id' => $chief->id]);

    createPingCluster($otherLgu, 'accident', 10.3157, 123.8854, 5);

    $this->actingAs($chief)
        ->get(route('chief.high-risk-areas.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('chief/high-risk-areas/index')
            ->where('summary.high_risk_area_count', 1)
            ->where('summary.accident_ping_count', 5)
            ->where('areas.0.lgus.0', 'Other LGU'));

    expect($homeLgu->id)->not->toBe($otherLgu->id);
});

test('accident and fire categories are detected independently', function () {
    [$lgu] = createHighRiskStation();
    createPingCluster($lgu, 'accident', 8.5214, 124.5711, 5);
    createPingCluster($lgu, 'house_fire', 8.5300, 124.5800, 3);

    $result = app(HighRiskAreaDetector::class)->detectNationwide(forceRefresh: true);

    expect($result['summary']['accident_area_count'])->toBe(1)
        ->and($result['summary']['fire_area_count'])->toBe(1)
        ->and($result['summary']['high_risk_area_count'])->toBe(2);
});

test('chief refresh endpoint clears the high risk cache', function () {
    [$lgu, $station] = createHighRiskStation();
    $chief = User::factory()->chief($station)->create();
    $station->update(['chief_user_id' => $chief->id]);

    createPingCluster($lgu, 'accident', 8.5214, 124.5711, 4);
    $detector = app(HighRiskAreaDetector::class);
    $before = $detector->detectNationwide(forceRefresh: true);
    expect($before['summary']['high_risk_area_count'])->toBe(0);

    createPingAt($lgu, 'accident', 8.5215, 124.5712);

    $this->actingAs($chief)
        ->from(route('chief.high-risk-areas.index'))
        ->post(route('chief.high-risk-areas.refresh'))
        ->assertRedirect();

    $after = $detector->detectNationwide();
    expect($after['summary']['high_risk_area_count'])->toBe(1)
        ->and($after['summary']['accident_ping_count'])->toBe(5);
});

/**
 * @return array{Lgu, Station}
 */
function createHighRiskStation(string $lguName = 'High Risk LGU'): array
{
    $lgu = Lgu::query()->create([
        'name' => $lguName,
        'code' => fake()->unique()->bothify('HRA-####'),
        'is_active' => true,
    ]);

    $stationType = StationType::query()->create([
        'name' => 'PNP',
        'code' => fake()->unique()->bothify('PNP-####'),
        'is_active' => true,
    ]);

    $station = Station::query()->create([
        'lgu_id' => $lgu->id,
        'station_type_id' => $stationType->id,
        'name' => "{$lguName} Station",
        'latitude' => 8.5214,
        'longitude' => 124.5711,
        'status' => 'active',
        'approval_status' => 'approved',
    ]);

    return [$lgu, $station];
}

function createPingCluster(
    Lgu $lgu,
    string $typeCode,
    float $latitude,
    float $longitude,
    int $count,
): void {
    for ($index = 0; $index < $count; $index++) {
        createPingAt(
            $lgu,
            $typeCode,
            $latitude + ($index * 0.0003),
            $longitude + ($index * 0.0003),
        );
    }
}

/**
 * @param  array<string, mixed>  $overrides
 */
function createPingAt(
    Lgu $lgu,
    string $typeCode,
    float $latitude,
    float $longitude,
    array $overrides = [],
): Emergency {
    $civilian = User::factory()->create([
        'role' => UserRole::Civilian,
    ]);

    $typeId = EmergencyType::query()
        ->where('code', $typeCode)
        ->value('id');

    $attributes = array_merge([
        'civilian_user_id' => $civilian->id,
        'lgu_id' => $lgu->id,
        'emergency_type_id' => $typeId,
        'description' => $typeCode === 'house_fire' ? 'House fire' : 'Vehicle accident',
        'latitude' => $latitude,
        'longitude' => $longitude,
        'address_text' => 'National Highway',
        'status' => 'pending',
        'created_at' => now()->subHours(2),
        'updated_at' => now()->subHours(2),
    ], $overrides);

    $emergency = Emergency::query()->create($attributes);

    if (isset($overrides['created_at']) || isset($overrides['updated_at'])) {
        Emergency::query()->whereKey($emergency->id)->update([
            'created_at' => $overrides['created_at'] ?? $emergency->created_at,
            'updated_at' => $overrides['updated_at'] ?? $emergency->updated_at,
        ]);
    }

    return $emergency->fresh();
}

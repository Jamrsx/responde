<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\LguAdminController;
use App\Http\Controllers\Admin\LguController;
use App\Http\Controllers\Admin\MapController as AdminMapController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\BarangayMapController;
use App\Http\Controllers\Captain\DashboardController as CaptainDashboardController;
use App\Http\Controllers\Captain\TanodOutpostController;
use App\Http\Controllers\Chief\DashboardController as ChiefDashboardController;
use App\Http\Controllers\Chief\HighRiskAreaController as ChiefHighRiskAreaController;
use App\Http\Controllers\Chief\ResponseReportController as ChiefResponseReportController;
use App\Http\Controllers\Chief\ResponseRequestController as ChiefResponseRequestController;
use App\Http\Controllers\Chief\StaffController as ChiefStaffController;
use App\Http\Controllers\Chief\StationLocationController as ChiefStationLocationController;
use App\Http\Controllers\Chief\StationSettingsController as ChiefStationSettingsController;
use App\Http\Controllers\Lgu\BarangayController;
use App\Http\Controllers\Lgu\ChiefController;
use App\Http\Controllers\Lgu\DashboardController as LguDashboardController;
use App\Http\Controllers\Lgu\StationController;
use App\Http\Controllers\ManagedAccountController;
use App\Http\Controllers\MapAssetController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ScopedUpdateController;
use App\UserRole;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/map-data/barangays/{psgc}', [BarangayMapController::class, 'show'])
    ->where('psgc', '\d{10}')
    ->name('map-data.barangays.show');
Route::get('/map-data/municipalities', [MapAssetController::class, 'municipalities'])
    ->name('map-data.municipalities');

Route::middleware('guest')->group(function (): void {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])
        ->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])
        ->name('login.store');
});

Route::middleware('auth')->group(function (): void {
    Route::get('/', function () {
        $user = auth()->user();

        return match ($user?->role) {
            UserRole::SuperAdmin => redirect()->route('admin.dashboard'),
            UserRole::LguAdmin => redirect()->route('lgu.dashboard'),
            UserRole::BarangayCaptain => redirect()->route('captain.dashboard'),
            UserRole::Chief => redirect()->route('chief.dashboard'),
            default => Inertia::render('welcome'),
        };
    })->name('home');

    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');
    Route::get('/updates/check', ScopedUpdateController::class)
        ->middleware('throttle:120,1')
        ->name('updates.check');

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
        Route::get('/', [AdminDashboardController::class, 'index'])
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

        Route::get('/maps', [AdminMapController::class, 'index'])
            ->name('admin.maps.index');
        Route::post('/maps/sync', [AdminMapController::class, 'sync'])
            ->middleware('throttle:6,1')
            ->name('admin.maps.sync');
        Route::post('/maps/download/start', [AdminMapController::class, 'startDownload'])
            ->middleware('throttle:12,1')
            ->name('admin.maps.download.start');
        Route::post('/maps/download/batch', [AdminMapController::class, 'downloadBatch'])
            ->middleware('throttle:120,1')
            ->name('admin.maps.download.batch');
        Route::post('/maps/download/cancel', [AdminMapController::class, 'cancelDownload'])
            ->middleware('throttle:12,1')
            ->name('admin.maps.download.cancel');
        Route::get('/maps/status', [AdminMapController::class, 'status'])
            ->name('admin.maps.status');
    });

    Route::middleware('lgu_admin')->prefix('lgu')->group(function (): void {
        Route::get('/', [LguDashboardController::class, 'index'])
            ->name('lgu.dashboard');

        Route::get('/barangays', [BarangayController::class, 'index'])
            ->name('lgu.barangays.index');
        Route::post('/barangays/import', [BarangayController::class, 'import'])
            ->name('lgu.barangays.import');
        Route::post('/barangays/captains', [BarangayController::class, 'storeCaptain'])
            ->name('lgu.barangays.captains.store');
        Route::put('/barangays/{barangay}/captain', [BarangayController::class, 'updateCaptain'])
            ->name('lgu.barangays.captains.update');
        Route::post('/barangays/{barangay}/captain/replace', [BarangayController::class, 'replaceCaptain'])
            ->name('lgu.barangays.captains.replace');
        Route::patch('/barangays/{barangay}/status', [BarangayController::class, 'toggleStatus'])
            ->name('lgu.barangays.toggle-status');

        Route::get('/stations', [StationController::class, 'index'])
            ->name('lgu.stations.index');
        Route::get('/stations/create', [StationController::class, 'create'])
            ->name('lgu.stations.create');
        Route::post('/stations', [StationController::class, 'store'])
            ->name('lgu.stations.store');
        Route::put('/stations/{station}', [StationController::class, 'update'])
            ->name('lgu.stations.update');
        Route::patch('/stations/{station}/approve', [StationController::class, 'approve'])
            ->name('lgu.stations.approve');
        Route::patch('/stations/{station}/reject', [StationController::class, 'reject'])
            ->name('lgu.stations.reject');
        Route::patch('/stations/{station}/location-update/approve', [StationController::class, 'approveLocationUpdate'])
            ->name('lgu.stations.location-update.approve');
        Route::patch('/stations/{station}/location-update/reject', [StationController::class, 'rejectLocationUpdate'])
            ->name('lgu.stations.location-update.reject');

        Route::get('/chiefs', [ChiefController::class, 'index'])
            ->name('lgu.chiefs.index');
        Route::post('/chiefs', [ChiefController::class, 'store'])
            ->name('lgu.chiefs.store');
        Route::post('/chiefs/{chief}/replace', [ChiefController::class, 'replace'])
            ->name('lgu.chiefs.replace');
        Route::delete('/chiefs/{chief}', [ChiefController::class, 'deactivate'])
            ->name('lgu.chiefs.deactivate');
    });

    Route::middleware('barangay_captain')->prefix('captain')->group(function (): void {
        Route::get('/', [CaptainDashboardController::class, 'index'])
            ->name('captain.dashboard');
        Route::post('/outposts', [TanodOutpostController::class, 'store'])
            ->name('captain.outposts.store');
        Route::put('/outposts/{station}', [TanodOutpostController::class, 'update'])
            ->name('captain.outposts.update');
        Route::delete('/outposts/{station}', [TanodOutpostController::class, 'destroy'])
            ->name('captain.outposts.destroy');
    });

    Route::middleware('chief')->prefix('chief')->group(function (): void {
        Route::get('/', [ChiefDashboardController::class, 'index'])
            ->name('chief.dashboard');
        Route::get('/requests', [ChiefResponseRequestController::class, 'index'])
            ->name('chief.requests.index');
        Route::patch('/requests/{assignment}/status', [ChiefResponseRequestController::class, 'updateStatus'])
            ->name('chief.requests.status.update');
        Route::get('/station-location', [ChiefStationLocationController::class, 'index'])
            ->name('chief.station-location.index');
        Route::post('/station-location', [ChiefStationLocationController::class, 'store'])
            ->middleware('throttle:10,1')
            ->name('chief.station-location.store');
        Route::get('/station-settings', [ChiefStationSettingsController::class, 'index'])
            ->name('chief.station-settings.index');
        Route::put('/station-settings', [ChiefStationSettingsController::class, 'update'])
            ->name('chief.station-settings.update');
        Route::get('/reports', [ChiefResponseReportController::class, 'index'])
            ->name('chief.reports.index');
        Route::get('/high-risk-areas', [ChiefHighRiskAreaController::class, 'index'])
            ->name('chief.high-risk-areas.index');
        Route::post('/high-risk-areas/refresh', [ChiefHighRiskAreaController::class, 'refresh'])
            ->middleware('throttle:30,1')
            ->name('chief.high-risk-areas.refresh');
        Route::redirect('/accident-prone-areas', '/chief/high-risk-areas')
            ->name('chief.accident-prone-areas.index');
        Route::post('/accident-prone-areas/refresh', [ChiefHighRiskAreaController::class, 'refresh'])
            ->middleware('throttle:30,1')
            ->name('chief.accident-prone-areas.refresh');
        Route::get('/staff', [ChiefStaffController::class, 'index'])
            ->name('chief.staff.index');
        Route::post('/staff', [ChiefStaffController::class, 'store'])
            ->middleware('throttle:10,1')
            ->name('chief.staff.store');
        Route::delete('/staff/{staff}', [ChiefStaffController::class, 'destroy'])
            ->name('chief.staff.destroy');
        Route::patch('/staff/{staff}/availability', [ChiefStaffController::class, 'updateAvailability'])
            ->name('chief.staff.availability.update');
    });
});

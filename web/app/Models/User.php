<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property UserRole $role
 * @property string|null $phone
 * @property string|null $position_title
 * @property string $availability_status
 * @property string|null $profile_photo_path
 * @property int|null $lgu_id
 * @property int|null $station_id
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password', 'role', 'phone', 'position_title', 'availability_status', 'profile_photo_path', 'lgu_id', 'station_id'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * @var array<string, string>
     */
    protected $attributes = [
        'role' => 'civilian',
        'availability_status' => 'off_duty',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
        ];
    }

    /** @return BelongsTo<Lgu, $this> */
    public function lgu(): BelongsTo
    {
        return $this->belongsTo(Lgu::class);
    }

    /** @return BelongsTo<Station, $this> */
    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
    }

    /** @return HasMany<Barangay, $this> */
    public function captainedBarangays(): HasMany
    {
        return $this->hasMany(Barangay::class, 'captain_user_id');
    }

    /** @return HasMany<Station, $this> */
    public function ledStations(): HasMany
    {
        return $this->hasMany(Station::class, 'chief_user_id');
    }

    /** @return HasMany<Emergency, $this> */
    public function reportedEmergencies(): HasMany
    {
        return $this->hasMany(Emergency::class, 'civilian_user_id');
    }

    /** @return HasMany<EmergencyAssignment, $this> */
    public function emergencyAssignments(): HasMany
    {
        return $this->hasMany(EmergencyAssignment::class, 'responder_user_id');
    }

    /** @return HasMany<EmergencyStatusHistory, $this> */
    public function emergencyStatusChanges(): HasMany
    {
        return $this->hasMany(EmergencyStatusHistory::class, 'changed_by_user_id');
    }

    /** @return HasMany<ResponderLocation, $this> */
    public function responderLocations(): HasMany
    {
        return $this->hasMany(ResponderLocation::class, 'responder_user_id');
    }

    /** @return HasMany<DeviceToken, $this> */
    public function deviceTokens(): HasMany
    {
        return $this->hasMany(DeviceToken::class);
    }

    /** @return HasMany<EmergencyAttachment, $this> */
    public function emergencyAttachments(): HasMany
    {
        return $this->hasMany(EmergencyAttachment::class, 'uploaded_by_user_id');
    }

    /** @return HasMany<AlertDelivery, $this> */
    public function alertDeliveries(): HasMany
    {
        return $this->hasMany(AlertDelivery::class);
    }

    /** @return HasMany<AuditLog, $this> */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    /** @return HasMany<LoginAttempt, $this> */
    public function loginAttempts(): HasMany
    {
        return $this->hasMany(LoginAttempt::class);
    }
}

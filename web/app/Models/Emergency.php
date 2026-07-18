<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'civilian_user_id',
    'lgu_id',
    'barangay_id',
    'emergency_type_id',
    'description',
    'latitude',
    'longitude',
    'address_text',
    'status',
    'resolved_at',
    'cancelled_at',
])]
class Emergency extends Model
{
    use SoftDeletes;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'pending',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'resolved_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function civilian(): BelongsTo
    {
        return $this->belongsTo(User::class, 'civilian_user_id');
    }

    /** @return BelongsTo<Lgu, $this> */
    public function lgu(): BelongsTo
    {
        return $this->belongsTo(Lgu::class);
    }

    /** @return BelongsTo<Barangay, $this> */
    public function barangay(): BelongsTo
    {
        return $this->belongsTo(Barangay::class);
    }

    /** @return BelongsTo<EmergencyType, $this> */
    public function emergencyType(): BelongsTo
    {
        return $this->belongsTo(EmergencyType::class);
    }

    /** @return HasMany<EmergencyAssignment, $this> */
    public function assignments(): HasMany
    {
        return $this->hasMany(EmergencyAssignment::class);
    }

    /** @return HasMany<EmergencyStatusHistory, $this> */
    public function statusHistories(): HasMany
    {
        return $this->hasMany(EmergencyStatusHistory::class);
    }

    /** @return HasMany<ResponderLocation, $this> */
    public function responderLocations(): HasMany
    {
        return $this->hasMany(ResponderLocation::class);
    }

    /** @return HasMany<EmergencyAttachment, $this> */
    public function attachments(): HasMany
    {
        return $this->hasMany(EmergencyAttachment::class);
    }

    /** @return HasMany<AlertDelivery, $this> */
    public function alertDeliveries(): HasMany
    {
        return $this->hasMany(AlertDelivery::class);
    }
}

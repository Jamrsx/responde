<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'lgu_id',
    'station_type_id',
    'barangay_id',
    'name',
    'contact_number',
    'address',
    'latitude',
    'longitude',
    'status',
])]
class Station extends Model
{
    use SoftDeletes;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'active',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
        ];
    }

    /** @return BelongsTo<Lgu, $this> */
    public function lgu(): BelongsTo
    {
        return $this->belongsTo(Lgu::class);
    }

    /** @return BelongsTo<StationType, $this> */
    public function stationType(): BelongsTo
    {
        return $this->belongsTo(StationType::class);
    }

    /** @return BelongsTo<Barangay, $this> */
    public function barangay(): BelongsTo
    {
        return $this->belongsTo(Barangay::class);
    }

    /** @return HasMany<User, $this> */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /** @return HasMany<EmergencyAssignment, $this> */
    public function emergencyAssignments(): HasMany
    {
        return $this->hasMany(EmergencyAssignment::class);
    }

    /** @return HasMany<AlertDelivery, $this> */
    public function alertDeliveries(): HasMany
    {
        return $this->hasMany(AlertDelivery::class);
    }
}

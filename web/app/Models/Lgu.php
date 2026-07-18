<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property-read int|null $stations_count
 * @property-read int|null $lgu_admins_count
 */
#[Fillable([
    'name',
    'code',
    'province',
    'municipality',
    'contact_number',
    'psgc_code',
    'classification',
    'region',
    'latitude',
    'longitude',
    'area_km2',
    'is_active',
])]
class Lgu extends Model
{
    use SoftDeletes;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'is_active' => true,
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'area_km2' => 'decimal:2',
        ];
    }

    /** @return HasMany<Barangay, $this> */
    public function barangays(): HasMany
    {
        return $this->hasMany(Barangay::class);
    }

    /** @return HasMany<Station, $this> */
    public function stations(): HasMany
    {
        return $this->hasMany(Station::class);
    }

    /** @return HasMany<User, $this> */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /** @return HasMany<Emergency, $this> */
    public function emergencies(): HasMany
    {
        return $this->hasMany(Emergency::class);
    }
}

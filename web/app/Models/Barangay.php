<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['lgu_id', 'name', 'code', 'is_active'])]
class Barangay extends Model
{
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
        ];
    }

    /** @return BelongsTo<Lgu, $this> */
    public function lgu(): BelongsTo
    {
        return $this->belongsTo(Lgu::class);
    }

    /** @return HasMany<Station, $this> */
    public function stations(): HasMany
    {
        return $this->hasMany(Station::class);
    }

    /** @return HasMany<Emergency, $this> */
    public function emergencies(): HasMany
    {
        return $this->hasMany(Emergency::class);
    }
}

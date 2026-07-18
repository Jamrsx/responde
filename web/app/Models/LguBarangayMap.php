<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $psgc_code
 * @property int $barangay_count
 * @property string $geojson
 * @property string|null $source_hash
 * @property Carbon|null $synced_at
 */
#[Fillable([
    'psgc_code',
    'barangay_count',
    'geojson',
    'source_hash',
    'synced_at',
])]
class LguBarangayMap extends Model
{
    protected function casts(): array
    {
        return [
            'barangay_count' => 'integer',
            'synced_at' => 'datetime',
        ];
    }
}

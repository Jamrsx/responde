<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $key
 * @property int $feature_count
 * @property string $geojson
 * @property string|null $source_hash
 * @property Carbon|null $synced_at
 */
#[Fillable([
    'key',
    'feature_count',
    'geojson',
    'source_hash',
    'synced_at',
])]
class MapAsset extends Model
{
    protected function casts(): array
    {
        return [
            'feature_count' => 'integer',
            'synced_at' => 'datetime',
        ];
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'responder_user_id',
    'emergency_id',
    'latitude',
    'longitude',
    'accuracy_meters',
    'recorded_at',
])]
class ResponderLocation extends Model
{
    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'accuracy_meters' => 'decimal:2',
            'recorded_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function responder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responder_user_id');
    }

    /** @return BelongsTo<Emergency, $this> */
    public function emergency(): BelongsTo
    {
        return $this->belongsTo(Emergency::class);
    }
}

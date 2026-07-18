<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'emergency_id',
    'station_id',
    'user_id',
    'emergency_assignment_id',
    'channel',
    'status',
    'payload',
    'error_message',
    'sent_at',
    'read_at',
])]
class AlertDelivery extends Model
{
    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'pending',
    ];

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
            'read_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Emergency, $this> */
    public function emergency(): BelongsTo
    {
        return $this->belongsTo(Emergency::class);
    }

    /** @return BelongsTo<Station, $this> */
    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<EmergencyAssignment, $this> */
    public function emergencyAssignment(): BelongsTo
    {
        return $this->belongsTo(EmergencyAssignment::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'requested_by_user_id',
    'mode',
    'status',
    'source_total',
    'total',
    'processed',
    'synced',
    'skipped',
    'failed',
    'current_psgc',
    'errors',
    'error_message',
    'started_at',
    'completed_at',
])]
class MapSyncRun extends Model
{
    protected function casts(): array
    {
        return [
            'source_total' => 'integer',
            'total' => 'integer',
            'processed' => 'integer',
            'synced' => 'integer',
            'skipped' => 'integer',
            'failed' => 'integer',
            'errors' => 'array',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }
}

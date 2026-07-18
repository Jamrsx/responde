<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['emergency_id', 'changed_by_user_id', 'from_status', 'to_status', 'notes'])]
class EmergencyStatusHistory extends Model
{
    /** @return BelongsTo<Emergency, $this> */
    public function emergency(): BelongsTo
    {
        return $this->belongsTo(Emergency::class);
    }

    /** @return BelongsTo<User, $this> */
    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }
}

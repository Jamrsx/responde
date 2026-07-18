<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'emergency_id',
    'uploaded_by_user_id',
    'file_type',
    'file_path',
    'mime_type',
    'file_size',
])]
class EmergencyAttachment extends Model
{
    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
        ];
    }

    /** @return BelongsTo<Emergency, $this> */
    public function emergency(): BelongsTo
    {
        return $this->belongsTo(Emergency::class);
    }

    /** @return BelongsTo<User, $this> */
    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }
}

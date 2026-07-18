<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['email', 'user_id', 'successful', 'ip_address', 'user_agent', 'guard'])]
class LoginAttempt extends Model
{
    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'successful' => false,
    ];

    protected function casts(): array
    {
        return [
            'successful' => 'boolean',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

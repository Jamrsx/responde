<?php

namespace App\Http\Requests\Auth;

use App\Models\LoginAttempt;
use App\Models\User;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string'],
            'remember' => ['nullable', 'boolean'],
        ];
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * @throws ValidationException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        $email = Str::lower($this->string('email')->toString());

        if (! Auth::attempt([
            'email' => $email,
            'password' => $this->string('password')->toString(),
        ], $this->boolean('remember'))) {
            RateLimiter::hit($this->throttleKey(), 60);

            LoginAttempt::query()->create([
                'email' => $email,
                'user_id' => User::query()->where('email', $email)->value('id'),
                'successful' => false,
                'ip_address' => $this->ip(),
                'user_agent' => $this->userAgent(),
                'guard' => 'web',
            ]);

            throw ValidationException::withMessages([
                'email' => 'The provided email or password is incorrect.',
            ]);
        }

        RateLimiter::clear($this->throttleKey());

        LoginAttempt::query()->create([
            'email' => $email,
            'user_id' => Auth::id(),
            'successful' => true,
            'ip_address' => $this->ip(),
            'user_agent' => $this->userAgent(),
            'guard' => 'web',
        ]);
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws ValidationException
     */
    private function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'email' => "Too many login attempts. Try again in {$seconds} seconds.",
        ]);
    }

    private function throttleKey(): string
    {
        $email = Str::lower($this->string('email')->toString());

        return Str::transliterate($email.'|'.$this->ip());
    }
}

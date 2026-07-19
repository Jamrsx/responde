<?php

namespace App\Http\Requests;

use App\Models\Lgu;
use App\Models\Station;
use App\Models\User;
use App\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreManagedAccountRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', User::class) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $actor = $this->user();

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique(User::class)],
            'set_password' => ['required', 'boolean'],
            'password' => [
                Rule::requiredIf($this->boolean('set_password')),
                'nullable',
                'string',
                'min:8',
                'max:72',
            ],
            'phone' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'lgu_id' => [
                Rule::requiredIf(fn (): bool => $actor?->role === UserRole::SuperAdmin),
                Rule::prohibitedIf(fn (): bool => $actor?->role !== UserRole::SuperAdmin),
                'integer',
                Rule::exists(Lgu::class, 'id')->whereNull('deleted_at'),
            ],
            'station_id' => [
                Rule::requiredIf(fn (): bool => $actor?->role === UserRole::LguAdmin),
                Rule::prohibitedIf(fn (): bool => $actor?->role !== UserRole::LguAdmin),
                'integer',
                Rule::exists(Station::class, 'id')
                    ->where('lgu_id', $actor?->lgu_id)
                    ->whereNull('deleted_at'),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'lgu_id.required' => 'Select the LGU this administrator will manage.',
            'station_id.required' => 'Select the response station this chief will manage.',
            'station_id.exists' => 'The selected station does not belong to your LGU.',
            'phone.regex' => 'Phone must be 11 digits and start with 09.',
            'password.required' => 'Enter a password to email, or uncheck Set password manually.',
            'password.min' => 'Password must be at least 8 characters.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $setPassword = $this->boolean('set_password');

        $this->merge([
            'email' => strtolower(trim((string) $this->input('email'))),
            'set_password' => $setPassword,
            'password' => $setPassword ? (string) $this->input('password') : null,
        ]);
    }

    /**
     * @return array{
     *     name: string,
     *     email: string,
     *     password: string|null,
     *     phone: string|null,
     *     lgu_id: int|null,
     *     station_id: int|null,
     *     set_password: bool
     * }
     */
    public function accountData(): array
    {
        return [
            'name' => $this->string('name')->toString(),
            'email' => $this->string('email')->toString(),
            'password' => $this->filled('password') ? $this->string('password')->toString() : null,
            'phone' => $this->filled('phone') ? $this->string('phone')->toString() : null,
            'lgu_id' => $this->filled('lgu_id') ? $this->integer('lgu_id') : null,
            'station_id' => $this->filled('station_id') ? $this->integer('station_id') : null,
            'set_password' => $this->boolean('set_password'),
        ];
    }
}

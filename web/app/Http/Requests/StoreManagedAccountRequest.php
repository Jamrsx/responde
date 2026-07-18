<?php

namespace App\Http\Requests;

use App\Models\Lgu;
use App\Models\Station;
use App\Models\User;
use App\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

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
            'password' => ['required', 'confirmed', Password::defaults()],
            'phone' => ['nullable', 'string', 'max:20'],
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
        ];
    }

    /**
     * @return array{
     *     name: string,
     *     email: string,
     *     password: string,
     *     phone: string|null,
     *     lgu_id: int|null,
     *     station_id: int|null
     * }
     */
    public function accountData(): array
    {
        return [
            'name' => $this->string('name')->toString(),
            'email' => $this->string('email')->toString(),
            'password' => $this->string('password')->toString(),
            'phone' => $this->filled('phone') ? $this->string('phone')->toString() : null,
            'lgu_id' => $this->filled('lgu_id') ? $this->integer('lgu_id') : null,
            'station_id' => $this->filled('station_id') ? $this->integer('station_id') : null,
        ];
    }
}

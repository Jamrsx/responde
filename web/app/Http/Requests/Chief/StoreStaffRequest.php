<?php

namespace App\Http\Requests\Chief;

use App\Models\User;
use App\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStaffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::Chief
            && ($this->user()?->can('create', User::class) ?? false);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique(User::class)],
            'phone' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'position_title' => ['required', 'string', 'max:100'],
            'set_password' => ['required', 'boolean'],
            'password' => [
                Rule::requiredIf($this->boolean('set_password')),
                'nullable',
                'string',
                'min:8',
                'max:72',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'position_title.required' => 'Enter the staff position, such as Rescuer or Dispatcher.',
            'phone.regex' => 'Phone must be 11 digits and start with 09.',
            'password.required' => 'Enter a password to email, or uncheck Set password manually.',
            'password.min' => 'Password must be at least 8 characters.',
            'email.unique' => 'An account already uses this email address.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $phone = preg_replace('/\D+/', '', (string) $this->input('phone', ''));
        $setPassword = $this->boolean('set_password');

        $this->merge([
            'email' => strtolower(trim((string) $this->input('email'))),
            'phone' => $phone !== '' ? $phone : null,
            'position_title' => trim((string) $this->input('position_title')),
            'set_password' => $setPassword,
            'password' => $setPassword ? (string) $this->input('password') : null,
        ]);
    }
}

<?php

namespace App\Http\Requests\Admin;

use App\Models\Lgu;
use App\Models\User;
use App\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLguRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::SuperAdmin;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50', Rule::unique(Lgu::class)],
            'province' => ['nullable', 'string', 'max:255'],
            'municipality' => ['nullable', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:20'],
            'psgc_code' => ['nullable', 'string', 'max:20', Rule::unique(Lgu::class)],
            'classification' => ['nullable', 'string', 'max:50'],
            'region' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'area_km2' => ['nullable', 'numeric', 'min:0'],
            'admin_name' => ['required', 'string', 'max:255'],
            'admin_email' => [
                'required',
                'email',
                'max:255',
                Rule::unique(User::class, 'email'),
            ],
            'admin_phone' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'set_admin_password' => ['required', 'boolean'],
            'admin_password' => [
                Rule::requiredIf($this->boolean('set_admin_password')),
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
            'name.required' => 'Enter the LGU name.',
            'code.unique' => 'This postal / ZIP code is already used by another LGU.',
            'psgc_code.unique' => 'This LGU is already registered in Responde.',
            'admin_name.required' => 'Enter the LGU administrator name.',
            'admin_email.required' => 'Enter the LGU administrator email address.',
            'admin_email.unique' => 'An account already uses this email address.',
            'admin_phone.regex' => 'Administrator phone must be 11 digits and start with 09.',
            'admin_password.required' => 'Enter a password to email, or uncheck Set password manually.',
            'admin_password.min' => 'Administrator password must be at least 8 characters.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $phone = preg_replace(
            '/\D+/',
            '',
            (string) $this->input('admin_phone', ''),
        );
        $setAdminPassword = $this->boolean('set_admin_password');

        $this->merge([
            'admin_email' => strtolower(trim((string) $this->input('admin_email'))),
            'admin_phone' => $phone !== '' ? $phone : null,
            'set_admin_password' => $setAdminPassword,
            'admin_password' => $setAdminPassword
                ? (string) $this->input('admin_password')
                : null,
        ]);
    }
}

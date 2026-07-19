<?php

namespace App\Http\Requests\Lgu;

use App\Models\Barangay;
use App\Models\User;
use App\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCaptainRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::LguAdmin;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $lguId = $this->user()?->lgu_id;

        return [
            'barangay_id' => [
                'required',
                'integer',
                Rule::exists(Barangay::class, 'id')->where(
                    fn ($query) => $query->where('lgu_id', $lguId)->whereNull('captain_user_id'),
                ),
            ],
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique(User::class, 'email'),
            ],
            'phone' => ['required', 'string', 'regex:/^09\d{9}$/'],
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
            'barangay_id.exists' => 'Select a barangay in your LGU that does not already have a captain.',
            'phone.required' => 'Enter the captain phone number.',
            'phone.regex' => 'Phone must be 11 digits and start with 09.',
            'password.required' => 'Enter a password to email, or uncheck Set password manually.',
            'password.min' => 'Password must be at least 8 characters.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $phone = preg_replace(
            '/\D+/',
            '',
            (string) $this->input('phone', ''),
        );
        $setPassword = $this->boolean('set_password');

        $this->merge([
            'email' => strtolower(trim((string) $this->input('email'))),
            'phone' => $phone !== '' ? $phone : null,
            'set_password' => $setPassword,
            'password' => $setPassword ? (string) $this->input('password') : null,
        ]);
    }
}

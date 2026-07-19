<?php

namespace App\Http\Requests\Chief;

use App\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStationSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::Chief;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(['active', 'busy', 'inactive'])],
            'contact_number' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'address' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'contact_number.regex' => 'Contact number must be an 11-digit mobile number starting with 09.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $contact = preg_replace('/\D+/', '', (string) $this->input('contact_number', ''));

        $this->merge([
            'contact_number' => $contact !== '' ? $contact : null,
            'address' => filled($this->input('address'))
                ? trim((string) $this->input('address'))
                : null,
        ]);
    }
}

<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($this->user()?->id),
            ],
            'phone' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'profile_photo' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim((string) $this->input('name')),
            'email' => mb_strtolower(trim((string) $this->input('email'))),
            'phone' => $this->filled('phone')
                ? preg_replace('/\s+/', '', (string) $this->input('phone'))
                : null,
        ]);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.unique' => 'That email address is already being used.',
            'phone.regex' => 'Phone must be 11 digits and start with 09.',
            'profile_photo.image' => 'Choose a valid image file.',
            'profile_photo.mimes' => 'The photo must be a JPG, PNG, or WebP image.',
            'profile_photo.max' => 'The profile photo must not exceed 2 MB.',
        ];
    }
}

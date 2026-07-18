<?php

namespace App\Http\Requests\Lgu;

use App\Models\Barangay;
use App\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

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
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'phone' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'barangay_id.exists' => 'Select a barangay in your LGU that does not already have a captain.',
            'phone.regex' => 'Phone must be 11 digits and start with 09.',
        ];
    }
}

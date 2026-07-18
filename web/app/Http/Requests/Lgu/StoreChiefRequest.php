<?php

namespace App\Http\Requests\Lgu;

use App\Models\Station;
use App\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreChiefRequest extends FormRequest
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
            'station_id' => [
                'required',
                'integer',
                Rule::exists(Station::class, 'id')->where(
                    fn ($query) => $query
                        ->where('lgu_id', $lguId)
                        ->whereNull('chief_user_id')
                        ->where('approval_status', 'approved')
                        ->whereNull('deleted_at'),
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
            'station_id.exists' => 'Select an approved station in your LGU that does not already have a chief.',
            'phone.regex' => 'Phone must be 11 digits and start with 09.',
        ];
    }
}

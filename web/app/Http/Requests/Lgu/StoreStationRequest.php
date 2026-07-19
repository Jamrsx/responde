<?php

namespace App\Http\Requests\Lgu;

use App\Models\Barangay;
use App\Models\StationType;
use App\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Validator;

class StoreStationRequest extends FormRequest
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
            'station_type_id' => [
                'required',
                'integer',
                Rule::exists(StationType::class, 'id')->where(
                    fn ($query) => $query
                        ->where('is_active', true)
                        ->where('code', '!=', 'tanod'),
                ),
            ],
            'other_type_name' => ['nullable', 'string', 'max:255'],
            'barangay_id' => [
                'nullable',
                'integer',
                Rule::exists(Barangay::class, 'id')->where(
                    fn ($query) => $query->where('lgu_id', $lguId),
                ),
            ],
            'name' => ['required', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'address' => ['nullable', 'string', 'max:1000'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'status' => ['required', Rule::in(['active', 'inactive', 'busy'])],
            'assign_chief' => ['required', 'boolean'],
            'chief_name' => [
                Rule::requiredIf($this->boolean('assign_chief')),
                'nullable',
                'string',
                'max:255',
            ],
            'chief_email' => [
                Rule::requiredIf($this->boolean('assign_chief')),
                'nullable',
                'email',
                'max:255',
                'unique:users,email',
            ],
            'chief_phone' => [
                'nullable',
                'string',
                'regex:/^09\d{9}$/',
            ],
            'chief_password' => [
                Rule::requiredIf($this->boolean('assign_chief')),
                'nullable',
                'confirmed',
                Password::defaults(),
            ],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $type = StationType::query()->find($this->integer('station_type_id'));

            if ($type?->code === 'other' && blank($this->input('other_type_name'))) {
                $validator->errors()->add(
                    'other_type_name',
                    'Please specify what this station type is.',
                );
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'contact_number.regex' => 'Contact number must be an 11-digit mobile number starting with 09.',
            'chief_phone.regex' => 'Chief phone must be 11 digits and start with 09.',
            'chief_password.confirmed' => 'Chief password confirmation does not match.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $type = StationType::query()->find($this->integer('station_type_id'));

        if ($type?->code !== 'other') {
            $this->merge(['other_type_name' => null]);
        }

        $contact = preg_replace('/\D+/', '', (string) $this->input('contact_number', ''));
        $chiefPhone = preg_replace('/\D+/', '', (string) $this->input('chief_phone', ''));

        $this->merge([
            'contact_number' => $contact !== '' ? $contact : null,
            'chief_phone' => $chiefPhone !== '' ? $chiefPhone : null,
            'assign_chief' => $this->boolean('assign_chief'),
        ]);
    }
}

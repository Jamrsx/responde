<?php

namespace App\Http\Requests\Lgu;

use App\Models\Barangay;
use App\Models\StationType;
use App\Models\User;
use App\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
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
            'icon_key' => [
                'required',
                Rule::in([
                    'police',
                    'fire',
                    'disaster',
                    'medical',
                    'security',
                    'rescue',
                    'government',
                    'generic',
                ]),
            ],
            'logo' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:2048'],
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
                Rule::unique(User::class, 'email'),
            ],
            'set_chief_password' => ['required', 'boolean'],
            'chief_password' => [
                Rule::requiredIf(
                    fn (): bool => $this->boolean('assign_chief')
                        && $this->boolean('set_chief_password'),
                ),
                'nullable',
                'string',
                'min:8',
                'max:72',
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
            'logo.image' => 'Station logo must be an image file.',
            'logo.mimes' => 'Station logo must be a JPG, PNG, or WebP file.',
            'logo.max' => 'Station logo must be 2 MB or smaller.',
            'chief_name.required' => 'Enter the station chief full name.',
            'chief_email.required' => 'Enter the station chief email address.',
            'chief_email.unique' => 'An account already uses this email address.',
            'chief_password.required' => 'Enter a password to email, or uncheck Set password manually.',
            'chief_password.min' => 'Chief password must be at least 8 characters.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $type = StationType::query()->find($this->integer('station_type_id'));

        if ($type?->code !== 'other') {
            $this->merge(['other_type_name' => null]);
        }

        $contact = preg_replace('/\D+/', '', (string) $this->input('contact_number', ''));
        $assignChief = $this->boolean('assign_chief');
        $setChiefPassword = $assignChief && $this->boolean('set_chief_password');

        $this->merge([
            'contact_number' => $contact !== '' ? $contact : null,
            'chief_email' => strtolower(trim((string) $this->input('chief_email'))),
            'assign_chief' => $assignChief,
            'set_chief_password' => $setChiefPassword,
            'chief_password' => $setChiefPassword
                ? (string) $this->input('chief_password')
                : null,
        ]);
    }
}

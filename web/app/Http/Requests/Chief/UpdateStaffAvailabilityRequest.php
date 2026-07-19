<?php

namespace App\Http\Requests\Chief;

use App\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStaffAvailabilityRequest extends FormRequest
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
            'availability_status' => [
                'required',
                Rule::in(['off_duty', 'available', 'unavailable']),
            ],
        ];
    }
}

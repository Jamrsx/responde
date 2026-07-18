<?php

namespace App\Http\Requests\Lgu;

use App\Models\Barangay;
use App\Models\StationType;
use App\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStationRequest extends FormRequest
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
                    fn ($query) => $query->where('is_active', true),
                ),
            ],
            'barangay_id' => [
                'nullable',
                'integer',
                Rule::exists(Barangay::class, 'id')->where(
                    fn ($query) => $query->where('lgu_id', $lguId),
                ),
            ],
            'name' => ['required', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:1000'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'status' => ['required', Rule::in(['active', 'inactive', 'busy'])],
        ];
    }
}

<?php

namespace App\Http\Requests\Admin;

use App\Models\Lgu;
use App\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLguRequest extends FormRequest
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
        /** @var Lgu $lgu */
        $lgu = $this->route('lgu');

        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50', Rule::unique(Lgu::class)->ignore($lgu->id)],
            'province' => ['nullable', 'string', 'max:255'],
            'municipality' => ['nullable', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:20'],
            'psgc_code' => ['nullable', 'string', 'max:20', Rule::unique(Lgu::class)->ignore($lgu->id)],
            'classification' => ['nullable', 'string', 'max:50'],
            'region' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'area_km2' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['required', 'boolean'],
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
        ];
    }
}

<?php

namespace App\Http\Requests\Lgu;

use App\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ImportBarangaysRequest extends FormRequest
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
        return [
            'barangays' => ['required', 'array', 'min:1'],
            'barangays.*.psgc' => ['required', 'string', 'max:20'],
            'barangays.*.name' => ['required', 'string', 'max:255'],
        ];
    }
}

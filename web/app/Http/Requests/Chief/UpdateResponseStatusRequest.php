<?php

namespace App\Http\Requests\Chief;

use App\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateResponseStatusRequest extends FormRequest
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
            'status' => ['required', Rule::in(['en_route', 'completed'])],
        ];
    }
}

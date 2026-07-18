<?php

namespace App\Http\Controllers\Lgu\Concerns;

use App\Models\Lgu;
use Illuminate\Http\Request;

trait ResolvesCurrentLgu
{
    protected function currentLgu(Request $request): Lgu
    {
        /** @var Lgu $lgu */
        $lgu = $request->attributes->get('current_lgu');

        return $lgu;
    }
}

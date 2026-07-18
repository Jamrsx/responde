<?php

namespace App\Http\Controllers;

use App\Actions\Users\CreateManagedAccount;
use App\Http\Requests\StoreManagedAccountRequest;
use Illuminate\Http\RedirectResponse;

class ManagedAccountController extends Controller
{
    public function store(
        StoreManagedAccountRequest $request,
        CreateManagedAccount $createManagedAccount,
    ): RedirectResponse {
        $account = $createManagedAccount->execute(
            $request->user(),
            $request->accountData(),
        );

        return back()->with(
            'success',
            "{$account->name}'s {$account->role->value} account was created successfully.",
        );
    }
}

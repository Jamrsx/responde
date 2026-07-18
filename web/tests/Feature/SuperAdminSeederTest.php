<?php

use App\Models\User;
use App\UserRole;
use Database\Seeders\SuperAdminSeeder;
use Illuminate\Support\Facades\Hash;

test('super admin seeder creates the configured account securely', function () {
    $this->seed(SuperAdminSeeder::class);
    $this->seed(SuperAdminSeeder::class);

    $superAdmin = User::query()
        ->where('email', 'sadmin@gmail.com')
        ->sole();

    expect($superAdmin->name)->toBe('Super Admin')
        ->and($superAdmin->role)->toBe(UserRole::SuperAdmin)
        ->and(Hash::check('sadmin123', $superAdmin->password))->toBeTrue()
        ->and(User::query()->where('email', 'sadmin@gmail.com')->count())->toBe(1);
});

<?php

namespace Database\Seeders;

use App\Models\User;
use App\UserRole;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::withTrashed()->updateOrCreate(
            ['email' => 'sadmin@gmail.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('sadmin123'),
                'role' => UserRole::SuperAdmin,
                'lgu_id' => null,
                'station_id' => null,
                'email_verified_at' => now(),
                'deleted_at' => null,
            ],
        );
    }
}

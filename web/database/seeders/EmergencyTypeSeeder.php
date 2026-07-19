<?php

namespace Database\Seeders;

use App\Models\EmergencyType;
use Illuminate\Database\Seeder;

class EmergencyTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            [
                'name' => 'Accident',
                'code' => 'accident',
                'description' => 'Road, vehicular, or similar accident emergency requests.',
            ],
            [
                'name' => 'House Fire',
                'code' => 'house_fire',
                'description' => 'Residential or structural fire emergency requests.',
            ],
        ];

        foreach ($types as $type) {
            EmergencyType::query()->updateOrCreate(
                ['code' => $type['code']],
                [
                    'name' => $type['name'],
                    'description' => $type['description'],
                    'is_active' => true,
                ],
            );
        }
    }
}

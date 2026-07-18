<?php

namespace Database\Seeders;

use App\Models\StationType;
use Illuminate\Database\Seeder;

class StationTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            [
                'name' => 'PNP Police Station',
                'code' => 'pnp',
                'description' => 'Philippine National Police station or precinct.',
            ],
            [
                'name' => 'Health Center',
                'code' => 'health',
                'description' => 'Barangay or municipal health center.',
            ],
            [
                'name' => 'DRRMO',
                'code' => 'drrmo',
                'description' => 'Disaster Risk Reduction and Management Office.',
            ],
            [
                'name' => 'BFP Fire Station',
                'code' => 'bfp',
                'description' => 'Bureau of Fire Protection station.',
            ],
            [
                'name' => 'Tanod Outpost',
                'code' => 'tanod',
                'description' => 'Barangay tanod outpost submitted by captains.',
            ],
            [
                'name' => 'Other',
                'code' => 'other',
                'description' => 'Other response or support facility.',
            ],
        ];

        foreach ($types as $type) {
            StationType::query()->updateOrCreate(
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

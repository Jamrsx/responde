<?php

namespace App\Http\Controllers\Chief;

use App\Http\Controllers\Controller;
use App\Models\EmergencyAssignment;
use App\Models\Lgu;
use App\Models\Station;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ResponseRequestController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var Station $station */
        $station = $request->attributes->get('current_station');
        /** @var Lgu $lgu */
        $lgu = $request->attributes->get('current_lgu');

        $assignments = EmergencyAssignment::query()
            ->with([
                'emergency:id,civilian_user_id,barangay_id,emergency_type_id,description,latitude,longitude,address_text,status,created_at,resolved_at,cancelled_at',
                'emergency.civilian:id,name,phone',
                'emergency.barangay:id,name',
                'emergency.emergencyType:id,name,code',
                'responder:id,name,phone,position_title',
            ])
            ->where('station_id', $station->id)
            ->latest('notified_at')
            ->latest('created_at')
            ->limit(200)
            ->get();

        return Inertia::render('chief/requests/index', [
            'station' => [
                'id' => $station->id,
                'name' => $station->name,
                'latitude' => $station->latitude,
                'longitude' => $station->longitude,
            ],
            'requests' => $assignments->map(function (EmergencyAssignment $assignment): array {
                $emergency = $assignment->emergency;

                return [
                    'id' => $assignment->id,
                    'emergency_id' => $assignment->emergency_id,
                    'status' => $assignment->status,
                    'emergency_status' => $emergency?->status,
                    'distance_km' => $assignment->distance_km,
                    'notified_at' => $assignment->notified_at?->toIso8601String(),
                    'notified_at_human' => $assignment->notified_at?->diffForHumans()
                        ?? $assignment->created_at?->diffForHumans(),
                    'accepted_at' => $assignment->accepted_at?->toIso8601String(),
                    'completed_at' => $assignment->completed_at?->toIso8601String(),
                    'type' => $emergency?->emergencyType?->name ?? 'Emergency',
                    'type_code' => $emergency?->emergencyType?->code,
                    'description' => $emergency?->description,
                    'address' => $emergency?->address_text,
                    'barangay' => $emergency?->barangay?->name,
                    'latitude' => $emergency?->latitude,
                    'longitude' => $emergency?->longitude,
                    'reporter' => $emergency?->civilian
                        ? [
                            'name' => $emergency->civilian->name,
                            'phone' => $emergency->civilian->phone,
                        ]
                        : null,
                    'responder' => $assignment->responder
                        ? [
                            'name' => $assignment->responder->name,
                            'phone' => $assignment->responder->phone,
                            'position' => $assignment->responder->position_title,
                        ]
                        : null,
                ];
            }),
            'stats' => [
                'active' => $assignments
                    ->whereIn('status', ['notified', 'accepted', 'en_route'])
                    ->count(),
                'completed' => $assignments->where('status', 'completed')->count(),
                'all' => $assignments->count(),
            ],
            'mapUrl' => $lgu->psgc_code
                ? route('map-data.barangays.show', ['psgc' => $lgu->psgc_code], absolute: false)
                : null,
        ]);
    }
}

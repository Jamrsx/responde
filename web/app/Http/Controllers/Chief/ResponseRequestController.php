<?php

namespace App\Http\Controllers\Chief;

use App\Http\Controllers\Controller;
use App\Http\Requests\Chief\UpdateResponseStatusRequest;
use App\Models\AuditLog;
use App\Models\Emergency;
use App\Models\EmergencyAssignment;
use App\Models\EmergencyStatusHistory;
use App\Models\Lgu;
use App\Models\Station;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
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

    public function updateStatus(
        UpdateResponseStatusRequest $request,
        EmergencyAssignment $assignment,
    ): RedirectResponse {
        /** @var Station $station */
        $station = $request->attributes->get('current_station');
        $targetStatus = (string) $request->validated('status');

        if ($assignment->station_id !== $station->id) {
            abort(403);
        }

        $allowedFrom = $targetStatus === 'en_route'
            ? ['notified', 'accepted']
            : ['en_route'];

        if (! in_array($assignment->status, $allowedFrom, true)) {
            throw ValidationException::withMessages([
                'status' => $targetStatus === 'en_route'
                    ? 'Only a new request can be marked as going to respond.'
                    : 'Mark the request as going to respond before completing it.',
            ]);
        }

        $oldAssignmentStatus = $assignment->status;

        DB::transaction(function () use (
            $allowedFrom,
            $assignment,
            $request,
            $targetStatus,
        ): void {
            /** @var EmergencyAssignment $lockedAssignment */
            $lockedAssignment = EmergencyAssignment::query()
                ->lockForUpdate()
                ->findOrFail($assignment->id);

            if (! in_array($lockedAssignment->status, $allowedFrom, true)) {
                throw ValidationException::withMessages([
                    'status' => 'This request status changed. Refresh and try again.',
                ]);
            }

            /** @var Emergency $emergency */
            $emergency = Emergency::query()
                ->lockForUpdate()
                ->findOrFail($lockedAssignment->emergency_id);
            $oldEmergencyStatus = $emergency->status;

            if ($targetStatus === 'en_route') {
                $lockedAssignment->status = 'en_route';
                $lockedAssignment->accepted_at ??= now();

                if (! in_array($emergency->status, ['resolved', 'cancelled'], true)) {
                    $emergency->status = 'en_route';
                }
            } else {
                $lockedAssignment->status = 'completed';
                $lockedAssignment->completed_at = now();

                $hasOtherActiveAssignments = EmergencyAssignment::query()
                    ->where('emergency_id', $emergency->id)
                    ->where('id', '!=', $lockedAssignment->id)
                    ->whereNotIn('status', ['completed', 'declined'])
                    ->exists();

                if (! $hasOtherActiveAssignments) {
                    $emergency->status = 'resolved';
                    $emergency->resolved_at = now();
                }
            }

            $lockedAssignment->save();
            $emergency->save();

            if ($oldEmergencyStatus !== $emergency->status) {
                EmergencyStatusHistory::query()->create([
                    'emergency_id' => $emergency->id,
                    'changed_by_user_id' => $request->user()?->id,
                    'from_status' => $oldEmergencyStatus,
                    'to_status' => $emergency->status,
                    'notes' => $targetStatus === 'en_route'
                        ? 'Station chief marked the assignment as going to respond.'
                        : 'Station chief marked the assignment as responded.',
                ]);
            }
        });

        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'action' => 'emergency_assignment.status_updated_by_chief',
            'auditable_type' => EmergencyAssignment::class,
            'auditable_id' => $assignment->id,
            'old_values' => ['status' => $oldAssignmentStatus],
            'new_values' => ['status' => $targetStatus],
        ]);

        Log::info('[Responde Chief] Response request status updated', [
            'assignment_id' => $assignment->id,
            'station_id' => $station->id,
            'chief_user_id' => $request->user()?->id,
            'from_status' => $oldAssignmentStatus,
            'to_status' => $targetStatus,
        ]);

        return back()->with(
            'success',
            $targetStatus === 'en_route'
                ? 'The station is now going to respond.'
                : 'The response was marked as completed.',
        );
    }
}

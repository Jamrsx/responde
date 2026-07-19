<?php

namespace App\Observers;

use App\Models\EmergencyAssignment;
use App\Support\ScopedUpdateSignal;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;

class EmergencyAssignmentObserver implements ShouldHandleEventsAfterCommit
{
    public function __construct(
        private readonly ScopedUpdateSignal $signals,
    ) {}

    public function created(EmergencyAssignment $assignment): void
    {
        $this->signals->publishStation(
            $assignment->station_id,
            'emergency.assignment.created',
        );
    }

    public function updated(EmergencyAssignment $assignment): void
    {
        $this->signals->publishStation(
            $assignment->station_id,
            'emergency.assignment.updated',
        );
    }
}

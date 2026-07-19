<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ScopedUpdateBroadcasted implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly string $scope,
        public readonly int $scopeId,
        public readonly string $version,
        public readonly string $topic,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel("{$this->scope}.{$this->scopeId}");
    }

    public function broadcastAs(): string
    {
        return 'scope.updated';
    }

    /**
     * @return array<string, string>
     */
    public function broadcastWith(): array
    {
        return [
            'version' => $this->version,
            'topic' => $this->topic,
        ];
    }
}

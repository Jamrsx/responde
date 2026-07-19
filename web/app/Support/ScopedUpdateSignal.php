<?php

namespace App\Support;

use App\Events\ScopedUpdateBroadcasted;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class ScopedUpdateSignal
{
    public function publishLgu(int $lguId, string $topic): string
    {
        return $this->publish('lgu', $lguId, $topic);
    }

    public function publishStation(int $stationId, string $topic): string
    {
        return $this->publish('station', $stationId, $topic);
    }

    public function version(string $scope, int $scopeId): string
    {
        return $this->state($scope, $scopeId)['version'];
    }

    /**
     * @return array{version: string, topic: string|null}
     */
    public function state(string $scope, int $scopeId): array
    {
        $cached = Cache::get($this->cacheKey($scope, $scopeId), 'initial');

        if (is_array($cached)) {
            return [
                'version' => (string) ($cached['version'] ?? 'initial'),
                'topic' => filled($cached['topic'] ?? null)
                    ? (string) $cached['topic']
                    : null,
            ];
        }

        return [
            'version' => (string) $cached,
            'topic' => null,
        ];
    }

    private function publish(string $scope, int $scopeId, string $topic): string
    {
        $version = now()->format('YmdHis.u').'-'.Str::lower(Str::random(8));
        Cache::forever($this->cacheKey($scope, $scopeId), [
            'version' => $version,
            'topic' => $topic,
        ]);

        if (
            config('broadcasting.default') !== 'pusher'
            || blank(config('broadcasting.connections.pusher.key'))
            || blank(config('broadcasting.connections.pusher.secret'))
            || blank(config('broadcasting.connections.pusher.app_id'))
        ) {
            Log::info('Pusher is not configured; scoped polling signal stored.', [
                'scope' => $scope,
                'scope_id' => $scopeId,
                'topic' => $topic,
            ]);

            return $version;
        }

        try {
            event(new ScopedUpdateBroadcasted(
                scope: $scope,
                scopeId: $scopeId,
                version: $version,
                topic: $topic,
            ));
        } catch (Throwable $exception) {
            report($exception);
            Log::warning('Pusher broadcast failed; clients will use polling.', [
                'scope' => $scope,
                'scope_id' => $scopeId,
                'topic' => $topic,
                'error' => $exception->getMessage(),
            ]);
        }

        return $version;
    }

    private function cacheKey(string $scope, int $scopeId): string
    {
        return "responde:updates:{$scope}:{$scopeId}";
    }
}

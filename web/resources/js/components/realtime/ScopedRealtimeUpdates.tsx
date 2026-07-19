import { router, usePage } from '@inertiajs/react';
import Pusher from 'pusher-js';
import { useEffect, useRef } from 'react';

type RealtimeScope = {
    scope: 'lgu' | 'station' | null;
    scope_id: number | null;
    channel: string | null;
    version: string;
    check_url: string;
};

type SharedPageProps = {
    realtime?: RealtimeScope;
};

type ScopeUpdatedPayload = {
    version: string;
    topic: string;
};

const FALLBACK_POLL_MS = 5_000;
const CONNECTED_SAFETY_POLL_MS = 30_000;

export default function ScopedRealtimeUpdates() {
    const { realtime } = usePage<SharedPageProps>().props;
    const versionRef = useRef(realtime?.version ?? 'initial');
    const reloadPendingRef = useRef(false);

    useEffect(() => {
        if (
            !realtime?.scope ||
            !realtime.scope_id ||
            !realtime.channel
        ) {
            return;
        }

        const channelName = realtime.channel;
        versionRef.current = realtime.version;
        let disposed = false;
        let connected = false;
        let pollTimer: ReturnType<typeof setTimeout> | null = null;
        let activeRequest: AbortController | null = null;
        let pusher: Pusher | null = null;

        const refreshPageData = (
            version: string,
            source: 'pusher' | 'polling',
            topic?: string,
        ) => {
            if (
                disposed ||
                reloadPendingRef.current ||
                version === versionRef.current
            ) {
                return;
            }

            versionRef.current = version;
            reloadPendingRef.current = true;
            console.log('[Responde Realtime] Scoped update received', {
                scope: realtime.scope,
                scopeId: realtime.scope_id,
                source,
                topic,
            });

            router.reload({
                onFinish: () => {
                    reloadPendingRef.current = false;
                },
            });
        };

        const schedulePoll = () => {
            if (disposed) {
                return;
            }

            const baseDelay = connected
                ? CONNECTED_SAFETY_POLL_MS
                : FALLBACK_POLL_MS;
            const jitter = Math.floor(Math.random() * 1_500);

            pollTimer = setTimeout(async () => {
                if (disposed) {
                    return;
                }

                if (document.hidden) {
                    schedulePoll();

                    return;
                }

                activeRequest = new AbortController();

                try {
                    const response = await fetch(realtime.check_url, {
                        method: 'GET',
                        credentials: 'same-origin',
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        cache: 'no-store',
                        signal: activeRequest.signal,
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    const payload = (await response.json()) as {
                        version: string;
                    };
                    refreshPageData(payload.version, 'polling');
                } catch (error) {
                    if (
                        !disposed &&
                        !(error instanceof DOMException && error.name === 'AbortError')
                    ) {
                        console.warn(
                            '[Responde Realtime] Polling check failed',
                            error,
                        );
                    }
                } finally {
                    activeRequest = null;
                    schedulePoll();
                }
            }, baseDelay + jitter);
        };

        const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY;
        const pusherCluster =
            import.meta.env.VITE_PUSHER_APP_CLUSTER || 'ap3';

        if (pusherKey) {
            const csrfToken =
                document
                    .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                    ?.getAttribute('content') ?? '';

            try {
                pusher = new Pusher(pusherKey, {
                    cluster: pusherCluster,
                    forceTLS: true,
                    channelAuthorization: {
                        endpoint: '/broadcasting/auth',
                        transport: 'ajax',
                        headers: {
                            'X-CSRF-TOKEN': csrfToken,
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                    },
                });

                pusher.connection.bind(
                    'state_change',
                    ({ current }: { current: string }) => {
                        connected = current === 'connected';
                        console.log(
                            '[Responde Realtime] Pusher connection state',
                            current,
                        );
                    },
                );
                pusher.connection.bind('error', (error: unknown) => {
                    connected = false;
                    console.warn(
                        '[Responde Realtime] Pusher unavailable; polling remains active',
                        error,
                    );
                });

                const channel = pusher.subscribe(channelName);
                channel.bind(
                    'pusher:subscription_succeeded',
                    () => {
                        connected = true;
                        console.log(
                            '[Responde Realtime] Private channel connected',
                            channelName,
                        );
                    },
                );
                channel.bind(
                    'pusher:subscription_error',
                    (error: unknown) => {
                        connected = false;
                        console.warn(
                            '[Responde Realtime] Private channel failed; polling remains active',
                            error,
                        );
                    },
                );
                channel.bind(
                    'scope.updated',
                    (payload: ScopeUpdatedPayload) => {
                        refreshPageData(
                            payload.version,
                            'pusher',
                            payload.topic,
                        );
                    },
                );
            } catch (error) {
                connected = false;
                console.warn(
                    '[Responde Realtime] Pusher setup failed; polling remains active',
                    error,
                );
            }
        } else {
            console.info(
                '[Responde Realtime] Pusher key is missing; using scoped polling',
            );
        }

        schedulePoll();

        return () => {
            disposed = true;

            if (pollTimer) {
                clearTimeout(pollTimer);
            }

            activeRequest?.abort();

            if (pusher) {
                pusher.unsubscribe(channelName);
                pusher.disconnect();
            }
        };
    }, [realtime]);

    return null;
}

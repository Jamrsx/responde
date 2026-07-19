import { Link, router, usePage } from '@inertiajs/react';
import Pusher from 'pusher-js';
import { useEffect, useRef, useState } from 'react';

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
const EMERGENCY_SOUND_KEY = 'responde-emergency-sound-enabled';
const DESKTOP_ALERT_KEY = 'responde-desktop-alert-enabled';

export default function ScopedRealtimeUpdates() {
    const { realtime } = usePage<SharedPageProps>().props;
    const versionRef = useRef(realtime?.version ?? 'initial');
    const reloadPendingRef = useRef(false);
    const [showEmergencyToast, setShowEmergencyToast] = useState(false);

    useEffect(() => {
        if (!showEmergencyToast) {
            return;
        }

        const timer = window.setTimeout(
            () => setShowEmergencyToast(false),
            12_000,
        );

        return () => window.clearTimeout(timer);
    }, [showEmergencyToast]);

    useEffect(() => {
        if (!realtime?.scope || !realtime.scope_id || !realtime.channel) {
            return;
        }

        const channelName = realtime.channel;
        versionRef.current = realtime.version;
        let disposed = false;
        let connected = false;
        let pollTimer: ReturnType<typeof setTimeout> | null = null;
        let activeRequest: AbortController | null = null;
        let pusher: Pusher | null = null;

        const notifyEmergencyRequest = () => {
            if (realtime.scope !== 'station') {
                return;
            }

            setShowEmergencyToast(true);

            if (localStorage.getItem(EMERGENCY_SOUND_KEY) === 'true') {
                try {
                    const audioContext = new AudioContext();
                    const oscillator = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(
                        880,
                        audioContext.currentTime,
                    );
                    gain.gain.setValueAtTime(0.15, audioContext.currentTime);
                    gain.gain.exponentialRampToValueAtTime(
                        0.001,
                        audioContext.currentTime + 0.7,
                    );
                    oscillator.connect(gain);
                    gain.connect(audioContext.destination);
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.7);
                    oscillator.addEventListener('ended', () =>
                        audioContext.close(),
                    );
                } catch (error) {
                    console.warn(
                        '[Responde Realtime] Emergency sound could not play',
                        error,
                    );
                }
            }

            if (
                localStorage.getItem(DESKTOP_ALERT_KEY) === 'true' &&
                'Notification' in window &&
                Notification.permission === 'granted'
            ) {
                const notification = new Notification(
                    'New emergency response request',
                    {
                        body: 'Open Responde to review the new assignment.',
                        tag: 'responde-new-emergency',
                    },
                );
                notification.onclick = () => {
                    window.focus();
                    router.visit('/chief/requests');
                    notification.close();
                };
            }
        };

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

            if (topic === 'emergency.assignment.created') {
                notifyEmergencyRequest();
            }

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
                        topic?: string | null;
                    };
                    refreshPageData(
                        payload.version,
                        'polling',
                        payload.topic ?? undefined,
                    );
                } catch (error) {
                    if (
                        !disposed &&
                        !(
                            error instanceof DOMException &&
                            error.name === 'AbortError'
                        )
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
        const pusherCluster = import.meta.env.VITE_PUSHER_APP_CLUSTER || 'ap3';

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
                channel.bind('pusher:subscription_succeeded', () => {
                    connected = true;
                    console.log(
                        '[Responde Realtime] Private channel connected',
                        channelName,
                    );
                });
                channel.bind('pusher:subscription_error', (error: unknown) => {
                    connected = false;
                    console.warn(
                        '[Responde Realtime] Private channel failed; polling remains active',
                        error,
                    );
                });
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

    if (!showEmergencyToast) {
        return null;
    }

    return (
        <div
            role="alert"
            aria-live="assertive"
            className="fixed right-4 bottom-4 z-[100] w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-red-200 bg-white p-4 shadow-2xl"
        >
            <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-lg font-bold text-red-700">
                    !
                </span>
                <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900">
                        New emergency response request
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                        A new assignment was sent to your station.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                        <Link
                            href="/chief/requests"
                            className="inline-flex min-h-10 items-center rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700"
                        >
                            View request
                        </Link>
                        <button
                            type="button"
                            onClick={() => setShowEmergencyToast(false)}
                            className="min-h-10 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

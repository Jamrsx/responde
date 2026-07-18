type SyncMode = 'missing' | 'registered' | 'all';

export type MapDownloadRun = {
    id: number;
    mode: SyncMode;
    status: 'queued' | 'running' | 'completed' | 'partial' | 'failed';
    sourceTotal: number;
    total: number;
    processed: number;
    synced: number;
    skipped: number;
    failed: number;
    currentPsgc: string | null;
    percent: number;
    errors: Record<string, string>;
    errorMessage: string | null;
    requestedBy: string | null;
    createdAt: string | null;
    completedAt: string | null;
};

export type MapDownloadState = {
    downloading: boolean;
    toastVisible: boolean;
    remaining: number;
    error: string | null;
    run: MapDownloadRun | null;
};

type Listener = () => void;

const BATCH_SIZE = 25;

let state: MapDownloadState = {
    downloading: false,
    toastVisible: false,
    remaining: 0,
    error: null,
    run: null,
};

const listeners = new Set<Listener>();
let activeLoop = false;

function emit() {
    listeners.forEach((listener) => listener());
}

function setState(partial: Partial<MapDownloadState>) {
    state = { ...state, ...partial };
    emit();
}

function csrfHeaders(): HeadersInit {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
    const token = match ? decodeURIComponent(match[1]) : '';

    return {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(token ? { 'X-XSRF-TOKEN': token } : {}),
    };
}

function realRemaining(run: MapDownloadRun | null, fallback = 0): number {
    if (!run) {
        return fallback;
    }

    return Math.max(0, run.total - run.processed);
}

export function getMapDownloadState(): MapDownloadState {
    return state;
}

export function subscribeMapDownload(listener: Listener): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

export function dismissMapDownloadToast() {
    setState({ toastVisible: false });
}

export function resetMapDownloadState() {
    activeLoop = false;
    setState({
        downloading: false,
        toastVisible: false,
        remaining: 0,
        error: null,
        run: null,
    });
}

export async function cancelMapDownload(): Promise<void> {
    activeLoop = false;

    try {
        await fetch('/admin/maps/download/cancel', {
            method: 'POST',
            headers: csrfHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify({}),
        });
    } catch (error) {
        console.error('[Responde Admin] Failed to cancel map download', error);
    }

    setState({
        downloading: false,
        toastVisible: true,
        remaining: 0,
        error: null,
        run: state.run
            ? {
                  ...state.run,
                  status: 'failed',
                  errorMessage: 'Cancelled. You can start a new download.',
                  currentPsgc: null,
              }
            : null,
    });
}

export async function startMapDownload(mode: SyncMode): Promise<void> {
    if (activeLoop) {
        console.log('[Responde Admin] Stopping previous download loop before restart');
        activeLoop = false;
    }

    // Allow restart even if a previous loop died mid-run.
    activeLoop = true;
    console.log('[Responde Admin] Global map download started', mode);
    setState({
        downloading: true,
        toastVisible: true,
        error: null,
        remaining: 0,
    });

    try {
        const startResponse = await fetch('/admin/maps/download/start', {
            method: 'POST',
            headers: csrfHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify({ mode, force: true }),
        });
        const startData = (await startResponse.json()) as {
            message?: string;
            done?: boolean;
            remaining?: number;
            run: MapDownloadRun | null;
        };

        if (!startResponse.ok) {
            throw new Error(
                startData.message ??
                    `Unable to start download (HTTP ${startResponse.status})`,
            );
        }

        setState({
            run: startData.run,
            remaining: realRemaining(startData.run, startData.remaining ?? 0),
        });

        if (startData.done || !startData.run?.id) {
            setState({
                downloading: false,
                remaining: 0,
            });
            activeLoop = false;

            return;
        }

        let done = false;
        let runId = startData.run.id;

        while (!done && activeLoop && runId) {
            const batchResponse = await fetch('/admin/maps/download/batch', {
                method: 'POST',
                headers: csrfHeaders(),
                credentials: 'same-origin',
                body: JSON.stringify({
                    run_id: runId,
                    batch_size: BATCH_SIZE,
                }),
            });
            const batchData = (await batchResponse.json()) as {
                message?: string;
                done: boolean;
                remaining: number;
                run: MapDownloadRun | null;
                batchSynced?: number;
                batchFailed?: number;
            };

            if (!batchResponse.ok) {
                throw new Error(
                    batchData.message ??
                        `Download batch failed (HTTP ${batchResponse.status})`,
                );
            }

            const remaining = realRemaining(batchData.run, batchData.remaining);

            setState({
                run: batchData.run,
                remaining,
                toastVisible: true,
            });

            console.log('[Responde Admin] Map download progress', {
                percent: batchData.run?.percent,
                processed: batchData.run?.processed,
                total: batchData.run?.total,
                remaining,
                currentPsgc: batchData.run?.currentPsgc,
            });

            done = batchData.done;
            runId = batchData.run?.id ?? runId;
        }
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : 'Realtime map download failed.';
        console.error('[Responde Admin] Global map download failed', error);
        setState({
            error: message,
            downloading: false,
            toastVisible: true,
        });
        activeLoop = false;

        return;
    }

    setState({
        downloading: false,
        remaining: 0,
        toastVisible: true,
    });
    activeLoop = false;
    console.log('[Responde Admin] Global map download finished', state.run);
}

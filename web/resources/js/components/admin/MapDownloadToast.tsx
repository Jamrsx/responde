import { Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import {
    cancelMapDownload,
    dismissMapDownloadToast,
    getMapDownloadState,
    subscribeMapDownload,
    type MapDownloadState,
} from '@/lib/mapDownloadStore';

export default function MapDownloadToast() {
    const [state, setState] = useState<MapDownloadState>(getMapDownloadState);

    useEffect(() => subscribeMapDownload(() => setState(getMapDownloadState())), []);

    if (!state.toastVisible || (!state.run && !state.error && !state.downloading)) {
        return null;
    }

    const run = state.run;
    const percent = run?.percent ?? 0;
    const processed = run?.processed ?? 0;
    const total = run?.total ?? 0;
    const remaining = state.remaining;
    const modeLabel =
        run?.mode === 'all'
            ? 'All maps'
            : run?.mode === 'registered'
              ? 'Registered LGUs'
              : 'Missing maps';
    const statusLabel = state.downloading
        ? 'Downloading'
        : state.error
          ? 'Failed'
          : run?.status === 'partial'
            ? 'Completed with errors'
            : 'Completed';

    return (
        <div className="pointer-events-none fixed right-4 bottom-4 z-[80] w-[min(100vw-2rem,22rem)]">
            <div className="pointer-events-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl ring-1 ring-slate-900/5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-bold text-slate-900">
                            Map download
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                            {modeLabel} · {statusLabel}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => dismissMapDownloadToast()}
                        aria-label="Dismiss download progress"
                        className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            className="h-4 w-4"
                            aria-hidden="true"
                        >
                            <path
                                d="m6 6 12 12M18 6 6 18"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </svg>
                    </button>
                </div>

                {state.error ? (
                    <p className="mt-3 text-xs leading-5 text-red-700">
                        {state.error}
                    </p>
                ) : (
                    <>
                        <div className="mt-3 flex items-center justify-between text-sm">
                            <span className="font-semibold text-slate-800">
                                {processed}/{total}
                            </span>
                            <span className="font-bold text-slate-900">
                                {percent}%
                            </span>
                        </div>
                        <div
                            className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={percent}
                            aria-label="Map download progress"
                        >
                            <div
                                className="h-full rounded-full bg-blue-600 transition-[width] duration-150"
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600">
                            <span>Updated: {run?.synced ?? 0}</span>
                            <span>Failed: {run?.failed ?? 0}</span>
                            <span>Remaining: {remaining}</span>
                            <span>
                                {run?.currentPsgc
                                    ? `PSGC ${run.currentPsgc}`
                                    : state.downloading
                                      ? 'Working…'
                                      : 'Done'}
                            </span>
                        </div>
                    </>
                )}

                <div className="mt-3 flex items-center justify-between gap-3">
                    <Link
                        href="/admin/maps"
                        className="text-xs font-semibold text-blue-700 hover:text-blue-800"
                    >
                        Open Maps
                    </Link>
                    <div className="flex items-center gap-3">
                        {(state.downloading ||
                            state.error ||
                            run?.status === 'running' ||
                            run?.status === 'failed') && (
                            <button
                                type="button"
                                onClick={() => void cancelMapDownload()}
                                className="text-xs font-semibold text-red-600 hover:text-red-700"
                            >
                                Stop
                            </button>
                        )}
                        {!state.downloading && (
                            <button
                                type="button"
                                onClick={() => dismissMapDownloadToast()}
                                className="text-xs font-medium text-slate-500 hover:text-slate-700"
                            >
                                Dismiss
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

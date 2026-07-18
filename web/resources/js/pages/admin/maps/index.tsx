import { Head, router } from '@inertiajs/react';
import { useEffect } from 'react';

import { useMapDownload } from '@/hooks/useMapDownload';
import { cancelMapDownload } from '@/lib/mapDownloadStore';
import AdminLayout from '@/layouts/AdminLayout';

type SyncMode = 'missing' | 'registered' | 'all';

type MapItem = {
    psgc: string;
    lguName: string | null;
};

type SyncRun = {
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

type Props = {
    stats: {
        sourceTotal: number;
        storedTotal: number;
        missingTotal: number;
        outdatedTotal: number;
        registeredMissingTotal: number;
    };
    municipalityMap: {
        ready: boolean;
        featureCount: number;
        syncedAt: string | null;
    };
    missingMaps: MapItem[];
    outdatedMaps: MapItem[];
    registeredMissing: Array<{ id: number; name: string; psgc: string }>;
    latestRun: SyncRun | null;
    sourceError: string | null;
};

function StatusCard({
    label,
    value,
    detail,
    tone,
}: {
    label: string;
    value: string | number;
    detail: string;
    tone: 'blue' | 'green' | 'amber' | 'slate';
}) {
    const tones = {
        blue: 'bg-blue-50 text-blue-700 ring-blue-100',
        green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        amber: 'bg-amber-50 text-amber-700 ring-amber-100',
        slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div
                className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ${tones[tone]}`}
            >
                {label}
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                {value}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
        </div>
    );
}

function MapList({
    title,
    description,
    items,
    total,
    emptyMessage,
}: {
    title: string;
    description: string;
    items: MapItem[];
    total: number;
    emptyMessage: string;
}) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-base font-bold text-slate-900">
                        {title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                        {description}
                    </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {total}
                </span>
            </div>

            {items.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-sm font-medium text-emerald-700">
                    {emptyMessage}
                </div>
            ) : (
                <ul className="mt-4 max-h-80 divide-y divide-slate-100 overflow-y-auto">
                    {items.map((item) => (
                        <li
                            key={item.psgc}
                            className="flex items-center justify-between gap-3 py-3"
                        >
                            <span className="truncate text-sm font-medium text-slate-800">
                                {item.lguName ?? 'Unregistered LGU'}
                            </span>
                            <code className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                {item.psgc}
                            </code>
                        </li>
                    ))}
                </ul>
            )}

            {total > items.length && (
                <p className="mt-3 text-xs text-slate-500">
                    Showing the first {items.length} of {total}.
                </p>
            )}
        </section>
    );
}

export default function AdminMapsIndex({
    stats,
    municipalityMap,
    missingMaps,
    outdatedMaps,
    registeredMissing,
    latestRun,
    sourceError,
}: Props) {
    const {
        downloading,
        remaining,
        error: downloadError,
        run: liveRun,
        startDownload,
    } = useMapDownload();

    const run = liveRun ?? latestRun;

    useEffect(() => {
        if (downloading) {
            return;
        }

        if (!liveRun || !['completed', 'partial'].includes(liveRun.status)) {
            return;
        }

        const key = `map-download-reloaded-${liveRun.id}`;

        if (sessionStorage.getItem(key) === '1') {
            return;
        }

        sessionStorage.setItem(key, '1');
        router.reload({
            only: [
                'stats',
                'missingMaps',
                'outdatedMaps',
                'registeredMissing',
                'latestRun',
                'municipalityMap',
            ],
        });
    }, [downloading, liveRun?.id, liveRun?.status]);

    const coverage =
        stats.sourceTotal > 0
            ? Math.round((stats.storedTotal / stats.sourceTotal) * 100)
            : 0;
    const runLabel = downloading
        ? 'Downloading'
        : run
          ? run.status.charAt(0).toUpperCase() + run.status.slice(1)
          : 'Not started';
    const active = downloading || run?.status === 'running';
    const realRemaining =
        remaining > 0
            ? remaining
            : Math.max(0, (run?.total ?? 0) - (run?.processed ?? 0));

    return (
        <AdminLayout
            title="Map synchronization"
            description="Download and update LGU and barangay map data stored in the database"
            fullWidth
        >
            <Head title="Map Synchronization" />

            {sourceError && (
                <div
                    role="alert"
                    className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                    The source inventory could not be checked: {sourceError}
                </div>
            )}

            {downloadError && (
                <div
                    role="alert"
                    className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                    {downloadError}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatusCard
                    label="Database coverage"
                    value={`${coverage}%`}
                    detail={`${stats.storedTotal} of ${stats.sourceTotal || '—'} barangay maps stored`}
                    tone={coverage === 100 ? 'green' : 'blue'}
                />
                <StatusCard
                    label="Missing"
                    value={stats.missingTotal}
                    detail="Source maps not yet stored in the database"
                    tone={stats.missingTotal === 0 ? 'green' : 'amber'}
                />
                <StatusCard
                    label="Updates available"
                    value={stats.outdatedTotal}
                    detail="Stored maps whose source version has changed"
                    tone={stats.outdatedTotal === 0 ? 'green' : 'amber'}
                />
                <StatusCard
                    label="LGU boundary map"
                    value={municipalityMap.ready ? 'Ready' : 'Missing'}
                    detail={
                        municipalityMap.ready
                            ? `${municipalityMap.featureCount} boundaries · ${municipalityMap.syncedAt ?? 'sync date unavailable'}`
                            : 'Nationwide LGU boundary data is unavailable'
                    }
                    tone={municipalityMap.ready ? 'green' : 'amber'}
                />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.8fr)]">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">
                                Download maps
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                                Downloads keep running if you leave this page.
                                Progress stays visible in the bottom-right
                                toast.
                            </p>
                        </div>
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                active
                                    ? 'bg-blue-100 text-blue-700'
                                    : run?.status === 'failed' ||
                                        run?.status === 'partial'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-emerald-100 text-emerald-700'
                            }`}
                        >
                            {runLabel}
                        </span>
                    </div>

                    {(run || downloading) && (
                        <div className="mt-5 rounded-xl bg-slate-50 p-4">
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="font-semibold text-slate-800">
                                    {run?.mode === 'all'
                                        ? 'All maps'
                                        : run?.mode === 'registered'
                                          ? 'Registered LGUs'
                                          : 'Missing maps'}
                                </span>
                                <span className="font-bold text-slate-900">
                                    {run?.percent ?? 0}%
                                </span>
                            </div>
                            <div
                                className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200"
                                role="progressbar"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={run?.percent ?? 0}
                                aria-label="Map download progress"
                            >
                                <div
                                    className="h-full rounded-full bg-blue-600 transition-[width] duration-150"
                                    style={{
                                        width: `${run?.percent ?? 0}%`,
                                    }}
                                />
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600 sm:grid-cols-5">
                                <span>
                                    Processed: {run?.processed ?? 0}/
                                    {run?.total ?? 0}
                                </span>
                                <span>Updated: {run?.synced ?? 0}</span>
                                <span>Unchanged: {run?.skipped ?? 0}</span>
                                <span>Failed: {run?.failed ?? 0}</span>
                                <span>Remaining: {realRemaining}</span>
                            </div>
                            {downloading && (
                                <p className="mt-3 text-xs font-medium text-blue-700">
                                    Live download in progress. You can open
                                    Dashboard or other pages — the toast will
                                    keep showing real progress.
                                </p>
                            )}
                            {run?.currentPsgc && (
                                <p className="mt-3 text-xs text-slate-500">
                                    Current PSGC: {run.currentPsgc}
                                </p>
                            )}
                            {run?.errorMessage && (
                                <p className="mt-3 text-xs text-red-700">
                                    {run.errorMessage}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <button
                            type="button"
                            onClick={() => void startDownload('missing')}
                            disabled={
                                downloading || stats.missingTotal === 0
                            }
                            className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {downloading && run?.mode === 'missing'
                                ? `Downloading… ${run.percent}%`
                                : `Download missing (${stats.missingTotal})`}
                        </button>
                        <button
                            type="button"
                            onClick={() => void startDownload('registered')}
                            disabled={downloading}
                            className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {downloading && run?.mode === 'registered'
                                ? `Downloading… ${run.percent}%`
                                : 'Download registered'}
                        </button>
                        <button
                            type="button"
                            onClick={() => void startDownload('all')}
                            disabled={downloading}
                            className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {downloading && run?.mode === 'all'
                                ? `Refreshing… ${run.percent}%`
                                : 'Refresh all'}
                        </button>
                    </div>

                    {(downloading ||
                        run?.status === 'running' ||
                        downloadError) && (
                        <button
                            type="button"
                            onClick={() => void cancelMapDownload()}
                            className="mt-3 min-h-10 rounded-lg border border-red-200 bg-red-50 px-4 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                            Stop stuck download
                        </button>
                    )}

                    <p className="mt-4 text-xs text-slate-500">
                        Each batch downloads 25 maps and updates real progress
                        from the server (`processed / total`). If a download
                        gets stuck after refresh, click Stop then Download
                        missing again.
                    </p>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900">
                        Registered LGU coverage
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                        LGUs in Responde that do not have barangay map data.
                    </p>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-slate-900">
                            {stats.registeredMissingTotal}
                        </span>
                        <span className="text-sm text-slate-500">missing</span>
                    </div>
                    {registeredMissing.length > 0 ? (
                        <ul className="mt-4 max-h-52 divide-y divide-slate-100 overflow-y-auto">
                            {registeredMissing.map((lgu) => (
                                <li
                                    key={lgu.id}
                                    className="flex items-center justify-between gap-3 py-3"
                                >
                                    <span className="truncate text-sm font-medium text-slate-800">
                                        {lgu.name}
                                    </span>
                                    <code className="text-xs text-slate-500">
                                        {lgu.psgc}
                                    </code>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                            Every registered LGU has a barangay map.
                        </p>
                    )}
                </section>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <MapList
                    title="Missing source maps"
                    description="Available upstream but not stored in MySQL"
                    items={missingMaps}
                    total={stats.missingTotal}
                    emptyMessage="No maps are missing."
                />
                <MapList
                    title="Updates available"
                    description="Source version differs from the stored map"
                    items={outdatedMaps}
                    total={stats.outdatedTotal}
                    emptyMessage="All stored maps are up to date."
                />
            </div>
        </AdminLayout>
    );
}

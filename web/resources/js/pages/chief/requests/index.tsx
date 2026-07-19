import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';

import type { StationIconKey } from '@/components/lgu/stationIcons';
import StationPointMap from '@/components/lgu/StationPointMap';
import ChiefLayout from '@/layouts/ChiefLayout';

type ResponseRequest = {
    id: number;
    emergency_id: number;
    status: string;
    emergency_status: string | null;
    distance_km: string | null;
    notified_at: string | null;
    notified_at_human: string | null;
    accepted_at: string | null;
    completed_at: string | null;
    type: string;
    type_code: string | null;
    description: string | null;
    address: string | null;
    barangay: string | null;
    latitude: string | null;
    longitude: string | null;
    reporter: { name: string; phone: string | null } | null;
    responder: {
        name: string;
        phone: string | null;
        position: string | null;
    } | null;
};

type Props = {
    station: {
        id: number;
        name: string;
        latitude: string | null;
        longitude: string | null;
    };
    requests: ResponseRequest[];
    stats: {
        active: number;
        completed: number;
        all: number;
    };
    mapUrl: string | null;
};

type Filter = 'active' | 'completed' | 'all';

const activeStatuses = ['notified', 'accepted', 'en_route'];

const statusStyles: Record<string, string> = {
    notified: 'bg-amber-100 text-amber-800',
    accepted: 'bg-blue-100 text-blue-800',
    en_route: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-emerald-100 text-emerald-800',
    declined: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
    notified: 'New request',
    accepted: 'Accepted',
    en_route: 'En route',
    completed: 'Completed',
    declined: 'Declined',
};

function StatusBadge({ status }: { status: string }) {
    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                statusStyles[status] ?? 'bg-slate-100 text-slate-700'
            }`}
        >
            {statusLabels[status] ?? status.replaceAll('_', ' ')}
        </span>
    );
}

function DetailRow({
    label,
    value,
}: {
    label: string;
    value: string | null | undefined;
}) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
            <dt className="text-sm text-slate-500">{label}</dt>
            <dd className="max-w-[65%] text-right text-sm font-semibold text-slate-800">
                {value || '—'}
            </dd>
        </div>
    );
}

export default function ChiefResponseRequests({
    station,
    requests,
    stats,
    mapUrl,
}: Props) {
    const [filter, setFilter] = useState<Filter>('active');
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(
        requests[0]?.id ?? null,
    );

    const filteredRequests = useMemo(() => {
        const query = search.trim().toLowerCase();

        return requests.filter((item) => {
            const matchesFilter =
                filter === 'all' ||
                (filter === 'active'
                    ? activeStatuses.includes(item.status)
                    : item.status === 'completed');
            const matchesSearch =
                !query ||
                [
                    item.type,
                    item.description,
                    item.address,
                    item.barangay,
                    item.reporter?.name,
                    item.responder?.name,
                    String(item.emergency_id),
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
                    .includes(query);

            return matchesFilter && matchesSearch;
        });
    }, [filter, requests, search]);

    const selected =
        filteredRequests.find((item) => item.id === selectedId) ??
        filteredRequests[0] ??
        null;

    const markers = useMemo(
        () =>
            filteredRequests
                .filter(
                    (item) =>
                        item.latitude !== null &&
                        item.longitude !== null &&
                        !Number.isNaN(Number(item.latitude)) &&
                        !Number.isNaN(Number(item.longitude)),
                )
                .map((item) => ({
                    id: item.id,
                    name: `${item.type} · ${item.address ?? item.barangay ?? 'Reported location'}`,
                    latitude: Number(item.latitude),
                    longitude: Number(item.longitude),
                    iconKey: 'rescue' as StationIconKey,
                    color:
                        item.id === selected?.id
                            ? '#2563eb'
                            : item.status === 'completed'
                              ? '#047857'
                              : item.status === 'declined'
                                ? '#dc2626'
                                : '#d97706',
                })),
        [filteredRequests, selected?.id],
    );

    const center: [number, number] =
        station.latitude && station.longitude
            ? [Number(station.latitude), Number(station.longitude)]
            : [12.8797, 121.774];

    const selectRequest = (id: number) => {
        setSelectedId(id);
        console.log('[Responde Chief] Response request selected', id);
    };

    console.log('[Responde Chief] Response requests loaded', {
        stationId: station.id,
        count: requests.length,
        active: stats.active,
    });

    return (
        <ChiefLayout
            title="Response Requests"
            description={`Emergency requests assigned to ${station.name}`}
            fullWidth
        >
            <Head title="Response Requests" />

            <div className="mb-5 grid grid-cols-3 gap-3">
                {(
                    [
                        ['active', 'Active', stats.active],
                        ['completed', 'Completed', stats.completed],
                        ['all', 'All', stats.all],
                    ] as const
                ).map(([value, label, count]) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => {
                            setFilter(value);
                            setSelectedId(null);
                            console.log(
                                '[Responde Chief] Request filter changed',
                                value,
                            );
                        }}
                        className={`min-h-20 rounded-2xl border p-3 text-left shadow-sm transition sm:p-4 ${
                            filter === value
                                ? 'border-brand bg-brand-light/60'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                    >
                        <span className="block text-xs font-semibold text-slate-500">
                            {label}
                        </span>
                        <span className="mt-1 block text-2xl font-bold text-slate-900">
                            {count}
                        </span>
                    </button>
                ))}
            </div>

            <label htmlFor="request-search" className="sr-only">
                Search response requests
            </label>
            <input
                id="request-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by type, address, barangay, reporter, or request number..."
                className="mb-5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/15"
            />

            {filteredRequests.length === 0 ? (
                <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">
                        {search.trim()
                            ? 'No matching requests'
                            : filter === 'active'
                              ? 'No active response requests'
                              : `No ${filter} requests`}
                    </h2>
                    <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                        Requests assigned to this station will appear here when
                        civilians report emergencies through Responde.
                    </p>
                </section>
            ) : (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(350px,0.7fr)]">
                    <section className="space-y-5">
                        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="font-bold text-slate-900">
                                        Request map
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Select a pin or request to view its
                                        details.
                                    </p>
                                </div>
                                <span className="text-xs font-semibold text-slate-500">
                                    {markers.length} mapped
                                </span>
                            </div>
                            <StationPointMap
                                center={center}
                                markers={markers}
                                focusMarkerId={selected?.id ?? null}
                                onMarkerClick={(markerId) =>
                                    selectRequest(Number(markerId))
                                }
                                fitMarkers
                                pickEnabled={false}
                                boundaryUrl={mapUrl}
                                className="h-[min(55vh,520px)] min-h-[340px] w-full"
                            />
                        </div>

                        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <h2 className="mb-3 font-bold text-slate-900">
                                Requests ({filteredRequests.length})
                            </h2>
                            <ul className="space-y-2">
                                {filteredRequests.map((item) => (
                                    <li key={item.id}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                selectRequest(item.id)
                                            }
                                            className={`min-h-20 w-full rounded-xl border p-3 text-left transition sm:p-4 ${
                                                selected?.id === item.id
                                                    ? 'border-blue-300 bg-blue-50'
                                                    : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-900">
                                                        {item.type}
                                                        <span className="ml-2 text-xs font-medium text-slate-400">
                                                            #{item.emergency_id}
                                                        </span>
                                                    </p>
                                                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                                                        {item.address ??
                                                            item.barangay ??
                                                            item.description ??
                                                            'Location unavailable'}
                                                    </p>
                                                    <p className="mt-2 text-xs text-slate-500">
                                                        {item.notified_at_human ??
                                                            'Recently assigned'}
                                                        {item.distance_km
                                                            ? ` · ${item.distance_km} km away`
                                                            : ''}
                                                    </p>
                                                </div>
                                                <StatusBadge
                                                    status={item.status}
                                                />
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </section>

                    <aside className="self-start rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-5">
                        {selected && (
                            <>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                            Request #{selected.emergency_id}
                                        </p>
                                        <h2 className="mt-1 text-xl font-bold text-slate-900">
                                            {selected.type}
                                        </h2>
                                    </div>
                                    <StatusBadge status={selected.status} />
                                </div>

                                {selected.description && (
                                    <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                                        {selected.description}
                                    </p>
                                )}

                                <dl className="mt-4">
                                    <DetailRow
                                        label="Address"
                                        value={selected.address}
                                    />
                                    <DetailRow
                                        label="Barangay"
                                        value={selected.barangay}
                                    />
                                    <DetailRow
                                        label="Reported"
                                        value={
                                            selected.notified_at_human ??
                                            'Recently'
                                        }
                                    />
                                    <DetailRow
                                        label="Distance"
                                        value={
                                            selected.distance_km
                                                ? `${selected.distance_km} km`
                                                : null
                                        }
                                    />
                                    <DetailRow
                                        label="Reporter"
                                        value={selected.reporter?.name}
                                    />
                                    <DetailRow
                                        label="Contact"
                                        value={selected.reporter?.phone}
                                    />
                                    <DetailRow
                                        label="Responder"
                                        value={selected.responder?.name}
                                    />
                                </dl>

                                {selected.latitude &&
                                    selected.longitude && (
                                        <a
                                            href={`https://www.openstreetmap.org/?mlat=${selected.latitude}&mlon=${selected.longitude}#map=18/${selected.latitude}/${selected.longitude}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                        >
                                            Open location in map
                                        </a>
                                    )}
                            </>
                        )}
                    </aside>
                </div>
            )}
        </ChiefLayout>
    );
}

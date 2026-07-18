import { Head, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import FormField, { inputClassName } from '@/components/admin/FormField';
import Modal from '@/components/admin/Modal';
import StationPointMap from '@/components/lgu/StationPointMap';
import LguLayout from '@/layouts/LguLayout';

type Chief = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    station_id: number | null;
    station: string | null;
    station_type: string | null;
    latitude: string | null;
    longitude: string | null;
    created_at: string | null;
};

type StationOption = {
    id: number;
    name: string;
    type: string | null;
};

type Station = {
    id: number;
    name: string;
    type: string | null;
    type_code: string | null;
    barangay: string | null;
    address: string | null;
    latitude: string | null;
    longitude: string | null;
    has_chief: boolean;
    chief: {
        id: number;
        name: string;
        email: string;
        phone: string | null;
    } | null;
};

type Props = {
    lgu: {
        id: number;
        name: string;
        psgc_code: string | null;
        latitude: string | null;
        longitude: string | null;
    };
    chiefs: Chief[];
    stations: Station[];
    stationsWithoutChief: StationOption[];
    mapUrl: string | null;
    stats: {
        totalStations: number;
        withChief: number;
        withoutChief: number;
        chiefs: number;
    };
};

const emptyForm = {
    station_id: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
};

function StatCard({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: 'blue' | 'green' | 'amber' | 'slate';
}) {
    const tones = {
        blue: 'bg-blue-50 text-blue-700',
        green: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
        slate: 'bg-slate-100 text-slate-700',
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className={`inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${tones[tone]}`}>
                {label}
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {value}
            </p>
        </div>
    );
}

export default function LguChiefsIndex({
    lgu,
    chiefs,
    stations,
    stationsWithoutChief,
    mapUrl,
    stats,
}: Props) {
    const [search, setSearch] = useState('');
    const [selectedStationId, setSelectedStationId] = useState<number | null>(
        null,
    );
    const [showCreate, setShowCreate] = useState(false);
    const [replacing, setReplacing] = useState<Chief | null>(null);
    const form = useForm(emptyForm);
    const replaceForm = useForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
    });

    const center = useMemo<[number, number]>(() => {
        if (lgu.latitude && lgu.longitude) {
            return [Number(lgu.latitude), Number(lgu.longitude)];
        }

        const first = stations[0];

        if (first) {
            return [Number(first.latitude), Number(first.longitude)];
        }

        return [12.8797, 121.774];
    }, [lgu.latitude, lgu.longitude, stations]);

    const filteredStations = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return stations;
        }

        return stations.filter((station) => {
            const haystack = [
                station.name,
                station.type ?? '',
                station.barangay ?? '',
                station.address ?? '',
                station.chief?.name ?? '',
                station.chief?.email ?? '',
                station.chief?.phone ?? '',
            ]
                .join(' ')
                .toLowerCase();

            return haystack.includes(query);
        });
    }, [stations, search]);

    const filteredChiefs = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return chiefs;
        }

        return chiefs.filter((chief) => {
            const haystack = [
                chief.name,
                chief.email,
                chief.phone ?? '',
                chief.station ?? '',
                chief.station_type ?? '',
            ]
                .join(' ')
                .toLowerCase();

            return haystack.includes(query);
        });
    }, [chiefs, search]);

    const markers = useMemo(
        () =>
            filteredStations
                .filter(
                    (station) =>
                        station.latitude !== null &&
                        station.longitude !== null &&
                        !Number.isNaN(Number(station.latitude)) &&
                        !Number.isNaN(Number(station.longitude)),
                )
                .map((station) => ({
                    id: station.id,
                    name: station.name,
                    latitude: Number(station.latitude),
                    longitude: Number(station.longitude),
                    color:
                        selectedStationId === station.id
                            ? '#2563eb'
                            : station.has_chief
                              ? '#047857'
                              : '#d97706',
                })),
        [filteredStations, selectedStationId],
    );

    const selectedStation =
        stations.find((station) => station.id === selectedStationId) ?? null;

    const openCreate = (stationId?: number) => {
        const targetId =
            stationId ??
            selectedStationId ??
            stationsWithoutChief[0]?.id ??
            null;

        if (!targetId) {
            return;
        }

        form.setData({
            ...emptyForm,
            station_id: String(targetId),
        });
        form.clearErrors();
        setShowCreate(true);
        console.log('[Responde LGU] Opening add chief for station', targetId);
    };

    const submitCreate = (event: FormEvent) => {
        event.preventDefault();
        console.log('[Responde LGU] Creating station chief', form.data);
        form.post('/lgu/chiefs', {
            preserveScroll: true,
            onSuccess: () => setShowCreate(false),
        });
    };

    const submitReplace = (event: FormEvent) => {
        event.preventDefault();

        if (!replacing) {
            return;
        }

        console.log('[Responde LGU] Replacing chief', replacing.id);
        replaceForm.post(`/lgu/chiefs/${replacing.id}/replace`, {
            preserveScroll: true,
            onSuccess: () => setReplacing(null),
        });
    };

    return (
        <LguLayout
            title="Station Chiefs"
            description={`Assign one chief per station in ${lgu.name}`}
            fullWidth
            actions={
                <button
                    type="button"
                    onClick={() => openCreate()}
                    disabled={stationsWithoutChief.length === 0}
                    className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                    Add chief
                </button>
            }
        >
            <Head title="LGU Chiefs" />

            <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                <StatCard
                    label="Stations"
                    value={stats.totalStations}
                    tone="slate"
                />
                <StatCard
                    label="With chief"
                    value={stats.withChief}
                    tone="green"
                />
                <StatCard
                    label="Need chief"
                    value={stats.withoutChief}
                    tone="amber"
                />
                <StatCard
                    label="Chief accounts"
                    value={stats.chiefs}
                    tone="blue"
                />
            </div>

            {stats.withoutChief > 0 && (
                <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                    {stats.withoutChief} station(s) still need a chief. Search
                    or click a yellow marker to assign one.
                </section>
            )}

            <div className="mb-4">
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search stations or chiefs by name, email, type..."
                    className={inputClassName}
                    autoComplete="off"
                    aria-label="Search stations and chiefs"
                />
                {search.trim() !== '' && (
                    <p className="mt-2 text-xs text-slate-500">
                        Showing {filteredStations.length} station(s) and{' '}
                        {filteredChiefs.length} chief(s)
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.9fr)]">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">
                                Stations map
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500">
                                Green = has chief · Amber = needs chief · Blue =
                                selected
                            </p>
                        </div>
                    </div>
                    <StationPointMap
                        center={center}
                        markers={markers}
                        pickEnabled={false}
                        fitMarkers
                        boundaryUrl={mapUrl}
                        onMarkerClick={(markerId) => {
                            const id = Number(markerId);
                            setSelectedStationId(id);
                            console.log(
                                '[Responde LGU] Selected station from map',
                                id,
                            );
                        }}
                        className="h-[min(68vh,720px)] w-full min-h-[420px]"
                    />
                </section>

                <section className="space-y-4">
                    {selectedStation && (
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                            <p className="text-sm font-bold text-slate-900">
                                {selectedStation.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                                {[
                                    selectedStation.type,
                                    selectedStation.barangay,
                                ]
                                    .filter(Boolean)
                                    .join(' · ') || 'Station details'}
                            </p>
                            {selectedStation.chief ? (
                                <p className="mt-2 text-xs text-emerald-700">
                                    Chief: {selectedStation.chief.name}
                                </p>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() =>
                                        openCreate(selectedStation.id)
                                    }
                                    className="mt-3 min-h-10 rounded-lg bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-dark"
                                >
                                    Add chief for this station
                                </button>
                            )}
                        </div>
                    )}

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="mb-4 text-base font-bold text-slate-900">
                            Stations ({filteredStations.length})
                        </h2>
                        {filteredStations.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                                No stations match your search.
                            </p>
                        ) : (
                            <ul className="max-h-[40vh] space-y-2 overflow-y-auto">
                                {filteredStations.map((station) => (
                                    <li key={station.id}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSelectedStationId(station.id)
                                            }
                                            className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                                                selectedStationId === station.id
                                                    ? 'border-blue-300 bg-blue-50'
                                                    : 'border-slate-100 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-slate-800">
                                                        {station.name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {[
                                                            station.type,
                                                            station.barangay,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(' · ') ||
                                                            'No type'}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-600">
                                                        {station.chief
                                                            ? `Chief: ${station.chief.name}`
                                                            : 'No chief assigned'}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                        station.has_chief
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-amber-100 text-amber-700'
                                                    }`}
                                                >
                                                    {station.has_chief
                                                        ? 'Assigned'
                                                        : 'Needs chief'}
                                                </span>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="mb-4 text-base font-bold text-slate-900">
                            Chief accounts ({filteredChiefs.length})
                        </h2>
                        {filteredChiefs.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                                {search.trim()
                                    ? 'No chiefs match your search.'
                                    : 'No station chiefs yet.'}
                            </p>
                        ) : (
                            <ul className="max-h-[35vh] divide-y divide-slate-100 overflow-y-auto">
                                {filteredChiefs.map((chief) => (
                                    <li
                                        key={chief.id}
                                        className="flex flex-col gap-3 py-4"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-800">
                                                {chief.name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {chief.email}
                                                {chief.station
                                                    ? ` · ${chief.station}`
                                                    : ''}
                                                {chief.station_type
                                                    ? ` · ${chief.station_type}`
                                                    : ''}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {chief.station_id && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedStationId(
                                                            chief.station_id,
                                                        )
                                                    }
                                                    className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700"
                                                >
                                                    Show on map
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setReplacing(chief);
                                                    replaceForm.reset();
                                                    replaceForm.clearErrors();
                                                }}
                                                className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700"
                                            >
                                                Replace
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (
                                                        !window.confirm(
                                                            `Deactivate ${chief.name}?`,
                                                        )
                                                    ) {
                                                        return;
                                                    }

                                                    router.delete(
                                                        `/lgu/chiefs/${chief.id}`,
                                                        {
                                                            preserveScroll:
                                                                true,
                                                        },
                                                    );
                                                }}
                                                className="min-h-10 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white"
                                            >
                                                Deactivate
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>
            </div>

            <Modal
                show={showCreate}
                title="Add station chief"
                onClose={() => setShowCreate(false)}
            >
                <form onSubmit={submitCreate} className="space-y-4">
                    <FormField label="Station" htmlFor="chief-station">
                        <select
                            id="chief-station"
                            className={inputClassName}
                            value={form.data.station_id}
                            onChange={(event) =>
                                form.setData('station_id', event.target.value)
                            }
                            required
                        >
                            {stationsWithoutChief.map((station) => (
                                <option key={station.id} value={station.id}>
                                    {station.name}
                                    {station.type ? ` · ${station.type}` : ''}
                                </option>
                            ))}
                        </select>
                    </FormField>
                    <FormField
                        label="Full name"
                        htmlFor="chief-name"
                        error={form.errors.name}
                    >
                        <input
                            id="chief-name"
                            className={inputClassName}
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData('name', event.target.value)
                            }
                            required
                        />
                    </FormField>
                    <FormField
                        label="Email"
                        htmlFor="chief-email"
                        error={form.errors.email}
                    >
                        <input
                            id="chief-email"
                            type="email"
                            className={inputClassName}
                            value={form.data.email}
                            onChange={(event) =>
                                form.setData('email', event.target.value)
                            }
                            required
                        />
                    </FormField>
                    <FormField
                        label="Phone"
                        htmlFor="chief-phone"
                        error={form.errors.phone}
                    >
                        <input
                            id="chief-phone"
                            className={inputClassName}
                            value={form.data.phone}
                            onChange={(event) =>
                                form.setData(
                                    'phone',
                                    event.target.value.replace(/\D/g, ''),
                                )
                            }
                            maxLength={11}
                            placeholder="09XXXXXXXXX"
                        />
                    </FormField>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                            label="Password"
                            htmlFor="chief-password"
                            error={form.errors.password}
                        >
                            <input
                                id="chief-password"
                                type="password"
                                className={inputClassName}
                                value={form.data.password}
                                onChange={(event) =>
                                    form.setData(
                                        'password',
                                        event.target.value,
                                    )
                                }
                                required
                            />
                        </FormField>
                        <FormField
                            label="Confirm password"
                            htmlFor="chief-password-confirm"
                        >
                            <input
                                id="chief-password-confirm"
                                type="password"
                                className={inputClassName}
                                value={form.data.password_confirmation}
                                onChange={(event) =>
                                    form.setData(
                                        'password_confirmation',
                                        event.target.value,
                                    )
                                }
                                required
                            />
                        </FormField>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setShowCreate(false)}
                            className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="min-h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-white disabled:opacity-60"
                        >
                            {form.processing ? 'Creating...' : 'Create chief'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                show={replacing !== null}
                title="Replace station chief"
                onClose={() => setReplacing(null)}
            >
                {replacing && (
                    <form onSubmit={submitReplace} className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Replace{' '}
                            <span className="font-semibold">
                                {replacing.name}
                            </span>{' '}
                            for {replacing.station}. The previous account will
                            be deactivated.
                        </p>
                        <FormField
                            label="Full name"
                            htmlFor="replace-name"
                            error={replaceForm.errors.name}
                        >
                            <input
                                id="replace-name"
                                className={inputClassName}
                                value={replaceForm.data.name}
                                onChange={(event) =>
                                    replaceForm.setData(
                                        'name',
                                        event.target.value,
                                    )
                                }
                                required
                            />
                        </FormField>
                        <FormField
                            label="Email"
                            htmlFor="replace-email"
                            error={replaceForm.errors.email}
                        >
                            <input
                                id="replace-email"
                                type="email"
                                className={inputClassName}
                                value={replaceForm.data.email}
                                onChange={(event) =>
                                    replaceForm.setData(
                                        'email',
                                        event.target.value,
                                    )
                                }
                                required
                            />
                        </FormField>
                        <FormField
                            label="Phone"
                            htmlFor="replace-phone"
                            error={replaceForm.errors.phone}
                        >
                            <input
                                id="replace-phone"
                                className={inputClassName}
                                value={replaceForm.data.phone}
                                onChange={(event) =>
                                    replaceForm.setData(
                                        'phone',
                                        event.target.value.replace(/\D/g, ''),
                                    )
                                }
                                maxLength={11}
                            />
                        </FormField>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                                label="Password"
                                htmlFor="replace-password"
                                error={replaceForm.errors.password}
                            >
                                <input
                                    id="replace-password"
                                    type="password"
                                    className={inputClassName}
                                    value={replaceForm.data.password}
                                    onChange={(event) =>
                                        replaceForm.setData(
                                            'password',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                            </FormField>
                            <FormField
                                label="Confirm password"
                                htmlFor="replace-password-confirm"
                            >
                                <input
                                    id="replace-password-confirm"
                                    type="password"
                                    className={inputClassName}
                                    value={
                                        replaceForm.data.password_confirmation
                                    }
                                    onChange={(event) =>
                                        replaceForm.setData(
                                            'password_confirmation',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                            </FormField>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setReplacing(null)}
                                className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={replaceForm.processing}
                                className="min-h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-white disabled:opacity-60"
                            >
                                {replaceForm.processing
                                    ? 'Replacing...'
                                    : 'Replace chief'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </LguLayout>
    );
}

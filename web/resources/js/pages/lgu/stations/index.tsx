import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import FormField, { inputClassName } from '@/components/admin/FormField';
import Modal from '@/components/admin/Modal';
import {
    defaultStationIcon,
    resolveStationIcon,
    StationIcon,
    StationIconPicker,
    stationIconLabel,
} from '@/components/lgu/stationIcons';
import type { StationIconKey } from '@/components/lgu/stationIcons';
import StationPointMap from '@/components/lgu/StationPointMap';
import LguLayout from '@/layouts/LguLayout';

type StationType = { id: number; name: string; code: string };
type Barangay = { id: number; name: string; code: string | null };
type Station = {
    id: number;
    name: string;
    contact_number: string | null;
    address: string | null;
    latitude: string;
    longitude: string;
    status: string;
    approval_status: string;
    station_type_id: number;
    icon_key: StationIconKey;
    barangay_id: number | null;
    other_type_name: string | null;
    type: string | null;
    type_code: string | null;
    barangay: string | null;
    chief: { id: number; name: string; email: string } | null;
};

type Props = {
    lgu: {
        id: number;
        name: string;
        psgc_code: string | null;
        latitude: string | null;
        longitude: string | null;
    };
    stations: Station[];
    stationTypes: StationType[];
    barangays: Barangay[];
    mapUrl: string | null;
};

const emptyForm = {
    station_type_id: '',
    icon_key: 'generic' as StationIconKey,
    other_type_name: '',
    barangay_id: '',
    name: '',
    contact_number: '',
    address: '',
    latitude: '',
    longitude: '',
    status: 'active',
};

function StatCard({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: 'slate' | 'green' | 'amber' | 'red';
}) {
    const tones = {
        slate: 'bg-slate-100 text-slate-700',
        green: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
        red: 'bg-red-50 text-red-700',
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p
                className={`inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${tones[tone]}`}
            >
                {label}
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {value}
            </p>
        </div>
    );
}

export default function LguStationsIndex({
    lgu,
    stations,
    stationTypes,
    barangays,
    mapUrl,
}: Props) {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Station | null>(null);
    const [search, setSearch] = useState('');
    const [selectedStationId, setSelectedStationId] = useState<number | null>(
        null,
    );
    const stationRefs = useRef<Record<number, HTMLLIElement | null>>({});
    const mapSectionRef = useRef<HTMLElement | null>(null);
    const form = useForm(emptyForm);

    const center = useMemo<[number, number]>(() => {
        if (lgu.latitude && lgu.longitude) {
            return [Number(lgu.latitude), Number(lgu.longitude)];
        }

        return [12.8797, 121.774];
    }, [lgu.latitude, lgu.longitude]);

    const filteredStations = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return stations;
        }

        return stations.filter((station) =>
            [
                station.name,
                station.type ?? '',
                station.other_type_name ?? '',
                station.barangay ?? '',
                station.address ?? '',
                station.contact_number ?? '',
                station.chief?.name ?? '',
                station.chief?.email ?? '',
                station.approval_status,
                station.status,
            ]
                .join(' ')
                .toLowerCase()
                .includes(query),
        );
    }, [search, stations]);

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
                    iconKey: resolveStationIcon(
                        station.icon_key,
                        station.type_code,
                    ),
                    color:
                        selectedStationId === station.id
                            ? '#2563eb'
                            : station.approval_status === 'pending'
                              ? '#d97706'
                              : station.approval_status === 'rejected'
                                ? '#dc2626'
                                : '#047857',
                })),
        [filteredStations, selectedStationId],
    );

    const stats = useMemo(
        () => ({
            total: stations.length,
            approved: stations.filter(
                (station) => station.approval_status === 'approved',
            ).length,
            pending: stations.filter(
                (station) => station.approval_status === 'pending',
            ).length,
            rejected: stations.filter(
                (station) => station.approval_status === 'rejected',
            ).length,
        }),
        [stations],
    );

    const selectedStation =
        stations.find((station) => station.id === selectedStationId) ?? null;

    useEffect(() => {
        if (selectedStationId === null) {
            return;
        }

        stationRefs.current[selectedStationId]?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
        });
    }, [selectedStationId]);

    const showStationOnMap = (stationId: number) => {
        setSelectedStationId(stationId);
        mapSectionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
        console.log('[Responde LGU] Showing station on map', stationId);
    };

    const openEdit = (station: Station) => {
        setEditing(station);
        form.setData({
            station_type_id: String(station.station_type_id),
            icon_key: resolveStationIcon(station.icon_key, station.type_code),
            other_type_name: station.other_type_name ?? '',
            barangay_id: station.barangay_id ? String(station.barangay_id) : '',
            name: station.name,
            contact_number: station.contact_number ?? '',
            address: station.address ?? '',
            latitude: String(station.latitude),
            longitude: String(station.longitude),
            status: station.status,
        });
        form.clearErrors();
        setShowForm(true);
        console.log('[Responde LGU] Opening edit station modal', station.id);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (!editing) {
            return;
        }

        console.log('[Responde LGU] Updating station', form.data);

        router.put(
            `/lgu/stations/${editing.id}`,
            {
                ...form.data,
                station_type_id: Number(form.data.station_type_id),
                barangay_id: form.data.barangay_id
                    ? Number(form.data.barangay_id)
                    : null,
                latitude: Number(form.data.latitude),
                longitude: Number(form.data.longitude),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowForm(false);
                    setEditing(null);
                },
            },
        );
    };

    const selectedBarangayPsgc = barangays.find(
        (barangay) => String(barangay.id) === String(form.data.barangay_id),
    )?.code;

    const selectedEditType =
        stationTypes.find(
            (type) => String(type.id) === String(form.data.station_type_id),
        ) ?? null;
    const isOtherType =
        selectedEditType?.code === 'other' || editing?.type_code === 'other';

    return (
        <LguLayout
            title="Stations"
            description={`Map response stations in ${lgu.name}`}
            fullWidth
            actions={
                <Link
                    href="/lgu/stations/create"
                    className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                    Add station
                </Link>
            }
        >
            <Head title="LGU Stations" />

            <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                <StatCard
                    label="Total stations"
                    value={stats.total}
                    tone="slate"
                />
                <StatCard
                    label="Approved"
                    value={stats.approved}
                    tone="green"
                />
                <StatCard label="Pending" value={stats.pending} tone="amber" />
                <StatCard label="Rejected" value={stats.rejected} tone="red" />
            </div>

            {stats.pending > 0 && (
                <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                    {stats.pending} station request(s) are waiting for review.
                </section>
            )}

            <div className="mb-4">
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by station, type, barangay, chief, contact, or status..."
                    className={inputClassName}
                    autoComplete="off"
                    aria-label="Search stations"
                />
                {search.trim() !== '' && (
                    <p className="mt-2 text-xs text-slate-500">
                        Showing {filteredStations.length} of {stations.length}{' '}
                        station(s)
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.9fr)]">
                <section
                    ref={mapSectionRef}
                    className="scroll-mt-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
                >
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">
                                Station map
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500">
                                Green = approved · Amber = pending · Red =
                                rejected · Blue = selected
                            </p>
                        </div>
                    </div>
                    <StationPointMap
                        center={center}
                        markers={markers}
                        boundaryUrl={mapUrl}
                        pickEnabled={false}
                        fitMarkers
                        onMarkerClick={(markerId) => {
                            const id = Number(markerId);
                            setSelectedStationId(id);
                            console.log(
                                '[Responde LGU] Selected station from map',
                                id,
                            );
                        }}
                        className="h-[min(68vh,720px)] min-h-[420px] w-full"
                    />
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    {selectedStation && (
                        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
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
                            <p className="mt-2 text-xs font-semibold text-blue-700">
                                Selected on map
                            </p>
                        </div>
                    )}
                    <h2 className="mb-4 text-base font-bold text-slate-900">
                        Stations ({filteredStations.length})
                    </h2>
                    {filteredStations.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                            {search.trim()
                                ? 'No stations match your search.'
                                : 'No stations yet. Add police, health, DRRMO, BFP, or other facilities.'}
                        </p>
                    ) : (
                        <ul className="max-h-[70vh] space-y-2 overflow-y-auto">
                            {filteredStations.map((station) => (
                                <li
                                    key={station.id}
                                    ref={(element) => {
                                        stationRefs.current[station.id] =
                                            element;
                                    }}
                                    className={`rounded-xl border px-3 py-3 transition ${
                                        selectedStationId === station.id
                                            ? 'border-blue-300 bg-blue-50'
                                            : 'border-slate-100'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <span
                                                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700"
                                                title={stationIconLabel(
                                                    resolveStationIcon(
                                                        station.icon_key,
                                                        station.type_code,
                                                    ),
                                                )}
                                            >
                                                <StationIcon
                                                    iconKey={resolveStationIcon(
                                                        station.icon_key,
                                                        station.type_code,
                                                    )}
                                                    className="h-5 w-5"
                                                />
                                            </span>
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
                                                        .join(' · ')}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-600">
                                                    {station.chief
                                                        ? `Chief: ${station.chief.name}`
                                                        : station.type_code ===
                                                            'tanod'
                                                          ? 'Tanod outpost'
                                                          : 'No chief assigned'}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                station.approval_status ===
                                                'approved'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : station.approval_status ===
                                                        'pending'
                                                      ? 'bg-amber-100 text-amber-700'
                                                      : 'bg-red-100 text-red-700'
                                            }`}
                                        >
                                            {station.approval_status}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                showStationOnMap(station.id)
                                            }
                                            className="min-h-10 rounded-lg border border-blue-200 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                        >
                                            Show on map
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openEdit(station)}
                                            className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                        >
                                            Edit
                                        </button>
                                        {station.approval_status ===
                                            'pending' && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        router.patch(
                                                            `/lgu/stations/${station.id}/approve`,
                                                            {},
                                                            {
                                                                preserveScroll: true,
                                                            },
                                                        )
                                                    }
                                                    className="min-h-10 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        router.patch(
                                                            `/lgu/stations/${station.id}/reject`,
                                                            {},
                                                            {
                                                                preserveScroll: true,
                                                            },
                                                        )
                                                    }
                                                    className="min-h-10 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white"
                                                >
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <Modal
                show={showForm && editing !== null}
                title="Edit station"
                onClose={() => {
                    setShowForm(false);
                    setEditing(null);
                }}
                size="xl"
            >
                <form onSubmit={submit} className="space-y-4">
                    <StationPointMap
                        center={
                            form.data.latitude && form.data.longitude
                                ? [
                                      Number(form.data.latitude),
                                      Number(form.data.longitude),
                                  ]
                                : center
                        }
                        markers={[]}
                        selectedIconKey={form.data.icon_key}
                        selected={
                            form.data.latitude && form.data.longitude
                                ? {
                                      latitude: Number(form.data.latitude),
                                      longitude: Number(form.data.longitude),
                                  }
                                : null
                        }
                        onPick={(lat, lng) => {
                            form.setData((data) => ({
                                ...data,
                                latitude: String(lat),
                                longitude: String(lng),
                            }));
                        }}
                        boundaryUrl={mapUrl}
                        selectedBarangayPsgc={selectedBarangayPsgc}
                        className="h-64 w-full"
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField label="Station type" htmlFor="station-type">
                            <select
                                id="station-type"
                                className={inputClassName}
                                value={form.data.station_type_id}
                                onChange={(event) => {
                                    const nextTypeId = event.target.value;
                                    const nextType = stationTypes.find(
                                        (type) =>
                                            String(type.id) === nextTypeId,
                                    );
                                    form.setData((data) => ({
                                        ...data,
                                        station_type_id: nextTypeId,
                                        icon_key: defaultStationIcon(
                                            nextType?.code,
                                        ),
                                        other_type_name:
                                            nextType?.code === 'other'
                                                ? data.other_type_name
                                                : '',
                                    }));
                                }}
                                required
                                disabled={editing?.type_code === 'tanod'}
                            >
                                {stationTypes.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.name}
                                    </option>
                                ))}
                                {editing?.type_code === 'tanod' && (
                                    <option value={editing.station_type_id}>
                                        Tanod Outpost
                                    </option>
                                )}
                            </select>
                        </FormField>
                        <div className="sm:col-span-2">
                            <StationIconPicker
                                value={form.data.icon_key}
                                onChange={(iconKey) => {
                                    form.setData('icon_key', iconKey);
                                    console.log(
                                        '[Responde LGU] Station icon selected for edit',
                                        iconKey,
                                    );
                                }}
                            />
                            {form.errors.icon_key && (
                                <p className="mt-1 text-xs text-red-600">
                                    {form.errors.icon_key}
                                </p>
                            )}
                        </div>
                        <FormField label="Barangay" htmlFor="station-barangay">
                            <select
                                id="station-barangay"
                                className={inputClassName}
                                value={form.data.barangay_id}
                                onChange={(event) =>
                                    form.setData(
                                        'barangay_id',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">Optional</option>
                                {barangays.map((barangay) => (
                                    <option
                                        key={barangay.id}
                                        value={barangay.id}
                                    >
                                        {barangay.name}
                                    </option>
                                ))}
                            </select>
                        </FormField>
                        {isOtherType && (
                            <FormField
                                label="Specify station type"
                                htmlFor="station-other-type"
                                error={form.errors.other_type_name}
                            >
                                <input
                                    id="station-other-type"
                                    className={inputClassName}
                                    value={form.data.other_type_name}
                                    onChange={(event) =>
                                        form.setData(
                                            'other_type_name',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="e.g. Coast Guard, Red Cross"
                                    required
                                />
                            </FormField>
                        )}
                        <FormField
                            label="Station name"
                            htmlFor="station-name"
                            error={form.errors.name}
                        >
                            <input
                                id="station-name"
                                className={inputClassName}
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                                required
                            />
                        </FormField>
                        <FormField
                            label="Contact number"
                            htmlFor="station-contact"
                            error={form.errors.contact_number}
                        >
                            <input
                                id="station-contact"
                                className={inputClassName}
                                value={form.data.contact_number}
                                onChange={(event) =>
                                    form.setData(
                                        'contact_number',
                                        event.target.value.replace(/\D/g, ''),
                                    )
                                }
                                inputMode="numeric"
                                maxLength={11}
                                placeholder="09XXXXXXXXX"
                            />
                        </FormField>
                        <FormField label="Status" htmlFor="station-status">
                            <select
                                id="station-status"
                                className={inputClassName}
                                value={form.data.status}
                                onChange={(event) =>
                                    form.setData('status', event.target.value)
                                }
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="busy">Busy</option>
                            </select>
                        </FormField>
                        <FormField label="Address" htmlFor="station-address">
                            <input
                                id="station-address"
                                className={inputClassName}
                                value={form.data.address}
                                onChange={(event) =>
                                    form.setData('address', event.target.value)
                                }
                            />
                        </FormField>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setShowForm(false);
                                setEditing(null);
                            }}
                            className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="min-h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-white"
                        >
                            Save changes
                        </button>
                    </div>
                </form>
            </Modal>
        </LguLayout>
    );
}

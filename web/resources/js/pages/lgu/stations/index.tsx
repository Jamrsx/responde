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
import StationLogoField from '@/components/lgu/StationLogoField';
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
    proposed_latitude: string | null;
    proposed_longitude: string | null;
    location_update_status: 'pending' | 'approved' | 'rejected' | null;
    location_update_note: string | null;
    location_update_review_note: string | null;
    location_update_requested_at: string | null;
    location_update_reviewed_at: string | null;
    status: string;
    approval_status: string;
    station_type_id: number;
    icon_key: StationIconKey;
    logo_url: string | null;
    barangay_id: number | null;
    other_type_name: string | null;
    type: string | null;
    type_code: string | null;
    barangay: string | null;
    satisfaction: {
        score: number;
        average_rating: number | null;
        rating_count: number;
        has_ratings: boolean;
    };
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
    logo: null as File | null,
    remove_logo: false,
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
    const [reviewingLocation, setReviewingLocation] =
        useState<Station | null>(null);
    const [locationReviewNote, setLocationReviewNote] = useState('');
    const [search, setSearch] = useState('');
    const [selectedStationId, setSelectedStationId] = useState<number | null>(
        null,
    );
    const stationRefs = useRef<Record<number, HTMLLIElement | null>>({});
    const mapSectionRef = useRef<HTMLElement | null>(null);
    const form = useForm(emptyForm);
    const [mapLogoUrl, setMapLogoUrl] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            if (mapLogoUrl) {
                URL.revokeObjectURL(mapLogoUrl);
            }
        };
    }, [mapLogoUrl]);

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
                    logoUrl: station.logo_url,
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
            logo: null,
            remove_logo: false,
            other_type_name: station.other_type_name ?? '',
            barangay_id: station.barangay_id ? String(station.barangay_id) : '',
            name: station.name,
            contact_number: station.contact_number ?? '',
            address: station.address ?? '',
            latitude: String(station.latitude),
            longitude: String(station.longitude),
            status: station.status,
        });
        setMapLogoUrl((previous) => {
            if (previous) {
                URL.revokeObjectURL(previous);
            }

            return null;
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

        console.log('[Responde LGU] Updating station', {
            ...form.data,
            logo: form.data.logo
                ? {
                      name: form.data.logo.name,
                      size: form.data.logo.size,
                      type: form.data.logo.type,
                  }
                : null,
        });

        form.transform((data) => ({
            ...data,
            station_type_id: Number(data.station_type_id),
            barangay_id: data.barangay_id ? Number(data.barangay_id) : null,
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            remove_logo: data.remove_logo ? 1 : 0,
            _method: 'put',
        }));

        form.post(`/lgu/stations/${editing.id}`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setShowForm(false);
                setEditing(null);
                form.reset();
                setMapLogoUrl((previous) => {
                    if (previous) {
                        URL.revokeObjectURL(previous);
                    }

                    return null;
                });
            },
        });
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

            {stations.some(
                (station) => station.location_update_status === 'pending',
            ) && (
                <section
                    role="status"
                    className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-900"
                >
                    <p className="font-semibold">
                        Location update requests need review
                    </p>
                    <p className="mt-1 text-xs leading-5 text-red-800">
                        {
                            stations.filter(
                                (station) =>
                                    station.location_update_status ===
                                    'pending',
                            ).length
                        }{' '}
                        station
                        {stations.filter(
                            (station) =>
                                station.location_update_status === 'pending',
                        ).length === 1
                            ? ''
                            : 's'}{' '}
                        asked to update their office placement:
                    </p>
                    <ul className="mt-3 space-y-2">
                        {stations
                            .filter(
                                (station) =>
                                    station.location_update_status ===
                                    'pending',
                            )
                            .map((station) => (
                                <li
                                    key={station.id}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-slate-900">
                                            {station.name}
                                        </p>
                                        <p className="text-xs text-slate-600">
                                            {[
                                                station.type,
                                                station.barangay,
                                                station.chief
                                                    ? `Chief: ${station.chief.name}`
                                                    : null,
                                                station.location_update_requested_at
                                                    ? `Requested ${station.location_update_requested_at}`
                                                    : null,
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setReviewingLocation(station);
                                            setLocationReviewNote('');
                                            console.log(
                                                '[Responde LGU] Opening location review from notice',
                                                station.id,
                                            );
                                        }}
                                        className="min-h-10 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700"
                                    >
                                        Review location
                                    </button>
                                </li>
                            ))}
                    </ul>
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
                            <p className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-xs text-slate-700">
                                <span className="font-bold text-brand-dark">
                                    {selectedStation.satisfaction.score} / 100
                                </span>
                                <span>
                                    Emergency Response Score
                                    {selectedStation.satisfaction.has_ratings
                                        ? ` · ${selectedStation.satisfaction.rating_count} public rating${selectedStation.satisfaction.rating_count === 1 ? '' : 's'}`
                                        : ' · No ratings yet'}
                                </span>
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
                                            <span className="relative mt-0.5 shrink-0">
                                                <span
                                                    className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-700"
                                                    title={
                                                        station.logo_url
                                                            ? 'Official station logo'
                                                            : stationIconLabel(
                                                                  resolveStationIcon(
                                                                      station.icon_key,
                                                                      station.type_code,
                                                                  ),
                                                              )
                                                    }
                                                >
                                                    {station.logo_url ? (
                                                        <img
                                                            src={
                                                                station.logo_url
                                                            }
                                                            alt=""
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <StationIcon
                                                            iconKey={resolveStationIcon(
                                                                station.icon_key,
                                                                station.type_code,
                                                            )}
                                                            className="h-5 w-5"
                                                        />
                                                    )}
                                                </span>
                                                {station.location_update_status ===
                                                    'pending' && (
                                                    <span
                                                        className="absolute -top-0.5 -right-0.5 h-3 w-3 animate-pulse rounded-full bg-red-600 ring-2 ring-white"
                                                        title="Location update request pending"
                                                        aria-label="Location update request pending"
                                                    />
                                                )}
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
                                                {station.location_update_status ===
                                                    'pending' && (
                                                    <p className="mt-2 inline-flex rounded-lg bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                                                        Location update pending
                                                    </p>
                                                )}
                                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                    <span className="inline-flex rounded-lg bg-brand-light px-2 py-1 text-xs font-bold text-brand-dark">
                                                        {
                                                            station
                                                                .satisfaction
                                                                .score
                                                        }{' '}
                                                        / 100
                                                    </span>
                                                    <span className="text-[11px] text-slate-500">
                                                        Emergency Response
                                                        Score
                                                        {station.satisfaction
                                                            .has_ratings
                                                            ? ` · ${station.satisfaction.rating_count} rating${station.satisfaction.rating_count === 1 ? '' : 's'}`
                                                            : ' · No ratings yet'}
                                                    </span>
                                                </div>
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
                                        {station.location_update_status ===
                                            'pending' && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setReviewingLocation(
                                                        station,
                                                    );
                                                    setLocationReviewNote('');
                                                    console.log(
                                                        '[Responde LGU] Reviewing station location request',
                                                        station.id,
                                                    );
                                                }}
                                                className="min-h-10 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                                            >
                                                Review location
                                            </button>
                                        )}
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
                show={reviewingLocation !== null}
                title="Review station location"
                onClose={() => {
                    setReviewingLocation(null);
                    setLocationReviewNote('');
                }}
                size="xl"
            >
                {reviewingLocation &&
                    reviewingLocation.proposed_latitude &&
                    reviewingLocation.proposed_longitude && (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                                <p className="font-semibold text-amber-900">
                                    {reviewingLocation.name}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-amber-800">
                                    Requested{' '}
                                    {reviewingLocation.location_update_requested_at ??
                                        'recently'}
                                    . Green is the current approved position;
                                    amber is the proposed position.
                                </p>
                                {reviewingLocation.location_update_note && (
                                    <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-sm text-slate-700">
                                        Chief note:{' '}
                                        {
                                            reviewingLocation.location_update_note
                                        }
                                    </p>
                                )}
                            </div>

                            <StationPointMap
                                center={[
                                    Number(reviewingLocation.latitude),
                                    Number(reviewingLocation.longitude),
                                ]}
                                markers={[
                                    {
                                        id: `current-${reviewingLocation.id}`,
                                        name: `${reviewingLocation.name} · Current approved location`,
                                        latitude: Number(
                                            reviewingLocation.latitude,
                                        ),
                                        longitude: Number(
                                            reviewingLocation.longitude,
                                        ),
                                        color: '#047857',
                                        iconKey: resolveStationIcon(
                                            reviewingLocation.icon_key,
                                            reviewingLocation.type_code,
                                        ),
                                        logoUrl:
                                            reviewingLocation.logo_url,
                                    },
                                    {
                                        id: `proposed-${reviewingLocation.id}`,
                                        name: `${reviewingLocation.name} · Proposed location`,
                                        latitude: Number(
                                            reviewingLocation.proposed_latitude,
                                        ),
                                        longitude: Number(
                                            reviewingLocation.proposed_longitude,
                                        ),
                                        color: '#d97706',
                                        iconKey: resolveStationIcon(
                                            reviewingLocation.icon_key,
                                            reviewingLocation.type_code,
                                        ),
                                        logoUrl:
                                            reviewingLocation.logo_url,
                                    },
                                ]}
                                fitMarkers
                                pickEnabled={false}
                                boundaryUrl={mapUrl}
                                className="h-[min(55vh,500px)] min-h-[340px] w-full"
                            />

                            <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500">
                                        Current coordinates
                                    </p>
                                    <p className="mt-1 font-mono text-slate-800">
                                        {reviewingLocation.latitude},{' '}
                                        {reviewingLocation.longitude}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500">
                                        Proposed coordinates
                                    </p>
                                    <p className="mt-1 font-mono text-slate-800">
                                        {
                                            reviewingLocation.proposed_latitude
                                        }
                                        ,{' '}
                                        {
                                            reviewingLocation.proposed_longitude
                                        }
                                    </p>
                                </div>
                            </div>

                            <label className="block text-sm font-semibold text-slate-700">
                                Review note (optional)
                                <textarea
                                    value={locationReviewNote}
                                    onChange={(event) =>
                                        setLocationReviewNote(
                                            event.target.value,
                                        )
                                    }
                                    rows={3}
                                    maxLength={1000}
                                    placeholder="Explain why the request is rejected, if applicable."
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                                />
                            </label>

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        console.log(
                                            '[Responde LGU] Rejecting station location request',
                                            reviewingLocation.id,
                                        );
                                        router.patch(
                                            `/lgu/stations/${reviewingLocation.id}/location-update/reject`,
                                            {
                                                review_note:
                                                    locationReviewNote,
                                            },
                                            {
                                                preserveScroll: true,
                                                onSuccess: () => {
                                                    setReviewingLocation(null);
                                                    setLocationReviewNote('');
                                                },
                                            },
                                        );
                                    }}
                                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50"
                                >
                                    Reject request
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        console.log(
                                            '[Responde LGU] Approving station location request',
                                            reviewingLocation.id,
                                        );
                                        router.patch(
                                            `/lgu/stations/${reviewingLocation.id}/location-update/approve`,
                                            {},
                                            {
                                                preserveScroll: true,
                                                onSuccess: () => {
                                                    setReviewingLocation(null);
                                                    setLocationReviewNote('');
                                                },
                                            },
                                        );
                                    }}
                                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
                                >
                                    Approve new location
                                </button>
                            </div>
                        </div>
                    )}
            </Modal>

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
                        selectedLogoUrl={
                            mapLogoUrl ??
                            (form.data.remove_logo
                                ? null
                                : (editing?.logo_url ?? null))
                        }
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
                        <div className="sm:col-span-2">
                            <StationLogoField
                                id="edit-station-logo"
                                currentUrl={editing?.logo_url}
                                error={form.errors.logo}
                                removeRequested={form.data.remove_logo}
                                onFileChange={(file) => {
                                    form.setData((data) => ({
                                        ...data,
                                        logo: file,
                                        remove_logo: false,
                                    }));
                                    setMapLogoUrl((previous) => {
                                        if (previous) {
                                            URL.revokeObjectURL(previous);
                                        }

                                        return file
                                            ? URL.createObjectURL(file)
                                            : null;
                                    });
                                }}
                                onRemoveCurrent={() => {
                                    form.setData((data) => ({
                                        ...data,
                                        logo: null,
                                        remove_logo: !data.remove_logo,
                                    }));
                                    setMapLogoUrl((previous) => {
                                        if (previous) {
                                            URL.revokeObjectURL(previous);
                                        }

                                        return null;
                                    });
                                }}
                            />
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

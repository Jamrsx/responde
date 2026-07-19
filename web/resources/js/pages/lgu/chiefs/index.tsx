import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import FormField, { inputClassName } from '@/components/admin/FormField';
import Modal from '@/components/admin/Modal';
import type { StationIconKey } from '@/components/lgu/stationIcons';
import { resolveStationIcon } from '@/components/lgu/stationIcons';
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
    icon_key: StationIconKey;
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

function generatePassword(length = 12): string {
    const alphabet =
        'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
    const values = new Uint32Array(length);
    crypto.getRandomValues(values);

    return Array.from(
        values,
        (value) => alphabet[value % alphabet.length],
    ).join('');
}

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

function PasswordFields({
    idPrefix,
    password,
    confirmation,
    passwordError,
    showPassword,
    onToggleShow,
    onPasswordChange,
    onConfirmationChange,
    onGenerate,
}: {
    idPrefix: string;
    password: string;
    confirmation: string;
    passwordError?: string;
    showPassword: boolean;
    onToggleShow: () => void;
    onPasswordChange: (value: string) => void;
    onConfirmationChange: (value: string) => void;
    onGenerate: () => void;
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-700">Password</p>
                <button
                    type="button"
                    onClick={onGenerate}
                    className="text-xs font-semibold text-brand hover:underline"
                >
                    Generate password
                </button>
            </div>
            <FormField
                label="Password"
                htmlFor={`${idPrefix}-password`}
                error={passwordError}
            >
                <div className="flex gap-2">
                    <input
                        id={`${idPrefix}-password`}
                        type={showPassword ? 'text' : 'password'}
                        className={inputClassName}
                        value={password}
                        onChange={(event) =>
                            onPasswordChange(event.target.value)
                        }
                        required
                        minLength={8}
                        autoComplete="new-password"
                    />
                    <button
                        type="button"
                        onClick={onToggleShow}
                        className="min-h-11 shrink-0 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        {showPassword ? 'Hide' : 'Show'}
                    </button>
                </div>
            </FormField>
            <FormField
                label="Confirm password"
                htmlFor={`${idPrefix}-password-confirm`}
            >
                <input
                    id={`${idPrefix}-password-confirm`}
                    type={showPassword ? 'text' : 'password'}
                    className={inputClassName}
                    value={confirmation}
                    onChange={(event) =>
                        onConfirmationChange(event.target.value)
                    }
                    required
                    minLength={8}
                    autoComplete="new-password"
                />
            </FormField>
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
    const [assigning, setAssigning] = useState(false);
    const [replacing, setReplacing] = useState<Chief | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showReplacePassword, setShowReplacePassword] = useState(false);
    const [successNote, setSuccessNote] = useState<string | null>(null);
    const assignPanelRef = useRef<HTMLElement | null>(null);
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

        if (first?.latitude && first.longitude) {
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

    const needingChief = useMemo(
        () => filteredStations.filter((station) => !station.has_chief),
        [filteredStations],
    );

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
                            : station.has_chief
                              ? '#047857'
                              : '#d97706',
                })),
        [filteredStations, selectedStationId],
    );

    const selectedStation =
        stations.find((station) => station.id === selectedStationId) ?? null;

    const assigningStation =
        stations.find(
            (station) => String(station.id) === String(form.data.station_id),
        ) ?? null;

    useEffect(() => {
        if (!assigning) {
            return;
        }

        assignPanelRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
        });
    }, [assigning, form.data.station_id]);

    const closeAssign = () => {
        setAssigning(false);
        form.reset();
        form.clearErrors();
        setShowPassword(false);
    };

    const openAssign = (stationId?: number) => {
        const targetId =
            stationId ??
            selectedStationId ??
            stationsWithoutChief[0]?.id ??
            null;

        if (!targetId) {
            setSuccessNote(null);
            window.alert(
                'All stations already have a chief. Select a chief account to replace one.',
            );

            return;
        }

        const station = stations.find((item) => item.id === targetId);

        if (station?.has_chief) {
            setSelectedStationId(targetId);
            setAssigning(false);
            console.log(
                '[Responde LGU] Station already has chief — select only',
                targetId,
            );

            return;
        }

        setSelectedStationId(targetId);
        form.setData({
            ...emptyForm,
            station_id: String(targetId),
        });
        form.clearErrors();
        setShowPassword(false);
        setSuccessNote(null);
        setAssigning(true);
        console.log('[Responde LGU] Opening assign chief panel', targetId);
    };

    const handleStationSelect = (stationId: number) => {
        setSelectedStationId(stationId);
        const station = stations.find((item) => item.id === stationId);

        if (station && !station.has_chief) {
            openAssign(stationId);

            return;
        }

        if (assigning) {
            closeAssign();
        }

        console.log('[Responde LGU] Selected station', stationId);
    };

    const applyGeneratedPassword = () => {
        const password = generatePassword();
        form.setData((data) => ({
            ...data,
            password,
            password_confirmation: password,
        }));
        setShowPassword(true);
        console.log('[Responde LGU] Generated chief password');
    };

    const applyReplaceGeneratedPassword = () => {
        const password = generatePassword();
        replaceForm.setData((data) => ({
            ...data,
            password,
            password_confirmation: password,
        }));
        setShowReplacePassword(true);
        console.log('[Responde LGU] Generated replace chief password');
    };

    const submitCreate = (event: FormEvent) => {
        event.preventDefault();
        console.log('[Responde LGU] Creating station chief', form.data);
        form.post('/lgu/chiefs', {
            preserveScroll: true,
            onSuccess: () => {
                const stationName = assigningStation?.name ?? 'station';
                setSuccessNote(`Chief assigned to ${stationName}.`);
                closeAssign();
            },
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
            onSuccess: () => {
                setSuccessNote(`Chief replaced for ${replacing.station}.`);
                setReplacing(null);
                setShowReplacePassword(false);
            },
        });
    };

    return (
        <LguLayout
            title="Station Chiefs"
            description={`Assign one chief per station in ${lgu.name}`}
            fullWidth
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

            {successNote && (
                <section className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-800">
                    {successNote}
                </section>
            )}

            {stats.withoutChief > 0 && !assigning && (
                <section className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                    {stats.withoutChief} station(s) still need a chief. Click an
                    amber marker or a station in the list to assign one.
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

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,0.95fr)]">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="mb-3">
                        <h2 className="text-base font-bold text-slate-900">
                            Stations map
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Click amber = assign chief · Green = already has
                            chief · Blue = selected
                        </p>
                    </div>
                    <StationPointMap
                        center={center}
                        markers={markers}
                        pickEnabled={false}
                        fitMarkers
                        focusMarkerId={selectedStationId}
                        boundaryUrl={mapUrl}
                        onMarkerClick={(markerId) => {
                            handleStationSelect(Number(markerId));
                        }}
                        className="h-[min(68vh,720px)] min-h-[420px] w-full"
                    />
                </section>

                <section className="space-y-4">
                    {assigning ? (
                        <section
                            ref={assignPanelRef}
                            className="rounded-2xl border border-brand/30 bg-white p-5 shadow-sm ring-1 ring-brand/10"
                        >
                            <div className="mb-4 flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold tracking-wide text-brand uppercase">
                                        Assign chief
                                    </p>
                                    <h2 className="mt-1 text-base font-bold text-slate-900">
                                        {assigningStation?.name ??
                                            'Select a station'}
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {[
                                            assigningStation?.type,
                                            assigningStation?.barangay,
                                        ]
                                            .filter(Boolean)
                                            .join(' · ') ||
                                            'Fill in the chief details below'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeAssign}
                                    className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Close
                                </button>
                            </div>

                            <form onSubmit={submitCreate} className="space-y-4">
                                {stationsWithoutChief.length > 1 && (
                                    <FormField
                                        label="Station"
                                        htmlFor="chief-station"
                                        error={form.errors.station_id}
                                    >
                                        <select
                                            id="chief-station"
                                            className={inputClassName}
                                            value={form.data.station_id}
                                            onChange={(event) => {
                                                const nextId = Number(
                                                    event.target.value,
                                                );
                                                setSelectedStationId(nextId);
                                                form.setData(
                                                    'station_id',
                                                    event.target.value,
                                                );
                                                console.log(
                                                    '[Responde LGU] Assign panel station changed',
                                                    nextId,
                                                );
                                            }}
                                            required
                                        >
                                            {stationsWithoutChief.map(
                                                (station) => (
                                                    <option
                                                        key={station.id}
                                                        value={station.id}
                                                    >
                                                        {station.name}
                                                        {station.type
                                                            ? ` · ${station.type}`
                                                            : ''}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </FormField>
                                )}

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
                                            form.setData(
                                                'name',
                                                event.target.value,
                                            )
                                        }
                                        required
                                        placeholder="Chief full name"
                                        autoFocus
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
                                            form.setData(
                                                'email',
                                                event.target.value,
                                            )
                                        }
                                        required
                                        placeholder="chief@example.com"
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
                                                event.target.value.replace(
                                                    /\D/g,
                                                    '',
                                                ),
                                            )
                                        }
                                        inputMode="numeric"
                                        maxLength={11}
                                        placeholder="09XXXXXXXXX"
                                    />
                                </FormField>

                                <PasswordFields
                                    idPrefix="chief"
                                    password={form.data.password}
                                    confirmation={
                                        form.data.password_confirmation
                                    }
                                    passwordError={form.errors.password}
                                    showPassword={showPassword}
                                    onToggleShow={() =>
                                        setShowPassword((value) => !value)
                                    }
                                    onPasswordChange={(value) =>
                                        form.setData('password', value)
                                    }
                                    onConfirmationChange={(value) =>
                                        form.setData(
                                            'password_confirmation',
                                            value,
                                        )
                                    }
                                    onGenerate={applyGeneratedPassword}
                                />

                                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                                    <button
                                        type="button"
                                        onClick={closeAssign}
                                        className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={form.processing}
                                        className="min-h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-white disabled:opacity-60"
                                    >
                                        {form.processing
                                            ? 'Assigning...'
                                            : 'Assign chief'}
                                    </button>
                                </div>
                            </form>
                        </section>
                    ) : selectedStation ? (
                        <div
                            className={`rounded-2xl border p-4 ${
                                selectedStation.has_chief
                                    ? 'border-emerald-200 bg-emerald-50'
                                    : 'border-amber-200 bg-amber-50'
                            }`}
                        >
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
                                <p className="mt-2 text-xs font-semibold text-emerald-700">
                                    Chief: {selectedStation.chief.name}
                                </p>
                            ) : (
                                <p className="mt-2 text-xs font-semibold text-amber-700">
                                    No chief yet — tap the station again to
                                    assign one.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                            Click a station on the map or in the list to get
                            started.
                        </div>
                    )}

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-2">
                            <h2 className="text-base font-bold text-slate-900">
                                Stations ({filteredStations.length})
                            </h2>
                            {needingChief.length > 0 && (
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                    {needingChief.length} need chief
                                </span>
                            )}
                        </div>
                        {filteredStations.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                                No stations match your search.
                            </p>
                        ) : (
                            <ul className="max-h-[36vh] space-y-2 overflow-y-auto">
                                {filteredStations.map((station) => (
                                    <li key={station.id}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleStationSelect(station.id)
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
                                                            : 'Tap to assign a chief'}
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
                                    : 'No station chiefs yet. Assign one from the map or list.'}
                            </p>
                        ) : (
                            <ul className="max-h-[30vh] divide-y divide-slate-100 overflow-y-auto">
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
                                                    setShowReplacePassword(
                                                        false,
                                                    );
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
                                                            preserveScroll: true,
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
                show={replacing !== null}
                title="Replace station chief"
                onClose={() => {
                    setReplacing(null);
                    setShowReplacePassword(false);
                }}
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
                                inputMode="numeric"
                                maxLength={11}
                                placeholder="09XXXXXXXXX"
                            />
                        </FormField>
                        <PasswordFields
                            idPrefix="replace"
                            password={replaceForm.data.password}
                            confirmation={
                                replaceForm.data.password_confirmation
                            }
                            passwordError={replaceForm.errors.password}
                            showPassword={showReplacePassword}
                            onToggleShow={() =>
                                setShowReplacePassword((value) => !value)
                            }
                            onPasswordChange={(value) =>
                                replaceForm.setData('password', value)
                            }
                            onConfirmationChange={(value) =>
                                replaceForm.setData(
                                    'password_confirmation',
                                    value,
                                )
                            }
                            onGenerate={applyReplaceGeneratedPassword}
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setReplacing(null);
                                    setShowReplacePassword(false);
                                }}
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

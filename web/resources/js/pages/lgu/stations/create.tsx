import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import FormField, { inputClassName } from '@/components/admin/FormField';
import {
    defaultStationIcon,
    resolveStationIcon,
    StationIconPicker,
} from '@/components/lgu/stationIcons';
import type { StationIconKey } from '@/components/lgu/stationIcons';
import StationLogoField from '@/components/lgu/StationLogoField';
import StationPointMap from '@/components/lgu/StationPointMap';
import LguLayout from '@/layouts/LguLayout';

type StationType = { id: number; name: string; code: string };
type Barangay = { id: number; name: string; code: string | null };
type ExistingStation = {
    id: number;
    name: string;
    latitude: string;
    longitude: string;
    approval_status: string;
    icon_key: StationIconKey;
    logo_url: string | null;
    type: string | null;
    type_code: string | null;
};

type Props = {
    lgu: {
        id: number;
        name: string;
        psgc_code: string | null;
        latitude: string | null;
        longitude: string | null;
    };
    stationTypes: StationType[];
    barangays: Barangay[];
    existingStations: ExistingStation[];
    mapUrl: string | null;
};

export default function LguStationsCreate({
    lgu,
    stationTypes,
    barangays,
    existingStations,
    mapUrl,
}: Props) {
    const [locationMessage, setLocationMessage] = useState<string | null>(null);
    const [locating, setLocating] = useState(false);
    const [showChiefPassword, setShowChiefPassword] = useState(false);
    const [locationFocus, setLocationFocus] = useState<{
        latitude: number;
        longitude: number;
        zoom: number;
    } | null>(null);
    const center = useMemo<[number, number]>(() => {
        if (lgu.latitude && lgu.longitude) {
            return [Number(lgu.latitude), Number(lgu.longitude)];
        }

        return [12.8797, 121.774];
    }, [lgu.latitude, lgu.longitude]);

    const existingMarkers = useMemo(
        () =>
            existingStations.map((station) => ({
                id: station.id,
                name: `${station.name}${station.type ? ` · ${station.type}` : ''}`,
                latitude: Number(station.latitude),
                longitude: Number(station.longitude),
                iconKey: resolveStationIcon(
                    station.icon_key,
                    station.type_code,
                ),
                logoUrl: station.logo_url,
                color:
                    station.approval_status === 'pending'
                        ? '#d97706'
                        : station.approval_status === 'rejected'
                          ? '#dc2626'
                          : '#047857',
            })),
        [existingStations],
    );

    const form = useForm({
        station_type_id: String(stationTypes[0]?.id ?? ''),
        icon_key: defaultStationIcon(stationTypes[0]?.code),
        logo: null as File | null,
        other_type_name: '',
        barangay_id: '',
        name: '',
        contact_number: '',
        address: '',
        latitude: String(center[0]),
        longitude: String(center[1]),
        status: 'active',
        assign_chief: true,
        chief_name: '',
        chief_email: '',
        set_chief_password: false,
        chief_password: '',
    });

    const [mapLogoUrl, setMapLogoUrl] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            if (mapLogoUrl) {
                URL.revokeObjectURL(mapLogoUrl);
            }
        };
    }, [mapLogoUrl]);

    const selectedType = stationTypes.find(
        (type) => String(type.id) === String(form.data.station_type_id),
    );
    const isOtherType = selectedType?.code === 'other';

    const selectedBarangayPsgc = barangays.find(
        (barangay) => String(barangay.id) === String(form.data.barangay_id),
    )?.code;

    const useCurrentLocation = () => {
        if (!navigator.geolocation) {
            setLocationMessage('Location is not supported by this browser.');

            return;
        }

        setLocating(true);
        setLocationMessage('Getting your current location...');
        console.log('[Responde LGU] Requesting current location');

        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                const latitude = Number(coords.latitude.toFixed(7));
                const longitude = Number(coords.longitude.toFixed(7));

                form.setData((data) => ({
                    ...data,
                    latitude: String(latitude),
                    longitude: String(longitude),
                }));
                setLocationFocus({ latitude, longitude, zoom: 18 });
                setLocationMessage('Current location placed on the map.');
                setLocating(false);
                console.log('[Responde LGU] Current location placed', {
                    latitude,
                    longitude,
                    accuracy: coords.accuracy,
                });
            },
            (error) => {
                const message =
                    error.code === error.PERMISSION_DENIED
                        ? 'Location permission was denied. Allow location access and try again.'
                        : 'Your location could not be detected. Try again or place the pin manually.';
                setLocationMessage(message);
                setLocating(false);
                console.error('[Responde LGU] Current location failed', error);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        );
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        console.log('[Responde LGU] Creating station from page', {
            ...form.data,
            logo: form.data.logo
                ? {
                      name: form.data.logo.name,
                      size: form.data.logo.size,
                      type: form.data.logo.type,
                  }
                : null,
        });
        form.post('/lgu/stations', {
            forceFormData: true,
        });
    };

    return (
        <LguLayout
            title="Add station"
            description={`Place a new response station in ${lgu.name}`}
            fullWidth
            actions={
                <Link
                    href="/lgu/stations"
                    className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                    Back to stations
                </Link>
            }
        >
            <Head title="Add Station" />

            <form
                onSubmit={submit}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
            >
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.9fr)]">
                    <section className="self-start xl:sticky xl:top-4">
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">
                                    Station location
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Click the map or use your current location
                                    to place the station marker.
                                </p>
                                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
                                    <span className="inline-flex items-center gap-1">
                                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                                        Existing approved
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <span className="h-2.5 w-2.5 rounded-full bg-amber-600" />
                                        Existing pending
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                                        Existing rejected
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                                        New station
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={useCurrentLocation}
                                disabled={locating}
                                className="inline-flex min-h-11 items-center rounded-lg border border-brand bg-white px-4 text-sm font-semibold text-brand-dark hover:bg-brand-light disabled:cursor-wait disabled:opacity-60"
                            >
                                {locating
                                    ? 'Getting location...'
                                    : 'Use my current location'}
                            </button>
                        </div>
                        {locationMessage && (
                            <p
                                className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700"
                                role="status"
                            >
                                {locationMessage}
                            </p>
                        )}
                        <StationPointMap
                            center={
                                form.data.latitude && form.data.longitude
                                    ? [
                                          Number(form.data.latitude),
                                          Number(form.data.longitude),
                                      ]
                                    : center
                            }
                            markers={existingMarkers}
                            selectedIconKey={
                                form.data.icon_key as StationIconKey
                            }
                            selectedLogoUrl={mapLogoUrl}
                            focusPosition={locationFocus}
                            selected={
                                form.data.latitude && form.data.longitude
                                    ? {
                                          latitude: Number(form.data.latitude),
                                          longitude: Number(
                                              form.data.longitude,
                                          ),
                                      }
                                    : null
                            }
                            onPick={(lat, lng) => {
                                console.log(
                                    '[Responde LGU] Station pin placed',
                                    lat,
                                    lng,
                                );
                                form.setData((data) => ({
                                    ...data,
                                    latitude: String(lat),
                                    longitude: String(lng),
                                }));
                            }}
                            boundaryUrl={mapUrl}
                            selectedBarangayPsgc={selectedBarangayPsgc}
                            className="h-[min(68vh,720px)] min-h-[420px] w-full"
                        />
                        {(form.errors.latitude || form.errors.longitude) && (
                            <p className="mt-2 text-xs text-red-600">
                                {form.errors.latitude || form.errors.longitude}
                            </p>
                        )}
                    </section>

                    <section className="space-y-4">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">
                                Station details
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500">
                                Fill in the station information on this side.
                            </p>
                        </div>

                        <FormField
                            label="Station type"
                            htmlFor="create-station-type"
                            error={form.errors.station_type_id}
                        >
                            <select
                                id="create-station-type"
                                className={inputClassName}
                                value={form.data.station_type_id}
                                onChange={(event) => {
                                    const nextTypeId = event.target.value;
                                    const nextType = stationTypes.find(
                                        (type) =>
                                            String(type.id) === nextTypeId,
                                    );
                                    console.log(
                                        '[Responde LGU] Station type changed',
                                        nextType?.code,
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
                            >
                                {stationTypes.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                        </FormField>

                        <StationIconPicker
                            value={form.data.icon_key as StationIconKey}
                            onChange={(iconKey) => {
                                form.setData('icon_key', iconKey);
                                console.log(
                                    '[Responde LGU] Station icon selected',
                                    iconKey,
                                );
                            }}
                        />
                        {form.errors.icon_key && (
                            <p className="-mt-2 text-xs text-red-600">
                                {form.errors.icon_key}
                            </p>
                        )}

                        <StationLogoField
                            id="create-station-logo"
                            error={form.errors.logo}
                            onFileChange={(file) => {
                                form.setData('logo', file);
                                setMapLogoUrl((previous) => {
                                    if (previous) {
                                        URL.revokeObjectURL(previous);
                                    }

                                    return file
                                        ? URL.createObjectURL(file)
                                        : null;
                                });
                            }}
                        />

                        {isOtherType && (
                            <FormField
                                label="Specify station type"
                                htmlFor="create-other-type"
                                error={form.errors.other_type_name}
                            >
                                <input
                                    id="create-other-type"
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
                            label="Barangay"
                            htmlFor="create-station-barangay"
                            error={form.errors.barangay_id}
                        >
                            <select
                                id="create-station-barangay"
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

                        <FormField
                            label="Station name"
                            htmlFor="create-station-name"
                            error={form.errors.name}
                        >
                            <input
                                id="create-station-name"
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
                            htmlFor="create-station-contact"
                            error={form.errors.contact_number}
                        >
                            <input
                                id="create-station-contact"
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

                        <FormField
                            label="Status"
                            htmlFor="create-station-status"
                            error={form.errors.status}
                        >
                            <select
                                id="create-station-status"
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

                        <FormField
                            label="Address"
                            htmlFor="create-station-address"
                            error={form.errors.address}
                        >
                            <input
                                id="create-station-address"
                                className={inputClassName}
                                value={form.data.address}
                                onChange={(event) =>
                                    form.setData('address', event.target.value)
                                }
                            />
                        </FormField>

                        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <label
                                htmlFor="assign-chief"
                                className="flex cursor-pointer items-start justify-between gap-4"
                            >
                                <span>
                                    <span className="block text-sm font-bold text-slate-900">
                                        Assign station chief now
                                    </span>
                                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                                        Enter the chief name and email. You can
                                        set a password to mail, or let the
                                        system generate one.
                                    </span>
                                </span>
                                <input
                                    id="assign-chief"
                                    type="checkbox"
                                    checked={form.data.assign_chief}
                                    onChange={(event) => {
                                        form.setData((data) => ({
                                            ...data,
                                            assign_chief: event.target.checked,
                                            set_chief_password: event.target
                                                .checked
                                                ? data.set_chief_password
                                                : false,
                                            chief_password: event.target.checked
                                                ? data.chief_password
                                                : '',
                                        }));
                                        form.clearErrors(
                                            'chief_name',
                                            'chief_email',
                                            'chief_password',
                                        );
                                        console.log(
                                            '[Responde LGU] Assign chief with station',
                                            event.target.checked,
                                        );
                                    }}
                                    className="mt-0.5 h-5 w-5 rounded border-slate-300 text-brand focus:ring-brand"
                                />
                            </label>

                            {form.data.assign_chief && (
                                <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                                    <FormField
                                        label="Chief full name"
                                        htmlFor="create-chief-name"
                                        error={form.errors.chief_name}
                                    >
                                        <input
                                            id="create-chief-name"
                                            type="text"
                                            className={inputClassName}
                                            value={form.data.chief_name}
                                            onChange={(event) =>
                                                form.setData(
                                                    'chief_name',
                                                    event.target.value,
                                                )
                                            }
                                            autoComplete="name"
                                            placeholder="Chief full name"
                                            required
                                        />
                                    </FormField>

                                    <FormField
                                        label="Chief email"
                                        htmlFor="create-chief-email"
                                        error={form.errors.chief_email}
                                    >
                                        <input
                                            id="create-chief-email"
                                            type="email"
                                            className={inputClassName}
                                            value={form.data.chief_email}
                                            onChange={(event) =>
                                                form.setData(
                                                    'chief_email',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="chief@example.com"
                                            required
                                        />
                                    </FormField>

                                    <label
                                        htmlFor="set-chief-password"
                                        className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white px-3 py-3"
                                    >
                                        <span>
                                            <span className="block text-sm font-semibold text-slate-900">
                                                Set password manually
                                            </span>
                                            <span className="mt-1 block text-xs leading-5 text-slate-500">
                                                If unchecked, the system
                                                generates an 8-character
                                                password and emails it.
                                            </span>
                                        </span>
                                        <input
                                            id="set-chief-password"
                                            type="checkbox"
                                            checked={
                                                form.data.set_chief_password
                                            }
                                            onChange={(event) => {
                                                form.setData((data) => ({
                                                    ...data,
                                                    set_chief_password:
                                                        event.target.checked,
                                                    chief_password: event.target
                                                        .checked
                                                        ? data.chief_password
                                                        : '',
                                                }));
                                                form.clearErrors(
                                                    'chief_password',
                                                );
                                                console.log(
                                                    '[Responde LGU] Set chief password manually',
                                                    event.target.checked,
                                                );
                                            }}
                                            className="mt-0.5 h-5 w-5 rounded border-slate-300 text-brand focus:ring-brand"
                                        />
                                    </label>

                                    {form.data.set_chief_password ? (
                                        <FormField
                                            label="Password to email"
                                            htmlFor="create-chief-password"
                                            error={form.errors.chief_password}
                                        >
                                            <div className="flex gap-2">
                                                <input
                                                    id="create-chief-password"
                                                    type={
                                                        showChiefPassword
                                                            ? 'text'
                                                            : 'password'
                                                    }
                                                    className={inputClassName}
                                                    value={
                                                        form.data.chief_password
                                                    }
                                                    onChange={(event) =>
                                                        form.setData(
                                                            'chief_password',
                                                            event.target.value,
                                                        )
                                                    }
                                                    autoComplete="new-password"
                                                    minLength={8}
                                                    placeholder="At least 8 characters"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowChiefPassword(
                                                            (value) => !value,
                                                        )
                                                    }
                                                    className="min-h-11 shrink-0 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                                >
                                                    {showChiefPassword
                                                        ? 'Hide'
                                                        : 'Show'}
                                                </button>
                                            </div>
                                        </FormField>
                                    ) : (
                                        <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs leading-5 text-blue-700">
                                            The system will generate an
                                            8-character password and email it to
                                            the chief.
                                        </p>
                                    )}
                                </div>
                            )}
                        </section>

                        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                            <Link
                                href="/lgu/stations"
                                className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="min-h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                            >
                                {form.processing
                                    ? form.data.assign_chief
                                        ? 'Saving and sending email...'
                                        : 'Saving...'
                                    : form.data.assign_chief
                                      ? 'Save station and chief'
                                      : 'Save station'}
                            </button>
                        </div>
                    </section>
                </div>
            </form>
        </LguLayout>
    );
}

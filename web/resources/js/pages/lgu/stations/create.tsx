import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import FormField, { inputClassName } from '@/components/admin/FormField';
import StationPointMap from '@/components/lgu/StationPointMap';
import LguLayout from '@/layouts/LguLayout';

type StationType = { id: number; name: string; code: string };
type Barangay = { id: number; name: string; code: string | null };

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
    mapUrl: string | null;
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

export default function LguStationsCreate({
    lgu,
    stationTypes,
    barangays,
    mapUrl,
}: Props) {
    const [showChiefPassword, setShowChiefPassword] = useState(false);
    const center = useMemo<[number, number]>(() => {
        if (lgu.latitude && lgu.longitude) {
            return [Number(lgu.latitude), Number(lgu.longitude)];
        }

        return [12.8797, 121.774];
    }, [lgu.latitude, lgu.longitude]);

    const form = useForm({
        station_type_id: String(stationTypes[0]?.id ?? ''),
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
        chief_phone: '',
        chief_password: '',
        chief_password_confirmation: '',
    });

    const selectedType = stationTypes.find(
        (type) => String(type.id) === String(form.data.station_type_id),
    );
    const isOtherType = selectedType?.code === 'other';

    const selectedBarangayPsgc = barangays.find(
        (barangay) => String(barangay.id) === String(form.data.barangay_id),
    )?.code;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        console.log('[Responde LGU] Creating station from page', {
            ...form.data,
            chief_password: form.data.chief_password ? '[provided]' : '',
            chief_password_confirmation: form.data.chief_password_confirmation
                ? '[provided]'
                : '',
        });
        form.post('/lgu/stations');
    };

    const applyGeneratedPassword = () => {
        const password = generatePassword();
        form.setData((data) => ({
            ...data,
            chief_password: password,
            chief_password_confirmation: password,
        }));
        setShowChiefPassword(true);
        console.log('[Responde LGU] Generated station chief password');
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
                        <h2 className="mb-1 text-base font-bold text-slate-900">
                            Station location
                        </h2>
                        <p className="mb-3 text-xs text-slate-500">
                            Click the map to place or move the station marker
                            inside your LGU boundary.
                        </p>
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
                                        Create the chief account together with
                                        this station.
                                    </span>
                                </span>
                                <input
                                    id="assign-chief"
                                    type="checkbox"
                                    checked={form.data.assign_chief}
                                    onChange={(event) => {
                                        form.setData(
                                            'assign_chief',
                                            event.target.checked,
                                        );
                                        form.clearErrors(
                                            'chief_name',
                                            'chief_email',
                                            'chief_phone',
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
                                            className={inputClassName}
                                            value={form.data.chief_name}
                                            onChange={(event) =>
                                                form.setData(
                                                    'chief_name',
                                                    event.target.value,
                                                )
                                            }
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

                                    <FormField
                                        label="Chief phone"
                                        htmlFor="create-chief-phone"
                                        error={form.errors.chief_phone}
                                    >
                                        <input
                                            id="create-chief-phone"
                                            className={inputClassName}
                                            value={form.data.chief_phone}
                                            onChange={(event) =>
                                                form.setData(
                                                    'chief_phone',
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

                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-medium text-slate-700">
                                            Account password
                                        </p>
                                        <button
                                            type="button"
                                            onClick={applyGeneratedPassword}
                                            className="text-xs font-semibold text-brand hover:underline"
                                        >
                                            Generate password
                                        </button>
                                    </div>

                                    <FormField
                                        label="Password"
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
                                                value={form.data.chief_password}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'chief_password',
                                                        event.target.value,
                                                    )
                                                }
                                                minLength={8}
                                                required
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowChiefPassword(
                                                        (value) => !value,
                                                    )
                                                }
                                                className="min-h-11 shrink-0 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                            >
                                                {showChiefPassword
                                                    ? 'Hide'
                                                    : 'Show'}
                                            </button>
                                        </div>
                                    </FormField>

                                    <FormField
                                        label="Confirm password"
                                        htmlFor="create-chief-password-confirm"
                                    >
                                        <input
                                            id="create-chief-password-confirm"
                                            type={
                                                showChiefPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            className={inputClassName}
                                            value={
                                                form.data
                                                    .chief_password_confirmation
                                            }
                                            onChange={(event) =>
                                                form.setData(
                                                    'chief_password_confirmation',
                                                    event.target.value,
                                                )
                                            }
                                            minLength={8}
                                            required
                                            autoComplete="new-password"
                                        />
                                    </FormField>
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
                                    ? 'Saving...'
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

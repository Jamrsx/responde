import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';

import FormField, { inputClassName } from '@/components/admin/FormField';
import ChiefLayout from '@/layouts/ChiefLayout';

type StationStatus = 'active' | 'busy' | 'inactive';

type Props = {
    station: {
        id: number;
        name: string;
        type: string | null;
        logo_url: string | null;
        status: StationStatus;
        contact_number: string | null;
        address: string | null;
        latitude: string;
        longitude: string;
    };
    lgu: {
        id: number;
        name: string;
    };
};

const statuses: Array<{
    value: StationStatus;
    label: string;
    description: string;
    className: string;
}> = [
    {
        value: 'active',
        label: 'Active',
        description: 'Ready to receive and respond to requests.',
        className: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    },
    {
        value: 'busy',
        label: 'Busy',
        description: 'Currently handling a response or at limited capacity.',
        className: 'border-amber-300 bg-amber-50 text-amber-800',
    },
    {
        value: 'inactive',
        label: 'Inactive',
        description: 'Not available for emergency assignments.',
        className: 'border-red-300 bg-red-50 text-red-800',
    },
];

export default function ChiefStationSettings({ station, lgu }: Props) {
    const form = useForm({
        status: station.status,
        contact_number: station.contact_number ?? '',
        address: station.address ?? '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (
            form.data.status === 'inactive' &&
            station.status !== 'inactive' &&
            !window.confirm(
                'Set this station as inactive? It should not receive new assignments while inactive.',
            )
        ) {
            return;
        }

        console.log('[Responde Chief] Updating station settings', {
            stationId: station.id,
            status: form.data.status,
        });
        form.put('/chief/station-settings', {
            preserveScroll: true,
        });
    };

    return (
        <ChiefLayout
            title="Station Settings"
            description={`Operational settings for ${station.name}`}
            fullWidth
        >
            <Head title="Station Settings" />

            <form
                onSubmit={submit}
                className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]"
            >
                <div className="space-y-5">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <h2 className="text-lg font-bold text-slate-900">
                            Operational status
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Keep this accurate so the LGU and future dispatch
                            logic know whether the station can respond.
                        </p>

                        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                            {statuses.map((status) => (
                                <label
                                    key={status.value}
                                    className={`cursor-pointer rounded-xl border p-4 transition ${
                                        form.data.status === status.value
                                            ? status.className
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="station-status"
                                        value={status.value}
                                        checked={
                                            form.data.status === status.value
                                        }
                                        onChange={() => {
                                            form.setData(
                                                'status',
                                                status.value,
                                            );
                                            console.log(
                                                '[Responde Chief] Station status selected',
                                                status.value,
                                            );
                                        }}
                                        className="sr-only"
                                    />
                                    <span className="font-semibold">
                                        {status.label}
                                    </span>
                                    <span className="mt-1 block text-xs leading-5 opacity-80">
                                        {status.description}
                                    </span>
                                </label>
                            ))}
                        </div>
                        {form.errors.status && (
                            <p className="mt-2 text-sm text-red-600">
                                {form.errors.status}
                            </p>
                        )}
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <h2 className="text-lg font-bold text-slate-900">
                            Public station details
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            These contact details may be shown to LGU personnel
                            and responders.
                        </p>

                        <div className="mt-5 space-y-4">
                            <FormField
                                label="Contact number"
                                htmlFor="station-contact"
                                error={form.errors.contact_number}
                            >
                                <input
                                    id="station-contact"
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={11}
                                    value={form.data.contact_number}
                                    onChange={(event) =>
                                        form.setData(
                                            'contact_number',
                                            event.target.value
                                                .replace(/\D/g, '')
                                                .slice(0, 11),
                                        )
                                    }
                                    placeholder="09XXXXXXXXX"
                                    className={inputClassName}
                                />
                            </FormField>
                            <FormField
                                label="Office address"
                                htmlFor="station-address"
                                error={form.errors.address}
                            >
                                <textarea
                                    id="station-address"
                                    rows={4}
                                    maxLength={1000}
                                    value={form.data.address}
                                    onChange={(event) =>
                                        form.setData(
                                            'address',
                                            event.target.value,
                                        )
                                    }
                                    className={inputClassName}
                                    placeholder="Station office address"
                                />
                            </FormField>
                        </div>
                    </section>
                </div>

                <aside className="self-start rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-5">
                    <div className="flex items-center gap-3">
                        {station.logo_url ? (
                            <img
                                src={station.logo_url}
                                alt=""
                                className="h-14 w-14 rounded-xl object-cover ring-1 ring-slate-200"
                            />
                        ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-500">
                                {station.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0">
                            <h2 className="truncate font-bold text-slate-900">
                                {station.name}
                            </h2>
                            <p className="text-sm text-slate-500">
                                {station.type ?? 'Station'} · {lgu.name}
                            </p>
                        </div>
                    </div>

                    <dl className="mt-5 space-y-3 text-sm">
                        <div className="flex justify-between gap-3 border-b border-slate-100 pb-3">
                            <dt className="text-slate-500">
                                Approved latitude
                            </dt>
                            <dd className="font-mono text-slate-800">
                                {station.latitude}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3 border-b border-slate-100 pb-3">
                            <dt className="text-slate-500">
                                Approved longitude
                            </dt>
                            <dd className="font-mono text-slate-800">
                                {station.longitude}
                            </dd>
                        </div>
                    </dl>

                    <Link
                        href="/chief/station-location"
                        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Review station location
                    </Link>

                    <button
                        type="submit"
                        disabled={form.processing || !form.isDirty}
                        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {form.processing ? 'Saving...' : 'Save settings'}
                    </button>
                </aside>
            </form>
        </ChiefLayout>
    );
}

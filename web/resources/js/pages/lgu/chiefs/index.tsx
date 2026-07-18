import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import FormField, { inputClassName } from '@/components/admin/FormField';
import Modal from '@/components/admin/Modal';
import LguLayout from '@/layouts/LguLayout';

type Chief = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    station_id: number | null;
    station: string | null;
    station_type: string | null;
    created_at: string | null;
};

type StationOption = {
    id: number;
    name: string;
    type: string | null;
};

type Props = {
    lgu: { id: number; name: string };
    chiefs: Chief[];
    stationsWithoutChief: StationOption[];
};

const emptyForm = {
    station_id: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
};

export default function LguChiefsIndex({
    lgu,
    chiefs,
    stationsWithoutChief,
}: Props) {
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

    const openCreate = () => {
        form.setData({
            ...emptyForm,
            station_id: String(stationsWithoutChief[0]?.id ?? ''),
        });
        form.clearErrors();
        setShowCreate(true);
    };

    const submitCreate = (event: FormEvent) => {
        event.preventDefault();
        console.log('[Responde LGU] Creating station chief', form.data);
        router.post(
            '/lgu/chiefs',
            {
                ...form.data,
                station_id: Number(form.data.station_id),
            },
            {
                preserveScroll: true,
                onSuccess: () => setShowCreate(false),
                onError: (errors) => form.setError(errors),
            },
        );
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
            actions={
                <button
                    type="button"
                    onClick={openCreate}
                    disabled={stationsWithoutChief.length === 0}
                    className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                    Add chief
                </button>
            }
        >
            <Head title="LGU Chiefs" />

            <div className="space-y-6">
                {stationsWithoutChief.length > 0 && (
                    <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                        {stationsWithoutChief.length} station(s) still need a
                        chief account.
                    </section>
                )}

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-4 text-base font-bold text-slate-900">
                        Chief accounts ({chiefs.length})
                    </h2>
                    {chiefs.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                            No station chiefs yet. Create one for each mapped
                            station.
                        </p>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {chiefs.map((chief) => (
                                <li
                                    key={chief.id}
                                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
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

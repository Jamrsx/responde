import { Head, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import FormField, { inputClassName } from '@/components/admin/FormField';
import Modal from '@/components/admin/Modal';
import BarangayMapPicker from '@/components/lgu/BarangayMapPicker';
import type { BarangayFeatureProps } from '@/components/lgu/BarangayMapPicker';
import LguLayout from '@/layouts/LguLayout';

type Barangay = {
    id: number;
    name: string;
    code: string | null;
    is_active: boolean;
    captain: {
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
    barangays: Barangay[];
    mapUrl: string | null;
};

export default function LguBarangaysIndex({ lgu, barangays, mapUrl }: Props) {
    const [selectedPsgcs, setSelectedPsgcs] = useState<string[]>([]);
    const [selectedFeatures, setSelectedFeatures] = useState<
        Array<GeoJSON.Feature<GeoJSON.Geometry, BarangayFeatureProps>>
    >([]);
    const [officialCount, setOfficialCount] = useState<number | null>(null);
    const [listSearch, setListSearch] = useState('');
    const [captainBarangay, setCaptainBarangay] = useState<Barangay | null>(
        null,
    );
    const [editCaptainBarangay, setEditCaptainBarangay] =
        useState<Barangay | null>(null);
    const [replaceCaptainBarangay, setReplaceCaptainBarangay] =
        useState<Barangay | null>(null);
    const [importing, setImporting] = useState(false);

    const captainForm = useForm({
        barangay_id: 0,
        name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
    });

    const editCaptainForm = useForm({
        name: '',
        email: '',
        phone: '',
    });

    const replaceCaptainForm = useForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
    });

    const importedPsgcs = useMemo(
        () =>
            barangays
                .map((barangay) => barangay.code)
                .filter((code): code is string => Boolean(code)),
        [barangays],
    );

    const filteredBarangays = useMemo(() => {
        const query = listSearch.trim().toLowerCase();

        if (!query) {
            return barangays;
        }

        return barangays.filter((barangay) => {
            const haystack = [
                barangay.name,
                barangay.code ?? '',
                barangay.captain?.name ?? '',
                barangay.captain?.email ?? '',
            ]
                .join(' ')
                .toLowerCase();

            return haystack.includes(query);
        });
    }, [barangays, listSearch]);

    const importSelected = () => {
        if (selectedFeatures.length === 0) {
            return;
        }

        setImporting(true);
        console.log('[Responde LGU] Importing barangays', selectedFeatures);

        router.post(
            '/lgu/barangays/import',
            {
                barangays: selectedFeatures.map((feature) => ({
                    psgc: feature.properties.psgc,
                    name: feature.properties.name,
                })),
            },
            {
                preserveScroll: true,
                onFinish: () => setImporting(false),
                onSuccess: () => {
                    setSelectedPsgcs([]);
                    setSelectedFeatures([]);
                },
            },
        );
    };

    const openCaptainModal = (barangay: Barangay) => {
        setCaptainBarangay(barangay);
        captainForm.setData({
            barangay_id: barangay.id,
            name: '',
            email: '',
            phone: '',
            password: '',
            password_confirmation: '',
        });
        captainForm.clearErrors();
    };

    const submitCaptain = (event: FormEvent) => {
        event.preventDefault();
        console.log('[Responde LGU] Creating barangay captain', captainForm.data);
        captainForm.post('/lgu/barangays/captains', {
            preserveScroll: true,
            onSuccess: () => setCaptainBarangay(null),
        });
    };

    const openEditCaptainModal = (barangay: Barangay) => {
        setEditCaptainBarangay(barangay);
        editCaptainForm.setData({
            name: barangay.captain?.name ?? '',
            email: barangay.captain?.email ?? '',
            phone: barangay.captain?.phone ?? '',
        });
        editCaptainForm.clearErrors();
    };

    const submitEditCaptain = (event: FormEvent) => {
        event.preventDefault();

        if (!editCaptainBarangay) {
            return;
        }

        console.log(
            '[Responde LGU] Updating captain details',
            editCaptainForm.data,
        );
        editCaptainForm.put(
            `/lgu/barangays/${editCaptainBarangay.id}/captain`,
            {
                preserveScroll: true,
                onSuccess: () => setEditCaptainBarangay(null),
            },
        );
    };

    const openReplaceCaptainModal = (barangay: Barangay) => {
        setReplaceCaptainBarangay(barangay);
        replaceCaptainForm.reset();
        replaceCaptainForm.clearErrors();
    };

    const submitReplaceCaptain = (event: FormEvent) => {
        event.preventDefault();

        if (!replaceCaptainBarangay) {
            return;
        }

        console.log(
            '[Responde LGU] Replacing barangay captain',
            replaceCaptainBarangay.id,
        );
        replaceCaptainForm.post(
            `/lgu/barangays/${replaceCaptainBarangay.id}/captain/replace`,
            {
                preserveScroll: true,
                onSuccess: () => setReplaceCaptainBarangay(null),
            },
        );
    };

    return (
        <LguLayout
            title="Barangays"
            description={`Select official barangays in ${lgu.name}`}
            fullWidth
            actions={
                <button
                    type="button"
                    onClick={importSelected}
                    disabled={selectedFeatures.length === 0 || importing}
                    className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
                >
                    {importing
                        ? 'Importing...'
                        : `Import selected (${selectedFeatures.length})`}
                </button>
            }
        >
            <Head title="LGU Barangays" />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2.4fr)_minmax(300px,0.7fr)]">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">
                                Official barangay map
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500">
                                {officialCount === null
                                    ? 'Loading barangay boundaries…'
                                    : `${officialCount} official barangay${officialCount === 1 ? '' : 's'} in ${lgu.name}`}
                            </p>
                        </div>
                        {officialCount !== null && (
                            <div className="flex flex-wrap gap-2 text-xs font-semibold">
                                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700">
                                    Official {officialCount}
                                </span>
                                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700">
                                    Selected {selectedFeatures.length}
                                </span>
                                <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-blue-700">
                                    Registered {barangays.length}
                                </span>
                            </div>
                        )}
                    </div>
                    <BarangayMapPicker
                        mapUrl={mapUrl}
                        importedPsgcs={importedPsgcs}
                        selectedPsgcs={selectedPsgcs}
                        center={
                            lgu.latitude && lgu.longitude
                                ? [
                                      Number(lgu.latitude),
                                      Number(lgu.longitude),
                                  ]
                                : null
                        }
                        onLoaded={(total) => {
                            console.log(
                                '[Responde LGU] Official barangay count',
                                total,
                            );
                            setOfficialCount(total);
                        }}
                        onChange={(next, features) => {
                            setSelectedPsgcs(next);
                            setSelectedFeatures(features);
                        }}
                    />
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="mb-4 space-y-3">
                        <div className="flex flex-wrap items-end justify-between gap-2">
                            <h2 className="text-base font-bold text-slate-900">
                                Registered barangays ({barangays.length})
                            </h2>
                            {listSearch.trim() !== '' && (
                                <p className="text-xs text-slate-500">
                                    Showing {filteredBarangays.length} of{' '}
                                    {barangays.length}
                                </p>
                            )}
                        </div>
                        {barangays.length > 0 && (
                            <input
                                type="search"
                                value={listSearch}
                                onChange={(event) =>
                                    setListSearch(event.target.value)
                                }
                                placeholder="Search registered barangays..."
                                className={inputClassName}
                                autoComplete="off"
                                aria-label="Search registered barangays"
                            />
                        )}
                    </div>
                    {barangays.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                            Select barangays on the map and import them.
                        </p>
                    ) : filteredBarangays.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                            No registered barangays match “{listSearch.trim()}”.
                        </p>
                    ) : (
                        <ul className="max-h-[70vh] space-y-2 overflow-y-auto">
                            {filteredBarangays.map((barangay) => (
                                <li
                                    key={barangay.id}
                                    className="rounded-xl border border-slate-100 px-3 py-3"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-800">
                                                {barangay.name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                PSGC {barangay.code ?? '—'}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-600">
                                                {barangay.captain
                                                    ? `Captain: ${barangay.captain.name}`
                                                    : 'No captain assigned'}
                                            </p>
                                        </div>
                                        <span
                                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                barangay.is_active
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-slate-200 text-slate-600'
                                            }`}
                                        >
                                            {barangay.is_active
                                                ? 'Active'
                                                : 'Inactive'}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {!barangay.captain && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openCaptainModal(barangay)
                                                }
                                                className="min-h-10 rounded-lg bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-dark"
                                            >
                                                Add captain
                                            </button>
                                        )}
                                        {barangay.captain && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openEditCaptainModal(
                                                            barangay,
                                                        )
                                                    }
                                                    className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                                >
                                                    Edit captain
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openReplaceCaptainModal(
                                                            barangay,
                                                        )
                                                    }
                                                    className="min-h-10 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                                                >
                                                    Replace captain
                                                </button>
                                            </>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                console.log(
                                                    '[Responde LGU] Toggle barangay status',
                                                    barangay.id,
                                                );
                                                router.patch(
                                                    `/lgu/barangays/${barangay.id}/status`,
                                                    {},
                                                    { preserveScroll: true },
                                                );
                                            }}
                                            className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                        >
                                            {barangay.is_active
                                                ? 'Deactivate'
                                                : 'Activate'}
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <Modal
                show={captainBarangay !== null}
                title="Add barangay captain"
                onClose={() => setCaptainBarangay(null)}
            >
                {captainBarangay && (
                    <form onSubmit={submitCaptain} className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Create a login account for{' '}
                            <span className="font-semibold text-slate-900">
                                {captainBarangay.name}
                            </span>
                            .
                        </p>
                        <FormField
                            label="Full name"
                            htmlFor="captain-name"
                            error={captainForm.errors.name}
                        >
                            <input
                                id="captain-name"
                                className={inputClassName}
                                value={captainForm.data.name}
                                onChange={(event) =>
                                    captainForm.setData(
                                        'name',
                                        event.target.value,
                                    )
                                }
                                required
                            />
                        </FormField>
                        <FormField
                            label="Email"
                            htmlFor="captain-email"
                            error={captainForm.errors.email}
                        >
                            <input
                                id="captain-email"
                                type="email"
                                className={inputClassName}
                                value={captainForm.data.email}
                                onChange={(event) =>
                                    captainForm.setData(
                                        'email',
                                        event.target.value,
                                    )
                                }
                                required
                            />
                        </FormField>
                        <FormField
                            label="Phone"
                            htmlFor="captain-phone"
                            error={captainForm.errors.phone}
                        >
                            <input
                                id="captain-phone"
                                className={inputClassName}
                                value={captainForm.data.phone}
                                onChange={(event) =>
                                    captainForm.setData(
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
                                htmlFor="captain-password"
                                error={captainForm.errors.password}
                            >
                                <input
                                    id="captain-password"
                                    type="password"
                                    className={inputClassName}
                                    value={captainForm.data.password}
                                    onChange={(event) =>
                                        captainForm.setData(
                                            'password',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                            </FormField>
                            <FormField
                                label="Confirm password"
                                htmlFor="captain-password-confirm"
                                error={
                                    captainForm.errors.password_confirmation
                                }
                            >
                                <input
                                    id="captain-password-confirm"
                                    type="password"
                                    className={inputClassName}
                                    value={
                                        captainForm.data.password_confirmation
                                    }
                                    onChange={(event) =>
                                        captainForm.setData(
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
                                onClick={() => setCaptainBarangay(null)}
                                className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={captainForm.processing}
                                className="min-h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-white disabled:opacity-60"
                            >
                                {captainForm.processing
                                    ? 'Creating...'
                                    : 'Create account'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            <Modal
                show={editCaptainBarangay !== null}
                title="Edit captain details"
                onClose={() => setEditCaptainBarangay(null)}
            >
                {editCaptainBarangay && (
                    <form onSubmit={submitEditCaptain} className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Update the account details of the captain of{' '}
                            <span className="font-semibold text-slate-900">
                                {editCaptainBarangay.name}
                            </span>
                            .
                        </p>
                        <FormField
                            label="Full name"
                            htmlFor="edit-captain-name"
                            error={editCaptainForm.errors.name}
                        >
                            <input
                                id="edit-captain-name"
                                className={inputClassName}
                                value={editCaptainForm.data.name}
                                onChange={(event) =>
                                    editCaptainForm.setData(
                                        'name',
                                        event.target.value,
                                    )
                                }
                                required
                            />
                        </FormField>
                        <FormField
                            label="Email"
                            htmlFor="edit-captain-email"
                            error={editCaptainForm.errors.email}
                        >
                            <input
                                id="edit-captain-email"
                                type="email"
                                className={inputClassName}
                                value={editCaptainForm.data.email}
                                onChange={(event) =>
                                    editCaptainForm.setData(
                                        'email',
                                        event.target.value,
                                    )
                                }
                                required
                            />
                        </FormField>
                        <FormField
                            label="Phone"
                            htmlFor="edit-captain-phone"
                            error={editCaptainForm.errors.phone}
                        >
                            <input
                                id="edit-captain-phone"
                                className={inputClassName}
                                value={editCaptainForm.data.phone}
                                onChange={(event) =>
                                    editCaptainForm.setData(
                                        'phone',
                                        event.target.value.replace(/\D/g, ''),
                                    )
                                }
                                maxLength={11}
                                placeholder="09XXXXXXXXX"
                            />
                        </FormField>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setEditCaptainBarangay(null)}
                                className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={editCaptainForm.processing}
                                className="min-h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-white disabled:opacity-60"
                            >
                                {editCaptainForm.processing
                                    ? 'Saving...'
                                    : 'Save changes'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            <Modal
                show={replaceCaptainBarangay !== null}
                title="Replace barangay captain"
                onClose={() => setReplaceCaptainBarangay(null)}
            >
                {replaceCaptainBarangay && (
                    <form onSubmit={submitReplaceCaptain} className="space-y-4">
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            The current captain{' '}
                            <span className="font-semibold">
                                {replaceCaptainBarangay.captain?.name}
                            </span>{' '}
                            will lose access to{' '}
                            <span className="font-semibold">
                                {replaceCaptainBarangay.name}
                            </span>{' '}
                            once replaced. This cannot be undone.
                        </div>
                        <FormField
                            label="New captain full name"
                            htmlFor="replace-captain-name"
                            error={replaceCaptainForm.errors.name}
                        >
                            <input
                                id="replace-captain-name"
                                className={inputClassName}
                                value={replaceCaptainForm.data.name}
                                onChange={(event) =>
                                    replaceCaptainForm.setData(
                                        'name',
                                        event.target.value,
                                    )
                                }
                                required
                            />
                        </FormField>
                        <FormField
                            label="Email"
                            htmlFor="replace-captain-email"
                            error={replaceCaptainForm.errors.email}
                        >
                            <input
                                id="replace-captain-email"
                                type="email"
                                className={inputClassName}
                                value={replaceCaptainForm.data.email}
                                onChange={(event) =>
                                    replaceCaptainForm.setData(
                                        'email',
                                        event.target.value,
                                    )
                                }
                                required
                            />
                        </FormField>
                        <FormField
                            label="Phone"
                            htmlFor="replace-captain-phone"
                            error={replaceCaptainForm.errors.phone}
                        >
                            <input
                                id="replace-captain-phone"
                                className={inputClassName}
                                value={replaceCaptainForm.data.phone}
                                onChange={(event) =>
                                    replaceCaptainForm.setData(
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
                                htmlFor="replace-captain-password"
                                error={replaceCaptainForm.errors.password}
                            >
                                <input
                                    id="replace-captain-password"
                                    type="password"
                                    className={inputClassName}
                                    value={replaceCaptainForm.data.password}
                                    onChange={(event) =>
                                        replaceCaptainForm.setData(
                                            'password',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                            </FormField>
                            <FormField
                                label="Confirm password"
                                htmlFor="replace-captain-password-confirm"
                                error={
                                    replaceCaptainForm.errors
                                        .password_confirmation
                                }
                            >
                                <input
                                    id="replace-captain-password-confirm"
                                    type="password"
                                    className={inputClassName}
                                    value={
                                        replaceCaptainForm.data
                                            .password_confirmation
                                    }
                                    onChange={(event) =>
                                        replaceCaptainForm.setData(
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
                                onClick={() =>
                                    setReplaceCaptainBarangay(null)
                                }
                                className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={replaceCaptainForm.processing}
                                className="min-h-11 rounded-lg bg-amber-600 px-5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                            >
                                {replaceCaptainForm.processing
                                    ? 'Replacing...'
                                    : 'Replace captain'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </LguLayout>
    );
}

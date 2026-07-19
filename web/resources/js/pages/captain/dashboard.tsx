import { Head, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import FormField, { inputClassName } from '@/components/admin/FormField';
import Modal from '@/components/admin/Modal';
import StationPointMap from '@/components/lgu/StationPointMap';
import CaptainLayout from '@/layouts/CaptainLayout';

type Outpost = {
    id: number;
    name: string;
    contact_number: string | null;
    address: string | null;
    latitude: string;
    longitude: string;
    status: string;
    approval_status: string;
    created_at: string | null;
};

type Props = {
    barangay: { id: number; name: string; code: string | null };
    lgu: { id: number; name: string; psgc_code: string | null };
    outposts: Outpost[];
    stats: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
    };
    mapUrl: string | null;
};

const emptyForm = {
    name: '',
    contact_number: '',
    address: '',
    latitude: '',
    longitude: '',
};

export default function CaptainDashboard({
    barangay,
    lgu,
    outposts,
    stats,
    mapUrl,
}: Props) {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Outpost | null>(null);
    const form = useForm(emptyForm);

    const center = useMemo<[number, number]>(() => {
        const first = outposts[0];

        if (first) {
            return [Number(first.latitude), Number(first.longitude)];
        }

        return [8.4542, 124.6319];
    }, [outposts]);

    const markers = outposts.map((outpost) => ({
        id: outpost.id,
        name: outpost.name,
        latitude: Number(outpost.latitude),
        longitude: Number(outpost.longitude),
        iconKey: 'security' as const,
        color:
            outpost.approval_status === 'approved'
                ? '#047857'
                : outpost.approval_status === 'rejected'
                  ? '#dc2626'
                  : '#d97706',
    }));

    const openCreate = () => {
        setEditing(null);
        form.setData({
            ...emptyForm,
            latitude: String(center[0]),
            longitude: String(center[1]),
            name: `${barangay.name} Tanod Outpost`,
        });
        form.clearErrors();
        setShowForm(true);
    };

    const openEdit = (outpost: Outpost) => {
        setEditing(outpost);
        form.setData({
            name: outpost.name,
            contact_number: outpost.contact_number ?? '',
            address: outpost.address ?? '',
            latitude: String(outpost.latitude),
            longitude: String(outpost.longitude),
        });
        form.clearErrors();
        setShowForm(true);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        console.log('[Responde Captain] Saving tanod outpost', form.data);

        const payload = {
            ...form.data,
            latitude: Number(form.data.latitude),
            longitude: Number(form.data.longitude),
        };

        if (editing) {
            router.put(`/captain/outposts/${editing.id}`, payload, {
                preserveScroll: true,
                onSuccess: () => setShowForm(false),
            });
        } else {
            router.post('/captain/outposts', payload, {
                preserveScroll: true,
                onSuccess: () => setShowForm(false),
            });
        }
    };

    return (
        <CaptainLayout
            title="Tanod Outposts"
            description={`${barangay.name}, ${lgu.name}`}
            fullWidth
            actions={
                <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                    Add outpost
                </button>
            }
        >
            <Head title="Captain Dashboard" />

            <div className="space-y-6">
                <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                    {[
                        ['Total', stats.total],
                        ['Pending', stats.pending],
                        ['Approved', stats.approved],
                        ['Rejected', stats.rejected],
                    ].map(([label, value]) => (
                        <div
                            key={label as string}
                            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                            <p className="text-2xl font-bold text-slate-900">
                                {value as number}
                            </p>
                            <p className="text-sm text-slate-500">
                                {label as string}
                            </p>
                        </div>
                    ))}
                </section>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.9fr)]">
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                        <h2 className="mb-3 text-base font-bold text-slate-900">
                            {barangay.name} map
                        </h2>
                        <StationPointMap
                            center={center}
                            markers={markers}
                            boundaryUrl={mapUrl}
                            selectedBarangayPsgc={barangay.code}
                            pickEnabled={false}
                        />
                        <p className="mt-3 text-xs text-slate-500">
                            New and edited outposts stay pending until the LGU
                            admin approves them.
                        </p>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h2 className="mb-4 text-base font-bold text-slate-900">
                            Your outposts
                        </h2>
                        {outposts.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                                No tanod outposts yet. Mark the first location
                                on the map.
                            </p>
                        ) : (
                            <ul className="max-h-[65vh] space-y-2 overflow-y-auto">
                                {outposts.map((outpost) => (
                                    <li
                                        key={outpost.id}
                                        className="rounded-xl border border-slate-100 px-3 py-3"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-800">
                                                    {outpost.name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {outpost.address ||
                                                        'No address'}
                                                    {outpost.created_at
                                                        ? ` · ${outpost.created_at}`
                                                        : ''}
                                                </p>
                                            </div>
                                            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                                {outpost.approval_status}
                                            </span>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openEdit(outpost)
                                                }
                                                className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (
                                                        !window.confirm(
                                                            `Remove ${outpost.name}?`,
                                                        )
                                                    ) {
                                                        return;
                                                    }

                                                    router.delete(
                                                        `/captain/outposts/${outpost.id}`,
                                                        {
                                                            preserveScroll: true,
                                                        },
                                                    );
                                                }}
                                                className="min-h-10 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>

            <Modal
                show={showForm}
                title={editing ? 'Edit tanod outpost' : 'Add tanod outpost'}
                onClose={() => setShowForm(false)}
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
                        selectedBarangayPsgc={barangay.code}
                        className="h-64 w-full"
                    />
                    <FormField
                        label="Outpost name"
                        htmlFor="outpost-name"
                        error={form.errors.name}
                    >
                        <input
                            id="outpost-name"
                            className={inputClassName}
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData('name', event.target.value)
                            }
                            required
                        />
                    </FormField>
                    <FormField label="Contact number" htmlFor="outpost-contact">
                        <input
                            id="outpost-contact"
                            className={inputClassName}
                            value={form.data.contact_number}
                            onChange={(event) =>
                                form.setData(
                                    'contact_number',
                                    event.target.value,
                                )
                            }
                        />
                    </FormField>
                    <FormField label="Address" htmlFor="outpost-address">
                        <input
                            id="outpost-address"
                            className={inputClassName}
                            value={form.data.address}
                            onChange={(event) =>
                                form.setData('address', event.target.value)
                            }
                        />
                    </FormField>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="min-h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-white"
                        >
                            {editing
                                ? 'Save and resubmit'
                                : 'Submit for approval'}
                        </button>
                    </div>
                </form>
            </Modal>
        </CaptainLayout>
    );
}

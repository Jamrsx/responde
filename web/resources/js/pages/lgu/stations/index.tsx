import { Head, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import FormField, { inputClassName } from '@/components/admin/FormField';
import Modal from '@/components/admin/Modal';
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
    barangay_id: number | null;
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
    barangay_id: '',
    name: '',
    contact_number: '',
    address: '',
    latitude: '',
    longitude: '',
    status: 'active',
};

export default function LguStationsIndex({
    lgu,
    stations,
    stationTypes,
    barangays,
    mapUrl,
}: Props) {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Station | null>(null);
    const form = useForm(emptyForm);

    const center = useMemo<[number, number]>(() => {
        if (lgu.latitude && lgu.longitude) {
            return [Number(lgu.latitude), Number(lgu.longitude)];
        }

        return [12.8797, 121.774];
    }, [lgu.latitude, lgu.longitude]);

    const markers = stations.map((station) => ({
        id: station.id,
        name: station.name,
        latitude: Number(station.latitude),
        longitude: Number(station.longitude),
        color:
            station.approval_status === 'pending'
                ? '#d97706'
                : station.approval_status === 'rejected'
                  ? '#dc2626'
                  : '#047857',
    }));

    const openCreate = () => {
        setEditing(null);
        form.setData({
            ...emptyForm,
            station_type_id: String(stationTypes[0]?.id ?? ''),
            latitude: String(center[0]),
            longitude: String(center[1]),
        });
        form.clearErrors();
        setShowForm(true);
    };

    const openEdit = (station: Station) => {
        setEditing(station);
        form.setData({
            station_type_id: String(station.station_type_id),
            barangay_id: station.barangay_id
                ? String(station.barangay_id)
                : '',
            name: station.name,
            contact_number: station.contact_number ?? '',
            address: station.address ?? '',
            latitude: String(station.latitude),
            longitude: String(station.longitude),
            status: station.status,
        });
        form.clearErrors();
        setShowForm(true);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        console.log('[Responde LGU] Saving station', form.data);

        const payload = {
            ...form.data,
            station_type_id: Number(form.data.station_type_id),
            barangay_id: form.data.barangay_id
                ? Number(form.data.barangay_id)
                : null,
            latitude: Number(form.data.latitude),
            longitude: Number(form.data.longitude),
        };

        if (editing) {
            router.put(`/lgu/stations/${editing.id}`, payload, {
                preserveScroll: true,
                onSuccess: () => setShowForm(false),
            });
        } else {
            router.post('/lgu/stations', payload, {
                preserveScroll: true,
                onSuccess: () => setShowForm(false),
            });
        }
    };

    const selectedBarangayPsgc = barangays.find(
        (barangay) => String(barangay.id) === String(form.data.barangay_id),
    )?.code;

    return (
        <LguLayout
            title="Stations"
            description={`Map response stations in ${lgu.name}`}
            fullWidth
            actions={
                <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                    Add station
                </button>
            }
        >
            <Head title="LGU Stations" />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.9fr)]">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                    <h2 className="mb-3 text-base font-bold text-slate-900">
                        Station map
                    </h2>
                    <StationPointMap
                        center={center}
                        markers={markers}
                        boundaryUrl={mapUrl}
                        pickEnabled={false}
                    />
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h2 className="mb-4 text-base font-bold text-slate-900">
                        Stations ({stations.length})
                    </h2>
                    {stations.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                            No stations yet. Add police, health, DRRMO, BFP, or
                            other facilities.
                        </p>
                    ) : (
                        <ul className="max-h-[70vh] space-y-2 overflow-y-auto">
                            {stations.map((station) => (
                                <li
                                    key={station.id}
                                    className="rounded-xl border border-slate-100 px-3 py-3"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-800">
                                                {station.name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {[station.type, station.barangay]
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
                                        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                            {station.approval_status}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
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
                                                                preserveScroll:
                                                                    true,
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
                                                                preserveScroll:
                                                                    true,
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
                show={showForm}
                title={editing ? 'Edit station' : 'Add station'}
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
                        selectedBarangayPsgc={selectedBarangayPsgc}
                        className="h-64 w-full"
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField label="Station type" htmlFor="station-type">
                            <select
                                id="station-type"
                                className={inputClassName}
                                value={form.data.station_type_id}
                                onChange={(event) =>
                                    form.setData(
                                        'station_type_id',
                                        event.target.value,
                                    )
                                }
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
                        >
                            <input
                                id="station-contact"
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
                            onClick={() => setShowForm(false)}
                            className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="min-h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-white"
                        >
                            Save station
                        </button>
                    </div>
                </form>
            </Modal>
        </LguLayout>
    );
}

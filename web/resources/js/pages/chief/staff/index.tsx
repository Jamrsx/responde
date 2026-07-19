import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import FormField, { inputClassName } from '@/components/admin/FormField';
import Modal from '@/components/admin/Modal';
import ChiefLayout from '@/layouts/ChiefLayout';

type StaffMember = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    position_title: string | null;
    created_at: string | null;
};

type Props = {
    station: {
        id: number;
        name: string;
        type: string | null;
    };
    lgu: {
        id: number;
        name: string;
    };
    staff: StaffMember[];
    positionSuggestions: string[];
};

type FlashProps = {
    flash?: {
        success?: string | null;
        error?: string | null;
    };
};

const emptyForm = {
    name: '',
    email: '',
    phone: '',
    position_title: '',
    set_password: false,
    password: '',
};

export default function ChiefStaffIndex({
    station,
    lgu,
    staff,
    positionSuggestions,
}: Props) {
    const { flash } = usePage<FlashProps>().props;
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const form = useForm(emptyForm);

    const filteredStaff = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return staff;
        }

        return staff.filter((member) =>
            [
                member.name,
                member.email,
                member.phone ?? '',
                member.position_title ?? '',
            ]
                .join(' ')
                .toLowerCase()
                .includes(query),
        );
    }, [search, staff]);

    const openCreate = () => {
        form.reset();
        form.clearErrors();
        setShowPassword(false);
        setShowModal(true);
        console.log('[Responde Chief] Opening create staff modal');
    };

    const closeModal = () => setShowModal(false);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        console.log('[Responde Chief] Creating staff account', {
            name: form.data.name,
            email: form.data.email,
            position_title: form.data.position_title,
            set_password: form.data.set_password,
        });

        form.post('/chief/staff', {
            preserveScroll: true,
            onSuccess: () => {
                closeModal();
                form.reset();
            },
        });
    };

    const deactivate = (member: StaffMember) => {
        if (
            !window.confirm(
                `Deactivate ${member.name}? They will no longer be able to sign in.`,
            )
        ) {
            return;
        }

        console.log('[Responde Chief] Deactivating staff', member.id);
        router.delete(`/chief/staff/${member.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <ChiefLayout
            title="Staff Accounts"
            description={`Response staff for ${station.name} · ${lgu.name}`}
            fullWidth
            actions={
                <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                    Add staff
                </button>
            }
        >
            <Head title="Staff Accounts" />

            {(flash?.success || flash?.error) && (
                <div
                    className={`mb-4 rounded-xl px-4 py-3 text-sm ${
                        flash.success
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border border-red-200 bg-red-50 text-red-700'
                    }`}
                    role="status"
                >
                    {flash.success || flash.error}
                </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-4">
                    <label htmlFor="staff-search" className="sr-only">
                        Search staff
                    </label>
                    <input
                        id="staff-search"
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by name, email, phone, or position..."
                        className={`${inputClassName} max-w-md`}
                    />
                </div>

                {filteredStaff.length === 0 ? (
                    <div className="p-10 text-center">
                        <p className="text-sm font-medium text-slate-600">
                            {staff.length === 0
                                ? 'No staff accounts yet.'
                                : 'No staff match your search.'}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                            {staff.length === 0
                                ? 'Add rescuers, dispatchers, medics, and other response staff for this station.'
                                : 'Try a different search term.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-xs tracking-wide text-slate-400 uppercase">
                                    <th className="px-4 py-3 font-medium">
                                        Name
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Position
                                    </th>
                                    <th className="hidden px-4 py-3 font-medium md:table-cell">
                                        Phone
                                    </th>
                                    <th className="hidden px-4 py-3 font-medium sm:table-cell">
                                        Added
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredStaff.map((member) => (
                                    <tr
                                        key={member.id}
                                        className="transition hover:bg-slate-50"
                                    >
                                        <td className="px-4 py-3.5">
                                            <p className="font-semibold text-slate-800">
                                                {member.name}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {member.email}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="inline-flex rounded-full bg-brand-light px-2.5 py-0.5 text-xs font-medium text-brand-dark">
                                                {member.position_title ||
                                                    'Staff'}
                                            </span>
                                        </td>
                                        <td className="hidden px-4 py-3.5 text-slate-600 md:table-cell">
                                            {member.phone || '—'}
                                        </td>
                                        <td className="hidden px-4 py-3.5 text-slate-500 sm:table-cell">
                                            {member.created_at ?? '—'}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    deactivate(member)
                                                }
                                                className="min-h-10 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50"
                                            >
                                                Deactivate
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal
                show={showModal}
                title="Add station staff"
                onClose={closeModal}
            >
                <form onSubmit={submit} className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Create a login account for staff at{' '}
                        <span className="font-semibold text-slate-900">
                            {station.name}
                        </span>
                        . Credentials will be emailed to the staff member.
                    </p>

                    <FormField
                        label="Full name"
                        htmlFor="staff-name"
                        error={form.errors.name}
                    >
                        <input
                            id="staff-name"
                            className={inputClassName}
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData('name', event.target.value)
                            }
                            required
                            autoComplete="name"
                        />
                    </FormField>

                    <FormField
                        label="Email"
                        htmlFor="staff-email"
                        error={form.errors.email}
                    >
                        <input
                            id="staff-email"
                            type="email"
                            className={inputClassName}
                            value={form.data.email}
                            onChange={(event) =>
                                form.setData('email', event.target.value)
                            }
                            required
                            autoComplete="email"
                        />
                    </FormField>

                    <FormField
                        label="Position"
                        htmlFor="staff-position"
                        error={form.errors.position_title}
                    >
                        <input
                            id="staff-position"
                            list="staff-position-suggestions"
                            className={inputClassName}
                            value={form.data.position_title}
                            onChange={(event) =>
                                form.setData(
                                    'position_title',
                                    event.target.value,
                                )
                            }
                            placeholder="e.g. Rescuer, Dispatcher, Medic"
                            required
                        />
                        <datalist id="staff-position-suggestions">
                            {positionSuggestions.map((position) => (
                                <option key={position} value={position} />
                            ))}
                        </datalist>
                    </FormField>

                    <FormField
                        label="Phone number (optional)"
                        htmlFor="staff-phone"
                        error={form.errors.phone}
                    >
                        <input
                            id="staff-phone"
                            className={inputClassName}
                            value={form.data.phone}
                            onChange={(event) =>
                                form.setData(
                                    'phone',
                                    event.target.value
                                        .replace(/\D/g, '')
                                        .slice(0, 11),
                                )
                            }
                            inputMode="numeric"
                            maxLength={11}
                            placeholder="09XXXXXXXXX"
                        />
                    </FormField>

                    <label
                        htmlFor="staff-set-password"
                        className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
                    >
                        <span>
                            <span className="block text-sm font-semibold text-slate-900">
                                Set password manually
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500">
                                If unchecked, the system generates an
                                8-character password and emails it.
                            </span>
                        </span>
                        <input
                            id="staff-set-password"
                            type="checkbox"
                            checked={form.data.set_password}
                            onChange={(event) => {
                                form.setData((data) => ({
                                    ...data,
                                    set_password: event.target.checked,
                                    password: event.target.checked
                                        ? data.password
                                        : '',
                                }));
                                form.clearErrors('password');
                                console.log(
                                    '[Responde Chief] Set staff password manually',
                                    event.target.checked,
                                );
                            }}
                            className="mt-0.5 h-5 w-5 rounded border-slate-300 text-brand focus:ring-brand"
                        />
                    </label>

                    {form.data.set_password ? (
                        <FormField
                            label="Password to email"
                            htmlFor="staff-password"
                            error={form.errors.password}
                        >
                            <div className="flex gap-2">
                                <input
                                    id="staff-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className={inputClassName}
                                    value={form.data.password}
                                    onChange={(event) =>
                                        form.setData(
                                            'password',
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
                                        setShowPassword((value) => !value)
                                    }
                                    className="min-h-11 shrink-0 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </FormField>
                    ) : (
                        <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs leading-5 text-blue-700">
                            The system will generate an 8-character temporary
                            password and email it to the staff member.
                        </p>
                    )}

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="min-h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                        >
                            {form.processing
                                ? 'Creating and emailing...'
                                : 'Create and email account'}
                        </button>
                    </div>
                </form>
            </Modal>
        </ChiefLayout>
    );
}

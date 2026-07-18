import { Head, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';

import FormField, { inputClassName } from '@/components/admin/FormField';
import Modal from '@/components/admin/Modal';
import AdminLayout from '@/layouts/AdminLayout';

type Admin = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    lgu_name: string | null;
    created_at: string | null;
};

type LguOption = {
    id: number;
    name: string;
};

type LguAdminsProps = {
    admins: Admin[];
    lgus: LguOption[];
};

type AdminFormData = {
    name: string;
    email: string;
    phone: string;
    lgu_id: string;
    password: string;
    password_confirmation: string;
};

const emptyForm: AdminFormData = {
    name: '',
    email: '',
    phone: '',
    lgu_id: '',
    password: '',
    password_confirmation: '',
};

export default function LguAdminsIndex({ admins, lgus }: LguAdminsProps) {
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');

    const form = useForm<AdminFormData>(emptyForm);

    const filteredAdmins = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return admins;
        }

        return admins.filter((admin) =>
            [admin.name, admin.email, admin.lgu_name]
                .filter(Boolean)
                .some((value) => value!.toLowerCase().includes(query)),
        );
    }, [admins, search]);

    const openCreate = () => {
        form.reset();
        form.clearErrors();
        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    const handlePhoneChange = (value: string) => {
        const digitsOnly = value.replace(/\D/g, '').slice(0, 11);
        form.setData('phone', digitsOnly);

        if (digitsOnly === '' || /^09\d{9}$/.test(digitsOnly)) {
            form.clearErrors('phone');
        }
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        const phone = form.data.phone.trim();

        if (phone !== '' && !/^09\d{9}$/.test(phone)) {
            form.setError(
                'phone',
                'Phone must be 11 digits and start with 09.',
            );

            console.log('[Responde Admin] Phone validation failed', { phone });

            return;
        }

        console.log('[Responde Admin] Creating LGU admin account', {
            name: form.data.name,
            email: form.data.email,
            phone: phone || null,
            lgu_id: form.data.lgu_id,
        });

        form.post('/managed-accounts', {
            preserveScroll: true,
            onSuccess: closeModal,
        });
    };

    return (
        <AdminLayout
            title="LGU Admins"
            description="Administrator accounts for each local government unit"
            actions={
                <button
                    type="button"
                    onClick={openCreate}
                    className="flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-5 w-5"
                        aria-hidden="true"
                    >
                        <path
                            d="M12 5v14m-7-7h14"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    </svg>
                    Add LGU Admin
                </button>
            }
        >
            <Head title="LGU Admins" />

            <div className="rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 p-4">
                    <label htmlFor="admin-search" className="sr-only">
                        Search LGU admins
                    </label>
                    <input
                        id="admin-search"
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by name, email, or LGU..."
                        className={`${inputClassName} max-w-sm`}
                    />
                </div>

                {filteredAdmins.length === 0 ? (
                    <div className="p-10 text-center">
                        <p className="text-sm font-medium text-slate-600">
                            {admins.length === 0
                                ? 'No LGU admin accounts yet.'
                                : 'No accounts match your search.'}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                            {admins.length === 0
                                ? lgus.length === 0
                                    ? 'Add an LGU first, then create its administrator account.'
                                    : 'Create the first LGU administrator account.'
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
                                    <th className="hidden px-4 py-3 font-medium md:table-cell">
                                        Phone
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        LGU
                                    </th>
                                    <th className="hidden px-4 py-3 font-medium sm:table-cell">
                                        Added
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredAdmins.map((admin) => (
                                    <tr
                                        key={admin.id}
                                        className="transition hover:bg-slate-50"
                                    >
                                        <td className="px-4 py-3.5">
                                            <p className="font-semibold text-slate-800">
                                                {admin.name}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {admin.email}
                                            </p>
                                        </td>
                                        <td className="hidden px-4 py-3.5 text-slate-600 md:table-cell">
                                            {admin.phone || '—'}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="inline-flex rounded-full bg-brand-light px-2.5 py-0.5 text-xs font-medium text-brand-dark">
                                                {admin.lgu_name ?? 'Unassigned'}
                                            </span>
                                        </td>
                                        <td className="hidden px-4 py-3.5 text-slate-500 sm:table-cell">
                                            {admin.created_at ?? '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal show={showModal} title="Add LGU Admin" onClose={closeModal}>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <FormField
                        label="Full name"
                        htmlFor="admin-name"
                        error={form.errors.name}
                    >
                        <input
                            id="admin-name"
                            type="text"
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData('name', event.target.value)
                            }
                            required
                            placeholder="e.g. Juan Dela Cruz"
                            className={inputClassName}
                        />
                    </FormField>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                            label="Email address"
                            htmlFor="admin-email"
                            error={form.errors.email}
                        >
                            <input
                                id="admin-email"
                                type="email"
                                value={form.data.email}
                                onChange={(event) =>
                                    form.setData('email', event.target.value)
                                }
                                required
                                placeholder="name@example.com"
                                className={inputClassName}
                            />
                        </FormField>

                        <FormField
                            label="Phone (optional)"
                            htmlFor="admin-phone"
                            error={form.errors.phone}
                        >
                            <input
                                id="admin-phone"
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel"
                                maxLength={11}
                                pattern="09[0-9]{9}"
                                title="Must be 11 digits starting with 09"
                                value={form.data.phone}
                                onChange={(event) =>
                                    handlePhoneChange(event.target.value)
                                }
                                placeholder="e.g. 09171234567"
                                className={inputClassName}
                            />
                            <p className="mt-1.5 text-xs text-slate-400">
                                11 digits starting with 09
                            </p>
                        </FormField>
                    </div>

                    <FormField
                        label="Assigned LGU"
                        htmlFor="admin-lgu"
                        error={form.errors.lgu_id}
                    >
                        <select
                            id="admin-lgu"
                            value={form.data.lgu_id}
                            onChange={(event) =>
                                form.setData('lgu_id', event.target.value)
                            }
                            required
                            className={inputClassName}
                        >
                            <option value="" disabled>
                                Select an LGU...
                            </option>
                            {lgus.map((lgu) => (
                                <option key={lgu.id} value={lgu.id}>
                                    {lgu.name}
                                </option>
                            ))}
                        </select>
                    </FormField>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                            label="Password"
                            htmlFor="admin-password"
                            error={form.errors.password}
                        >
                            <input
                                id="admin-password"
                                type="password"
                                value={form.data.password}
                                onChange={(event) =>
                                    form.setData('password', event.target.value)
                                }
                                required
                                autoComplete="new-password"
                                placeholder="At least 8 characters"
                                className={inputClassName}
                            />
                        </FormField>

                        <FormField
                            label="Confirm password"
                            htmlFor="admin-password-confirm"
                            error={form.errors.password_confirmation}
                        >
                            <input
                                id="admin-password-confirm"
                                type="password"
                                value={form.data.password_confirmation}
                                onChange={(event) =>
                                    form.setData(
                                        'password_confirmation',
                                        event.target.value,
                                    )
                                }
                                required
                                autoComplete="new-password"
                                placeholder="Repeat the password"
                                className={inputClassName}
                            />
                        </FormField>
                    </div>

                    {lgus.length === 0 && (
                        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            No active LGUs available. Add an LGU first before
                            creating its administrator.
                        </p>
                    )}

                    <div className="mt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing || lgus.length === 0}
                            className="min-h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {form.processing ? 'Creating...' : 'Create account'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}

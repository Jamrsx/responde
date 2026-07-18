import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import FormField, { inputClassName } from '@/components/admin/FormField';
import AdminLayout from '@/layouts/AdminLayout';

type Profile = {
    name: string;
    email: string;
    phone: string | null;
    profile_photo_url: string | null;
    role: string;
    lgu_name: string | null;
    station_name: string | null;
};

type ProfileForm = {
    name: string;
    email: string;
    phone: string;
    profile_photo: File | null;
};

type PasswordForm = {
    current_password: string;
    password: string;
    password_confirmation: string;
};

const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    lgu_admin: 'LGU Admin',
    chief: 'Station Chief',
    staff: 'Response Staff',
    civilian: 'Civilian',
};

function UserAvatar({
    name,
    source,
}: {
    name: string;
    source: string | null;
}) {
    const initials = useMemo(
        () =>
            name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join('') || 'U',
        [name],
    );

    if (source) {
        return (
            <img
                src={source}
                alt={`${name}'s profile`}
                className="h-24 w-24 rounded-2xl object-cover ring-4 ring-white shadow-sm"
            />
        );
    }

    return (
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-bold text-white ring-4 ring-white shadow-sm">
            {initials}
        </div>
    );
}

export default function EditProfile({ profile }: { profile: Profile }) {
    const profileForm = useForm<ProfileForm>({
        name: profile.name,
        email: profile.email,
        phone: profile.phone ?? '',
        profile_photo: null,
    });
    const passwordForm = useForm<PasswordForm>({
        current_password: '',
        password: '',
        password_confirmation: '',
    });
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            if (photoPreview) {
                URL.revokeObjectURL(photoPreview);
            }
        };
    }, [photoPreview]);

    const displayedPhoto = photoPreview ?? profile.profile_photo_url;

    const selectPhoto = (file: File | null) => {
        if (photoPreview) {
            URL.revokeObjectURL(photoPreview);
        }

        profileForm.setData('profile_photo', file);
        setPhotoPreview(file ? URL.createObjectURL(file) : null);
        console.log('[Responde Profile] Profile photo selected', {
            name: file?.name,
            size: file?.size,
            type: file?.type,
        });
    };

    const submitProfile = (event: FormEvent) => {
        event.preventDefault();
        console.log('[Responde Profile] Updating personal information');

        profileForm.transform((data) => ({
            ...data,
            _method: 'put',
        }));

        profileForm.post('/profile', {
            forceFormData: true,
            errorBag: 'profile',
            preserveScroll: true,
            onSuccess: () => {
                profileForm.setData('profile_photo', null);
                setPhotoPreview(null);
            },
        });
    };

    const submitPassword = (event: FormEvent) => {
        event.preventDefault();
        console.log('[Responde Profile] Updating password');

        passwordForm.put('/profile/password', {
            errorBag: 'password',
            preserveScroll: true,
            onSuccess: () => passwordForm.reset(),
            onError: () => passwordForm.reset('password', 'password_confirmation'),
        });
    };

    const removePhoto = () => {
        console.log('[Responde Profile] Removing profile photo');
        router.delete('/profile/photo', {
            preserveScroll: true,
            onSuccess: () => {
                profileForm.setData('profile_photo', null);
                setPhotoPreview(null);
            },
        });
    };

    return (
        <AdminLayout
            title="My Profile"
            description="Manage your personal information and account security"
        >
            <Head title="My Profile" />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
                <div className="space-y-6">
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="h-28 bg-gradient-to-r from-blue-600 to-indigo-600" />
                        <div className="px-5 pb-6 sm:px-7">
                            <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
                                <UserAvatar
                                    name={profileForm.data.name}
                                    source={displayedPhoto}
                                />
                                <div className="min-w-0 pb-1">
                                    <h2 className="truncate text-xl font-bold text-slate-900">
                                        {profileForm.data.name}
                                    </h2>
                                    <p className="text-sm text-slate-500">
                                        {roleLabels[profile.role] ?? profile.role}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                        <div className="mb-6">
                            <h2 className="text-lg font-bold text-slate-900">
                                Personal information
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Keep your contact details accurate and up to date.
                            </p>
                        </div>

                        <form onSubmit={submitProfile} className="space-y-5">
                            <div className="flex flex-col gap-4 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center">
                                <UserAvatar
                                    name={profileForm.data.name}
                                    source={displayedPhoto}
                                />
                                <div className="min-w-0 flex-1">
                                    <label
                                        htmlFor="profile-photo"
                                        className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand"
                                    >
                                        Choose photo
                                        <input
                                            id="profile-photo"
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            className="sr-only"
                                            onChange={(event) =>
                                                selectPhoto(
                                                    event.target.files?.[0] ??
                                                        null,
                                                )
                                            }
                                        />
                                    </label>
                                    {(profile.profile_photo_url ||
                                        photoPreview) && (
                                        <button
                                            type="button"
                                            onClick={
                                                photoPreview
                                                    ? () => selectPhoto(null)
                                                    : removePhoto
                                            }
                                            className="ml-2 min-h-11 rounded-lg px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                                        >
                                            Remove
                                        </button>
                                    )}
                                    <p className="mt-2 text-xs text-slate-500">
                                        JPG, PNG, or WebP. Maximum 2 MB.
                                    </p>
                                    {profileForm.errors.profile_photo && (
                                        <p
                                            role="alert"
                                            className="mt-1 text-sm text-red-600"
                                        >
                                            {profileForm.errors.profile_photo}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <FormField
                                    label="Full name"
                                    htmlFor="profile-name"
                                    error={profileForm.errors.name}
                                >
                                    <input
                                        id="profile-name"
                                        type="text"
                                        value={profileForm.data.name}
                                        onChange={(event) =>
                                            profileForm.setData(
                                                'name',
                                                event.target.value,
                                            )
                                        }
                                        required
                                        autoComplete="name"
                                        className={inputClassName}
                                    />
                                </FormField>

                                <FormField
                                    label="Email address"
                                    htmlFor="profile-email"
                                    error={profileForm.errors.email}
                                >
                                    <input
                                        id="profile-email"
                                        type="email"
                                        value={profileForm.data.email}
                                        onChange={(event) =>
                                            profileForm.setData(
                                                'email',
                                                event.target.value,
                                            )
                                        }
                                        required
                                        autoComplete="email"
                                        className={inputClassName}
                                    />
                                </FormField>

                                <FormField
                                    label="Phone number"
                                    htmlFor="profile-phone"
                                    error={profileForm.errors.phone}
                                >
                                    <input
                                        id="profile-phone"
                                        type="tel"
                                        inputMode="numeric"
                                        value={profileForm.data.phone}
                                        onChange={(event) =>
                                            profileForm.setData(
                                                'phone',
                                                event.target.value.replace(
                                                    /\D/g,
                                                    '',
                                                ),
                                            )
                                        }
                                        maxLength={11}
                                        autoComplete="tel"
                                        placeholder="09XXXXXXXXX"
                                        className={inputClassName}
                                    />
                                </FormField>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={profileForm.processing}
                                    className="flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {profileForm.processing
                                        ? 'Saving...'
                                        : 'Save profile'}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>

                <div className="space-y-6">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <h2 className="text-lg font-bold text-slate-900">
                            Account assignment
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            These values are controlled by the system.
                        </p>
                        <dl className="mt-5 space-y-4">
                            <div>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Role
                                </dt>
                                <dd className="mt-1 text-sm font-semibold text-slate-800">
                                    {roleLabels[profile.role] ?? profile.role}
                                </dd>
                            </div>
                            {profile.lgu_name && (
                                <div>
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Assigned LGU
                                    </dt>
                                    <dd className="mt-1 text-sm font-semibold text-slate-800">
                                        {profile.lgu_name}
                                    </dd>
                                </div>
                            )}
                            {profile.station_name && (
                                <div>
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Assigned station
                                    </dt>
                                    <dd className="mt-1 text-sm font-semibold text-slate-800">
                                        {profile.station_name}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-5">
                            <h2 className="text-lg font-bold text-slate-900">
                                Change password
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Confirm your current password before choosing a
                                new one.
                            </p>
                        </div>

                        <form onSubmit={submitPassword} className="space-y-4">
                            <FormField
                                label="Current password"
                                htmlFor="current-password"
                                error={passwordForm.errors.current_password}
                            >
                                <input
                                    id="current-password"
                                    type="password"
                                    value={passwordForm.data.current_password}
                                    onChange={(event) =>
                                        passwordForm.setData(
                                            'current_password',
                                            event.target.value,
                                        )
                                    }
                                    required
                                    autoComplete="current-password"
                                    className={inputClassName}
                                />
                            </FormField>

                            <FormField
                                label="New password"
                                htmlFor="new-password"
                                error={passwordForm.errors.password}
                            >
                                <input
                                    id="new-password"
                                    type="password"
                                    value={passwordForm.data.password}
                                    onChange={(event) =>
                                        passwordForm.setData(
                                            'password',
                                            event.target.value,
                                        )
                                    }
                                    required
                                    autoComplete="new-password"
                                    className={inputClassName}
                                />
                            </FormField>

                            <FormField
                                label="Confirm new password"
                                htmlFor="password-confirmation"
                                error={
                                    passwordForm.errors.password_confirmation
                                }
                            >
                                <input
                                    id="password-confirmation"
                                    type="password"
                                    value={
                                        passwordForm.data.password_confirmation
                                    }
                                    onChange={(event) =>
                                        passwordForm.setData(
                                            'password_confirmation',
                                            event.target.value,
                                        )
                                    }
                                    required
                                    autoComplete="new-password"
                                    className={inputClassName}
                                />
                            </FormField>

                            <button
                                type="submit"
                                disabled={passwordForm.processing}
                                className="flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {passwordForm.processing
                                    ? 'Updating...'
                                    : 'Update password'}
                            </button>
                        </form>
                    </section>
                </div>
            </div>
        </AdminLayout>
    );
}

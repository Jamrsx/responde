import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

import AdminLayout from '@/layouts/AdminLayout';

type DashboardStats = {
    totalLgus: number;
    activeLgus: number;
    lguAdmins: number;
    stations: number;
};

type RecentLgu = {
    id: number;
    name: string;
    province: string | null;
    municipality: string | null;
    is_active: boolean;
    created_at: string | null;
};

type RecentAdmin = {
    id: number;
    name: string;
    email: string;
    lgu_name: string | null;
    created_at: string | null;
};

type DashboardProps = {
    stats: DashboardStats;
    recentLgus: RecentLgu[];
    recentAdmins: RecentAdmin[];
};

type AuthUser = {
    name: string;
};

function StatCard({
    label,
    value,
    hint,
    href,
    accentClass,
    iconBgClass,
    icon,
}: {
    label: string;
    value: number;
    hint: string;
    href: string;
    accentClass: string;
    iconBgClass: string;
    icon: ReactNode;
}) {
    return (
        <Link
            href={href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
            <div className="flex items-start justify-between gap-3">
                <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBgClass} ${accentClass}`}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-6 w-6"
                        aria-hidden="true"
                    >
                        {icon}
                    </svg>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 opacity-0 transition group-hover:opacity-100">
                    Open
                </span>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                {value}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{label}</p>
            <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </Link>
    );
}

function EmptyState({
    title,
    description,
    actionLabel,
    actionHref,
}: {
    title: string;
    description: string;
    actionLabel: string;
    actionHref: string;
}) {
    return (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
            <p className="text-sm font-semibold text-slate-800">{title}</p>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
            <Link
                href={actionHref}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
                {actionLabel}
            </Link>
        </div>
    );
}

function SectionHeader({
    title,
    countLabel,
    viewAllHref,
}: {
    title: string;
    countLabel: string;
    viewAllHref: string;
}) {
    return (
        <div className="mb-4 flex items-center justify-between gap-3">
            <div>
                <h2 className="text-base font-bold tracking-tight text-slate-900">
                    {title}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">{countLabel}</p>
            </div>
            <Link
                href={viewAllHref}
                className="shrink-0 text-sm font-semibold text-brand-dark transition hover:text-brand"
            >
                View all
            </Link>
        </div>
    );
}

export default function Dashboard({
    stats,
    recentLgus,
    recentAdmins,
}: DashboardProps) {
    const { auth } = usePage<{ auth: { user: AuthUser | null } }>().props;
    const inactiveLgus = Math.max(stats.totalLgus - stats.activeLgus, 0);
    const firstName = auth.user?.name?.split(/\s+/)[0] ?? 'Admin';

    useEffect(() => {
        console.log('[Responde Admin] Dashboard loaded', { stats });
    }, [stats]);

    return (
        <AdminLayout
            title="Dashboard"
            description="Overview of LGUs and administrator accounts"
            actions={
                <div className="flex items-center gap-2">
                    <Link
                        href="/admin/lgu-admins"
                        className="hidden min-h-11 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
                    >
                        Add LGU Admin
                    </Link>
                    <Link
                        href="/admin/lgus/create"
                        className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark"
                    >
                        Add LGU
                    </Link>
                </div>
            }
        >
            <Head title="Admin Dashboard" />

            <div className="space-y-6">
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="bg-gradient-to-r from-brand to-brand-dark px-5 py-6 sm:px-7 sm:py-7">
                        <p className="text-sm font-medium text-white/80">
                            Welcome back
                        </p>
                        <h2 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                            {firstName}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85">
                            Manage Local Government Units, assign administrators,
                            and keep emergency response coverage ready.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 border-t border-slate-100 bg-slate-50/80 p-4 sm:grid-cols-3 sm:p-5">
                        <Link
                            href="/admin/lgus/create"
                            className="flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-brand/40 hover:bg-brand-light"
                        >
                            Register an LGU
                        </Link>
                        <Link
                            href="/admin/lgu-admins"
                            className="flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-brand/40 hover:bg-brand-light"
                        >
                            Manage LGU Admins
                        </Link>
                        <Link
                            href="/admin/lgus"
                            className="flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-brand/40 hover:bg-brand-light"
                        >
                            Browse all LGUs
                        </Link>
                    </div>
                </section>

                <section
                    aria-label="System statistics"
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
                >
                    <StatCard
                        label="Total LGUs"
                        value={stats.totalLgus}
                        hint={
                            inactiveLgus > 0
                                ? `${inactiveLgus} inactive`
                                : 'All registered units'
                        }
                        href="/admin/lgus"
                        accentClass="text-brand-dark"
                        iconBgClass="bg-brand-light"
                        icon={
                            <path
                                d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        }
                    />
                    <StatCard
                        label="Active LGUs"
                        value={stats.activeLgus}
                        hint="Ready for operations"
                        href="/admin/lgus"
                        accentClass="text-emerald-700"
                        iconBgClass="bg-emerald-50"
                        icon={
                            <path
                                d="m5 13 4 4L19 7"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        }
                    />
                    <StatCard
                        label="LGU Admins"
                        value={stats.lguAdmins}
                        hint="Assigned administrators"
                        href="/admin/lgu-admins"
                        accentClass="text-brand-dark"
                        iconBgClass="bg-brand-light"
                        icon={
                            <path
                                d="M16 19a4 4 0 0 0-8 0m9-9.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        }
                    />
                    <StatCard
                        label="Response Stations"
                        value={stats.stations}
                        hint={
                            stats.stations === 0
                                ? 'Not set up yet'
                                : 'Across all LGUs'
                        }
                        href="/admin/lgus"
                        accentClass="text-emerald-800"
                        iconBgClass="bg-emerald-50"
                        icon={
                            <path
                                d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinejoin="round"
                            />
                        }
                    />
                </section>

                {stats.stations === 0 && (
                    <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-amber-900">
                                No response stations yet
                            </p>
                            <p className="mt-1 text-sm text-amber-800/80">
                                Stations will appear here after LGU admins set
                                them up under their LGUs.
                            </p>
                        </div>
                        <Link
                            href="/admin/lgus"
                            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
                        >
                            Review LGUs
                        </Link>
                    </section>
                )}

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <section
                        aria-label="Recently added LGUs"
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                    >
                        <SectionHeader
                            title="Recent LGUs"
                            countLabel={`${stats.totalLgus} registered`}
                            viewAllHref="/admin/lgus"
                        />

                        {recentLgus.length === 0 ? (
                            <EmptyState
                                title="No LGUs yet"
                                description="Register the first Local Government Unit to start managing coverage."
                                actionLabel="Add LGU"
                                actionHref="/admin/lgus/create"
                            />
                        ) : (
                            <ul className="space-y-2">
                                {recentLgus.map((lgu) => (
                                    <li key={lgu.id}>
                                        <Link
                                            href={`/admin/lgus/${lgu.id}/edit`}
                                            className="flex items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-3 transition hover:border-slate-200 hover:bg-slate-50"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-800">
                                                    {lgu.name}
                                                </p>
                                                <p className="truncate text-xs text-slate-500">
                                                    {[
                                                        lgu.municipality,
                                                        lgu.province,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(', ') ||
                                                        'No location set'}
                                                    {lgu.created_at
                                                        ? ` · ${lgu.created_at}`
                                                        : ''}
                                                </p>
                                            </div>
                                            <span
                                                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                                                    lgu.is_active
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-slate-200 text-slate-600'
                                                }`}
                                            >
                                                {lgu.is_active
                                                    ? 'Active'
                                                    : 'Inactive'}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section
                        aria-label="Recently added LGU administrators"
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                    >
                        <SectionHeader
                            title="Recent LGU Admins"
                            countLabel={`${stats.lguAdmins} accounts`}
                            viewAllHref="/admin/lgu-admins"
                        />

                        {recentAdmins.length === 0 ? (
                            <EmptyState
                                title="No LGU admins yet"
                                description="Create an administrator account and assign it to an LGU."
                                actionLabel="Add LGU Admin"
                                actionHref="/admin/lgu-admins"
                            />
                        ) : (
                            <ul className="space-y-2">
                                {recentAdmins.map((admin) => (
                                    <li key={admin.id}>
                                        <Link
                                            href="/admin/lgu-admins"
                                            className="flex items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-3 transition hover:border-slate-200 hover:bg-slate-50"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-sm font-bold text-brand-dark">
                                                    {admin.name
                                                        .split(/\s+/)
                                                        .filter(Boolean)
                                                        .slice(0, 2)
                                                        .map((part) =>
                                                            part[0]?.toUpperCase(),
                                                        )
                                                        .join('') || 'A'}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-slate-800">
                                                        {admin.name}
                                                    </p>
                                                    <p className="truncate text-xs text-slate-500">
                                                        {admin.email}
                                                        {admin.created_at
                                                            ? ` · ${admin.created_at}`
                                                            : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="max-w-[40%] shrink-0 truncate rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                                {admin.lgu_name ?? 'Unassigned'}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>
        </AdminLayout>
    );
}

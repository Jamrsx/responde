import { Head, Link } from '@inertiajs/react';
import { useEffect } from 'react';

import LguLayout from '@/layouts/LguLayout';

type Stats = {
    barangays: number;
    captains: number;
    stations: number;
    pending_outposts: number;
    stations_without_chief: number;
};

type Props = {
    lgu: {
        id: number;
        name: string;
        municipality: string | null;
        province: string | null;
        psgc_code: string | null;
    };
    stats: Stats;
    recentStations: Array<{
        id: number;
        name: string;
        type: string | null;
        barangay: string | null;
        chief: string | null;
        status: string;
        approval_status: string;
        created_at: string | null;
    }>;
    recentCaptains: Array<{
        id: number;
        name: string;
        email: string;
        barangay: string | null;
        created_at: string | null;
    }>;
};

function StatCard({
    label,
    value,
    href,
    hint,
}: {
    label: string;
    value: number;
    href: string;
    hint: string;
}) {
    return (
        <Link
            href={href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md"
        >
            <p className="text-3xl font-bold tracking-tight text-slate-900">
                {value}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{label}</p>
            <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </Link>
    );
}

export default function LguDashboard({
    lgu,
    stats,
    recentStations,
    recentCaptains,
}: Props) {
    useEffect(() => {
        console.log('[Responde LGU] Dashboard loaded', { lgu, stats });
    }, [lgu, stats]);

    return (
        <LguLayout
            title="LGU Dashboard"
            description={`${lgu.name} response coverage overview`}
            actions={
                <div className="flex gap-2">
                    <Link
                        href="/lgu/barangays"
                        className="hidden min-h-11 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 sm:inline-flex"
                    >
                        Manage barangays
                    </Link>
                    <Link
                        href="/lgu/stations"
                        className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
                    >
                        Add station
                    </Link>
                </div>
            }
        >
            <Head title="LGU Dashboard" />

            <div className="space-y-6">
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="bg-gradient-to-r from-brand to-brand-dark px-5 py-6 sm:px-7">
                        <p className="text-sm text-white/80">Assigned LGU</p>
                        <h2 className="mt-1 text-2xl font-bold text-white">
                            {lgu.name}
                        </h2>
                        <p className="mt-2 text-sm text-white/85">
                            {[lgu.municipality, lgu.province]
                                .filter(Boolean)
                                .join(', ') || 'No location details'}
                            {lgu.psgc_code ? ` · PSGC ${lgu.psgc_code}` : ''}
                        </p>
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <StatCard
                        label="Barangays"
                        value={stats.barangays}
                        href="/lgu/barangays"
                        hint="Imported from map"
                    />
                    <StatCard
                        label="Captains"
                        value={stats.captains}
                        href="/lgu/barangays"
                        hint="Assigned accounts"
                    />
                    <StatCard
                        label="Stations"
                        value={stats.stations}
                        href="/lgu/stations"
                        hint="Approved facilities"
                    />
                    <StatCard
                        label="Pending outposts"
                        value={stats.pending_outposts}
                        href="/lgu/stations"
                        hint="Need your approval"
                    />
                    <StatCard
                        label="No chief yet"
                        value={stats.stations_without_chief}
                        href="/lgu/chiefs"
                        hint="Stations needing chiefs"
                    />
                </section>

                {(stats.pending_outposts > 0 ||
                    stats.stations_without_chief > 0) && (
                    <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                        {stats.pending_outposts > 0 && (
                            <p>
                                {stats.pending_outposts} tanod outpost(s) are
                                waiting for approval.
                            </p>
                        )}
                        {stats.stations_without_chief > 0 && (
                            <p className="mt-1">
                                {stats.stations_without_chief} station(s) still
                                need a chief account.
                            </p>
                        )}
                    </section>
                )}

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-base font-bold text-slate-900">
                                Recent stations
                            </h2>
                            <Link
                                href="/lgu/stations"
                                className="text-sm font-semibold text-brand-dark"
                            >
                                View all
                            </Link>
                        </div>
                        {recentStations.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                                No stations mapped yet.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {recentStations.map((station) => (
                                    <li
                                        key={station.id}
                                        className="rounded-xl px-3 py-3 hover:bg-slate-50"
                                    >
                                        <p className="text-sm font-semibold text-slate-800">
                                            {station.name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {[station.type, station.barangay]
                                                .filter(Boolean)
                                                .join(' · ')}
                                            {station.created_at
                                                ? ` · ${station.created_at}`
                                                : ''}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-base font-bold text-slate-900">
                                Recent captains
                            </h2>
                            <Link
                                href="/lgu/barangays"
                                className="text-sm font-semibold text-brand-dark"
                            >
                                Manage
                            </Link>
                        </div>
                        {recentCaptains.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                                No barangay captains assigned yet.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {recentCaptains.map((captain) => (
                                    <li
                                        key={captain.id}
                                        className="rounded-xl px-3 py-3 hover:bg-slate-50"
                                    >
                                        <p className="text-sm font-semibold text-slate-800">
                                            {captain.name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {captain.barangay ?? 'Unassigned'} ·{' '}
                                            {captain.email}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>
        </LguLayout>
    );
}

import { Head, Link } from '@inertiajs/react';

import ChiefLayout from '@/layouts/ChiefLayout';

type Props = {
    station: {
        id: number;
        name: string;
        type: string | null;
        type_code: string | null;
        status: string;
    };
    lgu: {
        id: number;
        name: string;
    };
    satisfaction: {
        score: number;
        max_score: number;
        average_rating: number | null;
        rating_count: number;
        has_ratings: boolean;
        label: string;
    };
    stats: {
        staff: number;
        completed_responses: number;
        active_assignments: number;
        public_ratings: number;
    };
    recentFeedback: Array<{
        id: number;
        public_rating: number;
        public_feedback: string | null;
        rated_at: string | null;
        emergency: string;
    }>;
};

function StatCard({
    label,
    value,
    tone = 'slate',
}: {
    label: string;
    value: number | string;
    tone?: 'slate' | 'green' | 'amber' | 'blue';
}) {
    const tones = {
        slate: 'bg-slate-100 text-slate-700',
        green: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
        blue: 'bg-blue-50 text-blue-700',
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p
                className={`inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${tones[tone]}`}
            >
                {label}
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {value}
            </p>
        </div>
    );
}

export default function ChiefDashboard({
    station,
    lgu,
    satisfaction,
    stats,
    recentFeedback,
}: Props) {
    console.log('[Responde Chief] Dashboard loaded', {
        stationId: station.id,
        score: satisfaction.score,
        staff: stats.staff,
    });

    return (
        <ChiefLayout
            title="Chief Dashboard"
            description={`${station.name} · ${lgu.name}`}
            fullWidth
            actions={
                <Link
                    href="/chief/staff"
                    className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                    Manage staff
                </Link>
            }
        >
            <Head title="Chief Dashboard" />

            <section className="mb-6 rounded-2xl border border-brand/20 bg-gradient-to-br from-brand-light/70 to-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold tracking-wide text-brand-dark uppercase">
                            Station satisfaction
                        </p>
                        <h2 className="mt-1 text-2xl font-bold text-slate-900">
                            {satisfaction.label}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                            This score belongs to the station, not individual
                            staff. The public who reported the emergency can
                            rate a completed response from 1 to 5 stars.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white bg-white px-6 py-4 text-center shadow-sm">
                        <p className="text-4xl font-bold tracking-tight text-brand-dark">
                            {satisfaction.score}
                            <span className="text-lg font-semibold text-slate-400">
                                {' '}
                                / {satisfaction.max_score}
                            </span>
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                            {satisfaction.has_ratings
                                ? `Avg ${satisfaction.average_rating}★ · ${satisfaction.rating_count} rating${satisfaction.rating_count === 1 ? '' : 's'}`
                                : 'No public ratings yet · starts at 50'}
                        </p>
                    </div>
                </div>
            </section>

            <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                <StatCard
                    label="Staff accounts"
                    value={stats.staff}
                    tone="blue"
                />
                <StatCard
                    label="Completed responses"
                    value={stats.completed_responses}
                    tone="green"
                />
                <StatCard
                    label="Active assignments"
                    value={stats.active_assignments}
                    tone="amber"
                />
                <StatCard
                    label="Public ratings"
                    value={stats.public_ratings}
                    tone="slate"
                />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900">
                        Recent public feedback
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                        Ratings from civilians after completed emergency
                        responses.
                    </p>

                    {recentFeedback.length === 0 ? (
                        <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                            No public ratings yet. The station score stays at 50
                            until the first completed response is rated.
                        </p>
                    ) : (
                        <ul className="mt-4 space-y-3">
                            {recentFeedback.map((item) => (
                                <li
                                    key={item.id}
                                    className="rounded-xl border border-slate-100 px-4 py-3"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-800">
                                                {item.emergency}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {item.rated_at ??
                                                    'Recently rated'}
                                            </p>
                                        </div>
                                        <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                            {item.public_rating}★
                                        </span>
                                    </div>
                                    {item.public_feedback && (
                                        <p className="mt-2 text-sm leading-6 text-slate-600">
                                            {item.public_feedback}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900">
                        Station overview
                    </h3>
                    <dl className="mt-4 space-y-3 text-sm">
                        <div className="flex justify-between gap-3 border-b border-slate-100 pb-3">
                            <dt className="text-slate-500">Station</dt>
                            <dd className="font-semibold text-slate-800">
                                {station.name}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3 border-b border-slate-100 pb-3">
                            <dt className="text-slate-500">Type</dt>
                            <dd className="font-semibold text-slate-800">
                                {station.type ?? '—'}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3 border-b border-slate-100 pb-3">
                            <dt className="text-slate-500">LGU</dt>
                            <dd className="font-semibold text-slate-800">
                                {lgu.name}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-slate-500">Status</dt>
                            <dd className="font-semibold text-slate-800 capitalize">
                                {station.status}
                            </dd>
                        </div>
                    </dl>

                    <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">
                        Score formula: starts at 50. Public average stars × 10
                        are added, capped at 100. Example: average 4.0★ becomes
                        90.
                    </div>
                </section>
            </div>
        </ChiefLayout>
    );
}

import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { inputClassName } from '@/components/admin/FormField';
import ChiefLayout from '@/layouts/ChiefLayout';

type HistoryItem = {
    id: number;
    emergency_id: number;
    type: string;
    description: string | null;
    address: string | null;
    responder: string | null;
    responder_position: string | null;
    acknowledgement_time: string | null;
    completion_time: string | null;
    public_rating: number | null;
    public_feedback: string | null;
    completed_at: string | null;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type Props = {
    station: { id: number; name: string };
    filters: { search: string; period: string };
    summary: {
        completed: number;
        average_acknowledgement: string | null;
        average_completion: string | null;
        average_rating: number | null;
        rating_count: number;
    };
    trend: Array<{
        month: string;
        completed: number;
        average_rating: number | null;
    }>;
    history: {
        data: HistoryItem[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
    };
};

function SummaryCard({
    label,
    value,
    note,
}: {
    label: string;
    value: string | number;
    note: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{note}</p>
        </div>
    );
}

export default function ChiefResponseReports({
    station,
    filters,
    summary,
    trend,
    history,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [period, setPeriod] = useState(filters.period);
    const maxCompleted = useMemo(
        () => Math.max(...trend.map((item) => item.completed), 1),
        [trend],
    );

    const applyFilters = (event: FormEvent) => {
        event.preventDefault();
        console.log('[Responde Chief] Applying report filters', {
            search,
            period,
        });
        router.get(
            '/chief/reports',
            { search: search || undefined, period },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <ChiefLayout
            title="Response Reports"
            description={`Completed response performance for ${station.name}`}
            fullWidth
        >
            <Head title="Response Reports" />

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <SummaryCard
                    label="Completed responses"
                    value={summary.completed}
                    note="All recorded completions"
                />
                <SummaryCard
                    label="Avg acknowledgement"
                    value={summary.average_acknowledgement ?? '—'}
                    note="Notification to acceptance"
                />
                <SummaryCard
                    label="Avg completion"
                    value={summary.average_completion ?? '—'}
                    note="Acceptance to completion"
                />
                <SummaryCard
                    label="Average rating"
                    value={
                        summary.average_rating !== null
                            ? `${summary.average_rating} / 5`
                            : '—'
                    }
                    note={`${summary.rating_count} public rating${summary.rating_count === 1 ? '' : 's'}`}
                />
            </div>

            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                    <h2 className="font-bold text-slate-900">
                        12-month response trend
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                        Completed assignments and average public ratings.
                    </p>
                </div>
                <div className="mt-5 grid h-52 grid-cols-12 items-end gap-1 sm:gap-2">
                    {trend.map((item) => {
                        const height = Math.max(
                            (item.completed / maxCompleted) * 100,
                            item.completed > 0 ? 8 : 2,
                        );

                        return (
                            <div
                                key={item.month}
                                className="flex h-full min-w-0 flex-col items-center justify-end"
                                title={`${item.month}: ${item.completed} completed${item.average_rating !== null ? `, ${item.average_rating}★` : ''}`}
                            >
                                <span className="mb-1 text-[10px] font-semibold text-slate-600">
                                    {item.completed}
                                </span>
                                <div
                                    className="w-full max-w-10 rounded-t-md bg-gradient-to-t from-brand-dark to-brand transition-all"
                                    style={{ height: `${height}%` }}
                                />
                                <span className="mt-2 max-w-full truncate text-[9px] text-slate-500">
                                    {item.month.split(' ')[0]}
                                </span>
                                <span className="text-[9px] text-amber-600">
                                    {item.average_rating !== null
                                        ? `${item.average_rating}★`
                                        : '—'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-4 sm:p-5">
                    <h2 className="font-bold text-slate-900">
                        Response history
                    </h2>
                    <form
                        onSubmit={applyFilters}
                        className="mt-3 flex flex-col gap-3 sm:flex-row"
                    >
                        <label htmlFor="report-search" className="sr-only">
                            Search response history
                        </label>
                        <input
                            id="report-search"
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search type, address, responder, or description..."
                            className={`${inputClassName} min-w-0 flex-1`}
                        />
                        <label htmlFor="report-period" className="sr-only">
                            Report period
                        </label>
                        <select
                            id="report-period"
                            value={period}
                            onChange={(event) => setPeriod(event.target.value)}
                            className={`${inputClassName} sm:max-w-44`}
                        >
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 90 days</option>
                            <option value="365">Last year</option>
                            <option value="all">All time</option>
                        </select>
                        <button
                            type="submit"
                            className="min-h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
                        >
                            Apply
                        </button>
                    </form>
                </div>

                {history.data.length === 0 ? (
                    <div className="px-5 py-12 text-center">
                        <p className="font-semibold text-slate-700">
                            No completed responses match these filters.
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            Completed assignments will appear here.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Request</th>
                                        <th className="px-4 py-3">Responder</th>
                                        <th className="px-4 py-3">
                                            Acknowledged
                                        </th>
                                        <th className="px-4 py-3">
                                            Completed in
                                        </th>
                                        <th className="px-4 py-3">Rating</th>
                                        <th className="px-4 py-3">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {history.data.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="align-top hover:bg-slate-50"
                                        >
                                            <td className="max-w-xs px-4 py-3">
                                                <p className="font-semibold text-slate-900">
                                                    {item.type}{' '}
                                                    <span className="text-xs text-slate-400">
                                                        #{item.emergency_id}
                                                    </span>
                                                </p>
                                                <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                                                    {item.address ??
                                                        item.description ??
                                                        'No description'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">
                                                {item.responder ?? 'Unassigned'}
                                                {item.responder_position && (
                                                    <span className="block text-xs text-slate-400">
                                                        {
                                                            item.responder_position
                                                        }
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-slate-700">
                                                {item.acknowledgement_time ??
                                                    '—'}
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-slate-700">
                                                {item.completion_time ?? '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {item.public_rating !== null ? (
                                                    <span
                                                        title={
                                                            item.public_feedback ??
                                                            undefined
                                                        }
                                                        className="font-semibold text-amber-700"
                                                    >
                                                        {item.public_rating}★
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">
                                                        Not rated
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500">
                                                {item.completed_at ?? '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row">
                            <p className="text-xs text-slate-500">
                                Showing {history.from ?? 0}–{history.to ?? 0} of{' '}
                                {history.total}
                            </p>
                            <nav
                                className="flex flex-wrap gap-1"
                                aria-label="Response history pagination"
                            >
                                {history.links.map((link, index) =>
                                    link.url ? (
                                        <Link
                                            key={`${link.label}-${index}`}
                                            href={link.url}
                                            preserveScroll
                                            className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-xs font-semibold ${
                                                link.active
                                                    ? 'border-brand bg-brand text-white'
                                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                            dangerouslySetInnerHTML={{
                                                __html: link.label,
                                            }}
                                        />
                                    ) : (
                                        <span
                                            key={`${link.label}-${index}`}
                                            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-slate-100 px-2 text-xs text-slate-300"
                                            dangerouslySetInnerHTML={{
                                                __html: link.label,
                                            }}
                                        />
                                    ),
                                )}
                            </nav>
                        </div>
                    </>
                )}
            </section>
        </ChiefLayout>
    );
}

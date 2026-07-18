import { Head, Link, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

import { inputClassName } from '@/components/admin/FormField';
import Modal from '@/components/admin/Modal';
import AdminLayout from '@/layouts/AdminLayout';

const PER_PAGE = 10;
const COLLAPSED_STORAGE_KEY = 'responde.admin.lgus.collapsedRegions';

type Lgu = {
    id: number;
    name: string;
    code: string | null;
    province: string | null;
    municipality: string | null;
    contact_number: string | null;
    psgc_code: string | null;
    classification: string | null;
    region: string | null;
    latitude: string | null;
    longitude: string | null;
    area_km2: string | null;
    is_active: boolean;
    stations_count: number;
    lgu_admins_count: number;
    created_at: string | null;
};

type RegionGroup = {
    region: string;
    lgus: Lgu[];
};

function readPageFromUrl(url: string): number {
    const query = url.includes('?') ? url.slice(url.indexOf('?')) : '';
    const page = Number(new URLSearchParams(query).get('page') || '1');

    return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
}

function readCollapsedRegions(): Set<string> {
    try {
        const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY);

        if (!raw) {
            return new Set();
        }

        const parsed = JSON.parse(raw) as unknown;

        if (!Array.isArray(parsed)) {
            return new Set();
        }

        return new Set(parsed.filter((item): item is string => typeof item === 'string'));
    } catch {
        return new Set();
    }
}

function writeCollapsedRegions(regions: Set<string>): void {
    localStorage.setItem(
        COLLAPSED_STORAGE_KEY,
        JSON.stringify(Array.from(regions)),
    );
}

export default function LgusIndex({ lgus }: { lgus: Lgu[] }) {
    const pageUrl = usePage().url;
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(() => readPageFromUrl(pageUrl));
    const [collapsedRegions, setCollapsedRegions] = useState<Set<string>>(
        () => readCollapsedRegions(),
    );
    const [pendingLgu, setPendingLgu] = useState<Lgu | null>(null);
    const [processing, setProcessing] = useState(false);

    const filteredLgus = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return lgus;
        }

        return lgus.filter((lgu) =>
            [
                lgu.name,
                lgu.code,
                lgu.province,
                lgu.municipality,
                lgu.region,
                lgu.classification,
            ]
                .filter(Boolean)
                .some((value) => value!.toLowerCase().includes(query)),
        );
    }, [lgus, search]);

    const totalPages = Math.max(1, Math.ceil(filteredLgus.length / PER_PAGE));
    const currentPage = Math.min(Math.max(page, 1), totalPages);

    const paginatedLgus = useMemo(() => {
        const start = (currentPage - 1) * PER_PAGE;

        return filteredLgus.slice(start, start + PER_PAGE);
    }, [filteredLgus, currentPage]);

    const groupedByRegion = useMemo((): RegionGroup[] => {
        const groups = new Map<string, Lgu[]>();

        for (const lgu of paginatedLgus) {
            const region = lgu.region?.trim() || 'Unassigned region';
            const current = groups.get(region) ?? [];
            current.push(lgu);
            groups.set(region, current);
        }

        return Array.from(groups.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([region, items]) => ({
                region,
                lgus: [...items].sort((a, b) => a.name.localeCompare(b.name)),
            }));
    }, [paginatedLgus]);

    const syncPageToUrl = (nextPage: number) => {
        const safePage = Math.min(Math.max(nextPage, 1), totalPages);

        console.log('[Responde Admin] LGU list page changed', {
            page: safePage,
            totalPages,
        });

        setPage(safePage);

        const url = new URL(window.location.href);

        if (safePage <= 1) {
            url.searchParams.delete('page');
        } else {
            url.searchParams.set('page', String(safePage));
        }

        const nextUrl = `${url.pathname}${url.search}${url.hash}`;
        window.history.replaceState(window.history.state, '', nextUrl);
    };

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setPage(1);

        const url = new URL(window.location.href);
        url.searchParams.delete('page');
        window.history.replaceState(
            window.history.state,
            '',
            `${url.pathname}${url.search}${url.hash}`,
        );
    };

    const toggleRegion = (region: string) => {
        setCollapsedRegions((previous) => {
            const next = new Set(previous);

            if (next.has(region)) {
                next.delete(region);
            } else {
                next.add(region);
            }

            writeCollapsedRegions(next);
            console.log('[Responde Admin] Region collapse toggled', {
                region,
                collapsed: next.has(region),
            });

            return next;
        });
    };

    const closeModal = () => {
        if (!processing) {
            setPendingLgu(null);
        }
    };

    const confirmToggleStatus = () => {
        if (!pendingLgu) {
            return;
        }

        const action = pendingLgu.is_active ? 'deactivate' : 'activate';
        console.log(`[Responde Admin] Confirm ${action} LGU`, {
            id: pendingLgu.id,
            name: pendingLgu.name,
        });

        setProcessing(true);
        router.patch(
            `/admin/lgus/${pendingLgu.id}/status`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setProcessing(false);
                    setPendingLgu(null);
                },
            },
        );
    };

    const rangeStart =
        filteredLgus.length === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1;
    const rangeEnd = Math.min(currentPage * PER_PAGE, filteredLgus.length);

    return (
        <AdminLayout
            title="LGUs"
            description="Local government units registered in Responde"
            actions={
                <Link
                    href="/admin/lgus/create"
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
                    Add LGU
                </Link>
            }
        >
            <Head title="LGUs" />

            <div className="rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 p-4">
                    <label htmlFor="lgu-search" className="sr-only">
                        Search LGUs
                    </label>
                    <input
                        id="lgu-search"
                        type="search"
                        value={search}
                        onChange={(event) =>
                            handleSearchChange(event.target.value)
                        }
                        placeholder="Search by name, ZIP, region, or location..."
                        className={`${inputClassName} max-w-sm`}
                    />
                </div>

                {filteredLgus.length === 0 ? (
                    <div className="p-10 text-center">
                        <p className="text-sm font-medium text-slate-600">
                            {lgus.length === 0
                                ? 'No LGUs yet.'
                                : 'No LGUs match your search.'}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                            {lgus.length === 0
                                ? 'Add the first local government unit to get started.'
                                : 'Try a different search term.'}
                        </p>
                        {lgus.length === 0 && (
                            <Link
                                href="/admin/lgus/create"
                                className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark"
                            >
                                Add LGU
                            </Link>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="text-xs tracking-wide text-slate-400 uppercase">
                                        <th className="px-4 py-3 font-medium">
                                            Name
                                        </th>
                                        <th className="hidden px-4 py-3 font-medium md:table-cell">
                                            Location
                                        </th>
                                        <th className="hidden px-4 py-3 font-medium lg:table-cell">
                                            Contact
                                        </th>
                                        <th className="hidden px-4 py-3 text-center font-medium sm:table-cell">
                                            Stations
                                        </th>
                                        <th className="hidden px-4 py-3 text-center font-medium sm:table-cell">
                                            Admins
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Status
                                        </th>
                                        <th className="px-4 py-3">
                                            <span className="sr-only">
                                                Actions
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                {groupedByRegion.map((group) => {
                                    const isCollapsed = collapsedRegions.has(
                                        group.region,
                                    );

                                    return (
                                        <tbody
                                            key={group.region}
                                            className="divide-y divide-slate-100"
                                        >
                                            <tr className="bg-slate-50">
                                                <td
                                                    colSpan={7}
                                                    className="px-2 py-1.5"
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            toggleRegion(
                                                                group.region,
                                                            )
                                                        }
                                                        aria-expanded={
                                                            !isCollapsed
                                                        }
                                                        className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase transition hover:bg-slate-100"
                                                    >
                                                        <svg
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            className={`h-4 w-4 shrink-0 text-slate-500 transition ${
                                                                isCollapsed
                                                                    ? '-rotate-90'
                                                                    : ''
                                                            }`}
                                                            aria-hidden="true"
                                                        >
                                                            <path
                                                                d="m6 9 6 6 6-6"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                        <span>
                                                            {group.region}
                                                        </span>
                                                        <span className="font-medium text-slate-400 normal-case">
                                                            {group.lgus.length}{' '}
                                                            {group.lgus
                                                                .length === 1
                                                                ? 'LGU'
                                                                : 'LGUs'}
                                                        </span>
                                                    </button>
                                                </td>
                                            </tr>
                                            {!isCollapsed &&
                                                group.lgus.map((lgu) => (
                                                    <tr
                                                        key={lgu.id}
                                                        className="transition hover:bg-slate-50"
                                                    >
                                                        <td className="px-4 py-3.5">
                                                            <p className="font-semibold text-slate-800">
                                                                {lgu.name}
                                                            </p>
                                                            {(lgu.classification ||
                                                                lgu.code) && (
                                                                <p className="text-xs text-slate-400">
                                                                    {[
                                                                        lgu.classification,
                                                                        lgu.code,
                                                                        lgu.area_km2
                                                                            ? `≈ ${Number(lgu.area_km2)} km²`
                                                                            : null,
                                                                    ]
                                                                        .filter(
                                                                            Boolean,
                                                                        )
                                                                        .join(
                                                                            ' · ',
                                                                        )}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="hidden px-4 py-3.5 text-slate-600 md:table-cell">
                                                            {[
                                                                lgu.municipality,
                                                                lgu.province,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(', ') ||
                                                                '—'}
                                                        </td>
                                                        <td className="hidden px-4 py-3.5 text-slate-600 lg:table-cell">
                                                            {lgu.contact_number ||
                                                                '—'}
                                                        </td>
                                                        <td className="hidden px-4 py-3.5 text-center text-slate-600 sm:table-cell">
                                                            {
                                                                lgu.stations_count
                                                            }
                                                        </td>
                                                        <td className="hidden px-4 py-3.5 text-center text-slate-600 sm:table-cell">
                                                            {
                                                                lgu.lgu_admins_count
                                                            }
                                                        </td>
                                                        <td className="px-4 py-3.5">
                                                            <span
                                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                                    lgu.is_active
                                                                        ? 'bg-emerald-50 text-emerald-700'
                                                                        : 'bg-slate-100 text-slate-500'
                                                                }`}
                                                            >
                                                                {lgu.is_active
                                                                    ? 'Active'
                                                                    : 'Inactive'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3.5 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Link
                                                                    href={`/admin/lgus/${lgu.id}/edit`}
                                                                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-dark transition hover:bg-brand-light"
                                                                >
                                                                    Edit
                                                                </Link>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        console.log(
                                                                            '[Responde Admin] Open status modal',
                                                                            lgu.name,
                                                                        );
                                                                        setPendingLgu(
                                                                            lgu,
                                                                        );
                                                                    }}
                                                                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                                                                        lgu.is_active
                                                                            ? 'text-red-600 hover:bg-red-50'
                                                                            : 'text-emerald-700 hover:bg-emerald-50'
                                                                    }`}
                                                                >
                                                                    {lgu.is_active
                                                                        ? 'Deactivate'
                                                                        : 'Activate'}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    );
                                })}
                            </table>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-slate-500">
                                Showing{' '}
                                <span className="font-medium text-slate-700">
                                    {rangeStart}-{rangeEnd}
                                </span>{' '}
                                of{' '}
                                <span className="font-medium text-slate-700">
                                    {filteredLgus.length}
                                </span>{' '}
                                LGUs
                                {totalPages > 1 && (
                                    <span className="text-slate-400">
                                        {' '}
                                        · Page {currentPage} of {totalPages}
                                    </span>
                                )}
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        syncPageToUrl(currentPage - 1)
                                    }
                                    disabled={currentPage <= 1}
                                    className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        syncPageToUrl(currentPage + 1)
                                    }
                                    disabled={currentPage >= totalPages}
                                    className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <Modal
                show={pendingLgu !== null}
                title={
                    pendingLgu?.is_active ? 'Deactivate LGU' : 'Activate LGU'
                }
                onClose={closeModal}
            >
                {pendingLgu && (
                    <div className="space-y-5">
                        <p className="text-sm leading-6 text-slate-600">
                            {pendingLgu.is_active ? (
                                <>
                                    Are you sure you want to deactivate{' '}
                                    <span className="font-semibold text-slate-900">
                                        {pendingLgu.name}
                                    </span>
                                    ? It will no longer appear as an active LGU
                                    for operations until you activate it again.
                                </>
                            ) : (
                                <>
                                    Are you sure you want to activate{' '}
                                    <span className="font-semibold text-slate-900">
                                        {pendingLgu.name}
                                    </span>
                                    ? It will be available for operations again.
                                </>
                            )}
                        </p>

                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={processing}
                                className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmToggleStatus}
                                disabled={processing}
                                className={`min-h-11 rounded-lg px-5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                    pendingLgu.is_active
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
                                {processing
                                    ? 'Please wait...'
                                    : pendingLgu.is_active
                                      ? 'Yes, deactivate'
                                      : 'Yes, activate'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </AdminLayout>
    );
}

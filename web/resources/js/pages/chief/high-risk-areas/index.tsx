import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

import { inputClassName } from '@/components/admin/FormField';
import HighRiskAreaMap from '@/components/chief/HighRiskAreaMap';
import type { HighRiskMapItem } from '@/components/chief/HighRiskAreaMap';
import ChiefLayout from '@/layouts/ChiefLayout';

type RiskItem = {
    id: string;
    category: 'accident' | 'fire';
    label: string;
    severity: 'high' | 'warning';
    latitude: number;
    longitude: number;
    radius_meters: number;
    count: number;
    threshold: number;
    window_days: number;
    latest_at: string | null;
    latest_at_human: string | null;
    lgus: string[];
    barangays: string[];
    sample_addresses: string[];
    window_start: string;
    window_end: string;
    reason: string;
};

type Props = {
    station: {
        id: number;
        name: string;
        latitude: string | null;
        longitude: string | null;
    };
    lgu: {
        id: number;
        name: string;
    };
    areas: RiskItem[];
    warnings: RiskItem[];
    summary: {
        high_risk_area_count: number;
        accident_area_count: number;
        fire_area_count: number;
        fire_warning_count: number;
        accident_ping_count: number;
        fire_ping_count: number;
        accident_threshold: number;
        accident_window_days: number;
        fire_threshold: number;
        fire_window_days: number;
        radius_meters: number;
        accident_window_start: string;
        accident_window_end: string;
        fire_window_start: string;
        fire_window_end: string;
    };
    generatedAt: string;
};

type CategoryFilter = 'all' | 'accident' | 'fire';

export default function ChiefHighRiskAreas({
    station,
    lgu,
    areas,
    warnings,
    summary,
    generatedAt,
}: Props) {
    const [category, setCategory] = useState<CategoryFilter>('all');
    const [lguQuery, setLguQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const allItems = useMemo(() => [...areas, ...warnings], [areas, warnings]);

    const filteredItems = useMemo(() => {
        const query = lguQuery.trim().toLowerCase();

        return allItems.filter((item) => {
            const matchesCategory =
                category === 'all' || item.category === category;
            const matchesLgu =
                !query ||
                item.lgus.some((name) => name.toLowerCase().includes(query)) ||
                item.barangays.some((name) =>
                    name.toLowerCase().includes(query),
                ) ||
                item.sample_addresses.some((address) =>
                    address.toLowerCase().includes(query),
                );

            return matchesCategory && matchesLgu;
        });
    }, [allItems, category, lguQuery]);

    const selected =
        filteredItems.find((item) => item.id === selectedId) ??
        filteredItems[0] ??
        null;

    useEffect(() => {
        console.log('[Responde Chief] High-risk areas loaded', {
            stationId: station.id,
            homeLgu: lgu.name,
            highRisk: summary.high_risk_area_count,
            fireWarnings: summary.fire_warning_count,
        });
    }, [
        lgu.name,
        station.id,
        summary.fire_warning_count,
        summary.high_risk_area_count,
    ]);

    useEffect(() => {
        const refresh = () => {
            if (document.hidden) {
                return;
            }

            console.log('[Responde Chief] Auto-refreshing high-risk areas');
            router.reload({
                only: ['areas', 'warnings', 'summary', 'generatedAt'],
            });
        };

        const timer = window.setInterval(refresh, 60_000);

        return () => window.clearInterval(timer);
    }, []);

    const mapItems: HighRiskMapItem[] = useMemo(
        () =>
            filteredItems.map((item) => ({
                id: item.id,
                latitude: item.latitude,
                longitude: item.longitude,
                radius_meters: item.radius_meters,
                count: item.count,
                category: item.category,
                severity: item.severity,
                name: `${item.label} · ${item.lgus[0] ?? 'Nationwide'} · ${item.count}`,
            })),
        [filteredItems],
    );

    const center: [number, number] =
        station.latitude && station.longitude
            ? [Number(station.latitude), Number(station.longitude)]
            : [12.8797, 121.774];

    const generatedLabel = useMemo(() => {
        const date = new Date(generatedAt);

        if (Number.isNaN(date.getTime())) {
            return 'Just now';
        }

        return date.toLocaleString();
    }, [generatedAt]);

    const refreshNow = () => {
        setRefreshing(true);
        console.log('[Responde Chief] Manual high-risk refresh');
        router.post(
            '/chief/high-risk-areas/refresh',
            {},
            {
                preserveScroll: true,
                onFinish: () => setRefreshing(false),
            },
        );
    };

    return (
        <ChiefLayout
            title="High-Risk Areas"
            description="Nationwide accident and fire hotspots from emergency location pings"
            fullWidth
            actions={
                <button
                    type="button"
                    onClick={refreshNow}
                    disabled={refreshing}
                    className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                    {refreshing ? 'Refreshing...' : 'Refresh map'}
                </button>
            }
        >
            <Head title="High-Risk Areas" />

            <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-5">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-red-700">
                        High-risk areas
                    </p>
                    <p className="mt-2 text-3xl font-bold text-red-800">
                        {summary.high_risk_area_count}
                    </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500">
                        Accident hotspots
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {summary.accident_area_count}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        {summary.accident_threshold}+ /{' '}
                        {summary.accident_window_days}d
                    </p>
                </div>
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-orange-700">
                        Fire high-risk
                    </p>
                    <p className="mt-2 text-3xl font-bold text-orange-800">
                        {summary.fire_area_count}
                    </p>
                    <p className="mt-1 text-xs text-orange-700/80">
                        {summary.fire_threshold}+ / {summary.fire_window_days}d
                    </p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-amber-700">
                        Fire warnings
                    </p>
                    <p className="mt-2 text-3xl font-bold text-amber-800">
                        {summary.fire_warning_count}
                    </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500">
                        Last updated
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                        {generatedLabel}
                    </p>
                </div>
            </div>

            <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                <div className="flex flex-wrap gap-2">
                    {(
                        [
                            ['all', 'All'],
                            ['accident', 'Accident'],
                            ['fire', 'Fire'],
                        ] as const
                    ).map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => {
                                setCategory(value);
                                console.log(
                                    '[Responde Chief] High-risk category filter',
                                    value,
                                );
                            }}
                            className={`min-h-10 rounded-lg border px-3 text-sm font-semibold ${
                                category === value
                                    ? 'border-brand bg-brand text-white'
                                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <label className="sr-only" htmlFor="high-risk-lgu-search">
                    Search by LGU, barangay, or address
                </label>
                <input
                    id="high-risk-lgu-search"
                    type="search"
                    value={lguQuery}
                    onChange={(event) => setLguQuery(event.target.value)}
                    placeholder="Search LGU, barangay, or address..."
                    className={`${inputClassName} min-w-0 flex-1`}
                />
            </div>

            <div className="mb-5 flex flex-wrap gap-3 text-xs font-semibold">
                <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-red-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                    Accident high-risk
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-orange-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-orange-600" />
                    Fire high-risk
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    Fire warning
                </span>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.75fr)]">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="mb-3">
                        <h2 className="font-bold text-slate-900">
                            Nationwide risk map
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                            All Chiefs can review hotspots outside their own
                            LGU. Accident high-risk uses{' '}
                            {summary.accident_threshold}+ pings in{' '}
                            {summary.accident_window_days} days. Fire warnings
                            show every house-fire ping; fire high-risk uses{' '}
                            {summary.fire_threshold}+ in{' '}
                            {summary.fire_window_days} days. Radius:{' '}
                            {summary.radius_meters}m.
                        </p>
                    </div>

                    {filteredItems.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-16 text-center">
                            <p className="font-semibold text-slate-700">
                                No high-risk areas match these filters
                            </p>
                            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                                Hotspots appear when enough emergency location
                                pings cluster in the same area.
                            </p>
                        </div>
                    ) : (
                        <HighRiskAreaMap
                            center={center}
                            items={mapItems}
                            selectedId={selected?.id ?? null}
                            onItemClick={(itemId) => {
                                setSelectedId(itemId);
                                console.log(
                                    '[Responde Chief] High-risk item selected',
                                    itemId,
                                );
                            }}
                        />
                    )}
                </section>

                <aside className="space-y-4">
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <h2 className="font-bold text-slate-900">
                            Detected locations
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                            Showing {filteredItems.length} of {allItems.length}{' '}
                            nationwide results.
                        </p>

                        {filteredItems.length === 0 ? (
                            <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                                No matching hotspots yet.
                            </p>
                        ) : (
                            <ul className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                                {filteredItems.map((item) => {
                                    const active = item.id === selected?.id;
                                    const tone =
                                        item.category === 'accident'
                                            ? 'border-red-300 bg-red-50'
                                            : item.severity === 'high'
                                              ? 'border-orange-300 bg-orange-50'
                                              : 'border-amber-300 bg-amber-50';

                                    return (
                                        <li key={item.id}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedId(item.id);
                                                    console.log(
                                                        '[Responde Chief] High-risk list selected',
                                                        item.id,
                                                    );
                                                }}
                                                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                                                    active
                                                        ? tone
                                                        : 'border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-900">
                                                            {item.label}
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {item.lgus[0] ??
                                                                'Unknown LGU'}
                                                            {item.barangays[0]
                                                                ? ` · ${item.barangays[0]}`
                                                                : ''}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                                                            item.category ===
                                                            'accident'
                                                                ? 'bg-red-100 text-red-700'
                                                                : item.severity ===
                                                                    'high'
                                                                  ? 'bg-orange-100 text-orange-700'
                                                                  : 'bg-amber-100 text-amber-700'
                                                        }`}
                                                    >
                                                        {item.count}
                                                    </span>
                                                </div>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>

                    {selected && (
                        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                            <h3 className="font-bold text-slate-900">
                                Location details
                            </h3>
                            <dl className="mt-4 space-y-3 text-sm">
                                <div className="flex justify-between gap-3 border-b border-slate-100 pb-3">
                                    <dt className="text-slate-500">Type</dt>
                                    <dd className="font-semibold text-slate-800">
                                        {selected.label}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-3 border-b border-slate-100 pb-3">
                                    <dt className="text-slate-500">Pings</dt>
                                    <dd className="font-semibold text-slate-800">
                                        {selected.count}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-3 border-b border-slate-100 pb-3">
                                    <dt className="text-slate-500">Rule</dt>
                                    <dd className="text-right font-semibold text-slate-800">
                                        {selected.threshold}+ /{' '}
                                        {selected.window_days}d /{' '}
                                        {selected.radius_meters}m
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-3 border-b border-slate-100 pb-3">
                                    <dt className="text-slate-500">Latest</dt>
                                    <dd className="text-right font-semibold text-slate-800">
                                        {selected.latest_at_human ?? '—'}
                                    </dd>
                                </div>
                                <div className="border-b border-slate-100 pb-3">
                                    <dt className="text-slate-500">LGUs</dt>
                                    <dd className="mt-1 font-semibold text-slate-800">
                                        {selected.lgus.length > 0
                                            ? selected.lgus.join(', ')
                                            : 'Not specified'}
                                    </dd>
                                </div>
                                <div className="border-b border-slate-100 pb-3">
                                    <dt className="text-slate-500">
                                        Barangays
                                    </dt>
                                    <dd className="mt-1 font-semibold text-slate-800">
                                        {selected.barangays.length > 0
                                            ? selected.barangays.join(', ')
                                            : 'Not specified'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-slate-500">
                                        Why marked
                                    </dt>
                                    <dd className="mt-1 text-slate-700">
                                        {selected.reason}
                                    </dd>
                                </div>
                            </dl>
                        </section>
                    )}
                </aside>
            </div>
        </ChiefLayout>
    );
}

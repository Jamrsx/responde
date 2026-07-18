import L from 'leaflet';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

import { inputClassName } from '@/components/admin/FormField';
import { buildOutsideMask, OUTSIDE_MASK_STYLE } from '@/lib/mapMask';

export type BarangayFeatureProps = {
    psgc: string;
    name: string;
    lgu_psgc: string;
    area_km2?: number;
};

type BarangayFeature = GeoJSON.Feature<
    GeoJSON.Geometry,
    BarangayFeatureProps
>;

type BarangayCollection = GeoJSON.FeatureCollection<
    GeoJSON.Geometry,
    BarangayFeatureProps
>;

const SELECTED_COLOR = '#2563eb';
const AVAILABLE_COLOR = '#047857';
const IMPORTED_COLOR = '#94a3b8';

function FitBounds({
    collection,
}: {
    collection: BarangayCollection | null;
}) {
    const map = useMap();
    const doneRef = useRef(false);

    useEffect(() => {
        if (!collection || doneRef.current || collection.features.length === 0) {
            return;
        }

        const bounds = L.geoJSON(collection).getBounds();
        doneRef.current = true;
        map.invalidateSize();
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 13 });

        // Keep the view locked to the assigned LGU only.
        const lockedBounds = bounds.pad(0.15);
        map.setMaxBounds(lockedBounds);
        map.setMinZoom(map.getBoundsZoom(lockedBounds));
        console.log('[Responde LGU] Map view locked to LGU bounds');
    }, [collection, map]);

    return null;
}

export default function BarangayMapPicker({
    mapUrl,
    importedPsgcs,
    selectedPsgcs,
    onChange,
    onLoaded,
    center,
}: {
    mapUrl: string | null;
    importedPsgcs: string[];
    selectedPsgcs: string[];
    onChange: (next: string[], features: BarangayFeature[]) => void;
    onLoaded?: (total: number) => void;
    center?: [number, number] | null;
}) {
    const [collection, setCollection] = useState<BarangayCollection | null>(
        null,
    );
    const [loadError, setLoadError] = useState(() => !mapUrl);
    const [search, setSearch] = useState('');
    const selectedRef = useRef(selectedPsgcs);
    const onLoadedRef = useRef(onLoaded);
    const importedSet = useMemo(
        () => new Set(importedPsgcs),
        [importedPsgcs],
    );

    useEffect(() => {
        selectedRef.current = selectedPsgcs;
    }, [selectedPsgcs]);

    useEffect(() => {
        onLoadedRef.current = onLoaded;
    }, [onLoaded]);

    useEffect(() => {
        if (!mapUrl) {
            return;
        }

        let cancelled = false;
        console.log('[Responde LGU] Loading barangay boundaries', mapUrl);

        fetch(mapUrl)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                return response.json() as Promise<BarangayCollection>;
            })
            .then((data) => {
                if (!cancelled) {
                    setCollection(data);
                    onLoadedRef.current?.(data.features.length);
                    console.log(
                        `[Responde LGU] Loaded ${data.features.length} barangays`,
                    );
                }
            })
            .catch((error) => {
                console.error(
                    '[Responde LGU] Failed to load barangay map',
                    error,
                );

                if (!cancelled) {
                    setLoadError(true);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [mapUrl]);

    const outsideMask = useMemo(
        () => (collection ? buildOutsideMask(collection) : null),
        [collection],
    );

    const selectedFeatures = useMemo(() => {
        if (!collection) {
            return [];
        }

        return collection.features.filter((feature) =>
            selectedPsgcs.includes(feature.properties.psgc),
        );
    }, [collection, selectedPsgcs]);

    const officialTotal = collection?.features.length ?? 0;
    const availableCount = useMemo(() => {
        if (!collection) {
            return 0;
        }

        return collection.features.filter(
            (feature) => !importedSet.has(feature.properties.psgc),
        ).length;
    }, [collection, importedSet]);

    const searchResults = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!collection || query.length < 1) {
            return [];
        }

        return collection.features
            .filter((feature) => {
                const name = feature.properties.name.toLowerCase();
                const psgc = feature.properties.psgc.toLowerCase();

                return name.includes(query) || psgc.includes(query);
            })
            .slice(0, 10);
    }, [collection, search]);

    const togglePsgc = (psgc: string) => {
        if (importedSet.has(psgc)) {
            return;
        }

        const next = selectedRef.current.includes(psgc)
            ? selectedRef.current.filter((item) => item !== psgc)
            : [...selectedRef.current, psgc];

        const features =
            collection?.features.filter((feature) =>
                next.includes(feature.properties.psgc),
            ) ?? [];

        console.log('[Responde LGU] Barangay selection changed', next);
        onChange(next, features);
    };

    const styleFor = (feature?: BarangayFeature) => {
        const psgc = feature?.properties.psgc ?? '';

        if (importedSet.has(psgc)) {
            return {
                color: IMPORTED_COLOR,
                weight: 1,
                fillColor: IMPORTED_COLOR,
                fillOpacity: 0.35,
            };
        }

        if (selectedPsgcs.includes(psgc)) {
            return {
                color: SELECTED_COLOR,
                weight: 2.5,
                fillColor: SELECTED_COLOR,
                fillOpacity: 0.45,
            };
        }

        return {
            color: AVAILABLE_COLOR,
            weight: 0.8,
            fillColor: AVAILABLE_COLOR,
            fillOpacity: 0.16,
        };
    };

    if (loadError) {
        return (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                Barangay map data is not available for this LGU yet. Run{' '}
                <code className="rounded bg-slate-200 px-1.5 py-0.5 text-xs">
                    php artisan maps:sync-barangays --registered-only
                </code>{' '}
                then refresh.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="relative">
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search barangay by name or PSGC..."
                    className={inputClassName}
                    autoComplete="off"
                    aria-label="Search official barangays on the map"
                />
                {search.trim().length > 0 && (
                    <ul className="absolute top-full right-0 left-0 z-[1200] mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                        {searchResults.length === 0 ? (
                            <li className="px-4 py-2.5 text-sm text-slate-500">
                                No barangays match “{search.trim()}”
                            </li>
                        ) : (
                            searchResults.map((feature) => (
                                <li key={feature.properties.psgc}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            togglePsgc(
                                                feature.properties.psgc,
                                            );
                                            setSearch('');
                                        }}
                                        disabled={importedSet.has(
                                            feature.properties.psgc,
                                        )}
                                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <span>{feature.properties.name}</span>
                                        <span className="text-xs text-slate-400">
                                            {importedSet.has(
                                                feature.properties.psgc,
                                            )
                                                ? 'Imported'
                                                : feature.properties.psgc}
                                        </span>
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                )}
            </div>

            <div className="relative overflow-hidden rounded-xl border border-slate-200">
                <MapContainer
                    center={center ?? [12.8797, 121.774]}
                    zoom={center ? 12 : 6}
                    minZoom={5}
                    preferCanvas
                    className="z-0 h-[min(72vh,760px)] w-full min-h-[460px]"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <FitBounds collection={collection} />
                    {outsideMask && (
                        <GeoJSON
                            data={outsideMask}
                            interactive={false}
                            style={OUTSIDE_MASK_STYLE}
                        />
                    )}
                    {collection && (
                        <GeoJSON
                            key={`${selectedPsgcs.join(',')}-${importedPsgcs.join(',')}`}
                            data={collection}
                            style={(feature) =>
                                styleFor(feature as BarangayFeature)
                            }
                            onEachFeature={(feature, layer) => {
                                const barangay = feature as BarangayFeature;
                                const path = layer as L.Path;
                                path.bindTooltip(
                                    `<strong>${barangay.properties.name}</strong><br/>PSGC ${barangay.properties.psgc}`,
                                    { sticky: true },
                                );
                                path.on({
                                    click: () =>
                                        togglePsgc(barangay.properties.psgc),
                                });
                            }}
                        />
                    )}
                </MapContainer>
            </div>

            <p className="text-xs text-slate-500">
                Official {officialTotal} · Available {availableCount} · Selected{' '}
                {selectedFeatures.length} · Registered {importedPsgcs.length}.
                Gray areas are already registered and locked.
            </p>
        </div>
    );
}

import L from 'leaflet';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

import { inputClassName } from '@/components/admin/FormField';
import { MAP_FIT_MAX_ZOOM, MAP_MAX_ZOOM } from '@/lib/mapZoom';

const PH_CENTER: [number, number] = [12.8797, 121.774];
const PH_ZOOM = 6;
const EDIT_ZOOM = 11;

export type LguSelection = {
    psgc: string;
    name: string;
    classification: string;
    province: string | null;
    region: string;
    area_km2: number;
    postal_code: string | null;
    latitude: number;
    longitude: number;
};

type MunicityProperties = {
    psgc: string;
    name: string;
    level: string;
    province: string | null;
    region: string;
    area_km2: number;
    classification?: string;
    postal_code?: string | null;
};

type MunicityFeature = GeoJSON.Feature<GeoJSON.Geometry, MunicityProperties>;

type MunicityCollection = GeoJSON.FeatureCollection<
    GeoJSON.Geometry,
    MunicityProperties
>;

type FeaturePath = L.Path & { feature?: MunicityFeature };

const CITY_COLOR = '#c2410c';
const MUNICIPALITY_COLOR = '#047857';
const SELECTED_COLOR = '#2563eb';

export function classificationLabel(level: string): string {
    switch (level) {
        case 'City':
            return 'City';
        case 'Mun':
            return 'Municipality';
        case 'SubMun':
            return 'Sub-municipality';
        default:
            return level;
    }
}

function baseStyle(feature?: MunicityFeature): L.PathOptions {
    const isCity = feature?.properties.level === 'City';

    return {
        color: isCity ? CITY_COLOR : MUNICIPALITY_COLOR,
        weight: 0.7,
        fillColor: isCity ? CITY_COLOR : MUNICIPALITY_COLOR,
        fillOpacity: 0.14,
    };
}

const selectedStyle: L.PathOptions = {
    color: SELECTED_COLOR,
    weight: 2.5,
    fillColor: SELECTED_COLOR,
    fillOpacity: 0.45,
};

// Locked edit mode: everything outside the assigned LGU is grayed out.
const mutedStyle: L.PathOptions = {
    color: '#94a3b8',
    weight: 0.4,
    fillColor: '#475569',
    fillOpacity: 0.55,
};

/**
 * Zooms the Leaflet map to the LGU already selected on edit (runs once).
 * Must be a child of MapContainer so useMap() has a live map instance.
 */
function ZoomToSelectedPsgc({
    psgc,
    collection,
}: {
    psgc: string | null;
    collection: MunicityCollection | null;
}) {
    const map = useMap();
    const initialPsgcRef = useRef(psgc);
    const didZoomRef = useRef(false);

    // Strict Mode can cancel the first timer; allow one retry after cleanup.
    useEffect(() => {
        const targetPsgc = initialPsgcRef.current;

        if (!targetPsgc || !collection) {
            return;
        }

        const feature = collection.features.find(
            (item) => item.properties.psgc === targetPsgc,
        );

        if (!feature) {
            console.warn(
                '[Responde Admin] Could not find boundary to zoom for PSGC',
                targetPsgc,
            );

            return;
        }

        if (didZoomRef.current) {
            return;
        }

        const bounds = L.geoJSON(feature).getBounds();
        let cancelled = false;

        const zoom = () => {
            if (cancelled || didZoomRef.current) {
                return;
            }

            didZoomRef.current = true;
            map.invalidateSize();
            map.fitBounds(bounds, {
                padding: [48, 48],
                maxZoom: MAP_FIT_MAX_ZOOM,
            });
            console.log('[Responde Admin] Zoomed map to selected LGU', {
                psgc: targetPsgc,
                name: feature.properties.name,
            });
        };

        // Wait for layout + GeoJSON canvas paint on the full-width edit page.
        const timer = window.setTimeout(zoom, 300);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [collection, map]);

    return null;
}

export default function LguMapPicker({
    selectedPsgc,
    onSelect,
    mapClassName = 'h-[min(70vh,640px)] w-full min-h-[420px]',
    initialCenter,
    initialZoom,
    selectionLocked = false,
}: {
    selectedPsgc: string | null;
    onSelect: (selection: LguSelection) => void;
    mapClassName?: string;
    /** When editing, open already focused near the LGU before boundaries load. */
    initialCenter?: [number, number] | null;
    initialZoom?: number;
    /** Edit mode: map is view-only — selection cannot change. */
    selectionLocked?: boolean;
}) {
    const [collection, setCollection] = useState<MunicityCollection | null>(
        null,
    );
    const [loadError, setLoadError] = useState(false);
    const [search, setSearch] = useState('');

    const mapRef = useRef<L.Map | null>(null);
    const layersRef = useRef(new Map<string, FeaturePath>());
    const selectedPsgcRef = useRef(selectedPsgc);
    const selectionLockedRef = useRef(selectionLocked);

    useEffect(() => {
        selectionLockedRef.current = selectionLocked;
    }, [selectionLocked]);

    const startCenter = initialCenter ?? PH_CENTER;
    const startZoom = initialCenter
        ? (initialZoom ?? EDIT_ZOOM)
        : (initialZoom ?? PH_ZOOM);

    useEffect(() => {
        let cancelled = false;

        console.log('[Responde Admin] Loading PH LGU boundaries...');

        fetch('/map-data/municipalities')
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                return response.json() as Promise<MunicityCollection>;
            })
            .then((data) => {
                if (!cancelled) {
                    console.log(
                        `[Responde Admin] Loaded ${data.features.length} LGU boundaries`,
                    );
                    setCollection(data);
                }
            })
            .catch((error) => {
                console.error(
                    '[Responde Admin] Failed to load LGU boundaries:',
                    error,
                );

                if (!cancelled) {
                    setLoadError(true);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // Restyle layers when the selection changes without re-rendering 1,600 polygons.
    useEffect(() => {
        const previous = selectedPsgcRef.current;

        if (previous && layersRef.current.has(previous)) {
            const layer = layersRef.current.get(previous)!;
            layer.setStyle(baseStyle(layer.feature));
        }

        if (selectedPsgc && layersRef.current.has(selectedPsgc)) {
            layersRef.current.get(selectedPsgc)!.setStyle(selectedStyle);
        }

        selectedPsgcRef.current = selectedPsgc;
    }, [selectedPsgc, collection]);

    const searchResults = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!collection || query.length < 2) {
            return [];
        }

        return collection.features
            .filter((feature) => {
                const { name, province } = feature.properties;

                return (
                    name.toLowerCase().includes(query) ||
                    (province ?? '').toLowerCase().includes(query)
                );
            })
            .slice(0, 8);
    }, [collection, search]);

    const selectFeature = (feature: MunicityFeature, zoom: boolean) => {
        if (selectionLockedRef.current) {
            console.log(
                '[Responde Admin] Map selection locked — ignoring click',
                feature.properties.psgc,
            );

            return;
        }

        const layer = layersRef.current.get(feature.properties.psgc);
        const bounds = layer
            ? (layer as unknown as L.Polygon).getBounds()
            : L.geoJSON(feature).getBounds();
        const center = bounds.getCenter();

        if (zoom && mapRef.current) {
            mapRef.current.flyToBounds(bounds, {
                padding: [24, 24],
                maxZoom: MAP_FIT_MAX_ZOOM,
                duration: 0.6,
            });
        }

        const selection: LguSelection = {
            psgc: feature.properties.psgc,
            name: feature.properties.name,
            classification:
                feature.properties.classification ??
                classificationLabel(feature.properties.level),
            province: feature.properties.province,
            region: feature.properties.region,
            area_km2: feature.properties.area_km2,
            postal_code: feature.properties.postal_code ?? null,
            latitude: Number(center.lat.toFixed(7)),
            longitude: Number(center.lng.toFixed(7)),
        };

        console.log('[Responde Admin] LGU selected from map:', selection);
        onSelect(selection);
    };

    const onEachFeature = (feature: MunicityFeature, layer: L.Layer) => {
        const path = layer as FeaturePath;
        const isSelected =
            feature.properties.psgc === selectedPsgcRef.current;

        layersRef.current.set(feature.properties.psgc, path);

        if (isSelected) {
            path.setStyle(selectedStyle);
        }

        // Locked edit mode: grayed-out zones stay anonymous (no tooltip).
        if (selectionLockedRef.current && !isSelected) {
            return;
        }

        const { name, province, level, area_km2, classification, postal_code } =
            feature.properties;

        path.bindTooltip(
            `<strong>${name}</strong><br/>${
                classification ?? classificationLabel(level)
            }${province ? ` · ${province}` : ''}${
                postal_code ? `<br/>ZIP ${postal_code}` : ''
            }<br/>≈ ${area_km2} km²`,
            { sticky: true },
        );

        path.on({
            click: () => selectFeature(feature, false),
            mouseover: () => {
                if (
                    selectionLockedRef.current ||
                    feature.properties.psgc === selectedPsgcRef.current
                ) {
                    return;
                }

                path.setStyle({ weight: 1.8, fillOpacity: 0.32 });
            },
            mouseout: () => {
                if (
                    selectionLockedRef.current ||
                    feature.properties.psgc === selectedPsgcRef.current
                ) {
                    return;
                }

                path.setStyle(baseStyle(feature));
            },
        });
    };

    if (loadError) {
        return (
            <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                The LGU boundary map could not be loaded. You can still fill in
                the LGU details manually below.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {!selectionLocked && (
                <div className="relative">
                    <label htmlFor="map-search" className="sr-only">
                        Search for a city or municipality
                    </label>
                    <input
                        id="map-search"
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search a city or municipality (e.g. Opol, El Salvador, Cagayan de Oro)..."
                        className={inputClassName}
                        autoComplete="off"
                    />

                    {searchResults.length > 0 && (
                        <ul className="absolute top-full right-0 left-0 z-[1200] mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                            {searchResults.map((feature) => (
                                <li key={feature.properties.psgc}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            selectFeature(feature, true);
                                            setSearch('');
                                        }}
                                        className="flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-brand-light"
                                    >
                                        <span className="font-medium text-slate-800">
                                            {feature.properties.name}
                                        </span>
                                        <span className="shrink-0 text-xs text-slate-400">
                                            {classificationLabel(
                                                feature.properties.level,
                                            )}
                                            {feature.properties.province
                                                ? ` · ${feature.properties.province}`
                                                : ''}
                                            {feature.properties.classification
                                                ? ` · ${feature.properties.classification}`
                                                : ''}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <div className="relative overflow-hidden rounded-xl border border-slate-200">
                <MapContainer
                    ref={mapRef}
                    center={startCenter}
                    zoom={startZoom}
                    minZoom={5}
                    maxZoom={MAP_MAX_ZOOM}
                    preferCanvas
                    className={`z-0 ${mapClassName}`}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                        maxZoom={MAP_MAX_ZOOM}
                        maxNativeZoom={MAP_MAX_ZOOM}
                    />
                    <ZoomToSelectedPsgc
                        psgc={selectedPsgc}
                        collection={collection}
                    />
                    {collection && (
                        <GeoJSON
                            data={collection}
                            style={(feature) => {
                                const municity = feature as MunicityFeature;

                                if (selectionLocked) {
                                    return municity.properties.psgc ===
                                        selectedPsgc
                                        ? selectedStyle
                                        : mutedStyle;
                                }

                                return baseStyle(municity);
                            }}
                            onEachFeature={(feature, layer) =>
                                onEachFeature(feature as MunicityFeature, layer)
                            }
                        />
                    )}
                </MapContainer>

                {!collection && (
                    <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/70 backdrop-blur-sm">
                        <p className="text-sm font-medium text-slate-600">
                            Loading LGU boundaries...
                        </p>
                    </div>
                )}

                <div className="absolute right-2 bottom-2 z-[1000] flex gap-3 rounded-lg bg-white/90 px-3 py-1.5 text-xs text-slate-600 shadow">
                    {selectionLocked ? (
                        <span className="flex items-center gap-1.5">
                            <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: SELECTED_COLOR }}
                            />
                            Assigned LGU
                        </span>
                    ) : (
                        <>
                            <span className="flex items-center gap-1.5">
                                <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: CITY_COLOR }}
                                />
                                City
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{
                                        backgroundColor: MUNICIPALITY_COLOR,
                                    }}
                                />
                                Municipality
                            </span>
                        </>
                    )}
                </div>
            </div>

            <p className="text-xs text-slate-500">
                {selectionLocked
                    ? 'This LGU map location is locked. Pan and zoom to review the boundary — change the assigned area by adding a new LGU instead.'
                    : 'Click an area on the map or search above. Boundaries are based on PSA/NAMRIA data and are for jurisdiction reference only.'}
            </p>
        </div>
    );
}

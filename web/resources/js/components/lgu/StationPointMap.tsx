import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import {
    GeoJSON,
    MapContainer,
    Marker,
    TileLayer,
    Tooltip,
    useMap,
    useMapEvents,
} from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

import { stationMarkerSvg } from '@/components/lgu/stationIcons';
import type { StationIconKey } from '@/components/lgu/stationIcons';
import { buildOutsideMask, OUTSIDE_MASK_STYLE } from '@/lib/mapMask';
import { MAP_FIT_MAX_ZOOM, MAP_MAX_ZOOM } from '@/lib/mapZoom';

type StationMarker = {
    id: number | string;
    name: string;
    latitude: number;
    longitude: number;
    color?: string;
    iconKey?: StationIconKey;
    logoUrl?: string | null;
};

function FitMarkers({ markers }: { markers: StationMarker[] }) {
    const map = useMap();
    const markerKey = markers
        .map((marker) => `${marker.id}:${marker.latitude}:${marker.longitude}`)
        .join('|');

    useEffect(() => {
        if (!markerKey) {
            return;
        }

        const points = markerKey.split('|').map((part) => {
            const [, lat, lng] = part.split(':');

            return [Number(lat), Number(lng)] as [number, number];
        });
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, {
            padding: [40, 40],
            maxZoom: MAP_FIT_MAX_ZOOM,
        });
    }, [markerKey, map]);

    return null;
}

function FocusMarker({ marker }: { marker: StationMarker | null }) {
    const map = useMap();
    const focusKey = marker
        ? `${marker.id}:${marker.latitude}:${marker.longitude}`
        : '';

    useEffect(() => {
        if (!marker || !focusKey) {
            return;
        }

        map.flyTo(
            [marker.latitude, marker.longitude],
            Math.max(map.getZoom(), 16),
            {
                duration: 0.45,
            },
        );
        console.log('[Responde LGU] Map focused on station marker', marker.id);
        // Only re-focus when the selected station changes, not marker color updates.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusKey, map]);

    return null;
}

function FocusPosition({
    position,
}: {
    position: { latitude: number; longitude: number; zoom?: number } | null;
}) {
    const map = useMap();
    const positionKey = position
        ? `${position.latitude}:${position.longitude}:${position.zoom ?? 18}`
        : '';

    useEffect(() => {
        if (!position || !positionKey) {
            return;
        }

        map.flyTo(
            [position.latitude, position.longitude],
            position.zoom ?? 18,
            { duration: 0.6 },
        );
        // Focus only when coordinates change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [positionKey, map]);

    return null;
}

function ClickPicker({
    enabled,
    onPick,
}: {
    enabled: boolean;
    onPick: (lat: number, lng: number) => void;
}) {
    useMapEvents({
        click(event) {
            if (!enabled) {
                return;
            }

            onPick(
                Number(event.latlng.lat.toFixed(7)),
                Number(event.latlng.lng.toFixed(7)),
            );
        },
    });

    return null;
}

function LockToBoundary({
    boundary,
}: {
    boundary: GeoJSON.FeatureCollection | null;
}) {
    const map = useMap();

    useEffect(() => {
        if (!boundary || boundary.features.length === 0) {
            return;
        }

        const lockedBounds = L.geoJSON(boundary).getBounds().pad(0.15);
        map.setMaxBounds(lockedBounds);
        map.setMaxZoom(MAP_MAX_ZOOM);
        const minZoom = Math.min(
            map.getBoundsZoom(lockedBounds),
            MAP_MAX_ZOOM - 2,
        );
        map.setMinZoom(minZoom);
        console.log('[Responde LGU] Station map locked to LGU bounds', {
            minZoom,
            maxZoom: MAP_MAX_ZOOM,
        });
    }, [boundary, map]);

    return null;
}

const markerIcon = (
    color = '#e0752e',
    iconKey: StationIconKey = 'generic',
    logoUrl?: string | null,
) => {
    const safeLogoUrl = logoUrl
        ? logoUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
        : null;
    const inner = safeLogoUrl
        ? `<img src="${safeLogoUrl}" alt="" style="width:34px;height:34px;border-radius:9999px;object-fit:cover;background:#fff" />`
        : `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">${stationMarkerSvg(iconKey)}</svg>`;

    // Badge with a pointer tail so the pin clearly marks the exact spot.
    return L.divIcon({
        className: 'leaflet-div-icon responde-station-marker',
        html: `<div style="display:flex;flex-direction:column;align-items:center;width:46px;filter:drop-shadow(0 3px 5px rgba(0,0,0,.45))">
            <div style="display:flex;width:46px;height:46px;align-items:center;justify-content:center;border-radius:9999px;background:${color};border:3px solid white">${inner}</div>
            <div style="width:0;height:0;margin-top:-2px;border-left:8px solid transparent;border-right:8px solid transparent;border-top:12px solid ${color}"></div>
        </div>`,
        iconSize: [46, 58],
        iconAnchor: [23, 58],
        tooltipAnchor: [0, -50],
    });
};

export default function StationPointMap({
    center,
    markers,
    selected,
    selectedIconKey = 'generic',
    selectedLogoUrl = null,
    focusMarkerId = null,
    focusPosition = null,
    onPick,
    onMarkerClick,
    pickEnabled = true,
    fitMarkers = false,
    boundaryUrl,
    selectedBarangayPsgc,
    className = 'h-[min(55vh,480px)] w-full min-h-[320px]',
}: {
    center: [number, number];
    markers: StationMarker[];
    selected?: { latitude: number; longitude: number } | null;
    selectedIconKey?: StationIconKey;
    selectedLogoUrl?: string | null;
    focusMarkerId?: number | string | null;
    focusPosition?: {
        latitude: number;
        longitude: number;
        zoom?: number;
    } | null;
    onPick?: (lat: number, lng: number) => void;
    onMarkerClick?: (markerId: number | string) => void;
    pickEnabled?: boolean;
    fitMarkers?: boolean;
    boundaryUrl?: string | null;
    selectedBarangayPsgc?: string | null;
    className?: string;
}) {
    const [fetchedBoundary, setFetchedBoundary] =
        useState<GeoJSON.FeatureCollection | null>(null);

    useEffect(() => {
        if (!boundaryUrl) {
            return;
        }

        let cancelled = false;

        fetch(boundaryUrl)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                return response.json();
            })
            .then((data) => {
                if (!cancelled) {
                    setFetchedBoundary(data);
                }
            })
            .catch((error) => {
                console.error(
                    '[Responde LGU] Failed to load station boundary',
                    error,
                );
            });

        return () => {
            cancelled = true;
        };
    }, [boundaryUrl]);

    const boundary = boundaryUrl ? fetchedBoundary : null;

    const outsideMask = useMemo(
        () => (boundary ? buildOutsideMask(boundary) : null),
        [boundary],
    );

    const focusedBoundary = useMemo(() => {
        if (!boundary || !selectedBarangayPsgc) {
            return boundary;
        }

        return {
            ...boundary,
            features: boundary.features.filter(
                (feature) =>
                    String(
                        (feature.properties as { psgc?: string } | null)?.psgc,
                    ) === selectedBarangayPsgc,
            ),
        };
    }, [boundary, selectedBarangayPsgc]);

    const focusMarker = useMemo(() => {
        if (focusMarkerId === null || focusMarkerId === undefined) {
            return null;
        }

        return (
            markers.find(
                (marker) => String(marker.id) === String(focusMarkerId),
            ) ?? null
        );
    }, [focusMarkerId, markers]);

    const markersForFit = useMemo(
        () =>
            selected
                ? [
                      ...markers,
                      {
                          id: '__selected_location__',
                          name: 'Selected location',
                          latitude: selected.latitude,
                          longitude: selected.longitude,
                      },
                  ]
                : markers,
        [markers, selected],
    );

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200">
            <MapContainer
                center={center}
                zoom={13}
                maxZoom={MAP_MAX_ZOOM}
                className={`z-0 ${className}`}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={MAP_MAX_ZOOM}
                    maxNativeZoom={MAP_MAX_ZOOM}
                />
                <LockToBoundary boundary={boundary} />
                {fitMarkers && <FitMarkers markers={markersForFit} />}
                <FocusMarker marker={focusMarker} />
                <FocusPosition position={focusPosition} />
                {outsideMask && (
                    <GeoJSON
                        data={outsideMask}
                        interactive={false}
                        style={OUTSIDE_MASK_STYLE}
                    />
                )}
                {focusedBoundary && (
                    <GeoJSON
                        data={focusedBoundary}
                        style={{
                            color: '#2563eb',
                            weight: 1.5,
                            fillColor: '#2563eb',
                            fillOpacity: 0.08,
                        }}
                    />
                )}
                {markers.map((marker) => (
                    <Marker
                        key={marker.id}
                        position={[marker.latitude, marker.longitude]}
                        icon={markerIcon(
                            marker.color,
                            marker.iconKey,
                            marker.logoUrl,
                        )}
                        title={marker.name}
                        eventHandlers={
                            onMarkerClick
                                ? {
                                      click: () => {
                                          console.log(
                                              '[Responde LGU] Station marker clicked',
                                              marker.id,
                                          );
                                          onMarkerClick(marker.id);
                                      },
                                  }
                                : undefined
                        }
                    >
                        <Tooltip direction="top" offset={[0, -52]}>
                            {marker.name}
                        </Tooltip>
                    </Marker>
                ))}
                {selected && (
                    <Marker
                        position={[selected.latitude, selected.longitude]}
                        icon={markerIcon(
                            '#2563eb',
                            selectedIconKey,
                            selectedLogoUrl,
                        )}
                    />
                )}
                {onPick && (
                    <ClickPicker enabled={pickEnabled} onPick={onPick} />
                )}
            </MapContainer>
            {pickEnabled && onPick ? (
                <p className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Click the map to place or move the station marker.
                </p>
            ) : null}
        </div>
    );
}

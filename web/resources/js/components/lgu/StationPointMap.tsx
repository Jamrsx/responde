import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import {
    GeoJSON,
    MapContainer,
    Marker,
    TileLayer,
    useMap,
    useMapEvents,
} from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

import { buildOutsideMask, OUTSIDE_MASK_STYLE } from '@/lib/mapMask';

type StationMarker = {
    id: number | string;
    name: string;
    latitude: number;
    longitude: number;
    color?: string;
};

function FitMarkers({
    markers,
}: {
    markers: StationMarker[];
}) {
    const map = useMap();
    const markerKey = markers
        .map(
            (marker) =>
                `${marker.id}:${marker.latitude}:${marker.longitude}`,
        )
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
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }, [markerKey, map]);

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
        map.setMinZoom(map.getBoundsZoom(lockedBounds));
        console.log('[Responde LGU] Station map locked to LGU bounds');
    }, [boundary, map]);

    return null;
}

const markerIcon = (color = '#e0752e') =>
    L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
    });

export default function StationPointMap({
    center,
    markers,
    selected,
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
                        (feature.properties as { psgc?: string } | null)
                            ?.psgc,
                    ) === selectedBarangayPsgc,
            ),
        };
    }, [boundary, selectedBarangayPsgc]);

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200">
            <MapContainer
                center={center}
                zoom={13}
                className={`z-0 ${className}`}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LockToBoundary boundary={boundary} />
                {fitMarkers && <FitMarkers markers={markers} />}
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
                        icon={markerIcon(marker.color)}
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
                    />
                ))}
                {selected && (
                    <Marker
                        position={[selected.latitude, selected.longitude]}
                        icon={markerIcon('#2563eb')}
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

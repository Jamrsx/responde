import L from 'leaflet';
import { Fragment, useEffect, useMemo } from 'react';
import {
    Circle,
    MapContainer,
    Marker,
    TileLayer,
    Tooltip,
    useMap,
} from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

import { MAP_FIT_MAX_ZOOM, MAP_MAX_ZOOM } from '@/lib/mapZoom';

export type HighRiskMapItem = {
    id: string;
    latitude: number;
    longitude: number;
    radius_meters: number;
    count: number;
    name: string;
    category: 'accident' | 'fire';
    severity: 'high' | 'warning';
};

const categoryColors = {
    accident: {
        high: { stroke: '#b91c1c', fill: '#ef4444', marker: '#dc2626' },
        warning: { stroke: '#b91c1c', fill: '#fca5a5', marker: '#f87171' },
    },
    fire: {
        high: { stroke: '#c2410c', fill: '#fb923c', marker: '#ea580c' },
        warning: { stroke: '#c2410c', fill: '#fdba74', marker: '#f97316' },
    },
} as const;

function FitItems({ items }: { items: HighRiskMapItem[] }) {
    const map = useMap();
    const itemKey = items
        .map(
            (item) =>
                `${item.id}:${item.latitude}:${item.longitude}:${item.radius_meters}`,
        )
        .join('|');

    useEffect(() => {
        if (!itemKey) {
            return;
        }

        const bounds = L.latLngBounds([]);

        items.forEach((item) => {
            bounds.extend(
                L.latLng(item.latitude, item.longitude).toBounds(
                    Math.max(item.radius_meters, 120) * 2.2,
                ),
            );
        });

        if (bounds.isValid()) {
            map.fitBounds(bounds, {
                padding: [48, 48],
                maxZoom: MAP_FIT_MAX_ZOOM,
            });
        }
    }, [itemKey, items, map]);

    return null;
}

function FocusItem({ item }: { item: HighRiskMapItem | null }) {
    const map = useMap();
    const focusKey = item
        ? `${item.id}:${item.latitude}:${item.longitude}`
        : '';

    useEffect(() => {
        if (!item || !focusKey) {
            return;
        }

        map.flyTo(
            [item.latitude, item.longitude],
            Math.max(map.getZoom(), item.severity === 'warning' ? 16 : 15),
            { duration: 0.45 },
        );
        console.log('[Responde Chief] Focused high-risk map item', item.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusKey, map]);

    return null;
}

const countMarkerIcon = (
    count: number,
    selected: boolean,
    category: HighRiskMapItem['category'],
    severity: HighRiskMapItem['severity'],
) => {
    const palette = categoryColors[category][severity];
    const size = severity === 'warning' ? 28 : 42;
    const fontSize = severity === 'warning' ? 11 : 13;

    return L.divIcon({
        className: 'leaflet-div-icon responde-high-risk-marker',
        html: `<div style="display:flex;width:${size}px;height:${size}px;align-items:center;justify-content:center;border-radius:9999px;background:${selected ? palette.stroke : palette.marker};border:3px solid white;color:white;font-weight:700;font-size:${fontSize}px;box-shadow:0 3px 8px rgba(0,0,0,.35)">${count}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        tooltipAnchor: [0, -(size / 2 + 4)],
    });
};

export default function HighRiskAreaMap({
    center,
    items,
    selectedId = null,
    onItemClick,
    className = 'h-[min(60vh,560px)] w-full min-h-[360px]',
}: {
    center: [number, number];
    items: HighRiskMapItem[];
    selectedId?: string | null;
    onItemClick?: (itemId: string) => void;
    className?: string;
}) {
    const selectedItem = useMemo(
        () => items.find((item) => item.id === selectedId) ?? null,
        [items, selectedId],
    );

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200">
            <MapContainer
                center={center}
                zoom={6}
                maxZoom={MAP_MAX_ZOOM}
                className={`z-0 ${className}`}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={MAP_MAX_ZOOM}
                    maxNativeZoom={MAP_MAX_ZOOM}
                />
                {items.length > 0 && <FitItems items={items} />}
                <FocusItem item={selectedItem} />
                {items.map((item) => {
                    const selected = item.id === selectedId;
                    const palette =
                        categoryColors[item.category][item.severity];

                    return (
                        <Fragment key={item.id}>
                            {item.severity === 'high' && (
                                <Circle
                                    center={[item.latitude, item.longitude]}
                                    radius={item.radius_meters}
                                    pathOptions={{
                                        color: selected
                                            ? palette.stroke
                                            : palette.marker,
                                        weight: selected ? 3 : 2,
                                        fillColor: palette.fill,
                                        fillOpacity: selected ? 0.28 : 0.18,
                                    }}
                                    eventHandlers={
                                        onItemClick
                                            ? {
                                                  click: () => {
                                                      console.log(
                                                          '[Responde Chief] High-risk circle clicked',
                                                          item.id,
                                                      );
                                                      onItemClick(item.id);
                                                  },
                                              }
                                            : undefined
                                    }
                                />
                            )}
                            <Marker
                                position={[item.latitude, item.longitude]}
                                icon={countMarkerIcon(
                                    item.count,
                                    selected,
                                    item.category,
                                    item.severity,
                                )}
                                eventHandlers={
                                    onItemClick
                                        ? {
                                              click: () => {
                                                  console.log(
                                                      '[Responde Chief] High-risk marker clicked',
                                                      item.id,
                                                  );
                                                  onItemClick(item.id);
                                              },
                                          }
                                        : undefined
                                }
                            >
                                <Tooltip direction="top" offset={[0, -16]}>
                                    {item.name}
                                </Tooltip>
                            </Marker>
                        </Fragment>
                    );
                })}
            </MapContainer>
        </div>
    );
}

// Builds a world-sized polygon with the given features cut out as holes,
// so everything outside the LGU boundary can be visually hidden on the map.
export function buildOutsideMask(
    collection: GeoJSON.FeatureCollection,
): GeoJSON.Feature<GeoJSON.Polygon> | null {
    const worldRing: GeoJSON.Position[] = [
        [-180, -90],
        [180, -90],
        [180, 90],
        [-180, 90],
        [-180, -90],
    ];
    const holes: GeoJSON.Position[][] = [];

    for (const feature of collection.features) {
        const geometry = feature.geometry;

        // GeoJSON allows null geometry (e.g. incomplete features).
        if (!geometry) {
            continue;
        }

        if (geometry.type === 'Polygon' && geometry.coordinates[0]?.length) {
            holes.push(geometry.coordinates[0]);
        } else if (geometry.type === 'MultiPolygon') {
            for (const polygon of geometry.coordinates) {
                if (polygon[0]?.length) {
                    holes.push(polygon[0]);
                }
            }
        }
    }

    if (holes.length === 0) {
        return null;
    }

    return {
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'Polygon',
            coordinates: [worldRing, ...holes],
        },
    };
}

export const OUTSIDE_MASK_STYLE = {
    stroke: false,
    fillColor: '#f1f5f9',
    fillOpacity: 1,
} as const;

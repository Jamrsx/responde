// Builds and stores nationwide Philippine municipality/city GeoJSON directly
// in the database for the Responde LGU map picker.
//
// Sources:
// 1. faeldon/philippines-json-maps (municipality / component-city polygons)
// 2. bendlikeabamboo/barangay-boundaries-repository (HUCs + ICCs that are
//    missing from source #1 — e.g. Cagayan de Oro, Iligan, Davao City)
//
// Run with: node scripts/build-ph-municities.mjs

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API_BASE =
    'https://api.github.com/repos/faeldon/philippines-json-maps/contents/2023/geojson';
const HUC_RELEASE =
    'https://github.com/bendlikeabamboo/barangay-boundaries-repository/releases/download/v2026.4.13.0';
const HEADERS = { 'User-Agent': 'responde-map-builder' };

const REGION_NAMES = {
    '01': 'Region I (Ilocos Region)',
    '02': 'Region II (Cagayan Valley)',
    '03': 'Region III (Central Luzon)',
    '04': 'Region IV-A (CALABARZON)',
    '05': 'Region V (Bicol Region)',
    '06': 'Region VI (Western Visayas)',
    '07': 'Region VII (Central Visayas)',
    '08': 'Region VIII (Eastern Visayas)',
    '09': 'Region IX (Zamboanga Peninsula)',
    '10': 'Region X (Northern Mindanao)',
    '11': 'Region XI (Davao Region)',
    '12': 'Region XII (SOCCSKSARGEN)',
    '13': 'National Capital Region (NCR)',
    '14': 'Cordillera Administrative Region (CAR)',
    '15': 'Bangsamoro (BARMM)',
    '16': 'Region XIII (Caraga)',
    '17': 'MIMAROPA Region',
    '19': 'Negros Island Region (NIR)',
};

async function fetchJson(url, attempts = 3) {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            const response = await fetch(url, { headers: HEADERS });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} for ${url}`);
            }

            return await response.json();
        } catch (error) {
            if (attempt === attempts) {
                throw error;
            }

            console.warn(`  Retry ${attempt} for ${url}: ${error.message}`);
            await new Promise((resolve) => setTimeout(resolve, 1_000 * attempt));
        }
    }
}

function regionNameFor(psgc) {
    const code = String(psgc).replace(/\D/g, '').padStart(10, '0').slice(0, 2);

    return REGION_NAMES[code] ?? `Region ${code}`;
}

function normalizeName(name) {
    return String(name)
        .toLowerCase()
        .replace(/\s*\(capital\)\s*/gi, ' ')
        .replace(/\s*\(dadiangas\)\s*/gi, ' ')
        .replace(/\s*\(opon\)\s*/gi, ' ')
        .replace(/\bcity of\b/g, '')
        .replace(/\bcity\b/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function cleanDisplayName(name) {
    return String(name)
        .replace(/\s*\(Capital\)\s*/gi, '')
        .replace(/\s*\(Dadiangas\)\s*/gi, '')
        .replace(/\s*\(Opon\)\s*/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function featureKey(name, province) {
    return `${normalizeName(name)}|${normalizeName(province ?? '')}`;
}

console.log('Fetching province name lookup (region-level files)...');
const regionFiles = await fetchJson(`${API_BASE}/regions/lowres`);
const provinceNames = new Map();

for (const file of regionFiles) {
    if (!file.name.startsWith('provdists-region-')) {
        continue;
    }

    const geo = await fetchJson(file.download_url);

    for (const feature of geo.features ?? []) {
        provinceNames.set(
            feature.properties.adm2_psgc,
            feature.properties.adm2_en,
        );
    }
}

console.log(`Resolved ${provinceNames.size} province/district names.`);

console.log('Fetching municipality/city polygons (province-level files)...');
const provinceFiles = await fetchJson(`${API_BASE}/provdists/lowres`);
const municityFiles = provinceFiles.filter((file) =>
    file.name.startsWith('municities-provdist-'),
);

const features = [];
const seenKeys = new Set();
const seenPsgc = new Set();
let processed = 0;

for (const file of municityFiles) {
    const geo = await fetchJson(file.download_url);

    if (!Array.isArray(geo?.features)) {
        console.warn(`  Skipping ${file.name}: no features array`);
        continue;
    }

    for (const feature of geo.features) {
        const props = feature.properties;
        const name = props.adm3_en;
        const province = provinceNames.get(props.adm2_psgc) ?? null;
        const psgc = String(props.adm3_psgc);

        features.push({
            type: 'Feature',
            properties: {
                psgc,
                name,
                level: props.geo_level === 'City' ? 'City' : props.geo_level,
                province,
                region: regionNameFor(props.adm1_psgc),
                area_km2: props.area_km2,
            },
            geometry: feature.geometry,
        });

        seenKeys.add(featureKey(name, province));
        seenPsgc.add(psgc);
    }

    processed += 1;

    if (processed % 10 === 0) {
        console.log(`  ${processed}/${municityFiles.length} provinces merged...`);
    }
}

console.log(
    `Base municipalities/cities loaded: ${features.length}. Filling HUC/ICC gaps...`,
);

const gapFiles = [
    {
        url: `${HUC_RELEASE}/highly_urbanized_cities.geojson`,
        level: 'City',
        label: 'Highly Urbanized City',
    },
    {
        url: `${HUC_RELEASE}/independent_component_cities.geojson`,
        level: 'City',
        label: 'Independent Component City',
    },
];

let added = 0;

for (const source of gapFiles) {
    const geo = await fetchJson(source.url);

    for (const feature of geo.features ?? []) {
        const props = feature.properties;
        const name = cleanDisplayName(
            props.psgc_name ?? props.ADM3_EN ?? props.ADM2_EN,
        );
        const province =
            props.province && props.province !== 'null'
                ? props.province
                : props.ADM2_EN && !/not a province/i.test(props.ADM2_EN)
                  ? props.ADM2_EN
                  : null;
        const psgc = String(props.psgc_code ?? '').replace(/\D/g, '');
        const key = featureKey(name, province);

        if (
            (psgc && seenPsgc.has(psgc)) ||
            seenKeys.has(key) ||
            seenKeys.has(featureKey(name, null))
        ) {
            continue;
        }

        // Skip ICC records that are province-shaped wrappers without city ADM3.
        if (!feature.geometry || feature.geometry.type === 'GeometryCollection') {
            continue;
        }

        features.push({
            type: 'Feature',
            properties: {
                psgc: psgc || `huc-${normalizeName(name).replace(/\s+/g, '-')}`,
                name,
                level: source.level,
                classification: source.label,
                province,
                region: props.region ?? props.ADM1_EN ?? regionNameFor(psgc),
                area_km2: Math.round(props.AREA_SQKM ?? 0),
            },
            geometry: feature.geometry,
        });

        seenKeys.add(key);

        if (psgc) {
            seenPsgc.add(psgc);
        }

        added += 1;
        console.log(`  + ${name} (${source.label})`);
    }
}

features.sort((a, b) => a.properties.name.localeCompare(b.properties.name));

console.log('Attaching postal / ZIP codes...');
const cities = await fetchJson(
    'https://cdn.jsdelivr.net/npm/ph-addresses-locations/data/cities.json',
);
const zipByPsgc = new Map();
const zipByName = new Map();

for (const city of cities) {
    if (!city.zipCode) {
        continue;
    }

    const psgc = String(city.code ?? '').replace(/\D/g, '');
    const nameKey = normalizeName(city.name);

    if (psgc) {
        zipByPsgc.set(psgc, String(city.zipCode).trim());
    }

    if (nameKey) {
        zipByName.set(nameKey, String(city.zipCode).trim());
    }
}

let withZip = 0;

for (const feature of features) {
    const psgc = String(feature.properties.psgc ?? '').replace(/\D/g, '');
    const postal =
        zipByPsgc.get(psgc) ??
        zipByName.get(normalizeName(feature.properties.name)) ??
        null;

    feature.properties.postal_code = postal;

    if (postal) {
        withZip += 1;
    }
}

console.log(`Postal codes attached to ${withZip}/${features.length} LGUs.`);

const collection = { type: 'FeatureCollection', features };
const payload = JSON.stringify(collection);

const store = spawnSync(
    'php',
    ['artisan', 'maps:store-asset', 'ph-municities'],
    {
        cwd: ROOT,
        input: payload,
        encoding: 'utf8',
        stdio: ['pipe', 'inherit', 'inherit'],
        shell: process.platform === 'win32',
        maxBuffer: 64 * 1024 * 1024,
    },
);

if (store.error) {
    throw store.error;
}

if (store.status !== 0) {
    throw new Error(`Database map storage failed with exit code ${store.status}`);
}

console.log(
    `Done. Stored ${features.length} LGU polygons (+${added} HUC/ICC) (${(payload.length / 1024 / 1024).toFixed(1)} MB) in the database.`,
);

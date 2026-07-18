// Builds public/maps/barangays/{psgc}.json — per-LGU barangay GeoJSON.
// Source: faeldon/philippines-json-maps municity barangay files (lowres).
//
// Usage:
//   node scripts/build-ph-barangays.mjs
//   node scripts/build-ph-barangays.mjs 1030500000

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API_BASE =
    'https://api.github.com/repos/faeldon/philippines-json-maps/contents/2023/geojson/municities/lowres';
const HEADERS = { 'User-Agent': 'responde-barangay-map-builder' };
const onlyPsgc = process.argv[2] ? String(process.argv[2]).replace(/\D/g, '') : null;
const concurrency = Math.max(
    1,
    Math.min(25, Number(process.env.MAP_CONCURRENCY ?? 10)),
);

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

            console.warn(`  Retry ${attempt}: ${error.message}`);
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
    }
}

console.log('Listing municity barangay GeoJSON files...');
const files = await fetchJson(API_BASE);
const barangayFiles = files.filter((file) =>
    file.name.startsWith('bgysubmuns-municity-'),
);

const outputDir = join(ROOT, 'public', 'maps', 'barangays');
mkdirSync(outputDir, { recursive: true });

let written = 0;
let failed = 0;

const selectedFiles = barangayFiles.filter((file) => {
    const match = file.name.match(/bgysubmuns-municity-(\d+)/);
    const psgc = match?.[1];

    if (!psgc) {
        return false;
    }

    return !onlyPsgc || psgc === onlyPsgc;
});

console.log(
    `Found ${selectedFiles.length} map file(s). Downloading ${concurrency} at a time...`,
);

async function processFile(file) {
    const psgc = file.name.match(/bgysubmuns-municity-(\d+)/)?.[1];

    try {
        const geo = await fetchJson(file.download_url);
        const features = (geo.features ?? []).map((feature) => ({
            type: 'Feature',
            properties: {
                psgc: String(feature.properties.adm4_psgc),
                name: feature.properties.adm4_en,
                lgu_psgc: String(
                    feature.properties.adm3_psgc ??
                        feature.properties.adm2_psgc,
                ),
                area_km2: feature.properties.area_km2 ?? 0,
            },
            geometry: feature.geometry,
        }));

        const collection = {
            type: 'FeatureCollection',
            properties: {
                lgu_psgc: psgc,
                count: features.length,
            },
            features,
        };

        writeFileSync(
            join(outputDir, `${psgc}.json`),
            JSON.stringify(collection),
        );
        written += 1;
    } catch (error) {
        failed += 1;
        console.error(`\nFailed PSGC ${psgc}: ${error.message}`);
    } finally {
        const completed = written + failed;
        const percentage =
            selectedFiles.length === 0
                ? 100
                : Math.round((completed / selectedFiles.length) * 100);
        process.stdout.write(
            `\r${completed}/${selectedFiles.length} (${percentage}%) complete`,
        );
    }
}

for (let index = 0; index < selectedFiles.length; index += concurrency) {
    const batch = selectedFiles.slice(index, index + concurrency);
    await Promise.all(batch.map(processFile));
}

if (selectedFiles.length > 0) {
    process.stdout.write('\n');
}

console.log(
    `Done. Wrote ${written} map file(s); ${failed} failed. Output: ${outputDir}`,
);

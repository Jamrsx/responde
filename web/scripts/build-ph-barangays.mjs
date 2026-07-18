// Backward-compatible wrapper. Barangay maps now live only in the database.
//
// Usage:
//   node scripts/build-ph-barangays.mjs
//   node scripts/build-ph-barangays.mjs 1030500000

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const psgc = process.argv[2]
    ? String(process.argv[2]).replace(/\D/g, '')
    : null;
const artisanArguments = [
    'artisan',
    'maps:sync-barangays',
    psgc ? `--psgc=${psgc}` : '--all',
];

console.log('Barangay maps are stored directly in the database.');

const result = spawnSync('php', artisanArguments, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
});

if (result.error) {
    console.error(`Unable to run Artisan: ${result.error.message}`);
    process.exit(1);
}

process.exit(result.status ?? 1);

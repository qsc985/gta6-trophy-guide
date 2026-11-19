// Leonida Ledger — gta6-trophy-guide-01 entry program (Node 22, standard library only).
//
// The guide is this directory's app/ folder: plain static files that open at
// app/index.html in a desktop browser and work with the network off. Its trophy
// list and guides live in app/data/trophies.json. This program hands the entry
// in: it copies app/ and screenshots/ from beside this file into the output
// directory and writes dossier.json there with the vendored make.fun library
// (vendor/makefun-frontend.ts, unchanged). Before copying, it validates the
// entry the way the scorer will: 55 trophies each with a non-empty guide, and
// 3–4 screenshots each no bigger than 256 KiB. Outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Validate first, so a broken entry fails loudly instead of handing in bad bytes.
const trophyDoc = JSON.parse(readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf8'));
const trophies = trophyDoc.trophies ?? trophyDoc;
if (!Array.isArray(trophies) || trophies.length !== 55) {
  throw new Error(`expected 55 trophies, found ${Array.isArray(trophies) ? trophies.length : 'not an array'}`);
}
const unguided = trophies.filter((t) => typeof t.guide !== 'string' || !t.guide.trim()).map((t) => t.name);
if (unguided.length > 0) throw new Error(`trophies without a guide: ${unguided.join(', ')}`);
const shotNames = readdirSync(join(here, 'screenshots')).filter((n) => !n.startsWith('.')).sort();
if (shotNames.length < 3 || shotNames.length > 4) {
  throw new Error(`expected 3-4 screenshots, found ${shotNames.length}`);
}
for (const name of shotNames) {
  const size = statSync(join(here, 'screenshots', name)).size;
  if (size > 262144) throw new Error(`screenshot ${name} is ${size} bytes, over the 256 KiB cap`);
}

mkdirSync(out, { recursive: true });
rmSync(join(out, 'app'), { recursive: true, force: true });
rmSync(join(out, 'screenshots'), { recursive: true, force: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps: only text_max_bytes shapes the bytes; the others
// refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files and directories in app/ or 48 MiB of app files).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);

console.log(`gta6-trophy-guide-01: 55 trophies, ${shotNames.length} screenshots, dossier written to ${out}/dossier.json`);

// Whisper Thief — the entrypoint: hand the game in. It decodes the
// screenshots from single-line base64 text (assets/*.jpg.b64) back into
// screenshots/*.jpg when they are missing, copies game/ and screenshots/
// from beside this file into /output, and writes the dossier the judge
// reads, built by the vendored make.fun library. Run it anywhere with:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// (Inside the grader, /output is used when the variable is unset.)

import { buildDossier } from './vendor/makefun-game.ts';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// [base64 text asset, binary file it decodes to]
const ASSETS: Array<[string, string]> = [
  ['assets/1-start.jpg.b64', 'screenshots/1-start.jpg'],
  ['assets/2-play.jpg.b64', 'screenshots/2-play.jpg'],
  ['assets/3-alert.jpg.b64', 'screenshots/3-alert.jpg'],
  ['assets/4-end.jpg.b64', 'screenshots/4-end.jpg'],
];

function fail(message: string): never {
  throw new Error(`best-stealth-game-20261121-1759: ${message}`);
}

// 1. Decode every base64 text asset back to its screenshot, but only when
// the binary is missing. When it is already there (committed in the repo),
// verify it matches the decoded bytes and do not rewrite it — the grader
// runs the repository read-only.
for (const [encoded, target] of ASSETS) {
  const encodedPath = join(here, encoded);
  if (!existsSync(encodedPath)) fail(`missing asset ${encoded}`);
  const text = readFileSync(encodedPath, 'utf8').trim();
  const bytes = Buffer.from(text, 'base64');
  if (bytes.length === 0) fail(`asset ${encoded} decoded to 0 bytes`);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    fail(`asset ${encoded} decoded to a file that is not a JPEG`);
  }
  const targetPath = join(here, target);
  if (existsSync(targetPath)) {
    const existing = readFileSync(targetPath);
    if (!existing.equals(bytes)) {
      fail(`asset ${encoded} does not match ${target}`);
    }
    continue;
  }
  mkdirSync(join(here, target.split('/').slice(0, -1).join('/')), {
    recursive: true,
  });
  writeFileSync(targetPath, bytes);
}

// 2. Hand in game/ + screenshots/ to the output directory.
mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), {
    recursive: true,
  });
}

// The gate's own caps, as the kit's RULES.txt states them: at most 4 screenshots
// of 256 KiB, a game/ of at most 993 files and 48 MiB, paths under 1000 bytes.
// The handoff is deterministic: game/ and screenshots/ are copied, never
// generated, so two runs write the same bytes.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(
  `Whisper Thief handed in: game/ + ${'screenshots/'} + dossier.json (${dossier.length} bytes) -> ${out}`,
);

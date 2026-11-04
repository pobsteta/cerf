// Mission 039 : le README existe et ses adresses sont celles des workflows et de outils/flashcodes.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { flashcodes } from '../outils/flashcodes.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const readme = existsSync(join(RACINE, 'README.md')) ? readFileSync(join(RACINE, 'README.md'), 'utf8') : '';

test('le README existe et renvoie à la spec et au brief', () => {
  assert.ok(readme.length > 0);
  assert.match(readme, /docs\/spec\.md/);
  assert.match(readme, /docs\/brief\.md/);
});

test('les adresses des flashcodes stables et de la mise à jour figurent dans le README', () => {
  for (const type of ['plugin', 'projet']) {
    for (const f of flashcodes(type, 'stable')) assert.ok(readme.includes(f.url), f.url);
  }
  assert.ok(readme.includes(flashcodes('plugin', 'essai')[0].url));
  assert.ok(readme.includes(flashcodes('manuel-geojson', 'stable')[0].url));
  assert.ok(readme.includes('https://github.com/pobsteta/cerf/releases/download/projet-modele/projet-cerf-mise-a-jour.zip'));
});

test('le README ne contient ni clé ni jeton', () => {
  assert.doesNotMatch(readme, /ghp_|apikey|secret|token/i);
});

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

test('la version du plugin annoncée est celle de plugin/metadata.txt', () => {
  const meta = readFileSync(join(RACINE, 'plugin', 'metadata.txt'), 'utf8');
  const version = /^version=(.+)$/m.exec(meta)[1].trim();
  assert.ok(readme.includes(`Le plugin ${version} (sur \`main\`)`), version);
});

test('le plafond cité est PLAFOND_LISTAGE_OCTETS', async () => {
  const { PLAFOND_LISTAGE_OCTETS } = await import('../plugin/cerf-logique.mjs');
  assert.equal(PLAFOND_LISTAGE_OCTETS, 10000000);
  assert.ok(readme.includes('10 Mo'));
  assert.ok(readme.includes(PLAFOND_LISTAGE_OCTETS.toLocaleString('fr-FR').replace(/\s/g, ' ')) || readme.includes('10 000 000'));
});

test('les champs de code et les messages de retrait cités existent dans le code', async () => {
  const { CHAMPS_CODE } = await import('../plugin/cerf-styles.mjs');
  for (const c of Object.values(CHAMPS_CODE)) assert.ok(readme.includes('`' + c + '`'), c);
  const src = readFileSync(join(RACINE, 'plugin', 'cerf-logique.mjs'), 'utf8');
  for (const m of ["Fichiers restés sur l'appareil", "Copie conservée sur l'appareil"]) {
    assert.ok(readme.includes(m) && src.includes(m), m);
  }
});

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

test('mission 041 : .qml du zip non pris en charge, message sans couche, Shapefile confirmé', async () => {
  const src = readFileSync(join(RACINE, 'plugin', 'cerf-logique.mjs'), 'utf8');
  const spec = readFileSync(join(RACINE, 'docs', 'spec.md'), 'utf8');
  const { AVERTISSEMENT_QML_ILLISIBLE } = await import('../plugin/cerf-styles.mjs');
  const msg = 'Aucune couche GeoJSON, Shapefile, GeoPackage ou GeoTIFF dans';
  assert.ok(src.includes(msg), 'le code ne contient plus le message « Aucune couche … dans »');
  assert.ok(readme.includes(msg), 'le README ne cite pas le message « Aucune couche … dans » du code');
  assert.ok(spec.includes(msg), 'la spec ne cite pas le message « Aucune couche … dans » du code');
  assert.ok(readme.includes("pas pris en charge pour l'instant"), "le README ne dit plus « pas pris en charge pour l'instant »");
  assert.ok(spec.includes("non pris en charge pour l'instant"), "la spec ne dit plus « non pris en charge pour l'instant »");
  assert.ok(!readme.includes('remplace la règle'), 'le README dit encore que le .qml remplace la règle');
  assert.ok(!spec.includes("À l'étude, non tranché"), 'la spec dit encore « À l\'étude, non tranché »');
  assert.ok(readme.includes("confirmée sur l'appareil"), "le README ne dit plus « confirmée sur l'appareil » pour le Shapefile");
  assert.ok(readme.includes(AVERTISSEMENT_QML_ILLISIBLE), "le README ne cite pas l'avertissement AVERTISSEMENT_QML_ILLISIBLE du code");
  assert.ok(spec.includes(AVERTISSEMENT_QML_ILLISIBLE), "la spec ne cite pas l'avertissement AVERTISSEMENT_QML_ILLISIBLE du code");
  const illisibles = 'tables illisibles, couche non chargée';
  assert.ok(src.includes(illisibles), 'le code ne contient plus « tables illisibles, couche non chargée »');
  assert.ok(spec.includes(illisibles), 'la spec ne cite pas « tables illisibles, couche non chargée » comme le code');
});

test('mission 042 : .json non GeoJSON, comportement réel sur l\'appareil, cité comme le code', () => {
  const src = readFileSync(join(RACINE, 'plugin', 'cerf-logique.mjs'), 'utf8');
  const spec = readFileSync(join(RACINE, 'docs', 'spec.md'), 'utf8');
  assert.ok(src.includes("if (typeof texte === 'string' && !ctx.styles.estGeoJson(texte)) continue;"), 'le code n\'écarte plus un .json par son contenu comme la doc le décrit : relire README et spec § 3.1');
  assert.ok(!readme.includes('est ignoré sans message'), 'le README dit encore qu\'un .json non GeoJSON est ignoré sans message');
  assert.ok(!spec.includes('est ignoré en\n    silence ;'), 'la spec dit encore sans réserve qu\'un .json non GeoJSON est ignoré en silence');
  assert.ok(readme.includes(': illisible'), 'le README ne cite pas le message « : illisible » du .json');
  assert.ok(spec.includes('5 novembre 2026') && spec.includes('le **refuse**'), 'la spec ne dit pas que le .json est refusé');
  const claude = readFileSync(join(RACINE, 'CLAUDE.md'), 'utf8');
  assert.ok(!claude.includes('dans le zip surcharge la règle'), 'CLAUDE.md dit encore que le .qml du zip surcharge la règle');
});

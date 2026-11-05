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

// Mission 043 : les flashcodes affichés dans le README sont décodables et collés à leur adresse.
// Même règle que tests/flashcodes.test.mjs : sans zbarimg, décodage sauté, sauf CERF_FLASHCODES_EXIGER=1.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { decoder } from '../outils/flashcodes.mjs';

const ZBAR = !spawnSync('zbarimg', ['--version'], { stdio: 'ignore' }).error;
const DOSSIER_QR = join(RACINE, 'docs', 'flashcodes');
const TYPES_QR = ['projet', 'plugin', 'manuel', 'manuel-geojson'];
const stables = TYPES_QR.flatMap((t) => flashcodes(t, 'stable'));

test('mission 043 : le dossier docs/flashcodes ne contient que les SVG des flashcodes stables du README', () => {
  const attendus = stables.map((f) => `${f.nom}.svg`).sort();
  const reels = existsSync(DOSSIER_QR) ? readdirSync(DOSSIER_QR).sort() : [];
  assert.deepEqual(reels, attendus, 'docs/flashcodes doit contenir exactement ces SVG (générés par outils/flashcodes.mjs)');
});

for (const f of stables) {
  test(`mission 043 : ${f.nom}.svg décode l'adresse stable`, { skip: ZBAR ? false : 'zbarimg absent' }, () => {
    assert.equal(decoder(join(DOSSIER_QR, `${f.nom}.svg`)), f.url, `${f.nom}.svg ne décode pas ${f.url} : regénérer avec outils/flashcodes.mjs`);
  });

  test(`mission 043 : le README montre ${f.nom}.svg près de ${f.url}`, () => {
    const img = `docs/flashcodes/${f.nom}.svg`;
    const iAdresse = readme.indexOf(f.url);
    const iImage = readme.indexOf(img);
    assert.ok(iAdresse >= 0, `adresse absente du README : ${f.url}`);
    assert.ok(iImage >= 0, `image absente du README : ${img}`);
    assert.ok(Math.abs(iImage - iAdresse) < 500, `${img} est trop loin de ${f.url} dans le README`);
    assert.match(readme, new RegExp(`<img src="${img.replace(/\./g, '\\.')}"[^>]*alt="[^"]+"`), `${img} sans texte alternatif`);
  });
}

test('mission 043 : plus de flashcode « joint à la release » seul dans le README', () => {
  assert.ok(!/\(`flashcode-(projet|plugin)\.png`, joint/.test(readme), 'le README renvoie encore au seul flashcode joint à la release');
});

test('mission 043 : les décodages ne sont pas sautés quand on les exige', () => {
  if (process.env.CERF_FLASHCODES_EXIGER === '1') assert.ok(ZBAR, 'zbarimg doit être installé');
});

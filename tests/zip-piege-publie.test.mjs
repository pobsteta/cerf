// Mission 040 : piege.zip (zip de recette, mission 016) publié dans la préversion « essai-manuel »,
// avec son flashcode et les lignes attendues dans les notes. Le contenu du zip n'est pas changé ;
// les deux autres zips non plus (sha256 fixés).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fabriquerPiege } from '../outils/zips-recette.mjs';
import { fabriquerManuel, fabriquerManuelGeojson } from '../outils/zip-essai-manuel.mjs';
import { flashcodes, generer, verifier, notes } from '../outils/flashcodes.mjs';

const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const racine = new URL('..', import.meta.url).pathname;
const wf = readFileSync(join(racine, '.github', 'workflows', 'release-essai-manuel.yml'), 'utf8');
const wfCode = wf.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

test('piege.zip : reproductible (mêmes octets), huit entrées exactes, unzip -t valide', () => {
  const a = mkdtempSync(join(tmpdir(), 'cerf-t040a-')); const b = mkdtempSync(join(tmpdir(), 'cerf-t040b-'));
  try {
    const ca = fabriquerPiege(a); const cb = fabriquerPiege(b);
    assert.equal(sha(ca), sha(cb));
    const r = spawnSync('unzip', ['-Z1', ca], { encoding: 'utf8' });
    if (!r.error) {
      assert.deepEqual(r.stdout.trim().split('\n'), [
        'FRT_sans_georef.tif', 'Parcelles_sans_prj.cpg', 'Parcelles_sans_prj.dbf', 'Parcelles_sans_prj.shp', 'Parcelles_sans_prj.shx',
        'UG_sans_crs.geojson', 'UG_vide.geojson', 'Zone_inconnue.geojson',
      ]);
      assert.equal(spawnSync('unzip', ['-tq', ca]).status, 0);
    } else assert.ok(!process.env.CI, 'unzip absent');
  } finally { rmSync(a, { recursive: true, force: true }); rmSync(b, { recursive: true, force: true }); }
});

test('les deux autres zips ne changent pas d\'un octet', () => {
  const d = mkdtempSync(join(tmpdir(), 'cerf-t040m-'));
  try {
    assert.equal(sha(fabriquerManuel(d)), '1248dc9b96c6a56d92aa42631e929b4538f4872a51d53350406d0d0ac100f793');
    assert.equal(sha(fabriquerManuelGeojson(d)), '521cd33cd0ffce76368e25b42d3f9787aea76469b1bf56b81a9d3e872f20b1a9');
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('flashcode : l\'adresse de piege.zip dans la préversion essai-manuel (jamais latest), les autres inchangés', () => {
  assert.deepEqual(flashcodes('piege', 'essai').map((f) => f.url), ['https://github.com/pobsteta/cerf/releases/download/essai-manuel/piege.zip']);
  assert.deepEqual(flashcodes('piege', 'stable').map((f) => f.url), flashcodes('piege', 'essai').map((f) => f.url));
  assert.equal(flashcodes('piege', 'essai')[0].nom, 'flashcode-piege');
  assert.deepEqual(flashcodes('manuel', 'essai').map((f) => f.url), ['https://github.com/pobsteta/cerf/releases/download/essai-manuel/essai-manuel.zip']);
  assert.match(notes('piege', 'essai', 'essai-manuel'), /essai-manuel\/flashcode-piege\.png/);
});

const OUTILS = !spawnSync('qrencode', ['--version'], { stdio: 'ignore' }).error && !spawnSync('zbarimg', ['--version'], { stdio: 'ignore' }).error;
test('flashcode : PNG et SVG décodés donnent exactement l\'adresse de piege.zip', { skip: OUTILS ? false : 'qrencode ou zbarimg absent' }, () => {
  const d = mkdtempSync(join(tmpdir(), 'cerf-t040f-'));
  try {
    assert.equal(generer(d, 'piege', 'essai').length, 2);
    assert.deepEqual(verifier(d, 'piege', 'essai'), []);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('workflow : fabrique piege.zip avec zips-recette.mjs, flashcode contrôlé, tout publié dans essai-manuel', () => {
  assert.match(wfCode, /branches: \[[^\]]*'mission\/040-publier-piege'(, 'mission\/047-styles-gpkg')?\]/);
  assert.match(wfCode, /node --no-warnings outils\/zips-recette\.mjs dist piege/);
  assert.match(wfCode, /node outils\/flashcodes\.mjs generer dist\/flashcodes-piege piege essai/);
  assert.match(wfCode, /node outils\/flashcodes\.mjs verifier dist\/flashcodes-piege piege essai/);
  assert.match(wfCode, /gh release create essai-manuel dist\/essai-manuel\.zip dist\/flashcodes\/\* dist\/essai-manuel-geojson\.zip dist\/flashcodes-geojson\/\* dist\/piege\.zip dist\/flashcodes-piege\/\*/);
  assert.match(wfCode, /sha256sum dist\/essai-manuel\.zip dist\/essai-manuel-geojson\.zip dist\/piege\.zip/);
  assert.match(wfCode, /notes piege essai essai-manuel \| tail -n \+3 >> notes\.md/);
  assert.match(wfCode, /--prerelease --latest=false/);
  assert.doesNotMatch(wfCode, /projet-modele|plugin-v/);
});

test('notes : piege.zip expliqué, cinq lignes attendues (plugin 0.4.0), 0.3.4 ne lit que le GeoJSON', () => {
  assert.match(wf, /piege\.zip\*\* : zip de \*\*recette\*\*, données \*\*fictives\*\*.*un message clair par piège/);
  for (const ligne of [
    '« 2 couches chargées : UG_vide, Zone_inconnue »',
    '« UG_vide.geojson : couche vide »',
    '« Parcelles_sans_prj.shp : fichier .prj manquant, système de coordonnées inconnu »',
    '« UG_sans_crs.geojson : Coordonnées incohérentes : système mal déclaré ? »',
    '« FRT_sans_georef.tif : système de coordonnées inconnu »',
  ]) assert.ok(wf.includes(ligne), ligne);
  assert.match(wf, /plugin 0\.4\.0, préversion « plugin-essai », PR #38/);
  assert.match(wf, /plugin stable 0\.3\.4 ne lit que le GeoJSON : avec lui, les pièges Shapefile et GeoTIFF sont ignorés sans message/);
});

test('notes : les lignes attendues sont celles du plugin (textes recopiés du code)', () => {
  const ctl = readFileSync(join(racine, 'plugin', 'cerf-controles.mjs'), 'utf8');
  for (const t of ['fichier .prj manquant, système de coordonnées inconnu', "système de coordonnées inconnu'", 'Coordonnées incohérentes : système mal déclaré ?', "' : couche vide'"]) assert.ok(ctl.includes(t), t);
  const log = readFileSync(join(racine, 'plugin', 'cerf-logique.mjs'), 'utf8');
  assert.ok(log.includes("'couches chargées'"));
});

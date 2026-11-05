// SPDX-License-Identifier: GPL-3.0-or-later
// Mission 047 : essai-gpkg-style.zip (données FICTIVES), fabriqué par outils/zip-essai-gpkg-style.mjs, publié dans la
// préversion « essai-manuel » avec son flashcode. Un GeoPackage de deux tables : Parcelles avec un style enregistré
// (contour vert épais), UG sans style. Le SQL du plugin est joué ici sur le vrai fichier SQLite (node:sqlite) :
// cela prouve la requête et l'ordre des lignes, pas la voie « |subset=SELECT » de QField (terrain).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { fabriquerGpkgStyle, fabriquerGpkg, NOM_ZIP, NOM_GPKG, QML_VERT, QML_ROUGE } from '../outils/zip-essai-gpkg-style.mjs';
import { flashcodes, generer, verifier, notes } from '../outils/flashcodes.mjs';
import { nomsDuZip, requeteStyleGpkg, couchesDuZip } from '../plugin/cerf-logique.mjs';
import { qmlValide } from '../plugin/cerf-styles.mjs';

const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const racine = new URL('..', import.meta.url).pathname;
const wf = readFileSync(join(racine, '.github', 'workflows', 'release-essai-manuel.yml'), 'utf8');
const wfCode = wf.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
const tmp = (p) => mkdtempSync(join(tmpdir(), p));

test('noms : essai-gpkg-style.zip contient un seul GeoPackage', () => {
  assert.equal(NOM_ZIP, 'essai-gpkg-style.zip');
  const d = tmp('cerf-t047a-');
  try {
    const zip = fabriquerGpkgStyle(d);
    assert.equal(zip, join(d, NOM_ZIP));
    assert.deepEqual(nomsDuZip(readFileSync(zip)), [NOM_GPKG]);
    const u = spawnSync('unzip', ['-tq', zip]);
    if (!u.error) assert.equal(u.status, 0); else assert.ok(!process.env.CI, 'unzip absent');
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('reproductible : deux fabrications donnent les mêmes octets (zip et GeoPackage)', () => {
  const a = tmp('cerf-t047b-'); const b = tmp('cerf-t047c-');
  try {
    assert.equal(sha(fabriquerGpkgStyle(a)), sha(fabriquerGpkgStyle(b)));
    fabriquerGpkg(join(a, 'x.gpkg')); fabriquerGpkg(join(b, 'x.gpkg'));
    assert.equal(sha(join(a, 'x.gpkg')), sha(join(b, 'x.gpkg')));
  } finally { rmSync(a, { recursive: true, force: true }); rmSync(b, { recursive: true, force: true }); }
});

test('les deux tables sont des tables vecteur (features) de gpkg_contents, en EPSG:2154 ; layer_styles est « attributes » (comme QGIS)', () => {
  const d = tmp('cerf-t047d-');
  try {
    const f = join(d, 'x.gpkg'); fabriquerGpkg(f);
    const db = new DatabaseSync(f, { readOnly: true });
    assert.equal(db.prepare('PRAGMA application_id').get().application_id, 1196444487);
    assert.deepEqual(db.prepare('SELECT table_name, data_type, srs_id FROM gpkg_contents ORDER BY table_name').all().map((r) => ({ ...r })), [
      { table_name: 'Parcelles', data_type: 'features', srs_id: 2154 },
      { table_name: 'UG', data_type: 'features', srs_id: 2154 },
      { table_name: 'layer_styles', data_type: 'attributes', srs_id: null },
    ]);
    // Emprise de chaque table dans l'emprise de la France métropolitaine en Lambert 93 (spec § 4, contrôle 5).
    for (const r of db.prepare("SELECT * FROM gpkg_contents WHERE data_type = 'features'").all()) {
      assert.ok(r.min_x >= 89101 && r.max_x <= 1252436 && r.min_y >= 6036555 && r.max_y <= 7120480, r.table_name);
    }
    assert.equal(db.prepare('SELECT count(*) AS n FROM Parcelles').get().n, 3);
    assert.equal(db.prepare('SELECT count(*) AS n FROM UG').get().n, 2);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    db.close();
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('la requête du plugin, jouée sur ce fichier : Parcelles rend le style vert épais (la ligne par défaut, pas la plus récente), UG ne rend rien', () => {
  const d = tmp('cerf-t047e-');
  try {
    const f = join(d, 'x.gpkg'); fabriquerGpkg(f);
    const db = new DatabaseSync(f, { readOnly: true });
    const lignes = db.prepare(requeteStyleGpkg('Parcelles')).all();
    assert.equal(lignes.length, 1);
    assert.equal(lignes[0].styleQML, QML_VERT);
    assert.deepEqual(db.prepare(requeteStyleGpkg('UG')).all(), []);
    // Le piège : une seconde ligne, NON par défaut mais plus récente (rouge) : lue seulement si l'ordre de la requête est faux.
    const toutes = db.prepare("SELECT useAsDefault, update_time, styleQML FROM layer_styles WHERE f_table_name = 'Parcelles' ORDER BY id").all();
    assert.equal(toutes.length, 2);
    assert.equal(toutes.find((t) => t.styleQML === QML_ROUGE).useAsDefault, 0);
    assert.ok(toutes.find((t) => t.styleQML === QML_ROUGE).update_time > toutes.find((t) => t.styleQML === QML_VERT).update_time, 'le rouge est plus récent');
    db.close();
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('les styles enregistrés passent le contrôle du .qml du plugin ; le vert est épais (2 mm, #00A000), sans remplissage', () => {
  assert.ok(qmlValide(QML_VERT));
  assert.ok(qmlValide(QML_ROUGE));
  assert.match(QML_VERT, /name="outline_color" value="0,160,0,255"/);
  assert.match(QML_VERT, /name="outline_width" value="2"/);
  assert.match(QML_VERT, /name="style" value="no"/);
  assert.match(QML_ROUGE, /value="255,0,0,255"/);
  assert.doesNotMatch(QML_VERT, /0,0,255,255|255,140,0,255/, 'ni le bleu de la règle UG ni l\'orange de la règle Parcelles');
});

test('le plugin voit deux couches : les tables UG et Parcelles du GeoPackage (couchesDuZip)', () => {
  const c = couchesDuZip([NOM_GPKG], { [NOM_GPKG]: ['Parcelles', 'UG'] });
  assert.deepEqual(c.map((x) => x.couche), ['Parcelles', 'UG']);
});

test('flashcode : l\'adresse de essai-gpkg-style.zip dans la préversion essai-manuel (jamais latest), les autres inchangés', () => {
  assert.deepEqual(flashcodes('gpkg-style', 'essai').map((f) => f.url), ['https://github.com/pobsteta/cerf/releases/download/essai-manuel/essai-gpkg-style.zip']);
  assert.deepEqual(flashcodes('gpkg-style', 'stable').map((f) => f.url), flashcodes('gpkg-style', 'essai').map((f) => f.url));
  assert.equal(flashcodes('gpkg-style', 'essai')[0].nom, 'flashcode-gpkg-style');
  assert.deepEqual(flashcodes('piege', 'essai').map((f) => f.url), ['https://github.com/pobsteta/cerf/releases/download/essai-manuel/piege.zip']);
  assert.match(notes('gpkg-style', 'essai', 'essai-manuel'), /essai-manuel\/flashcode-gpkg-style\.png/);
});

const OUTILS = !spawnSync('qrencode', ['--version'], { stdio: 'ignore' }).error && !spawnSync('zbarimg', ['--version'], { stdio: 'ignore' }).error;
test('flashcode : PNG et SVG décodés donnent exactement l\'adresse de essai-gpkg-style.zip', { skip: OUTILS ? false : 'qrencode ou zbarimg absent' }, () => {
  const d = tmp('cerf-t047f-');
  try {
    assert.equal(generer(d, 'gpkg-style', 'essai').length, 2);
    assert.deepEqual(verifier(d, 'gpkg-style', 'essai'), []);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('workflow release-essai-manuel : fabrique le zip, flashcode contrôlé, publié dans essai-manuel, branche de la mission 047, les lignes existantes gardées', () => {
  assert.match(wfCode, /branches: \[[^\]]*'mission\/047-styles-gpkg'\]/);
  assert.match(wfCode, /paths: \[[^\]]*'outils\/zip-essai-gpkg-style\.mjs'/);
  assert.match(wfCode, /node --no-warnings outils\/zip-essai-gpkg-style\.mjs dist/);
  assert.match(wfCode, /node outils\/flashcodes\.mjs generer dist\/flashcodes-gpkg-style gpkg-style essai/);
  assert.match(wfCode, /node outils\/flashcodes\.mjs verifier dist\/flashcodes-gpkg-style gpkg-style essai/);
  assert.match(wfCode, /gh release create essai-manuel dist\/essai-manuel\.zip dist\/flashcodes\/\* dist\/essai-manuel-geojson\.zip dist\/flashcodes-geojson\/\* dist\/piege\.zip dist\/flashcodes-piege\/\* dist\/essai-gpkg-style\.zip dist\/flashcodes-gpkg-style\/\*/);
  assert.match(wfCode, /sha256sum dist\/essai-manuel\.zip dist\/essai-manuel-geojson\.zip dist\/piege\.zip dist\/essai-gpkg-style\.zip/);
  assert.match(wfCode, /notes gpkg-style essai essai-manuel \| tail -n \+3 >> notes\.md/);
  assert.match(wf, /essai-gpkg-style\.zip\*\* : .*Parcelles.*vert.*UG.*bleu/s, 'les notes disent ce que Pascal doit voir');
});

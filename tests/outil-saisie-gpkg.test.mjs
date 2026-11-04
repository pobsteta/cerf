// Mission 021 : ecrireGpkg() — saisie.gpkg écrit par script (node:sqlite), contenu logique stable,
// identique à celui versé à la racine du dépôt. Les 16 tests de forme sont dans couche-saisie.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { ecrireGpkg } from '../outils/projet-modele.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'cerf-gpkg-021-'));
test.after(() => rmSync(tmp, { recursive: true, force: true }));
const DEPOT = fileURLToPath(new URL('../saisie.gpkg', import.meta.url));

// Dump logique : schéma, pragmas, lignes des tables gpkg_* (pas les octets : l'en-tête SQLite porte sa version).
function dump(chemin) {
  const db = new DatabaseSync(chemin, { readOnly: true });
  try {
    const schema = db.prepare("SELECT type, name, sql FROM sqlite_master ORDER BY name").all();
    const gpkg = Object.fromEntries(['gpkg_spatial_ref_sys', 'gpkg_contents', 'gpkg_geometry_columns'].map((t) => [t, db.prepare(`SELECT * FROM ${t} ORDER BY 1, 2`).all()]));
    return JSON.stringify({ schema, gpkg, app: db.prepare('PRAGMA application_id').get(), uv: db.prepare('PRAGMA user_version').get(), n: db.prepare('SELECT count(*) AS n FROM saisie_terrain').get() });
  } finally { db.close(); }
}

test('deux écritures : mêmes octets (même Node), même contenu logique', () => {
  const a = join(tmp, 'a.gpkg'), b = join(tmp, 'b.gpkg');
  ecrireGpkg(a); ecrireGpkg(b);
  assert.ok(readFileSync(a).equals(readFileSync(b)));
  assert.equal(dump(a), dump(b));
});
test('saisie.gpkg du dépôt = sortie du script (contenu logique)', () => {
  const a = join(tmp, 'c.gpkg'); ecrireGpkg(a);
  assert.equal(dump(DEPOT), dump(a));
});
test('aucun fichier annexe (-wal, -shm, -journal) laissé à côté', () => {
  const a = join(tmp, 'd.gpkg'); ecrireGpkg(a);
  for (const s of ['-wal', '-shm', '-journal']) assert.ok(!existsSync(a + s), s);
});
test('réécrit par-dessus un fichier existant (même contenu, table vide)', () => {
  const a = join(tmp, 'e.gpkg'); ecrireGpkg(a);
  const db = new DatabaseSync(a); db.exec("INSERT INTO saisie_terrain (essence, diametre) VALUES ('CHE', 40)"); db.close();
  ecrireGpkg(a);
  assert.equal(dump(a), dump(DEPOT));
});
test('EPSG:2154 : définition WKT1 Lambert-93 (parallèles 44 et 49, origine 700000 / 6600000)', () => {
  const db = new DatabaseSync(DEPOT, { readOnly: true });
  const d = db.prepare('SELECT definition FROM gpkg_spatial_ref_sys WHERE srs_id = 2154').get().definition; db.close();
  for (const m of ['Lambert_Conformal_Conic_2SP', '"standard_parallel_1",49', '"standard_parallel_2",44', '"false_easting",700000', '"false_northing",6600000', 'AUTHORITY["EPSG","2154"]']) assert.ok(d.includes(m), m);
});
test('la couche est non retirable et son identifiant est celui du projet (flags, arbre)', async () => {
  const { ecrireQgs } = await import('../outils/projet-modele.mjs');
  const q = ecrireQgs();
  assert.match(q, /<Removable>0<\/Removable>/);
  const id = q.match(/<layer-tree-layer id="([^"]*)" name="Saisie terrain"/)[1];
  assert.ok(q.includes(`<id>${id}</id>`));
});

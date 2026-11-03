// Mission 016 : les zips de recette piege et lourd (spec § 6, critères 6 et 7).
// Le zip lourd est fabriqué ici à 1 Mo (le même code que pour 200 Mo) pour rester rapide.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { inflateRawSync } from 'node:zlib';
import { fabriquerPiege, fabriquerLourd, COUCHES_GPKG, NOM_GPKG } from '../outils/zips-recette.mjs';

// Emprise de vraisemblance (spec § 4, point 5).
const EMPRISE = { xmin: 89101, xmax: 1252436, ymin: 6036555, ymax: 7120480 };
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');

// Lecture minimale d'un zip : répertoire central -> { nom: { methode, donnees } }.
function lireZip(chemin) {
  const b = readFileSync(chemin);
  const fin = b.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const n = b.readUInt16LE(fin + 10); let o = b.readUInt32LE(fin + 16);
  const r = {};
  for (let i = 0; i < n; i++) {
    const methode = b.readUInt16LE(o + 10); const taille = b.readUInt32LE(o + 20);
    const ln = b.readUInt16LE(o + 28); const lx = b.readUInt16LE(o + 30); const lc = b.readUInt16LE(o + 32);
    const dec = b.readUInt32LE(o + 42); const nom = b.toString('utf8', o + 46, o + 46 + ln);
    const debut = dec + 30 + b.readUInt16LE(dec + 26) + b.readUInt16LE(dec + 28);
    const paquet = b.subarray(debut, debut + taille);
    r[nom] = { methode, donnees: methode === 0 ? paquet : inflateRawSync(paquet) };
    o += 46 + ln + lx + lc;
  }
  return r;
}

let dossierA; let dossierB; let piege; let lourd;
before(async () => {
  dossierA = mkdtempSync(join(tmpdir(), 'cerf-t016a-')); dossierB = mkdtempSync(join(tmpdir(), 'cerf-t016b-'));
  fabriquerPiege(dossierA); await fabriquerLourd(dossierA, 1);
  fabriquerPiege(dossierB); await fabriquerLourd(dossierB, 1);
  piege = lireZip(join(dossierA, 'piege.zip')); lourd = lireZip(join(dossierA, 'lourd.zip'));
});

test('rejouable à l\'identique : deux fabrications donnent les mêmes octets', () => {
  assert.equal(sha(join(dossierA, 'piege.zip')), sha(join(dossierB, 'piege.zip')));
  assert.equal(sha(join(dossierA, 'lourd.zip')), sha(join(dossierB, 'lourd.zip')));
});

test('unzip -t valide les deux zips', () => {
  for (const z of ['piege.zip', 'lourd.zip']) execFileSync('unzip', ['-tq', join(dossierA, z)]);
});

test('piege : contenu exact, cinq pièges, rien d\'autre', () => {
  assert.deepEqual(Object.keys(piege).sort(), [
    'FRT_sans_georef.tif', 'Parcelles_sans_prj.cpg', 'Parcelles_sans_prj.dbf', 'Parcelles_sans_prj.shp',
    'Parcelles_sans_prj.shx', 'UG_sans_crs.geojson', 'UG_vide.geojson', 'Zone_inconnue.geojson',
  ]);
});

test('piège 1 : GeoJSON en Lambert 93, sans membre crs, coordonnées dans l\'emprise L93', () => {
  const g = JSON.parse(piege['UG_sans_crs.geojson'].donnees.toString('utf8'));
  assert.equal('crs' in g, false);
  assert.equal(g.features.length, 1);
  for (const [x, y] of g.features[0].geometry.coordinates[0]) {
    assert.ok(x >= EMPRISE.xmin && x <= EMPRISE.xmax && y >= EMPRISE.ymin && y <= EMPRISE.ymax, `${x},${y} hors emprise L93`);
    assert.ok(Math.abs(x) > 180 || Math.abs(y) > 90, 'lu en WGS84, la valeur doit être impossible');
  }
});

test('piège 2 : Shapefile avec .shp .shx .dbf .cpg et sans .prj, coordonnées L93', () => {
  const noms = Object.keys(piege).filter((n) => n.startsWith('Parcelles_sans_prj.'));
  assert.deepEqual(noms.sort(), ['Parcelles_sans_prj.cpg', 'Parcelles_sans_prj.dbf', 'Parcelles_sans_prj.shp', 'Parcelles_sans_prj.shx']);
  const shp = piege['Parcelles_sans_prj.shp'].donnees;
  assert.equal(shp.readInt32BE(0), 9994);
  assert.equal(shp.readInt32BE(24) * 2, shp.length, 'longueur du fichier déclarée = réelle');
  assert.equal(shp.readInt32LE(32), 5, 'polygone');
  const [xmin, ymin, xmax, ymax] = [36, 44, 52, 60].map((o) => shp.readDoubleLE(o));
  assert.ok(xmin >= EMPRISE.xmin && xmax <= EMPRISE.xmax && ymin >= EMPRISE.ymin && ymax <= EMPRISE.ymax);
  const shx = piege['Parcelles_sans_prj.shx'].donnees;
  assert.equal(shx.readInt32BE(24) * 2, shx.length);
  const dbf = piege['Parcelles_sans_prj.dbf'].donnees;
  assert.equal(dbf.readUInt32LE(4), 1);
  assert.equal(dbf.readUInt16LE(8) + dbf.readUInt16LE(10) * 1 + 1, dbf.length, 'en-tête + 1 enregistrement + EOF');
  assert.equal(piege['Parcelles_sans_prj.cpg'].donnees.toString(), 'UTF-8');
});

test('piège 3 : GeoTIFF lisible mais sans aucune balise de géoréférencement', () => {
  const t = piege['FRT_sans_georef.tif'].donnees;
  assert.equal(t.toString('latin1', 0, 2), 'II'); assert.equal(t.readUInt16LE(2), 42);
  const n = t.readUInt16LE(8); const tags = [];
  for (let i = 0; i < n; i++) tags.push(t.readUInt16LE(10 + 12 * i));
  assert.ok(tags.includes(256) && tags.includes(257) && tags.includes(273), 'balises d\'image présentes');
  for (const geo of [33550, 33922, 34264, 34735, 34736, 34737]) assert.equal(tags.includes(geo), false, `balise ${geo} interdite`);
});

test('piège 4 : nom non reconnu par les règles du § 5, bien formé et en métropole', () => {
  const nom = 'Zone_inconnue';
  for (const motif of [/^ug([_\- ].*)?$/, /^parcelles?([_\- ].*)?$/, /^frt([_\- ].*)?$/]) assert.equal(motif.test(nom.toLowerCase()), false);
  const g = JSON.parse(piege['Zone_inconnue.geojson'].donnees.toString('utf8'));
  assert.equal(g.crs.properties.name, 'urn:ogc:def:crs:OGC:1.3:CRS84');
  const champs = Object.keys(g.features[0].properties);
  assert.equal(champs.includes('essence') && champs.includes('diametre'), false);
  const [lon, lat] = g.features[0].geometry.coordinates[0][0];
  assert.ok(lon > -5 && lon < 10 && lat > 41 && lat < 52);
});

test('piège 5 : couche vide, zéro entité, crs déclaré', () => {
  const g = JSON.parse(piege['UG_vide.geojson'].donnees.toString('utf8'));
  assert.equal(g.type, 'FeatureCollection'); assert.deepEqual(g.features, []);
  assert.equal(g.crs.properties.name, 'urn:ogc:def:crs:OGC:1.3:CRS84');
});

test('lourd : GeoTIFF rangé sans compression (méthode 0) et GeoPackage', () => {
  assert.deepEqual(Object.keys(lourd).sort(), [NOM_GPKG, 'lourd.tif']);
  assert.equal(lourd['lourd.tif'].methode, 0);
  assert.equal(lourd['lourd.tif'].donnees.length, 998263);
  assert.equal(lourd['lourd.tif'].donnees.readUInt16LE(2), 42);
});

test('lourd : le GeoPackage a exactement deux couches en EPSG:2154, lisibles', async () => {
  const gp = join(dossierA, 'extrait.gpkg'); writeFileSync(gp, lourd[NOM_GPKG].donnees);
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(gp, { readOnly: true });
  assert.equal(db.prepare('PRAGMA application_id').get().application_id, 1196444487);
  const contenus = db.prepare("SELECT table_name, srs_id FROM gpkg_contents WHERE data_type='features' ORDER BY table_name").all();
  assert.deepEqual(contenus.map((c) => c.table_name), [...COUCHES_GPKG].sort());
  assert.ok(contenus.every((c) => c.srs_id === 2154));
  assert.equal(db.prepare('SELECT count(*) AS n FROM gpkg_geometry_columns').get().n, 2);
  const pts = db.prepare('SELECT essence, diametre, geom FROM Releves_lourd').all();
  assert.equal(pts.length, 100);
  assert.ok(pts.every((p) => typeof p.essence === 'string' && Number.isInteger(p.diametre)));
  assert.equal(db.prepare('SELECT count(*) AS n FROM Parcelles_lourd').get().n, 10);
  for (const p of pts) {
    const g = Buffer.from(p.geom); assert.equal(g.toString('latin1', 0, 2), 'GP');
    assert.equal(g.readInt32LE(4), 2154);
    const x = g.readDoubleLE(40 + 5); const y = g.readDoubleLE(40 + 13);
    assert.ok(x >= EMPRISE.xmin && x <= EMPRISE.xmax && y >= EMPRISE.ymin && y <= EMPRISE.ymax);
  }
  db.close();
});

test('aucun fichier produit ne dépasse 1 Mo aux tailles de test, et le dépôt ne contient aucun zip lourd', () => {
  assert.ok(statSync(join(dossierA, 'piege.zip')).size < 1_000_000);
  const suivis = execFileSync('git', ['ls-files'], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' }).split('\n').filter(Boolean);
  for (const f of suivis) assert.ok(!/(^|\/)(lourd|piege)\.zip$/.test(f), f);
});

test('l\'outil refuse de tourner sans dossier de sortie', () => {
  assert.throws(() => execFileSync('node', ['--no-warnings', new URL('../outils/zips-recette.mjs', import.meta.url).pathname], { stdio: 'pipe' }), (e) => e.status === 2);
});

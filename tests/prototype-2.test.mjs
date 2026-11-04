// Mission 023, prototype n° 2 : tests de ce qui est pur (lecteur et extraction de zip, CRC32,
// fabrication des fichiers d'essai, table layer_styles, .qml du manuel avec étiquette,
// empaquetage). Aucun appel à QField ici : seul le protocole tests/recette/prototype-2.md,
// rempli par Pascal sur le Samsung, le prouvera.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import * as L from '../prototype-2/essai-logique.mjs';
import * as F from '../prototype-2/fabriquer-essais.mjs';
import { empaqueter, FICHIERS_PLUGIN } from '../prototype-2/empaqueter.mjs';
import { ecrireZip } from './recette/essai/zip-ecrire.mjs';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = join(ici, '..');
const lire = (f) => readFileSync(join(racine, 'prototype-2', f), 'utf8');
const buf = (s) => Buffer.from(s, 'utf8');
const entree = (nom, donnees, stocke) => ({ nom: buf(nom), donnees: buf(donnees), stocke, utf8: true });

// ---------------------------------------------------------------- CRC32 et zip

test('CRC32 : vecteur connu « 123456789 » = CBF43926', () => {
  assert.equal(L.crc32(buf('123456789')), 0xcbf43926);
  assert.equal(L.crc32(new Uint8Array(0)), 0);
});

test('lecteur : nom, méthode, tailles, CRC32 et position des données d\'un zip stocké', () => {
  const z = ecrireZip([entree('a.txt', 'bonjour', true), entree('d/b.txt', 'monde', true)]);
  const { entrees } = L.listerZip(z);
  assert.equal(entrees.length, 2);
  assert.equal(entrees[0].nom, 'a.txt');
  assert.equal(entrees[0].methode, 0);
  assert.equal(entrees[0].taille, 7);
  assert.equal(entrees[0].crc32, L.crc32(buf('bonjour')));
  assert.equal(entrees[1].nom, 'd/b.txt');
});

test('extraction : octets exacts d\'une entrée stockée, CRC32 conforme', () => {
  const z = ecrireZip([entree('a.txt', 'bonjour', true), entree('d/b.txt', 'monde é', true)]);
  const { entrees } = L.listerZip(z);
  assert.equal(Buffer.from(L.extraireEntree(z, entrees[0])).toString('utf8'), 'bonjour');
  const b = L.extraireEntree(z, entrees[1]);
  assert.equal(Buffer.from(b).toString('utf8'), 'monde é');
  assert.equal(L.crc32(b), entrees[1].crc32);
});

test('extraction : champ « extra » de l\'en-tête local plus long que celui du répertoire central', () => {
  const z = ecrireZip([entree('x.bin', 'DONNEES', true)]);
  // On glisse 5 octets d'extra dans l'en-tête local (comme les horodatages « UT » de zip -0).
  const nomLen = 'x.bin'.length;
  const debutDonnees = 30 + nomLen;
  const local = Buffer.concat([z.subarray(0, debutDonnees), Buffer.from([1, 2, 3, 4, 5])]);
  local.writeUInt16LE(5, 28);
  const reste = z.subarray(debutDonnees);
  const nouveau = Buffer.concat([local, reste]);
  // Le répertoire central doit suivre : décalage du répertoire central + 5.
  const fin = nouveau.length - 22;
  nouveau.writeUInt32LE(nouveau.readUInt32LE(fin + 16) + 5, fin + 16);
  const { entrees } = L.listerZip(nouveau);
  assert.equal(Buffer.from(L.extraireEntree(nouveau, entrees[0])).toString('utf8'), 'DONNEES');
});

test('extraction : une entrée compressée est refusée avec un message qui le dit', () => {
  const z = ecrireZip([entree('c.txt', 'x'.repeat(500), false)]);
  const { entrees } = L.listerZip(z);
  assert.equal(entrees[0].methode, 8);
  assert.throws(() => L.extraireEntree(z, entrees[0]), /compressée.*non extraite/);
});

test('extraction : CRC32 faux détecté', () => {
  const z = Buffer.from(ecrireZip([entree('a.txt', 'bonjour', true)]));
  z[30 + 5] ^= 0xff; // un octet de données abîmé
  const { entrees } = L.listerZip(z);
  assert.throws(() => L.extraireEntree(z, entrees[0]), /CRC32/);
});

test('lecteur : non-zip, vide et tronqué donnent des erreurs claires', () => {
  assert.throws(() => L.listerZip(new Uint8Array(0)), /vide/);
  assert.throws(() => L.listerZip(buf('ceci est un texte assez long pour passer 22 octets')), /pas un zip/);
  const z = ecrireZip([entree('a.txt', 'bonjour', true)]);
  assert.throws(() => L.listerZip(z.subarray(0, z.length - 10)), /tronqué|abîmé/);
});

test('arrayBufferExact : un ArrayBuffer de la taille exacte, même depuis un sous-tableau', () => {
  const grand = new Uint8Array([9, 9, 1, 2, 3, 9, 9]);
  const ab = L.arrayBufferExact(grand.subarray(2, 5));
  assert.ok(ab instanceof ArrayBuffer);
  assert.equal(ab.byteLength, 3);
  assert.deepEqual(Array.from(new Uint8Array(ab)), [1, 2, 3]);
});

// ---------------------------------------------------------------- chemins

test('chemins : cerf-imports dans le dossier du projet, /vsizip/ du zip copié', () => {
  assert.equal(L.dossierImports('/storage/emulated/0/Cerf/'), '/storage/emulated/0/Cerf/cerf-imports/');
  assert.equal(L.dossierImports('/p'), '/p/cerf-imports/');
  assert.throws(() => L.dossierImports(''), /aucun projet/);
  assert.equal(L.cheminSortie('/p', 'q1', 'UG_q1.geojson'), '/p/cerf-imports/q1/UG_q1.geojson');
  assert.equal(L.cheminZipCopie('/p'), '/p/cerf-imports/essai-styles.zip');
  assert.equal(L.cheminVsizip('/p/cerf-imports/essai-styles.zip', 'UG_q2.geojson'), '/vsizip//p/cerf-imports/essai-styles.zip/UG_q2.geojson');
  assert.equal(L.uriGpkg('/p/cerf-imports/q3/Parcelles_q3.gpkg', 'Parcelles_q3'), '/p/cerf-imports/q3/Parcelles_q3.gpkg|layername=Parcelles_q3');
});

// ---------------------------------------------------------------- reprojection : jugements

test('point de la question 6 : 1 051 113 ; 6 840 462 à 5 m près (X puis Y, Lambert 93)', () => {
  assert.equal(L.POINT_WGS84.lon, 7.76189);
  assert.equal(L.POINT_WGS84.lat, 48.56906);
  assert.equal(L.jugerPoint(1051112.70, 6840461.54).conforme, true);
  assert.equal(L.jugerPoint(1051120, 6840462).conforme, false);
  assert.equal(L.jugerPoint(0, 0).conforme, false);
  assert.equal(L.jugerPoint(7.76189, 48.56906).conforme, false, 'coordonnées rendues sans changement = non');
  assert.equal(L.jugerPoint(undefined, NaN).conforme, false);
});

test('emprise de la question 6 : tous les coins dans l\'emprise de la spec § 4', () => {
  assert.deepEqual(L.EMPRISE_L93, { xmin: 89101, xmax: 1252436, ymin: 6036555, ymax: 7120480 });
  assert.equal(L.empriseVraisemblable({ xMinimum: 1050000, xMaximum: 1052000, yMinimum: 6839000, yMaximum: 6842000 }), true);
  assert.equal(L.empriseVraisemblable({ xMinimum: 1050000, xMaximum: 1300000, yMinimum: 6839000, yMaximum: 6842000 }), false);
  assert.equal(L.empriseVraisemblable({ xMinimum: 0, xMaximum: 0, yMinimum: 0, yMaximum: 0 }), false);
  assert.equal(L.empriseVraisemblable(null), false);
  assert.equal(L.empriseVraisemblable({ xMinimum: NaN, xMaximum: 1, yMinimum: 1, yMaximum: 2 }), false);
});

test('verdict Sans_crs : refus si l\'emprise reprojetée est vide ou hors France, chargée sinon', () => {
  assert.match(L.verdictSansCrs('EPSG:4326', { xMinimum: 0, xMaximum: 0, yMinimum: 0, yMaximum: 0 }), /refus/i);
  assert.match(L.verdictSansCrs('EPSG:4326', null), /refus/i);
  assert.match(L.verdictSansCrs('EPSG:2154', { xMinimum: 1050000, xMaximum: 1052000, yMinimum: 6839000, yMaximum: 6842000 }), /chargée/i);
});

test('position écrite avec ordre et système explicites', () => {
  assert.equal(L.ecrirePosition(1051112.7, 6840461.54, 'EPSG:2154'), 'EPSG:2154, X (est) = 1051112,70 m ; Y (nord) = 6840461,54 m');
  assert.match(L.ecrirePosition(7.76189, 48.56906, 'EPSG:4326'), /longitude = 7,76189 ; latitude = 48,56906/);
});

// ---------------------------------------------------------------- registre (question 5)

test('registre : aller-retour, entrées illisibles ignorées', () => {
  const liste = [{ chemin: '/p/cerf-imports/q1/UG_q1.geojson', nom: 'UG_q1' }, { chemin: '/p/cerf-imports/q3/Parcelles_q3.gpkg|layername=Parcelles_q3', nom: 'Parcelles_q3' }];
  assert.deepEqual(L.lireRegistre(L.ecrireRegistre(liste)), liste);
  assert.deepEqual(L.lireRegistre(''), []);
  assert.deepEqual(L.lireRegistre('pas du json'), []);
  assert.deepEqual(L.lireRegistre(JSON.stringify([{ chemin: 1 }, { chemin: '/a', nom: 'A' }])), [{ chemin: '/a', nom: 'A' }]);
});

// ---------------------------------------------------------------- fichiers d'essai

const essais = F.fabriquerEssais();
const parNom = (nom) => essais.entrees.find((e) => e.nom === nom);

test('zip d\'essai : 17 entrées dans l\'ordre voulu, toutes stockées, CRC32 justes', () => {
  assert.equal(F.NOMS_ENTREES.length, 17);
  assert.deepEqual(essais.entrees.map((e) => e.nom), F.NOMS_ENTREES);
  const { entrees } = L.listerZip(essais.zip);
  assert.deepEqual(entrees.map((e) => e.nom), F.NOMS_ENTREES);
  for (const e of entrees) {
    assert.equal(e.methode, 0, e.nom);
    const octets = L.extraireEntree(essais.zip, e);
    assert.equal(L.crc32(octets), e.crc32, e.nom);
    assert.deepEqual(Buffer.from(octets), parNom(e.nom).donnees, e.nom);
  }
  assert.equal(F.NOMS_ENTREES.filter((n) => !n.startsWith('FRT_sansprj')).length, 13);
});

test('fabrication déterministe : mêmes octets à chaque fois (zip et GeoPackage)', () => {
  const b = F.fabriquerEssais();
  assert.ok(Buffer.compare(b.zip, essais.zip) === 0);
  assert.ok(Buffer.compare(b.gpkg, essais.gpkg) === 0);
});

test('GeoPackage publié seul = celui du zip', () => {
  assert.ok(Buffer.compare(essais.gpkg, parNom('Parcelles_q3.gpkg').donnees) === 0);
});

test('GeoJSON UG_q1 : membre crs EPSG:2154, 2 polygones, champ code_ug, autour de Strasbourg (X puis Y, Lambert 93)', () => {
  const g = JSON.parse(parNom('UG_q1.geojson').donnees.toString('utf8'));
  assert.equal(g.crs.properties.name, 'urn:ogc:def:crs:EPSG::2154');
  assert.equal(g.features.length, 2);
  assert.deepEqual(g.features.map((f) => f.properties.code_ug), ['UG1', 'UG2']);
  for (const f of g.features) {
    assert.equal(f.geometry.type, 'Polygon');
    const anneau = f.geometry.coordinates[0];
    assert.deepEqual(anneau[0], anneau[anneau.length - 1]);
    for (const [x, y] of anneau) {
      assert.ok(Math.abs(x - F.CENTRE_L93.x) < 2000 && Math.abs(y - F.CENTRE_L93.y) < 2000, `point ${x} ; ${y} près de Strasbourg`);
    }
  }
});

test('un point du terrain tombe au bon endroit : le centre de la 1re UG est à 1 051 113 ; 6 840 462 (±1 km)', () => {
  const g = JSON.parse(parNom('UG_q1.geojson').donnees.toString('utf8'));
  const a = g.features[0].geometry.coordinates[0];
  const xs = a.map((p) => p[0]); const ys = a.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2; const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  assert.ok(Math.hypot(cx - 1051113, cy - 6840462) < 1000);
  assert.ok(Math.max(...xs) - Math.min(...xs) === 300, 'carré de 300 m');
});

test('Sans_crs.geojson : AUCUN membre crs, coordonnées en mètres Lambert 93 (lues en WGS84 par la RFC 7946)', () => {
  const brut = parNom('Sans_crs.geojson').donnees.toString('utf8');
  const g = JSON.parse(brut);
  assert.equal('crs' in g, false);
  assert.doesNotMatch(brut, /"crs"/);
  const [x, y] = g.features[0].geometry.coordinates[0][0];
  assert.ok(x > 1000000 && y > 6800000, 'des mètres Lambert 93, pas des degrés');
});

test('chaque couche d\'essai a ses propres polygones (on reconnaît à l\'œil laquelle a pris son style)', () => {
  const noms = ['UG_q1.geojson', 'UG_q2.geojson', 'UG_q4.geojson'];
  const textes = noms.map((n) => parNom(n).donnees.toString('utf8'));
  assert.equal(new Set(textes).size, 3);
});

// .qml du manuel (spec § 5)

function equilibre(xml) {
  const pile = [];
  const re = /<(\/?)([A-Za-z_][\w.-]*)([^<>]*?)(\/?)>/g;
  let m;
  const sansPrologue = xml.replace(/<\?[^>]*\?>|<!--[\s\S]*?-->|<!DOCTYPE[^>]*>/g, '');
  while ((m = re.exec(sansPrologue))) {
    if (m[4] === '/') continue;
    if (m[1] === '/') { if (pile.pop() !== m[2]) return false; } else pile.push(m[2]);
  }
  return pile.length === 0;
}
const option = (xml, nom) => new RegExp(`name="${nom}" value="([^"]*)"`).exec(xml)[1];

test('.qml UG : contour seul 0000FF, 0,6 mm, sans remplissage ; étiquette code_ug 10 pt 0000FF', () => {
  const q = parNom('UG_q1.qml').donnees.toString('utf8');
  assert.ok(equilibre(q), 'balises équilibrées');
  assert.match(q, /<qgis [^>]*styleCategories="Symbology\|Labeling"/);
  assert.match(q, /<symbol [^>]*type="fill"/);
  assert.equal(option(q, 'outline_color'), '0,0,255,255');
  assert.equal(option(q, 'outline_width'), '0.6');
  assert.equal(option(q, 'outline_width_unit'), 'MM');
  assert.equal(option(q, 'style'), 'no');
  assert.equal(option(q, 'color'), '0,0,255,0', 'remplissage transparent');
  assert.match(q, /<text-style [^>]*fieldName="code_ug"/);
  assert.match(q, /<text-style [^>]*fontSize="10"/);
  assert.match(q, /<text-style [^>]*fontSizeUnit="Point"/);
  assert.match(q, /<text-style [^>]*textColor="0,0,255,255"/);
  assert.match(q, /<labeling type="simple">/);
  assert.match(q, /labelsEnabled="1"/);
});

test('.qml Parcelles (FF8C00, 1 mm, 15 pt) et FRT (008B8B, 0,6 mm, 10 pt) : couleurs du manuel', () => {
  const p = F.qmlStyle(F.STYLES.parcelles);
  assert.ok(equilibre(p));
  assert.equal(option(p, 'outline_color'), '255,140,0,255');
  assert.equal(option(p, 'outline_width'), '1');
  assert.match(p, /<text-style [^>]*fontSize="15"/);
  assert.match(p, /<text-style [^>]*textColor="255,140,0,255"/);
  const f = F.qmlStyle(F.STYLES.frt);
  assert.ok(equilibre(f));
  assert.equal(option(f, 'outline_color'), '0,139,139,255');
  assert.equal(option(f, 'outline_width'), '0.6');
  assert.match(f, /<text-style [^>]*fontSize="10"/);
  assert.match(f, /<text-style [^>]*textColor="0,139,139,255"/);
});

test('les .qml du zip : UG_q1, UG_q2 identiques entre eux (même style bleu), UG_q4 en vert-bleu', () => {
  assert.equal(parNom('UG_q1.qml').donnees.toString(), parNom('UG_q2.qml').donnees.toString());
  assert.equal(option(parNom('UG_q4.qml').donnees.toString(), 'outline_color'), '0,139,139,255');
  assert.notEqual(parNom('UG_q1.qml').donnees.toString(), parNom('UG_q4.qml').donnees.toString());
});

test('le .qml de la question 4 est fabriqué à part (posé après le chargement) et identique à celui du zip', () => {
  assert.equal(F.qmlQ4(), parNom('UG_q4.qml').donnees.toString());
});

// GeoPackage et table layer_styles

function ouvrirGpkg() {
  const dossier = mkdtempSync(join(tmpdir(), 'cerf-p2-'));
  const chemin = join(dossier, 'x.gpkg');
  writeFileSync(chemin, essais.gpkg);
  return { db: new DatabaseSync(chemin, { readOnly: true }), nettoyer: () => rmSync(dossier, { recursive: true, force: true }) };
}

test('GeoPackage : en-tête SQLite, application_id GPKG, intégrité, 2 polygones Lambert 93', () => {
  assert.equal(essais.gpkg.subarray(0, 16).toString('latin1'), 'SQLite format 3\0');
  const { db, nettoyer } = ouvrirGpkg();
  try {
    assert.equal(db.prepare('PRAGMA application_id').get().application_id, 1196444487);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    const c = db.prepare("SELECT * FROM gpkg_contents WHERE table_name='Parcelles_q3'").get();
    assert.equal(c.data_type, 'features');
    assert.equal(c.srs_id, 2154);
    const g = db.prepare("SELECT * FROM gpkg_geometry_columns WHERE table_name='Parcelles_q3'").get();
    assert.equal(g.column_name, 'geom');
    assert.equal(g.geometry_type_name, 'POLYGON');
    assert.equal(g.srs_id, 2154);
    assert.equal(db.prepare('SELECT srs_id, organization_coordsys_id FROM gpkg_spatial_ref_sys WHERE srs_id=2154').get().organization_coordsys_id, 2154);
    const lignes = db.prepare('SELECT fid, geom, code_ug FROM Parcelles_q3 ORDER BY fid').all();
    assert.equal(lignes.length, 2);
    assert.deepEqual(lignes.map((l) => l.code_ug), ['P1', 'P2']);
    for (const l of lignes) {
      const b = Buffer.from(l.geom);
      assert.equal(b.toString('latin1', 0, 2), 'GP');
      assert.equal(b[3], 0x03, 'little-endian, enveloppe XY');
      assert.equal(b.readInt32LE(4), 2154);
      const xmin = b.readDoubleLE(8); const xmax = b.readDoubleLE(16); const ymin = b.readDoubleLE(24); const ymax = b.readDoubleLE(32);
      assert.ok(xmax - xmin === 300 && ymax - ymin === 300);
      assert.ok(Math.abs(xmin - F.CENTRE_L93.x) < 2000 && Math.abs(ymin - F.CENTRE_L93.y) < 2000);
      assert.equal(b[40], 1, 'WKB little-endian');
      assert.equal(b.readUInt32LE(41), 3, 'WKB Polygon');
      assert.equal(b.readUInt32LE(49), 5, '5 points : anneau fermé');
    }
  } finally { nettoyer(); }
});

test('table layer_styles : schéma QGIS, style Parcelles par défaut (useAsDefault = 1), QML du manuel avec étiquette', () => {
  const { db, nettoyer } = ouvrirGpkg();
  try {
    const colonnes = db.prepare('PRAGMA table_info(layer_styles)').all().map((c) => c.name);
    for (const c of ['id', 'f_table_catalog', 'f_table_schema', 'f_table_name', 'f_geometry_column', 'styleName', 'styleQML', 'styleSLD', 'useAsDefault', 'description', 'owner', 'ui', 'update_time']) {
      assert.ok(colonnes.includes(c), `colonne ${c}`);
    }
    const lignes = db.prepare('SELECT * FROM layer_styles').all();
    assert.equal(lignes.length, 1);
    const s = lignes[0];
    assert.equal(s.f_table_name, 'Parcelles_q3');
    assert.equal(s.f_geometry_column, 'geom');
    assert.equal(s.useAsDefault, 1);
    assert.equal(s.styleQML, F.qmlStyle(F.STYLES.parcelles));
    assert.match(s.styleQML, /fieldName="code_ug"/);
    assert.ok(db.prepare('SELECT 1 FROM Parcelles_q3 LIMIT 1').get(), 'la table portant le style existe');
  } finally { nettoyer(); }
});

// Shapefile

test('Shapefile FRT_q7 : 5 fichiers, .prj WKT1 ESRI de Lambert 93, entêtes cohérents, 2 polygones', () => {
  const prj = parNom('FRT_q7.prj').donnees.toString('utf8');
  assert.match(prj, /^PROJCS\["RGF_1993_Lambert_93"/);
  assert.match(prj, /False_Easting",700000/);
  assert.equal(parNom('FRT_q7.cpg').donnees.toString(), 'UTF-8');
  const shp = parNom('FRT_q7.shp').donnees; const shx = parNom('FRT_q7.shx').donnees; const dbf = parNom('FRT_q7.dbf').donnees;
  assert.equal(shp.readInt32BE(0), 9994);
  assert.equal(shp.readInt32BE(24) * 2, shp.length, 'longueur du .shp en mots de 16 bits');
  assert.equal(shp.readInt32LE(32), 5, 'type polygone');
  assert.equal(shx.readInt32BE(24) * 2, shx.length);
  assert.equal((shx.length - 100) / 8, 2);
  assert.equal(dbf.readUInt32LE(4), 2, '2 enregistrements');
  assert.equal(dbf.toString('latin1', 32, 39), 'code_ug');
  const xmin = shp.readDoubleLE(36); const ymin = shp.readDoubleLE(44);
  assert.ok(Math.abs(xmin - F.CENTRE_L93.x) < 2000 && Math.abs(ymin - F.CENTRE_L93.y) < 2000);
  // décalage du 2e enregistrement dans le .shx = position réelle dans le .shp
  assert.equal(shp.readInt32BE(shx.readInt32BE(108) * 2), 2, 'numéro du 2e enregistrement');
});

test('Shapefile « sans .prj » : shp, shx, dbf, cpg seulement (le piège de CLAUDE.md)', () => {
  const noms = F.NOMS_ENTREES.filter((n) => n.startsWith('FRT_sansprj'));
  assert.deepEqual(noms, ['FRT_sansprj.shp', 'FRT_sansprj.shx', 'FRT_sansprj.dbf', 'FRT_sansprj.cpg']);
});

test('aucune coordonnée d\'essai hors de l\'emprise de la spec § 4 (sauf Sans_crs, lu en WGS84 à dessein)', () => {
  for (const n of ['UG_q1.geojson', 'UG_q2.geojson', 'UG_q4.geojson']) {
    const g = JSON.parse(parNom(n).donnees.toString('utf8'));
    for (const f of g.features) for (const [x, y] of f.geometry.coordinates[0]) {
      assert.ok(x >= L.EMPRISE_L93.xmin && x <= L.EMPRISE_L93.xmax && y >= L.EMPRISE_L93.ymin && y <= L.EMPRISE_L93.ymax, n);
    }
  }
});

// ---------------------------------------------------------------- empaquetage

test('empaqueteur : 4 fichiers, plugin à la racine du zip, projet sans cerf_id', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'cerf-p2-emp-'));
  try {
    const r = empaqueter(dossier);
    assert.deepEqual(Object.keys(r.fichiers).sort(), ['cerf-essai-2.zip', 'cerf-prototype-2.zip', 'essai-q3.gpkg', 'essai-styles.zip']);
    const plugin = L.listerZip(readFileSync(join(dossier, 'cerf-prototype-2.zip'))).entrees.map((e) => e.nom);
    assert.deepEqual(plugin, FICHIERS_PLUGIN);
    assert.ok(plugin.includes('main.qml') && plugin.every((n) => !n.includes('/')), 'main.qml à la racine');
    const zp = readFileSync(join(dossier, 'cerf-essai-2.zip'));
    const e = L.listerZip(zp).entrees;
    assert.deepEqual(e.map((x) => x.nom), ['cerf-essai-2.qgs']);
    assert.ok(Buffer.compare(readFileSync(join(dossier, 'essai-q3.gpkg')), essais.gpkg) === 0);
    assert.ok(Buffer.compare(readFileSync(join(dossier, 'essai-styles.zip')), essais.zip) === 0);
  } finally { rmSync(dossier, { recursive: true, force: true }); }
});

test('projet d\'essai : EPSG:2154, sans cerf_id, sans couche', () => {
  const q = lire('essai-projet/cerf-essai-2.qgs');
  assert.match(q, /<authid>EPSG:2154<\/authid>/);
  assert.doesNotMatch(q, /cerf_id/);
  assert.doesNotMatch(q, /<maplayer/);
  assert.ok(equilibre(q));
});

// ---------------------------------------------------------------- écran et point d'entrée

test('Essai.qml : chaque nom pris au module existe ; chaque bouton y figure ; try/catch présents', () => {
  const essai = lire('Essai.qml');
  const utilises = new Set([...essai.matchAll(/\bZip\.([A-Za-z_]\w*)/g)].map((m) => m[1]));
  assert.ok(utilises.size > 5);
  for (const n of utilises) assert.ok(n in L, `Zip.${n} absent de essai-logique.mjs`);
  for (const cle of Object.keys(L.BOUTONS)) assert.ok(essai.includes(`Zip.BOUTONS.${cle}`), `bouton ${cle} absent de Essai.qml`);
  assert.ok((essai.match(/catch \(/g) || []).length >= 5, 'chaque appel à QField est protégé');
});

test('main.qml n\'importe aucun .mjs ; metadata : nom, version du module', () => {
  const m = lire('main.qml');
  assert.doesNotMatch(m, /import "[^"]*\.mjs"/);
  assert.match(m, /Essai\.qml/);
  assert.match(m, /addItemToPluginsToolbar/);
  const md = lire('metadata.txt');
  assert.match(md, /name=Cerf, prototype n° 2/);
  assert.ok(md.includes(`version=${L.VERSION}`));
});

test('noms de boutons : numérotés, uniques', () => {
  const noms = Object.values(L.BOUTONS);
  assert.equal(new Set(noms).size, noms.length);
  assert.deepEqual(Object.keys(L.BOUTONS), ['B0', 'B1', 'B2', 'B3', 'B4', 'B4B', 'B4C', 'B4D', 'B5M', 'B5R', 'B6', 'B7']);
});

// ---------------------------------------------------------------- compléments

test('classerSortie : sans changement, vide, non numérique, transformée', () => {
  assert.match(L.classerSortie({ x: 1, y: 2 }, { x: 1, y: 2 }), /SANS changement/);
  assert.match(L.classerSortie({ x: 1, y: 2 }, { x: 0, y: 0 }), /vide.*ÉCHEC/);
  assert.match(L.classerSortie({ x: 1, y: 2 }, { x: undefined, y: 5 }), /non numérique/);
  assert.match(L.classerSortie({ x: 1, y: 2 }, { x: NaN, y: 5 }), /NaN/);
  assert.match(L.classerSortie({ x: 7.76, y: 48.5 }, { x: 1051112, y: 6840461 }), /transformée/);
  assert.match(L.classerSortie({ x: 1, y: 2 }, null), /non numérique/);
});

test('dossierDe, cheminRecu, ligneEntree', () => {
  assert.equal(L.dossierDe('/a/b/c.qgs'), '/a/b');
  assert.equal(L.cheminRecu('/p/cerf-imports/', 'essai-styles.zip'), '/p/cerf-imports/essai-styles.zip');
  assert.equal(L.cheminRecu('/p/cerf-imports/', '/x/y.zip'), '/x/y.zip');
  assert.equal(L.hex32(0xab), '000000AB');
  const z = ecrireZip([entree('a.txt', 'bonjour', true), entree('b.txt', 'x'.repeat(200), false)]);
  const e = L.listerZip(z).entrees;
  assert.match(L.ligneEntree(e[0]), /^a\.txt : stockée, 7 octets, CRC32 [0-9A-F]{8}$/);
  assert.match(L.ligneEntree(e[1]), /COMPRESSÉE \(méthode 8\), non extraite/);
});

test('prototype 2 ne touche pas à plugin/ : aucun fichier de plugin/ n\'est importé', () => {
  for (const f of ['essai-logique.mjs', 'fabriquer-essais.mjs', 'empaqueter.mjs', 'Essai.qml', 'main.qml']) {
    assert.doesNotMatch(lire(f), /\.\.\/plugin\//, f);
  }
});

// ---------------------------------------------------------------- aller-retour 1 (relecture)

const DBL_MAX = Number.MAX_VALUE;

test('relecture 1 (bloquant) : le rectangle vide de QGIS >= 3.34 (±DBL_MAX) n\'est pas vraisemblable', () => {
  const vide = { xMinimum: DBL_MAX, xMaximum: -DBL_MAX, yMinimum: DBL_MAX, yMaximum: -DBL_MAX };
  assert.equal(L.empriseVraisemblable(vide), false);
  assert.match(L.verdictSansCrs('EPSG:4326', vide), /refus/i);
  assert.doesNotMatch(L.verdictSansCrs('EPSG:4326', vide), /chargée/i);
});

test('emprise : min > max, valeurs proches de DBL_MAX et isNull vrai sont refusés ; une bonne emprise passe', () => {
  const bonne = { xMinimum: 1050000, xMaximum: 1052000, yMinimum: 6839000, yMaximum: 6842000 };
  assert.equal(L.empriseVraisemblable(bonne), true);
  assert.equal(L.empriseVraisemblable({ ...bonne, isNull: false }), true);
  assert.equal(L.empriseVraisemblable({ ...bonne, isNull: true }), false);
  assert.equal(L.empriseVraisemblable({ ...bonne, xMinimum: 1053000 }), false, 'xMin > xMax');
  assert.equal(L.empriseVraisemblable({ ...bonne, yMinimum: 6843000 }), false, 'yMin > yMax');
  assert.equal(L.empriseVraisemblable({ ...bonne, xMaximum: DBL_MAX }), false);
  assert.equal(L.empriseVraisemblable({ ...bonne, yMinimum: -DBL_MAX }), false);
  assert.equal(L.empriseVraisemblable({ xMinimum: DBL_MAX, xMaximum: DBL_MAX, yMinimum: DBL_MAX, yMaximum: DBL_MAX }), false);
});

test('Sans_crs : EPSG:4326 et OGC:CRS84 sont tous deux admis comme WGS84', () => {
  assert.equal(L.estWgs84('EPSG:4326'), true);
  assert.equal(L.estWgs84('OGC:CRS84'), true);
  assert.equal(L.estWgs84('EPSG:2154'), false);
  assert.equal(L.estWgs84(''), false);
  assert.match(L.ecrirePosition(7.76189, 48.56906, 'OGC:CRS84'), /OGC:CRS84, longitude = 7,76189 ; latitude = 48,56906/);
});

test('relecture 2 : garde « projet ouvert = cerf-essai-2.qgs »', () => {
  assert.equal(L.PROJET_ESSAI, 'cerf-essai-2.qgs');
  assert.equal(L.estProjetEssai('/storage/emulated/0/Android/data/ch.opengis.qfield/files/Imported Projects/cerf-essai-2/cerf-essai-2.qgs'), true);
  assert.equal(L.estProjetEssai('cerf-essai-2.qgs'), true);
  assert.equal(L.estProjetEssai('/sdcard/Cerf/cerf.qgz'), false, 'le vrai projet de terrain');
  assert.equal(L.estProjetEssai('/sdcard/x/cerf-essai-2.qgs.bak'), false);
  assert.equal(L.estProjetEssai('/sdcard/x/ancien-cerf-essai-2.qgs'), false);
  assert.equal(L.estProjetEssai('/sdcard/cerf-essai-2.qgs/autre.qgs'), false);
  assert.equal(L.estProjetEssai(''), false);
  assert.equal(L.estProjetEssai(undefined), false);
  assert.equal(L.estProjetEssai(null), false);
});

test('relecture 2 : Essai.qml garde chaque bouton et le rechargement de la réouverture', () => {
  const essai = lire('Essai.qml');
  const gardes = (essai.match(/projetOk\(titre\)/g) || []).length;
  // 0, 1, 2, 3, 4, 4b, 4c, 4d, 5 mémoriser, 6, 7 = 11 boutons gardés (5 réouverture : garde propre)
  assert.ok(gardes >= 11, `${gardes} gardes projetOk`);
  assert.match(essai, /function reouverture[\s\S]*?if \(!Zip\.estProjetEssai\(nomProjet\(\)\)\)/);
});

test('relecture 3 : la question 5 compte les couches par leur source (chemin), non par une marque', () => {
  const registre = [
    { chemin: '/p/cerf-imports/q1/UG_q1.geojson', nom: 'UG_q1' },
    { chemin: '/p/cerf-imports/q3/Parcelles_q3.gpkg|layername=Parcelles_q3', nom: 'Parcelles_q3' },
  ];
  assert.deepEqual(L.compterParSource(registre, []), { nombre: 0, noms: [] });
  assert.deepEqual(L.compterParSource(registre, ['/p/cerf-imports/q1/UG_q1.geojson']), { nombre: 1, noms: ['UG_q1'] });
  assert.equal(L.compterParSource(registre, ['/p/cerf-imports/q1/UG_q1.geojson', '/p/cerf-imports/q3/Parcelles_q3.gpkg|layername=Parcelles_q3']).nombre, 2);
  // une autre table du même GeoPackage n'est pas la bonne couche
  assert.equal(L.compterParSource(registre, ['/p/cerf-imports/q3/Parcelles_q3.gpkg|layername=autre']).nombre, 0);
  // même nom dans un autre dossier : non
  assert.equal(L.compterParSource(registre, ['/autre/UG_q1.geojson']).nombre, 0);
  // options OGR après le chemin : le chemin seul compte
  assert.equal(L.compterParSource(registre, ['/p/cerf-imports/q1/UG_q1.geojson|option:X=1']).nombre, 1);
  assert.equal(L.cheminDeSource('/a/b.gpkg|layername=t'), '/a/b.gpkg');
  const essai = lire('Essai.qml');
  assert.match(essai, /function reouverture[\s\S]*compterParSource/);
  assert.doesNotMatch(essai.slice(essai.indexOf('function reouverture')), /coucheMarquee\(liste/, 'plus de comptage par la marque à la réouverture');
});

test('relecture 4 : rmFile n\'efface que dans <projet>/cerf-imports/ (garde peutEffacerQml)', () => {
  const projet = '/storage/emulated/0/Cerf';
  assert.equal(L.peutEffacerQml(projet + '/cerf-imports/q4/UG_q4.qml', projet), true);
  assert.equal(L.peutEffacerQml(projet + '/cerf-imports/q4/UG_q4.qml', projet + '/'), true);
  assert.equal(L.peutEffacerQml(projet + '/cerf-imports/UG.qml', projet), true);
  for (const mauvais of [
    projet + '/cerf.qgz', projet + '/cerf-imports/q4/UG_q4.geojson', projet + '/cerf-imports/essai-styles.zip',
    projet + '/UG_q4.qml', projet + '/cerf-imports/../cerf.qml', projet + '/cerf-imports/../../x.qml',
    projet + '/cerf-imports//q4/x.qml', projet + '/cerf-imports/', projet + '/cerf-imports',
    '/storage/emulated/0/Autre/cerf-imports/q4/x.qml', projet + '-autre/cerf-imports/x.qml',
    'cerf-imports/q4/x.qml', '', projet + '/cerf-imports/q4\\x.qml', projet + '/cerf-imports/.qml',
  ]) assert.equal(L.peutEffacerQml(mauvais, projet), false, mauvais);
  assert.equal(L.peutEffacerQml(projet + '/cerf-imports/q4/UG_q4.qml', ''), false);
  assert.equal(L.peutEffacerQml(projet + '/cerf-imports/q4/UG_q4.qml', '/'), false);
  assert.equal(L.peutEffacerQml('/cerf-imports/x.qml', '/'), false);
  assert.equal(L.peutEffacerQml(undefined, projet), false);
  assert.equal(L.peutEffacerQml(projet + '/cerf-imports/x.qml', undefined), false);
  const essai = lire('Essai.qml');
  assert.match(essai, /platformUtilities\.rmFile\(qml\)/);
  assert.doesNotMatch(essai, /deleteFiles/);
  assert.match(essai, /peutEffacerQml\(qml, dossierProjet\(\)\)[\s\S]*rmFile/, 'garde avant rmFile');
  assert.match(essai, /Couche A retirée : /);
});

test('relecture 5 : axes inversés détectés à la ligne 1 de la question 6', () => {
  const j = L.jugerPoint(6840462, 1051113);
  assert.equal(j.conforme, false);
  assert.match(j.texte, /AXES INVERSÉS/);
  assert.equal(L.jugerPoint(1051113, 6840462).conforme, true);
  assert.doesNotMatch(L.jugerPoint(1051120, 6840462).texte, /AXES/);
});

test('relecture 5 : layer_styles déclarée dans gpkg_contents (attributes), sans emprise ni système', () => {
  const { db, nettoyer } = ouvrirGpkg();
  try {
    const c = db.prepare("SELECT * FROM gpkg_contents WHERE table_name='layer_styles'").get();
    assert.equal(c.data_type, 'attributes');
    assert.equal(c.identifier, 'layer_styles');
    assert.equal(c.srs_id, null);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM gpkg_contents').get().n, 2);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM gpkg_geometry_columns WHERE table_name='layer_styles'").get().n, 0);
  } finally { nettoyer(); }
});

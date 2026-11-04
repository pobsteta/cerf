// SPDX-License-Identifier: GPL-3.0-or-later
// Cerf, prototype n° 2 (mission 023) : fabrique les fichiers d'essai (zip stocké
// essai-styles.zip, GeoPackage essai-q3.gpkg avec table layer_styles) à partir de rien :
// mêmes octets à chaque fabrication, jamais versés au dépôt (publiés par la préversion).
// Données FICTIVES : carrés de 300 m autour de Strasbourg, sans valeur métier, en Lambert 93
// (EPSG:2154), coordonnées X (est) puis Y (nord), en mètres.
//
// Mission 027 : fabriquerEssais3() fabrique en plus essai-styles-z.zip, ENTIÈREMENT compressé
// (méthode 8, node:zlib), dont un GeoPackage à deux tables sans layer_styles et un GeoJSON de
// 2 000 polygones. Le zip essai-styles.zip (stocké) reste inchangé, octet pour octet.
//
// Mission 030 : fabriquerEssais4() fabrique essai-tables-z.zip, ENTIÈREMENT compressé, avec cinq
// GeoPackage pour le bouton 13 (lister les tables) : essai-q3.gpkg (une table vecteur et
// layer_styles), essai-gpkg2.gpkg (deux tables vecteur), un raster seul, un vide, et deux copies
// tronquées de essai-gpkg2.gpkg. Les deux autres zips restent inchangés, octet pour octet.
//
// Usage : node prototype-2/fabriquer-essais.mjs [dossier-de-sortie]
//
// Limite dite : ni QGIS ni GDAL dans la session de fabrication ; les .qml et le GeoPackage
// ont été écrits de mémoire du format QGIS et contrôlés par des tests Node seulement. Pascal
// les ouvre dans QGIS avant l'essai (tests/recette/prototype-2.md, « Avant de commencer »).
import { writeFileSync, readFileSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { ecrireZip } from '../tests/recette/essai/zip-ecrire.mjs';
import { PRJ_L93 } from '../tests/recette/essai/fabriquer-essais.mjs';
import { STYLES, qmlStyle, CHAMP_ETIQUETTE, NOM_ZIP_Z, NOM_GPKG2, NOM_ZIP_T, GPKG_TABLES, crc32 } from './essai-logique.mjs';

// Centre des essais : le point de la question 6 reprojeté (1 051 112,70 ; 6 840 461,54,
// pyproj 3.8.0), arrondi au mètre.
export const CENTRE_L93 = { x: 1051113, y: 6840462 };
const COTE = 300;

// Styles du manuel et .qml : dans essai-logique.mjs (le plugin écrit lui-même le .qml des
// boutons 8 à 12, mission 027) ; repris ici pour la fabrication des fichiers d'essai.
export { STYLES, qmlStyle };
const CHAMP = CHAMP_ETIQUETTE;

// Le .qml de la question 4, écrit PAR LE PLUGIN après le chargement : même texte que celui
// rangé dans le zip, en vert-bleu (style FRT) pour qu'on le distingue du bleu des questions 1 et 2.
export function qmlQ4() {
  return qmlStyle(STYLES.frt);
}

// --------------------------------------------------------------------------- géométries

// Deux carrés de 300 m : (dx, dy) = décalage du premier par rapport au centre, le second
// est 350 m plus au nord. Anneaux : [[x, y], …] fermés, sens anti-horaire (GeoJSON, GeoPackage).
function carres(dx, dy) {
  const un = (cx, cy) => {
    const x0 = CENTRE_L93.x + cx - COTE / 2;
    const y0 = CENTRE_L93.y + cy - COTE / 2;
    return [[x0, y0], [x0 + COTE, y0], [x0 + COTE, y0 + COTE], [x0, y0 + COTE], [x0, y0]];
  };
  return [un(dx, dy), un(dx, dy + 350)];
}

const geojson = (nom, anneaux, codes, avecCrs) => JSON.stringify({
  type: 'FeatureCollection',
  name: nom,
  ...(avecCrs ? { crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::2154' } } } : {}),
  features: anneaux.map((a, i) => ({ type: 'Feature', properties: { [CHAMP]: codes[i] }, geometry: { type: 'Polygon', coordinates: [a] } })),
}) + '\n';

function emprise(anneaux) {
  const xs = anneaux.flat().map((p) => p[0]); const ys = anneaux.flat().map((p) => p[1]);
  return { xmin: Math.min(...xs), xmax: Math.max(...xs), ymin: Math.min(...ys), ymax: Math.max(...ys) };
}

// .dbf dBASE III : champs texte (type C) ; valeurs en UTF-8, complétées par des espaces à la
// longueur du champ (en OCTETS). Avec le seul champ code_ug de 10 octets, les mêmes octets
// qu'avant la mission 027 (le zip essai-styles.zip reste inchangé).
function ecrireDbf(champs, n) {
  const tailleEntete = 32 + 32 * champs.length + 1;
  const tailleEnr = 1 + champs.reduce((a, c) => a + c.longueur, 0);
  const dbf = Buffer.alloc(tailleEntete + tailleEnr * n + 1);
  dbf[0] = 3; dbf[1] = 126; dbf[2] = 11; dbf[3] = 4;
  dbf.writeUInt32LE(n, 4); dbf.writeUInt16LE(tailleEntete, 8); dbf.writeUInt16LE(tailleEnr, 10);
  champs.forEach((c, k) => { dbf.write(c.nom, 32 + 32 * k, 'latin1'); dbf[32 + 32 * k + 11] = 0x43; dbf[32 + 32 * k + 16] = c.longueur; });
  dbf[tailleEntete - 1] = 0x0d;
  for (let i = 0; i < n; i++) {
    let o = tailleEntete + tailleEnr * i;
    dbf[o++] = 0x20;
    for (const c of champs) {
      const v = Buffer.from(c.valeurs[i], 'utf8');
      if (v.length > c.longueur) throw new Error(`valeur trop longue pour le champ ${c.nom} : ${c.valeurs[i]}`);
      dbf.fill(0x20, o, o + c.longueur);
      v.copy(dbf, o);
      o += c.longueur;
    }
  }
  dbf[dbf.length - 1] = 0x1a;
  return dbf;
}

// Shapefile polygone (ESRI, 1998) : anneaux horaires dans le .shp.
function shapefile(anneaux, codes, noms) {
  const e = emprise(anneaux);
  const tailleEnr = 8 + 4 + 32 + 4 + 4 + 4 + 16 * 5; // en-tête d'enregistrement + contenu = 136
  const shp = Buffer.alloc(100 + tailleEnr * anneaux.length);
  const shx = Buffer.alloc(100 + 8 * anneaux.length);
  const entete = (b, octets) => {
    b.writeInt32BE(9994, 0); b.writeInt32BE(octets / 2, 24); b.writeInt32LE(1000, 28); b.writeInt32LE(5, 32);
    [e.xmin, e.ymin, e.xmax, e.ymax].forEach((v, i) => b.writeDoubleLE(v, 36 + 8 * i));
  };
  entete(shp, shp.length); entete(shx, shx.length);
  anneaux.forEach((a, i) => {
    const horaire = [a[0], a[3], a[2], a[1], a[0]];
    const ex = emprise([a]);
    const o = 100 + tailleEnr * i;
    shp.writeInt32BE(i + 1, o); shp.writeInt32BE((tailleEnr - 8) / 2, o + 4);
    shp.writeInt32LE(5, o + 8);
    [ex.xmin, ex.ymin, ex.xmax, ex.ymax].forEach((v, k) => shp.writeDoubleLE(v, o + 12 + 8 * k));
    shp.writeInt32LE(1, o + 44); shp.writeInt32LE(5, o + 48); shp.writeInt32LE(0, o + 52);
    horaire.forEach((p, k) => { shp.writeDoubleLE(p[0], o + 56 + 16 * k); shp.writeDoubleLE(p[1], o + 64 + 16 * k); });
    shx.writeInt32BE(o / 2, 100 + 8 * i); shx.writeInt32BE((tailleEnr - 8) / 2, 104 + 8 * i);
  });
  // .dbf : un champ texte « code_ug » de 10 caractères ; avec « noms » (mission 027), un second
  // champ texte « nom » de 20 octets, en UTF-8 (le .cpg dit UTF-8) pour éprouver les accents.
  const champs = [{ nom: CHAMP, longueur: 10, valeurs: codes }];
  if (noms) champs.push({ nom: 'nom', longueur: 20, valeurs: noms });
  const dbf = ecrireDbf(champs, codes.length);
  return { shp, shx, dbf };
}

// --------------------------------------------------------------------------- GeoPackage

// Écrit avec node:sqlite (comme outils/projet-modele.mjs) : GeoPackage OGC 12-128 1.3, sans
// R-tree (ses déclencheurs appellent ST_*, absentes de node:sqlite). WKT des deux systèmes
// repris de outils/projet-modele.mjs (même source : base EPSG via GDAL/PROJ).
const WKT_4326 = 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AXIS["Latitude",NORTH],AXIS["Longitude",EAST],AUTHORITY["EPSG","4326"]]';
const WKT_2154 = 'PROJCS["RGF93 v1 / Lambert-93",GEOGCS["RGF93 v1",DATUM["RGF93_v1",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],TOWGS84[0,0,0,0,0,0,0],AUTHORITY["EPSG","6171"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4171"]],PROJECTION["Lambert_Conformal_Conic_2SP"],PARAMETER["latitude_of_origin",46.5],PARAMETER["central_meridian",3],PARAMETER["standard_parallel_1",49],PARAMETER["standard_parallel_2",44],PARAMETER["false_easting",700000],PARAMETER["false_northing",6600000],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["Easting",EAST],AXIS["Northing",NORTH],AUTHORITY["EPSG","2154"]]';
const DATE_FIXE = '2026-11-04T00:00:00.000Z';
export const TABLE_Q3 = 'Parcelles_q3';

// Géométrie GeoPackage (en-tête « GP », enveloppe XY) + WKB polygone, petit-boutiste.
function blobPolygone(anneau) {
  const e = emprise([anneau]);
  const b = Buffer.alloc(40 + 1 + 4 + 4 + 4 + 16 * anneau.length);
  b.write('GP', 0, 'latin1'); b[2] = 0; b[3] = 0x03; b.writeInt32LE(2154, 4);
  b.writeDoubleLE(e.xmin, 8); b.writeDoubleLE(e.xmax, 16); b.writeDoubleLE(e.ymin, 24); b.writeDoubleLE(e.ymax, 32);
  b[40] = 1; b.writeUInt32LE(3, 41); b.writeUInt32LE(1, 45); b.writeUInt32LE(anneau.length, 49);
  anneau.forEach((p, k) => { b.writeDoubleLE(p[0], 53 + 16 * k); b.writeDoubleLE(p[1], 61 + 16 * k); });
  return b;
}

function fabriquerGpkg(anneaux, codes) {
  const dossier = mkdtempSync(join(tmpdir(), 'cerf-gpkg-'));
  const chemin = join(dossier, 'essai-q3.gpkg');
  try {
    const db = new DatabaseSync(chemin);
    try {
      db.exec(`PRAGMA page_size = 4096; PRAGMA journal_mode = DELETE; PRAGMA application_id = 1196444487; PRAGMA user_version = 10300;
CREATE TABLE gpkg_spatial_ref_sys (srs_name TEXT NOT NULL, srs_id INTEGER PRIMARY KEY, organization TEXT NOT NULL, organization_coordsys_id INTEGER NOT NULL, definition TEXT NOT NULL, description TEXT);
CREATE TABLE gpkg_contents (table_name TEXT NOT NULL PRIMARY KEY, data_type TEXT NOT NULL, identifier TEXT UNIQUE, description TEXT DEFAULT '', last_change DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE, srs_id INTEGER, CONSTRAINT fk_gc_r_srs_id FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys(srs_id));
CREATE TABLE gpkg_geometry_columns (table_name TEXT NOT NULL, column_name TEXT NOT NULL, geometry_type_name TEXT NOT NULL, srs_id INTEGER NOT NULL, z TINYINT NOT NULL, m TINYINT NOT NULL, CONSTRAINT pk_geom_cols PRIMARY KEY (table_name, column_name), CONSTRAINT uk_gc_table_name UNIQUE (table_name), CONSTRAINT fk_gc_tn FOREIGN KEY (table_name) REFERENCES gpkg_contents(table_name), CONSTRAINT fk_gc_srs FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys (srs_id));
CREATE TABLE ${TABLE_Q3} (fid INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, geom POLYGON, ${CHAMP} TEXT);
CREATE TABLE layer_styles (id INTEGER PRIMARY KEY AUTOINCREMENT, f_table_catalog TEXT(256), f_table_schema TEXT(256), f_table_name TEXT(256), f_geometry_column TEXT(256), styleName TEXT(30), styleQML TEXT, styleSLD TEXT, useAsDefault BOOLEAN, description TEXT, owner TEXT(30), ui TEXT(30), update_time DATETIME DEFAULT CURRENT_TIMESTAMP);`);
      const srs = db.prepare('INSERT INTO gpkg_spatial_ref_sys VALUES (?,?,?,?,?,?)');
      srs.run('Undefined Cartesian SRS', -1, 'NONE', -1, 'undefined', 'undefined Cartesian coordinate reference system');
      srs.run('Undefined geographic SRS', 0, 'NONE', 0, 'undefined', 'undefined geographic coordinate reference system');
      srs.run('WGS 84 geodetic', 4326, 'EPSG', 4326, WKT_4326, 'longitude/latitude coordinates in decimal degrees on the WGS 84 spheroid');
      srs.run('RGF93 v1 / Lambert-93', 2154, 'EPSG', 2154, WKT_2154, 'Lambert-93, France métropolitaine (Corse comprise)');
      const e = emprise(anneaux);
      db.prepare('INSERT INTO gpkg_contents (table_name, data_type, identifier, description, last_change, min_x, min_y, max_x, max_y, srs_id) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .run(TABLE_Q3, 'features', TABLE_Q3, '', DATE_FIXE, e.xmin, e.ymin, e.xmax, e.ymax, 2154);
      // layer_styles déclarée comme table non spatiale (data_type « attributes »), comme le fait
      // QGIS : sans cela, un lecteur strict du GeoPackage la signale hors du contenu.
      db.prepare('INSERT INTO gpkg_contents (table_name, data_type, identifier, description, last_change, srs_id) VALUES (?,?,?,?,?,?)')
        .run('layer_styles', 'attributes', 'layer_styles', '', DATE_FIXE, null);
      db.prepare('INSERT INTO gpkg_geometry_columns VALUES (?,?,?,?,0,0)').run(TABLE_Q3, 'geom', 'POLYGON', 2154);
      const ins = db.prepare(`INSERT INTO ${TABLE_Q3} (geom, ${CHAMP}) VALUES (?, ?)`);
      anneaux.forEach((a, i) => ins.run(blobPolygone(a), codes[i]));
      db.prepare('INSERT INTO layer_styles (f_table_catalog, f_table_schema, f_table_name, f_geometry_column, styleName, styleQML, styleSLD, useAsDefault, description, owner, ui, update_time) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .run('', '', TABLE_Q3, 'geom', TABLE_Q3, qmlStyle(STYLES.parcelles), '', 1, '', '', '', DATE_FIXE);
    } finally { db.close(); }
    return readFileSync(chemin);
  } finally { rmSync(dossier, { recursive: true, force: true }); }
}

// --------------------------------------------------------------------------- le zip

// Ordre et noms des entrées (17 : 13 de la fabrication de base + 4 du Shapefile « sans .prj »).
export const NOMS_ENTREES = [
  'UG_q1.geojson', 'UG_q1.qml',
  'UG_q2.geojson', 'UG_q2.qml',
  'UG_q4.geojson', 'UG_q4.qml',
  'Parcelles_q3.gpkg',
  'Sans_crs.geojson',
  'FRT_q7.shp', 'FRT_q7.shx', 'FRT_q7.dbf', 'FRT_q7.prj', 'FRT_q7.cpg',
  'FRT_sansprj.shp', 'FRT_sansprj.shx', 'FRT_sansprj.dbf', 'FRT_sansprj.cpg',
];

// Rend { entrees: [{ nom, donnees }], zip, gpkg }. Toutes les entrées sont STOCKÉES.
export function fabriquerEssais() {
  const q1 = carres(-800, 0); const q2 = carres(-400, 0); const q4 = carres(400, 0);
  const q3 = carres(0, 0); const q7 = carres(800, 0); const sp = carres(800, 800); const sc = carres(0, 800);
  const qmlUG = qmlStyle(STYLES.ug);
  const gpkg = fabriquerGpkg(q3, ['P1', 'P2']);
  const f7 = shapefile(q7, ['FRT1', 'FRT2']);
  const fp = shapefile(sp, ['FRT3', 'FRT4']);
  const b = (x) => (Buffer.isBuffer(x) ? x : Buffer.from(x, 'utf8'));
  const contenus = {
    'UG_q1.geojson': geojson('UG_q1', q1, ['UG1', 'UG2'], true), 'UG_q1.qml': qmlUG,
    'UG_q2.geojson': geojson('UG_q2', q2, ['UG3', 'UG4'], true), 'UG_q2.qml': qmlUG,
    'UG_q4.geojson': geojson('UG_q4', q4, ['UG5', 'UG6'], true), 'UG_q4.qml': qmlQ4(),
    'Parcelles_q3.gpkg': gpkg,
    'Sans_crs.geojson': geojson('Sans_crs', sc, ['SC1', 'SC2'], false),
    'FRT_q7.shp': f7.shp, 'FRT_q7.shx': f7.shx, 'FRT_q7.dbf': f7.dbf, 'FRT_q7.prj': PRJ_L93, 'FRT_q7.cpg': 'UTF-8',
    'FRT_sansprj.shp': fp.shp, 'FRT_sansprj.shx': fp.shx, 'FRT_sansprj.dbf': fp.dbf, 'FRT_sansprj.cpg': 'UTF-8',
  };
  const entrees = NOMS_ENTREES.map((nom) => ({ nom, donnees: b(contenus[nom]) }));
  const zip = ecrireZip(entrees.map((e) => ({ nom: Buffer.from(e.nom, 'utf8'), donnees: e.donnees, stocke: true, utf8: true })));
  return { entrees, zip, gpkg };
}

// --------------------------------------------------------------------------- mission 027

export const NB_GRAND = 2000;
export const NOM_GRAND = 'ProdBois_2000.geojson';

// Entrées du zip compressé (8), dans l'ordre.
export const NOMS_ENTREES_Z = [
  'FRT_q7.shp', 'FRT_q7.shx', 'FRT_q7.dbf', 'FRT_q7.prj', 'FRT_q7.cpg',
  'UG_q1.geojson',
  NOM_GPKG2,
  NOM_GRAND,
];

// Accents du .dbf de FRT_q7 (champ « nom ») : à relire intacts dans la copie.
export const NOMS_FRT_Q7 = ['Étang', 'Forêt'];

// GeoPackage à deux tables (Parcelles, Zones), SANS layer_styles : le style ne peut venir que du
// .qml écrit par le plugin. Même schéma que fabriquerGpkg, sans R-tree. tables : [{ nom, anneaux, codes }].
function fabriquerGpkgTables(tables) {
  const dossier = mkdtempSync(join(tmpdir(), 'cerf-gpkg2-'));
  const chemin = join(dossier, NOM_GPKG2);
  try {
    const db = new DatabaseSync(chemin);
    try {
      db.exec(`PRAGMA page_size = 4096; PRAGMA journal_mode = DELETE; PRAGMA application_id = 1196444487; PRAGMA user_version = 10300;
CREATE TABLE gpkg_spatial_ref_sys (srs_name TEXT NOT NULL, srs_id INTEGER PRIMARY KEY, organization TEXT NOT NULL, organization_coordsys_id INTEGER NOT NULL, definition TEXT NOT NULL, description TEXT);
CREATE TABLE gpkg_contents (table_name TEXT NOT NULL PRIMARY KEY, data_type TEXT NOT NULL, identifier TEXT UNIQUE, description TEXT DEFAULT '', last_change DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE, srs_id INTEGER, CONSTRAINT fk_gc_r_srs_id FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys(srs_id));
CREATE TABLE gpkg_geometry_columns (table_name TEXT NOT NULL, column_name TEXT NOT NULL, geometry_type_name TEXT NOT NULL, srs_id INTEGER NOT NULL, z TINYINT NOT NULL, m TINYINT NOT NULL, CONSTRAINT pk_geom_cols PRIMARY KEY (table_name, column_name), CONSTRAINT uk_gc_table_name UNIQUE (table_name), CONSTRAINT fk_gc_tn FOREIGN KEY (table_name) REFERENCES gpkg_contents(table_name), CONSTRAINT fk_gc_srs FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys (srs_id));`);
      for (const t of tables) db.exec(`CREATE TABLE ${t.nom} (fid INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, geom POLYGON, ${CHAMP} TEXT);`);
      const srs = db.prepare('INSERT INTO gpkg_spatial_ref_sys VALUES (?,?,?,?,?,?)');
      srs.run('Undefined Cartesian SRS', -1, 'NONE', -1, 'undefined', 'undefined Cartesian coordinate reference system');
      srs.run('Undefined geographic SRS', 0, 'NONE', 0, 'undefined', 'undefined geographic coordinate reference system');
      srs.run('WGS 84 geodetic', 4326, 'EPSG', 4326, WKT_4326, 'longitude/latitude coordinates in decimal degrees on the WGS 84 spheroid');
      srs.run('RGF93 v1 / Lambert-93', 2154, 'EPSG', 2154, WKT_2154, 'Lambert-93, France métropolitaine (Corse comprise)');
      for (const t of tables) {
        const e = emprise(t.anneaux);
        db.prepare('INSERT INTO gpkg_contents (table_name, data_type, identifier, description, last_change, min_x, min_y, max_x, max_y, srs_id) VALUES (?,?,?,?,?,?,?,?,?,?)')
          .run(t.nom, 'features', t.nom, '', DATE_FIXE, e.xmin, e.ymin, e.xmax, e.ymax, 2154);
        db.prepare('INSERT INTO gpkg_geometry_columns VALUES (?,?,?,?,0,0)').run(t.nom, 'geom', 'POLYGON', 2154);
        const ins = db.prepare(`INSERT INTO ${t.nom} (geom, ${CHAMP}) VALUES (?, ?)`);
        t.anneaux.forEach((a, i) => ins.run(blobPolygone(a), t.codes[i]));
      }
    } finally { db.close(); }
    return readFileSync(chemin);
  } finally { rmSync(dossier, { recursive: true, force: true }); }
}

// 2 000 polygones (ordre de grandeur du ProdBois de Serre_EA2026) : grille de 50 x 40 carrés de
// 20 m au pas de 25 m, au nord-est du centre des essais. EPSG:2154, avec membre crs.
function grandGeojson() {
  const anneaux = []; const codes = [];
  for (let l = 0; l < 40; l++) {
    for (let c = 0; c < 50; c++) {
      const x0 = CENTRE_L93.x - 625 + 25 * c; const y0 = CENTRE_L93.y + 1500 + 25 * l;
      anneaux.push([[x0, y0], [x0 + 20, y0], [x0 + 20, y0 + 20], [x0, y0 + 20], [x0, y0]]);
      codes.push('PB' + String(anneaux.length).padStart(4, '0'));
    }
  }
  return geojson('ProdBois_2000', anneaux, codes, true);
}

// Rend { entrees: [{ nom, donnees }], zip, gpkg } : essai-styles-z.zip, TOUTES les entrées
// compressées (méthode 8), y compris le .gpkg (déjà un fichier SQLite : c'est le cas réel).
export function fabriquerEssais3() {
  // Emprises DÉCALÉES de 800 m vers le sud par rapport au prototype n° 2 (qui occupe dy = 0 et
  // dy = 800) : aucune copie du prototype n° 3 au même endroit qu'une couche du prototype n° 2
  // (sinon un faux « oui » : la couche d'avant serait prise pour la nouvelle). Zones : 800 m
  // au sud de Parcelles.
  const q7 = carres(800, -800); const q1 = carres(-800, -800);
  const gpkg = fabriquerGpkgTables([
    { nom: 'Parcelles', anneaux: carres(0, -800), codes: ['P1', 'P2'] },
    { nom: 'Zones', anneaux: carres(0, -1600), codes: ['Z1', 'Z2'] },
  ]);
  const f7 = shapefile(q7, ['FRT1', 'FRT2'], NOMS_FRT_Q7);
  const contenus = {
    'FRT_q7.shp': f7.shp, 'FRT_q7.shx': f7.shx, 'FRT_q7.dbf': f7.dbf, 'FRT_q7.prj': PRJ_L93, 'FRT_q7.cpg': 'UTF-8',
    'UG_q1.geojson': geojson('UG_q1', q1, ['UG1', 'UG2'], true),
    [NOM_GPKG2]: gpkg,
    [NOM_GRAND]: grandGeojson(),
  };
  const b = (x) => (Buffer.isBuffer(x) ? x : Buffer.from(x, 'utf8'));
  const entrees = NOMS_ENTREES_Z.map((nom) => ({ nom, donnees: b(contenus[nom]) }));
  const zip = ecrireZip(entrees.map((e) => ({ nom: Buffer.from(e.nom, 'utf8'), donnees: e.donnees, stocke: false, utf8: true })));
  return { entrees, zip, gpkg };
}

// --------------------------------------------------------------------------- mission 030

// PNG en niveaux de gris, une seule couleur (PNG, ISO/IEC 15948 : signature, IHDR, IDAT, IEND ;
// chaque ligne précédée de son octet de filtre 0). Sert de tuile au GeoPackage raster.
export function pngUni(cote, gris) {
  const morceau = (type, donnees) => {
    const t = Buffer.from(type, 'latin1');
    const l = Buffer.alloc(4); l.writeUInt32BE(donnees.length, 0);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([t, donnees])), 0);
    return Buffer.concat([l, t, donnees, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(cote, 0); ihdr.writeUInt32BE(cote, 4);
  ihdr[8] = 8; ihdr[9] = 0; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8 bits, gris, sans entrelacement
  const brut = Buffer.alloc((cote + 1) * cote, gris);
  for (let y = 0; y < cote; y++) brut[y * (cote + 1)] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), morceau('IHDR', ihdr),
    morceau('IDAT', deflateSync(brut)), morceau('IEND', Buffer.alloc(0))]);
}

// Tables obligatoires d'un GeoPackage 1.3 (même schéma que fabriquerGpkg), sans contenu.
const SCHEMA_BASE = `PRAGMA page_size = 4096; PRAGMA journal_mode = DELETE; PRAGMA application_id = 1196444487; PRAGMA user_version = 10300;
CREATE TABLE gpkg_spatial_ref_sys (srs_name TEXT NOT NULL, srs_id INTEGER PRIMARY KEY, organization TEXT NOT NULL, organization_coordsys_id INTEGER NOT NULL, definition TEXT NOT NULL, description TEXT);
CREATE TABLE gpkg_contents (table_name TEXT NOT NULL PRIMARY KEY, data_type TEXT NOT NULL, identifier TEXT UNIQUE, description TEXT DEFAULT '', last_change DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE, srs_id INTEGER, CONSTRAINT fk_gc_r_srs_id FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys(srs_id));
CREATE TABLE gpkg_geometry_columns (table_name TEXT NOT NULL, column_name TEXT NOT NULL, geometry_type_name TEXT NOT NULL, srs_id INTEGER NOT NULL, z TINYINT NOT NULL, m TINYINT NOT NULL, CONSTRAINT pk_geom_cols PRIMARY KEY (table_name, column_name), CONSTRAINT uk_gc_table_name UNIQUE (table_name), CONSTRAINT fk_gc_tn FOREIGN KEY (table_name) REFERENCES gpkg_contents(table_name), CONSTRAINT fk_gc_srs FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys (srs_id));`;

function srsDeBase(db) {
  const srs = db.prepare('INSERT INTO gpkg_spatial_ref_sys VALUES (?,?,?,?,?,?)');
  srs.run('Undefined Cartesian SRS', -1, 'NONE', -1, 'undefined', 'undefined Cartesian coordinate reference system');
  srs.run('Undefined geographic SRS', 0, 'NONE', 0, 'undefined', 'undefined geographic coordinate reference system');
  srs.run('WGS 84 geodetic', 4326, 'EPSG', 4326, WKT_4326, 'longitude/latitude coordinates in decimal degrees on the WGS 84 spheroid');
  srs.run('RGF93 v1 / Lambert-93', 2154, 'EPSG', 2154, WKT_2154, 'Lambert-93, France métropolitaine (Corse comprise)');
}

// Ouvre un GeoPackage neuf dans un dossier temporaire, laisse remplir(db), rend ses octets.
function gpkgNeuf(nom, remplir) {
  const dossier = mkdtempSync(join(tmpdir(), 'cerf-gpkg4-'));
  const chemin = join(dossier, nom);
  try {
    const db = new DatabaseSync(chemin);
    try {
      db.exec(SCHEMA_BASE);
      srsDeBase(db);
      remplir(db);
    } finally { db.close(); }
    return readFileSync(chemin);
  } finally { rmSync(dossier, { recursive: true, force: true }); }
}

// GeoPackage vide : tables obligatoires, aucune ligne dans gpkg_contents (ni vecteur, ni raster).
export function fabriquerGpkgVide() {
  return gpkgNeuf(GPKG_TABLES.vide.nom, () => {});
}

// Emprise de la tuile du raster seul : un carré de 300 m, 2 400 m au sud du centre, EPSG:2154.
export const EMPRISE_RASTER = { xmin: CENTRE_L93.x - 150, ymin: CENTRE_L93.y - 2400 - 150, xmax: CENTRE_L93.x + 150, ymax: CENTRE_L93.y - 2400 + 150 };
export const TABLE_RASTER = 'Fond_raster';

// GeoPackage raster seul (tuiles, OGC 12-128 § 2.2) : une table de tuiles « Fond_raster », un
// niveau de zoom, une tuile PNG de 256 x 256 pixels ; aucune table vecteur.
export function fabriquerGpkgRaster() {
  const e = EMPRISE_RASTER;
  const cote = 256;
  const pixel = (e.xmax - e.xmin) / cote;
  return gpkgNeuf(GPKG_TABLES.raster.nom, (db) => {
    db.exec(`CREATE TABLE gpkg_tile_matrix_set (table_name TEXT NOT NULL PRIMARY KEY, srs_id INTEGER NOT NULL, min_x DOUBLE NOT NULL, min_y DOUBLE NOT NULL, max_x DOUBLE NOT NULL, max_y DOUBLE NOT NULL, CONSTRAINT fk_gtms_table_name FOREIGN KEY (table_name) REFERENCES gpkg_contents(table_name), CONSTRAINT fk_gtms_srs FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys (srs_id));
CREATE TABLE gpkg_tile_matrix (table_name TEXT NOT NULL, zoom_level INTEGER NOT NULL, matrix_width INTEGER NOT NULL, matrix_height INTEGER NOT NULL, tile_width INTEGER NOT NULL, tile_height INTEGER NOT NULL, pixel_x_size DOUBLE NOT NULL, pixel_y_size DOUBLE NOT NULL, CONSTRAINT pk_ttm PRIMARY KEY (table_name, zoom_level), CONSTRAINT fk_tmm_table_name FOREIGN KEY (table_name) REFERENCES gpkg_contents(table_name));
CREATE TABLE ${TABLE_RASTER} (id INTEGER PRIMARY KEY AUTOINCREMENT, zoom_level INTEGER NOT NULL, tile_column INTEGER NOT NULL, tile_row INTEGER NOT NULL, tile_data BLOB NOT NULL, UNIQUE (zoom_level, tile_column, tile_row));`);
    db.prepare('INSERT INTO gpkg_contents (table_name, data_type, identifier, description, last_change, min_x, min_y, max_x, max_y, srs_id) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(TABLE_RASTER, 'tiles', TABLE_RASTER, '', DATE_FIXE, e.xmin, e.ymin, e.xmax, e.ymax, 2154);
    db.prepare('INSERT INTO gpkg_tile_matrix_set VALUES (?,?,?,?,?,?)').run(TABLE_RASTER, 2154, e.xmin, e.ymin, e.xmax, e.ymax);
    db.prepare('INSERT INTO gpkg_tile_matrix VALUES (?,?,?,?,?,?,?,?)').run(TABLE_RASTER, 0, 1, 1, cote, cote, pixel, pixel);
    db.prepare(`INSERT INTO ${TABLE_RASTER} (zoom_level, tile_column, tile_row, tile_data) VALUES (0, 0, 0, ?)`).run(pngUni(cote, 160));
  });
}

// Coupes de essai-gpkg2.gpkg (pages SQLite de 4 096 octets ; 11 pages : sqlite_master en page 1,
// gpkg_contents en page 3, Parcelles en 9, Zones en 11, la dernière). « tronque-debut » garde la
// seule page 1 : gpkg_contents est perdu. « tronque-fin » garde les pages 1 à 10 : gpkg_contents
// est entier, seules les données de Zones manquent. Dans les deux cas l'en-tête SQLite annonce
// 11 pages : SQLite (et GDAL 3.12, essayé sur le poste) refuse le fichier dès la première requête
// (« database disk image is malformed »), au lieu de rendre une liste juste pour un fichier abîmé.
export const TAILLE_PAGE = 4096;
export const PAGES_TRONQUE_DEBUT = 1;
export const PAGES_TRONQUE_FIN = 10;

// Entrées de essai-tables-z.zip, dans l'ordre (toutes compressées, méthode 8).
export const NOMS_ENTREES_T = [GPKG_TABLES.q3.nom, GPKG_TABLES.deux.nom, GPKG_TABLES.raster.nom, GPKG_TABLES.vide.nom,
  GPKG_TABLES.tronqueDebut.nom, GPKG_TABLES.tronqueFin.nom];

// Rend { entrees: [{ nom, donnees }], zip }. essai-q3.gpkg et essai-gpkg2.gpkg sont les mêmes octets
// que ceux du prototype n° 2 et du prototype n° 3 (rien n'est refabriqué autrement).
export function fabriquerEssais4() {
  const q3 = fabriquerEssais().gpkg;
  const deux = fabriquerEssais3().entrees.find((x) => x.nom === NOM_GPKG2).donnees;
  if (deux.length !== 11 * TAILLE_PAGE) throw new Error(`essai-gpkg2.gpkg : ${deux.length} octets, 11 pages attendues (coupes à revoir)`);
  const contenus = {
    [GPKG_TABLES.q3.nom]: q3,
    [GPKG_TABLES.deux.nom]: deux,
    [GPKG_TABLES.raster.nom]: fabriquerGpkgRaster(),
    [GPKG_TABLES.vide.nom]: fabriquerGpkgVide(),
    [GPKG_TABLES.tronqueDebut.nom]: Buffer.from(deux.subarray(0, PAGES_TRONQUE_DEBUT * TAILLE_PAGE)),
    [GPKG_TABLES.tronqueFin.nom]: Buffer.from(deux.subarray(0, PAGES_TRONQUE_FIN * TAILLE_PAGE)),
  };
  const entrees = NOMS_ENTREES_T.map((nom) => ({ nom, donnees: contenus[nom] }));
  const zip = ecrireZip(entrees.map((x) => ({ nom: Buffer.from(x.nom, 'utf8'), donnees: x.donnees, stocke: false, utf8: true })));
  return { entrees, zip };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const sortie = process.argv[2] || dirname(fileURLToPath(import.meta.url));
  mkdirSync(sortie, { recursive: true });
  const r = fabriquerEssais();
  writeFileSync(join(sortie, 'essai-styles.zip'), r.zip);
  writeFileSync(join(sortie, 'essai-q3.gpkg'), r.gpkg);
  const r3 = fabriquerEssais3();
  writeFileSync(join(sortie, NOM_ZIP_Z), r3.zip);
  const r4 = fabriquerEssais4();
  writeFileSync(join(sortie, NOM_ZIP_T), r4.zip);
  console.log(`écrit : ${join(sortie, NOM_ZIP_T)} (${r4.zip.length} octets, ${r4.entrees.length} entrées compressées)`);
  console.log(`écrit : ${join(sortie, NOM_ZIP_Z)} (${r3.zip.length} octets, ${r3.entrees.length} entrées compressées)`);
  console.log(`écrit : ${join(sortie, 'essai-styles.zip')} (${r.zip.length} octets, ${r.entrees.length} entrées) et essai-q3.gpkg (${r.gpkg.length} octets)`);
}

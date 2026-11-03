// Mission 016 : fabrique les zips de recette `piege` et `lourd` (spec § 6, critères 6 et 7),
// à l'identique à chaque fabrication (dates et contenus fixes, aucun hasard).
// Écrit pour Cerf, sans dépendance (Node >= 22.13 pour node:sqlite). Données fictives.
//
// Usage : node outils/zips-recette.mjs <dossier-de-sortie> [piege|lourd|tout] [taille-lourd-en-Mo]
//   <dossier-de-sortie> obligatoire : rien ne tombe dans le dépôt (lourd.zip fait 200 Mo).
//   taille-lourd-en-Mo : 200 par défaut (1 Mo = 1 000 000 octets) ; les tests utilisent 1.
// Réutilise tests/recette/essai/zip-ecrire.mjs et fabriquer-geotiff-lourd.mjs (mission 003).
import { mkdirSync, writeFileSync, readFileSync, openSync, writeSync, closeSync, readSync, statSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { ecrireZip, crc32, enTeteLocal, enTeteCentral, finDeRepertoire } from '../tests/recette/essai/zip-ecrire.mjs';
import { fabriquer as fabriquerGeotiffLourd, NOM_TIF } from '../tests/recette/essai/fabriquer-geotiff-lourd.mjs';

// ---------- zip piege ----------

// Carré de côté `c` dont le coin bas-gauche est (x, y), anneau fermé, sens antihoraire (RFC 7946).
const carre = (x, y, c) => [[x, y], [x + c, y], [x + c, y + c], [x, y + c], [x, y]];

// Piège 1 : GeoJSON en Lambert 93 SANS membre `crs` (lu en WGS84 par défaut : X = 668000
// « degrés » est impossible). Carré de 500 m, environ à Fontainebleau (valeur fictive).
export const GEOJSON_L93_SANS_CRS = JSON.stringify({
  type: 'FeatureCollection', name: 'UG_sans_crs',
  features: [{ type: 'Feature', properties: { CODE: 'UG01' }, geometry: { type: 'Polygon', coordinates: [carre(668000, 6826000, 500)] } }],
}) + '\n';

// Piège 5 : couche vide (CRS84 déclaré, zéro entité).
export const GEOJSON_VIDE = JSON.stringify({
  type: 'FeatureCollection', name: 'UG_vide',
  crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
  features: [],
}) + '\n';

// Piège 4 : nom non reconnu (ni UG, Parcelles, FRT, ni champs essence + diametre) ;
// bien formé, en CRS84 déclaré, en métropole : seul le nom est « piégé ».
export const GEOJSON_NOM_INCONNU = JSON.stringify({
  type: 'FeatureCollection', name: 'Zone_inconnue',
  crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
  features: [{ type: 'Feature', properties: { libelle: 'Z1' }, geometry: { type: 'Polygon', coordinates: [carre(2.7, 48.4, 0.005)] } }],
}) + '\n';

// Piège 2 : Shapefile polygone SANS .prj (.shp .shx .dbf .cpg présents), coordonnées L93.
function enTeteShp(b, mots, [xmin, ymin, xmax, ymax]) {
  b.writeInt32BE(9994, 0); b.writeInt32BE(mots, 24); b.writeInt32LE(1000, 28); b.writeInt32LE(5, 32);
  [xmin, ymin, xmax, ymax].forEach((v, i) => b.writeDoubleLE(v, 36 + 8 * i));
}
export function shapefilePolygoneSansPrj(anneauHoraire, code) {
  const n = anneauHoraire.length;
  const xs = anneauHoraire.map((p) => p[0]); const ys = anneauHoraire.map((p) => p[1]);
  const bbox = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  const contenu = 44 + 4 + 16 * n; // type, bbox, nbParties, nbPoints, parties, points
  const shp = Buffer.alloc(100 + 8 + contenu);
  enTeteShp(shp, shp.length / 2, bbox);
  shp.writeInt32BE(1, 100); shp.writeInt32BE(contenu / 2, 104);
  let o = 108; shp.writeInt32LE(5, o); o += 4;
  bbox.forEach((v) => { shp.writeDoubleLE(v, o); o += 8; });
  shp.writeInt32LE(1, o); o += 4; shp.writeInt32LE(n, o); o += 4; shp.writeInt32LE(0, o); o += 4;
  anneauHoraire.forEach(([x, y]) => { shp.writeDoubleLE(x, o); shp.writeDoubleLE(y, o + 8); o += 16; });
  const shx = Buffer.alloc(108);
  enTeteShp(shx, 54, bbox);
  shx.writeInt32BE(50, 100); shx.writeInt32BE(contenu / 2, 104);
  const dbf = Buffer.alloc(32 + 32 + 1 + 1 + 9 + 1 - 1);
  dbf[0] = 3; dbf[1] = 126; dbf[2] = 11; dbf[3] = 2; dbf.writeUInt32LE(1, 4);
  dbf.writeUInt16LE(65, 8); dbf.writeUInt16LE(9, 10);
  dbf.write('CODE', 32, 'latin1'); dbf[43] = 0x43; dbf[48] = 8; dbf[64] = 0x0d;
  dbf.write(' ' + code.padEnd(8, ' ').slice(0, 8), 65, 'latin1'); dbf[dbf.length - 1] = 0x1a;
  return { shp, shx, dbf, cpg: Buffer.from('UTF-8', 'latin1') };
}

// Piège 3 : GeoTIFF 8 x 8, 8 bits, sans compression, SANS aucune balise de géoréférencement
// (ni ModelPixelScale 33550, ni ModelTiepoint 33922, ni ModelTransformation 34264,
// ni GeoKeyDirectory 34735).
export function geotiffSansGeoref() {
  const cote = 8; const nEntrees = 9;
  const offPixels = 8 + 2 + 12 * nEntrees + 4;
  const b = Buffer.alloc(offPixels + cote * cote);
  b.write('II', 0); b.writeUInt16LE(42, 2); b.writeUInt32LE(8, 4); b.writeUInt16LE(nEntrees, 8);
  let o = 10;
  const ifd = (tag, type, val) => {
    b.writeUInt16LE(tag, o); b.writeUInt16LE(type, o + 2); b.writeUInt32LE(1, o + 4);
    if (type === 3) b.writeUInt16LE(val, o + 8); else b.writeUInt32LE(val, o + 8);
    o += 12;
  };
  ifd(256, 4, cote); ifd(257, 4, cote); ifd(258, 3, 8); ifd(259, 3, 1); ifd(262, 3, 1);
  ifd(273, 4, offPixels); ifd(277, 3, 1); ifd(278, 4, cote); ifd(279, 4, cote * cote);
  for (let i = 0; i < cote * cote; i++) b[offPixels + i] = (i * 4) % 256; // dégradé fixe
  return b;
}

const e = (nom, donnees) => ({ nom: Buffer.from(nom, 'utf8'), donnees: Buffer.isBuffer(donnees) ? donnees : Buffer.from(donnees, 'utf8'), stocke: false, utf8: true });

export function entreesPiege() {
  const sh = shapefilePolygoneSansPrj(carre(668000, 6826000, 500).reverse(), 'P01'); // sens horaire
  return [
    e('FRT_sans_georef.tif', geotiffSansGeoref()),
    e('Parcelles_sans_prj.cpg', sh.cpg),
    e('Parcelles_sans_prj.dbf', sh.dbf),
    e('Parcelles_sans_prj.shp', sh.shp),
    e('Parcelles_sans_prj.shx', sh.shx),
    e('UG_sans_crs.geojson', GEOJSON_L93_SANS_CRS),
    e('UG_vide.geojson', GEOJSON_VIDE),
    e('Zone_inconnue.geojson', GEOJSON_NOM_INCONNU),
  ];
}

export function fabriquerPiege(dossier) {
  mkdirSync(dossier, { recursive: true });
  const chemin = join(dossier, 'piege.zip');
  writeFileSync(chemin, ecrireZip(entreesPiege()));
  return chemin;
}

// ---------- zip lourd ----------

export const NOM_GPKG = 'Serre_lourd.gpkg';
export const COUCHES_GPKG = ['Releves_lourd', 'Parcelles_lourd'];

const wkbPoint = (x, y) => { const b = Buffer.alloc(21); b[0] = 1; b.writeUInt32LE(1, 1); b.writeDoubleLE(x, 5); b.writeDoubleLE(y, 13); return b; };
const wkbPolygone = (anneau) => {
  const b = Buffer.alloc(13 + 16 * anneau.length); b[0] = 1; b.writeUInt32LE(3, 1); b.writeUInt32LE(1, 5); b.writeUInt32LE(anneau.length, 9);
  anneau.forEach(([x, y], i) => { b.writeDoubleLE(x, 13 + 16 * i); b.writeDoubleLE(y, 21 + 16 * i); });
  return b;
};
// En-tête GeoPackage : 'GP', version 0, drapeaux 0b00000011 (little-endian, enveloppe XY), srs_id, enveloppe.
const blobGpkg = (srs, [xmin, xmax, ymin, ymax], wkb) => {
  const h = Buffer.alloc(40); h.write('GP', 0, 'latin1'); h[2] = 0; h[3] = 0b00000011; h.writeInt32LE(srs, 4);
  [xmin, xmax, ymin, ymax].forEach((v, i) => h.writeDoubleLE(v, 8 + 8 * i));
  return Buffer.concat([h, wkb]);
};

// GeoPackage de 2 couches en EPSG:2154 : 100 points (essence, diametre) et 10 parcelles
// carrées, sur une grille fixe près de Fontainebleau. Écrit avec node:sqlite.
export async function fabriquerGpkg(chemin) {
  const { DatabaseSync } = await import('node:sqlite');
  rmSync(chemin, { force: true });
  const db = new DatabaseSync(chemin);
  const DATE = '2026-11-02T00:00:00.000Z';
  db.exec(`PRAGMA application_id = 1196444487; PRAGMA user_version = 10300;
    CREATE TABLE gpkg_spatial_ref_sys (srs_name TEXT NOT NULL, srs_id INTEGER PRIMARY KEY, organization TEXT NOT NULL, organization_coordsys_id INTEGER NOT NULL, definition TEXT NOT NULL, description TEXT);
    CREATE TABLE gpkg_contents (table_name TEXT NOT NULL PRIMARY KEY, data_type TEXT NOT NULL, identifier TEXT UNIQUE, description TEXT DEFAULT '', last_change DATETIME NOT NULL DEFAULT '${DATE}', min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE, srs_id INTEGER);
    CREATE TABLE gpkg_geometry_columns (table_name TEXT NOT NULL, column_name TEXT NOT NULL, geometry_type_name TEXT NOT NULL, srs_id INTEGER NOT NULL, z TINYINT NOT NULL, m TINYINT NOT NULL, PRIMARY KEY (table_name, column_name));`);
  const srs = db.prepare('INSERT INTO gpkg_spatial_ref_sys VALUES (?,?,?,?,?,?)');
  srs.run('Undefined cartesian SRS', -1, 'NONE', -1, 'undefined', 'undefined cartesian coordinate reference system');
  srs.run('Undefined geographic SRS', 0, 'NONE', 0, 'undefined', 'undefined geographic coordinate reference system');
  srs.run('WGS 84', 4326, 'EPSG', 4326, 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]', '');
  srs.run('RGF93 v1 / Lambert-93', 2154, 'EPSG', 2154, 'PROJCS["RGF93 v1 / Lambert-93",GEOGCS["RGF93 v1",DATUM["Reseau_Geodesique_Francais_1993_v1",SPHEROID["GRS 1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Lambert_Conformal_Conic_2SP"],PARAMETER["latitude_of_origin",46.5],PARAMETER["central_meridian",3],PARAMETER["standard_parallel_1",49],PARAMETER["standard_parallel_2",44],PARAMETER["false_easting",700000],PARAMETER["false_northing",6600000],UNIT["metre",1]]', '');
  const contenu = db.prepare('INSERT INTO gpkg_contents (table_name,data_type,identifier,min_x,min_y,max_x,max_y,srs_id) VALUES (?,?,?,?,?,?,?,2154)');
  const colonnes = db.prepare("INSERT INTO gpkg_geometry_columns VALUES (?, 'geom', ?, 2154, 0, 0)");
  const X0 = 668000; const Y0 = 6826000;

  db.exec('CREATE TABLE Releves_lourd (fid INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, geom POINT, essence TEXT, diametre INTEGER)');
  const ins1 = db.prepare('INSERT INTO Releves_lourd (geom, essence, diametre) VALUES (?,?,?)');
  const ESSENCES = ['CHS', 'HET', 'CHP', 'PS', 'ALT'];
  for (let i = 0; i < 100; i++) {
    const x = X0 + (i % 10) * 50; const y = Y0 + Math.floor(i / 10) * 50;
    ins1.run(blobGpkg(2154, [x, x, y, y], wkbPoint(x, y)), ESSENCES[i % 5], 20 + (i % 9) * 5);
  }
  contenu.run('Releves_lourd', 'features', 'Releves_lourd', X0, Y0, X0 + 450, Y0 + 450);
  colonnes.run('Releves_lourd', 'POINT');

  db.exec('CREATE TABLE Parcelles_lourd (fid INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, geom POLYGON, code TEXT)');
  const ins2 = db.prepare('INSERT INTO Parcelles_lourd (geom, code) VALUES (?,?)');
  for (let i = 0; i < 10; i++) {
    const x = X0 + i * 600; const y = Y0 - 700;
    ins2.run(blobGpkg(2154, [x, x + 500, y, y + 500], wkbPolygone(carre(x, y, 500))), `P${String(i + 1).padStart(2, '0')}`);
  }
  contenu.run('Parcelles_lourd', 'features', 'Parcelles_lourd', X0, Y0 - 700, X0 + 5900, Y0 - 200);
  colonnes.run('Parcelles_lourd', 'POLYGON');
  db.close();
}

// lourd.zip : lourd.tif (stocké, méthode 0) puis Serre_lourd.gpkg (stocké aussi).
// On part du zip d'une entrée que fabrique fabriquer-geotiff-lourd.mjs, et on y ajoute le
// GeoPackage sans recompresser le GeoTIFF.
export async function fabriquerLourd(dossier, tailleMo = 200) {
  mkdirSync(dossier, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), 'cerf-lourd-'));
  try {
    const t = fabriquerGeotiffLourd(tmp, tailleMo);
    const gpkgChemin = join(tmp, NOM_GPKG);
    await fabriquerGpkg(gpkgChemin);
    const gpkg = readFileSync(gpkgChemin);
    const nomTif = Buffer.from(NOM_TIF, 'utf8'); const nomGpkg = Buffer.from(NOM_GPKG, 'utf8');
    const debutZip = 30 + nomTif.length + t.tailleTif;
    const infoTif = { nom: nomTif, utf8: true, methode: 0, crc: t.crc, taillePacked: t.tailleTif, tailleOrigine: t.tailleTif, decalage: 0 };
    const infoGpkg = { nom: nomGpkg, utf8: true, methode: 0, crc: crc32(gpkg), taillePacked: gpkg.length, tailleOrigine: gpkg.length, decalage: debutZip };
    const central = Buffer.concat([enTeteCentral(infoTif), enTeteCentral(infoGpkg)]);
    const sortie = join(dossier, 'lourd.zip');
    const fd = openSync(sortie, 'w');
    const src = openSync(t.zip, 'r'); const bloc = Buffer.alloc(8 * 1024 * 1024);
    for (let lu, pos = 0; pos < debutZip && (lu = readSync(src, bloc, 0, Math.min(bloc.length, debutZip - pos), pos)) > 0; pos += lu) writeSync(fd, bloc, 0, lu);
    closeSync(src);
    writeSync(fd, enTeteLocal(infoGpkg)); writeSync(fd, gpkg);
    writeSync(fd, central);
    writeSync(fd, finDeRepertoire(2, central.length, debutZip + 30 + nomGpkg.length + gpkg.length));
    closeSync(fd);
    return { zip: sortie, tailleTif: t.tailleTif, tailleGpkg: gpkg.length, tailleZip: statSync(sortie).size };
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [, , dossier, quoi = 'tout', mo] = process.argv;
  if (!dossier) { console.error('Usage : node outils/zips-recette.mjs <dossier-de-sortie> [piege|lourd|tout] [taille-lourd-en-Mo]'); process.exit(2); }
  if (quoi === 'piege' || quoi === 'tout') console.log(`écrit : ${fabriquerPiege(dossier)}`);
  if (quoi === 'lourd' || quoi === 'tout') {
    const r = await fabriquerLourd(dossier, mo ? Number(mo) : 200);
    console.log(`écrit : ${r.zip} (.tif ${r.tailleTif} octets, .gpkg ${r.tailleGpkg} octets, zip ${r.tailleZip} octets)`);
  }
}

// Mission 033 : fabrique `essai-manuel.zip`, zip de démonstration aux noms du manuel (spec § 5),
// à l'identique à chaque fabrication (dates, contenus et ordre fixes, aucun hasard).
// Écrit pour Vision, sans dépendance. DONNÉES FICTIVES, en Lambert 93 (EPSG:2154), près de
// Fontainebleau (France métropolitaine : elles passent le contrôle de vraisemblance, spec § 4).
//
// Contenu : UG, Parcelles, FRT (Shapefile complet : .shp .shx .dbf .prj .cpg UTF-8, polygones
// fictifs, posés côte à côte, sans emboîtement) et un export ProdBois (GeoJSON, membre `crs` = CRS84,
// points avec `essence` et `diametre`). Tous les fichiers sont compressés (deflate).
//
// Usage : node outils/zip-essai-manuel.mjs <dossier-de-sortie>   (écrit essai-manuel.zip et essai-manuel-geojson.zip ; rien dans le dépôt)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ecrireZip } from '../tests/recette/essai/zip-ecrire.mjs';

export const NOM_ZIP = 'essai-manuel.zip';
export const NOM_PRODBOIS = 'Essai_p5_13_30_Res.geojson';

// ---------- Lambert 93 -> WGS84 (formules inverses de l'IGN, NTG_71, Lambert 93) ----------
// RGF93 (GRS 1980) et WGS84 diffèrent de moins d'un millimètre : sans effet pour un flashcode de démonstration.
const E = 0.0818191910428158; const N = 0.7256077650532670; const C = 11754255.426096;
const XS = 700000; const YS = 12655612.049876; const LON0 = 3 * Math.PI / 180;
export function lambert93VersWgs84(x, y) {
  const R = Math.hypot(x - XS, y - YS);
  const gamma = Math.atan((x - XS) / (YS - y));
  const lon = LON0 + gamma / N;
  const L = -Math.log(R / C) / N;
  let phi = 2 * Math.atan(Math.exp(L)) - Math.PI / 2;
  for (let i = 0; i < 20; i++) {
    const s = E * Math.sin(phi);
    phi = 2 * Math.atan(Math.pow((1 + s) / (1 - s), E / 2) * Math.exp(L)) - Math.PI / 2;
  }
  return [Math.round(lon * 180 / Math.PI * 1e7) / 1e7, Math.round(phi * 180 / Math.PI * 1e7) / 1e7];
}

// ---------- données fictives (Lambert 93, mètres) ----------
// Rectangle [xmin, ymin, xmax, ymax] -> anneau extérieur fermé, sens HORAIRE (convention du Shapefile).
const anneau = ([x0, y0, x1, y1]) => [[x0, y0], [x0, y1], [x1, y1], [x1, y0], [x0, y0]];

// Trois couches fictives, côte à côte (UG au sud, Parcelles au centre, FRT au nord), sans hiérarchie entre elles.
export const UG = [
  { CODE_UG: 'UG01', LIBELLE: 'Chênaie sessile', rect: [674000, 6810200, 674800, 6810800] },
  { CODE_UG: 'UG02', LIBELLE: 'Futaie irrégulière', rect: [674800, 6810200, 675600, 6810800] },
];
export const PARCELLES = [
  { CODE_PARC: '12', LIBELLE: 'Parcelle 12, en régénération', rect: [674050, 6811050, 674400, 6811550] },
  { CODE_PARC: '13', LIBELLE: 'Parcelle 13', rect: [674400, 6811050, 674750, 6811550] },
  { CODE_PARC: '14', LIBELLE: 'Parcelle 14, éclaircie à prévoir', rect: [674850, 6811050, 675200, 6811550] },
  { CODE_PARC: '15', LIBELLE: 'Parcelle 15', rect: [675200, 6811050, 675550, 6811550] },
];
export const FRT = [
  { CODE_FRT: 'FRT01', LIBELLE: "Zone d'essai é 1", rect: [674100, 6811700, 674300, 6811900] },
  { CODE_FRT: 'FRT02', LIBELLE: "Zone d'essai é 2", rect: [674900, 6811700, 675100, 6811900] },
  { CODE_FRT: 'FRT03', LIBELLE: "Zone d'essai é 3", rect: [675250, 6811700, 675450, 6811900] },
];

// Dix tiges (Lambert 93), dans les parcelles 12 et 14 ; essence = code (spec § 3.2), diamètre entier (cm).
const TIGES = [
  [674120, 6811120, 'CHS', 45, 'Réservée', 'Chêne sessile, belle grume'],
  [674180, 6811200, 'CHS', 62, 'Réservée', 'Chêne têtard'],
  [674240, 6811350, 'HET', 38, 'Désignée', 'Hêtre fourchu'],
  [674300, 6811450, 'CHS', 55, 'Désignée', ''],
  [674350, 6811150, 'ALT', 30, 'Désignée', 'Alisier torminal'],
  [674900, 6811120, 'CHP', 48, 'Réservée', 'Chêne pédonculé, houppier cassé'],
  [674980, 6811300, 'PS', 35, 'Désignée', 'Pin sylvestre'],
  [675050, 6811420, 'CHS', 70, 'Réservée', 'Chêne à cavité (pic noir)'],
  [675120, 6811200, 'HET', 42, 'Désignée', ''],
  [675180, 6811500, 'ALT', 28, 'Désignée', 'Alisier, tige élancée'],
];

export function geojsonProdBois() {
  const features = TIGES.map(([x, y, essence, diametre, typeTige, observation], i) => ({
    type: 'Feature',
    properties: { idTige: i + 1, essence, diametre, typeTige, observation },
    geometry: { type: 'Point', coordinates: lambert93VersWgs84(x, y) },
  }));
  return JSON.stringify({
    type: 'FeatureCollection', name: 'Essai_p5_13_30_Res',
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
    features,
  }) + '\n';
}

// ---------- Shapefile polygone, plusieurs entités, DBF en UTF-8 (.cpg) ----------
export const PRJ_L93 = 'PROJCS["RGF93_Lambert_93",GEOGCS["GCS_RGF93",DATUM["D_RGF_1993",SPHEROID["GRS_1980",6378137.0,298.257222101]],' +
  'PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Lambert_Conformal_Conic"],' +
  'PARAMETER["False_Easting",700000.0],PARAMETER["False_Northing",6600000.0],PARAMETER["Central_Meridian",3.0],' +
  'PARAMETER["Standard_Parallel_1",49.0],PARAMETER["Standard_Parallel_2",44.0],PARAMETER["Latitude_Of_Origin",46.5],UNIT["Meter",1.0]]';

function enteteShp(b, mots, [xmin, ymin, xmax, ymax]) {
  b.writeInt32BE(9994, 0); b.writeInt32BE(mots, 24); b.writeInt32LE(1000, 28); b.writeInt32LE(5, 32);
  [xmin, ymin, xmax, ymax].forEach((v, i) => b.writeDoubleLE(v, 36 + 8 * i));
}

// entites : [{ rect, ...attributs }] ; champs : [{ nom, longueur }] (tous de type caractère).
export function shapefilePolygones(entites, champs) {
  const rects = entites.map((e) => e.rect);
  const bbox = [Math.min(...rects.map((r) => r[0])), Math.min(...rects.map((r) => r[1])), Math.max(...rects.map((r) => r[2])), Math.max(...rects.map((r) => r[3]))];
  const contenu = 44 + 4 + 16 * 5; // type, bbox, nbParties, nbPoints, parties, 5 points
  const enreg = 8 + contenu;
  const shp = Buffer.alloc(100 + enreg * entites.length);
  enteteShp(shp, shp.length / 2, bbox);
  const shx = Buffer.alloc(100 + 8 * entites.length);
  enteteShp(shx, shx.length / 2, bbox);
  entites.forEach((e, i) => {
    let o = 100 + enreg * i;
    shp.writeInt32BE(i + 1, o); shp.writeInt32BE(contenu / 2, o + 4); o += 8;
    shp.writeInt32LE(5, o); o += 4;
    e.rect.forEach((v, k) => { shp.writeDoubleLE(v, o + 8 * k); }); o += 32;
    shp.writeInt32LE(1, o); shp.writeInt32LE(5, o + 4); shp.writeInt32LE(0, o + 8); o += 12;
    anneau(e.rect).forEach(([x, y]) => { shp.writeDoubleLE(x, o); shp.writeDoubleLE(y, o + 8); o += 16; });
    shx.writeInt32BE((100 + enreg * i) / 2, 100 + 8 * i); shx.writeInt32BE(contenu / 2, 104 + 8 * i);
  });
  // DBF : version 3, date fixe (2026-11-02), pas de pilote de langue (le .cpg fait foi), longueurs en octets UTF-8.
  const tailleEnreg = 1 + champs.reduce((s, c) => s + c.longueur, 0);
  const tailleEntete = 32 + 32 * champs.length + 1;
  const dbf = Buffer.alloc(tailleEntete + tailleEnreg * entites.length + 1, 0x20);
  dbf.fill(0, 0, tailleEntete);
  dbf[0] = 3; dbf[1] = 126; dbf[2] = 11; dbf[3] = 2; dbf.writeUInt32LE(entites.length, 4);
  dbf.writeUInt16LE(tailleEntete, 8); dbf.writeUInt16LE(tailleEnreg, 10);
  champs.forEach((c, k) => { const d = 32 + 32 * k; dbf.write(c.nom, d, 'latin1'); dbf[d + 11] = 0x43; dbf[d + 16] = c.longueur; });
  dbf[tailleEntete - 1] = 0x0d;
  entites.forEach((e, i) => {
    let o = tailleEntete + tailleEnreg * i + 1;
    for (const c of champs) {
      const octets = Buffer.from(String(e[c.nom]), 'utf8');
      if (octets.length > c.longueur) throw new Error(`${c.nom} : valeur trop longue`);
      octets.copy(dbf, o); o += c.longueur;
    }
  });
  dbf[dbf.length - 1] = 0x1a;
  return { shp, shx, dbf, prj: Buffer.from(PRJ_L93, 'latin1'), cpg: Buffer.from('UTF-8', 'latin1') };
}

const e = (nom, donnees) => ({ nom: Buffer.from(nom, 'utf8'), donnees: Buffer.isBuffer(donnees) ? donnees : Buffer.from(donnees, 'utf8'), stocke: false, utf8: true });

export const COUCHES_SHP = [
  { nom: 'FRT', champCode: 'CODE_FRT', entites: FRT },
  { nom: 'Parcelles', champCode: 'CODE_PARC', entites: PARCELLES },
  { nom: 'UG', champCode: 'CODE_UG', entites: UG },
];

// Entrées du zip, dans un ordre fixe (celui du tri par nom), toutes compressées.
export function entreesManuel() {
  const entrees = [e(NOM_PRODBOIS, geojsonProdBois())];
  for (const c of COUCHES_SHP) {
    const s = shapefilePolygones(c.entites, [{ nom: c.champCode, longueur: 10 }, { nom: 'LIBELLE', longueur: 48 }]);
    for (const ext of ['cpg', 'dbf', 'prj', 'shp', 'shx']) entrees.push(e(`${c.nom}.${ext}`, s[ext]));
  }
  return entrees.sort((a, b) => Buffer.compare(a.nom, b.nom));
}

// ---------- Mission 035 : variante tout en GeoJSON ----------
// UG, Parcelles et FRT : mêmes entités, champs et libellés que les Shapefile, en CRS84 (lon, lat) avec un membre
// `crs` explicite comme le ProdBois (un GeoJSON sans `crs` serait lu en WGS84 de toute façon). Anneau extérieur
// en sens ANTIHORAIRE (RFC 7946 § 3.1.6) ; mêmes sommets que le Shapefile (converti avec lambert93VersWgs84).
export const NOM_ZIP_GEOJSON = 'essai-manuel-geojson.zip';
export function geojsonPolygones(nom, champCode, entites) {
  const features = entites.map((en) => ({
    type: 'Feature',
    properties: { [champCode]: en[champCode], LIBELLE: en.LIBELLE },
    geometry: { type: 'Polygon', coordinates: [anneau(en.rect).reverse().map(([x, y]) => lambert93VersWgs84(x, y))] },
  }));
  return JSON.stringify({
    type: 'FeatureCollection', name: nom,
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
    features,
  }) + '\n';
}

export function entreesManuelGeojson() {
  const entrees = [e(NOM_PRODBOIS, geojsonProdBois())];
  for (const c of COUCHES_SHP) entrees.push(e(`${c.nom}.geojson`, geojsonPolygones(c.nom, c.champCode, c.entites)));
  return entrees.sort((a, b) => Buffer.compare(a.nom, b.nom));
}

export function fabriquerManuelGeojson(dossier) {
  mkdirSync(dossier, { recursive: true });
  const chemin = join(dossier, NOM_ZIP_GEOJSON);
  writeFileSync(chemin, ecrireZip(entreesManuelGeojson()));
  return chemin;
}

export function fabriquerManuel(dossier) {
  mkdirSync(dossier, { recursive: true });
  const chemin = join(dossier, NOM_ZIP);
  writeFileSync(chemin, ecrireZip(entreesManuel()));
  return chemin;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [, , dossier] = process.argv;
  if (!dossier) { console.error('Usage : node outils/zip-essai-manuel.mjs <dossier-de-sortie>'); process.exit(2); }
  console.log(`écrit : ${fabriquerManuel(dossier)}`);
  console.log(`écrit : ${fabriquerManuelGeojson(dossier)}`);
}

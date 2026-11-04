// Mission 011 : tests des cinq contrôles à l'import (spec § 4, ADR 0004), dans leur ordre.
// ROUGE ATTENDU JUSQU'À LA MISSION 012 : le module `plugin/cerf-controles.mjs` n'existe pas encore.
//
// CONTRAT PROPOSÉ (à valider par l'orchestrateur et Pascal ; le testeur n'a pas lu le code du plugin) :
//   module  plugin/cerf-controles.mjs  (ES module pur, sans .pragma ni .import, ADR 0005)
//   export const EMPRISE_VRAISEMBLANCE = { xmin, xmax, ymin, ymax }   // spec § 4 point 5, élargie de 10 km
//   export function controlerCouche(couche, services) -> resultat    // synchrone, sans réseau
//     couche = {
//       nom:       'Parcelles.shp',            // nom AVEC extension, tel qu'il est dans le zip et affiché dans les messages
//                                              // (Pascal, 4 nov. 2026 ; table GeoPackage : 'fichier.gpkg/table')
//       format:    'shp' | 'geojson' | 'gpkg' | 'tif',
//       fichiers:  ['Parcelles.shp', ...],     // noms des fichiers du zip portant la même racine (casse libre)
//       lisible:   true | false,               // la source s'ouvre (résultat de l'appel QGIS/QField)
//       systeme:   { valide: true|false, epsg: 4326|2154|... }   // lu par QGIS ; valide=false : GeoTIFF sans géoréf., .prj illisible
//       nbEntites: nombre (0 = couche vide ; ignoré pour un raster),
//       emprise:   { xmin, ymin, xmax, ymax }  // dans le système de la couche, avant reprojection (null si vide)
//     }
//     services = { reprojeter(emprise, epsg) -> { xmin, ymin, xmax, ymax } en EPSG:2154 }
//       (la densification des bords est faite DANS reprojeter : non testable ici, voir fin de fichier)
//       peut lever une exception ou rendre des valeurs non finies : cela vaut refus.
//       reprojeter est appelé MÊME en EPSG:2154 (identité côté test, vraie transformation côté QGIS) et pour
//       un raster ; il n'est pas appelé quand un contrôle 1, 2 ou 3 refuse, ni pour une couche vide (4).
//     Messages (spec § 4, « Nom de la couche dans les messages », Pascal, 4 novembre 2026) : chaque refus et
//       chaque avertissement commence par `couche.nom + ' : '` (ex. « FRT.shp : … »). Égalité stricte quand la spec
//       donne le texte entier ; pour « illisible » et « couche vide » : préfixe + mot ; pour l'erreur de
//       reprojection (exception, valeur non finie, null) la spec ne donne aucun texte : préfixe + message non vide.
//     resultat = { charge: boolean, controle: 1..5 | null (numéro du contrôle qui refuse),
//                  message: string | null (refus), avertissements: string[] }
//   Le premier contrôle qui échoue arrête la couche (reprojeter n'est alors pas appelé).
//
// Pour rendre le test vert sur un module jetable : CERF_CONTROLES=/chemin/module.mjs node --test tests/controles.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { entreesPiege } from '../outils/zips-recette.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const CHEMIN = process.env.CERF_CONTROLES ? resolve(process.env.CERF_CONTROLES) : resolve(ICI, '../plugin/cerf-controles.mjs');
let cache;
async function module_() {
  if (!cache) {
    try { cache = await import(pathToFileURL(CHEMIN).href); }
    catch (e) { throw new Error(`rouge attendu jusqu'à la mission 012 : module ${CHEMIN} absent ou illisible (${e.message})`); }
  }
  return cache;
}
// Lance un contrôle ; un `fetch` qui lève prouve que le contrôle ne touche pas au réseau (import sans réseau).
async function controler(couche, services) {
  const m = await module_();
  assert.equal(typeof m.controlerCouche, 'function', 'controlerCouche doit être exporté');
  const fetchAvant = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('accès réseau interdit pendant le contrôle'); };
  try { return m.controlerCouche(couche, services); } finally { globalThis.fetch = fetchAvant; }
}

// Emprise de référence : lue dans le référentiel de la mission 002 (fusionné), pas recopiée de mémoire.
const REF = JSON.parse(readFileSync(resolve(ICI, '../docs/referentiels/emprise-metropole.json'), 'utf8')).elargie;
// Garde-fou : la spec § 4 point 5 dit X 89 101 -> 1 252 436, Y 6 036 555 -> 7 120 480.
test('référentiel : l\'emprise lue est celle de la spec § 4', () => {
  assert.deepEqual(REF, { xmin: 89101, xmax: 1252436, ymin: 6036555, ymax: 7120480 });
});

// Valeurs de reprojection EPSG:4326 -> EPSG:2154 calculées avec pyproj 3.8.0 / PROJ 9.8.1 (always_xy=True),
// le 4 novembre 2026 : `Transformer.from_crs(4326, 2154, always_xy=True).transform(lon, lat)`.
const PROJ = new Map([
  ['7.761895,48.569065', { x: 1051113.03, y: 6840462.12 }], // Strasbourg, lon/lat dans le bon ordre
  ['48.569065,7.761895', { x: 6514708.82, y: 3724036.34 }], // axes inversés : lat lue comme lon
]);
// Reprojection de test : 2154 -> identité ; 4326 -> table PROJ ci-dessus ; hors domaine (|x|>180 ou |y|>90) -> non fini
// (PROJ rend inf pour (668000, 6826000) lu en degrés : mesuré le 4 novembre 2026).
function reprojeterDeTest(emprise, epsg) {
  if (epsg === 2154) return { ...emprise };
  if (epsg === 4326) {
    const pt = (x, y) => {
      if (Math.abs(x) > 180 || Math.abs(y) > 90) return { x: Infinity, y: Infinity };
      const r = PROJ.get(`${x},${y}`); if (!r) throw new Error(`point de test non prévu ${x},${y}`); return r;
    };
    const a = pt(emprise.xmin, emprise.ymin); const b = pt(emprise.xmax, emprise.ymax);
    return { xmin: a.x, ymin: a.y, xmax: b.x, ymax: b.y };
  }
  throw new Error(`EPSG:${epsg} non prévu dans le test`);
}
function espion() {
  const s = { appels: 0, reprojeter(e, epsg) { s.appels++; return reprojeterDeTest(e, epsg); } };
  return s;
}

const Sain = (o = {}) => ({
  nom: 'UG.geojson', format: 'geojson', fichiers: ['UG.geojson'], lisible: true,
  systeme: { valide: true, epsg: 2154 }, nbEntites: 3,
  emprise: { xmin: 668000, ymin: 6826000, xmax: 668500, ymax: 6826500 }, ...o,
});
const SHP = (o = {}) => Sain({
  nom: 'Parcelles.shp', format: 'shp',
  fichiers: ['Parcelles.shp', 'Parcelles.shx', 'Parcelles.dbf', 'Parcelles.prj', 'Parcelles.cpg'], ...o,
});

const REFUS_PRJ = 'Parcelles.shp : fichier .prj manquant, système de coordonnées inconnu';
const MSG_SYSTEME = 'système de coordonnées inconnu';
const MSG_EMPRISE = 'Coordonnées incohérentes : système mal déclaré ?';
const P = (nom) => `${nom} : `; // préfixe imposé par la spec § 4 (nom de la couche en tête)
// Refus du contrôle 3 / 5 : texte entier donné par la spec, donc égalité stricte.
const eqSysteme = (r, nom) => assert.equal(r.message, `${P(nom)}${MSG_SYSTEME}`);
const eqEmprise = (r, nom) => assert.equal(r.message, `${P(nom)}${MSG_EMPRISE}`);

// ---------- cas nominal ----------
test('nominal : couche saine en Lambert 93, chargée sans refus ni avertissement', async () => {
  const s = espion();
  const r = await controler(Sain(), s);
  assert.deepEqual(r, { charge: true, controle: null, message: null, avertissements: [] });
  assert.equal(s.appels, 1, 'le contrôle d\'emprise a bien eu lieu');
});
test('nominal : Shapefile complet (.prj et .cpg) chargé sans avertissement', async () => {
  const r = await controler(SHP(), espion());
  assert.deepEqual(r, { charge: true, controle: null, message: null, avertissements: [] });
});
test('nominal : GeoJSON en WGS84 déclaré, reprojeté (Strasbourg) et chargé', async () => {
  const r = await controler(Sain({ systeme: { valide: true, epsg: 4326 }, emprise: { xmin: 7.761895, ymin: 48.569065, xmax: 7.761895, ymax: 48.569065 } }), espion());
  assert.equal(r.charge, true);
});

// ---------- contrôle 1 : Shapefile incomplet ----------
test('1 : .prj absent -> refus, message exact de la spec § 4', async () => {
  const s = espion();
  const r = await controler(SHP({ fichiers: ['Parcelles.shp', 'Parcelles.shx', 'Parcelles.dbf', 'Parcelles.cpg'] }), s);
  assert.equal(r.charge, false); assert.equal(r.controle, 1); assert.equal(r.message, REFUS_PRJ);
  assert.equal(s.appels, 0, 'refusé avant lecture ni reprojection');
});
test('1 : .prj retrouvé sans tenir compte de la casse (PARCELLES.PRJ)', async () => {
  const r = await controler(SHP({ fichiers: ['PARCELLES.SHP', 'PARCELLES.SHX', 'PARCELLES.DBF', 'PARCELLES.PRJ', 'PARCELLES.CPG'] }), espion());
  assert.equal(r.charge, true);
});
test('1 : le .prj d\'une autre couche du zip ne compte pas', async () => {
  const r = await controler(SHP({ fichiers: ['Parcelles.shp', 'Parcelles.shx', 'Parcelles.dbf', 'Parcelles.cpg', 'FRT.prj'] }), espion());
  assert.equal(r.charge, false); assert.equal(r.controle, 1); assert.equal(r.message, REFUS_PRJ);
});
test('1 : .prj absent prime sur une source illisible (ordre)', async () => {
  const r = await controler(SHP({ lisible: false, fichiers: ['Parcelles.shp', 'Parcelles.shx', 'Parcelles.dbf'] }), espion());
  assert.equal(r.controle, 1); assert.equal(r.message, REFUS_PRJ);
});
test('1 : .cpg absent -> chargé avec l\'avertissement « accents peut-être mal lus »', async () => {
  const r = await controler(SHP({ fichiers: ['Parcelles.shp', 'Parcelles.shx', 'Parcelles.dbf', 'Parcelles.prj'] }), espion());
  assert.equal(r.charge, true); assert.equal(r.message, null);
  assert.deepEqual(r.avertissements, ['Parcelles.shp : accents peut-être mal lus']);
});
test('1 : .cpg absent mais emprise incohérente -> refus, et pas de chargement', async () => {
  const r = await controler(SHP({ fichiers: ['Parcelles.shp', 'Parcelles.shx', 'Parcelles.dbf', 'Parcelles.prj'], systeme: { valide: true, epsg: 4326 }, emprise: { xmin: 668000, ymin: 6826000, xmax: 668500, ymax: 6826500 } }), espion());
  assert.equal(r.charge, false); assert.equal(r.controle, 5); eqEmprise(r, 'Parcelles.shp');
});
test('1 : un GeoJSON n\'a pas besoin de .prj', async () => {
  const r = await controler(Sain({ fichiers: ['UG.geojson'] }), espion());
  assert.equal(r.charge, true);
});

// ---------- contrôle 2 : lecture ----------
test('2 : source qui ne s\'ouvre pas -> refus « illisible », avec le nom de la couche', async () => {
  const s = espion();
  const r = await controler(Sain({ lisible: false }), s);
  assert.equal(r.charge, false); assert.equal(r.controle, 2);
  assert.ok(r.message.startsWith('UG.geojson : ') && r.message.includes('illisible'), r.message);
  assert.equal(s.appels, 0);
});
test('2 : illisible prime sur système invalide et emprise (ordre)', async () => {
  const r = await controler(Sain({ lisible: false, systeme: { valide: false, epsg: null } }), espion());
  assert.equal(r.controle, 2);
});

// ---------- contrôle 3 : système invalide ----------
test('3 : GeoTIFF sans géoréférencement -> refus « système de coordonnées inconnu »', async () => {
  const s = espion();
  const r = await controler({ nom: 'FRT.tif', format: 'tif', fichiers: ['FRT.tif'], lisible: true, systeme: { valide: false, epsg: null }, nbEntites: 0, emprise: { xmin: 0, ymin: 0, xmax: 8, ymax: 8 } }, s);
  assert.equal(r.charge, false); assert.equal(r.controle, 3);
  eqSysteme(r, 'FRT.tif');
  assert.equal(s.appels, 0);
});
test('3 : .prj illisible -> refus « système de coordonnées inconnu »', async () => {
  const r = await controler(SHP({ systeme: { valide: false, epsg: null } }), espion());
  assert.equal(r.controle, 3); eqSysteme(r, 'Parcelles.shp');
});
test('3 : système invalide prime sur couche vide (ordre)', async () => {
  const r = await controler(Sain({ systeme: { valide: false, epsg: null }, nbEntites: 0 }), espion());
  assert.equal(r.controle, 3);
});

// ---------- GeoTIFF géoréférencé (nbEntites n'a pas de sens pour un raster : ignoré) ----------
const TIF = (o = {}) => ({
  nom: 'FRT.tif', format: 'tif', fichiers: ['FRT.tif'], lisible: true,
  systeme: { valide: true, epsg: 2154 }, nbEntites: 0,
  emprise: { xmin: 668000, ymin: 6826000, xmax: 668500, ymax: 6826500 }, ...o,
});
for (const [nom, nb] of [['0', 0], ['5', 5], ['undefined', undefined], ['null', null]]) {
  test(`raster : GeoTIFF Lambert 93 dans l'emprise (nbEntites = ${nom}) -> chargé, sans avertissement « vide », reprojeter appelé`, async () => {
    const s = espion();
    const r = await controler(TIF({ nbEntites: nb }), s);
    assert.deepEqual(r, { charge: true, controle: null, message: null, avertissements: [] });
    assert.equal(s.appels, 1, 'le contrôle d\'emprise a eu lieu : un raster n\'est pas une couche vide');
  });
}
test('raster : GeoTIFF Lambert 93 hors de France avec nbEntites = 0 -> refus 5 (pas pris pour une couche vide)', async () => {
  const r = await controler(TIF({ emprise: { xmin: 0, ymin: 0, xmax: 8, ymax: 8 } }), espion());
  assert.equal(r.charge, false); assert.equal(r.controle, 5); eqEmprise(r, 'FRT.tif');
});
test('raster : GeoTIFF déclaré en 4326 avec des valeurs Lambert 93 -> refus du contrôle 5', async () => {
  const s = espion();
  const r = await controler(TIF({ systeme: { valide: true, epsg: 4326 } }), s);
  assert.equal(r.charge, false); assert.equal(r.controle, 5); eqEmprise(r, 'FRT.tif');
  assert.deepEqual(r.avertissements, []);
  assert.equal(s.appels, 1);
});

// ---------- contrôle 4 : couche vide ----------
test('4 : couche vide -> chargée, avertissement, et reprojeter n\'est pas appelé', async () => {
  const s = espion();
  const r = await controler(Sain({ nbEntites: 0, emprise: null }), s);
  assert.equal(r.charge, true); assert.equal(r.message, null);
  assert.equal(r.avertissements.length, 1);
  assert.ok(r.avertissements[0].startsWith('UG.geojson : ') && r.avertissements[0].includes('vide'), r.avertissements[0]);
  assert.equal(s.appels, 0, 'pas de contrôle d\'emprise sur une couche vide');
});
test('4 : couche vide chargée même si son emprise (fantôme) serait hors de France', async () => {
  const r = await controler(Sain({ nbEntites: 0, emprise: { xmin: 0, ymin: 0, xmax: 1, ymax: 1 } }), espion());
  assert.equal(r.charge, true);
  assert.equal(r.avertissements.length, 1);
  assert.ok(r.avertissements[0].startsWith(P('UG.geojson')) && r.avertissements[0].includes('vide'), r.avertissements[0]);
});
test('4 : .cpg absent et couche vide -> chargée avec deux avertissements', async () => {
  const r = await controler(SHP({ nbEntites: 0, emprise: null, fichiers: ['Parcelles.shp', 'Parcelles.shx', 'Parcelles.dbf', 'Parcelles.prj'] }), espion());
  assert.equal(r.charge, true); assert.equal(r.avertissements.length, 2);
  for (const a of r.avertissements) assert.ok(a.startsWith('Parcelles.shp : '), a);
  assert.ok(r.avertissements.some((a) => a.includes('accents peut-être mal lus')));
  assert.ok(r.avertissements.some((a) => a.includes('vide')));
});

// ---------- contrôle 5 : vraisemblance ----------
test('5 : constante EMPRISE_VRAISEMBLANCE égale au référentiel de la mission 002', async () => {
  assert.deepEqual((await module_()).EMPRISE_VRAISEMBLANCE, REF);
});
const L93 = (xmin, ymin, xmax, ymax) => Sain({ emprise: { xmin, ymin, xmax, ymax } });
test('5 : emprise exactement sur les bords de l\'emprise élargie -> acceptée (contenue)', async () => {
  const r = await controler(L93(REF.xmin, REF.ymin, REF.xmax, REF.ymax), espion());
  assert.equal(r.charge, true);
});
for (const [nom, e] of [
  ['xmin - 1 m', [REF.xmin - 1, REF.ymin + 10, REF.xmin + 10, REF.ymin + 20]],
  ['xmax + 1 m', [REF.xmax - 10, REF.ymin + 10, REF.xmax + 1, REF.ymin + 20]],
  ['ymin - 1 m', [REF.xmin + 10, REF.ymin - 1, REF.xmin + 20, REF.ymin + 10]],
  ['ymax + 1 m', [REF.xmin + 10, REF.ymax - 10, REF.xmin + 20, REF.ymax + 1]],
]) {
  test(`5 : dépassement d'un mètre (${nom}) -> refus, message de la spec`, async () => {
    const r = await controler(L93(...e), espion());
    assert.equal(r.charge, false); assert.equal(r.controle, 5);
    eqEmprise(r, 'UG.geojson');
  });
}
test('5 : emprise à cheval sur le bord (une partie dedans) -> refus : contenue, pas intersectée', async () => {
  const r = await controler(L93(REF.xmax - 500, 6826000, REF.xmax + 500, 6826500), espion());
  assert.equal(r.controle, 5); eqEmprise(r, 'UG.geojson');
});
test('5 : Genève (942025 ; 6572608) acceptée : limite connue de l\'ADR 0004 (rectangle)', async () => {
  const r = await controler(L93(942025, 6572608, 942025, 6572608), espion());
  assert.equal(r.charge, true);
});
test('5 : GeoJSON en Lambert 93 lu en WGS84 (668000 ; 6826000 « degrés ») -> refus', async () => {
  const r = await controler(Sain({ systeme: { valide: true, epsg: 4326 }, emprise: { xmin: 668000, ymin: 6826000, xmax: 668500, ymax: 6826500 } }), espion());
  assert.equal(r.charge, false); assert.equal(r.controle, 5); eqEmprise(r, 'UG.geojson');
});
test('5 : axes inversés (Strasbourg lu lat/lon) -> refus', async () => {
  const r = await controler(Sain({ systeme: { valide: true, epsg: 4326 }, emprise: { xmin: 48.569065, ymin: 7.761895, xmax: 48.569065, ymax: 7.761895 } }), espion());
  assert.equal(r.charge, false); assert.equal(r.controle, 5); eqEmprise(r, 'UG.geojson');
});
test('5 : toute erreur de reprojection vaut refus (exception)', async () => {
  const r = await controler(Sain({ systeme: { valide: true, epsg: 4326 } }), { reprojeter() { throw new Error('PROJ : échec'); } });
  assert.equal(r.charge, false); assert.equal(r.controle, 5);
  assert.ok(r.message.startsWith('UG.geojson : ') && r.message.length > 'UG.geojson : '.length, r.message);
});
for (const [nom, v] of [['NaN', NaN], ['Infinity', Infinity], ['null', null], ['undefined', undefined]]) {
  test(`5 : reprojection qui rend ${nom} -> refus`, async () => {
    const r = await controler(Sain(), { reprojeter: () => (v === null || v === undefined ? v : { xmin: v, ymin: v, xmax: v, ymax: v }) });
    assert.equal(r.charge, false); assert.equal(r.controle, 5);
    assert.ok(r.message.startsWith(P('UG.geojson')) && r.message.length > P('UG.geojson').length, r.message);
  });
}
test('5 : pas de chargement forcé : le résultat de refus ne porte aucune option de passer outre', async () => {
  const r = await controler(L93(0, 0, 1, 1), espion());
  assert.equal(r.charge, false);
  assert.deepEqual(Object.keys(r).sort(), ['avertissements', 'charge', 'controle', 'message']);
});

// ---------- le zip piege de la mission 016 (spec § 6, critère 6) ----------
const piege = Object.fromEntries(entreesPiege().map((e) => [e.nom.toString('utf8'), e.donnees]));
const racine = (n) => n.replace(/\.[^.]+$/, '');
const fichiersDe = (nom) => Object.keys(piege).filter((n) => racine(n) === racine(nom));
test('piège UG_sans_crs.geojson (Lambert 93 sans crs, donc lu en WGS84) -> refus', async () => {
  const g = JSON.parse(piege['UG_sans_crs.geojson'].toString('utf8'));
  const xs = g.features[0].geometry.coordinates[0].map((p) => p[0]); const ys = g.features[0].geometry.coordinates[0].map((p) => p[1]);
  const r = await controler({ nom: 'UG_sans_crs.geojson', format: 'geojson', fichiers: fichiersDe('UG_sans_crs.geojson'), lisible: true, systeme: { valide: true, epsg: 4326 }, nbEntites: 1, emprise: { xmin: Math.min(...xs), ymin: Math.min(...ys), xmax: Math.max(...xs), ymax: Math.max(...ys) } }, espion());
  assert.equal(r.charge, false); assert.equal(r.controle, 5); eqEmprise(r, 'UG_sans_crs.geojson');
});
test('piège Parcelles_sans_prj (Shapefile sans .prj) -> refus du contrôle 1', async () => {
  const r = await controler({ nom: 'Parcelles_sans_prj.shp', format: 'shp', fichiers: fichiersDe('Parcelles_sans_prj.shp'), lisible: true, systeme: { valide: true, epsg: 2154 }, nbEntites: 1, emprise: { xmin: 668000, ymin: 6826000, xmax: 668500, ymax: 6826500 } }, espion());
  assert.equal(r.charge, false); assert.equal(r.controle, 1);
  assert.equal(r.message, 'Parcelles_sans_prj.shp : fichier .prj manquant, système de coordonnées inconnu');
});
test('piège FRT_sans_georef.tif (GeoTIFF sans géoréférencement) -> refus du contrôle 3', async () => {
  const r = await controler({ nom: 'FRT_sans_georef.tif', format: 'tif', fichiers: fichiersDe('FRT_sans_georef.tif'), lisible: true, systeme: { valide: false, epsg: null }, nbEntites: 0, emprise: { xmin: 0, ymin: 0, xmax: 8, ymax: 8 } }, espion());
  assert.equal(r.charge, false); assert.equal(r.controle, 3); eqSysteme(r, 'FRT_sans_georef.tif');
});
test('piège UG_vide.geojson (couche vide) -> chargée avec avertissement', async () => {
  const r = await controler({ nom: 'UG_vide.geojson', format: 'geojson', fichiers: fichiersDe('UG_vide.geojson'), lisible: true, systeme: { valide: true, epsg: 4326 }, nbEntites: 0, emprise: null }, espion());
  assert.equal(r.charge, true); assert.equal(r.avertissements.length, 1);
  assert.ok(r.avertissements[0].startsWith('UG_vide.geojson : ') && r.avertissements[0].includes('vide'), r.avertissements[0]);
});
test('piège Zone_inconnue.geojson (nom non reconnu) : le contrôle ne le refuse pas (style par défaut : § 5)', async () => {
  const r = await controler({ nom: 'Zone_inconnue.geojson', format: 'geojson', fichiers: fichiersDe('Zone_inconnue.geojson'), lisible: true, systeme: { valide: true, epsg: 2154 }, nbEntites: 1, emprise: { xmin: 668000, ymin: 6826000, xmax: 668500, ymax: 6826500 } }, espion());
  assert.equal(r.charge, true); assert.deepEqual(r.avertissements, []);
});

// NON COUVERT ICI (un vert ne prouve rien là-dessus) :
//  - la densification des bords et la vraie reprojection PROJ (QGIS/QField) : `reprojeter` est simulé ;
//    seules des valeurs PROJ 9.8.1 figées ci-dessus sont rejouées. À vérifier en recette (spec § 6, critère 6).
//  - l'ouverture réelle de la source par /vsizip/, la lecture du .prj et du géoréférencement (champs `lisible`, `systeme`).
//  - le texte exact des messages « illisible », de la couche vide et du refus d'une erreur de reprojection :
//    la spec ne donne que le mot « illisible » ; on teste l'inclusion du mot, pas une phrase.
//  - doublon, date incohérente : sans objet pour les contrôles § 4 (relèvent du registre, mission 008).
//  - le zip lourd (critère 7) : mesure de temps, hors contrôles.

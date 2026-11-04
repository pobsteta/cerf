// Mission 024 : reconnaissance, dans le zip, des Shapefile, tables de GeoPackage et GeoTIFF,
// à côté des GeoJSON (spec § 3.1, § 4 ; ADR 0008). Tests écrits par le testeur AVANT le code.
// Rouge attendu jusqu'à la mission 024.
//
// Interface PROPOSÉE (à confirmer par l'orchestrateur ; la 1re est une extension de la signature
// publique de plugin/cerf-logique.mjs, seule partie du plugin lue) :
//   couchesDuZip(noms, tables?) -> [{ couche, entree, format, ... }], dans l'ordre des noms
//     - format : 'geojson' | 'shapefile' | 'geopackage' | 'geotiff'
//     - couche : nom du fichier sans dossier ni extension ; pour un GeoPackage : le NOM DE LA TABLE
//     - GeoJSON, GeoTIFF : { couche, entree, format }
//     - Shapefile : + fichiers = entrées du zip (même dossier, même nom, casse libre) parmi
//       .shp .shx .dbf .prj .cpg, dans cet ordre, celles qui existent (un Shapefile incomplet
//       est RENDU : c'est le contrôle 1 de la spec § 4 qui le refuse avec son message)
//     - GeoPackage : + table ; entree = le .gpkg ; `tables` = { '<entrée .gpkg>': ['table', ...] }
//       fourni par le plugin (les noms de tables ne sont pas dans le répertoire du zip)
//   sourceDeLaCouche(copie, c) -> source /vsizip/ :
//     Shapefile : '/vsizip/<copie>/<entrée .shp>' ; GeoTIFF, GeoJSON : '/vsizip/<copie>/<entrée>' ;
//     GeoPackage : '/vsizip/<copie>/<fichier.gpkg>|layername=<table>'
// Pour essayer ces tests sur un module jetable : CERF_LOGIQUE_ESSAI=/chemin/module.mjs
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fabriquerPiege, fabriquerLourd, COUCHES_GPKG, NOM_GPKG } from '../outils/zips-recette.mjs';

const ici = dirname(fileURLToPath(import.meta.url));
const MODULE = process.env.CERF_LOGIQUE_ESSAI || join(ici, '..', 'plugin', 'cerf-logique.mjs');
const ROUGE = "rouge attendu jusqu'à la mission 024";

let m;
before(async () => {
  if (!existsSync(MODULE)) throw new Error(`${MODULE} absent : ${ROUGE}`);
  m = await import(pathToFileURL(MODULE).href);
});

const lire = (nom, ...args) => {
  assert.equal(typeof m[nom], 'function', `${nom} absent : ${ROUGE}`);
  return m[nom](...args);
};
const egal = (reel, attendu, msg) => assert.deepEqual(reel, attendu, `${ROUGE} : ${msg}`);
// Vue réduite aux champs de l'interface proposée.
const vue = (liste) => liste.map((c) => {
  const v = { couche: c.couche, entree: c.entree, format: c.format };
  if (c.format === 'shapefile') v.fichiers = c.fichiers;
  if (c.format === 'geopackage') v.table = c.table;
  return v;
});
const noms = (liste, ...args) => vue(lire('couchesDuZip', liste, ...args));
const gj = (couche, entree) => ({ couche, entree, format: 'geojson' });
const EXTS = ['shp', 'shx', 'dbf', 'prj', 'cpg'];
const SHP = (dossier, base, exts = EXTS) => exts.map((e) => `${dossier}${base}.${e}`);
// Shapefile attendu : entrée = le .shp, fichiers = ceux de exts.
const shp = (dossier, base, exts = EXTS) => ({
  couche: base, entree: `${dossier}${base}.shp`, format: 'shapefile', fichiers: SHP(dossier, base, exts),
});

// ============================================================================ GeoJSON
test('GeoJSON : .geojson et .json reconnus, casse libre ; un .json non GeoJSON est écarté à la lecture, pas ici', () => {
  egal(noms(['UG.geojson', 'a/b.JSON', 'c/Prod.GeoJSON']),
    [gj('UG', 'UG.geojson'), gj('b', 'a/b.JSON'), gj('Prod', 'c/Prod.GeoJSON')], '.geojson et .json');
});

// ============================================================================ Shapefile
test('Shapefile complet à la racine : une couche, nom sans extension, 5 fichiers', () => {
  egal(noms(SHP('', 'FRT')), [shp('', 'FRT')], 'FRT complet');
});

test('Shapefile : fichiers donnés dans le désordre, une seule couche, ordre des fichiers fixe', () => {
  egal(noms(['FRT.cpg', 'FRT.prj', 'FRT.dbf', 'FRT.shx', 'FRT.shp']), [shp('', 'FRT')], 'désordre');
});

test('Shapefile : casse libre (.SHP, .Shx, .DBF, .PRJ, .CPG), noms d\'entrée conservés', () => {
  const entrees = ['UG.SHP', 'UG.Shx', 'UG.DBF', 'UG.PRJ', 'UG.CPG'];
  egal(noms(entrees), [{ couche: 'UG', entree: 'UG.SHP', format: 'shapefile', fichiers: entrees }], 'casse libre');
});

test('Shapefile dans des dossiers du zip (espace, accent) : les fichiers d\'un autre dossier ne sont pas mélangés', () => {
  const a = SHP('Serre EA/référence/', 'Parcelles');
  const b = SHP('autre/', 'Parcelles', ['shp', 'shx', 'dbf', 'prj']);
  egal(noms([...a, ...b]), [
    { couche: 'Parcelles', entree: 'Serre EA/référence/Parcelles.shp', format: 'shapefile', fichiers: a },
    { couche: 'Parcelles', entree: 'autre/Parcelles.shp', format: 'shapefile', fichiers: b },
  ], 'dossiers distincts');
});

test('Shapefile incomplet RENDU (sans .prj, .shx, .dbf ou .cpg) : le contrôle 1 (spec § 4) le refusera avec son message', () => {
  for (const manquant of ['prj', 'shx', 'dbf', 'cpg']) {
    const exts = EXTS.filter((e) => e !== manquant);
    egal(noms(SHP('', 'UG', exts)), [shp('', 'UG', exts)], `UG sans .${manquant} reste une couche, avec ses autres fichiers`);
  }
  egal(noms(['Parcelles.shp']), [shp('', 'Parcelles', ['shp'])], '.shp seul');
});

test('Shapefile : .shx, .dbf, .prj, .cpg orphelins, annexes et .qml/.qmd/.txt : aucune couche', () => {
  egal(noms(['x.shx', 'x.dbf', 'x.prj', 'x.cpg', 'x.qix', 'x.sbn', 'x.sbx', 'x.shp.xml', 'x.aux.xml', 'x.tfw', 'x.qml', 'x.qmd', 'lisez-moi.txt']),
    [], 'rien à charger');
});

test('Shapefile : annexes (.qix, .sbn, .sbx, .shp.xml) et .qml voisins ne changent ni la couche ni sa liste de fichiers', () => {
  egal(noms([...SHP('', 'UG'), 'UG.qix', 'UG.sbn', 'UG.sbx', 'UG.shp.xml', 'UG.qml']), [shp('', 'UG')], 'annexes ignorées');
});

test('Shapefile : UG et FRT dans le même dossier : chacun garde ses fichiers', () => {
  egal(noms([...SHP('', 'UG'), ...SHP('', 'FRT')]), [shp('', 'UG'), shp('', 'FRT')], 'UG et FRT');
});

// ============================================================================ GeoTIFF
test('GeoTIFF : .tif et .tiff, casse libre, dossiers ; .tfw et .aux.xml sans couche propre', () => {
  egal(noms(['ortho.tif', 'r/Mnt.TIFF', 'r/Mnt.tfw', 'r/Mnt.tiff.aux.xml', 'a/b.Tif']), [
    { couche: 'ortho', entree: 'ortho.tif', format: 'geotiff' },
    { couche: 'Mnt', entree: 'r/Mnt.TIFF', format: 'geotiff' },
    { couche: 'b', entree: 'a/b.Tif', format: 'geotiff' },
  ], 'GeoTIFF');
});

// ============================================================================ GeoPackage
test('GeoPackage : une couche par table, nom de table, entrée = le .gpkg, ordre des tables conservé', () => {
  egal(noms(['d/Serre.gpkg'], { 'd/Serre.gpkg': ['Releves', 'Parcelles'] }), [
    { couche: 'Releves', entree: 'd/Serre.gpkg', format: 'geopackage', table: 'Releves' },
    { couche: 'Parcelles', entree: 'd/Serre.gpkg', format: 'geopackage', table: 'Parcelles' },
  ], 'deux tables');
});

test('GeoPackage : extension .GPKG en capitales ; tables à nom accentué ou avec espace gardées telles quelles', () => {
  egal(noms(['S.GPKG'], { 'S.GPKG': ['Forêt', 'Zones humides'] }), [
    { couche: 'Forêt', entree: 'S.GPKG', format: 'geopackage', table: 'Forêt' },
    { couche: 'Zones humides', entree: 'S.GPKG', format: 'geopackage', table: 'Zones humides' },
  ], 'noms de tables');
});

test('GeoPackage : deux .gpkg, chacun ses tables ; .gpkg-wal et .gpkg-shm : ignorés', () => {
  egal(noms(['a.gpkg', 'a.gpkg-wal', 'a.gpkg-shm', 'b.gpkg'], { 'a.gpkg': ['T1'], 'b.gpkg': ['T2', 'T3'] }), [
    { couche: 'T1', entree: 'a.gpkg', format: 'geopackage', table: 'T1' },
    { couche: 'T2', entree: 'b.gpkg', format: 'geopackage', table: 'T2' },
    { couche: 'T3', entree: 'b.gpkg', format: 'geopackage', table: 'T3' },
  ], 'deux fichiers');
});

test('GeoPackage sans table vecteur (liste vide) : aucune couche', () => {
  egal(noms(['a.gpkg'], { 'a.gpkg': [] }), [], 'aucune table');
});

// ============================================================================ mélange, silences
test('tous formats mêlés : ordre du zip ; __MACOSX et ._* ignorés ; .qml, .qmd, .txt, dossiers ignorés', () => {
  const liste = [
    '__MACOSX/._UG.shp', '__MACOSX/UG.shp', 'lisez-moi.txt', 'UG.qml',
    'Serre_p5_Res.geojson', 'Serre_p5_Res.qmd',
    ...SHP('ref/', 'UG'), 'ref/._UG.dbf', 'o/ortho.tif', 'g.gpkg', 'dossier/',
  ];
  egal(noms(liste, { 'g.gpkg': ['Releves'] }), [
    gj('Serre_p5_Res', 'Serre_p5_Res.geojson'),
    shp('ref/', 'UG'),
    { couche: 'ortho', entree: 'o/ortho.tif', format: 'geotiff' },
    { couche: 'Releves', entree: 'g.gpkg', format: 'geopackage', table: 'Releves' },
  ], 'mélange');
});

test('aucun format reconnu, zip vide, entrées vides : liste vide sans exception', () => {
  egal(noms(['a.txt', 'b.docx', 'dossier/', '']), [], 'rien');
  egal(noms([]), [], 'zip vide');
});

// ============================================================================ sources /vsizip/
const COPIE = '/storage/emulated/0/Android/data/ch.opengis.qfield/files/Imported Projects/Serre/cerf-imports/Serre_EA2026.zip';
const source = (liste, tables, i = 0) => {
  const c = lire('couchesDuZip', liste, tables)[i];
  assert.ok(c, `${ROUGE} : couche ${i} absente`);
  return lire('sourceDeLaCouche', COPIE, c);
};

test('source Shapefile : le .shp seul, en /vsizip/ (copie avec espace, dossier du zip, casse conservée)', () => {
  assert.equal(source(SHP('ref/FRT EA/', 'FRT')), `/vsizip/${COPIE}/ref/FRT EA/FRT.shp`, `${ROUGE} : source du .shp`);
  assert.equal(source(['UG.SHP', 'UG.SHX', 'UG.DBF', 'UG.PRJ']), `/vsizip/${COPIE}/UG.SHP`, `${ROUGE} : source du .SHP`);
});

test('source GeoPackage : fichier.gpkg|layername=table', () => {
  const tables = { 'd/Serre.gpkg': ['Releves', 'Parcelles'] };
  assert.equal(source(['d/Serre.gpkg'], tables, 0), `/vsizip/${COPIE}/d/Serre.gpkg|layername=Releves`, `${ROUGE} : 1re table`);
  assert.equal(source(['d/Serre.gpkg'], tables, 1), `/vsizip/${COPIE}/d/Serre.gpkg|layername=Parcelles`, `${ROUGE} : 2e table`);
});

test('source GeoTIFF : le .tif ou .tiff, sans option', () => {
  assert.equal(source(['o/ortho.tif']), `/vsizip/${COPIE}/o/ortho.tif`, `${ROUGE} : .tif`);
  assert.equal(source(['o/Mnt.TIFF']), `/vsizip/${COPIE}/o/Mnt.TIFF`, `${ROUGE} : .tiff`);
});

test('source GeoJSON : inchangée (/vsizip/<copie>/<entrée>)', () => {
  assert.equal(source(['UG.geojson']), `/vsizip/${COPIE}/UG.geojson`, `${ROUGE} : source GeoJSON`);
});

// ============================================================================ zips de recette (016)
const nomsZip = async (f) => [...await m.nomsDuZip(readFileSync(f))];

test('zip piege (016) : 5 couches (3 GeoJSON, 1 GeoTIFF sans géoréférencement, 1 Shapefile sans .prj)', async () => {
  const dossier = mkdtempSync(join(tmpdir(), 'cerf-t024-'));
  const liste = await nomsZip(fabriquerPiege(dossier));
  const brut = lire('couchesDuZip', liste);
  const r = vue(brut);
  egal(r.map((c) => `${c.format}:${c.couche}`).sort(), [
    'geojson:UG_sans_crs', 'geojson:UG_vide', 'geojson:Zone_inconnue',
    'geotiff:FRT_sans_georef', 'shapefile:Parcelles_sans_prj',
  ].sort(), 'couches du zip piege');
  egal(r.find((c) => c.format === 'shapefile').fichiers,
    ['Parcelles_sans_prj.shp', 'Parcelles_sans_prj.shx', 'Parcelles_sans_prj.dbf', 'Parcelles_sans_prj.cpg'],
    'Shapefile du piege : 4 fichiers, pas de .prj (piège n° 2)');
  assert.equal(lire('sourceDeLaCouche', COPIE, brut.find((c) => c.format === 'shapefile')),
    `/vsizip/${COPIE}/Parcelles_sans_prj.shp`, `${ROUGE} : source du Shapefile piege`);
  assert.equal(lire('sourceDeLaCouche', COPIE, brut.find((c) => c.format === 'geotiff')),
    `/vsizip/${COPIE}/FRT_sans_georef.tif`, `${ROUGE} : source du GeoTIFF piege`);
});

test('zip lourd (016, fabriqué à 1 Mo) : lourd.tif et les deux tables de Serre_lourd.gpkg', async () => {
  const dossier = mkdtempSync(join(tmpdir(), 'cerf-t024-'));
  await fabriquerLourd(dossier, 1);
  const liste = await nomsZip(join(dossier, 'lourd.zip'));
  const brut = lire('couchesDuZip', liste, { [NOM_GPKG]: COUCHES_GPKG });
  egal(vue(brut).map((c) => `${c.format}:${c.couche}`).sort(),
    ['geopackage:Parcelles_lourd', 'geopackage:Releves_lourd', 'geotiff:lourd'], 'lourd.tif + 2 tables');
  egal(brut.filter((c) => c.format === 'geopackage').map((c) => lire('sourceDeLaCouche', COPIE, c)),
    COUCHES_GPKG.map((t) => `/vsizip/${COPIE}/${NOM_GPKG}|layername=${t}`), 'sources des tables');
});

// ============================================================================ Serre_EA2026 (cas de référence, brief)
test('Serre_EA2026 (liste décrite par le brief) : GeoJSON ProdBois + UG, Parcelles, FRT en Shapefile = 4 couches', () => {
  // Seul Serre_EA2026_p5_13_30_Res.geojson est un nom réel (reçu le 2 novembre 2026, spec § 3.2) ;
  // UG, Parcelles, FRT : noms supposés d'après le brief (le zip réel n'est pas dans le dépôt).
  const liste = ['Serre_EA2026_p5_13_30_Res.geojson', 'Serre_EA2026_p5_13_30_Res.qmd',
    ...SHP('', 'UG'), ...SHP('', 'Parcelles'), ...SHP('', 'FRT')];
  egal(noms(liste), [
    gj('Serre_EA2026_p5_13_30_Res', 'Serre_EA2026_p5_13_30_Res.geojson'),
    shp('', 'UG'), shp('', 'Parcelles'), shp('', 'FRT'),
  ], '4 couches de Serre_EA2026');
});

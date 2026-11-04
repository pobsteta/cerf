// Mission 024 : reconnaissance, dans le zip, des Shapefile, tables de GeoPackage et GeoTIFF,
// à côté des GeoJSON (spec § 3.1, § 4 ; ADR 0008). Tests écrits par le testeur AVANT le code.
// Rouge attendu jusqu'à la mission 024.
//
// Interface PROPOSÉE (à confirmer par l'orchestrateur ; la 1re est une extension de la signature
// publique de plugin/cerf-logique.mjs, seule partie du plugin lue) :
//   couchesDuZip(noms, tables?) -> [{ couche, entree, nom, format, ... }], dans l'ordre des noms
//     - nom : nom d'AFFICHAGE pour les messages du § 4, avec extension (« FRT.shp », « Serre.gpkg/Releves »).
//       Pour une couche rangée dans un dossier du zip, la spec ne dit pas si le dossier en fait partie :
//       les tests exigent seulement que nom FINISSE par « FRT.shp » (ou « Serre.gpkg/Releves »).
//     - format : 'geojson' | 'shapefile' | 'geopackage' | 'geotiff'
//     - couche : nom du fichier sans dossier ni extension ; pour un GeoPackage : le NOM DE LA TABLE
//     - GeoJSON, GeoTIFF : { couche, entree, format }
//     - Shapefile : + fichiers = entrées du zip (même dossier, même nom, casse libre) parmi
//       .shp .shx .dbf .prj .cpg, dans cet ordre, celles qui existent (un Shapefile incomplet
//       est RENDU : c'est le contrôle 1 de la spec § 4 qui le refuse avec son message)
//     - GeoPackage : + table ; entree = le .gpkg ; `tables` = { '<entrée .gpkg>': ['table', ...] }
//       fourni par le plugin (les noms de tables ne sont pas dans le répertoire du zip).
//       Un .gpkg dont les tables sont INCONNUES (pas de `tables`, ou pas de clé pour lui) n'est JAMAIS
//       perdu en silence : il sort comme une entrée { format: 'geopackage', table: null } que le contrôle
//       refusera en nommant le fichier. Liste VIDE ([]) = tables connues, aucune : aucune couche.
//       Comment le plugin trouve les tables hors ligne n'est pas tranché ici (question pour Pascal).
//   decrireEntree(entree, noms) (mission 010) : UNE SEULE source pour `fichiers` avec couchesDuZip
//     (voir le dernier groupe de tests) : mêmes fichiers, même ordre, en noms sans dossier.
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

test('GeoPackage dont les tables sont inconnues : jamais perdu en silence (entrée table: null, contrôle 1 le refusera)', () => {
  const cas = [
    ['sans `tables`', ['a.gpkg'], undefined],
    ['`tables` vide {}', ['a.gpkg'], {}],
    ['`tables` sans clé pour ce .gpkg', ['a.gpkg', 'b.gpkg'], { 'b.gpkg': ['T'] }],
  ];
  for (const [quoi, liste, tables] of cas) {
    const r = lire('couchesDuZip', liste, tables);
    const inconnu = r.filter((c) => c.format === 'geopackage' && c.entree === 'a.gpkg');
    assert.equal(inconnu.length, 1, `${ROUGE} : a.gpkg (${quoi}) doit sortir une fois, pas disparaître`);
    assert.equal(inconnu[0].table, null, `${ROUGE} : table: null (${quoi})`);
    assert.ok(String(inconnu[0].nom).includes('a.gpkg'), `${ROUGE} : le nom nomme le fichier (${quoi}) : ${inconnu[0].nom}`);
  }
  // Le .gpkg connu voisin reste normal, dans l'ordre du zip.
  egal(noms(['a.gpkg', 'b.gpkg'], { 'b.gpkg': ['T'] }).map((c) => `${c.entree}:${c.table}`), ['a.gpkg:null', 'b.gpkg:T'], 'inconnu puis connu');
  // Tables fournies pour un .gpkg dans un dossier : pas de doublon « inconnu » en plus.
  egal(noms(['d/a.gpkg'], { 'd/a.gpkg': ['T'] }).map((c) => c.table), ['T'], 'connu : pas d\'entrée null en plus');
});

// ============================================================================ nom d'affichage (spec § 4)
const nomsAffiches = (liste, tables) => lire('couchesDuZip', liste, tables).map((c) => c.nom);

test('nom d\'affichage à la racine : nom du fichier avec extension, casse du zip ; table de GeoPackage : « fichier.gpkg/table »', () => {
  egal(nomsAffiches(SHP('', 'FRT')), ['FRT.shp'], 'Shapefile');
  egal(nomsAffiches(['UG.SHP', 'UG.SHX', 'UG.DBF', 'UG.PRJ']), ['UG.SHP'], 'Shapefile en capitales');
  egal(nomsAffiches(['UG.geojson', 'b.JSON']), ['UG.geojson', 'b.JSON'], 'GeoJSON');
  egal(nomsAffiches(['ortho.tif', 'Mnt.TIFF']), ['ortho.tif', 'Mnt.TIFF'], 'GeoTIFF');
  egal(nomsAffiches(['Serre.gpkg'], { 'Serre.gpkg': ['Releves', 'Zones humides'] }),
    ['Serre.gpkg/Releves', 'Serre.gpkg/Zones humides'], 'tables de GeoPackage');
});

test('nom d\'affichage d\'une couche rangée dans un dossier : finit par le nom attendu (le dossier n\'est pas tranché par la spec)', () => {
  const r = lire('couchesDuZip', [...SHP('Serre EA/réf/', 'Parcelles'), 'a/b/UG.geojson', 'o/ortho.tif', 'd/Serre.gpkg'],
    { 'd/Serre.gpkg': ['Releves'] }).map((c) => c.nom);
  assert.equal(r.length, 4, `${ROUGE} : 4 couches`);
  const fins = ['Parcelles.shp', 'UG.geojson', 'ortho.tif', 'Serre.gpkg/Releves'];
  r.forEach((n, i) => assert.ok(typeof n === 'string' && n.endsWith(fins[i]), `${ROUGE} : « ${n} » doit finir par « ${fins[i]} »`));
});

test('nom d\'affichage : jamais vide ni sans extension, y compris dans le zip piege et le zip lourd', async () => {
  const dossier = mkdtempSync(join(tmpdir(), 'cerf-t024-'));
  const piege = lire('couchesDuZip', await nomsZip(fabriquerPiege(dossier)));
  egal(piege.map((c) => c.nom).sort(), ['FRT_sans_georef.tif', 'Parcelles_sans_prj.shp', 'UG_sans_crs.geojson', 'UG_vide.geojson', 'Zone_inconnue.geojson'],
    'noms du zip piege');
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

// ============================================================================ une seule source pour `fichiers` (010 / 024)
const base = (e) => e.substring(e.lastIndexOf('/') + 1);

test('decrireEntree (010) et couchesDuZip (024) : mêmes fichiers, même ordre, même nom, pour chaque Shapefile (une seule source)', () => {
  const zips = [
    // désordre + annexes + .qml + un autre dossier de même nom + casse mêlée
    ['sous/Parcelles.cpg', 'sous/Parcelles.prj', 'sous/Parcelles.dbf', 'sous/Parcelles.shx', 'sous/Parcelles.SHP',
      'sous/Parcelles.qix', 'sous/Parcelles.sbn', 'sous/Parcelles.shp.xml', 'sous/Parcelles.qml',
      'autre/Parcelles.shp', 'autre/Parcelles.dbf', 'UG.Shp', 'UG.PRJ', '__MACOSX/sous/._Parcelles.shp'],
    SHP('', 'FRT'),
    ['Parcelles.shp'],
  ];
  for (const noms of zips) {
    const couches = lire('couchesDuZip', noms).filter((c) => c.format === 'shapefile');
    assert.ok(couches.length >= 1, `${ROUGE} : au moins un Shapefile reconnu`);
    for (const c of couches) {
      const d = lire('decrireEntree', c.entree, noms);
      assert.deepEqual(d.fichiers, c.fichiers.map(base), `${ROUGE} : fichiers de ${c.entree} identiques dans les deux fonctions`);
      assert.equal(d.nom, base(c.entree), `${ROUGE} : nom de ${c.entree}`);
      assert.ok(String(c.nom).endsWith(d.nom), `${ROUGE} : le nom d'affichage « ${c.nom} » finit par « ${d.nom} »`);
    }
  }
});

test('decrireEntree et couchesDuZip : nom d\'affichage cohérent pour GeoJSON et GeoTIFF', () => {
  const noms = ['d/UG.geojson', 'o/ortho.TIF'];
  for (const c of lire('couchesDuZip', noms)) {
    const d = lire('decrireEntree', c.entree, noms);
    assert.ok(String(c.nom).endsWith(d.nom), `${ROUGE} : « ${c.nom} » finit par « ${d.nom} »`);
  }
});

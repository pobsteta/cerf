// Mission 024 : reconnaissance, dans le zip, des Shapefile, tables de GeoPackage et GeoTIFF,
// à côté des GeoJSON (spec § 3.1, § 4 ; ADR 0008). Tests écrits par le testeur AVANT le code.
// Rouge attendu jusqu'à la mission 024.
//
// Interface PROPOSÉE (à confirmer par l'orchestrateur ; la 1re est une extension de la signature
// publique de plugin/cerf-logique.mjs, seule partie du plugin lue) :
//   couchesDuZip(noms, tables?) -> [{ couche, entree, nom, format, ... }], dans l'ordre des noms
//     - nom : nom d'AFFICHAGE pour les messages du § 4 = CHEMIN COMPLET DANS LE ZIP, avec extension
//       (« FRT.shp », « Serre EA/réf/Parcelles.shp », « d/Serre.gpkg/Releves ») ; arbitrage de Pascal
//       du 4 novembre 2026. Égalité stricte dans les tests.
//     - format : 'geojson' | 'shp' | 'gpkg' | 'tif'
//     - couche : nom du fichier sans dossier ni extension ; pour un GeoPackage : le NOM DE LA TABLE
//     - GeoJSON, GeoTIFF : { couche, entree, format }
//     - Shapefile : + fichiers = entrées du zip (même dossier, même nom, casse libre) parmi
//       .shp .shx .dbf .prj .cpg, dans cet ordre, celles qui existent (un Shapefile incomplet
//       est RENDU : c'est le contrôle 1 de la spec § 4 qui le refuse avec son message)
//     - GeoPackage : + table ; entree = le .gpkg ; `tables` = { '<entrée .gpkg>': ['table', ...] }
//       fourni par le plugin (les noms de tables ne sont pas dans le répertoire du zip).
//       Un .gpkg dont les tables sont INCONNUES (pas de `tables`, ou pas de clé pour lui) n'est JAMAIS
//       perdu en silence : il sort comme une entrée { format: 'gpkg', table: null }. Le plugin la REFUSE
//       (ce n'est pas le contrôle 1, qui vise le Shapefile incomplet, spec § 4) avec un message qui commence
//       par le nom du fichier, sans l'ouvrir ni la charger, et sans jamais en faire une source sans
//       `layername` (QGIS ouvrirait la première table en silence). Texte exact du refus (Pascal, 4 nov. 2026) :
//       « <nom dans le zip> : tables illisibles, couche non chargée », en ligne entière du message d'importerZip.
//       Liste VIDE ([]) = tables connues, aucune : JAMAIS le silence (Pascal, 4 nov. 2026). MARQUE EXIGÉE : couchesDuZip
//       rend { format: 'gpkg', table: null, vide: true } pour [] ; pour les tables inconnues, `vide` est absent ou
//       false (table: null dans les deux cas). Le plugin en tire deux lignes exactes, chemin tel que dans le zip :
//       « <chemin> : aucune table vecteur, couche non chargée » (vide) et « <chemin> : tables illisibles, couche non
//       chargée » (inconnues ou illisibles). Dans les deux cas : aucune source, voisin intact. La ligne « aucune table
//       vecteur » n'est testable qu'au niveau de couchesDuZip, car le service qui fournit les tables à importerZip
//       n'existe pas encore (mission 030) : voir le commentaire daté près du test d'importerZip.
//       Comment le plugin trouve les tables hors ligne n'est pas tranché ici (question pour Pascal).
//   decrireEntree(entree, noms) (mission 010, tel que livré : TOUS les fichiers du même dossier, dans l'ordre du zip,
//     annexes et .qml compris ; tests/controles-branchement.test.mjs le fixe, mais seulement « même dossier ») : pas de
//     second calcul divergent (voir le dernier groupe de tests). Règle imposée, par Shapefile : parmi les fichiers de même
//     racine (casse libre) dont l'extension est .shp .shx .dbf .prj ou .cpg, l'ensemble tiré de decrireEntree.fichiers
//     est ÉGAL à celui de `fichiers` de couchesDuZip (en noms sans dossier). Sinon un .prj présent dans l'un et absent
//     de l'autre ferait accepter un Shapefile incomplet au contrôle 1. Le reste (.qml, annexes) reste libre ;
//     son `nom` court reste sans dossier = dernier segment du `nom` de couchesDuZip (pour un fichier non GeoPackage).
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
import { ecrireZip } from './recette/essai/zip-ecrire.mjs';
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
  if (c.format === 'shp') v.fichiers = c.fichiers;
  if (c.format === 'gpkg') v.table = c.table;
  return v;
});
const noms = (liste, ...args) => vue(lire('couchesDuZip', liste, ...args));
const gj = (couche, entree) => ({ couche, entree, format: 'geojson' });
const EXTS = ['shp', 'shx', 'dbf', 'prj', 'cpg'];
const SHP = (dossier, base, exts = EXTS) => exts.map((e) => `${dossier}${base}.${e}`);
// Shapefile attendu : entrée = le .shp, fichiers = ceux de exts.
const shp = (dossier, base, exts = EXTS) => ({
  couche: base, entree: `${dossier}${base}.shp`, format: 'shp', fichiers: SHP(dossier, base, exts),
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
  egal(noms(entrees), [{ couche: 'UG', entree: 'UG.SHP', format: 'shp', fichiers: entrees }], 'casse libre');
});

test('Shapefile dans des dossiers du zip (espace, accent) : les fichiers d\'un autre dossier ne sont pas mélangés', () => {
  const a = SHP('Serre EA/référence/', 'Parcelles');
  const b = SHP('autre/', 'Parcelles', ['shp', 'shx', 'dbf', 'prj']);
  egal(noms([...a, ...b]), [
    { couche: 'Parcelles', entree: 'Serre EA/référence/Parcelles.shp', format: 'shp', fichiers: a },
    { couche: 'Parcelles', entree: 'autre/Parcelles.shp', format: 'shp', fichiers: b },
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
    { couche: 'ortho', entree: 'ortho.tif', format: 'tif' },
    { couche: 'Mnt', entree: 'r/Mnt.TIFF', format: 'tif' },
    { couche: 'b', entree: 'a/b.Tif', format: 'tif' },
  ], 'GeoTIFF');
});

// ============================================================================ GeoPackage
test('GeoPackage : une couche par table, nom de table, entrée = le .gpkg, ordre des tables conservé', () => {
  egal(noms(['d/Serre.gpkg'], { 'd/Serre.gpkg': ['Releves', 'Parcelles'] }), [
    { couche: 'Releves', entree: 'd/Serre.gpkg', format: 'gpkg', table: 'Releves' },
    { couche: 'Parcelles', entree: 'd/Serre.gpkg', format: 'gpkg', table: 'Parcelles' },
  ], 'deux tables');
});

test('GeoPackage : extension .GPKG en capitales ; tables à nom accentué ou avec espace gardées telles quelles', () => {
  egal(noms(['S.GPKG'], { 'S.GPKG': ['Forêt', 'Zones humides'] }), [
    { couche: 'Forêt', entree: 'S.GPKG', format: 'gpkg', table: 'Forêt' },
    { couche: 'Zones humides', entree: 'S.GPKG', format: 'gpkg', table: 'Zones humides' },
  ], 'noms de tables');
});

test('GeoPackage : deux .gpkg, chacun ses tables ; .gpkg-wal et .gpkg-shm : ignorés', () => {
  egal(noms(['a.gpkg', 'a.gpkg-wal', 'a.gpkg-shm', 'b.gpkg'], { 'a.gpkg': ['T1'], 'b.gpkg': ['T2', 'T3'] }), [
    { couche: 'T1', entree: 'a.gpkg', format: 'gpkg', table: 'T1' },
    { couche: 'T2', entree: 'b.gpkg', format: 'gpkg', table: 'T2' },
    { couche: 'T3', entree: 'b.gpkg', format: 'gpkg', table: 'T3' },
  ], 'deux fichiers');
});

test('GeoPackage sans table vecteur (liste vide) : jamais le silence (table: null, vide: true, nom = chemin dans le zip)', () => {
  const cas = [['a.gpkg', 'a.gpkg'], ['d/a.gpkg', 'd/a.gpkg']];
  for (const [entree, nom] of cas) {
    const r = lire('couchesDuZip', [entree, 'b.geojson'], { [entree]: [] });
    const vide = r.filter((c) => c.format === 'gpkg' && c.entree === entree);
    assert.equal(vide.length, 1, `${ROUGE} : ${entree} sans table doit sortir une fois, pas disparaître`);
    assert.equal(vide[0].table, null, `${ROUGE} : table: null pour ${entree}`);
    assert.equal(vide[0].vide, true, `${ROUGE} : vide: true pour ${entree} (liste de tables [] lue sans erreur)`);
    assert.equal(vide[0].nom, nom, `${ROUGE} : nom = chemin complet dans le zip`);
    assert.deepEqual(r.filter((c) => c !== vide[0]).map((c) => c.entree), ['b.geojson'], `${ROUGE} : le voisin est intact`);
  }
});

test('GeoPackage dont les tables sont inconnues : jamais perdu en silence (entrée table: null, refusée par le plugin)', () => {
  const cas = [
    ['sans `tables`', ['a.gpkg'], undefined, 'a.gpkg'],
    ['`tables` vide {}', ['a.gpkg'], {}, 'a.gpkg'],
    ['`tables` sans clé pour ce .gpkg', ['a.gpkg', 'b.gpkg'], { 'b.gpkg': ['T'] }, 'a.gpkg'],
    ['dossier, sans `tables`', ['d/a.gpkg'], undefined, 'd/a.gpkg'],
  ];
  for (const [quoi, liste, tables, entree] of cas) {
    const r = lire('couchesDuZip', liste, tables);
    const inconnu = r.filter((c) => c.format === 'gpkg' && c.entree === entree);
    assert.equal(inconnu.length, 1, `${ROUGE} : ${entree} (${quoi}) doit sortir une fois, pas disparaître`);
    assert.equal(inconnu[0].table, null, `${ROUGE} : table: null (${quoi})`);
    assert.ok(!inconnu[0].vide, `${ROUGE} : vide absent ou false (${quoi}) : ce n'est pas une liste [] connue`);
    assert.equal(inconnu[0].nom, entree, `${ROUGE} : nom = chemin complet dans le zip (${quoi}) : ${inconnu[0].nom}`);
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

test('nom d\'affichage d\'une couche rangée dans un dossier : le chemin complet dans le zip (Pascal, 4 nov. 2026)', () => {
  const r = lire('couchesDuZip', [...SHP('Serre EA/réf/', 'Parcelles'), 'a/b/UG.geojson', 'o/ortho.tif', 'd/Serre.gpkg'],
    { 'd/Serre.gpkg': ['Releves'] }).map((c) => c.nom);
  egal(r, ['Serre EA/réf/Parcelles.shp', 'a/b/UG.geojson', 'o/ortho.tif', 'd/Serre.gpkg/Releves'], 'chemins complets');
});

test('nom d\'affichage : jamais vide ni sans extension, y compris dans le zip piege et le zip lourd', async () => {
  const dossier = mkdtempSync(join(tmpdir(), 'cerf-t024-'));
  const piege = lire('couchesDuZip', await nomsZip(fabriquerPiege(dossier)));
  egal(piege.map((c) => c.nom).sort(), ['FRT_sans_georef.tif', 'Parcelles_sans_prj.shp', 'UG_sans_crs.geojson', 'UG_vide.geojson', 'Zone_inconnue.geojson'],
    'noms du zip piege');
  await fabriquerLourd(dossier, 1);
  const lourd = lire('couchesDuZip', await nomsZip(join(dossier, 'lourd.zip')), { [NOM_GPKG]: COUCHES_GPKG });
  egal(lourd.map((c) => c.nom).sort(), ['lourd.tif', ...COUCHES_GPKG.map((t) => `${NOM_GPKG}/${t}`)].sort(), 'noms du zip lourd');
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
    { couche: 'ortho', entree: 'o/ortho.tif', format: 'tif' },
    { couche: 'Releves', entree: 'g.gpkg', format: 'gpkg', table: 'Releves' },
  ], 'mélange');
});

test('aucun format reconnu, zip vide, entrées vides : liste vide sans exception', () => {
  egal(noms(['a.txt', 'b.docx', 'dossier/', '']), [], 'rien');
  egal(noms([]), [], 'zip vide');
});

// ============================================================================ GeoPackage aux tables inconnues : refus
test('sourceDeLaCouche : GeoPackage table: null (tables inconnues ou liste vide) -> jamais de source sans layername', () => {
  for (const [quoi, tables] of [['inconnues', undefined], ['liste vide', { 'd/a.gpkg': [] }]]) {
    const c = lire('couchesDuZip', ['d/a.gpkg'], tables).find((x) => x.entree === 'd/a.gpkg');
    assert.ok(c, `${ROUGE} : d/a.gpkg doit sortir (table: null, ${quoi})`);
    assert.equal(c.table, null, `${ROUGE} : table: null (${quoi})`);
    assert.equal(typeof m.sourceDeLaCouche, 'function', `${ROUGE} : sourceDeLaCouche doit exister`);
    let s;
    try { s = m.sourceDeLaCouche(COPIE, c); } catch (e) {
      if (e instanceof assert.AssertionError) throw e;
      continue; // une exception levée par sourceDeLaCouche elle-même est un refus acceptable
    }
    assert.ok(!s, `${ROUGE} : pas de source pour table: null (${quoi}), reçu « ${s} »`);
  }
});

const zipDe = (noms) => ecrireZip(noms.map((n) => ({ nom: Buffer.from(n), donnees: Buffer.from('x'), stocke: true, utf8: true })));
function contexteGpkg(noms, extra = {}) {
  const stock = {}; const ouvertes = []; const controlees = []; const ajoutees = [];
  const ok = { charge: true, controle: null, message: null, avertissements: [] };
  const ctx = {
    cerfId: '123e4567-e89b-42d3-a456-426614174000', dossierProjet: '/storage/emulated/0/Projet', nomZip: 'essai.zip',
    octets: zipDe(noms),
    reglages: { value: (k, d) => (k in stock ? stock[k] : d), setValue: (k, v) => { stock[k] = v; } },
    ouvrirCouche: (src, nom) => { ouvertes.push(String(src)); return { isValid: true, nom }; },
    decrireCouche: (c) => ({ nom: 'x', cache: c.nom }),
    controlerCouche: (d) => { controlees.push(d.nom); return ok; },
    ajouterALaCarte: (c, nom) => { ajoutees.push(nom); },
    // Mission 010 (ADR 0008) : réécriture et .qml simulés (même modèle que plugin.test.mjs et controles-branchement.test.mjs).
    reecrireCouche: (c, cible) => cible,
    ecrireFichier: () => true,
    maintenant: () => new Date('2026-11-04T10:00:00Z'),
    ...extra,
  };
  return { ctx, ouvertes, controlees, ajoutees };
}

test('importerZip : GeoPackage aux tables inconnues -> refusé en nommant le fichier, jamais ouvert ni chargé ; le GeoJSON voisin est traité', () => {
  // Aucun service de lecture des tables n'est fourni : tant que la question de la lecture des tables hors ligne n'est pas tranchée par Pascal.
  const { ctx, ouvertes, ajoutees } = contexteGpkg(['a.gpkg', 'b.geojson']);
  const r = lire('importerZip', ctx);
  assert.ok(r.message.split('\n').some((l) => l.startsWith('a.gpkg')), `${ROUGE} : une ligne du message commence par a.gpkg : ${r.message}`);
  assert.ok(r.message.split('\n').includes('a.gpkg : tables illisibles, couche non chargée'), `${ROUGE} : ligne exacte du refus : ${r.message}`);
  assert.ok(r.refusees.some((x) => String(x.message).startsWith('a.gpkg')), `${ROUGE} : refusees contient a.gpkg`);
  assert.deepEqual(ouvertes.filter((s) => /a\.gpkg/i.test(s)), [], `${ROUGE} : a.gpkg jamais ouvert`);
  assert.ok(ouvertes.every((s) => !/\.gpkg/i.test(s) || /layername=/.test(s)), `${ROUGE} : aucune source .gpkg sans layername : ${ouvertes}`);
  assert.deepEqual(ajoutees, ['b'], `${ROUGE} : seul b est chargé`);
  assert.deepEqual(r.chargees.map((c) => c.couche), ['b'], `${ROUGE} : seul b est chargé (retour)`);
  assert.deepEqual(lire('lireRegistre', ctx.reglages, ctx.cerfId).map((e) => e.couche), ['b'], `${ROUGE} : seul b est inscrit`);
});

// 2026-11-04 : cas `[]` d'importerZip NON testé ici. La ligne exacte attendue est
// « Serre.gpkg : aucune table vecteur, couche non chargée » (chemin tel que dans le zip, distincte de « tables illisibles »),
// mais le service de tables n'existe pas (mission 030) : son nom et sa forme dans le contexte d'importerZip ne sont fixés
// par aucune interface écrite, et un nom inventé ici rendrait le test insatisfiable. Le test viendra avec la mission 030,
// dans ce fichier, juste ici : contexteGpkg(['Serre.gpkg', 'b.geojson'], { <service de tables> renvoyant { 'Serre.gpkg': [] } }),
// ligne exacte, rien ouvert pour Serre.gpkg, voisin chargé. D'ici là, la marque `vide: true` de couchesDuZip est le seul garde.
test('importerZip : zip avec seul un GeoPackage aux tables inconnues -> rien ouvert, rien chargé, rien inscrit, message nommant le fichier', () => {
  const { ctx, ouvertes, ajoutees } = contexteGpkg(['dossier/a.gpkg']);
  const r = lire('importerZip', ctx);
  assert.deepEqual(ouvertes, [], `${ROUGE} : rien ouvert`);
  assert.deepEqual(ajoutees, [], `${ROUGE} : rien ajouté à la carte`);
  assert.deepEqual(r.chargees, [], `${ROUGE} : rien chargé`);
  assert.deepEqual(lire('lireRegistre', ctx.reglages, ctx.cerfId), [], `${ROUGE} : registre vide`);
  assert.ok(r.message.split('\n').includes('dossier/a.gpkg : tables illisibles, couche non chargée'),
    `${ROUGE} : ligne exacte du refus, nom tel que dans le zip : ${r.message}`);
});

test('importerZip : Shapefile sans .prj rangé dans un dossier -> ligne exacte du contrôle 1 avec le chemin complet, rien chargé ni inscrit', async () => {
  // Contrôle 1 réel (cerf-controles.mjs, boîte noire) derrière le service : decrireEntree lui passe le nom COURT et les fichiers ;
  // le message d'importerZip doit, lui, porter le chemin complet dans le zip (arbitrage de Pascal du 4 novembre 2026).
  const C = await import(pathToFileURL(join(ici, '..', 'plugin', 'cerf-controles.mjs')).href);
  const zone = { xmin: 600000, ymin: 6500000, xmax: 600100, ymax: 6500100 };
  const { ctx, ajoutees } = contexteGpkg(['Serre EA/réf/Parcelles.shp', 'Serre EA/réf/Parcelles.shx', 'Serre EA/réf/Parcelles.dbf'], {
    controlerCouche: (d) => C.controlerCouche({ lisible: true, systeme: { valide: true, epsg: 2154 }, nbEntites: 3, emprise: zone, ...d }, { reprojeter: (e) => ({ ...e }) }),
  });
  const r = lire('importerZip', ctx);
  assert.ok(r.message.split('\n').includes('Serre EA/réf/Parcelles.shp : fichier .prj manquant, système de coordonnées inconnu'),
    `${ROUGE} : ligne exacte du contrôle 1 (spec § 4), chemin complet : ${r.message}`);
  assert.deepEqual(ajoutees, [], `${ROUGE} : rien ajouté à la carte`);
  assert.deepEqual(r.chargees, [], `${ROUGE} : rien chargé`);
  assert.deepEqual(lire('lireRegistre', ctx.reglages, ctx.cerfId), [], `${ROUGE} : registre vide`);
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
    'tif:FRT_sans_georef', 'shp:Parcelles_sans_prj',
  ].sort(), 'couches du zip piege');
  egal(r.find((c) => c.format === 'shp').fichiers,
    ['Parcelles_sans_prj.shp', 'Parcelles_sans_prj.shx', 'Parcelles_sans_prj.dbf', 'Parcelles_sans_prj.cpg'],
    'Shapefile du piege : 4 fichiers, pas de .prj (piège n° 2)');
  assert.equal(lire('sourceDeLaCouche', COPIE, brut.find((c) => c.format === 'shp')),
    `/vsizip/${COPIE}/Parcelles_sans_prj.shp`, `${ROUGE} : source du Shapefile piege`);
  assert.equal(lire('sourceDeLaCouche', COPIE, brut.find((c) => c.format === 'tif')),
    `/vsizip/${COPIE}/FRT_sans_georef.tif`, `${ROUGE} : source du GeoTIFF piege`);
});

test('zip lourd (016, fabriqué à 1 Mo) : lourd.tif et les deux tables de Serre_lourd.gpkg', async () => {
  const dossier = mkdtempSync(join(tmpdir(), 'cerf-t024-'));
  await fabriquerLourd(dossier, 1);
  const liste = await nomsZip(join(dossier, 'lourd.zip'));
  const brut = lire('couchesDuZip', liste, { [NOM_GPKG]: COUCHES_GPKG });
  egal(vue(brut).map((c) => `${c.format}:${c.couche}`).sort(),
    ['gpkg:Parcelles_lourd', 'gpkg:Releves_lourd', 'tif:lourd'], 'lourd.tif + 2 tables');
  egal(brut.filter((c) => c.format === 'gpkg').map((c) => lire('sourceDeLaCouche', COPIE, c)),
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

test('decrireEntree (010) et couchesDuZip (024) : mêmes fichiers .shp/.shx/.dbf/.prj/.cpg de même racine (égalité), même nom court (cohérence)', () => {
  const zips = [
    // désordre + annexes + .qml + un autre dossier de même nom + casse mêlée
    ['sous/Parcelles.cpg', 'sous/Parcelles.prj', 'sous/Parcelles.dbf', 'sous/Parcelles.shx', 'sous/Parcelles.SHP',
      'sous/Parcelles.qix', 'sous/Parcelles.sbn', 'sous/Parcelles.shp.xml', 'sous/Parcelles.qml',
      'autre/Parcelles.shp', 'autre/Parcelles.dbf', 'UG.Shp', 'UG.PRJ', '__MACOSX/sous/._Parcelles.shp'],
    SHP('', 'FRT'),
    ['Parcelles.shp'],
  ];
  const EXT_SHP = /\.(shp|shx|dbf|prj|cpg)$/i;
  const racine = (f) => f.replace(/\.[^.]*$/, '').toLowerCase();
  for (const noms of zips) {
    const couches = lire('couchesDuZip', noms).filter((c) => c.format === 'shp');
    assert.ok(couches.length >= 1, `${ROUGE} : au moins un Shapefile reconnu`);
    for (const c of couches) {
      const d = lire('decrireEntree', c.entree, noms);
      const r = racine(base(c.entree));
      // Égalité (pas inclusion) sur les cinq extensions du Shapefile, pour la même racine ; le reste de decrireEntree est libre.
      const decrits = d.fichiers.filter((f) => EXT_SHP.test(f) && racine(f) === r).sort();
      const rendus = c.fichiers.map(base).sort();
      assert.deepEqual(decrits, rendus, `${ROUGE} : fichiers du Shapefile ${c.entree} : decrireEntree ${decrits} / couchesDuZip ${rendus}`);
      assert.equal(d.nom, base(c.entree), `${ROUGE} : nom de ${c.entree}`);
      assert.equal(c.nom, c.entree, `${ROUGE} : nom d'affichage = chemin dans le zip`);
      assert.equal(d.nom, base(c.nom), `${ROUGE} : nom court = dernier segment du nom d'affichage`);
    }
  }
});

test('decrireEntree et couchesDuZip : nom d\'affichage cohérent pour GeoJSON et GeoTIFF', () => {
  const noms = ['d/UG.geojson', 'o/ortho.TIF'];
  for (const c of lire('couchesDuZip', noms)) {
    const d = lire('decrireEntree', c.entree, noms);
    assert.equal(c.nom, c.entree, `${ROUGE} : nom d'affichage = chemin dans le zip`);
    assert.equal(d.nom, base(c.nom), `${ROUGE} : nom court = dernier segment de « ${c.nom} »`);
  }
});

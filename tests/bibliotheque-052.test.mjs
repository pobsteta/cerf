// SPDX-License-Identifier: GPL-3.0-or-later
// Mission 052 : bibliothèque de styles modèles (plugin/styles/, 25 .qml fournis par Pascal), embarquée dans le
// module plugin/vision-bibliotheque.mjs (QField 4.3.7 ne laisse pas le plugin lire un fichier de son propre
// dossier : qffileutils.cpp l. 620-628). Le module est GÉNÉRÉ par plugin/empaqueter.mjs ; un test le compare au
// dossier. L'API de QField est simulée : un vert ne prouve rien sur le Samsung (fiche terrain : plugin-essai 0.6.0).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { ecrireZip } from './recette/essai/zip-ecrire.mjs';
import * as L from '../plugin/vision-logique.mjs';
import * as S from '../plugin/vision-styles.mjs';
import { BIBLIOTHEQUE } from '../plugin/vision-bibliotheque.mjs';
import { genererBibliotheque, empaqueter, FICHIERS_PLUGIN } from '../plugin/empaqueter.mjs';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (chemin) => readFileSync(resolve(RACINE, chemin), 'utf8');
const ID = 'd98bf4b8-0fac-4dac-85cf-58e6701aceeb';
const PROJET = '/storage/emulated/0/Android/data/ch.opengis.qfield/files/Imported Projects/Serre';
const COPIES = `${PROJET}/vision-imports`;
const AVERT = '.qml illisible, style du manuel appliqué';
const RASTER = ['D50', 'G', 'MNH', 'VAT', 'compoRVB', 'mnh_classe_res10m'];
const fichiersStyles = readdirSync(resolve(RACINE, 'plugin/styles')).filter((f) => f.endsWith('.qml')).sort();

// ============================================================================ le module est le dossier

test('le module généré est identique à plugin/styles/ : mêmes 25 noms, mêmes textes, octet pour octet', () => {
  assert.equal(fichiersStyles.length, 25);
  assert.deepEqual(Object.keys(BIBLIOTHEQUE).sort(), fichiersStyles.map((f) => f.replace(/\.qml$/, '')).sort());
  for (const f of fichiersStyles) {
    assert.equal(BIBLIOTHEQUE[f.replace(/\.qml$/, '')], readFileSync(resolve(RACINE, 'plugin/styles', f), 'utf8'), f);
  }
});

test('le fichier versionné plugin/vision-bibliotheque.mjs est exactement ce que génère empaqueter.mjs (aucune divergence possible)', () => {
  assert.equal(lire('plugin/vision-bibliotheque.mjs'), genererBibliotheque());
});

test('le module est pur (moteur de QML) : SPDX, pas d\'import, ni ?. ni ??, ni séparateur de ligne U+2028/2029 brut', () => {
  const src = lire('plugin/vision-bibliotheque.mjs');
  assert.match(src, /SPDX-License-Identifier: GPL-3\.0-or-later/);
  assert.ok(!/^\s*import\b/m.test(src));
  assert.ok(!/[\u2028\u2029]/.test(src));
  assert.match(src, /^export const BIBLIOTHEQUE = \{$/m);
});

test('25 styles : 19 vecteur valides (qmlValide), 6 raster (D50, G, MNH, VAT, compoRVB, mnh_classe_res10m) reconnus raster et jamais « valides » pour un vecteur', () => {
  const raster = Object.keys(BIBLIOTHEQUE).filter((n) => S.estStyleRaster(BIBLIOTHEQUE[n])).sort();
  assert.deepEqual(raster, [...RASTER].sort());
  for (const n of Object.keys(BIBLIOTHEQUE)) {
    if (RASTER.includes(n)) assert.equal(S.qmlValide(BIBLIOTHEQUE[n]), false, n + ' : pas de <renderer-v2>');
    else { assert.equal(S.qmlValide(BIBLIOTHEQUE[n]), true, n); assert.equal(S.estStyleRaster(BIBLIOTHEQUE[n]), false, n); }
  }
});

// ============================================================================ correspondance par nom exact

test('styleDeBibliotheque : nom exact, casse et accents ignorés ; ni préfixe, ni sous-chaîne, ni extension', () => {
  const e = S.styleDeBibliotheque('RDF_UG', BIBLIOTHEQUE);
  assert.deepEqual(Object.keys(e).sort(), ['nom', 'qml']);
  assert.equal(e.nom, 'RDF_UG');
  assert.equal(e.qml, BIBLIOTHEQUE.RDF_UG);
  assert.equal(S.styleDeBibliotheque('rdf_ug', BIBLIOTHEQUE).nom, 'RDF_UG');
  assert.equal(S.styleDeBibliotheque('RDF_Ug', BIBLIOTHEQUE).nom, 'RDF_UG');
  assert.equal(S.styleDeBibliotheque('TIGES_2026', BIBLIOTHEQUE).nom, 'tiges_2026');
  assert.equal(S.styleDeBibliotheque('Compo_RVB', BIBLIOTHEQUE), null);
  assert.equal(S.styleDeBibliotheque('comporvb', BIBLIOTHEQUE).nom, 'compoRVB');
  for (const non of ['UG', 'Parcelles', 'FRT', 'RDF', 'RDF_UG2', 'RDF_UG_bis', 'xRDF_UG', 'RDF_UG.shp', 'RDF UG', 'tiges', 'tiges_2027', '', null, undefined, 3]) {
    assert.equal(S.styleDeBibliotheque(non, BIBLIOTHEQUE), null, JSON.stringify(non));
  }
});

test('styleDeBibliotheque : accents ignorés des deux côtés, bibliothèque absente ou mal formée = null, sans exception', () => {
  assert.equal(S.styleDeBibliotheque('Réserves', { reserves: 'x' }).nom, 'reserves');
  assert.equal(S.styleDeBibliotheque('reserves', { 'Réserves': 'x' }).nom, 'Réserves');
  for (const b of [null, undefined, 'x', 3, [], {}]) assert.equal(S.styleDeBibliotheque('RDF_UG', b), null);
  assert.equal(S.styleDeBibliotheque('toString', {}), null, 'pas de clé héritée');
  assert.equal(S.styleDeBibliotheque('constructor', {}), null);
});

// ============================================================================ importerZip

const zipDe = (...noms) => ecrireZip(noms.map((nom) => ({ nom: Buffer.from(nom, 'utf8'), donnees: Buffer.from('x'), stocke: false, utf8: true })));
const QML_GPKG = '<qgis version="3"><renderer-v2 type="singleSymbol"><symbols/></renderer-v2><!--gpkg--></qgis>';
const QML_BIB = '<qgis version="3"><renderer-v2 type="singleSymbol"><symbols/></renderer-v2><!--bib--></qgis>';

function monde({ noms, bibliotheque = BIBLIOTHEQUE, tables = [], styles = {}, existants = [], infos = {}, sans = false } = {}) {
  const ecrits = [];
  const effaces = [];
  const journal = [];
  const disque = new Set(existants);
  const m = new Map();
  const ctx = {
    visionId: ID, dossierProjet: PROJET, nomZip: 'x.zip', octets: zipDe(...noms),
    reglages: { value: (k, d) => (m.has(k) ? m.get(k) : d), setValue: (k, v) => m.set(k, v) },
    maintenant: () => new Date('2026-11-06T10:00:00Z'),
    ouvrirCouche: (source, nom) => ({ source, name: nom, isValid: true, readOnly: false }),
    decrireCouche: () => ({ lisible: true }),
    controlerCouche: () => ({ charge: true, avertissements: [] }),
    reecrireCouche: (couche, cible) => { journal.push('reecrire'); return cible; },
    ecrireFichier: (chemin, texte) => { journal.push('ecrire'); ecrits.push({ chemin, texte }); disque.add(chemin); return true; },
    existe: (chemin) => disque.has(chemin),
    effacerFichier: (chemin) => { journal.push('effacer'); effaces.push(chemin); disque.delete(chemin); return true; },
    ajouterALaCarte: () => {},
    styles: S,
    infosCouche: (couche) => infos[couche.name] || { geometrie: 'polygone', champs: [] },
    lireTexte: () => null,
    tablesGpkg: () => tables,
    styleGpkg: (source, table) => (Object.prototype.hasOwnProperty.call(styles, table) ? styles[table] : { etat: 'absent' }),
  };
  if (!sans) ctx.bibliotheque = bibliotheque;
  return { ctx, ecrits, effaces, journal, registre: () => L.lireRegistre(ctx.reglages, ID) };
}

test('RDF_UG.geojson : le .qml de la bibliothèque est écrit tel quel à côté de la copie, registre « bibliotheque », aucun avertissement', () => {
  const w = monde({ noms: ['RDF_UG.geojson'] });
  const r = L.importerZip(w.ctx);
  assert.deepEqual(w.ecrits, [{ chemin: `${COPIES}/x/RDF_UG.qml`, texte: BIBLIOTHEQUE.RDF_UG }]);
  assert.deepEqual(r.avertissements, []);
  assert.deepEqual(r.chargees.map((c) => [c.couche, c.style]), [['RDF_UG', 'bibliotheque']]);
  const e = w.registre()[0];
  assert.equal(e.style, 'bibliotheque');
  assert.equal(e.chemin, 'x/RDF_UG.gpkg');
  assert.ok(!('qml' in e));
  assert.equal(L.STYLE_BIBLIOTHEQUE, 'bibliotheque');
});

test('casse et accents ignorés : rdf_ug.geojson et TIGES_2026.geojson prennent le style de RDF_UG et tiges_2026', () => {
  const w = monde({ noms: ['rdf_ug.geojson', 'TIGES_2026.geojson'] });
  L.importerZip(w.ctx);
  assert.equal(w.ecrits.find((e) => e.chemin.endsWith('/rdf_ug.qml')).texte, BIBLIOTHEQUE.RDF_UG);
  assert.equal(w.ecrits.find((e) => e.chemin.endsWith('/TIGES_2026.qml')).texte, BIBLIOTHEQUE.tiges_2026);
});

test('le même nom en Shapefile (RDF_UG.shp) prend le même style', () => {
  const w = monde({ noms: ['RDF_UG.shp', 'RDF_UG.shx', 'RDF_UG.dbf', 'RDF_UG.prj'] });
  L.importerZip(w.ctx);
  assert.equal(w.ecrits[0].texte, BIBLIOTHEQUE.RDF_UG);
});

test('une couche UG (nom différent de RDF_UG) garde la règle du manuel : contour bleu #0000FF, registre « UG »', () => {
  const w = monde({ noms: ['UG.geojson'] });
  L.importerZip(w.ctx);
  assert.match(w.ecrits[0].texte, /name="outline_color" value="0,0,255,255"/);
  assert.equal(w.registre()[0].style, 'UG');
});

test('priorité : la bibliothèque passe avant la règle du manuel (une couche UG + une entrée « UG » de la bibliothèque)', () => {
  const w = monde({ noms: ['UG.geojson'], bibliotheque: { UG: QML_BIB } });
  const r = L.importerZip(w.ctx);
  assert.equal(w.ecrits[0].texte, QML_BIB);
  assert.equal(w.registre()[0].style, 'bibliotheque');
  assert.deepEqual(r.avertissements, []);
});

test('priorité : le style enregistré dans le GeoPackage passe avant la bibliothèque (table RDF_UG avec ligne dans layer_styles)', () => {
  const w = monde({ noms: ['Serre.gpkg'], tables: ['RDF_UG', 'RDF_Parc'], bibliotheque: BIBLIOTHEQUE, styles: { RDF_UG: { etat: 'lu', texte: QML_GPKG } } });
  L.importerZip(w.ctx);
  assert.equal(w.ecrits.find((e) => e.chemin.endsWith('/RDF_UG.qml')).texte, QML_GPKG);
  assert.equal(w.ecrits.find((e) => e.chemin.endsWith('/RDF_Parc.qml')).texte, BIBLIOTHEQUE.RDF_Parc, 'table sans style enregistré : la bibliothèque');
  assert.deepEqual(w.registre().map((e) => [e.couche, e.style]), [['RDF_UG', 'gpkg'], ['RDF_Parc', 'bibliotheque']]);
});

test('une ligne illisible dans le GeoPackage garde son comportement (règle du manuel + avertissement), la bibliothèque ne la remplace pas en silence', () => {
  const w = monde({ noms: ['Serre.gpkg'], tables: ['RDF_UG'], styles: { RDF_UG: { etat: 'illisible' } } });
  const r = L.importerZip(w.ctx);
  assert.deepEqual(r.avertissements, ['Serre.gpkg/RDF_UG : ' + AVERT]);
  assert.equal(w.ecrits.length, 0, 'RDF_UG n\'est pas une règle du manuel : style par défaut');
});

test('style raster jamais posé sur un vecteur : un vecteur nommé MNH, D50 ou compoRVB reste au style par défaut, rien d\'écrit, aucun avertissement', () => {
  for (const nom of RASTER) {
    const w = monde({ noms: [nom + '.geojson'] });
    const r = L.importerZip(w.ctx);
    assert.deepEqual(w.ecrits, [], nom);
    assert.deepEqual(r.avertissements, [], nom);
    assert.equal(w.registre()[0].style, 'defaut', nom);
    assert.equal(r.chargees.length, 1, nom + ' : la couche est chargée quand même');
  }
});

test('GeoTIFF : aucun style de la bibliothèque, même nommé comme un style raster (MNH.tif) ; il reste lu dans le zip, sans .qml', () => {
  const w = monde({ noms: ['MNH.tif', 'G.tif'] });
  const r = L.importerZip(w.ctx);
  assert.deepEqual(w.ecrits, []);
  assert.deepEqual(r.chargees.map((c) => c.style), ['defaut', 'defaut']);
  assert.deepEqual(w.registre().map((e) => e.style), ['defaut', 'defaut']);
});

test('un style vecteur de la bibliothèque n\'est pas posé sur un raster : GeoTIFF nommé RDF_UG.tif sans .qml', () => {
  const w = monde({ noms: ['RDF_UG.tif'] });
  L.importerZip(w.ctx);
  assert.deepEqual(w.ecrits, []);
});

test('entrée de la bibliothèque illisible (vide, pas du QGIS) : règle du manuel + l\'avertissement existant, chemin complet', () => {
  for (const mauvais of ['', '   ', 'pas du qml', '<qgis><labeling/></qgis>']) {
    const w = monde({ noms: ['UG.geojson'], bibliotheque: { UG: mauvais } });
    const r = L.importerZip(w.ctx);
    assert.match(w.ecrits[0].texte, /name="outline_color" value="0,0,255,255"/, JSON.stringify(mauvais));
    assert.deepEqual(r.avertissements, ['UG.geojson : ' + AVERT], JSON.stringify(mauvais));
    assert.equal(w.registre()[0].style, 'UG');
  }
});

test('bibliothèque non fournie (ou mal formée) : comportement d\'avant la 0.6.0, sans exception', () => {
  for (const options of [{ sans: true }, { bibliotheque: null }, { bibliotheque: 'x' }]) {
    const w = monde({ noms: ['RDF_UG.geojson', 'UG.geojson'], ...options });
    const r = L.importerZip(w.ctx);
    assert.equal(r.chargees.length, 2);
    assert.deepEqual(w.registre().map((e) => e.style), ['defaut', 'UG']);
  }
});

test('ancien .qml voisin effacé AVANT l\'écriture du style de la bibliothèque ; effacement impossible = couche refusée comme avant', () => {
  const w = monde({ noms: ['RDF_UG.geojson'], existants: [`${COPIES}/x/RDF_UG.qml`] });
  L.importerZip(w.ctx);
  assert.deepEqual(w.effaces, [`${COPIES}/x/RDF_UG.qml`]);
  assert.ok(w.journal.indexOf('effacer') < w.journal.indexOf('ecrire'));
  const w2 = monde({ noms: ['RDF_UG.geojson'], existants: [`${COPIES}/x/RDF_UG.qml`] });
  w2.ctx.effacerFichier = () => false;
  const r = L.importerZip(w2.ctx);
  assert.deepEqual(r.refusees.map((x) => x.message), ['RDF_UG.geojson : ancien style (.qml) impossible à effacer, couche refusée']);
});

test('écriture ratée du style de la bibliothèque : style par défaut + avertissement existant « style non écrit… »', () => {
  const w = monde({ noms: ['RDF_UG.geojson'] });
  w.ctx.ecrireFichier = () => false;
  const r = L.importerZip(w.ctx);
  assert.deepEqual(r.avertissements, ['RDF_UG.geojson : style non écrit, couche chargée avec le style par défaut']);
  assert.equal(w.registre()[0].style, 'defaut');
});

test('réimport : un zip dont la couche n\'est plus dans la bibliothèque ne garde pas l\'ancien style de la bibliothèque', () => {
  const w = monde({ noms: ['RDF_UG.geojson'] });
  L.importerZip(w.ctx);
  w.ctx.bibliotheque = {};
  L.importerZip(w.ctx);
  assert.ok(w.effaces.includes(`${COPIES}/x/RDF_UG.qml`));
  assert.equal(w.registre()[0].style, 'defaut');
});

// ============================================================================ plafond, forme, version, empaquetage

test('plafond du zip : 100 Mo (100 000 000 octets) ; le message ne change que de nombre', () => {
  assert.equal(L.PLAFOND_LISTAGE_OCTETS, 100000000);
  assert.equal(L.listageSur(100000000), true);
  assert.equal(L.listageSur(50000000), true);
  assert.equal(L.listageSur(100000001), false);
  assert.equal(L.listageSur(10000001), true, 'un zip de 10 à 100 Mo est désormais lu');
  assert.equal(L.listageSur(-1), false);
  assert.equal(L.messageListageRefuse('lourd.zip', 200045802), 'lourd.zip : 200 Mo, au-delà du plafond de 100 Mo pour lister un zip ; zip non lu');
  assert.equal(L.messageListageRefuse('x.zip', -1), 'x.zip : taille de la copie inconnue, zip non lu (plafond de 100 Mo pour lister un zip)');
});

test('Vision.qml importe la bibliothèque et la passe à importerZip ; elle ne lit aucun .qml sur le disque', () => {
  const qml = lire('plugin/Vision.qml');
  assert.match(qml, /^import "vision-bibliotheque\.mjs" as Bibliotheque$/m);
  const zipRecu = /function zipRecu\([\s\S]*?\n  \}\n/.exec(qml.split('\n').filter((x) => !/^\s*\/\//.test(x)).join('\n'))[0];
  assert.match(zipRecu, /bibliotheque: Bibliotheque\.BIBLIOTHEQUE,/);
  assert.ok(!/plugin\/styles|resolvedUrl\("styles/.test(qml));
});

test('version 0.6.0 (constante, metadata.txt) et préversion : branche de la mission 052 dans release-plugin.yml (la 050 reste)', () => {
  assert.equal(L.VERSION, '0.6.0');
  assert.match(lire('plugin/metadata.txt'), /^version=0\.6\.0$/m);
  const wf = lire('.github/workflows/release-plugin.yml');
  assert.match(wf, /'mission\/052-styles-modeles'/);
  assert.match(wf, /'mission\/050-vision'/);
});

test('plugin-vision.zip contient vision-bibliotheque.mjs, identique au module généré, et le dossier styles/ n\'y est pas (rien à lire sur le disque)', () => {
  assert.ok(FICHIERS_PLUGIN.includes('vision-bibliotheque.mjs'));
  const sortie = mkdtempSync(join(tmpdir(), 'vision-plugin-'));
  try {
    const r = empaqueter(sortie);
    const noms = [...L.nomsDuZip(readFileSync(r.chemin))];
    assert.ok(noms.includes('vision-bibliotheque.mjs'));
    assert.ok(!noms.some((n) => n.startsWith('styles/')));
    assert.deepEqual(noms.sort(), [...FICHIERS_PLUGIN].sort());
  } finally {
    rmSync(sortie, { recursive: true, force: true });
  }
});

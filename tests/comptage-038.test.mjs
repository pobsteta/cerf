// SPDX-License-Identifier: GPL-3.0-or-later
// Mission 038 : le comptage des entités passe par un itérateur, pas par featureCount().
// Sources lues le 4 novembre 2026 : QGIS 3a92eb3 src/core/vector/qgsvectorlayer.h l. 1701 (`long long featureCount() const final;`,
// ni Q_PROPERTY ni Q_INVOKABLE) ; QField v4.3.7 src/core/utils/qflayerutils.h l. 234 (`Q_INVOKABLE static QfFeatureIterator
// createFeatureIterator( QgsVectorLayer *layer )`) et l. 52-75 (hasNext, next, close en Q_INVOKABLE) ; prototype-2/Essai.qml (mission 023).
// Ces tests simulent QField avec de fausses fonctions : un vert ne prouve rien sur le Samsung.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from '../plugin/cerf-controles.mjs';
import * as L from '../plugin/cerf-logique.mjs';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (f) => readFileSync(resolve(RACINE, f), 'utf8');
const sansCommentaires = (t) => t.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

// Faux itérateur de QField : n entités, journal des appels.
function faux(n, { leveSur = null } = {}) {
  const journal = { next: 0, close: 0, hasNext: 0 };
  let i = 0;
  return {
    journal,
    it: {
      hasNext() { journal.hasNext++; if (leveSur === 'hasNext') throw new Error('lecture'); return i < n; },
      next() { journal.next++; if (leveSur === 'next') throw new Error('lecture'); i++; return {}; },
      close() { journal.close++; if (leveSur === 'close') throw new Error('fermeture'); },
    },
  };
}

test('comptage : couche vide -> nbEntites 0, lisible, itérateur fermé', () => {
  const f = faux(0);
  assert.deepEqual(L.compterEntites({}, () => f.it), { lisible: true, nbEntites: 0 });
  assert.equal(f.journal.close, 1);
});
test('comptage : couche non vide -> nbEntites 1 (plafond), un seul next, itérateur fermé', () => {
  const f = faux(100000);
  assert.equal(L.PLAFOND_COMPTAGE, 1);
  assert.deepEqual(L.compterEntites({}, () => f.it), { lisible: true, nbEntites: 1 });
  assert.equal(f.journal.next, 1);
  assert.equal(f.journal.close, 1);
});
test('comptage : le service reçoit la couche', () => {
  const recues = []; const couche = { nom: 'UG' };
  L.compterEntites(couche, (c) => { recues.push(c); return faux(0).it; });
  assert.deepEqual(recues, [couche]);
});
test('comptage : hasNext qui lève -> illisible (jamais vide), itérateur fermé', () => {
  const f = faux(3, { leveSur: 'hasNext' });
  assert.deepEqual(L.compterEntites({}, () => f.it), { lisible: false, nbEntites: -1 });
  assert.equal(f.journal.close, 1);
});
test('comptage : next qui lève -> illisible, itérateur fermé', () => {
  const f = faux(3, { leveSur: 'next' });
  assert.deepEqual(L.compterEntites({}, () => f.it), { lisible: false, nbEntites: -1 });
  assert.equal(f.journal.close, 1);
});
test('comptage : création de l\'itérateur qui lève, ou qui rend rien -> illisible', () => {
  assert.deepEqual(L.compterEntites({}, () => { throw new Error('API absente'); }), { lisible: false, nbEntites: -1 });
  assert.deepEqual(L.compterEntites({}, () => null), { lisible: false, nbEntites: -1 });
  assert.deepEqual(L.compterEntites({}, () => undefined), { lisible: false, nbEntites: -1 });
});
test('comptage : close qui lève ne change pas le résultat', () => {
  assert.deepEqual(L.compterEntites({}, () => faux(0, { leveSur: 'close' }).it), { lisible: true, nbEntites: 0 });
  assert.deepEqual(L.compterEntites({}, () => faux(2, { leveSur: 'close' }).it), { lisible: true, nbEntites: 1 });
});

// ---------- de bout en bout : comptage -> description -> contrôles (spec § 4) ----------
const description = (nb, extra = {}) => Object.assign({
  nom: 'UG_vide.geojson', format: 'geojson', fichiers: ['UG_vide.geojson'], lisible: nb.lisible,
  systeme: { valide: true, epsg: 2154, authid: 'EPSG:2154' }, nbEntites: nb.nbEntites, emprise: null,
}, extra);
test('couche vide : chargée avec l\'avertissement « couche vide », sans contrôle 5 (reprojeter non appelé)', () => {
  let appels = 0;
  const r = C.controlerCouche(description(L.compterEntites({}, () => faux(0).it)), { reprojeter: () => { appels++; return null; } });
  assert.equal(r.charge, true);
  assert.deepEqual(r.avertissements, ['UG_vide.geojson : couche vide']);
  assert.equal(appels, 0);
});
test('couche non vide : chemin normal, contrôle 5 appelé, aucun avertissement « vide »', () => {
  let appels = 0;
  const e = { xmin: 668000, ymin: 6826000, xmax: 668500, ymax: 6826500 };
  const d = description(L.compterEntites({}, () => faux(5).it), { nom: 'UG.geojson', emprise: e });
  const r = C.controlerCouche(d, { reprojeter: (x) => { appels++; return x; } });
  assert.equal(r.charge, true);
  assert.deepEqual(r.avertissements, []);
  assert.equal(appels, 1);
});
test('itérateur qui lève : illisible, refus au contrôle 2 (pas « couche vide »)', () => {
  let appels = 0;
  const r = C.controlerCouche(description(L.compterEntites({}, () => faux(1, { leveSur: 'hasNext' }).it)), { reprojeter: () => { appels++; return null; } });
  assert.equal(r.charge, false);
  assert.equal(r.controle, 2);
  assert.match(r.message, /illisible/);
  assert.equal(appels, 0);
});

// ---------- forme et branchement ----------
test('forme : Cerf.qml n\'appelle jamais featureCount (code, hors commentaires)', () => {
  assert.doesNotMatch(sansCommentaires(lire('plugin/Cerf.qml')), /featureCount/);
});
test('branchement : decrireCouche compte par Logique.compterEntites et LayerUtils.createFeatureIterator ; le format est passé', () => {
  const qml = lire('plugin/Cerf.qml');
  assert.match(qml, /Logique\.compterEntites\(couche, function \(l\) \{ return LayerUtils\.createFeatureIterator\(l\); \}\)/);
  assert.match(qml, /function decrireCouche\(couche, format\)/);
  assert.match(lire('plugin/cerf-logique.mjs'), /ctx\.decrireCouche\(couche, entree\.format\)/);
});
test('forme : cerf-logique.mjs sans ?., ?? ni import', () => {
  const code = sansCommentaires(lire('plugin/cerf-logique.mjs'));
  assert.doesNotMatch(code, /\?\./); assert.doesNotMatch(code, /\?\?/); assert.doesNotMatch(code, /^\s*import\s/m);
});
test('version et préversion : 0.4.0, branche de la mission 038 dans release-plugin.yml', () => {
  assert.equal(L.VERSION, '0.4.0');
  assert.match(lire('plugin/metadata.txt'), /^version=0\.4\.0$/m);
  assert.match(lire('.github/workflows/release-plugin.yml'), /'mission\/038-compter-entites'/);
});

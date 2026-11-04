// SPDX-License-Identifier: GPL-3.0-or-later
// Mission 010 : tests du dev pour ce que la mission branche dans le plugin (importerZip,
// demarrerProjet, couchesDuZip, estGeoJson, trouverQmlDeTable). Les règles elles-mêmes sont
// testées par tests/styles.test.mjs (testeur). L'API de QField est simulée : ces tests ne
// prouvent RIEN sur l'affichage des couleurs, que seul le Samsung peut montrer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ecrireZip } from './recette/essai/zip-ecrire.mjs';
import * as L from '../plugin/cerf-logique.mjs';
import * as S from '../plugin/cerf-styles.mjs';

const ID = 'ebad8ff8-577e-48bc-9489-6bab871230c2';
const PROJET = '/storage/emulated/0/Android/data/ch.opengis.qfield/files/Imported Projects/Serre';
const GJ = '{"type":"FeatureCollection","features":[]}';
const zipDe = (...noms) => ecrireZip(noms.map((nom) => ({ nom: Buffer.from(nom, 'utf8'), donnees: Buffer.from(GJ), stocke: false, utf8: true })));

function reglages() {
  const m = new Map();
  return { m, value: (k, d) => (m.has(k) ? m.get(k) : d), setValue: (k, v) => m.set(k, v) };
}

// Couches simulées : la géométrie et les champs viennent d'une table par nom de couche.
function monde({ infos = {}, textes = {}, qmlOk = true, echecStyle = false } = {}) {
  const posees = [];
  const ctx = {
    cerfId: ID, dossierProjet: PROJET, nomZip: 'x.zip', reglages: reglages(),
    maintenant: () => new Date('2026-11-04T10:00:00Z'),
    chargerCouche: (source, nom) => ({ source, name: nom, isValid: true, readOnly: false }),
    styles: S,
    infosCouche: (couche) => infos[couche.name] || { geometrie: 'polygone', champs: [] },
    lireTexte: (zip, chemin) => (Object.prototype.hasOwnProperty.call(textes, chemin) ? textes[chemin] : null),
    appliquerStyle: (couche, style) => { if (echecStyle) throw new Error('simulé'); posees.push({ couche: couche.name, style }); },
    appliquerQml: (couche, qml) => { posees.push({ couche: couche.name, qml }); return qmlOk; },
  };
  return { ctx, posees };
}

test('couchesDuZip : un .json est retenu et marqué json ; .geojson inchangé (sans clé en plus)', () => {
  assert.deepEqual(L.couchesDuZip(['a.geojson', 'd/b.JSON', 'c.txt']), [
    { couche: 'a', entree: 'a.geojson' },
    { couche: 'b', entree: 'd/b.JSON', json: true },
  ]);
});

test('estGeoJson : FeatureCollection, Feature, géométrie nue, BOM acceptés ; JSON quelconque, tableau, texte cassé refusés', () => {
  assert.equal(S.estGeoJson(GJ), true);
  assert.equal(S.estGeoJson('﻿{"type":"Feature","geometry":null,"properties":{}}'), true);
  assert.equal(S.estGeoJson('{"type":"Point","coordinates":[1,2]}'), true);
  assert.equal(S.estGeoJson('{"nom":"config"}'), false);
  assert.equal(S.estGeoJson('{"type":"autre"}'), false);
  assert.equal(S.estGeoJson('[]'), false);
  assert.equal(S.estGeoJson('{pas du json'), false);
  assert.equal(S.estGeoJson(null), false);
});

test('importerZip : un .json GeoJSON est chargé ; un .json qui n\'en est pas est ignoré en silence', () => {
  const { ctx } = monde({ textes: { 'p.json': GJ, 'config.json': '{"a":1}' } });
  ctx.octets = zipDe('p.json', 'config.json');
  const r = L.importerZip(ctx);
  assert.deepEqual(r.chargees.map((c) => c.couche), ['p']);
  assert.deepEqual(r.refusees, []);
  assert.ok(!r.message.includes('config'), r.message);
});

test('importerZip : zip avec seulement un .json non GeoJSON -> « Aucune couche », aucun refus', () => {
  const { ctx } = monde({ textes: { 'config.json': '{"a":1}' } });
  ctx.octets = zipDe('config.json');
  const r = L.importerZip(ctx);
  assert.equal(r.chargees.length, 0);
  assert.match(r.message, /^Aucune couche GeoJSON dans x\.zip\./);
});

test('importerZip : contenu du .json illisible (lireTexte rend null) -> chargement tenté, jamais écarté en silence', () => {
  const { ctx } = monde();
  ctx.octets = zipDe('p.json');
  const r = L.importerZip(ctx);
  assert.deepEqual(r.chargees.map((c) => c.couche), ['p']);
});

test('importerZip : UG polygone reçoit le style UG, inscrit au registre ; la couche reste en lecture seule', () => {
  const { ctx, posees } = monde({ infos: { UG: { geometrie: 'polygone', champs: ['id', 'code_ug'] } } });
  ctx.octets = zipDe('UG.geojson');
  const r = L.importerZip(ctx);
  assert.equal(posees.length, 1);
  assert.equal(posees[0].style.symbole.couleur, '#0000FF');
  assert.equal(posees[0].style.etiquette.champ, 'code_ug', 'le nom réel du champ de code est trouvé sans tenir compte de la casse');
  assert.equal(r.chargees[0].style, 'UG');
  assert.equal(L.lireRegistre(ctx.reglages, ID)[0].style, 'UG');
  assert.equal(L.lireRegistre(ctx.reglages, ID)[0].qml, undefined);
});

test('importerZip : champ de code introuvable -> nom provisoire CODE_PARC', () => {
  const { ctx, posees } = monde({ infos: { Parcelles: { geometrie: 'polygone', champs: ['id'] } } });
  ctx.octets = zipDe('Parcelles.geojson');
  L.importerZip(ctx);
  assert.equal(posees[0].style.etiquette.champ, 'CODE_PARC');
  assert.equal(posees[0].style.symbole.epaisseur_mm, 1);
});

test('importerZip : points avec ESSENCE et Diamètre -> ProdBois, expression avec les noms réels, sans avertissement', () => {
  const { ctx, posees } = monde({ infos: { releves: { geometrie: 'point', champs: ['ESSENCE', 'Diamètre'] } } });
  ctx.octets = zipDe('releves.geojson');
  const r = L.importerZip(ctx);
  assert.equal(posees[0].style.etiquette.expression, `"ESSENCE" || '\\n' || "Diamètre"`);
  assert.deepEqual(r.avertissements, []);
});

test('importerZip : point nommé UG sans essence/diametre -> style par défaut et avertissement préfixé « UG.geojson : » (spec § 4)', () => {
  const { ctx, posees } = monde({ infos: { UG: { geometrie: 'point', champs: ['id'] } } });
  ctx.octets = zipDe('dossier/UG.geojson');
  const r = L.importerZip(ctx);
  assert.deepEqual(posees, []);
  assert.deepEqual(r.avertissements, ['UG.geojson : nom reconnu mais pas un polygone']);
  assert.ok(r.message.includes('UG.geojson : nom reconnu mais pas un polygone'));
  assert.equal(L.lireRegistre(ctx.reglages, ID)[0].style, 'defaut');
});

test('importerZip : un .qml de même nom est appliqué (la règle par nom ne l\'est pas) et son chemin est inscrit', () => {
  const { ctx, posees } = monde({ textes: { 'd/UG.qml': '<qgis version="3"/>' } });
  ctx.octets = zipDe('d/UG.geojson', 'd/UG.qml', 'd/UG.qmd');
  const r = L.importerZip(ctx);
  assert.deepEqual(posees, [{ couche: 'UG', qml: '<qgis version="3"/>' }]);
  assert.deepEqual(r.avertissements, []);
  const e = L.lireRegistre(ctx.reglages, ID)[0];
  assert.equal(e.style, 'qml');
  assert.equal(e.qml, 'd/UG.qml');
});

test('importerZip : .qml vide -> règle par nom, avertissement « .qml illisible, style du manuel appliqué »', () => {
  const { ctx, posees } = monde({ textes: { 'UG.qml': '  ' } });
  ctx.octets = zipDe('UG.geojson', 'UG.qml');
  const r = L.importerZip(ctx);
  assert.equal(posees.length, 1);
  assert.equal(posees[0].style.symbole.couleur, '#0000FF');
  assert.deepEqual(r.avertissements, ['UG.geojson : .qml illisible, style du manuel appliqué']);
});

test('importerZip : .qml refusé par QGIS (appliquerQml faux) -> même repli que le .qml vide', () => {
  const { ctx, posees } = monde({ qmlOk: false, textes: { 'UG.qml': 'pas du qml' } });
  ctx.octets = zipDe('UG.geojson', 'UG.qml');
  const r = L.importerZip(ctx);
  assert.equal(posees[1].style.symbole.couleur, '#0000FF');
  assert.deepEqual(r.avertissements, ['UG.geojson : .qml illisible, style du manuel appliqué']);
  assert.equal(L.lireRegistre(ctx.reglages, ID)[0].style, 'UG');
});

test('importerZip : une erreur de style ne fait pas refuser la couche', () => {
  const { ctx } = monde({ echecStyle: true });
  ctx.octets = zipDe('UG.geojson');
  const r = L.importerZip(ctx);
  assert.equal(r.chargees.length, 1);
  assert.deepEqual(r.refusees, []);
  assert.match(r.avertissements[0], /^UG\.geojson : style non appliqué \(simulé\)$/);
  assert.equal(L.lireRegistre(ctx.reglages, ID)[0].style, 'defaut');
});

test('importerZip : sans les moyens de poser un style (ctx.appliquerStyle absent), rien n\'est posé ni dit, registre en « defaut »', () => {
  const { ctx } = monde();
  delete ctx.appliquerStyle;
  ctx.octets = zipDe('UG.geojson');
  const r = L.importerZip(ctx);
  assert.deepEqual(r.avertissements, []);
  assert.equal(L.lireRegistre(ctx.reglages, ID)[0].style, 'defaut');
});

test('demarrerProjet : le style revient à la réouverture (règle par nom, puis .qml du registre), sans répéter les avertissements', () => {
  const { ctx, posees } = monde({ textes: { 'UG.qml': '<qgis/>' } });
  ctx.octets = zipDe('UG.geojson', 'UG.qml', 'FRT.geojson');
  L.importerZip(ctx);
  posees.length = 0;
  const d = L.demarrerProjet({
    variables: { cerf_id: ID }, reglages: ctx.reglages, dossierProjet: PROJET, existe: () => true,
    chargerCouche: ctx.chargerCouche, styles: S, infosCouche: ctx.infosCouche, lireTexte: ctx.lireTexte,
    appliquerStyle: ctx.appliquerStyle, appliquerQml: ctx.appliquerQml,
  });
  assert.equal(d.rechargees.length, 2);
  const parCouche = Object.fromEntries(posees.map((p) => [p.couche, p]));
  assert.equal(parCouche.UG.qml, '<qgis/>');
  assert.equal(parCouche.FRT.style.symbole.couleur, '#008B8B');
  assert.ok(!d.message.includes('qml'), d.message);
});

test('trouverQmlDeTable : le .qml d\'une table de GeoPackage porte le nom de la table', () => {
  const chemins = ['d/Serre.gpkg', 'd/UG.qml', 'd/Serre.qml', 'e/UG.qml'];
  assert.equal(S.trouverQmlDeTable('d/Serre.gpkg', 'UG', chemins), 'd/UG.qml');
  assert.equal(S.trouverQmlDeTable('d/Serre.gpkg', 'Autre', chemins), null);
});

test('geometrieDe : types de QGIS 0, 1, 2 vers point, ligne, polygone ; inconnu -> null', () => {
  assert.deepEqual([0, 1, 2, 3, undefined].map(S.geometrieDe), ['point', 'ligne', 'polygone', null, null]);
});

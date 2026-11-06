// SPDX-License-Identifier: GPL-3.0-or-later
// Mission 034 : le système de coordonnées est jugé valide d'après ce que QML voit.
// Source : QGIS 3a92eb3 (embarqué par QField 4.3.7), src/core/proj/qgscoordinatereferencesystem.h, consulté le 4 novembre 2026
// (https://raw.githubusercontent.com/qgis/QGIS/3a92eb3/src/core/proj/qgscoordinatereferencesystem.h) :
// l. 218-223 : Q_GADGET + Q_PROPERTY mapUnits, isGeographic, authid, description ; l. 588 : `bool isValid() const;` sans
// Q_INVOKABLE ni Q_PROPERTY. Ces tests ne prouvent rien sur QField : l'essai sur le Samsung (préversion 0.3.2) le fait.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as L from '../plugin/vision-logique.mjs';
import * as C from '../plugin/vision-controles.mjs';

const PLUGIN = resolve(dirname(fileURLToPath(import.meta.url)), '../plugin');
const lire = (f) => readFileSync(resolve(PLUGIN, f), 'utf8');
const EXPOSEES = ['mapUnits', 'isGeographic', 'authid', 'description'];

// Un crs tel que QML le voit : seules les quatre propriétés exposées, jamais isValid.
const vuParQml = (authid, description) => ({ mapUnits: 0, isGeographic: false, authid, description });

test('règle : authid non vide -> valide, epsg tiré de authid', () => {
  const s = L.decrireSysteme(vuParQml('EPSG:2154', 'RGF93 v1 / Lambert-93'));
  assert.equal(s.valide, true); assert.equal(s.epsg, 2154); assert.equal(s.authid, 'EPSG:2154');
});
test('règle : CRS84 déclaré par un GeoJSON -> valide (le cas du Samsung)', () => {
  const s = L.decrireSysteme(vuParQml('OGC:CRS84', 'WGS 84 (CRS84)'));
  assert.equal(s.valide, true); assert.equal(s.epsg, 0);
});
test('règle : authid vide mais description non vide (.prj ESRI) -> valide, epsg 0', () => {
  const s = L.decrireSysteme(vuParQml('', 'RGF93_Lambert_93'));
  assert.equal(s.valide, true); assert.equal(s.epsg, 0);
});
test('règle : authid et description vides -> invalide', () => {
  assert.equal(L.decrireSysteme(vuParQml('', '')).valide, false);
  assert.equal(L.decrireSysteme(vuParQml('  ', ' ')).valide, false);
  assert.equal(L.decrireSysteme({}).valide, false);
});
test('règle : crs absent ou illisible -> invalide, sans lever', () => {
  assert.equal(L.decrireSysteme(undefined).valide, false);
  assert.equal(L.decrireSysteme(null).valide, false);
  const pieges = { get authid() { throw new Error('boum'); } };
  assert.equal(L.decrireSysteme(pieges).valide, false);
});
test('règle : isValid n\'est jamais consulté, même si on le fournit à tort', () => {
  assert.equal(L.decrireSysteme({ authid: '', description: '', isValid: true }).valide, false);
  assert.equal(L.decrireSysteme({ authid: 'EPSG:2154', isValid: false }).valide, true);
});
test('règle : l\'objet crs est rendu tel quel (reprojection)', () => {
  const crs = vuParQml('EPSG:4326', 'WGS 84');
  assert.equal(L.decrireSysteme(crs).crs, crs);
});

// Reprojection de test : 2154 -> identité ; 4326 -> hors domaine (|x| > 180) non fini, comme PROJ (mesuré le 4 novembre 2026).
const reprojeter = (e, epsg) => (epsg === 4326 && Math.abs(e.xmin) > 180 ? { xmin: Infinity, ymin: Infinity, xmax: Infinity, ymax: Infinity } : { ...e });
const geojson = (systeme, emprise) => ({ nom: 'UG.geojson', format: 'geojson', fichiers: ['UG.geojson'], lisible: true, systeme, nbEntites: 1, emprise });

test('bout en bout : GeoJSON CRS84 -> chargé ; Lambert 93 sans crs (lu en WGS84) -> refusé par l\'emprise (contrôle 5, pas 3)', () => {
  const ok = C.controlerCouche(geojson(L.decrireSysteme(vuParQml('EPSG:4326', 'WGS 84')), { xmin: 7.76, ymin: 48.57, xmax: 7.77, ymax: 48.58 }), { reprojeter: () => ({ xmin: 1050000, ymin: 6840000, xmax: 1051000, ymax: 6841000 }) });
  assert.equal(ok.charge, true);
  const sansCrs = C.controlerCouche(geojson(L.decrireSysteme(vuParQml('EPSG:4326', 'WGS 84')), { xmin: 668000, ymin: 6826000, xmax: 668500, ymax: 6826500 }), { reprojeter });
  assert.equal(sansCrs.charge, false); assert.equal(sansCrs.controle, 5);
});
test('bout en bout : système sans authid ni description -> refus du contrôle 3', () => {
  const r = C.controlerCouche(geojson(L.decrireSysteme(vuParQml('', '')), { xmin: 0, ymin: 0, xmax: 1, ymax: 1 }), { reprojeter });
  assert.equal(r.charge, false); assert.equal(r.controle, 3); assert.equal(r.message, 'UG.geojson : système de coordonnées inconnu');
});

// ---- forme : aucune lecture d'une propriété du système absente de la liste exposée à QML ----
function sansCommentaires(src) { return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'`])\/\/.*$/gm, '$1'); }
// Rend les lectures interdites : `crs.x`, `.crs.x`, `.crs().x`, `crs["x"]`, et les variables intermédiaires (`const v = c.crs;`).
function lecturesInterdites(src) {
  const code = sansCommentaires(src);
  const noms = new Set(['crs']);
  for (const m of code.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*[\w.\[\]"']*\.crs\s*(?:\(\s*\))?\s*;/g)) noms.add(m[1]);
  for (const m of code.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*crs\s*;/g)) noms.add(m[1]);
  const trouves = [];
  for (const n of noms) {
    const re = new RegExp(`(?:\\b${n}|\\.crs\\s*\\(\\s*\\))\\s*(?:\\?\\.|\\.)\\s*(\\w+)|\\b${n}\\s*\\[\\s*["'\`](\\w+)`, 'g');
    for (const m of code.matchAll(re)) { const p = m[1] || m[2]; if (!EXPOSEES.includes(p)) trouves.push(m[0]); }
  }
  for (const m of code.matchAll(/\.crs\s*(?:\(\s*\))?\s*(?:\?\.|\.)\s*(\w+)/g)) if (!EXPOSEES.includes(m[1])) trouves.push(m[0]);
  return [...new Set(trouves)];
}
test('forme : Vision.qml, vision-logique.mjs et vision-controles.mjs ne lisent du crs que mapUnits, isGeographic, authid, description', () => {
  for (const f of ['Vision.qml', 'vision-logique.mjs', 'vision-controles.mjs']) {
    assert.deepEqual(lecturesInterdites(lire(f)), [], `${f} lit une propriété du système absente de QML`);
  }
});
test('forme : le détecteur attrape isValid, isValid(), les variantes .crs() et la variable intermédiaire', () => {
  assert.deepEqual(lecturesInterdites('const v = crs.isValid;'), ['crs.isValid']);
  assert.deepEqual(lecturesInterdites('crs.isValid()'), ['crs.isValid']);
  assert.deepEqual(lecturesInterdites('x = couche.crs().isValid()'), ['.crs().isValid']);
  assert.deepEqual(lecturesInterdites('const s = couche.crs; if (s.isValid) {}'), ['s.isValid']);
  assert.deepEqual(lecturesInterdites('const s = couche.crs(); s.postgisSrid'), ['s.postgisSrid']);
  assert.deepEqual(lecturesInterdites('couche.crs["isValid"]'), ['crs["isValid']);
  assert.deepEqual(lecturesInterdites('crs?.isValid'), ['crs?.isValid']);
  assert.deepEqual(lecturesInterdites('crs.authid + crs.description + crs.mapUnits + crs.isGeographic'), []);
  assert.deepEqual(lecturesInterdites('// crs.isValid en commentaire'), []);
});
test('forme : Vision.qml passe par decrireSysteme', () => {
  assert.match(lire('Vision.qml'), /Logique\.decrireSysteme\(couche\.crs\)/);
});
test('forme : vision-logique.mjs sans ?., ?? ni import', () => {
  const code = sansCommentaires(lire('vision-logique.mjs'));
  assert.doesNotMatch(code, /\?\./); assert.doesNotMatch(code, /\?\?/); assert.doesNotMatch(code, /^\s*import\s/m);
});
test('version et préversion : 0.6.0, branche de la mission dans release-plugin.yml', () => {
  assert.equal(L.VERSION, '0.6.0');
  assert.match(lire('metadata.txt'), /^version=0\.6\.0$/m);
  assert.match(readFileSync(resolve(PLUGIN, '../.github/workflows/release-plugin.yml'), 'utf8'), /'mission\/050-vision'/);
});

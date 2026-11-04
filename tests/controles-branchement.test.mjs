// Mission 012 : tests du développeur pour ce qu'il branche (cerf-controles.mjs au-delà du contrat de la
// mission 011, importerZip : ouvrir -> contrôler -> ajouter -> inscrire, empaquetage).
// Coordonnées : x = Est, y = Nord en EPSG:2154 (mètres) ; lon puis lat en EPSG:4326 (degrés).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from '../plugin/cerf-controles.mjs';
import * as L from '../plugin/cerf-logique.mjs';
import { ecrireZip } from './recette/essai/zip-ecrire.mjs';
import { FICHIERS_PLUGIN } from '../plugin/empaqueter.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const REF = JSON.parse(readFileSync(resolve(ICI, '../docs/referentiels/emprise-metropole.json'), 'utf8')).elargie;
const identite = (e) => ({ ...e });
const geojson2154 = (e, extra = {}) => ({
  nom: 'UG.geojson', format: 'geojson', fichiers: ['UG.geojson'], lisible: true,
  systeme: { valide: true, epsg: 2154 }, nbEntites: 3, emprise: e, ...extra,
});
const sur = (x, y) => ({ xmin: x, ymin: y, xmax: x, ymax: y });

test('constante d\'emprise = référentiel 002 (aucune des deux copies ne dérive)', () => {
  assert.deepEqual(C.EMPRISE_VRAISEMBLANCE, REF);
});

test('bornes incluses : un point sur chacun des quatre bords passe, à 1 m dehors refusé', () => {
  const R = C.EMPRISE_VRAISEMBLANCE;
  const bords = [sur(R.xmin, 6500000), sur(R.xmax, 6500000), sur(500000, R.ymin), sur(500000, R.ymax)];
  for (const b of bords) assert.equal(C.controlerCouche(geojson2154(b), { reprojeter: identite }).charge, true);
  const dehors = [sur(R.xmin - 1, 6500000), sur(R.xmax + 1, 6500000), sur(500000, R.ymin - 1), sur(500000, R.ymax + 1)];
  for (const d of dehors) {
    const r = C.controlerCouche(geojson2154(d), { reprojeter: identite });
    assert.equal(r.charge, false);
    assert.equal(r.controle, 5);
  }
});

test('Strasbourg (1 051 113 ; 6 840 462, EPSG:2154) tombe dans l\'emprise ; Jersey et Genève aussi (limite acceptée, ADR 0004)', () => {
  const ok = (x, y) => C.controlerCouche(geojson2154(sur(x, y)), { reprojeter: identite }).charge;
  assert.equal(ok(1051113, 6840462), true);
  assert.equal(ok(942025, 6580000), true, 'Genève (x 942 025, référentiel 002) : dans le rectangle, limite acceptée, ne pas « corriger »');
  assert.equal(ok(268000, 6900000), true, 'Jersey : dans le rectangle, limite acceptée');
  assert.equal(ok(1051113, 3724036), false, 'axes inversés : refusé');
});

test('NaN, Infinity, emprise inversée ou absente rendues par reprojeter : refus 5, jamais « passe »', () => {
  for (const rendu of [
    { xmin: NaN, ymin: 6500000, xmax: 700000, ymax: 6600000 },
    { xmin: 600000, ymin: 6500000, xmax: Infinity, ymax: 6600000 },
    { xmin: 700000, ymin: 6500000, xmin2: 1, xmax: 600000, ymax: 6600000 },
    null, undefined, 'x',
  ]) {
    const r = C.controlerCouche(geojson2154({ xmin: 1, ymin: 1, xmax: 2, ymax: 2 }), { reprojeter: () => rendu });
    assert.equal(r.charge, false);
    assert.equal(r.controle, 5);
    assert.match(r.message, /^UG\.geojson : /);
  }
});

test('reprojeter qui lève, ou service absent : refus 5, sans exception', () => {
  const lever = () => { throw new Error('PROJ'); };
  assert.equal(C.controlerCouche(geojson2154(sur(600000, 6500000)), { reprojeter: lever }).controle, 5);
  assert.equal(C.controlerCouche(geojson2154(sur(600000, 6500000)), {}).controle, 5);
  assert.equal(C.controlerCouche(geojson2154(sur(600000, 6500000)), undefined).controle, 5);
  assert.equal(C.controlerCouche(null, {}).charge, false);
});

test('reprojeter est appelé même en EPSG:2154 ; pas appelé pour une couche vide ni refusée avant le 5', () => {
  let appels = 0;
  const s = { reprojeter: (e) => { appels++; return e; } };
  C.controlerCouche(geojson2154(sur(600000, 6500000)), s);
  assert.equal(appels, 1);
  C.controlerCouche(geojson2154(null, { nbEntites: 0 }), s);
  C.controlerCouche(geojson2154(sur(1, 1), { lisible: false }), s);
  assert.equal(appels, 1);
});

test('ordre : .prj absent prime sur « illisible » ; couche vide chargée avec avertissement', () => {
  const shp = { nom: 'FRT.shp', format: 'shp', fichiers: ['FRT.shp', 'FRT.shx', 'FRT.dbf'], lisible: false,
    systeme: { valide: false, epsg: 0 }, nbEntites: 0, emprise: null };
  const r = C.controlerCouche(shp, { reprojeter: identite });
  assert.equal(r.controle, 1);
  const vide = C.controlerCouche(geojson2154(null, { nbEntites: 0 }), { reprojeter: identite });
  assert.equal(vide.charge, true);
  assert.deepEqual(vide.avertissements, ['UG.geojson : couche vide']);
});

test('reprojeterEmprise : bords densifiés dans le système de la couche, min/max des points reprojetés', () => {
  const vus = [];
  // « reprojection » de test : x et y décalés ; un point du milieu fait une bosse, qu'un calcul sur les seuls coins raterait.
  const pt = (x, y, epsg) => { vus.push([x, y, epsg]); return { x: x + 1000, y: y + 1000 + (x === 5 && y === 0 ? 500 : 0) }; };
  const r = C.reprojeterEmprise({ xmin: 0, ymin: 0, xmax: 10, ymax: 10 }, 4326, pt);
  assert.deepEqual(r, { xmin: 1000, ymin: 1000, xmax: 1010, ymax: 1500 });
  assert.equal(vus.length, 80, '21 points par bord, coins partagés : 80 points');
  assert.ok(vus.every((v) => v[2] === 4326));
  assert.throws(() => C.reprojeterEmprise(null, 4326, pt));
  assert.throws(() => C.reprojeterEmprise({ xmin: 0, ymin: 0, xmax: NaN, ymax: 1 }, 4326, pt));
  assert.throws(() => C.reprojeterEmprise({ xmin: 0, ymin: 0, xmax: 1, ymax: 1 }, 4326, () => ({ x: Infinity, y: 0 })));
});

test('decrireEntree : nom avec extension, format, fichiers du même dossier seulement', () => {
  const d = L.decrireEntree('sous/Parcelles.SHP', ['sous/Parcelles.SHP', 'sous/Parcelles.prj', 'autre/Parcelles.dbf', 'UG.geojson']);
  assert.deepEqual(d, { nom: 'Parcelles.SHP', format: 'shp', fichiers: ['Parcelles.SHP', 'Parcelles.prj'] });
  assert.equal(L.decrireEntree('a.tiff', []).format, 'tif');
});

// ---------------------------------------------------------------- importerZip : ouvrir, contrôler, ajouter
const ID = '123e4567-e89b-42d3-a456-426614174000';
const zip = (noms) => ecrireZip(noms.map((n) => ({ nom: Buffer.from(n), donnees: Buffer.from('x'), stocke: true, utf8: true })));
function contexte(verdicts, extra = {}) {
  const stock = {};
  const journal = [];
  const ctx = {
    cerfId: ID, dossierProjet: '/storage/emulated/0/Projet', nomZip: 'essai.zip',
    octets: zip(['a.geojson', 'b.geojson']),
    reglages: { value: (k, d) => (k in stock ? stock[k] : d), setValue: (k, v) => { stock[k] = v; } },
    ouvrirCouche: (src, nom) => { journal.push('ouvrir ' + nom); return { isValid: true, nom }; },
    decrireCouche: (c) => ({ nom: 'x', cache: c.nom }),
    controlerCouche: (d) => { journal.push('controler ' + d.nom); return verdicts[d.nom]; },
    ajouterALaCarte: (c, nom) => { journal.push('ajouter ' + nom); },
    maintenant: () => new Date('2026-11-04T10:00:00Z'),
    ...extra,
  };
  return { ctx, stock, journal };
}

test('importerZip : ouvrir, contrôler, puis seulement ajouter et inscrire ; refusée = ni carte ni registre, la suivante est traitée', () => {
  const { ctx, stock, journal } = contexte({
    'a.geojson': { charge: false, controle: 5, message: 'a.geojson : Coordonnées incohérentes : système mal déclaré ?', avertissements: [] },
    'b.geojson': { charge: true, controle: null, message: null, avertissements: ['b.geojson : couche vide'] },
  });
  const r = L.importerZip(ctx);
  assert.deepEqual(journal, ['ouvrir a', 'controler a.geojson', 'ouvrir b', 'controler b.geojson', 'ajouter b']);
  assert.deepEqual(r.chargees.map((c) => c.couche), ['b']);
  assert.deepEqual(L.lireRegistre(ctx.reglages, ID).map((e) => e.couche), ['b']);
  assert.ok(Object.keys(stock).length > 0);
  const lignes = r.message.split('\n');
  assert.ok(lignes.includes('a.geojson : Coordonnées incohérentes : système mal déclaré ?'), r.message);
  assert.ok(lignes.includes('b.geojson : couche vide'), r.message);
  assert.deepEqual(r.avertissements, ['b.geojson : couche vide']);
});

test('importerZip : service de contrôle absent -> tout refusé, rien ouvert, rien inscrit', () => {
  for (const manquant of ['controlerCouche', 'decrireCouche', 'ouvrirCouche', 'ajouterALaCarte']) {
    const { ctx, journal } = contexte({});
    delete ctx[manquant];
    const r = L.importerZip(ctx);
    assert.deepEqual(r.chargees, [], manquant);
    assert.deepEqual(journal, [], manquant);
    assert.deepEqual(L.lireRegistre(ctx.reglages, ID), [], manquant);
    assert.match(r.message, /rien n'est importé/);
  }
});

test('importerZip : un contrôle qui lève, ou un verdict absent, vaut refus', () => {
  const ok = { charge: true, controle: null, message: null, avertissements: [] };
  const { ctx, journal } = contexte({ 'b.geojson': ok }, { controlerCouche: (d) => { if (d.nom === 'a.geojson') throw new Error('boum'); return ok; } });
  const r = L.importerZip(ctx);
  assert.deepEqual(r.chargees.map((c) => c.couche), ['b']);
  assert.match(r.message, /^a\.geojson : /m);
  assert.deepEqual(journal.filter((j) => j.startsWith('ajouter')), ['ajouter b']);
  const v = contexte({ 'a.geojson': undefined, 'b.geojson': undefined });
  assert.deepEqual(L.importerZip(v.ctx).chargees, []);
});

test('reimport : une couche acceptée puis refusée au réimport quitte le registre ; une couche absente du zip réimporté est retirée aussi (décision n° 8)', () => {
  const ok = { charge: true, controle: null, message: null, avertissements: [] };
  const refus = { charge: false, controle: 5, message: 'a.geojson : Coordonnées incohérentes : système mal déclaré ?', avertissements: [] };
  const premier = contexte({ 'a.geojson': ok, 'b.geojson': ok });
  L.importerZip(premier.ctx);
  assert.deepEqual(L.lireRegistre(premier.ctx.reglages, ID).map((e) => e.couche), ['a', 'b']);
  // Réimport du même nom : a est maintenant refusée, b reste acceptée.
  const second = { ...premier.ctx, controlerCouche: (d) => (d.nom === 'a.geojson' ? refus : ok) };
  const r = L.importerZip(second);
  assert.deepEqual(L.lireRegistre(second.reglages, ID).map((e) => e.couche), ['b']);
  assert.deepEqual(r.chargees.map((c) => c.couche), ['b']);
  // Couche qui n'est plus dans le zip réimporté : entrée retirée (décision n° 8 : le zip remplace l'ancien en entier).
  const troisieme = { ...premier.ctx, octets: zip(['b.geojson']), controlerCouche: () => ok };
  L.importerZip(troisieme);
  assert.deepEqual(L.lireRegistre(troisieme.reglages, ID).map((e) => e.couche), ['b']);
  const p2 = contexte({ 'a.geojson': ok, 'b.geojson': ok });
  L.importerZip(p2.ctx);
  L.importerZip({ ...p2.ctx, octets: zip(['b.geojson']) });
  assert.deepEqual(L.lireRegistre(p2.ctx.reglages, ID).map((e) => e.couche), ['b']);
  // Un autre zip n'est pas touché par le réimport de celui-ci.
  L.inscrire(p2.ctx.reglages, ID, { zip: 'autre.zip', couche: 'a', chemin_vsi: 'autre.zip/a.geojson', style: 'defaut', ajoutee_le: 'x' });
  L.importerZip({ ...p2.ctx, octets: zip(['b.geojson']) });
  assert.deepEqual(L.lireRegistre(p2.ctx.reglages, ID).map((e) => e.zip + '/' + e.couche), ['essai.zip/b', 'autre.zip/a']);
});

test('ouverture ratée : le contrôle passe quand même (lisible: false), message avec extension, sans erreur technique', () => {
  const vus = [];
  const { ctx } = contexte({}, {
    octets: zip(['UG.geojson']),
    ouvrirCouche: () => { throw new Error('GDAL: erreur interne /vsizip/x'); },
    controlerCouche: (d) => { vus.push(d); return C.controlerCouche(d, { reprojeter: identite }); },
  });
  const r = L.importerZip(ctx);
  assert.equal(vus.length, 1);
  assert.equal(vus[0].lisible, false);
  assert.equal(r.refusees[0].message, 'UG.geojson : illisible');
  assert.ok(r.message.split('\n').includes('UG.geojson : illisible'), r.message);
  assert.doesNotMatch(r.message, /GDAL|vsizip/);
  assert.deepEqual(L.lireRegistre(ctx.reglages, ID), []);
  // Ouverture qui rend une couche invalide : même chemin.
  const inv = contexte({}, { octets: zip(['UG.geojson']), ouvrirCouche: () => ({ isValid: false }),
    controlerCouche: (d) => C.controlerCouche(d, { reprojeter: identite }) });
  assert.equal(L.importerZip(inv.ctx).refusees[0].message, 'UG.geojson : illisible');
});

test('ouverture ratée d\'un Shapefile sans .prj : le contrôle 1 passe avant « illisible »', () => {
  const { ctx } = contexte({}, {
    octets: zip(['Parcelles.shp', 'Parcelles.shx', 'Parcelles.dbf']),
    ouvrirCouche: () => null,
    controlerCouche: (d) => C.controlerCouche(d, { reprojeter: identite }),
  });
  // Seuls les .geojson sont reconnus par couchesDuZip (mission 010) : sans couche, rien n'est ouvert.
  const r = L.importerZip(ctx);
  assert.deepEqual(r.chargees, []);
});

test('ajout à la carte impossible : nom avec extension, retiré du registre', () => {
  const ok = { charge: true, controle: null, message: null, avertissements: [] };
  const { ctx } = contexte({ 'a.geojson': ok, 'b.geojson': ok }, {
    ajouterALaCarte: (c, nom) => { if (nom === 'a') throw new Error('boum'); },
  });
  const r = L.importerZip(ctx);
  assert.ok(r.message.split('\n').includes('a.geojson : ajout à la carte impossible'), r.message);
  assert.deepEqual(L.lireRegistre(ctx.reglages, ID).map((e) => e.couche), ['b']);
});

test('système valide sans code EPSG (ESRI, IGNF) : accepté, l\'objet crs est transmis tel quel à la reprojection', () => {
  const crs = { objet: 'crs-de-la-couche' };
  let recu;
  const r = C.controlerCouche(
    geojson2154(sur(500000, 6500000), { systeme: { valide: true, epsg: 0, authid: 'IGNF:LAMB93', crs } }),
    { reprojeter: (e, epsg, c) => { recu = c; return { ...e }; } });
  assert.equal(r.charge, true);
  assert.equal(recu, crs);
  const pts = [];
  C.reprojeterEmprise({ xmin: 0, ymin: 0, xmax: 1, ymax: 1 }, 0, (x, y, epsg, c) => { pts.push(c); return { x, y }; }, crs);
  assert.ok(pts.length > 0 && pts.every((c) => c === crs));
});

test('empaquetage : cerf-controles.mjs est dans la liste des fichiers du plugin (sinon QField ne le trouve pas)', () => {
  assert.ok(FICHIERS_PLUGIN.includes('cerf-controles.mjs'));
  assert.match(readFileSync(resolve(ICI, '../plugin/Cerf.qml'), 'utf8'), /import "cerf-controles\.mjs" as Controles/);
});

test('importerZip : doublon de nom -> message commençant par l\'entrée avec son extension', () => {
  const ok = { charge: true, controle: null, message: null, avertissements: [] };
  const { ctx } = contexte({ 'a/UG.geojson': ok, 'b/UG.geojson': ok }, { octets: zip(['a/UG.geojson', 'b/UG.geojson']) });
  const r = L.importerZip(ctx);
  assert.ok(r.message.split('\n').some((l) => l.startsWith('b/UG.geojson : nom de couche en double')), r.message);
});

test('importerZip : zip réimporté sans aucune couche lisible -> import avorté, registre et carte intacts (décision n° 11)', () => {
  const ok = { charge: true, controle: null, message: null, avertissements: [] };
  const premier = contexte({ 'a.geojson': ok, 'b.geojson': ok });
  L.importerZip(premier.ctx);
  const avant = JSON.stringify(L.lireRegistre(premier.ctx.reglages, ID));
  const retraits = [];
  const r = L.importerZip({ ...premier.ctx, octets: zip(['lisez-moi.txt']), retirerDeLaCarte: (n) => retraits.push(n) });
  assert.equal(r.message, 'aucune couche lisible dans essai.zip, rien changé');
  assert.deepEqual(r.chargees, []);
  assert.equal(JSON.stringify(L.lireRegistre(premier.ctx.reglages, ID)), avant);
  assert.deepEqual(retraits, []);
  assert.equal(premier.journal.filter((j) => j.startsWith('ajouter')).length, 2);
});

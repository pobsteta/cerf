// SPDX-License-Identifier: GPL-3.0-or-later
// Mission 037 : la reprojection de l'emprise part d'un système reconstruit par son nom, et le refus 5 (et 3) porte une ligne de
// détail. Coordonnées : x = Est ou longitude, y = Nord ou latitude ; EPSG:4326 / CRS84 en degrés (lon, lat), EPSG:2154 en mètres (x, y).
// Sources lues le 4 novembre 2026 : QField v4.3.7 src/core/utils/qfgeometryutils.cpp l. 414-418 (reprojectPoint : `sourceCrs ==
// destinationCrs` rend le point), qfcoordinatereferencesystemutils.h l. 36 (fromDescription) ; QGIS 3a92eb3
// qgscoordinatetransform.cpp l. 303-306 (`!d->mIsValid` : le point est rendu tel quel) et qgscoordinatetransform_p.cpp l. 119-123
// et 143-146 (source invalide : pas de transformation), qgsmaplayer.h l. 564 (`Q_INVOKABLE virtual QgsRectangle extent() const`).
// Ces tests simulent QField avec des fausses fonctions : un vert ne prouve rien sur le Samsung.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from '../plugin/cerf-controles.mjs';
import * as L from '../plugin/cerf-logique.mjs';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (f) => readFileSync(resolve(RACINE, f), 'utf8');

// Lambert-93 (conique conforme, 2 parallèles) sur GRS80 : lat1 44, lat2 49, lat0 46.5, lon0 3, x0 700000, y0 6600000.
function lambert93(lon, lat) {
  if (!(Math.abs(lat) < 90) || !(Math.abs(lon) <= 360)) return null; // PROJ lève une QgsCsException
  const rad = Math.PI / 180; const e = Math.sqrt(0.00669438002290);
  const m = (p) => Math.cos(p) / Math.sqrt(1 - e * e * Math.sin(p) ** 2);
  const t = (p) => Math.tan(Math.PI / 4 - p / 2) / ((1 - e * Math.sin(p)) / (1 + e * Math.sin(p))) ** (e / 2);
  const p1 = 44 * rad; const p2 = 49 * rad; const p0 = 46.5 * rad;
  const n = (Math.log(m(p1)) - Math.log(m(p2))) / (Math.log(t(p1)) - Math.log(t(p2)));
  const F = m(p1) / (n * t(p1) ** n);
  const r0 = 6378137 * F * t(p0) ** n; const r = 6378137 * F * t(lat * rad) ** n;
  const th = n * (lon - 3) * rad;
  return { x: 700000 + r * Math.sin(th), y: 6600000 + r0 - r * Math.cos(th) };
}

test('banc : le Lambert-93 de ces tests place Paris à son endroit (652 469 ; 6 862 035, à 20 m)', () => {
  const p = lambert93(2.3522, 48.8566);
  assert.ok(Math.abs(p.x - 652469) < 20, String(p.x));
  assert.ok(Math.abs(p.y - 6862035) < 20, String(p.y));
});

// QField simulé. Un système est { authid, nom } ; « invalide » = authid vide. reprojectPoint imite QGIS : source invalide ou
// égale à la cible -> point rendu tel quel ; hors du domaine -> point vide ; sinon Lambert-93.
function qfield(journal) {
  const SYSTEMES = { 'OGC:CRS84': { authid: 'EPSG:4326' }, 'EPSG:4326': { authid: 'EPSG:4326' }, 'EPSG:2154': { authid: 'EPSG:2154' } };
  return {
    fromDescription: (d) => { journal.push(d); return SYSTEMES[d] || { authid: '' }; },
    reprojectPoint: (p, source, but) => {
      if (!source || source.authid === '' || source.authid === but.authid) return { x: p.x, y: p.y, isEmpty: () => false };
      const r = lambert93(p.x, p.y);
      return r ? { x: r.x, y: r.y, isEmpty: () => false } : { x: NaN, y: NaN, isEmpty: () => true };
    },
  };
}
// Ce que fait Cerf.qml : construireSource, puis reprojeterEmprise avec reprojeterPoint.
function service(qf) {
  const reprojeterPoint = (x, y, epsg, crs) => {
    const p = qf.reprojectPoint({ x, y }, crs, qf.fromDescription('EPSG:2154'));
    if (!p || p.isEmpty()) throw new Error('reprojection : point vide');
    return { x: Number(p.x), y: Number(p.y) };
  };
  return (emprise, epsg, crs, authid) => {
    const s = C.construireSource(authid, crs, qf.fromDescription);
    return C.reprojeterEmprise(emprise, epsg, reprojeterPoint, s.source);
  };
}
const FONTAINEBLEAU = { xmin: 2.649, ymin: 48.399, xmax: 2.670, ymax: 48.404 };
const couche = (authid, emprise, crs) => ({
  nom: 'UG.geojson', format: 'geojson', fichiers: ['UG.geojson'], lisible: true,
  systeme: { valide: true, epsg: authid === 'EPSG:2154' ? 2154 : 0, authid, crs }, nbEntites: 3, emprise,
});

// ---------- le chemin : fromDescription d'abord, l'objet de la couche en repli seulement ----------
test('chemin : fromDescription est appelé avec l\'authid, le système rendu sert de source', () => {
  const appels = []; const rendu = { authid: 'EPSG:4326' }; const crsCouche = { authid: 'x' };
  const r = C.construireSource('OGC:CRS84', crsCouche, (d) => { appels.push(d); return rendu; });
  assert.deepEqual(appels, ['OGC:CRS84']);
  assert.equal(r.source, rendu);
  assert.equal(r.via, 'authid');
});
test('chemin : l\'authid est rogné avant l\'appel', () => {
  const appels = [];
  C.construireSource('  EPSG:2154 ', {}, (d) => { appels.push(d); return { authid: 'EPSG:2154' }; });
  assert.deepEqual(appels, ['EPSG:2154']);
});
test('chemin : repli sur l\'objet de la couche seulement si authid vide (fromDescription non appelé)', () => {
  for (const vide of ['', '   ', undefined, null]) {
    const appels = []; const crsCouche = { authid: '', description: 'RGF93_Lambert_93' };
    const r = C.construireSource(vide, crsCouche, (d) => { appels.push(d); return { authid: 'EPSG:4326' }; });
    assert.equal(appels.length, 0);
    assert.equal(r.source, crsCouche);
    assert.equal(r.via, 'couche');
  }
});
test('chemin : repli si fromDescription rend un système vide (authid vide), rien, ou lève ; ou s\'il manque', () => {
  const crsCouche = { authid: 'EPSG:4326' };
  for (const f of [() => ({ authid: '' }), () => ({ authid: '  ' }), () => null, () => undefined, () => ({}), () => { throw new Error('API'); }, undefined]) {
    const r = C.construireSource('EPSG:4326', crsCouche, f);
    assert.equal(r.source, crsCouche);
    assert.equal(r.via, 'couche');
  }
});

// ---------- les cas du terrain ----------
test('GeoJSON CRS84 à Fontainebleau : chargé, même si l\'objet crs de la couche arrive invalide dans reprojectPoint', () => {
  const journal = [];
  const invalide = { authid: '' }; // l'hypothèse : QGIS rend les degrés tels quels
  const r = C.controlerAvecDetail(couche('OGC:CRS84', FONTAINEBLEAU, invalide), { reprojeter: service(qfield(journal)) });
  assert.equal(r.charge, true);
  assert.equal(r.message, null);
  assert.ok(journal.includes('OGC:CRS84'), 'le système est construit par son nom');
});
test('contre-épreuve : sans la reconstruction par le nom, l\'objet invalide donnerait des degrés et le refus 5 (l\'hypothèse)', () => {
  const qf = qfield([]);
  const ancien = (emprise, epsg, crs) => C.reprojeterEmprise(emprise, epsg,
    (x, y) => { const p = qf.reprojectPoint({ x, y }, crs, { authid: 'EPSG:2154' }); return { x: p.x, y: p.y }; }, crs);
  const r = C.controlerCouche(couche('OGC:CRS84', FONTAINEBLEAU, { authid: '' }), { reprojeter: ancien });
  assert.equal(r.charge, false);
  assert.equal(r.controle, 5);
});
test('GeoJSON CRS84 à Fontainebleau : l\'emprise reprojetée est à l\'endroit attendu (Lambert-93, entre 670 000 et 680 000 ; 6 805 000 et 6 818 000)', () => {
  const e = service(qfield([]))(FONTAINEBLEAU, 0, { authid: '' }, 'OGC:CRS84');
  assert.ok(e.xmin > 670000 && e.xmax < 680000, JSON.stringify(e));
  assert.ok(e.ymin > 6805000 && e.ymax < 6818000, JSON.stringify(e));
  const p = lambert93(2.65, 48.4);
  assert.ok(e.xmin < p.x && p.x < e.xmax && e.ymin < p.y && p.y < e.ymax);
});
test('GeoJSON en Lambert 93 SANS crs (lu en WGS84, mètres pris pour des degrés) : refusé au contrôle 5, avec détail', () => {
  const r = C.controlerAvecDetail(couche('EPSG:4326', { xmin: 656000, ymin: 6794000, xmax: 657000, ymax: 6795000 }, { authid: 'EPSG:4326' }),
    { reprojeter: service(qfield([])) });
  assert.equal(r.charge, false);
  assert.equal(r.controle, 5);
  assert.equal(r.message.split('\n')[0], 'UG.geojson : ' + C.MESSAGE_INCOHERENT);
  assert.match(r.message.split('\n')[1], /^ {2}détail : EPSG:4326, emprise 656000 6794000 657000 6795000 → erreur : /);
});
test('GeoJSON Lambert 93 déclaré (EPSG:2154) à Fontainebleau : chargé', () => {
  const p = lambert93(2.65, 48.4);
  const e = { xmin: p.x - 500, ymin: p.y - 500, xmax: p.x + 500, ymax: p.y + 500 };
  assert.equal(C.controlerAvecDetail(couche('EPSG:2154', e, { authid: 'EPSG:2154' }), { reprojeter: service(qfield([])) }).charge, true);
});
test('Lambert 93 lu à tort en WGS84 mais avec latitude plausible : refus 5 aussi (points hors rectangle)', () => {
  // x = 3 (degrés), y = 6 800 000 : latitude impossible -> PROJ lève -> point vide -> refus.
  const r = C.controlerAvecDetail(couche('EPSG:4326', { xmin: 3, ymin: 6800000, xmax: 4, ymax: 6800100 }, {}), { reprojeter: service(qfield([])) });
  assert.equal(r.controle, 5);
});

// ---------- la ligne de détail ----------
const MSG = 'UG.geojson : ' + C.MESSAGE_INCOHERENT;
test('détail : hors du rectangle -> authid, emprise d\'origine, emprise reprojetée', () => {
  const r = C.controlerAvecDetail(couche('OGC:CRS84', FONTAINEBLEAU, {}), { reprojeter: () => ({ xmin: 1.3, ymin: 2.4, xmax: 1.5, ymax: 2.6 }) });
  assert.equal(r.message, MSG + '\n  détail : OGC:CRS84, emprise 2.649 48.399 2.670 48.404 → 1.300 2.400 1.500 2.600 (hors du rectangle)');
});
test('détail : erreur de reprojection -> le message de l\'erreur, sans « hors du rectangle »', () => {
  const r = C.controlerAvecDetail(couche('EPSG:4326', FONTAINEBLEAU, {}), { reprojeter: () => { throw new Error('reprojection : point vide'); } });
  assert.equal(r.message, MSG + '\n  détail : EPSG:4326, emprise 2.649 48.399 2.670 48.404 → erreur : reprojection : point vide');
  assert.doesNotMatch(r.message, /hors du rectangle/);
});
test('détail : emprise absente ou NaN dite telle quelle ; résultat invalide jamais dit « hors du rectangle »', () => {
  const a = C.controlerAvecDetail(couche('OGC:CRS84', null, {}), { reprojeter: (e) => C.reprojeterEmprise(e, 0, () => ({ x: 1, y: 1 })) });
  assert.equal(a.message, MSG + '\n  détail : OGC:CRS84, emprise absente → erreur : emprise absente ou non finie');
  const n = C.controlerAvecDetail(couche('OGC:CRS84', { xmin: NaN, ymin: 1, xmax: 2, ymax: 3 }, {}), { reprojeter: () => null });
  assert.equal(n.message, MSG + '\n  détail : OGC:CRS84, emprise NaN 1.000 2.000 3.000 → résultat absent');
  const i = C.controlerAvecDetail(couche('OGC:CRS84', FONTAINEBLEAU, {}), { reprojeter: () => ({ xmin: NaN, ymin: 1, xmax: 2, ymax: 3 }) });
  assert.match(i.message, /→ NaN 1\.000 2\.000 3\.000 \(valeurs invalides\)$/);
  assert.doesNotMatch(i.message, /hors du rectangle/);
});
test('détail : en mètres, nombres entiers ; authid vide dit « (authid vide) »', () => {
  const r = C.controlerAvecDetail(couche('', { xmin: 656000.4, ymin: 6794000.6, xmax: 657000, ymax: 6795000 }, {}), { reprojeter: () => ({ xmin: 5, ymin: 5, xmax: 6, ymax: 6 }) });
  assert.match(r.message, /\n {2}détail : \(authid vide\), emprise 656000 6794001 657000 6795000 → /);
});
test('détail : le message de la spec § 4 est inchangé (1re ligne), le détail est sur une seule ligne à part', () => {
  const r = C.controlerAvecDetail(couche('OGC:CRS84', FONTAINEBLEAU, {}), { reprojeter: () => null });
  const lignes = r.message.split('\n');
  assert.equal(lignes.length, 2);
  assert.equal(lignes[0], MSG);
  assert.ok(lignes[1].startsWith('  détail : '));
});
test('détail : contrôle 3 -> système lu ; le verdict de controlerCouche garde sa forme et son texte', () => {
  const d = { ...couche('', FONTAINEBLEAU, {}), systeme: { valide: false, epsg: 0, authid: '' } };
  const r = C.controlerAvecDetail(d, { reprojeter: () => assert.fail('pas de reprojection au contrôle 3') });
  assert.equal(r.controle, 3);
  assert.equal(r.message, 'UG.geojson : système de coordonnées inconnu\n  détail : système lu : (authid vide)');
  const nu = C.controlerCouche(d, {});
  assert.deepEqual(Object.keys(nu).sort(), ['avertissements', 'charge', 'controle', 'message']);
  assert.equal(nu.message, 'UG.geojson : système de coordonnées inconnu');
});
test('détail : jamais sur une couche chargée, ni sur un refus d\'un autre contrôle', () => {
  assert.equal(C.controlerAvecDetail(couche('EPSG:2154', { xmin: 656000, ymin: 6794000, xmax: 657000, ymax: 6795000 }, {}), { reprojeter: (e) => ({ ...e }) }).message, null);
  const r = C.controlerAvecDetail({ ...couche('EPSG:2154', FONTAINEBLEAU, {}), lisible: false }, {});
  assert.equal(r.message, 'UG.geojson : illisible');
});
test('détail : un service de détail qui lève ne change pas le verdict', () => {
  const r = C.controlerCouche(couche('OGC:CRS84', FONTAINEBLEAU, {}), { reprojeter: () => null, detail: () => { throw new Error('x'); } });
  assert.equal(r.controle, 5);
});
test('rectangle de vraisemblance inchangé', () => {
  assert.deepEqual(C.EMPRISE_VRAISEMBLANCE, { xmin: 89101, xmax: 1252436, ymin: 6036555, ymax: 7120480 });
});

// ---------- lecture de l'emprise : extent est une méthode (qgsmaplayer.h l. 564) ----------
test('lireEmprise : extent() méthode (cas de QGIS), extent propriété, et rien d\'utilisable -> NaN ou exception', () => {
  const rect = { xMinimum: 1, yMinimum: 2, xMaximum: 3, yMaximum: 4 };
  const attendu = { xmin: 1, ymin: 2, xmax: 3, ymax: 4 };
  assert.deepEqual(L.lireEmprise({ extent() { return rect; } }), attendu);
  assert.deepEqual(L.lireEmprise({ extent: rect }), attendu);
  const methodeSeule = { extent() { return this === methodeSeule ? rect : null; } };
  assert.deepEqual(L.lireEmprise(methodeSeule), attendu, 'appelée sur la couche (this)');
  assert.throws(() => L.lireEmprise({}));
  assert.ok(Number.isNaN(L.lireEmprise({ extent: {} }).xmin));
});

// ---------- branchement ----------
test('branchement : Cerf.qml passe par construireSource, controlerAvecDetail et lireEmprise, pas par couche.extent sans parenthèses', () => {
  const qml = lire('plugin/Cerf.qml');
  assert.match(qml, /Controles\.construireSource\(authid, crs, function \(d\) \{ return CoordinateReferenceSystemUtils\.fromDescription\(d\); \}\)/);
  assert.match(qml, /Controles\.controlerAvecDetail\(description/);
  assert.match(qml, /Logique\.lireEmprise\(couche\)/);
  assert.doesNotMatch(qml, /couche\.extent\b(?!\()/);
});
test('forme : cerf-controles.mjs sans ?., ?? ni import', () => {
  const code = lire('plugin/cerf-controles.mjs').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  assert.doesNotMatch(code, /\?\./); assert.doesNotMatch(code, /\?\?/); assert.doesNotMatch(code, /^\s*import\s/m);
});
test('version et préversion : 0.4.0, branche de la mission 037 dans release-plugin.yml', () => {
  assert.equal(L.VERSION, '0.4.0');
  assert.match(lire('plugin/metadata.txt'), /^version=0\.4\.0$/m);
  assert.match(lire('.github/workflows/release-plugin.yml'), /'mission\/037-reprojection'/);
});

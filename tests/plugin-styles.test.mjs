// SPDX-License-Identifier: GPL-3.0-or-later
// Mission 010 : tests du dev pour ce que la mission branche dans le plugin (importerZip,
// demarrerProjet, couchesDuZip, estGeoJson, trouverQmlDeTable) selon l'ADR 0008 : réécriture par
// saveVectorLayerAs, .qml écrit à côté avant le chargement de la copie. Les règles elles-mêmes sont
// testées par tests/styles.test.mjs (testeur). L'API de QField est simulée : ces tests ne
// prouvent RIEN sur l'affichage des couleurs, que seul le Samsung peut montrer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ecrireZip } from './recette/essai/zip-ecrire.mjs';
import * as L from '../plugin/vision-logique.mjs';
import * as S from '../plugin/vision-styles.mjs';

const ID = 'd98bf4b8-0fac-4dac-85cf-58e6701aceeb';
const PROJET = '/storage/emulated/0/Android/data/ch.opengis.qfield/files/Imported Projects/Serre';
const GJ = '{"type":"FeatureCollection","features":[]}';
const zipDe = (...noms) => ecrireZip(noms.map((nom) => ({ nom: Buffer.from(nom, 'utf8'), donnees: Buffer.from(GJ), stocke: false, utf8: true })));

function reglages() {
  const m = new Map();
  return { m, value: (k, d) => (m.has(k) ? m.get(k) : d), setValue: (k, v) => m.set(k, v) };
}

// L'API de QField est simulée : `journal` garde l'ordre des appels. La couche ouverte en /vsizip/ et
// sa copie portent le même nom ; la géométrie et les champs viennent d'une table par nom de couche.
const COPIES = `${PROJET}/vision-imports`;
function monde({ infos = {}, textes = {}, rendu = null, ecrit = true, existants = [], effacementRate = false, ecritureInterrompue = false } = {}) {
  const journal = [];
  const sur_disque = new Set(existants);
  const ecrits = [];
  const effaces = [];
  const reecrites = [];
  const ctx = {
    visionId: ID, dossierProjet: PROJET, nomZip: 'x.zip', reglages: reglages(),
    maintenant: () => new Date('2026-11-04T10:00:00Z'),
    ouvrirCouche: (source, nom) => { journal.push('ouvrir ' + source); return { source, name: nom, isValid: true, readOnly: false }; },
    decrireCouche: () => ({ lisible: true }),
    controlerCouche: (d) => { journal.push('controler ' + d.nom); return { charge: true, avertissements: [] }; },
    reecrireCouche: (couche, cible) => { journal.push('reecrire ' + cible); reecrites.push({ source: couche.source, cible }); return rendu === null ? cible : rendu; },
    ecrireFichier: (chemin, texte) => {
      journal.push('ecrire ' + chemin); ecrits.push({ chemin, texte });
      if (ecrit || ecritureInterrompue) sur_disque.add(chemin); // interrompue : un fichier tronqué reste
      return ecrit;
    },
    existe: (chemin) => sur_disque.has(chemin),
    effacerFichier: (chemin) => { journal.push('effacer ' + chemin); effaces.push(chemin); if (effacementRate) return false; sur_disque.delete(chemin); return true; },
    ajouterALaCarte: (couche, nom, source, zip) => { journal.push('ajouter ' + source); },
    styles: S,
    infosCouche: (couche) => infos[couche.name] || { geometrie: 'polygone', champs: [] },
    lireTexte: (zip, chemin) => (Object.prototype.hasOwnProperty.call(textes, chemin) ? textes[chemin] : null),
  };
  return { ctx, journal, ecrits, effaces, reecrites, sur_disque };
}
const QML_ZIP = '<!DOCTYPE qgis PUBLIC \'http://mrcc.com/qgis.dtd\' \'SYSTEM\'>\n<qgis version="3.34"><renderer-v2 type="singleSymbol"/></qgis>';

test('couchesDuZip : un .json est retenu et marqué json ; .geojson sans marque json (champs format et nom de la mission 024)', () => {
  assert.deepEqual(L.couchesDuZip(['a.geojson', 'd/b.JSON', 'c.txt']), [
    { couche: 'a', entree: 'a.geojson', nom: 'a.geojson', format: 'geojson' },
    { couche: 'b', entree: 'd/b.JSON', nom: 'd/b.JSON', format: 'geojson', json: true },
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

test('importerZip : un .json GeoJSON est chargé ; un .json qui n\'en est pas est écarté avec sa ligne (plus de silence, mission 044)', () => {
  const { ctx } = monde({ textes: { 'p.json': GJ, 'config.json': '{"a":1}' } });
  ctx.octets = zipDe('p.json', 'config.json');
  const r = L.importerZip(ctx);
  assert.deepEqual(r.chargees.map((c) => c.couche), ['p']);
  assert.deepEqual(r.refusees, []);
  // Mission 044 : écarté avec la ligne, ni chargé ni refusé.
  assert.deepEqual(r.message.split('\n').filter((l) => l.includes('config')), ['config.json : pas une couche GeoJSON, ignoré']);
});

test('importerZip : zip avec seulement un .json non GeoJSON -> « Aucune couche » puis la ligne d\'écart, aucun refus', () => {
  const { ctx } = monde({ textes: { 'config.json': '{"a":1}' } });
  ctx.octets = zipDe('config.json');
  const r = L.importerZip(ctx);
  assert.equal(r.chargees.length, 0);
  // Mission 024 : le message nomme les quatre formats lus.
  assert.match(r.message, /^Aucune couche GeoJSON, Shapefile, GeoPackage ou GeoTIFF dans x\.zip\./);
});

test('importerZip : contenu du .json illisible (lireTexte rend null) -> chargement tenté, jamais écarté en silence', () => {
  const { ctx } = monde();
  ctx.octets = zipDe('p.json');
  const r = L.importerZip(ctx);
  assert.deepEqual(r.chargees.map((c) => c.couche), ['p']);
});

// ---------------------------------------------------------------- ADR 0008 : réécrire, écrire le .qml, charger la copie
const ecritSur = (w, nom) => w.ecrits.find((e) => e.chemin.endsWith('/' + nom));

test('ordre (ADR 0008) : ouvrir en /vsizip/, contrôler, réécrire, écrire le .qml, charger la copie, ajouter à la carte', () => {
  const { ctx, journal } = monde({ infos: { UG: { geometrie: 'polygone', champs: ['code_ug'] } } });
  ctx.octets = zipDe('UG.geojson');
  L.importerZip(ctx);
  assert.deepEqual(journal, [
    `ouvrir /vsizip/${COPIES}/x.zip/UG.geojson`,
    'controler UG.geojson',
    `reecrire ${COPIES}/x/UG.gpkg`,
    `ecrire ${COPIES}/x/UG.qml`,
    `ouvrir ${COPIES}/x/UG.gpkg|layername=UG`,
    `ajouter ${COPIES}/x/UG.gpkg`,
  ]);
});

test('importerZip : la copie chargée est en lecture seule, le registre garde le zip et le chemin de la copie', () => {
  const w = monde({ infos: { UG: { geometrie: 'polygone', champs: ['id', 'code_ug'] } } });
  w.ctx.octets = zipDe('UG.geojson');
  let posee = null;
  w.ctx.ajouterALaCarte = (couche, nom, source, zip) => { posee = { couche, nom, source, zip }; };
  const r = L.importerZip(w.ctx);
  assert.equal(posee.couche.readOnly, true);
  assert.equal(posee.couche.source, `${COPIES}/x/UG.gpkg|layername=UG`);
  assert.equal(posee.zip, 'x.zip', 'le zip est donné à la carte (la source n\'est plus en /vsizip/)');
  assert.deepEqual(L.lireRegistre(w.ctx.reglages, ID), [
    { zip: 'x.zip', couche: 'UG', chemin: 'x/UG.gpkg', style: 'UG', ajoutee_le: '2026-11-04T10:00:00.000Z' },
  ]);
  assert.equal(r.chargees[0].style, 'UG');
});

test('.qml de la règle UG : contour #0000FF 0,6 mm sans remplissage, étiquette sur le champ réel, 10 pt #0000FF', () => {
  const w = monde({ infos: { UG: { geometrie: 'polygone', champs: ['id', 'Code_UG'] } } });
  w.ctx.octets = zipDe('UG.geojson');
  L.importerZip(w.ctx);
  const q = ecritSur(w, 'UG.qml').texte;
  assert.ok(S.qmlValide(q), 'le .qml produit passe le contrôle du .qml du zip');
  assert.match(q, /name="outline_color" value="0,0,255,255"/);
  assert.match(q, /name="outline_width" value="0.6"/);
  assert.match(q, /name="style" value="no"/);
  assert.match(q, /fieldName="Code_UG" isExpression="0" fontSize="10" fontSizeUnit="Point" textColor="0,0,255,255"/);
});

test('.qml des règles Parcelles et FRT : couleurs et tailles du mail de JFC', () => {
  const w = monde({ infos: { Parcelles: { geometrie: 'polygone', champs: ['CODE_PARC'] }, FRT: { geometrie: 'polygone', champs: [] } } });
  w.ctx.octets = zipDe('Parcelles.geojson', 'FRT.geojson');
  L.importerZip(w.ctx);
  const p = ecritSur(w, 'Parcelles.qml').texte;
  assert.match(p, /name="outline_color" value="255,140,0,255"/);
  assert.match(p, /name="outline_width" value="1"/);
  assert.match(p, /fontSize="15" fontSizeUnit="Point" textColor="255,140,0,255"/);
  const f = ecritSur(w, 'FRT.qml').texte;
  assert.match(f, /name="outline_color" value="0,139,139,255"/);
  assert.match(f, /fieldName="CODE_FRT"/, 'champ de code introuvable : nom provisoire');
  assert.match(f, /fontSize="10" fontSizeUnit="Point" textColor="0,139,139,255"/);
});

test('.qml de ProdBois : cercle noir plein 2 mm, étiquette en expression avec les noms réels, 8 pt, liseré blanc', () => {
  const w = monde({ infos: { releves: { geometrie: 'point', champs: ['ESSENCE', 'Diamètre'] } } });
  w.ctx.octets = zipDe('releves.geojson');
  const r = L.importerZip(w.ctx);
  const q = ecritSur(w, 'releves.qml').texte;
  assert.match(q, /class="SimpleMarker"/);
  assert.match(q, /name="size" value="2"/);
  assert.match(q, /name="color" value="0,0,0,255"/);
  assert.match(q, /fieldName="&quot;ESSENCE&quot; \|\| '\\n' \|\| &quot;Diamètre&quot;" isExpression="1" fontSize="8"/);
  assert.match(q, /bufferDraw="1" bufferSize="1" bufferSizeUnits="MM" bufferColor="255,255,255,255"/);
  assert.deepEqual(r.avertissements, []);
});

test('.qml du zip valide : écrit tel quel à côté de la copie (la règle par nom n\'est pas utilisée), chemin inscrit', () => {
  const w = monde({ textes: { 'd/UG.qml': QML_ZIP } });
  w.ctx.octets = zipDe('d/UG.geojson', 'd/UG.qml', 'd/UG.qmd');
  const r = L.importerZip(w.ctx);
  assert.deepEqual(w.ecrits, [{ chemin: `${COPIES}/x/UG.qml`, texte: QML_ZIP }]);
  assert.deepEqual(r.avertissements, []);
  const e = L.lireRegistre(w.ctx.reglages, ID)[0];
  assert.equal(e.style, 'qml');
  assert.equal(e.qml, 'd/UG.qml');
});

test('.qml du zip contrôlé avant d\'être écrit : vide, pas du XML, mauvaise racine, sans renderer-v2 -> règle par nom + avertissement', () => {
  const mauvais = [
    '  ',
    'pas du qml',
    '<html><renderer-v2/></html>',
    '<qgis version="3"><labeling/></qgis>',
    '<qgis version="3"><renderer-v2/>',
    '<script>alert(1)</script><qgis><renderer-v2/></qgis>',
  ];
  for (const texte of mauvais) {
    const w = monde({ textes: { 'UG.qml': texte } });
    w.ctx.octets = zipDe('UG.geojson', 'UG.qml');
    const r = L.importerZip(w.ctx);
    assert.equal(w.ecrits.length, 1, JSON.stringify(texte));
    assert.notEqual(w.ecrits[0].texte, texte, JSON.stringify(texte) + ' : le .qml du zip ne doit pas être écrit');
    assert.match(w.ecrits[0].texte, /name="outline_color" value="0,0,255,255"/);
    assert.deepEqual(r.avertissements, ['UG.geojson : .qml illisible, style du manuel appliqué'], JSON.stringify(texte));
    assert.equal(L.lireRegistre(w.ctx.reglages, ID)[0].style, 'UG');
  }
});

test('qmlValide : accepte un style QGIS avec prologue, DOCTYPE et BOM ; refuse le reste', () => {
  assert.equal(S.qmlValide(QML_ZIP), true);
  assert.equal(S.qmlValide('﻿<?xml version="1.0"?>\n<qgis><renderer-v2/></qgis>\n'), true);
  assert.equal(S.qmlValide('<qgis><renderer-v2/></qgis> suite'), false);
  assert.equal(S.qmlValide(null), false);
  assert.equal(S.qmlValide(undefined), false);
});

test('qmlDe : nul pour un style nul ou une géométrie non prise en charge ; échappe les guillemets de l\'expression', () => {
  assert.equal(S.qmlDe(null, 'polygone'), null);
  assert.equal(S.qmlDe(S.styleDe('UG', {}), 'ligne'), null);
  assert.equal(S.qmlDe(S.styleDe('UG', {}), null), null);
  assert.ok(S.qmlValide(S.qmlDe(S.styleDe('ProdBois', {}), 'point')));
  assert.ok(!S.qmlDe(S.styleDe('ProdBois', {}), 'point').includes('fieldName=""essence'), 'guillemets échappés');
});

test('couche sans règle (nom quelconque) : copie chargée avec le style par défaut, aucun .qml écrit, registre « defaut »', () => {
  const w = monde({ infos: { zones: { geometrie: 'polygone', champs: ['id'] } } });
  w.ctx.octets = zipDe('zones.geojson');
  const r = L.importerZip(w.ctx);
  assert.deepEqual(w.ecrits, []);
  assert.equal(r.chargees.length, 1);
  assert.equal(L.lireRegistre(w.ctx.reglages, ID)[0].style, 'defaut');
});

test('réimport sans .qml à écrire : le .qml resté d\'un import précédent est effacé (il s\'appliquerait à la copie)', () => {
  const w = monde({ infos: { zones: { geometrie: 'polygone', champs: [] } }, existants: [`${COPIES}/x/zones.qml`] });
  w.ctx.octets = zipDe('zones.geojson');
  L.importerZip(w.ctx);
  assert.deepEqual(w.effaces, [`${COPIES}/x/zones.qml`]);
});

test('point nommé UG sans essence/diametre : défaut, aucun .qml, avertissement préfixé « dossier/UG.geojson : » (spec § 4, chemin complet, mission 024)', () => {
  const w = monde({ infos: { UG: { geometrie: 'point', champs: ['id'] } } });
  w.ctx.octets = zipDe('dossier/UG.geojson');
  const r = L.importerZip(w.ctx);
  assert.deepEqual(w.ecrits, []);
  assert.deepEqual(r.avertissements, ['dossier/UG.geojson : nom reconnu mais pas un polygone']);
  assert.ok(r.message.split('\n').includes('dossier/UG.geojson : nom reconnu mais pas un polygone'), r.message);
  assert.equal(L.lireRegistre(w.ctx.reglages, ID)[0].style, 'defaut');
});

test('saveVectorLayerAs rend une chaîne vide : couche refusée, message préfixé du chemin complet dans le zip, ni .qml, ni carte, ni registre', () => {
  const w = monde({ rendu: '' });
  w.ctx.octets = zipDe('d/UG.geojson');
  const r = L.importerZip(w.ctx);
  assert.deepEqual(r.chargees, []);
  assert.equal(r.refusees.length, 1);
  assert.match(r.refusees[0].message, /^d\/UG\.geojson : copie impossible/);
  assert.ok(r.message.split('\n').some((l) => l.startsWith('d/UG.geojson : copie impossible')), r.message);
  assert.deepEqual(w.ecrits, []);
  assert.ok(!w.journal.some((l) => l.startsWith('ajouter')));
  assert.deepEqual(L.lireRegistre(w.ctx.reglages, ID), []);
});

test('saveVectorLayerAs qui lève ou rend un chemin hors de vision-imports/ : refus, copie non chargée', () => {
  const w1 = monde();
  w1.ctx.octets = zipDe('UG.geojson');
  w1.ctx.reecrireCouche = () => { throw new Error('GDAL'); };
  assert.match(L.importerZip(w1.ctx).refusees[0].message, /^UG\.geojson : copie impossible/);
  for (const dehors of ['/sdcard/Download/UG.gpkg', `${COPIES}/../UG.gpkg`, `${COPIES}/x/UG.shp`, `${COPIES}/UG.gpkg`, `${COPIES}/x/sous/UG.gpkg`]) {
    const w = monde({ rendu: dehors });
    w.ctx.octets = zipDe('UG.geojson');
    const r = L.importerZip(w.ctx);
    assert.deepEqual(r.chargees, [], dehors);
    assert.match(r.refusees[0].message, /^UG\.geojson : copie écrite hors de vision-imports\//, dehors);
    assert.deepEqual(w.ecrits, [], dehors);
    assert.deepEqual(L.lireRegistre(w.ctx.reglages, ID), [], dehors);
  }
});

test('garde d\'écriture : ni saveVectorLayerAs ni le .qml pour un nom de couche douteux (« | », « \\ », contrôle)', () => {
  for (const nom of ['a|b', 'a\\b', 'a\u0001b']) {
    const w = monde();
    w.ctx.octets = zipDe(`${nom}.geojson`);
    const r = L.importerZip(w.ctx);
    assert.deepEqual(r.chargees, [], JSON.stringify(nom));
    assert.deepEqual(w.reecrites, [], JSON.stringify(nom));
    assert.deepEqual(w.ecrits, [], JSON.stringify(nom));
    assert.equal(r.refusees.length, 1, JSON.stringify(nom));
  }
});

test('peutEcrireCopie : seul un .gpkg ou un .qml directement dans vision-imports/<dossier du zip>/', () => {
  const D = COPIES;
  for (const ok of [`${D}/x/UG.gpkg`, `${D}/x/UG.qml`, `${D}/x/Étang du Nord.gpkg`]) assert.equal(L.peutEcrireCopie(ok, D), true, ok);
  for (const non of [
    `${D}/x.zip`, `${D}/x/UG.shp`, `${D}/x/UG.gpkg-wal`, `${D}/UG.gpkg`, `${D}/x/y/UG.gpkg`, `${D}/x.zip/UG.gpkg`,
    `${D}/../UG.gpkg`, `${D}/x/../UG.gpkg`, `${D}//UG.gpkg`, `${D}/x/.gpkg`, `${D}/x/a|b.gpkg`, `${D}/x\\UG.gpkg`,
    '/sdcard/UG.gpkg', `${PROJET}/UG.gpkg`, '', null, undefined, 3,
  ]) assert.equal(L.peutEcrireCopie(non, D), false, String(non));
  assert.equal(L.peutEcrireCopie(`${D}/x/UG.gpkg`, '/vision-imports'), false, 'dossier des copies sous la racine');
  assert.equal(L.peutEcrireCopie(`${D}/x/UG.gpkg`, `${PROJET}`), false, 'dossier qui n\'est pas vision-imports');
  assert.equal(L.peutEcrireCopie(`${D}/x/UG.gpkg`, ''), false);
});

test('le .qml n\'est pas écrit si la copie n\'a pas pu être faite ; il l\'est avant le chargement de la copie, jamais après', () => {
  const w = monde({ infos: { UG: { geometrie: 'polygone', champs: [] } } });
  w.ctx.octets = zipDe('UG.geojson');
  L.importerZip(w.ctx);
  const iEcrire = w.journal.findIndex((l) => l.startsWith('ecrire '));
  const iCopie = w.journal.findIndex((l) => l.startsWith('ouvrir ') && l.includes('|layername='));
  assert.ok(iEcrire >= 0 && iCopie > iEcrire, w.journal.join('\n'));
});

test('contrôle refusé (012) : rien n\'est réécrit ni écrit', () => {
  const w = monde();
  w.ctx.octets = zipDe('UG.geojson');
  w.ctx.controlerCouche = () => ({ charge: false, message: 'UG.geojson : Coordonnées incohérentes' });
  const r = L.importerZip(w.ctx);
  assert.deepEqual(w.reecrites, []);
  assert.deepEqual(w.ecrits, []);
  assert.equal(r.refusees[0].message, 'UG.geojson : Coordonnées incohérentes');
});

test('écriture du .qml impossible : la copie est chargée sans les couleurs, et on le dit (style « defaut » au registre)', () => {
  const w = monde({ ecrit: false, infos: { UG: { geometrie: 'polygone', champs: [] } } });
  w.ctx.octets = zipDe('UG.geojson');
  const r = L.importerZip(w.ctx);
  assert.equal(r.chargees.length, 1);
  assert.deepEqual(r.avertissements, ['UG.geojson : style non écrit, couche chargée avec le style par défaut']);
  assert.equal(L.lireRegistre(w.ctx.reglages, ID)[0].style, 'defaut');
});

const QML_UG = `${COPIES}/x/UG.qml`;
const UG = { UG: { geometrie: 'polygone', champs: [] } };

test('ancien .qml présent puis écriture réussie : effacé AVANT l\'écriture, le nouveau est en place, style du manuel', () => {
  const w = monde({ infos: UG, existants: [QML_UG] });
  w.ctx.octets = zipDe('UG.geojson');
  const r = L.importerZip(w.ctx);
  const i = w.journal.indexOf('effacer ' + QML_UG);
  assert.ok(i >= 0 && w.journal.indexOf('ecrire ' + QML_UG) > i, w.journal.join('\n'));
  assert.deepEqual(w.effaces, [QML_UG]);
  assert.equal(w.sur_disque.has(QML_UG), true);
  assert.equal(ecritSur(w, 'UG.qml').texte.includes('<renderer-v2'), true);
  assert.equal(r.chargees.length, 1);
  assert.deepEqual(r.avertissements, []);
  assert.equal(L.lireRegistre(w.ctx.reglages, ID)[0].style, 'UG');
});

test('ancien .qml présent puis écriture ratée : « style par défaut » dit, aucun .qml ne reste', () => {
  const w = monde({ infos: UG, existants: [QML_UG], ecrit: false });
  w.ctx.octets = zipDe('UG.geojson');
  const r = L.importerZip(w.ctx);
  assert.equal(r.chargees.length, 1);
  assert.deepEqual(r.avertissements, ['UG.geojson : style non écrit, couche chargée avec le style par défaut']);
  assert.match(r.message, /style par défaut/);
  assert.equal(w.sur_disque.has(QML_UG), false);
  assert.equal(L.lireRegistre(w.ctx.reglages, ID)[0].style, 'defaut');
});

test('écriture interrompue (fichier tronqué laissé) : le .qml tronqué est effacé, style par défaut dit', () => {
  const w = monde({ infos: UG, ecrit: false, ecritureInterrompue: true });
  w.ctx.octets = zipDe('UG.geojson');
  const r = L.importerZip(w.ctx);
  assert.equal(r.chargees.length, 1);
  assert.deepEqual(r.avertissements, ['UG.geojson : style non écrit, couche chargée avec le style par défaut']);
  assert.deepEqual(w.effaces, [QML_UG]);
  assert.equal(w.sur_disque.has(QML_UG), false);
  assert.equal(L.lireRegistre(w.ctx.reglages, ID)[0].style, 'defaut');
});

test('écriture qui lève après avoir laissé un fichier : effacé, style par défaut dit', () => {
  const w = monde({ infos: UG });
  const ecrire = w.ctx.ecrireFichier;
  w.ctx.ecrireFichier = (c, t) => { ecrire(c, t); throw new Error('disque plein'); };
  w.ctx.octets = zipDe('UG.geojson');
  const r = L.importerZip(w.ctx);
  assert.equal(r.chargees.length, 1);
  assert.match(r.message, /style par défaut/);
  assert.equal(w.sur_disque.has(QML_UG), false);
});

test('effacement raté de l\'ancien .qml : couche refusée, rien n\'est écrit ni chargé, message vrai', () => {
  const w = monde({ infos: UG, existants: [QML_UG], effacementRate: true });
  w.ctx.octets = zipDe('UG.geojson');
  const r = L.importerZip(w.ctx);
  assert.deepEqual(r.chargees, []);
  assert.equal(r.refusees[0].message, 'UG.geojson : ancien style (.qml) impossible à effacer, couche refusée');
  assert.deepEqual(w.ecrits, []);
  assert.ok(!w.journal.some((l) => l.startsWith('ajouter ')));
  assert.deepEqual(L.lireRegistre(w.ctx.reglages, ID), []);
});

test('effacement qui lève : couche refusée de même', () => {
  const w = monde({ infos: UG, existants: [QML_UG] });
  w.ctx.effacerFichier = () => { throw new Error('refusé'); };
  w.ctx.octets = zipDe('UG.geojson');
  const r = L.importerZip(w.ctx);
  assert.deepEqual(r.chargees, []);
  assert.match(r.refusees[0].message, /impossible à effacer, couche refusée$/);
});

test('effacement raté d\'un .qml tronqué après écriture ratée : couche refusée (un .qml périmé s\'appliquerait)', () => {
  const w = monde({ infos: UG, ecrit: false, ecritureInterrompue: true, effacementRate: true });
  w.ctx.octets = zipDe('UG.geojson');
  const r = L.importerZip(w.ctx);
  assert.deepEqual(r.chargees, []);
  assert.equal(r.refusees[0].message, 'UG.geojson : style (.qml) mal écrit et impossible à effacer, couche refusée');
});

test('effacement qui répond vrai mais le fichier reste : couche refusée (on ne croit pas la réponse)', () => {
  const w = monde({ infos: UG, existants: [QML_UG] });
  w.ctx.effacerFichier = () => true;
  w.ctx.octets = zipDe('UG.geojson');
  const r = L.importerZip(w.ctx);
  assert.deepEqual(r.chargees, []);
  assert.match(r.refusees[0].message, /impossible à effacer/);
});

test('copie illisible après réécriture : couche refusée, retirée du registre', () => {
  const w = monde();
  w.ctx.octets = zipDe('UG.geojson');
  const ouvrir = w.ctx.ouvrirCouche;
  w.ctx.ouvrirCouche = (s, n) => { const c = ouvrir(s, n); if (s.includes('|layername=')) c.isValid = false; return c; };
  const r = L.importerZip(w.ctx);
  assert.deepEqual(r.chargees, []);
  assert.match(r.refusees[0].message, /^UG\.geojson : copie illisible après réécriture/);
  assert.deepEqual(L.lireRegistre(w.ctx.reglages, ID), []);
});

test('sans reecrireCouche ou ecrireFichier : rien n\'est importé (jamais de couche chargée sans sa copie stylée)', () => {
  for (const service of ['reecrireCouche', 'ecrireFichier']) {
    const w = monde();
    w.ctx.octets = zipDe('UG.geojson');
    delete w.ctx[service];
    const r = L.importerZip(w.ctx);
    assert.deepEqual(r.chargees, [], service);
    assert.deepEqual(w.journal, [], service);
    assert.match(r.message, new RegExp(service));
  }
});

test('nom de zip finissant par « .zip.zip » : le dossier de la copie ne se confond pas avec un zip -> refus', () => {
  const w = monde();
  w.ctx.nomZip = 'a.zip.zip';
  w.ctx.octets = zipDe('UG.geojson');
  const r = L.importerZip(w.ctx);
  assert.deepEqual(r.chargees, []);
  assert.deepEqual(w.reecrites, []);
});

test('demarrerProjet : la copie est rechargée en lecture seule ; aucun style n\'est posé (le .qml voisin s\'en charge), zip non lu', () => {
  const w = monde({ infos: { UG: { geometrie: 'polygone', champs: [] } } });
  w.ctx.octets = zipDe('UG.geojson', 'FRT.geojson');
  L.importerZip(w.ctx);
  const lues = [];
  let zipLu = false;
  const d = L.demarrerProjet({
    variables: { vision_id: ID }, reglages: w.ctx.reglages, dossierProjet: PROJET,
    existe: (c) => { if (c.endsWith('.zip')) zipLu = true; return true; },
    chargerCouche: (source, nom, zip) => { lues.push({ source, nom, zip }); return { isValid: true, readOnly: false }; },
  });
  assert.equal(d.rechargees.length, 2);
  assert.deepEqual(lues, [
    { source: `${COPIES}/x/UG.gpkg|layername=UG`, nom: 'UG', zip: 'x.zip' },
    { source: `${COPIES}/x/FRT.gpkg|layername=FRT`, nom: 'FRT', zip: 'x.zip' },
  ]);
  assert.equal(zipLu, false);
  assert.equal(d.message, '');
});

test('demarrerProjet : entrée à chemin douteux (autre dossier, sous-dossier, « .. », « | ») retirée du registre sans rien charger', () => {
  const sains = { zip: 'x.zip', couche: 'UG', chemin: 'x/UG.gpkg', style: 'UG', ajoutee_le: 'd' };
  const chemins = ['y/UG.gpkg', 'x/sous/UG.gpkg', '../UG.gpkg', 'x/../UG.gpkg', 'x/UG|.gpkg', 'x/UG.shp', '/x/UG.gpkg', 'UG.gpkg'];
  const reg = reglages();
  reg.setValue(`vision/${ID}`, JSON.stringify([sains].concat(chemins.map((c) => ({ ...sains, chemin: c })))));
  const lues = [];
  const d = L.demarrerProjet({
    variables: { vision_id: ID }, reglages: reg, dossierProjet: PROJET, existe: () => true,
    chargerCouche: (s, n) => { lues.push(s); return { isValid: true, readOnly: false }; },
  });
  assert.equal(d.douteuses, chemins.length);
  assert.deepEqual(lues, [`${COPIES}/x/UG.gpkg|layername=UG`]);
});

test('Vision.qml : branche saveVectorLayerAs (GPKG) et writeFileContent ; plus aucune pose directe de style', async () => {
  const { readFileSync } = await import('node:fs');
  const qml = readFileSync(new URL('../plugin/Vision.qml', import.meta.url), 'utf8');
  assert.match(qml, /LayerUtils\.saveVectorLayerAs\(couche, cible, "GPKG"\)/);
  assert.match(qml, /FileUtils\.writeFileContent\(chemin, Logique\.arrayBufferExact\(octets\)\)/);
  assert.match(qml, /reecrireCouche: reecrireCouche/);
  assert.match(qml, /ecrireFichier: ecrireFichier/);
  // Services facultatifs dans importerZip (qmlAbsent saute la garde sans eux) : seul ce test fige leur branchement.
  assert.match(qml, /existe: function \(chemin\) \{ return FileUtils\.fileExists\(chemin\); \}/);
  assert.match(qml, /effacerFichier: effacerFichier/);
  assert.ok(!/appliquerStyle|appliquerQml|setRenderer|setLabeling|loadNamedStyle/.test(qml.replace(/\/\/[^\n]*/g, '')), 'aucune pose directe de style');
});

test('octetsUtf8 : accents et plans supplémentaires ; arrayBufferExact : taille exacte', () => {
  assert.deepEqual([...L.octetsUtf8('aé€😀')], [0x61, 0xc3, 0xa9, 0xe2, 0x82, 0xac, 0xf0, 0x9f, 0x98, 0x80]);
  const o = new Uint8Array([9, 1, 2, 3, 9]).subarray(1, 4);
  assert.equal(L.arrayBufferExact(o).byteLength, 3);
  assert.deepEqual([...new Uint8Array(L.arrayBufferExact(o))], [1, 2, 3]);
});

test('trouverQmlDeTable : le .qml d\'une table de GeoPackage porte le nom de la table', () => {
  const chemins = ['d/Serre.gpkg', 'd/UG.qml', 'd/Serre.qml', 'e/UG.qml'];
  assert.equal(S.trouverQmlDeTable('d/Serre.gpkg', 'UG', chemins), 'd/UG.qml');
  assert.equal(S.trouverQmlDeTable('d/Serre.gpkg', 'Autre', chemins), null);
});

test('geometrieDe : types de QGIS 0, 1, 2 vers point, ligne, polygone ; inconnu -> null', () => {
  assert.deepEqual([0, 1, 2, 3, undefined].map(S.geometrieDe), ['point', 'ligne', 'polygone', null, null]);
});

test('contrôle qui accepte une couche non ouverte : refusée, jamais réécrite', () => {
  const w = monde();
  w.ctx.octets = zipDe('UG.geojson');
  w.ctx.ouvrirCouche = () => null;
  const r = L.importerZip(w.ctx);
  assert.deepEqual(r.chargees, []);
  assert.deepEqual(w.reecrites, []);
  assert.match(r.refusees[0].message, /^UG\.geojson : couche illisible/);
});

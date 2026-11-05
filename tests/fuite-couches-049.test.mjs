// SPDX-License-Identifier: GPL-3.0-or-later
// Mission 049 : toute couche ouverte par LayerUtils.loadVectorLayer / loadRasterLayer qui n'est pas ajoutée à la
// carte est libérée (deleteLater) UNE seule fois ; une couche ajoutée au projet ne l'est JAMAIS. QField v4.3.7,
// qflayerutils.cpp l. 618 et 624 : ces couches sont en CppOwnership. L'API de QField est simulée : un vert ne
// prouve pas la mémoire sur le Samsung. Rien de visible : mêmes messages, mêmes refus, même registre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ecrireZip } from './recette/essai/zip-ecrire.mjs';
import * as L from '../plugin/cerf-logique.mjs';
import * as S from '../plugin/cerf-styles.mjs';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ID = 'ebad8ff8-577e-48bc-9489-6bab871230c2';
const PROJET = '/storage/emulated/0/Android/data/ch.opengis.qfield/files/Imported Projects/Serre';
const GJ = '{"type":"FeatureCollection","features":[]}';
const zipDe = (...noms) => ecrireZip(noms.map((nom) => ({ nom: Buffer.from(nom, 'utf8'), donnees: Buffer.from(GJ), stocke: false, utf8: true })));

// `invalides` : fichiers dont la couche s'ouvre mais isValid = false ; `nuls` : fichiers qui rendent null ;
// `refuses` : noms de couche refusés par le contrôle ; `ajoutEchoue` : l'ajout à la carte lève.
function monde({ invalides = [], nuls = [], refuses = [], ajoutEchoue = false, textes = {}, copieInvalide = false } = {}) {
  const m = new Map();
  const toutes = [];
  const liberees = [];
  const ajoutees = [];
  const disque = new Set();
  const ctx = {
    cerfId: ID, dossierProjet: PROJET, nomZip: 'x.zip',
    reglages: { value: (k, d) => (m.has(k) ? m.get(k) : d), setValue: (k, v) => m.set(k, v) },
    maintenant: () => new Date('2026-11-05T10:00:00Z'),
    ouvrirCouche: (source, nom) => {
      const fichier = source.substring(source.lastIndexOf('/') + 1);
      if (nuls.indexOf(fichier) >= 0) return null;
      const copie = source.indexOf('/vsizip/') !== 0;
      const l = { source, name: nom, isValid: copie ? !copieInvalide : invalides.indexOf(fichier) < 0, readOnly: false, copie };
      toutes.push(l);
      return l;
    },
    libererCouche: (l) => { liberees.push(l); },
    decrireCouche: () => ({ lisible: true }),
    controlerCouche: (d) => (refuses.indexOf(d.nom) >= 0 ? { charge: false, message: d.nom + ' : refusée par le contrôle' } : { charge: true, avertissements: [] }),
    reecrireCouche: (couche, cible) => cible,
    ecrireFichier: (chemin) => { disque.add(chemin); return true; },
    existe: (chemin) => disque.has(chemin) || /\.gpkg$/.test(chemin),
    effacerFichier: (chemin) => { disque.delete(chemin); return true; },
    ajouterALaCarte: (couche) => { if (ajoutEchoue) throw new Error('addMapLayer'); ajoutees.push(couche); },
    styles: S,
    infosCouche: () => ({ geometrie: 'polygone', champs: [] }),
    lireTexte: (zip, chemin) => (Object.prototype.hasOwnProperty.call(textes, chemin) ? textes[chemin] : null),
  };
  return { ctx, toutes, liberees, ajoutees };
}

// Chaque couche ouverte est soit ajoutée, soit libérée exactement une fois (jamais les deux, jamais deux fois).
function verifier({ toutes, liberees, ajoutees }) {
  for (const l of toutes) {
    const n = liberees.filter((x) => x === l).length;
    if (ajoutees.indexOf(l) >= 0) assert.equal(n, 0, `couche ajoutée libérée : ${l.source}`);
    else assert.equal(n, 1, `couche non ajoutée à libérer une fois (${n}) : ${l.source}`);
  }
  assert.equal(new Set(liberees).size, liberees.length, 'aucune couche libérée deux fois');
}

test('couche chargée : la copie est ajoutée et jamais libérée ; la couche du zip, jamais ajoutée, est libérée une fois', () => {
  const w = monde();
  w.ctx.octets = zipDe('p.geojson');
  const r = L.importerZip(w.ctx);
  assert.deepEqual(r.chargees.map((c) => c.couche), ['p']);
  assert.equal(w.ajoutees.length, 1);
  assert.equal(w.ajoutees[0].copie, true);
  assert.equal(w.liberees.indexOf(w.ajoutees[0]), -1);
  assert.equal(w.toutes.filter((l) => !l.copie).length, 1);
  verifier(w);
});

test('couche invalide (isValid faux, non nulle) : libérée une fois, refus « illisible » inchangé', () => {
  const w = monde({ invalides: ['p.geojson'] });
  w.ctx.octets = zipDe('p.geojson');
  const r = L.importerZip(w.ctx);
  assert.deepEqual(r.chargees, []);
  assert.equal(r.refusees.length, 1);
  assert.equal(w.liberees.length, 1);
  assert.equal(w.ajoutees.length, 0);
  verifier(w);
});

test('couche refusée par un contrôle : libérée une fois, message inchangé', () => {
  const w = monde({ refuses: ['p.geojson'] });
  w.ctx.octets = zipDe('p.geojson', 'q.geojson');
  const r = L.importerZip(w.ctx);
  assert.deepEqual(r.chargees.map((c) => c.couche), ['q']);
  assert.deepEqual(r.refusees.map((x) => x.message), ['p.geojson : refusée par le contrôle']);
  verifier(w);
});

test('.json écarté (044) dont l\'ouverture ne donne qu\'une couche invalide : libérée une fois, ligne d\'écart inchangée', () => {
  const w = monde({ invalides: ['config.json'] });
  w.ctx.octets = zipDe('p.geojson', 'config.json');
  const r = L.importerZip(w.ctx);
  assert.deepEqual(r.chargees.map((c) => c.couche), ['p']);
  assert.deepEqual(r.ecartees.map((e) => e.message), ['config.json : pas une couche GeoJSON, ignoré']);
  assert.equal(w.liberees.filter((l) => l.source.endsWith('config.json')).length, 1);
  verifier(w);
});

test('.json lisible mais pas du GeoJSON : jamais ouvert, donc rien à libérer', () => {
  const w = monde({ textes: { 'config.json': '{"a":1}' } });
  w.ctx.octets = zipDe('p.geojson', 'config.json');
  const r = L.importerZip(w.ctx);
  assert.equal(r.ecartees.length, 1);
  assert.equal(w.toutes.filter((l) => l.source.endsWith('config.json')).length, 0);
  verifier(w);
});

test('.json qui s\'ouvre mais dont le nom double une autre couche : refusé en double, sa couche libérée une fois', () => {
  const w = monde();
  w.ctx.octets = zipDe('a/p.geojson', 'b/p.json');
  const r = L.importerZip(w.ctx);
  assert.deepEqual(r.chargees.map((c) => c.couche), ['p']);
  assert.equal(r.refusees.length, 1);
  assert.match(r.refusees[0].message, /en double/);
  verifier(w);
});

test('doublon de nom dans deux dossiers : la seconde est refusée comme avant, aucune fuite', () => {
  const w = monde();
  w.ctx.octets = zipDe('a/p.geojson', 'b/p.geojson');
  const r = L.importerZip(w.ctx);
  assert.deepEqual(r.chargees.map((c) => c.couche), ['p']);
  assert.equal(r.refusees.length, 1);
  assert.match(r.refusees[0].message, /en double/);
  verifier(w);
});

test('réimport : les couches ouvertes avant le retrait de la carte sont libérées une fois, la copie ajoutée jamais', () => {
  const w = monde();
  w.ctx.octets = zipDe('p.geojson', 'q.geojson');
  L.importerZip(w.ctx);
  const w2 = monde({ refuses: ['q.geojson'] });
  w2.ctx.reglages = w.ctx.reglages;
  w2.ctx.octets = w.ctx.octets;
  const r = L.importerZip(w2.ctx);
  assert.deepEqual(r.chargees.map((c) => c.couche), ['p']);
  assert.equal(r.refusees.length, 1);
  assert.equal(L.lireRegistre(w2.ctx.reglages, ID).length, 1);
  verifier(w2);
});

test('réimport avec un doublon (json puis non-json de même nom) : toutes les couches ouvertes en trop sont libérées', () => {
  const w = monde();
  w.ctx.octets = zipDe('p.geojson');
  L.importerZip(w.ctx);
  const w2 = monde();
  w2.ctx.reglages = w.ctx.reglages;
  w2.ctx.octets = zipDe('a/p.json', 'b/p.geojson');
  const r = L.importerZip(w2.ctx);
  assert.deepEqual(r.chargees.map((c) => c.couche), ['p']);
  assert.equal(r.refusees.length, 1);
  verifier(w2);
});

test('réimport avorté (aucune couche lisible) : registre intact, couches invalides libérées', () => {
  const w = monde();
  w.ctx.octets = zipDe('p.geojson');
  L.importerZip(w.ctx);
  const avant = JSON.stringify(L.lireRegistre(w.ctx.reglages, ID));
  const w2 = monde({ invalides: ['p.geojson'] });
  w2.ctx.reglages = w.ctx.reglages;
  w2.ctx.octets = w.ctx.octets;
  const r = L.importerZip(w2.ctx);
  assert.match(r.message, /aucune couche lisible dans x\.zip, rien changé/);
  assert.equal(JSON.stringify(L.lireRegistre(w2.ctx.reglages, ID)), avant);
  assert.equal(w2.liberees.length, 1);
  verifier(w2);
});

test('copie illisible après réécriture : la copie invalide et la couche du zip sont libérées une fois chacune', () => {
  const w = monde({ copieInvalide: true });
  w.ctx.octets = zipDe('p.geojson');
  const r = L.importerZip(w.ctx);
  assert.deepEqual(r.chargees, []);
  assert.match(r.refusees[0].message, /copie illisible après réécriture/);
  assert.equal(w.liberees.length, 2);
  verifier(w);
});

test('GeoTIFF accepté : ajouté et jamais libéré ; GeoTIFF refusé : libéré une fois', () => {
  const w = monde();
  w.ctx.octets = zipDe('mnt.tif');
  const r = L.importerZip(w.ctx);
  assert.deepEqual(r.chargees.map((c) => c.couche), ['mnt']);
  assert.equal(w.liberees.length, 0);
  verifier(w);
  const w2 = monde({ refuses: ['mnt.tif'] });
  w2.ctx.octets = zipDe('mnt.tif');
  L.importerZip(w2.ctx);
  assert.equal(w2.liberees.length, 1);
  verifier(w2);
});

test('ajout à la carte qui lève : refus inchangé ; la couche dont l\'ajout a été tenté n\'est pas libérée (elle a pu entrer au projet)', () => {
  const w = monde({ ajoutEchoue: true });
  w.ctx.octets = zipDe('p.geojson');
  const r = L.importerZip(w.ctx);
  assert.match(r.refusees[0].message, /ajout à la carte impossible/);
  const copie = w.toutes.find((l) => l.copie);
  assert.equal(w.liberees.indexOf(copie), -1);
  assert.equal(new Set(w.liberees).size, w.liberees.length);
});

test('service libererCouche absent ou qui lève : import inchangé, rien ne plante', () => {
  const w = monde({ invalides: ['p.geojson'] });
  delete w.ctx.libererCouche;
  w.ctx.octets = zipDe('p.geojson', 'q.geojson');
  assert.deepEqual(L.importerZip(w.ctx).chargees.map((c) => c.couche), ['q']);
  const w2 = monde({ invalides: ['p.geojson'] });
  w2.ctx.libererCouche = () => { throw new Error('déjà détruite'); };
  w2.ctx.octets = zipDe('p.geojson', 'q.geojson');
  assert.deepEqual(L.importerZip(w2.ctx).chargees.map((c) => c.couche), ['q']);
});

test('exception pendant l\'import : les couches ouvertes sont tout de même libérées', () => {
  const w = monde();
  w.ctx.octets = zipDe('p.geojson');
  w.ctx.decrireCouche = () => { throw new Error('boum'); };
  const r = L.importerZip(w.ctx);
  assert.equal(r.chargees.length, 0);
  verifier(w);
});

// ------------------------------------------------------------------ rechargement à l'ouverture (demarrerProjet)

function mondeOuverture({ valide }) {
  const m = new Map();
  const liberees = [];
  const chargees = [];
  const reglages = { value: (k, d) => (m.has(k) ? m.get(k) : d), setValue: (k, v) => m.set(k, v) };
  L.inscrire(reglages, ID, { zip: 'x.zip', couche: 'p', chemin: 'x/p.gpkg', style: 'defaut', ajoutee_le: '2026-11-05T10:00:00Z' });
  const ctx = {
    variables: { cerf_id: ID }, reglages, dossierProjet: PROJET, existe: () => true,
    chargerCouche: (source, nom) => { const l = { source, isValid: valide, readOnly: false }; chargees.push(l); return l; },
    libererCouche: (l) => liberees.push(l),
  };
  return { ctx, liberees, chargees };
}

test('ouverture : copie rechargée invalide -> libérée une fois, message « illisible » inchangé', () => {
  const { ctx, liberees, chargees } = mondeOuverture({ valide: false });
  const r = L.demarrerProjet(ctx);
  assert.equal(r.illisibles.length, 1);
  assert.match(r.message, /illisible \(p\)/);
  assert.deepEqual(liberees, chargees);
});

test('ouverture : copie rechargée valide (ajoutée par le chargeur) -> jamais libérée', () => {
  const { ctx, liberees } = mondeOuverture({ valide: true });
  const r = L.demarrerProjet(ctx);
  assert.equal(r.rechargees.length, 1);
  assert.equal(liberees.length, 0);
});

// Couche déjà au projet : le faux chargeur la rend telle quelle (comme Cerf.qml), marquée par coucheDuProjet.
function mondeDeja(valide) {
  const w = mondeOuverture({ valide: true });
  const deja = { source: 'projet', isValid: valide, readOnly: false, auProjet: true };
  let appels = 0;
  w.ctx.chargerCouche = () => { appels++; return deja; };
  w.ctx.coucheDuProjet = (l) => l.auProjet === true;
  return { ...w, deja, appels: () => appels };
}

test('ouverture : couche déjà au projet et invalide -> jamais libérée, message « illisible » inchangé', () => {
  const w = mondeDeja(false);
  const r = L.demarrerProjet(w.ctx);
  assert.equal(r.illisibles.length, 1);
  assert.match(r.message, /illisible \(p\)/);
  assert.equal(w.liberees.length, 0);
});

test('ouverture : couche déjà au projet et valide -> jamais libérée, pas rechargée en double', () => {
  const w = mondeDeja(true);
  const r = L.demarrerProjet(w.ctx);
  assert.equal(r.rechargees.length, 1);
  assert.equal(w.liberees.length, 0);
  assert.equal(w.appels(), 1);
  assert.equal(w.chargees.length, 0);
});

// ------------------------------------------------------------------ forme de Cerf.qml, version

test('Cerf.qml : libererCouche (deleteLater) est passé à importerZip et à demarrerProjet', () => {
  const qml = readFileSync(resolve(RACINE, 'plugin/Cerf.qml'), 'utf8');
  assert.match(qml, /function libererCouche\(couche\) \{\s*couche\.deleteLater\(\);\s*\}/);
  assert.equal((qml.match(/libererCouche: libererCouche,/g) || []).length, 2);
});

test('version 0.4.4 (constante, metadata.txt) et préversion : branche de la mission 049', () => {
  assert.equal(L.VERSION, '0.4.4');
  assert.match(readFileSync(resolve(RACINE, 'plugin/metadata.txt'), 'utf8'), /^version=0\.4\.4$/m);
  assert.match(readFileSync(resolve(RACINE, '.github/workflows/release-plugin.yml'), 'utf8'), /'mission\/049-fuite-couches'/);
});

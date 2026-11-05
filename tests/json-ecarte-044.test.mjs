// SPDX-License-Identifier: GPL-3.0-or-later
// Mission 044 : un .json du zip qui ne s'ouvre pas (appareil : contenu illisible en /vsizip/) ou dont le
// contenu lisible n'est pas du GeoJSON (PC) est ÉCARTÉ avec « <chemin> : pas une couche GeoJSON, ignoré »,
// ce qui n'est pas un refus. Un .json qui s'ouvre est une couche normale ; un .geojson illisible reste refusé.
// L'API de QField est simulée : un vert ne prouve rien sur le Samsung (terrain : p.geojson + config.json).
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
const LIGNE = (chemin) => `${chemin} : pas une couche GeoJSON, ignoré`;
const zipDe = (...noms) => ecrireZip(noms.map((nom) => ({ nom: Buffer.from(nom, 'utf8'), donnees: Buffer.from(GJ), stocke: false, utf8: true })));

// `ouvrables` : noms de fichiers que QField sait ouvrir (les autres rendent null) ; `textes` : contenus lisibles
// (absent = null, comme sur l'appareil) ; `sansLireTexte` : ctx sans lireTexte.
function monde({ ouvrables, textes = {}, sansLireTexte = false } = {}) {
  const m = new Map();
  const journal = [];
  const controles = [];
  const disque = new Set();
  const ctx = {
    cerfId: ID, dossierProjet: PROJET, nomZip: 'x.zip',
    reglages: { value: (k, d) => (m.has(k) ? m.get(k) : d), setValue: (k, v) => m.set(k, v) },
    maintenant: () => new Date('2026-11-05T10:00:00Z'),
    ouvrirCouche: (source, nom) => {
      journal.push('ouvrir ' + source);
      const fichier = source.substring(source.lastIndexOf('/') + 1);
      if (ouvrables && source.indexOf('/vsizip/') === 0 && ouvrables.indexOf(fichier) < 0) return null; // la copie GeoPackage s'ouvre toujours
      return { source, name: nom, isValid: true, readOnly: false };
    },
    decrireCouche: () => ({ lisible: true }),
    controlerCouche: (d) => { controles.push(d.nom); return { charge: true, avertissements: [] }; },
    reecrireCouche: (couche, cible) => cible,
    ecrireFichier: (chemin) => { disque.add(chemin); return true; },
    existe: (chemin) => disque.has(chemin) || /\.gpkg$/.test(chemin),
    effacerFichier: (chemin) => { disque.delete(chemin); return true; },
    ajouterALaCarte: () => {},
    styles: S,
    infosCouche: () => ({ geometrie: 'polygone', champs: [] }),
    lireTexte: (zip, chemin) => (Object.prototype.hasOwnProperty.call(textes, chemin) ? textes[chemin] : null),
  };
  if (sansLireTexte) delete ctx.lireTexte;
  return { ctx, journal, controles };
}

test('appareil : p.geojson + config.json (contenu illisible, ouverture ratée) -> p chargé, config.json écarté, pas un refus', () => {
  const { ctx, controles } = monde({ ouvrables: ['p.geojson'] });
  ctx.octets = zipDe('p.geojson', 'config.json');
  const r = L.importerZip(ctx);
  assert.deepEqual(r.chargees.map((c) => c.couche), ['p']);
  assert.deepEqual(r.refusees, []);
  assert.deepEqual(r.ecartees.map((e) => e.message), [LIGNE('config.json')]);
  assert.ok(r.message.split('\n').includes(LIGNE('config.json')), r.message);
  assert.ok(!r.message.includes('illisible'), r.message);
  assert.ok(!controles.includes('config.json'), 'un .json écarté ne passe pas par les contrôles');
});

test('appareil : le chemin complet dans le zip est dans la ligne (sous-dossier, casse de l\'extension)', () => {
  const { ctx } = monde({ ouvrables: ['p.geojson'] });
  ctx.octets = zipDe('p.geojson', 'donnees/Config.JSON');
  const r = L.importerZip(ctx);
  assert.deepEqual(r.refusees, []);
  assert.deepEqual(r.ecartees.map((e) => e.message), [LIGNE('donnees/Config.JSON')]);
});

test('appareil : un .json qui s\'ouvre (contenu illisible mais QField l\'ouvre) reste une couche normale, contrôlée et réécrite', () => {
  const { ctx, controles, journal } = monde({ ouvrables: ['p.json'] });
  ctx.octets = zipDe('p.json');
  const r = L.importerZip(ctx);
  assert.deepEqual(r.chargees.map((c) => c.couche), ['p']);
  assert.deepEqual(r.refusees, []);
  assert.deepEqual(r.ecartees, []);
  assert.deepEqual(controles, ['p.json']);
  assert.ok(journal.some((j) => j.startsWith('ouvrir /vsizip/')), journal.join('\n'));
  assert.ok(!r.message.includes('pas une couche GeoJSON'), r.message);
});

test('appareil : un .json qui s\'ouvre mais que le contrôle refuse est refusé comme toute couche (pas écarté)', () => {
  const { ctx } = monde({ ouvrables: ['p.json'] });
  ctx.controlerCouche = (d) => ({ charge: false, message: `${d.nom} : système de coordonnées inconnu` });
  ctx.octets = zipDe('p.json');
  const r = L.importerZip(ctx);
  assert.equal(r.refusees.length, 1);
  assert.equal(r.refusees[0].message, 'p.json : système de coordonnées inconnu');
  assert.deepEqual(r.ecartees, []);
});

test('un .geojson illisible reste refusé « illisible », jamais écarté', () => {
  const { ctx } = monde({ ouvrables: [] });
  ctx.controlerCouche = (d) => (d.lisible === false ? { charge: false, message: `${d.nom} : illisible` } : { charge: true, avertissements: [] });
  ctx.octets = zipDe('cassé.geojson');
  const r = L.importerZip(ctx);
  assert.deepEqual(r.refusees.map((x) => x.message), ['cassé.geojson : illisible']);
  assert.deepEqual(r.ecartees, []);
  assert.ok(!r.message.includes('pas une couche GeoJSON'), r.message);
});

test('PC : contenu lisible non GeoJSON -> même ligne qu\'à l\'appareil (plus de silence), sans ouverture ni refus', () => {
  const { ctx, controles, journal } = monde({ textes: { 'p.json': GJ, 'config.json': '{"a":1}' } });
  ctx.octets = zipDe('p.json', 'config.json');
  const r = L.importerZip(ctx);
  assert.deepEqual(r.chargees.map((c) => c.couche), ['p']);
  assert.deepEqual(r.refusees, []);
  assert.deepEqual(r.ecartees.map((e) => e.message), [LIGNE('config.json')]);
  assert.ok(r.message.split('\n').includes(LIGNE('config.json')), r.message);
  assert.ok(!journal.some((j) => j.includes('config.json')), 'le contenu non GeoJSON n\'est pas ouvert');
  assert.ok(!controles.includes('config.json'));
});

test('PC : contenu texte cassé ou tableau JSON -> écarté aussi', () => {
  const { ctx } = monde({ textes: { 'a.json': '{pas du json', 'b.json': '[]' } });
  ctx.octets = zipDe('a.json', 'b.json');
  const r = L.importerZip(ctx);
  assert.deepEqual(r.ecartees.map((e) => e.message), [LIGNE('a.json'), LIGNE('b.json')]);
});

test('ctx sans lireTexte : le .json est tenté comme couche, écarté s\'il ne s\'ouvre pas', () => {
  const { ctx } = monde({ ouvrables: ['p.geojson'], sansLireTexte: true });
  ctx.octets = zipDe('p.geojson', 'config.json');
  const r = L.importerZip(ctx);
  assert.deepEqual(r.chargees.map((c) => c.couche), ['p']);
  assert.deepEqual(r.ecartees.map((e) => e.message), [LIGNE('config.json')]);
});

test('zip fait seulement d\'un .json écarté (appareil) : message existant « Aucune couche GeoJSON… » puis la ligne d\'écart, aucun refus', () => {
  const { ctx } = monde({ ouvrables: [] });
  ctx.octets = zipDe('config.json');
  const r = L.importerZip(ctx);
  assert.deepEqual(r.chargees, []);
  assert.deepEqual(r.refusees, []);
  assert.equal(r.message, `Aucune couche GeoJSON, Shapefile, GeoPackage ou GeoTIFF dans x.zip.\n${LIGNE('config.json')}`);
  assert.deepEqual(L.lireRegistre(ctx.reglages, ID), []);
});

test('zip fait seulement d\'un .json non GeoJSON (PC) : même message', () => {
  const { ctx } = monde({ textes: { 'config.json': '{"a":1}' } });
  ctx.octets = zipDe('config.json');
  const r = L.importerZip(ctx);
  assert.equal(r.message, `Aucune couche GeoJSON, Shapefile, GeoPackage ou GeoTIFF dans x.zip.\n${LIGNE('config.json')}`);
  assert.deepEqual(r.refusees, []);
});

test('réimport : un .json écarté ne compte pas comme couche lisible (aucune autre lisible -> « rien changé », registre intact)', () => {
  const { ctx } = monde({ ouvrables: ['p.geojson'] });
  ctx.octets = zipDe('p.geojson');
  assert.equal(L.importerZip(ctx).chargees.length, 1);
  // Le zip est remplacé par un zip où p.geojson n'est plus ouvrable et un config.json est ajouté.
  const w2 = monde({ ouvrables: [] });
  w2.ctx.reglages = ctx.reglages;
  w2.ctx.octets = zipDe('p.geojson', 'config.json');
  const r = L.importerZip(w2.ctx);
  assert.deepEqual(r.chargees, []);
  assert.match(r.message, /^aucune couche lisible dans x\.zip, rien changé/);
  assert.ok(r.message.includes(LIGNE('config.json')), r.message);
  assert.equal(L.lireRegistre(ctx.reglages, ID).length, 1, 'le registre n\'a pas bougé');
});

test('réimport : seul un .json écarté dans le zip réimporté -> rien changé, registre intact', () => {
  const { ctx } = monde({ ouvrables: ['p.geojson'] });
  ctx.octets = zipDe('p.geojson');
  L.importerZip(ctx);
  const w2 = monde({ ouvrables: [] });
  w2.ctx.reglages = ctx.reglages;
  w2.ctx.octets = zipDe('config.json');
  const r = L.importerZip(w2.ctx);
  assert.match(r.message, /^aucune couche lisible dans x\.zip, rien changé/);
  assert.equal(L.lireRegistre(ctx.reglages, ID).length, 1);
});

test('réimport : un .json écarté n\'empêche pas l\'import des autres couches (le zip remplace l\'ancien)', () => {
  const { ctx } = monde({ ouvrables: ['p.geojson'] });
  ctx.octets = zipDe('p.geojson');
  L.importerZip(ctx);
  const w2 = monde({ ouvrables: ['p.geojson'] });
  w2.ctx.reglages = ctx.reglages;
  w2.ctx.octets = zipDe('p.geojson', 'config.json');
  const r = L.importerZip(w2.ctx);
  assert.deepEqual(r.chargees.map((c) => c.couche), ['p']);
  assert.deepEqual(r.ecartees.map((e) => e.message), [LIGNE('config.json')]);
  assert.equal(L.lireRegistre(ctx.reglages, ID).length, 1);
});

test('retours « vides » (projet non Cerf) portent aussi ecartees: []', () => {
  const r = L.importerZip({ cerfId: 'x' });
  assert.deepEqual(r.ecartees, []);
});

test('version 0.4.1 et préversion : branche de la mission 044 dans release-plugin.yml', () => {
  assert.equal(L.VERSION, '0.4.1');
  assert.match(readFileSync(resolve(RACINE, 'plugin/metadata.txt'), 'utf8'), /^version=0\.4\.1$/m);
  assert.match(readFileSync(resolve(RACINE, '.github/workflows/release-plugin.yml'), 'utf8'), /'mission\/044-json-ignore'/);
});

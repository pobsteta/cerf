// SPDX-License-Identifier: GPL-3.0-or-later
// Mission 048 : le plugin ajoute le fond embarqué basemap.mbtiles s'il est à côté de cerf.qgz.
// L'API de QField est simulée : un vert ne prouve rien sur le Samsung (ordre réel dans l'arbre à voir à l'essai).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as L from '../plugin/cerf-logique.mjs';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (chemin) => readFileSync(resolve(RACINE, chemin), 'utf8');
const ID = 'ebad8ff8-577e-48bc-9489-6bab871230c2';
const PROJET = '/storage/emulated/0/Android/data/ch.opengis.qfield/files/Imported Projects/Serre';
const FOND = `${PROJET}/basemap.mbtiles`;
const TEXTE_ILLISIBLE = 'Fond embarqué (basemap.mbtiles) : fichier illisible, il n\'est pas affiché.';

function reglagesVides() {
  const m = new Map();
  return { value: (k, d) => (m.has(k) ? m.get(k) : d), setValue: (k, v) => m.set(k, v) };
}

function monde({ fichiers = [], dejaPresent = false, valide = true, leve = false, id = ID } = {}) {
  const appels = [];
  const ctx = {
    variables: id ? { cerf_id: id } : {},
    reglages: reglagesVides(),
    dossierProjet: PROJET,
    existe: (c) => fichiers.includes(c),
    fondDejaPresent: () => dejaPresent,
    chargerCouche: (source, nom) => {
      appels.push({ source, nom });
      if (leve) throw new Error('GDAL');
      return { isValid: valide, readOnly: false };
    },
  };
  return { ctx, appels };
}

test('absent : rien n\'est chargé, aucun message', () => {
  const { ctx, appels } = monde();
  const r = L.demarrerProjet(ctx);
  assert.equal(appels.length, 0);
  assert.equal(r.message, '');
});

test('présent : une couche « Fond embarqué (hors ligne) », source = <projet>/basemap.mbtiles, aucun message', () => {
  const { ctx, appels } = monde({ fichiers: [FOND] });
  const r = L.demarrerProjet(ctx);
  assert.deepEqual(appels, [{ source: FOND, nom: 'Fond embarqué (hors ligne)' }]);
  assert.equal(r.message, '');
  assert.equal(r.fondEmbarque, 'ajoute');
});

test('présent : pas d\'écriture dans le registre des imports', () => {
  const { ctx } = monde({ fichiers: [FOND] });
  L.demarrerProjet(ctx);
  assert.deepEqual(L.lireRegistre(ctx.reglages, ID), []);
  assert.equal(L.NOM_FOND_EMBARQUE, 'Fond embarqué (hors ligne)');
});

test('déjà présent dans le projet (réouverture, rechargement du plugin) : rien, une seule couche', () => {
  const { ctx, appels } = monde({ fichiers: [FOND], dejaPresent: true });
  const r = L.demarrerProjet(ctx);
  assert.equal(appels.length, 0);
  assert.equal(r.message, '');
});

test('deux démarrages de suite avec un projet qui garde la couche : une seule couche', () => {
  const { ctx, appels } = monde({ fichiers: [FOND] });
  L.demarrerProjet(ctx);
  ctx.fondDejaPresent = () => appels.length > 0;
  L.demarrerProjet(ctx);
  assert.equal(appels.length, 1);
});

test('illisible (couche invalide) : le texte validé par Pascal, rien d\'ajouté', () => {
  const { ctx } = monde({ fichiers: [FOND], valide: false });
  assert.equal(L.demarrerProjet(ctx).message, TEXTE_ILLISIBLE);
});

test('illisible (le chargement lève) : même texte, pas de plantage', () => {
  const { ctx } = monde({ fichiers: [FOND], leve: true });
  assert.equal(L.demarrerProjet(ctx).message, TEXTE_ILLISIBLE);
});

test('le message d\'illisibilité s\'ajoute aux autres lignes du démarrage', () => {
  const { ctx } = monde({ fichiers: [FOND], valide: false });
  ctx.reglages.setValue('x', 1);
  const r = L.demarrerProjet(ctx);
  assert.match(r.message, /fichier illisible, il n'est pas affiché\.$/);
});

test('projet sans cerf_id : rien, même si le fichier est là', () => {
  const { ctx, appels } = monde({ fichiers: [FOND], id: '' });
  const r = L.demarrerProjet(ctx);
  assert.equal(appels.length, 0);
  assert.equal(r.actif, false);
});

test('dossier du projet inconnu : rien', () => {
  const { ctx, appels } = monde({ fichiers: [FOND] });
  ctx.dossierProjet = '';
  L.demarrerProjet(ctx);
  assert.equal(appels.length, 0);
});

test('Cerf.qml : marque la couche, la repère par sa marque, branche fondDejaPresent', () => {
  const q = lire('plugin/Cerf.qml');
  assert.match(q, /fondDejaPresent/);
  assert.match(q, /cerf\/fond/);
});

test('version 0.4.3 (constante, metadata.txt) et préversion : branche de la mission 048', () => {
  assert.equal(L.VERSION, '0.4.3');
  assert.match(lire('plugin/metadata.txt'), /^version=0\.4\.3$/m);
  assert.match(lire('.github/workflows/release-plugin.yml'), /'mission\/048-fond-embarque-plugin'/);
});

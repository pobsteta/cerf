// Mission 023 : le protocole tests/recette/prototype-2.md nomme les boutons du prototype tels
// qu'ils sont dans prototype-2/essai-logique.mjs (BOUTONS, source de Essai.qml), et pose une
// question par bouton avec une capture nommée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { BOUTONS, NOM_ZIP } from '../prototype-2/essai-logique.mjs';
import { NOMS_ENTREES } from '../prototype-2/fabriquer-essais.mjs';

const ici = dirname(fileURLToPath(import.meta.url));
const t = readFileSync(join(ici, 'recette', 'prototype-2.md'), 'utf8');
const sections = t.split(/^## /m);
const question = (n) => sections.find((p) => p.startsWith(`Question ${n} `));

test('chaque bouton est nommé dans le protocole avec son nom exact', () => {
  for (const nom of Object.values(BOUTONS)) assert.ok(t.includes(`« ${nom} »`), nom);
});

test('sections : questions 0 à 7, dans l\'ordre, avec « Si non » et « Vu autrement » (sauf la 0)', () => {
  const titres = sections.filter((p) => /^Question \d /.test(p)).map((p) => p.charAt(9));
  assert.deepEqual(titres, ['0', '1', '2', '3', '4', '5', '6', '7']);
  for (let n = 1; n <= 7; n++) {
    assert.match(question(n), /\*\*Si non/, `Question ${n}`);
    assert.match(question(n), /\*\*Vu autrement/, `Question ${n}`);
  }
});

test('chaque question donne ses captures nommées', () => {
  const attendues = { 0: ['q0-liste.png'], 1: ['q1-carte.png', 'q1-ecran.png'], 2: ['q2-carte.png', 'q2-ecran.png'], 3: ['q3-carte.png', 'q3-ecran.png'],
    4: ['q4-a.png', 'q4-b.png', 'q4-d.png'], 5: ['q5-carte.png', 'q5-ecran.png'], 6: ['q6-ecran-haut.png', 'q6-ecran-bas.png'], 7: ['q7-ecran-1.png'] };
  for (const [n, noms] of Object.entries(attendues)) for (const c of noms) assert.ok(question(n).includes(c), `Question ${n} : ${c}`);
});

test('correspondance questions / boutons', () => {
  assert.ok(question(0).includes(`« ${BOUTONS.B0} »`));
  assert.ok(question(1).includes(`« ${BOUTONS.B1} »`));
  assert.ok(question(2).includes(`« ${BOUTONS.B2} »`));
  assert.ok(question(3).includes(`« ${BOUTONS.B3} »`));
  for (const k of ['B4', 'B4B', 'B4C', 'B4D']) assert.ok(question(4).includes(`« ${BOUTONS[k]} »`), k);
  for (const k of ['B5M', 'B5R']) assert.ok(question(5).includes(`« ${BOUTONS[k]} »`), k);
  assert.ok(question(6).includes(`« ${BOUTONS.B6} »`));
  assert.ok(question(7).includes(`« ${BOUTONS.B7} »`));
});

test('questions 1 et 3 : deux réponses séparées (couleurs, étiquettes) ; mode avion ; 17 entrées', () => {
  assert.match(question(1), /1a, couleurs/);
  assert.match(question(1), /1b, étiquettes/);
  assert.match(question(3), /3a, couleurs/);
  assert.match(question(3), /3b, étiquettes/);
  assert.match(t, /mode avion/i);
  assert.equal(NOMS_ENTREES.length, 17);
  assert.match(t, /\*\*17 entrées/);
});

test('« Avant de commencer » : contrôle QGIS sur le poste, fichiers à ouvrir, désactivation des autres plugins, URL de la préversion', () => {
  const avant = sections.find((p) => p.startsWith('Avant de commencer'));
  for (const f of ['UG_q1.geojson', 'Parcelles_q3.gpkg', 'UG_q4.geojson', 'FRT_q7.shp', 'Sans_crs.geojson']) assert.ok(avant.includes(`\`${f}\``), f);
  assert.match(avant, /Désactiver/);
  assert.match(avant, /prototype n° 1/);
  for (const f of ['cerf-prototype-2.zip', 'cerf-essai-2.zip', NOM_ZIP, 'essai-q3.gpkg']) {
    assert.ok(avant.includes(`https://github.com/pobsteta/cerf/releases/download/prototype-2/${f}`), f);
  }
});

test('tableau final : une ligne par réponse (1a, 1b, 2, 3a, 3b, 4, 5, 6, 7) et question de contrôle', () => {
  const finale = sections.find((p) => p.startsWith('Réponses'));
  const lignes = finale.split('\n').filter((l) => /^\| (1a|1b|2|3a|3b|4|5|6|7) :/.test(l));
  assert.equal(lignes.length, 9);
  assert.match(t, /Qui fait quoi d'ici quand, et comment saura-t-on que ça marche \?/);
});

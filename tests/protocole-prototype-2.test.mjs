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
  for (const f of ['UG_q1.geojson', 'UG_q2.geojson', 'Parcelles_q3.gpkg', 'UG_q4.geojson', 'FRT_q7.shp', 'FRT_sansprj.shp', 'Sans_crs.geojson', 'cerf-essai-2.qgs']) assert.ok(avant.includes(`\`${f}\``), f);
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

test('aller-retour 1 : une seule règle de lecture (« Conforme ☐ » / « Noté ☐ »), neuf réponses, plus de « Vu ☐ »', () => {
  assert.doesNotMatch(t, /\| Vu ☐ \|/, 'plus de colonne « Vu »');
  assert.doesNotMatch(t, /sept réponses/i);
  assert.match(t, /\*\*Neuf réponses\*\*/);
  assert.match(t, /Conforme ☐/);
  assert.match(t, /Noté ☐/);
  // toute case ☐ de tableau est dans une colonne « Conforme », « Noté » ou « Vu » (contrôle QGIS)
  for (const l of t.split('\n').filter((x) => /^\|.*\| ☐ \|$/.test(x))) assert.ok(l.endsWith('| ☐ |'));
  const entetes = t.split('\n').filter((x) => /^\| .*(Conforme ☐|Noté ☐|Vu ☐) \|$/.test(x));
  assert.ok(entetes.length >= 12, `${entetes.length} tableaux à cases`);
  assert.match(question(2), /Réponse 2[\s\S]*non\*\* si la case 2 est\s+cochée/);
});

test('aller-retour 1 : question 4 (fenêtre fermée avant capture, carte bougée, « Couche A retirée »), question 5 (zoom, réouverture, « sans objet »)', () => {
  const q4 = question(4);
  assert.match(q4, /Fermer la fenêtre du plugin\*\*, \*\*déplacer un peu la carte/);
  assert.match(q4, /Couche A retirée : oui/);
  assert.match(q4, /rmFile/);
  const q5 = question(5);
  assert.match(q5, /sans objet/);
  assert.match(q5, /oui, mais par le projet/);
  assert.match(q5, /Zoomer/);
  assert.match(q5, /Fermer et rouvrir le projet dans QField/);
  assert.match(q5, /deux fois\*\* « couche marquée \(cerf\/proto2\) retrouvée dans le projet : oui »/);
});

test('aller-retour 1 : question 6 (axes inversés, tous les messages, NaN attendu aux lignes 6-7) et question 7 (critère, termes de l\'écran)', () => {
  const q6 = question(6);
  assert.match(q6, /AXES INVERSÉS/);
  for (const m of ['rendue SANS changement', 'transformée', 'vide (0 ; 0) : ÉCHEC silencieux', 'non numérique (undefined ou autre) : ÉCHEC', 'valeurs infinies ou NaN : ÉCHEC']) assert.ok(q6.includes(m), m);
  assert.match(q6, /échec attendu, en `NaN`/);
  const q7 = question(7);
  assert.match(q7, /\*\*Réponse 7\*\* : \*\*oui\*\* si les cases 2, 3 et 4/);
  for (const m of ['crs.description', 'comptage par createFeatureIterator', 'emprise reprojetée en EPSG:2154', 'Verdict spec § 4']) assert.ok(q7.includes(m), m);
  assert.match(q7, /OGC:CRS84/);
});

test('aller-retour 1 : préalables (avant le mode avion), téléchargement, captures Samsung, essai-q3.gpkg pour le PC seul, désactivation finale', () => {
  const avant = sections.find((p) => p.startsWith('Avant de commencer'));
  assert.match(avant, /Tout se fait avant le mode avion/);
  assert.match(avant, /installer\s+un plugin depuis une URL/);
  assert.match(avant, /dossier « Téléchargements »/);
  assert.match(avant, /\*\*activer\*\* « Cerf, prototype n° 2 » \*\*seul\*\*/);
  assert.match(avant, /ne sert \*\*qu'à ce contrôle sur le PC\*\*/);
  assert.match(avant, /\*\*17 entrées\*\*/);
  assert.match(avant, /1 050 963 à 1 051 263/);
  assert.match(t, /Volume bas/);
  assert.match(t, /Nom Samsung/);
  assert.match(t, /capture lisible de l'écran d'erreur/);
  assert.match(t, /## Après l'essai[\s\S]*Désactiver « Cerf, prototype n° 2 »/);
});

test('aller-retour 2 : « essai raté », règle par couche en 5, NaN ou infinies en 7, repli de zoom, installation par URL', () => {
  assert.match(t, /essai raté/);
  assert.ok((t.match(/essai raté/g) || []).length >= 3);
  assert.match(t, /si ce n'est pas 2 sur 2 par la source : s'arrêter, capture/);
  assert.match(t, /sur la ligne de chaque couche/);
  assert.match(t, /pas sur le n global/);
  assert.doesNotMatch(t, /\(n < 2 pour elle\)|non rechargée » \(n = 2\)/);
  assert.match(t, /bornes NaN ou infinies/);
  assert.match(t, /appui long sur la couche dans le panneau des couches/);
  assert.match(t, /deux entiers séparés par une espace/);
  assert.match(t, /1051113 6840462/);
  assert.match(t, /déjà éprouvée par Pascal au prototype n° 1/);
  assert.match(t, /le dire avant d'aller plus loin/);
});

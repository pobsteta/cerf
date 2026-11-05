// Mission 003, report demandé par Pascal et la relecture de la mission 004 (2 novembre 2026) :
// noms des boutons, question 1 reformulée, chemin de secours, « Avant de commencer ».
// Les noms de boutons sont comparés à ceux de prototype/vision-zip.mjs (BOUTONS, source de
// Vision.qml) : référence de noms seulement ; aucune logique du prototype n'est lue ni essayée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ici = dirname(fileURLToPath(import.meta.url));
const t = readFileSync(join(ici, 'recette', 'prototype-1.md'), 'utf8');
const BOUTONS = {
  A: 'A. Copier hors projet', B: 'B. Copier dans le projet', C: 'C. Lister la copie',
  D: 'D. Effacer la copie', E: 'E. Module .mjs', F: 'F. Ouvrir les couches du zip',
  G: 'G. Trouver le .qml du zip', H: 'H. Ouvrir le GeoTIFF du zip',
  I: 'I. Essai à risque : lister un gros zip',
};
const questions = () => t.split(/^## /m).filter((p) => /^Question [1-9] /.test(p));
const gestes = (c) => c.split('\n').filter((l) => /^\|\s*\d+\s*\|/.test(l)).map((l) => l.split('|').slice(1, -1).map((x) => x.trim()));
const geste = (q, n) => gestes(questions()[q - 1]).find((g) => g[0] === String(n))[1];
const avec = (q, n, L) => assert.ok(geste(q, n).includes(`« ${BOUTONS[L]} »`), `Q${q} geste ${n} : « ${BOUTONS[L]} » attendu, trouvé : ${geste(q, n)}`);

test('les noms de boutons du protocole sont ceux de prototype/vision-zip.mjs (Vision.qml)', () => {
  const src = readFileSync(join(ici, '..', 'prototype', 'vision-zip.mjs'), 'utf8');
  for (const nom of Object.values(BOUTONS)) assert.ok(src.includes(`'${nom}'`), nom);
});

test('plus de « bouton du prototype » : chaque geste nomme son bouton', () => {
  assert.doesNotMatch(t, /bouton du prototype/i);
  assert.doesNotMatch(t, /bouton (de copie|de listage|d'effacement)/i);
});

test('correspondance gestes / boutons (PLAN.md § 10 bis)', () => {
  avec(1, 1, 'A'); avec(1, 2, 'C'); avec(1, 3, 'B'); avec(1, 3, 'C');
  avec(2, 1, 'A'); avec(2, 4, 'C');
  avec(3, 1, 'D'); avec(3, 2, 'C');
  avec(4, 1, 'E');
  avec(5, 1, 'F');
  avec(6, 1, 'C'); avec(6, 2, 'G');
  avec(7, 1, 'A'); avec(7, 2, 'I'); avec(7, 3, 'H'); avec(7, 4, 'D');
  avec(8, 1, 'A'); avec(8, 1, 'C'); avec(8, 2, 'A'); avec(8, 2, 'C');
  avec(9, 1, 'A'); avec(9, 1, 'C');
});

test('chaque bouton A à I est nommé dans le protocole, avec son nom exact', () => {
  for (const nom of Object.values(BOUTONS)) assert.ok(t.includes(`« ${nom} »`), nom);
});

test('bouton G : « EN ATTENTE », pas de décompresseur ; 635 octets gardés', () => {
  const q6 = questions()[5];
  assert.ok(q6.includes('EN ATTENTE'));
  assert.match(q6, /pas de décompresseur/);
  assert.ok(q6.includes('635 octets'));
});

test('bouton I : deux touchers, QField peut se fermer', () => {
  const g = geste(7, 2);
  assert.match(g, /deux fois/);
  assert.match(g, /QField peut se fermer/);
});

test('enchaînement Q6 : un C (ou I en secours) liste la copie avant G', () => {
  const g1 = geste(6, 1);
  assert.ok(g1.includes(`« ${BOUTONS.A} »`) && g1.includes(`« ${BOUTONS.C} »`) && g1.includes(`« ${BOUTONS.I} »`));
  assert.match(g1, /Lister d'abord la copie/);
  assert.match(g1, /a été effacée \(question 3\)/);
  assert.match(g1, /zip absent/);
  const ordre = gestes(questions()[5]).map((g) => g[1]);
  assert.ok(ordre.findIndex((x) => x.includes(`« ${BOUTONS.C} »`)) < ordre.findIndex((x) => x.includes(`« ${BOUTONS.G} »`)));
});

test('Q5 : « recopier le zip » nomme le bouton A', () => {
  assert.match(questions()[4].replace(/\s+/g, ' '), /sinon recopier le zip avec « A\. Copier hors projet »/);
});

test('enchaînement Q7 : A sur lourd.zip, « Copie visée » nomme lourd.zip, I deux fois, puis D ; question en tout dernier', () => {
  const q7 = questions()[6];
  const s = q7.replace(/\s+/g, ' ');
  assert.match(s, /en tout dernier, après les questions 8 et 9/);
  const g1 = geste(7, 1);
  assert.ok(g1.includes(`« ${BOUTONS.A} »`) && g1.includes('`lourd.zip`'));
  assert.match(g1, /« Chemin de la copie » \(ou l'en-tête « Copie en cours »\) nomme `lourd\.zip`/);
  assert.doesNotMatch(g1, /Copie visée/);
  assert.match(g1, /essai-cp437\.zip/);
  assert.match(geste(7, 2), /avant le second toucher, vérifier que la ligne « Copie visée » \(affichée au premier toucher de I\) nomme `lourd\.zip`/);
  const ordre = gestes(q7).map((g) => g[1]);
  const iA = ordre.findIndex((x) => x.includes(`« ${BOUTONS.A} »`));
  const iI = ordre.findIndex((x) => x.includes(`« ${BOUTONS.I} »`));
  const iD = ordre.findIndex((x) => x.includes(`« ${BOUTONS.D} »`));
  assert.ok(iA >= 0 && iA < iI && iI < iD, 'ordre A, I, D attendu');
  assert.match(geste(7, 4), /Après I/);
});

test('H : l\'emprise remplace la taille en pixels, citée au plan', () => {
  const g = gestes(questions()[6]).find((x) => x[0] === '3')[2];
  assert.ok(g.includes('70710 m × 70710 m'));
  assert.match(g, /pas\*\* la taille en pixels/);
  assert.match(g, /PLAN\.md` § 4\)/);
  assert.doesNotMatch(g, /10 bis/);
});

test('question 1 reformulée (décision de Pascal du 2 novembre 2026)', () => {
  const q1 = questions()[0].replace(/\s+/g, ' ');
  assert.match(q1, /Question reformulée \(décision de Pascal du 2 novembre 2026\)/);
  assert.match(q1, /Sous Android 11 et plus, le plugin ne voit jamais le fichier d'origine, seulement la copie faite par le sélecteur/);
  assert.match(q1, /listage de la copie\*\* : hors du dossier projet par « A\. Copier hors projet », puis dans le dossier projet par « B\. Copier dans le projet »/);
});

test('chemin de secours : C « taille de la copie inconnue » -> I pour les questions 1, 2, 3, 8 et 9', () => {
  const m = t.match(/\*\*Chemin de secours\.\*\*([\s\S]*?)\n\n/);
  assert.ok(m, 'chemin de secours absent');
  const s = m[1].replace(/\s+/g, ' ');
  assert.ok(s.includes('« taille de la copie inconnue »'));
  assert.ok(s.includes('les questions 1, 2, 3, 8 et 9'));
  assert.ok(s.includes(`« ${BOUTONS.I} »`));
  assert.ok(s.includes(`« ${BOUTONS.C} »`));
  assert.ok(s.includes('Avant de confirmer le second toucher'));
  assert.ok(s.includes('ligne « Copie visée » nomme le petit zip, jamais `lourd.zip`'));
});

test('avant de commencer : URLs de la release prototype-1, avant le mode avion', () => {
  const base = 'https://github.com/pobsteta/vision/releases/download/prototype-1/';
  for (const f of ['essai.zip', 'essai-cp437.zip', 'vision-projet-modele.zip', 'vision-prototype.zip', 'vision-essai.zip']) assert.ok(t.includes(base + f), f);
  assert.ok(t.indexOf(base + 'essai.zip') < t.indexOf('Passer le téléphone en **mode avion**'));
  assert.match(t, /Avant le mode avion/);
});

test("avant de commencer : projet d'essai et vision_id exacts (vision-essai ou vision.qgz)", () => {
  assert.match(t, /`vision-essai` \(`vision_id` 936eb144-5447-4094-a579-fac12a9f0595\)/);
  assert.match(t, /`vision\.qgz`[\s\S]{0,200}`vision_id` d98bf4b8-0fac-4dac-85cf-58e6701aceeb/);
  assert.match(t, /au choix de Pascal/);
  const qgs = readFileSync(join(ici, '..', 'prototype', 'essai-projet', 'vision-essai.qgs'), 'utf8');
  assert.ok(qgs.includes('936eb144-5447-4094-a579-fac12a9f0595'));
});

test('avant de commencer : permission de stockage au premier toucher de A ou B, à accepter et noter', () => {
  const s = t.replace(/\s+/g, ' ');
  assert.match(s, /permission de stockage/);
  assert.match(s, /premier toucher de « A\. Copier hors projet » ou de « B\. Copier dans le projet »/);
  assert.match(s, /l'accepter, et l'écrire dans « Vu autrement »/);
});

// Mission 050 : le projet s'appelle Vision. Garde : plus aucune occurrence de l'ancien nom (casse ignorée),
// dans le contenu comme dans le chemin des fichiers suivis par git, hors historique daté.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Le mot est assemblé (jamais écrit en clair) pour que ce fichier se surveille lui-même comme les autres.
const ANCIEN = new RegExp(['c', 'e', 'r', 'f'].join(''), 'i');

// Historique : il garde l'ancien nom (décision de Pascal du 5 novembre 2026, fiche 050).
const HISTORIQUE = [
  /^pilotage\/journal\.md$/,
  /^pilotage\/missions\/0[0-4]\d-/, // fiches 000 à 049, dans leur texte d'origine
  /^pilotage\/missions\/050-vision\.md$/, // la fiche du renommage nomme l'ancien et le nouveau
  /^docs\/adr\/000[1-8]-/, // ADR passées, texte d'origine
  /^docs\/adr\/0009-/, // l'ADR du renommage cite l'ancien nom
  // Prototypes 1 à 4 : historique figé (décision de Pascal du 5 novembre 2026), état d'origine, ne pas relancer.
  /^prototype\//,
  /^tests\/recette\/prototype-1\.md$/,
  /^tests\/recette\/essai\/(essai\.zip|essai-cp437\.zip|fabriquer-essais\.mjs|module-essai\.mjs)$/, // fixtures du seul prototype
  /^\.github\/workflows\/release-prototype\.yml$/,
  /^tests\/prototype\.test\.mjs$/,
  /^tests\/protocole-prototype(-boutons|-retouches)?\.test\.mjs$/,
  /^plugin\/PLAN-012\.md$/, // plans de missions passées (012, 021)
  /^outils\/PLAN-021\.md$/,
];
// « effacerFichier » (RemoveFile de QField) contient l'ancien nom (casse mêlée) par hasard de la langue : pas un reste de l'ancien nom.
const sansFauxAmis = (t) => t.replace(/effacerFichier/g, '');

const suivis = () => execFileSync('git', ['ls-files', '-z'], { cwd: RACINE, encoding: 'utf8' }).split('\0').filter(Boolean);
// Exception nommée : le nom d'une personne (le successeur désigné, brief § Successeur), pas celui du projet.
const PERSONNE = '- **Successeur** : **Jeff ' + ['C', 'e', 'r', 'f'].join('') + '**, désigné par Pascal le 2 novembre 2026.';
const sansPersonne = (t) => t.split('\n').filter((l) => l !== PERSONNE).join('\n');
const restes = (exclus) => suivis().filter((f) => !exclus.some((re) => re.test(f))).filter((f) => {
  if (ANCIEN.test(sansFauxAmis(f))) return true;
  let contenu = readFileSync(resolve(RACINE, f)).toString('latin1');
  if (f === 'docs/brief.md') contenu = sansPersonne(readFileSync(resolve(RACINE, f), 'utf8')); // seule ligne exemptée, et seulement dans le brief
  return ANCIEN.test(sansFauxAmis(contenu));
});

test('garde : l\'ancien nom n\'apparaît plus dans les fichiers suivis (contenu ni chemin), hors historique', () => {
  assert.deepEqual(restes(HISTORIQUE), []);
});

test('garde : l\'exception du nom de personne ne couvre que la ligne du successeur dans le brief', () => {
  const brief = readFileSync(resolve(RACINE, 'docs/brief.md'), 'utf8').split('\n');
  assert.equal(brief.filter((l) => l === PERSONNE).length, 1);
  assert.deepEqual(brief.filter((l) => l !== PERSONNE && ANCIEN.test(l)), []);
});

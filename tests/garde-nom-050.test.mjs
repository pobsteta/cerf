// Mission 050 : le projet s'appelle Vision. Garde : plus aucune occurrence de l'ancien nom (casse ignorée),
// dans le contenu comme dans le chemin des fichiers suivis par git, hors historique daté.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Le mot est assemblé pour que ce fichier ne se signale pas lui-même.
const ANCIEN = new RegExp('ce' + 'rf', 'i');

// Historique : il garde l'ancien nom (décision de Pascal du 5 novembre 2026, fiche 050).
const HISTORIQUE = [
  /^pilotage\/journal\.md$/,
  /^pilotage\/missions\/0[0-4]\d-/, // fiches 000 à 049, dans leur texte d'origine
  /^pilotage\/missions\/050-vision\.md$/, // la fiche du renommage nomme l'ancien et le nouveau
  /^docs\/adr\/000[1-8]-/, // ADR passées, texte d'origine
  /^docs\/adr\/0009-/, // l'ADR du renommage cite l'ancien nom
  /^tests\/garde-nom-050\.test\.mjs$/, // ce fichier nomme l'ancien nom dans son commentaire d'en-tête
  /^docs\/referentiels\/brut\//, // mesures brutes datées
  /^plugin\/PLAN-012\.md$/, // plans de missions passées (012, 021)
  /^outils\/PLAN-021\.md$/,
];
// « effacerFichier » (RemoveFile de QField) contient « cerF » par hasard de la langue : pas un reste de l'ancien nom.
const sansFauxAmis = (t) => t.replace(/effacerFichier/g, '');

const suivis = () => execFileSync('git', ['ls-files', '-z'], { cwd: RACINE, encoding: 'utf8' }).split('\0').filter(Boolean);
const restes = (exclus) => suivis().filter((f) => !exclus.some((re) => re.test(f))).filter((f) => {
  if (ANCIEN.test(sansFauxAmis(f))) return true;
  return ANCIEN.test(sansFauxAmis(readFileSync(resolve(RACINE, f)).toString('latin1')));
});

test('garde : l\'ancien nom n\'apparaît plus dans les fichiers suivis (contenu ni chemin), hors historique', () => {
  assert.deepEqual(restes(HISTORIQUE), []);
});

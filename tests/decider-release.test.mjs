// Mission 008 : décision « publier ou ignorer » du workflow release-plugin.yml.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { decider, pluginChange, fichiersChanges } from '../outils/decider-release.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const push = (fichiers, branche = 'main') => decider({ evenement: 'push', branche, fichiers });

test('main : plugin/ changé -> publier', () => {
  assert.equal(push(['plugin/metadata.txt', 'tests/a.mjs']).action, 'publier');
});
test('main : seulement tests/, cerf.qgz ou le workflow -> ignorer, avec le message clair', () => {
  const r = push(['tests/plugin.test.mjs', 'cerf.qgz', '.github/workflows/release-plugin.yml']);
  assert.equal(r.action, 'ignorer');
  assert.match(r.raison, /plugin\/ inchangé : pas de release/);
});
test('main : un dossier voisin « plugin-autre/ » ou un fichier « plugin.txt » ne compte pas', () => {
  assert.equal(pluginChange(['plugin-autre/a', 'plugin.txt', 'docs/plugin/x']), false);
  assert.equal(pluginChange([]), false);
});
test('main : fichiers inconnus (premier push) -> publier (l\'étiquette existante fera refuser)', () => {
  assert.equal(push(null).action, 'publier');
});
test('main : lancement manuel -> publier même sans changement', () => {
  assert.equal(decider({ evenement: 'workflow_dispatch', branche: 'main', fichiers: [] }).action, 'publier');
});
test('branche de mission : toujours publier (préversion), quels que soient les fichiers', () => {
  assert.equal(push(['tests/a.mjs'], 'mission/008-squelette-plugin').action, 'publier');
});
test('fichiersChanges : avant nul (40 zéros), vide ou git en échec -> null ; sinon la liste', () => {
  const git = () => 'plugin/a\ntests/b\n';
  assert.equal(fichiersChanges('0'.repeat(40), 'abc', git), null);
  assert.equal(fichiersChanges('', 'abc', git), null);
  assert.equal(fichiersChanges('abc', 'def', () => { throw new Error('x'); }), null);
  assert.deepEqual(fichiersChanges('abc', 'def', git), ['plugin/a', 'tests/b']);
});
test('script : sur une branche, imprime « publier » sans git', () => {
  const out = execFileSync('node', [join(RACINE, 'outils', 'decider-release.mjs'), 'push', 'mission/008-squelette-plugin', '0'.repeat(40), 'abc'], { encoding: 'utf8' });
  assert.equal(out.trim(), 'publier');
});
test('workflow : appelle la décision et conditionne les étapes sur sa sortie', () => {
  const wf = readFileSync(join(RACINE, '.github', 'workflows', 'release-plugin.yml'), 'utf8');
  assert.match(wf, /fetch-depth: 0/);
  assert.match(wf, /node outils\/decider-release\.mjs/);
  assert.match(wf, /steps\.decision\.outputs\.action == 'publier'/);
  assert.match(wf, /GITHUB_STEP_SUMMARY/);
});

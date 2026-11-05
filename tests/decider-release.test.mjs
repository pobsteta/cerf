// Mission 008 : décision « publier ou ignorer » du workflow release-plugin.yml.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { decider, pluginChange, fichiersChanges } from '../outils/decider-release.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const push = (fichiers, branche = 'main') => decider({ evenement: 'push', branche, fichiers });

test('main : plugin/ changé -> publier', () => {
  assert.equal(push(['plugin/metadata.txt', 'tests/a.mjs']).action, 'publier');
});
test('main : seulement tests/, vision.qgz ou le workflow -> ignorer, avec le message clair', () => {
  const r = push(['tests/plugin.test.mjs', 'vision.qgz', '.github/workflows/release-plugin.yml']);
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
  assert.equal(push(['tests/a.mjs'], 'mission/010-styles').action, 'publier');
});
test('fichiersChanges : avant nul (40 zéros), vide ou git en échec -> null ; sinon la liste', () => {
  const git = () => 'plugin/a\0tests/b\0';
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

// Vrai git, petit dépôt temporaire.
function depot() {
  const d = mkdtempSync(join(tmpdir(), 'vision-decider-'));
  const g = (...a) => execFileSync('git', ['-C', d, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  g('init', '-q');
  g('config', 'user.name', 'Essai');
  g('config', 'user.email', 'essai@example.org');
  g('config', 'commit.gpgsign', 'false');
  const ecrire = (f, c) => { mkdirSync(dirname(join(d, f)), { recursive: true }); writeFileSync(join(d, f), c); };
  const valider = (m) => { g('add', '-A'); g('commit', '-q', '-m', m); return g('rev-parse', 'HEAD'); };
  return { d, g, ecrire, valider };
}
function essai(prepare, modifie) {
  const r = depot();
  try {
    prepare(r);
    const avant = r.valider('base');
    modifie(r);
    const sha = r.valider('changement');
    const gitDansDepot = (args) => execFileSync('git', ['-C', r.d, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const fichiers = fichiersChanges(avant, sha, gitDansDepot);
    return { fichiers, action: push(fichiers).action };
  } finally {
    rmSync(r.d, { recursive: true, force: true });
  }
}
const base = ({ ecrire }) => { ecrire('plugin/a.qml', 'x\n'.repeat(20)); ecrire('plugin/écran.qml', 'y\n'.repeat(20)); ecrire('docs/n.md', 'z'); };

test('vrai git : renommage de plugin/ vers docs/ -> publier', () => {
  const r = essai(base, ({ g }) => g('mv', 'plugin/a.qml', 'docs/a.qml'));
  assert.ok(r.fichiers.includes('plugin/a.qml'));
  assert.equal(r.action, 'publier');
});
test('vrai git : suppression sous plugin/ -> publier', () => {
  const r = essai(base, ({ g }) => g('rm', '-q', 'plugin/a.qml'));
  assert.equal(r.action, 'publier');
});
test('vrai git : nom accentué modifié sous plugin/ -> publier', () => {
  const r = essai(base, ({ ecrire }) => ecrire('plugin/écran.qml', 'autre\n'));
  assert.deepEqual(r.fichiers, ['plugin/écran.qml']);
  assert.equal(r.action, 'publier');
});
test('vrai git : changement seulement hors de plugin/ -> ignorer', () => {
  const r = essai(base, ({ ecrire }) => ecrire('docs/n.md', 'autre'));
  assert.equal(r.action, 'ignorer');
});
test('vrai git : commit précédent absent de l\'historique -> publier, sans message brut de git', () => {
  const r = depot();
  try {
    r.ecrire('plugin/a.qml', 'x');
    const sha = r.valider('base');
    const gitDansDepot = (args) => execFileSync('git', ['-C', r.d, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const fichiers = fichiersChanges('1'.repeat(40), sha, gitDansDepot);
    assert.equal(fichiers, null);
    const d = push(fichiers);
    assert.equal(d.action, 'publier');
    assert.doesNotMatch(d.raison, /fatal|bad object/);
  } finally {
    rmSync(r.d, { recursive: true, force: true });
  }
});

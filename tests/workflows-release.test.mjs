// Mission 022 : rangement des deux workflows de publication (une adresse stable par zip,
// une publication ne casse pas l'autre). On lit les YAML : la logique est dans les workflows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (f) => readFileSync(join(RACINE, '.github', 'workflows', f), 'utf8');
// Le YAML sans les lignes de commentaire : on teste ce qui s'exécute, pas ce qui s'explique.
const code = (f) => lire(f).split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

test('projet modèle : plus de déclencheur sur une branche de mission, main seul + lancement manuel', () => {
  const wf = code('release-projet-modele.yml');
  assert.match(wf, /branches: \['main'\]/);
  assert.doesNotMatch(wf, /mission\/0\d\d/);
  assert.match(wf, /workflow_dispatch:/);
});

test('projet modèle : essai avant fusion en préversion, jamais « latest »', () => {
  const wf = code('release-projet-modele.yml');
  assert.match(wf, /projet-modele-essai/);
  assert.match(wf, /--prerelease --latest=false/);
  assert.match(wf, /--title "Projet modèle Vision" --notes-file notes\.md --latest=false/);
  assert.doesNotMatch(wf, /--latest(?!=false)/);
});

test('projet modèle : étiquette orpheline supprimée avant de recréer (main), groupe concurrency', () => {
  const wf = code('release-projet-modele.yml');
  assert.match(wf, /concurrency:\n\s+group: release-projet-modele\n\s+cancel-in-progress: false/);
  const iOrpheline = wf.indexOf('git/refs/tags/projet-modele"');
  const iCreation = wf.indexOf('gh release create projet-modele ');
  assert.ok(iOrpheline > 0 && iCreation > iOrpheline, 'suppression de l\'étiquette avant la création');
  assert.match(wf, /gh release delete projet-modele --cleanup-tag --yes/);
});

test('projet modèle : ne touche pas aux releases du plugin', () => {
  const wf = code('release-projet-modele.yml');
  assert.doesNotMatch(wf, /plugin-v|plugin-essai|dist\/plugin-vision\.zip/);
});

test('plugin : ne publie plus projet-vision.zip, ne fabrique plus de projet modèle', () => {
  const wf = code('release-plugin.yml');
  assert.doesNotMatch(wf, /projet-vision/);
  assert.doesNotMatch(wf, /vision\.qgz/);
  assert.match(wf, /gh release create "plugin-v\$version" dist\/plugin-vision\.zip/);
});

test('plugin : seule plugin-v<version> est « latest », l\'essai ne l\'est pas ; groupe concurrency', () => {
  const wf = code('release-plugin.yml');
  assert.match(wf, /--title "Vision \$version" --notes-file notes\.md --latest\b(?!=)/);
  assert.match(wf, /gh release edit plugin-essai --notes-file notes\.md --latest=false/);
  assert.match(wf, /--prerelease --latest=false/);
  assert.match(wf, /concurrency:\n\s+group: release-plugin\n\s+cancel-in-progress: false/);
});

test('les deux workflows ont des groupes concurrency distincts (une file d\'attente ne perd pas l\'autre publication)', () => {
  const g = (f) => code(f).match(/group: (\S+)/)[1];
  assert.notEqual(g('release-plugin.yml'), g('release-projet-modele.yml'));
});

test('mission 028 : aucun ancien nom de fichier publié dans les workflows ; notes de mise à jour à la main', () => {
  for (const f of ['release-plugin.yml', 'release-projet-modele.yml']) {
    assert.doesNotMatch(code(f), /dist\/vision\.zip|vision-projet-modele|premiere-installation/, f);
  }
  const notes = code('release-projet-modele.yml');
  assert.match(notes, /Mise à jour d'un appareil déjà en service : projet-vision-mise-a-jour\.zip \(vision\.qgz seul\), à la main/);
  assert.match(notes, /câble USB/);
  assert.match(notes, /Pas de flashcode pour la mise à jour/);
  assert.doesNotMatch(notes, /flashcodes\.mjs[^\n]*mise-a-jour/);
});

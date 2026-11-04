// Mission 023 : le workflow de préversion du prototype n° 2 (on lit le YAML : la logique est dedans).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const wf = readFileSync(join(RACINE, '.github', 'workflows', 'release-prototype-2.yml'), 'utf8').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
const autre = (f) => readFileSync(join(RACINE, '.github', 'workflows', f), 'utf8').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

test('prototype 2 : déclenché par push sur mission/023-prototype-2 seulement', () => {
  assert.match(wf, /branches: \['mission\/023-prototype-2'\]/);
  assert.doesNotMatch(wf, /branches:.*main/);
});

test('prototype 2 : préversion prototype-2, jamais « latest »', () => {
  assert.match(wf, /gh release create prototype-2 /);
  assert.match(wf, /--prerelease --latest=false/);
  assert.match(wf, /gh release edit prototype-2 --notes-file notes\.md --prerelease --latest=false/);
  assert.doesNotMatch(wf, /--latest(?!=false)/);
  assert.doesNotMatch(wf, /plugin-v/);
});

test('prototype 2 : groupe concurrency propre, distinct des trois autres workflows', () => {
  assert.match(wf, /concurrency:\n\s+group: release-prototype-2\n\s+cancel-in-progress: false/);
  for (const f of ['release-plugin.yml', 'release-projet-modele.yml', 'release-prototype.yml']) {
    const g = autre(f).match(/group: (\S+)/);
    assert.notEqual(g && g[1], 'release-prototype-2', f);
  }
});

test('prototype 2 : tests, empaquetage, quatre fichiers publiés', () => {
  assert.match(wf, /run: node --test/);
  assert.match(wf, /node prototype-2\/empaqueter\.mjs dist/);
  for (const f of ['cerf-prototype-2.zip', 'cerf-essai-2.zip', 'essai-styles.zip', 'essai-q3.gpkg']) assert.ok(wf.includes(`dist/${f}`), f);
});

test('prototype 2 : ogrinfo seulement si gdal-bin est installé, sans bloquer la publication sinon', () => {
  assert.match(wf, /id: gdal\n\s+continue-on-error: true\n\s+run: timeout 90 sudo apt-get install/);
  assert.match(wf, /if: steps\.gdal\.outcome == 'success'/);
  assert.match(wf, /ogrinfo -ro -al -so Parcelles_q3\.gpkg/);
  assert.match(wf, /grep -q 'layer_styles'/);
});

test('prototype 2 : les notes écrivent le sha du commit empaqueté', () => {
  assert.match(wf, /Commit empaqueté : \$GITHUB_SHA/);
});

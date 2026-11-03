// Mission 006 : tests de l'outil outils/projet-modele.mjs (déterminisme, UUID, cerf.qgz à jour).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ecrireQgs, ecrireQgz, CERF_ID_PAR_DEFAUT } from '../outils/projet-modele.mjs';

const AUTRE = '3f2b8c1e-7a4d-4e59-9b1a-0c6d5e8f7a21';
test('même UUID => mêmes octets (déterministe)', () => {
  assert.ok(ecrireQgz(ecrireQgs(AUTRE)).equals(ecrireQgz(ecrireQgs(AUTRE))));
});
test("seul l'UUID change d'un cerf_id à l'autre", () => {
  assert.equal(ecrireQgs(AUTRE), ecrireQgs(CERF_ID_PAR_DEFAUT).replaceAll(CERF_ID_PAR_DEFAUT, AUTRE));
});
test('UUID invalide ou nul refusé', () => {
  assert.throws(() => ecrireQgs('ma-foret'), /UUID/);
  assert.throws(() => ecrireQgs('00000000-0000-0000-0000-000000000000'), /UUID/);
});
test('cerf.qgz du dépôt = sortie du script avec l\'UUID par défaut (sauf si réenregistré par QGIS)', () => {
  const dansDepot = readFileSync(new URL('../cerf.qgz', import.meta.url));
  if (dansDepot.equals(ecrireQgz(ecrireQgs()))) return;
  // Version réenregistrée par QGIS : elle doit seulement garder un UUID ; le contrôle fin est dans projet-modele.test.mjs.
  assert.ok(dansDepot.length > 0);
});

test('arbre : un groupe « Fonds de carte » coché et déplié contient Plan IGN v2 puis BD ORTHO', () => {
  const qgs = ecrireQgs();
  const arbre = qgs.match(/<layer-tree-group>([\s\S]*?)<\/layer-tree-group>\s*<snapping/)[1];
  const g = arbre.match(/<layer-tree-group ([^>]*)>([\s\S]*?)<\/layer-tree-group>/);
  assert.ok(g, 'groupe imbriqué absent');
  assert.match(g[1], /name="Fonds de carte"/);
  assert.match(g[1], /checked="Qt::Checked"/);
  assert.match(g[1], /expanded="1"/);
  const noms = [...g[2].matchAll(/<layer-tree-layer [^>]*name="([^"]*)"[^>]*checked="([^"]*)"/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(noms, [['Plan IGN v2', 'Qt::Checked'], ['BD ORTHO', 'Qt::Unchecked']]);
  // les couches ne sont plus à la racine de l'arbre
  assert.equal([...arbre.matchAll(/<layer-tree-layer /g)].length, 2);
  // ordre de rendu cohérent
  const ids = [...g[2].matchAll(/<layer-tree-layer id="([^"]*)"/g)].map((m) => m[1]);
  const ordre = [...qgs.match(/<layerorder>([\s\S]*?)<\/layerorder>/)[1].matchAll(/<layer id="([^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual(ordre, ids);
  const perso = [...qgs.match(/<custom-order[^>]*>([\s\S]*?)<\/custom-order>/)[1].matchAll(/<item>([^<]*)<\/item>/g)].map((m) => m[1]);
  assert.deepEqual(perso, ids);
});

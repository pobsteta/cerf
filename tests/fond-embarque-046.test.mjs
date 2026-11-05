// Mission 046 : fond embarqué fabriqué par QFieldSync (voie B). Sources : libqfieldsync master, project.py l. 36-39 et 60-62
// (clés et défauts), offline_converter.py l. 686-695 (native:tilesxyzmbtiles : EXTENT, ZOOM_MIN, ZOOM_MAX, TILE_SIZE) ;
// QGIS qgsmapthemecollection.cpp (visibility-preset) et qgsprojectproperty.cpp (types bool, int, QString) ;
// arbitrages de Pascal du 5 novembre 2026 : zoom max 17, Plan IGN v2 + cadastre, OSM et OpenTopoMap exclus.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { ecrireQgs, ecrireQgz, GROUPE_FONDS, FONDS, THEME_FOND, PROPRIETES_QFIELDSYNC } from '../outils/projet-modele.mjs';

const qgs = ecrireQgs();
const theme = /<visibility-preset name="([^"]*)"[^>]*>([\s\S]*?)<\/visibility-preset>/.exec(qgs);
const idDe = (nom) => new RegExp(`<layer-tree-layer id="([^"]+)" name="${nom}"`).exec(qgs)[1];
const prop = (cle) => new RegExp(`<qfieldsync>[\\s\\S]*<${cle} type="(\\w+)">([^<]*)</${cle}>[\\s\\S]*</qfieldsync>`).exec(qgs);

test('le thème « Fond embarqué » existe, une seule fois', () => {
  assert.equal(THEME_FOND, 'Fond embarqué');
  assert.equal(qgs.match(/<visibility-preset /g).length, 1);
  assert.equal(theme[1], 'Fond embarqué');
});
test('le thème montre Plan IGN v2 et Cadastre visibles, et rien d\'autre', () => {
  const couches = [...theme[2].matchAll(/<layer id="([^"]+)" visible="(\d)" style="default"\/>/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(couches.sort(), [[idDe('Plan IGN v2'), '1'], [idDe('Cadastre'), '1']].sort());
  assert.equal(theme[2].match(/<layer /g).length, 2);
});
test('OpenStreetMap, OpenTopoMap et BD ORTHO sont absents du thème', () => {
  for (const nom of ['OpenStreetMap', 'OpenTopoMap', 'BD ORTHO', 'Saisie terrain']) {
    assert.ok(!theme[2].includes(idDe(nom)), nom);
  }
});
test('les identifiants du thème existent comme couches du projet', () => {
  for (const m of theme[2].matchAll(/<layer id="([^"]+)"/g)) assert.ok(qgs.includes(`<id>${m[1]}</id>`));
});
test('propriétés QFieldSync : noms, types et valeurs (zoom max 17)', () => {
  const attendu = { createBaseMap: ['bool', 'true'], baseMapType: ['QString', 'mapTheme'], baseMapTheme: ['QString', 'Fond embarqué'],
    baseMapTileSize: ['int', '256'], baseMapTilesMinZoomLevel: ['int', '13'], baseMapTilesMaxZoomLevel: ['int', '17'] };
  for (const [cle, [type, valeur]] of Object.entries(attendu)) {
    const m = prop(cle);
    assert.ok(m, cle);
    assert.deepEqual([m[1], m[2]], [type, valeur], cle);
  }
  assert.equal(PROPRIETES_QFIELDSYNC.length, 6);
});
test('les propriétés sont dans <properties>, sous <qfieldsync>, et le thème nomme celui de baseMapTheme', () => {
  const bloc = /<properties>([\s\S]*)<\/properties>/.exec(qgs)[1];
  assert.match(bloc, /<qfieldsync>/);
  assert.equal(prop('baseMapTheme')[2], theme[1]);
});
test('zoom min <= zoom max, tous deux dans 0 à 19 (limite de la Géoplateforme)', () => {
  const [mn, mx] = [+prop('baseMapTilesMinZoomLevel')[2], +prop('baseMapTilesMaxZoomLevel')[2]];
  assert.ok(0 <= mn && mn <= mx && mx <= 19);
});
test('le thème et les propriétés ne changent ni les fonds XYZ ni la variable cerf_id', () => {
  assert.equal(FONDS.map((f) => f.nom).join(','), 'Cadastre,Plan IGN v2,OpenStreetMap,OpenTopoMap,BD ORTHO');
  assert.match(qgs, /<value>ebad8ff8-577e-48bc-9489-6bab871230c2<\/value>/);
  assert.match(qgs, /<layer-tree-layer id="[^"]+" name="Saisie terrain"/);
});
test('aucune clé d\'API dans le projet (ni apikey, ni key=, ni token)', () => {
  assert.doesNotMatch(qgs, /apikey|[?&;]key=|token|secret/i);
});
test('cerf.qgz est déterministe et celui du dépôt est à jour (thème et propriétés compris)', () => {
  assert.ok(ecrireQgz(ecrireQgs()).equals(ecrireQgz(ecrireQgs())));
  assert.ok(readFileSync(new URL('../cerf.qgz', import.meta.url)).equals(ecrireQgz(ecrireQgs())));
  const dansDepot = readFileSync(new URL('../cerf.qgz', import.meta.url));
  const n = dansDepot.readUInt16LE(26 ) + 30;
  assert.match(inflateRawSync(dansDepot.subarray(n, n + dansDepot.readUInt32LE(18))).toString('utf8'), /<visibility-preset name="Fond embarqué" has-checked-group-info="1">/);
});
test('D1 (Pascal, 5 novembre 2026) : cerf.qgz ne déclare pas basemap.mbtiles (c\'est le plugin, mission 048)', () => {
  assert.ok(!qgs.includes('basemap.mbtiles'));
  assert.ok(!qgs.includes('basemap'.concat('.mbtiles')));
});
test('le thème recoche le groupe « Fonds de carte » (has-checked-group-info, QGIS 3a92eb3)', () => {
  assert.match(qgs, /<visibility-preset name="Fond embarqué" has-checked-group-info="1">/);
  assert.match(theme[2], new RegExp(`<checked-group-nodes>\\s*<checked-group-node id="${GROUPE_FONDS}"/>\\s*</checked-group-nodes>`));
  assert.match(qgs, new RegExp(`<layer-tree-group name="${GROUPE_FONDS}" `));
});

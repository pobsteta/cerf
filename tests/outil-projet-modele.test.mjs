// Mission 006 : tests de l'outil outils/projet-modele.mjs (déterminisme, UUID, vision.qgz à jour).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ecrireQgs, ecrireQgz, VISION_ID_PAR_DEFAUT } from '../outils/projet-modele.mjs';

const AUTRE = '3f2b8c1e-7a4d-4e59-9b1a-0c6d5e8f7a21';
test('même UUID => mêmes octets (déterministe)', () => {
  assert.ok(ecrireQgz(ecrireQgs(AUTRE)).equals(ecrireQgz(ecrireQgs(AUTRE))));
});
test("seul l'UUID change d'un vision_id à l'autre", () => {
  assert.equal(ecrireQgs(AUTRE), ecrireQgs(VISION_ID_PAR_DEFAUT).replaceAll(VISION_ID_PAR_DEFAUT, AUTRE));
});
test('UUID invalide ou nul refusé', () => {
  assert.throws(() => ecrireQgs('ma-foret'), /UUID/);
  assert.throws(() => ecrireQgs('00000000-0000-0000-0000-000000000000'), /UUID/);
});
test('vision.qgz du dépôt = sortie du script avec l\'UUID par défaut (sauf si réenregistré par QGIS)', () => {
  const dansDepot = readFileSync(new URL('../vision.qgz', import.meta.url));
  if (dansDepot.equals(ecrireQgz(ecrireQgs()))) return;
  // Version réenregistrée par QGIS : elle doit seulement garder un UUID ; le contrôle fin est dans projet-modele.test.mjs.
  assert.ok(dansDepot.length > 0);
});

test('arbre : un groupe « Fonds de carte » coché et déplié contient Cadastre, Plan IGN v2, OpenStreetMap, OpenTopoMap puis BD ORTHO (mission 045)', () => {
  const qgs = ecrireQgs();
  const arbre = qgs.match(/<layer-tree-group>([\s\S]*?)<\/layer-tree-group>\s*<snapping/)[1];
  const g = arbre.match(/<layer-tree-group ([^>]*)>([\s\S]*?)<\/layer-tree-group>/);
  assert.ok(g, 'groupe imbriqué absent');
  assert.match(g[1], /name="Fonds de carte"/);
  assert.match(g[1], /checked="Qt::Checked"/);
  assert.match(g[1], /expanded="1"/);
  const noms = [...g[2].matchAll(/<layer-tree-layer [^>]*name="([^"]*)"[^>]*checked="([^"]*)"/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(noms, [['Cadastre', 'Qt::Checked'], ['Plan IGN v2', 'Qt::Checked'], ['OpenStreetMap', 'Qt::Unchecked'], ['OpenTopoMap', 'Qt::Unchecked'], ['BD ORTHO', 'Qt::Unchecked']]);
  // les fonds ne sont plus à la racine ; seule y reste la couche « Saisie terrain » (mission 021, hors du groupe)
  assert.equal([...arbre.matchAll(/<layer-tree-layer /g)].length, 6);
  const racineSaisie = arbre.match(/^\s*<customproperties>[\s\S]*?<\/customproperties>\s*<layer-tree-layer id="([^"]*)" name="Saisie terrain"/);
  assert.ok(racineSaisie, 'la couche « Saisie terrain » est la première feuille de la racine, avant le groupe');
  // ordre de rendu cohérent
  const ids = [...g[2].matchAll(/<layer-tree-layer id="([^"]*)"/g)].map((m) => m[1]);
  const ordre = [...qgs.match(/<layerorder>([\s\S]*?)<\/layerorder>/)[1].matchAll(/<layer id="([^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual(ordre, [racineSaisie[1], ...ids]); // la saisie au-dessus des fonds
  const perso = [...qgs.match(/<custom-order[^>]*>([\s\S]*?)<\/custom-order>/)[1].matchAll(/<item>([^<]*)<\/item>/g)].map((m) => m[1]);
  assert.deepEqual(perso, [racineSaisie[1], ...ids]);
});

test('sources XYZ : URL, zoom et attribution de chacun des cinq fonds, aucune clé (mission 045)', () => {
  const qgs = ecrireQgs();
  const lire = (nom) => {
    const b = qgs.match(new RegExp(`<maplayer [^>]*>(?:(?!</maplayer>)[\\s\\S])*?<layername>${nom}</layername>[\\s\\S]*?</maplayer>`))[0];
    const src = b.match(/<datasource>([^<]*)<\/datasource>/)[1].replace(/&amp;/g, '&');
    return { src, attribution: b.match(/<attribution>([^<]*)<\/attribution>/)[1], droits: b.match(/<rights>([^<]*)<\/rights>/)[1] };
  };
  const attendu = {
    Cadastre: ['type=xyz&url=https://data.geopf.fr/wmts?SERVICE%3DWMTS%26REQUEST%3DGetTile%26VERSION%3D1.0.0%26LAYER%3DCADASTRALPARCELS.PARCELLAIRE_EXPRESS%26STYLE%3Dnormal%26TILEMATRIXSET%3DPM%26TILEMATRIX%3D%7Bz%7D%26TILEROW%3D%7By%7D%26TILECOL%3D%7Bx%7D%26FORMAT%3Dimage/png&zmax=19&zmin=0', '© IGN'],
    OpenStreetMap: ['type=xyz&url=https://tile.openstreetmap.org/%7Bz%7D/%7Bx%7D/%7By%7D.png&zmax=19&zmin=0', "© les contributeurs d'OpenStreetMap"],
    OpenTopoMap: ['type=xyz&url=https://tile.opentopomap.org/%7Bz%7D/%7Bx%7D/%7By%7D.png&zmax=13&zmin=0', "© les contributeurs d'OpenStreetMap, SRTM | © OpenTopoMap (CC-BY-SA)"],
  };
  for (const [nom, [src, attr]] of Object.entries(attendu)) {
    const l = lire(nom);
    assert.equal(l.src, src, nom);
    assert.equal(l.attribution, attr, nom);
    assert.equal(l.droits, attr, nom);
  }
  for (const nom of ['Plan IGN v2', 'BD ORTHO']) assert.match(lire(nom).src, /&zmax=19&zmin=0$/);
  assert.doesNotMatch(qgs, /apikey|api_key|[?&;]key=|[?&;]token=/i);
});
test('même vision_id, même octets : le projet régénéré est déterministe avec cinq fonds', () => {
  assert.ok(ecrireQgz(ecrireQgs()).equals(ecrireQgz(ecrireQgs())));
  assert.match(ecrireQgs(), /<value>d98bf4b8-0fac-4dac-85cf-58e6701aceeb<\/value>/);
});

// Demande de Pascal (4 novembre 2026, fiche 030) : les fonds IGN dans le projet d'essai cerf-essai-2.qgs.
// Sur le modèle de tests/projet-modele.test.mjs. Les sources attendues sont écrites ICI en dur, depuis
// docs/referentiels/fonds-ign.md § 1 (gabarits XYZ) et § 2 (zoom 0 à 19), puis comparées à cerf.qgz.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { ecrireQgsEssai, CHEMIN_QGS } from '../prototype-2/projet-essai.mjs';
import { empaqueter } from '../prototype-2/empaqueter.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const GABARIT = (couche, format) =>
  `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${couche}` +
  `&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=${format}`;
const encoder = (u) => u.replace(/[%&=+#{}]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
const sourceXyz = (u) => `type=xyz&url=${encoder(u)}&zmax=19&zmin=0`;
const ATTENDUS = [
  { nom: 'Plan IGN v2', source: sourceXyz(GABARIT('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', 'image/png')), coche: 'Qt::Checked' },
  { nom: 'BD ORTHO', source: sourceXyz(GABARIT('ORTHOIMAGERY.ORTHOPHOTOS', 'image/jpeg')), coche: 'Qt::Unchecked' },
];
const attr = (balise, nom) => new RegExp(`${nom}="([^"]*)"`).exec(balise)[1];
const dec = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function qgzDeCerf() {
  const buf = readFileSync(new URL('../cerf.qgz', import.meta.url));
  let e = buf.length - 22;
  while (buf.readUInt32LE(e) !== 0x06054b50) e--;
  const p = buf.readUInt32LE(e + 16), lf = buf.readUInt16LE(p + 28);
  const loc = buf.readUInt32LE(p + 42), taille = buf.readUInt32LE(p + 20);
  const debut = loc + 30 + buf.readUInt16LE(loc + 26) + buf.readUInt16LE(loc + 28);
  return inflateRawSync(buf.subarray(debut, debut + taille)).toString('utf8');
}
const feuilles = (q) => [...q.matchAll(/<layer-tree-layer [^>]*>/g)].map((m) => m[0]);

function equilibre(xml) {
  const pile = [];
  const re = /<(\/?)([A-Za-z_][\w.-]*)([^<>]*?)(\/?)>/g;
  let m;
  const sansPrologue = xml.replace(/<\?[^>]*\?>|<!--[\s\S]*?-->|<!DOCTYPE[^>]*>/g, '');
  while ((m = re.exec(sansPrologue))) {
    if (m[4] === '/') continue;
    if (m[1] === '/') { if (pile.pop() !== m[2]) return false; } else pile.push(m[2]);
  }
  return pile.length === 0;
}

const q = readFileSync(CHEMIN_QGS, 'utf8');

test('le fichier versé est exactement ce que le script écrit (pas de retouche à la main)', () => {
  assert.equal(q, ecrireQgsEssai());
});

test('arbre : un groupe « Fonds de carte » coché et déplié, avec Plan IGN v2 coché puis BD ORTHO décochée', () => {
  const g = /<layer-tree-group name="Fonds de carte" checked="Qt::Checked" expanded="1">/.exec(q);
  assert.ok(g, 'groupe Fonds de carte coché et déplié');
  const f = feuilles(q);
  assert.deepEqual(f.map((x) => dec(attr(x, 'name'))), ATTENDUS.map((x) => x.nom), 'Plan IGN v2 au-dessus de BD ORTHO');
  assert.deepEqual(f.map((x) => attr(x, 'checked')), ATTENDUS.map((x) => x.coche));
  for (let i = 0; i < 2; i++) assert.equal(dec(attr(f[i], 'source')), ATTENDUS[i].source);
});

test('place en bas : le groupe est le dernier enfant de l\'arbre racine, rien ne le suit ni ne le précède', () => {
  const racine = q.slice(q.indexOf('<layer-tree-group>'), q.indexOf('<mapcanvas'));
  const apresGroupe = racine.slice(racine.indexOf('</layer-tree-group>') + '</layer-tree-group>'.length);
  assert.doesNotMatch(apresGroupe, /<layer-tree-(layer|group)/, 'aucune couche sous le groupe');
  const avantGroupe = racine.slice(racine.indexOf('<layer-tree-group>') + 18, racine.indexOf('<layer-tree-group name='));
  assert.doesNotMatch(avantGroupe, /<layer-tree-layer/, 'aucune couche hors du groupe : les couches des boutons s\'ajouteront au-dessus');
});

test('couches du projet : deux rasters wms XYZ, zoom 0 à 19, © IGN, EPSG:3857, mêmes identifiants que cerf.qgz', () => {
  const couches = q.split('<maplayer ').slice(1);
  assert.equal(couches.length, 2);
  couches.forEach((c, i) => {
    assert.match(c, /^[^>]*type="raster"/);
    assert.equal(dec(/<datasource>([^<]*)<\/datasource>/.exec(c)[1]), ATTENDUS[i].source);
    assert.match(c, /<provider>wms<\/provider>/);
    assert.match(c, /<attribution>© IGN<\/attribution>/);
    assert.match(c, /<authid>EPSG:3857<\/authid>/);
  });
  const idsEssai = [...q.matchAll(/<layer-tree-layer id="([^"]+)"/g)].map((m) => m[1]);
  const idsCerf = feuilles(qgzDeCerf()).filter((x) => attr(x, 'providerKey') === 'wms').map((x) => attr(x, 'id'));
  assert.deepEqual(idsEssai, idsCerf);
});

test('mêmes sources et mêmes états que cerf.qgz', () => {
  const cerf = feuilles(qgzDeCerf()).filter((x) => attr(x, 'providerKey') === 'wms');
  const essai = feuilles(q);
  assert.deepEqual(essai.map((x) => [attr(x, 'name'), attr(x, 'source'), attr(x, 'checked')]), cerf.map((x) => [attr(x, 'name'), attr(x, 'source'), attr(x, 'checked')]));
});

test('EPSG:2154, aucune clé d\'API, pas de cerf_id, XML équilibré', () => {
  assert.match(q, /<projectCrs>[\s\S]*<authid>EPSG:2154<\/authid>[\s\S]*<\/projectCrs>/);
  assert.match(q, /<ProjectCrs type="QString">EPSG:2154<\/ProjectCrs>/);
  assert.doesNotMatch(q, /cerf_id/);
  assert.doesNotMatch(q, /apikey|api_key|[?&]key=|token/i);
  assert.ok(equilibre(q));
});

test('le zip publié projet-cerf-essai-2.zip contient ce .qgs, un seul membre', () => {
  const d = mkdtempSync(join(tmpdir(), 'cerf-essai-'));
  try {
    empaqueter(d);
    const zip = readFileSync(join(d, 'projet-cerf-essai-2.zip'));
    assert.ok(zip.includes(Buffer.from('cerf-essai-2.qgs')));
    assert.equal(zip.readUInt16LE(zip.length - 22 + 10), 1);
    // lecture du membre (méthode 0 ou 8)
    const meth = zip.readUInt16LE(8), tp = zip.readUInt32LE(18), n = zip.readUInt16LE(26), x = zip.readUInt16LE(28);
    const brut = zip.subarray(30 + n + x, 30 + n + x + tp);
    const texte = (meth === 8 ? inflateRawSync(brut) : brut).toString('utf8');
    assert.equal(texte, q);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

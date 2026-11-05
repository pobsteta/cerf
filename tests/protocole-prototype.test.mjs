// Mission 003 : tests du protocole d'essai du prototype n° 1.
// Ils vérifient la FORME du protocole (tests/recette/prototype-1.md) et les fichiers
// d'essai. Ils ne prouvent rien sur QField : le geste réel est fait par Pascal sur le
// Samsung. Sources : docs/spec.md § 3.3, § 6, § 8 n° 5, § 9 ; ADR 0003 ; ADR 0005.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ici = dirname(fileURLToPath(import.meta.url));
const PROTOCOLE = join(ici, 'recette', 'prototype-1.md');
const ESSAI = join(ici, 'recette', 'essai');
const ZIP = join(ESSAI, 'essai.zip');
const MODULE = join(ESSAI, 'module-essai.mjs');

// Contenu exact attendu du zip d'essai, 9 entrées.
const ENTREES = [
  'points_essai.geojson',
  'sous-dossier/notes.txt',
  'sous-dossier/shape_essai.cpg',
  'sous-dossier/shape_essai.dbf',
  'sous-dossier/shape_essai.prj',
  'sous-dossier/shape_essai.qmd',
  'sous-dossier/shape_essai.qml',
  'sous-dossier/shape_essai.shp',
  'sous-dossier/shape_essai.shx',
];

function lireZip(chemin) {
  const b = readFileSync(chemin);
  let eocd = -1;
  for (let i = b.length - 22; i >= 0; i--) if (b.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  assert.ok(eocd >= 0, 'fin de répertoire central introuvable');
  const n = b.readUInt16LE(eocd + 10);
  let p = b.readUInt32LE(eocd + 16);
  const out = [];
  for (let k = 0; k < n; k++) {
    assert.equal(b.readUInt32LE(p), 0x02014b50);
    const ln = b.readUInt16LE(p + 28);
    out.push(b.toString('utf8', p + 46, p + 46 + ln));
    p += 46 + ln + b.readUInt16LE(p + 30) + b.readUInt16LE(p + 32);
  }
  return out;
}

const texte = () => readFileSync(PROTOCOLE, 'utf8');
function questions() {
  const parts = texte().split(/^## /m).filter((p) => /^Question [1-9] /.test(p));
  return parts.map((p) => ({ titre: p.split('\n')[0], corps: p }));
}
// Ligne de geste : | n | geste | résultat attendu | ☐ |  (4 cellules, dernière = case « vu »)
function gestes(corps) {
  return corps.split('\n').filter((l) => /^\|\s*\d+\s*\|/.test(l)).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
}

test('le protocole existe', () => {
  assert.ok(existsSync(PROTOCOLE), 'tests/recette/prototype-1.md absent');
});

test('neuf questions exactement, dans l\'ordre : lister, copier, effacer, module .mjs, Shapefile, .qml, GeoTIFF, Android 11, CP437', () => {
  const q = questions();
  assert.equal(q.length, 9);
  assert.match(q[0].titre, /^Question 1 .*list/i);
  assert.match(q[1].titre, /^Question 2 .*copi/i);
  assert.match(q[2].titre, /^Question 3 .*effac/i);
  assert.match(q[3].titre, /^Question 4 .*\.mjs/i);
  assert.match(q[4].titre, /^Question 5 .*Shapefile/i);
  assert.match(q[5].titre, /^Question 6 .*\.qml/i);
  assert.match(q[6].titre, /^Question 7 .*GeoTIFF.*200 Mo/i);
  assert.match(q[7].titre, /^Question 8 .*Android 11/i);
  assert.match(q[8].titre, /^Question 9 .*CP437/i);
});

test('chaque question a au moins un geste ; chaque geste a un résultat attendu et une case « vu » vide', () => {
  for (const q of questions()) {
    const g = gestes(q.corps);
    assert.ok(g.length >= 1, `${q.titre} : aucun geste`);
    for (const cellules of g) {
      assert.equal(cellules.length, 4, `${q.titre} : ligne à 4 cellules attendue`);
      const [num, geste, attendu, vu] = cellules;
      assert.ok(geste.length > 5, `${q.titre} geste ${num} : texte du geste vide`);
      assert.ok(attendu.length >= 1,`${q.titre} geste ${num} : résultat attendu vide`);
      assert.equal(vu, '☐', `${q.titre} geste ${num} : la case « vu » doit être ☐ (vide)`);
    }
  }
});

test('chaque question dit « Si non » et renvoie à la bonne ligne de la spec § 9', () => {
  const q = questions();
  assert.match(q[0].corps, /Si non/);
  assert.match(q[0].corps, /§ 9,? n° 1/);
  assert.match(q[1].corps, /Si non/);
  assert.match(q[1].corps, /§ 9,? n° 1/);
  assert.match(q[2].corps, /Si non/);
  assert.match(q[2].corps, /§ 9,? n° 2/);
  assert.match(q[3].corps, /Si non/);
  for (let i = 4; i < 9; i++) assert.match(q[i].corps, /Si non/, `${q[i].titre} : « Si non » absent`);
  assert.match(q[6].corps, /ADR 0003/);
  assert.match(q[6].corps, /décompresser/);
  assert.match(q[8].corps, /QGIS ou 7-Zip/);
});

test('copie : le dossier cible est celui de la spec § 3.3, hors du dossier projet', () => {
  const corps = questions()[1].corps;
  assert.ok(corps.includes('Imported Datasets/vision/<vision_id>/'));
  assert.match(corps, /hors du dossier projet/);
});

test('effacement : le fichier visé est un .zip (FileUtils.deleteFiles le refuse, ADR 0003)', () => {
  assert.match(questions()[2].corps, /\.zip/);
});

test('le protocole se fait sans réseau et note l\'appareil, la version de QField et la date', () => {
  const t = texte();
  assert.match(t, /mode avion/i);
  assert.match(t, /Samsung/);
  assert.match(t, /version de QField/i);
  assert.match(t, /Android/);
  assert.match(t, /Date de l'essai/i);
});

test('le protocole nomme chaque entrée du zip d\'essai et le zip lui-même', () => {
  const t = texte();
  assert.ok(t.includes('essai.zip'));
  for (const e of ENTREES) assert.ok(t.includes(e), `entrée non nommée dans le protocole : ${e}`);
  assert.match(t, /\*\*9\*\*/);
  assert.doesNotMatch(t, /8 entrées/);
});

test('le protocole ne contient ni clé, ni jeton, ni mot de passe', () => {
  assert.doesNotMatch(texte(), /apikey|api_key|token|password|mot de passe\s*:/i);
});

test('zip d\'essai : existe, ≤ 4096 octets, 9 entrées exactement', () => {
  assert.ok(existsSync(ZIP));
  assert.ok(statSync(ZIP).size <= 4096, `taille ${statSync(ZIP).size}`);
  assert.deepEqual(lireZip(ZIP).sort(), ENTREES);
});

test('GeoJSON d\'essai : membre crs CRS84, un point, longitude puis latitude en métropole', () => {
  const b = readFileSync(ZIP);
  let p = 0; let json = null;
  while (b.readUInt32LE(p) === 0x04034b50) {
    const meth = b.readUInt16LE(p + 8); const cs = b.readUInt32LE(p + 18);
    const ln = b.readUInt16LE(p + 26); const le = b.readUInt16LE(p + 28);
    const nom = b.toString('utf8', p + 30, p + 30 + ln);
    const data = b.subarray(p + 30 + ln + le, p + 30 + ln + le + cs);
    if (nom === 'points_essai.geojson') json = (meth === 0 ? data : inflateRawSync(data)).toString('utf8');
    p += 30 + ln + le + cs;
  }
  assert.ok(json, 'points_essai.geojson introuvable');
  const g = JSON.parse(json);
  assert.equal(g.crs.properties.name, 'urn:ogc:def:crs:OGC:1.3:CRS84');
  assert.equal(g.features.length, 1);
  const [lon, lat] = g.features[0].geometry.coordinates;
  assert.ok(lon > -5 && lon < 10 && lat > 41 && lat < 52, 'point hors France métropolitaine ou axes inversés');
});

test('la taille de essai.zip écrite dans le protocole est celle du fichier', () => {
  const taille = statSync(ZIP).size;
  assert.ok(texte().includes(`${taille} octets`), `le protocole doit dire ${taille} octets`);
});

test('module d\'essai .mjs : ni .pragma ni .import (ADR 0005), importable par Node, valeur connue', async () => {
  assert.ok(existsSync(MODULE));
  const src = readFileSync(MODULE, 'utf8');
  assert.doesNotMatch(src, /\.pragma|\.import/);
  const m = await import(MODULE);
  assert.equal(m.somme(2, 3), 5);
  assert.equal(m.SIGNATURE, 'vision-prototype-1');
  assert.match(texte(), /vision-prototype-1/);
  assert.match(texte(), /module-essai\.mjs/);
});

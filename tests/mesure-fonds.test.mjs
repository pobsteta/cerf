// Mission 019 : tests des pièces brutes des fonds IGN (docs/referentiels/brut/).
// Ils vérifient que les pièces existent, que chaque tuile est une vraie image non vide,
// et que chaque pièce porte sa date et son URL exacte. Hors réseau : la mesure elle-même
// se refait avec outils/mesure-fonds.sh. Sources : docs/spec.md § 3.4 ; ADR 0002.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const BRUT = join(racine, 'docs', 'referentiels', 'brut');
const p = (f) => join(BRUT, f);

const PIECES = [
  'getcapabilities.xml', 'getcapabilities.entetes.txt',
  'tuile-planignv2.png', 'tuile-planignv2.entetes.txt',
  'tuile-orthophotos.jpg', 'tuile-orthophotos.entetes.txt',
  'mesure-dates.txt',
];

test('toutes les pièces brutes existent et ne sont pas vides', () => {
  for (const f of PIECES) {
    assert.ok(existsSync(p(f)), `${f} manque`);
    assert.ok(statSync(p(f)).size > 0, `${f} est vide`);
  }
});

test('le script de mesure existe', () => {
  assert.ok(existsSync(join(racine, 'outils', 'mesure-fonds.sh')));
});

test('GetCapabilities : XML WMTS déclarant les deux couches et la matrice PM', () => {
  const x = readFileSync(p('getcapabilities.xml'), 'utf8');
  assert.match(x, /<Capabilities/);
  for (const l of ['GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', 'ORTHOIMAGERY.ORTHOPHOTOS']) {
    assert.ok(x.includes(`<ows:Identifier>${l}</ows:Identifier>`), `${l} absente`);
  }
  assert.ok(x.includes('<ows:Identifier>PM</ows:Identifier>'), 'matrice PM absente');
});

// Type et dimensions d'une image PNG (IHDR) ou JPEG (marqueur SOFn).
function dimensions(buf) {
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { type: 'png', l: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      assert.equal(buf[i], 0xff, 'marqueur JPEG attendu');
      const m = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) {
        return { type: 'jpeg', h: buf.readUInt16BE(i + 5), l: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  return { type: 'inconnu' };
}

for (const [fichier, type] of [['tuile-planignv2.png', 'png'], ['tuile-orthophotos.jpg', 'jpeg']]) {
  test(`${fichier} est une image ${type} 256 x 256 non vide`, () => {
    const b = readFileSync(p(fichier));
    assert.ok(b.length > 1000, 'trop petite pour une tuile réelle');
    const d = dimensions(b);
    assert.equal(d.type, type);
    assert.equal(d.l, 256);
    assert.equal(d.h, 256);
  });
}

test('en-têtes : HTTP 200, type de contenu conforme, cache-control présent', () => {
  for (const [f, ct] of [['tuile-planignv2.entetes.txt', 'image/png'], ['tuile-orthophotos.entetes.txt', 'image/jpeg']]) {
    const e = readFileSync(p(f), 'utf8');
    assert.match(e, /HTTP\/2 200/);
    assert.match(e, new RegExp(`content-type: ${ct}`, 'i'));
    assert.match(e, /cache-control:/i, 'durée de cache à mesurer');
  }
});

test('mesure-dates : une ligne par pièce téléchargée, avec date UTC et URL exacte', () => {
  const lignes = readFileSync(p('mesure-dates.txt'), 'utf8').trim().split('\n');
  assert.equal(lignes.length, 3);
  const attendu = {
    'getcapabilities.xml': 'REQUEST=GetCapabilities',
    'tuile-planignv2.png': 'LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
    'tuile-orthophotos.jpg': 'LAYER=ORTHOIMAGERY.ORTHOPHOTOS',
  };
  for (const l of lignes) {
    const m = l.match(/^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ)\s+(\S+)\s+(https:\/\/data\.geopf\.fr\/wmts\?\S+)$/);
    assert.ok(m, `ligne mal formée : ${l}`);
    assert.ok(m[3].includes(attendu[m[2]]), `URL inattendue pour ${m[2]}`);
    assert.ok(!/key=|apikey|token/i.test(m[3]), 'aucune clé dans une URL');
  }
});

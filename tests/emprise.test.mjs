// Mission 002 : emprise de la France métropolitaine en Lambert 93 (EPSG:2154, x = Est, y = Nord).
// Valeurs : docs/referentiels/emprise-metropole.json, produit par outils/emprise.py.
// Le contour est versé (docs/referentiels/sources/metropole.geojson) : le test de relance l'utilise par défaut.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const chemin = new URL('../docs/referentiels/emprise-metropole.json', import.meta.url);
const ref = JSON.parse(readFileSync(chemin, 'utf8'));
const dans = (r, v) => v.x >= r.xmin && v.x <= r.xmax && v.y >= r.ymin && v.y <= r.ymax;

test('rectangle brut : valeurs mesurées, Lambert 93', () => {
  assert.deepEqual(ref.brute, { xmin: 99101, xmax: 1242436, ymin: 6046555, ymax: 7110480 });
  assert.equal(ref.crs, 'RGF93 v1 / Lambert-93');
});

test('rectangle élargi = brut +/- 10 km, marge ajoutée à part', () => {
  assert.equal(ref.marge_m, 10000);
  assert.deepEqual(ref.elargie, {
    xmin: ref.brute.xmin - 10000, xmax: ref.brute.xmax + 10000,
    ymin: ref.brute.ymin - 10000, ymax: ref.brute.ymax + 10000,
  });
});

test('Ouessant, Dunkerque, Menton, Bonifacio, Strasbourg sont dans les deux rectangles et dans le contour', () => {
  for (const n of ['Ouessant', 'Dunkerque', 'Menton', 'Bonifacio', 'Strasbourg']) {
    const v = ref.villes[n];
    assert.ok(dans(ref.brute, v), `${n} hors du rectangle brut`);
    assert.ok(dans(ref.elargie, v), `${n} hors du rectangle élargi`);
    assert.equal(v.dans_contour, true, `${n} hors du contour`);
  }
});

test('un point du terrain tombe au bon endroit : Dunkerque et Bonifacio en Lambert 93', () => {
  assert.deepEqual([ref.villes.Dunkerque.x, ref.villes.Dunkerque.y], [653805, 7102710]);
  assert.deepEqual([ref.villes.Bonifacio.x, ref.villes.Bonifacio.y], [1218236, 6055860]);
});

test('contrôle de sens : Jersey et Genève sont hors du contour de la terre ferme', () => {
  assert.equal(ref.villes.Jersey.dans_contour, false);
  assert.equal(ref.villes['Genève'].dans_contour, false);
});

test('limite connue : Jersey et Genève sont DANS le rectangle (un rectangle ne les écarte pas)', () => {
  for (const n of ['Jersey', 'Genève']) {
    assert.equal(dans(ref.brute, ref.villes[n]), true, n);
    assert.equal(dans(ref.elargie, ref.villes[n]), true, n);
  }
});

const script = new URL('../outils/emprise.py', import.meta.url).pathname;
const contourVerse = new URL('../docs/referentiels/sources/metropole.geojson', import.meta.url);

test('le script se relance sans argument (contour versé) et redonne les mêmes valeurs', () => {
  const r = spawnSync('python3', ['-I', script], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), ref);
});

test("le script sort en erreur si l'empreinte du contour diffère", () => {
  const dossier = mkdtempSync(join(tmpdir(), 'vision-contour-'));
  try {
    const faux = join(dossier, 'metropole.geojson');
    writeFileSync(faux, Buffer.concat([readFileSync(contourVerse), Buffer.from('\n')]));
    const r = spawnSync('python3', ['-I', script, faux], { encoding: 'utf8' });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /empreinte/);
    assert.equal(r.stdout, '');
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

test("le contour versé a l'empreinte annoncée par le résultat de référence", () => {
  const h = createHash('sha256').update(readFileSync(contourVerse)).digest('hex');
  assert.equal(h, ref.sha256_contour);
});

test('pyproj est fixé dans outils/requirements.txt, à la version du calcul', () => {
  const req = readFileSync(new URL('../outils/requirements.txt', import.meta.url), 'utf8');
  assert.ok(req.split('\n').includes(`pyproj==${ref.pyproj}`));
});

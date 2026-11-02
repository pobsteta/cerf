// Mission 002 : emprise de la France métropolitaine en Lambert 93 (EPSG:2154, x = Est, y = Nord).
// Valeurs : docs/referentiels/emprise-metropole.json, produit par outils/emprise.py.
// Le test de relance exige le contour (non versionné) : variable CERF_CONTOUR, sinon ignoré.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('le script se relance et redonne les mêmes valeurs', { skip: !process.env.CERF_CONTOUR && 'CERF_CONTOUR absent' }, () => {
  const r = spawnSync('python3', ['-I', new URL('../outils/emprise.py', import.meta.url).pathname, process.env.CERF_CONTOUR], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), ref);
});

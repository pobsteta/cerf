// Mission 035 : la variante tout en GeoJSON, essai-manuel-geojson.zip (outils/zip-essai-manuel.mjs).
// Contenu, reproductibilité, essai-manuel.zip inchangé d'un octet, règles du plugin (vision-styles.mjs) et contrôles
// d'import (vision-controles.mjs) en boîte noire, géométries égales à celles des Shapefile à 1 cm près, points ProdBois
// dans les parcelles 12 et 14. Lectures du zip, du Shapefile et projection refaites ici, à part de l'outil.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { inflateRawSync } from 'node:zlib';
import { fabriquerManuel, fabriquerManuelGeojson, NOM_ZIP, NOM_ZIP_GEOJSON, NOM_PRODBOIS } from '../outils/zip-essai-manuel.mjs';
import { reconnaitre, styleDe, champCodeDe } from '../plugin/vision-styles.mjs';
import { controlerCouche } from '../plugin/vision-controles.mjs';
import { flashcodes, generer, verifier } from '../outils/flashcodes.mjs';

const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
// sha256 d'essai-manuel.zip tel que publié par la mission 033 (main, e17ae28) : il ne doit pas bouger.
const SHA_ESSAI_MANUEL = '1248dc9b96c6a56d92aa42631e929b4538f4872a51d53350406d0d0ac100f793';

function lireZip(chemin) {
  const b = readFileSync(chemin);
  const fin = b.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const n = b.readUInt16LE(fin + 10); let o = b.readUInt32LE(fin + 16);
  const r = {};
  for (let i = 0; i < n; i++) {
    const methode = b.readUInt16LE(o + 10); const taille = b.readUInt32LE(o + 20);
    const ln = b.readUInt16LE(o + 28); const lx = b.readUInt16LE(o + 30); const lc = b.readUInt16LE(o + 32);
    const dec = b.readUInt32LE(o + 42); const nom = b.toString('utf8', o + 46, o + 46 + ln);
    const debut = dec + 30 + b.readUInt16LE(dec + 26) + b.readUInt16LE(dec + 28);
    const paquet = b.subarray(debut, debut + taille);
    r[nom] = { methode, donnees: methode === 0 ? paquet : inflateRawSync(paquet) };
    o += 46 + ln + lx + lc;
  }
  return r;
}

// Anneaux (Lambert 93) et attributs d'un Shapefile polygone, lus à part de l'outil.
function lireShp(z, base) {
  const shp = z[`${base}.shp`].donnees; const shx = z[`${base}.shx`].donnees; const dbf = z[`${base}.dbf`].donnees;
  const n = (shx.length - 100) / 8; const anneaux = [];
  for (let i = 0; i < n; i++) {
    const off = shx.readInt32BE(100 + 8 * i) * 2; const nb = shp.readInt32LE(off + 48); const pts = [];
    for (let k = 0; k < nb; k++) pts.push([shp.readDoubleLE(off + 56 + 16 * k), shp.readDoubleLE(off + 64 + 16 * k)]);
    anneaux.push(pts);
  }
  const tEntete = dbf.readUInt16LE(8); const tEnreg = dbf.readUInt16LE(10); const champs = [];
  for (let o = 32; dbf[o] !== 0x0d; o += 32) champs.push({ nom: dbf.toString('latin1', o, o + 11).replace(/\0+$/, ''), longueur: dbf[o + 16] });
  const lignes = [];
  for (let i = 0; i < n; i++) {
    let o = tEntete + tEnreg * i + 1; const l = {};
    for (const c of champs) { l[c.nom] = dbf.toString('utf8', o, o + c.longueur).trimEnd(); o += c.longueur; }
    lignes.push(l);
  }
  return { anneaux, champs: champs.map((c) => c.nom), lignes };
}

// Projection directe Lambert 93 (LCC 2SP, GRS 1980), écrite à part de l'outil.
function versLambert93(lon, lat) {
  const e = 0.0818191910428158; const rad = Math.PI / 180; const a = 6378137;
  const m = (p) => Math.cos(p) / Math.sqrt(1 - e * e * Math.sin(p) ** 2);
  const t = (p) => Math.tan(Math.PI / 4 - p / 2) / Math.pow((1 - e * Math.sin(p)) / (1 + e * Math.sin(p)), e / 2);
  const p1 = 44 * rad; const p2 = 49 * rad; const p0 = 46.5 * rad;
  const n = (Math.log(m(p1)) - Math.log(m(p2))) / (Math.log(t(p1)) - Math.log(t(p2)));
  const F = m(p1) / (n * Math.pow(t(p1), n));
  const r = a * F * Math.pow(t(lat * rad), n); const r0 = a * F * Math.pow(t(p0), n);
  const th = n * (lon - 3) * rad;
  return [700000 + r * Math.sin(th), 6600000 + r0 - r * Math.cos(th)];
}

let dA; let dB; let dM; let chemin; let zg; let zs; let cheminSource;
before(() => {
  dA = mkdtempSync(join(tmpdir(), 'vision-t035a-')); dB = mkdtempSync(join(tmpdir(), 'vision-t035b-')); dM = mkdtempSync(join(tmpdir(), 'vision-t035m-'));
  chemin = fabriquerManuelGeojson(dA); fabriquerManuelGeojson(dB);
  cheminSource = fabriquerManuel(dM);
  zg = lireZip(chemin); zs = lireZip(cheminSource);
});

const COUCHES = [['UG', 'CODE_UG', 2], ['Parcelles', 'CODE_PARC', 4], ['FRT', 'CODE_FRT', 3]];
const json = (nom) => JSON.parse(zg[nom].donnees.toString('utf8'));

test('contenu exact : quatre fichiers GeoJSON, tous compressés (deflate), unzip -t valide', () => {
  assert.equal(NOM_ZIP_GEOJSON, 'essai-manuel-geojson.zip');
  assert.deepEqual(Object.keys(zg).sort(), [NOM_PRODBOIS, 'FRT.geojson', 'Parcelles.geojson', 'UG.geojson'].sort());
  for (const [nom, f] of Object.entries(zg)) assert.equal(f.methode, 8, nom);
  const r = spawnSync('unzip', ['-tq', chemin], { encoding: 'utf8' });
  if (!r.error) assert.equal(r.status, 0, r.stdout + r.stderr); else assert.ok(!process.env.CI, 'unzip absent');
});

test('rejouable à l\'identique : deux fabrications donnent les mêmes octets', () => {
  assert.equal(sha(chemin), sha(join(dB, NOM_ZIP_GEOJSON)));
});

test('essai-manuel.zip ne change pas d\'un octet (sha256 de la mission 033)', () => {
  assert.equal(NOM_ZIP, 'essai-manuel.zip');
  assert.equal(sha(cheminSource), SHA_ESSAI_MANUEL);
});

test('ProdBois : octet pour octet le même fichier que dans essai-manuel.zip', () => {
  assert.ok(zg[NOM_PRODBOIS].donnees.equals(zs[NOM_PRODBOIS].donnees));
});

test('chaque couche : crs CRS84 explicite, polygones, champs et libellés (accents compris) égaux à ceux des Shapefile', () => {
  for (const [base, champ, n] of COUCHES) {
    const g = json(`${base}.geojson`); const s = lireShp(zs, base);
    assert.deepEqual(g.crs, { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } }, base);
    assert.equal(g.name, base);
    assert.equal(g.features.length, n, base);
    assert.deepEqual(Object.keys(g.features[0].properties), s.champs, `${base} : champs`);
    assert.deepEqual(g.features.map((f) => f.properties), s.lignes, `${base} : valeurs`);
    for (const f of g.features) assert.equal(f.geometry.type, 'Polygon');
  }
  assert.equal(json('UG.geojson').features[0].properties.LIBELLE, 'Chênaie sessile');
  assert.equal(json('FRT.geojson').features[0].properties.LIBELLE, "Zone d'essai é 1");
  assert.ok(!zg['UG.geojson'].donnees.toString('utf8').includes('\\u00'), 'accents en clair');
});

test('géométries : mêmes sommets que les Shapefile, à 1 cm près une fois reconverties en Lambert 93 ; un anneau fermé, antihoraire', () => {
  for (const [base] of COUCHES) {
    const g = json(`${base}.geojson`); const s = lireShp(zs, base);
    g.features.forEach((f, i) => {
      assert.equal(f.geometry.coordinates.length, 1, 'un seul anneau');
      const a = f.geometry.coordinates[0];
      assert.deepEqual(a[0], a[a.length - 1], 'anneau fermé');
      for (const [lon, lat] of a) assert.ok(lon > 2.5 && lon < 2.8 && lat > 48.3 && lat < 48.5, `${base} ${lon},${lat} : lon puis lat`);
      let aire = 0; for (let k = 0; k < a.length - 1; k++) aire += a[k][0] * a[k + 1][1] - a[k + 1][0] * a[k][1];
      assert.ok(aire > 0, `${base} : sens antihoraire (RFC 7946)`);
      const attendu = s.anneaux[i].slice().reverse(); // le Shapefile est horaire
      assert.equal(a.length, attendu.length);
      a.forEach((p, k) => {
        const [x, y] = versLambert93(...p);
        assert.ok(Math.abs(x - attendu[k][0]) <= 0.01 && Math.abs(y - attendu[k][1]) <= 0.01, `${base}[${i}][${k}] : ${x} ; ${y} au lieu de ${attendu[k]}`);
      });
    });
  }
  // Un point du terrain au bon endroit : le coin sud-ouest de UG01 est (674000 ; 6810200).
  const [x, y] = versLambert93(...json('UG.geojson').features[0].geometry.coordinates[0][0]);
  assert.ok(Math.abs(x - 674000) <= 0.01 && Math.abs(y - 6810200) <= 0.01, `${x} ; ${y}`);
});

test('règles du plugin : UG, Parcelles et FRT reconnus par leur nom, avec le bon champ code', () => {
  for (const [base, champ] of COUCHES) {
    const champs = Object.keys(json(`${base}.geojson`).features[0].properties);
    assert.deepEqual(reconnaitre({ nom: base, geometrie: 'polygone', champs, qml: null }), { regle: base, source: 'nom', avertissement: null }, base);
    assert.equal(champCodeDe(base), champ);
    assert.ok(champs.includes(champ));
    assert.equal(styleDe(base, { champCode: champ }).etiquette.champ, champ);
  }
});

test('règles du plugin : ProdBois reconnu par ses champs, pas par son nom', () => {
  const champs = Object.keys(json(NOM_PRODBOIS).features[0].properties);
  const nom = NOM_PRODBOIS.replace(/\.geojson$/, '');
  assert.deepEqual(reconnaitre({ nom, geometrie: 'point', champs, qml: null }), { regle: 'ProdBois', source: 'champs', avertissement: null });
});

test('contrôles d\'import : les quatre GeoJSON passent (WGS84, emprise reprojetée en Lambert 93 dans la métropole)', () => {
  for (const nom of ['UG.geojson', 'Parcelles.geojson', 'FRT.geojson', NOM_PRODBOIS]) {
    const g = json(nom);
    const pts = g.features.flatMap((f) => (f.geometry.type === 'Point' ? [f.geometry.coordinates] : f.geometry.coordinates[0]));
    const lons = pts.map((p) => p[0]); const lats = pts.map((p) => p[1]);
    let appels = 0;
    const r = controlerCouche({
      nom, format: 'geojson', fichiers: Object.keys(zg), lisible: true, systeme: { valide: true, epsg: 4326 },
      nbEntites: g.features.length, emprise: { xmin: Math.min(...lons), ymin: Math.min(...lats), xmax: Math.max(...lons), ymax: Math.max(...lats) },
    }, {
      reprojeter: (emp) => {
        appels++;
        const [x0, y0] = versLambert93(emp.xmin, emp.ymin); const [x1, y1] = versLambert93(emp.xmax, emp.ymax);
        return { xmin: x0, ymin: y0, xmax: x1, ymax: y1 };
      },
    });
    assert.deepEqual(r, { charge: true, controle: null, message: null, avertissements: [] }, nom);
    assert.equal(appels, 1);
  }
});

test('contrôle de contrepartie : un GeoJSON dont les coordonnées sont lues en lat/lon inversés serait refusé', () => {
  const r = controlerCouche({
    nom: 'UG.geojson', format: 'geojson', fichiers: ['UG.geojson'], lisible: true, systeme: { valide: true, epsg: 4326 },
    nbEntites: 2, emprise: { xmin: 48.39, ymin: 2.64, xmax: 48.40, ymax: 2.67 },
  }, { reprojeter: (emp) => { const [x0, y0] = versLambert93(emp.xmin, emp.ymin); const [x1, y1] = versLambert93(emp.xmax, emp.ymax); return { xmin: x0, ymin: y0, xmax: x1, ymax: y1 }; } });
  assert.equal(r.charge, false);
});

test('ProdBois : les tiges 1 à 5 restent dans la parcelle 12, les tiges 6 à 10 dans la parcelle 14', () => {
  const parc = json('Parcelles.geojson');
  const poly = (code) => parc.features.find((f) => f.properties.CODE_PARC === code).geometry.coordinates[0].map((p) => versLambert93(...p));
  const dedans = ([x, y], a) => x > Math.min(...a.map((p) => p[0])) && x < Math.max(...a.map((p) => p[0])) && y > Math.min(...a.map((p) => p[1])) && y < Math.max(...a.map((p) => p[1]));
  const [p12, p14] = [poly('12'), poly('14')];
  const tiges = json(NOM_PRODBOIS).features;
  assert.equal(tiges.length, 10);
  tiges.forEach((f, i) => {
    const pt = versLambert93(...f.geometry.coordinates);
    assert.ok(dedans(pt, i < 5 ? p12 : p14), `tige ${i + 1} hors de la parcelle ${i < 5 ? 12 : 14}`);
    assert.ok(!dedans(pt, i < 5 ? p14 : p12), `tige ${i + 1} dans l'autre parcelle`);
  });
});

// ---------- flashcode et workflow ----------
const OUTILS = !spawnSync('qrencode', ['--version'], { stdio: 'ignore' }).error && !spawnSync('zbarimg', ['--version'], { stdio: 'ignore' }).error;
const racine = new URL('..', import.meta.url).pathname;

test('flashcode : une adresse, celle d\'essai-manuel-geojson.zip dans la préversion essai-manuel (jamais latest) ; l\'autre inchangé', () => {
  assert.deepEqual(flashcodes('manuel-geojson', 'essai').map((f) => f.url), ['https://github.com/pobsteta/vision/releases/download/essai-manuel/essai-manuel-geojson.zip']);
  assert.deepEqual(flashcodes('manuel', 'essai').map((f) => f.url), ['https://github.com/pobsteta/vision/releases/download/essai-manuel/essai-manuel.zip']);
  assert.notEqual(flashcodes('manuel', 'essai')[0].nom, flashcodes('manuel-geojson', 'essai')[0].nom);
});

test('flashcode : PNG et SVG décodés donnent exactement l\'adresse du zip GeoJSON', { skip: OUTILS ? false : 'qrencode ou zbarimg absent' }, () => {
  const d = mkdtempSync(join(tmpdir(), 'vision-t035f-'));
  try {
    assert.equal(generer(d, 'manuel-geojson', 'essai').length, 2);
    assert.deepEqual(verifier(d, 'manuel-geojson', 'essai'), []);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

const wf = readFileSync(join(racine, '.github', 'workflows', 'release-essai-manuel.yml'), 'utf8');
const wfCode = wf.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

test('workflow : déclenché aussi sur mission/035, publie les deux zips et leurs flashcodes, notes : quel zip prendre', () => {
  assert.match(wfCode, /branches: \['main', 'mission\/050-vision'\]/);
  assert.match(wfCode, /node outils\/flashcodes\.mjs generer dist\/flashcodes-geojson manuel-geojson essai/);
  assert.match(wfCode, /node outils\/flashcodes\.mjs verifier dist\/flashcodes-geojson manuel-geojson essai/);
  assert.match(wfCode, /gh release create essai-manuel dist\/essai-manuel\.zip dist\/flashcodes\/\* dist\/essai-manuel-geojson\.zip dist\/flashcodes-geojson\/\*/);
  assert.match(wfCode, /sha256sum dist\/essai-manuel\.zip dist\/essai-manuel-geojson\.zip/);
  assert.match(wf, /essai-manuel-geojson\.zip.*tant que le plugin ne lit pas les Shapefile/);
  assert.match(wf, /mission 024/);
  assert.match(wfCode, /--prerelease --latest=false/);
  assert.doesNotMatch(wfCode.split('\n').filter((l) => !/^\s*echo /.test(l)).join('\n'), /plugin-essai|plugin-v|projet-modele/); // les notes (echo) peuvent nommer la préversion plugin-essai (mission 040)
});

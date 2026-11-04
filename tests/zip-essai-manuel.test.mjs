// Mission 033 : le zip de démonstration essai-manuel.zip (outils/zip-essai-manuel.mjs).
// Contenu, reproductibilité à l'octet, reconnaissance par les règles du plugin (cerf-styles.mjs) et contrôles
// d'import (cerf-controles.mjs), appelés en boîte noire. Les lectures du zip, du Shapefile et du GeoJSON sont
// refaites ici, à part de l'outil. Données fictives.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { inflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { fabriquerManuel, NOM_ZIP, NOM_PRODBOIS } from '../outils/zip-essai-manuel.mjs';
import { reconnaitre, styleDe, champCodeDe } from '../plugin/cerf-styles.mjs';
import { controlerCouche, EMPRISE_VRAISEMBLANCE } from '../plugin/cerf-controles.mjs';
import { flashcodes, generer, verifier, notes } from '../outils/flashcodes.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');

// Lecture minimale d'un zip : répertoire central -> { nom: { methode, indicateur, donnees } }.
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
    r[nom] = { methode, indicateur: b.readUInt16LE(o + 8), donnees: methode === 0 ? paquet : inflateRawSync(paquet) };
    o += 46 + ln + lx + lc;
  }
  return r;
}

// Shapefile : nombre d'entités, emprise, anneaux (lus dans le .shp) et attributs (lus dans le .dbf, UTF-8).
function lireShp(z, base) {
  const shp = z[`${base}.shp`].donnees; const shx = z[`${base}.shx`].donnees; const dbf = z[`${base}.dbf`].donnees;
  assert.equal(shp.readInt32BE(0), 9994); assert.equal(shp.readInt32LE(32), 5);
  assert.equal(shp.readInt32BE(24) * 2, shp.length, 'longueur du .shp dans son en-tête');
  assert.equal(shx.readInt32BE(24) * 2, shx.length, 'longueur du .shx dans son en-tête');
  const emprise = { xmin: shp.readDoubleLE(36), ymin: shp.readDoubleLE(44), xmax: shp.readDoubleLE(52), ymax: shp.readDoubleLE(60) };
  const n = (shx.length - 100) / 8;
  const anneaux = [];
  for (let i = 0; i < n; i++) {
    const off = shx.readInt32BE(100 + 8 * i) * 2;
    assert.equal(shp.readInt32BE(off), i + 1);
    assert.equal(shp.readInt32LE(off + 8), 5, 'polygone');
    const nbPoints = shp.readInt32LE(off + 48);
    const pts = [];
    for (let k = 0; k < nbPoints; k++) pts.push([shp.readDoubleLE(off + 56 + 16 * k), shp.readDoubleLE(off + 64 + 16 * k)]);
    anneaux.push(pts);
  }
  assert.equal(dbf.readUInt32LE(4), n);
  const tEntete = dbf.readUInt16LE(8); const tEnreg = dbf.readUInt16LE(10);
  const champs = [];
  for (let o = 32; dbf[o] !== 0x0d; o += 32) champs.push({ nom: dbf.toString('latin1', o, o + 11).replace(/\0+$/, ''), longueur: dbf[o + 16] });
  const lignes = [];
  for (let i = 0; i < n; i++) {
    let o = tEntete + tEnreg * i + 1; const l = {};
    for (const c of champs) { l[c.nom] = dbf.toString('utf8', o, o + c.longueur).trimEnd(); o += c.longueur; }
    lignes.push(l);
  }
  return { n, emprise, anneaux, champs: champs.map((c) => c.nom), lignes };
}

// Projection directe Lambert 93 (LCC 2SP, GRS 1980), écrite ici à part de l'outil : sert de service `reprojeter`
// du contrôle de vraisemblance pour le GeoJSON (lon/lat vers EPSG:2154).
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

let dossierA; let dossierB; let zip; let chemin;
before(() => {
  dossierA = mkdtempSync(join(tmpdir(), 'cerf-t033a-')); dossierB = mkdtempSync(join(tmpdir(), 'cerf-t033b-'));
  chemin = fabriquerManuel(dossierA); fabriquerManuel(dossierB);
  zip = lireZip(chemin);
});

const COUCHES = [['UG', 'UG', 'CODE_UG', 2], ['Parcelles', 'Parcelles', 'CODE_PARC', 4], ['FRT', 'FRT', 'CODE_FRT', 3]];

test('nom du zip et contenu exact : 16 fichiers, rien d\'autre', () => {
  assert.equal(NOM_ZIP, 'essai-manuel.zip');
  const attendu = [NOM_PRODBOIS];
  for (const b of ['FRT', 'Parcelles', 'UG']) for (const x of ['cpg', 'dbf', 'prj', 'shp', 'shx']) attendu.push(`${b}.${x}`);
  assert.deepEqual(Object.keys(zip).sort(), attendu.sort());
  assert.equal(NOM_PRODBOIS, 'Essai_p5_13_30_Res.geojson');
});

test('tous les fichiers sont compressés (deflate, méthode 8) et unzip -t valide le zip', () => {
  for (const [nom, f] of Object.entries(zip)) assert.equal(f.methode, 8, nom);
  const r = spawnSync('unzip', ['-tq', chemin], { encoding: 'utf8' });
  if (!r.error) assert.equal(r.status, 0, r.stdout + r.stderr); else assert.ok(!process.env.CI, 'unzip absent');
});

test('rejouable à l\'identique : deux fabrications donnent les mêmes octets', () => {
  assert.equal(sha(chemin), sha(join(dossierB, NOM_ZIP)));
});

test('chaque Shapefile est complet : .prj Lambert 93, .cpg UTF-8, .shx et .dbf cohérents avec le .shp', () => {
  for (const [base, , champ, n] of COUCHES) {
    assert.equal(zip[`${base}.cpg`].donnees.toString('latin1'), 'UTF-8', `${base}.cpg`);
    const prj = zip[`${base}.prj`].donnees.toString('latin1');
    assert.match(prj, /^PROJCS\["RGF93_Lambert_93"/);
    assert.match(prj, /PARAMETER\["False_Easting",700000\.0\]/);
    assert.match(prj, /PARAMETER\["False_Northing",6600000\.0\]/);
    assert.match(prj, /PARAMETER\["Standard_Parallel_1",49\.0\].*PARAMETER\["Standard_Parallel_2",44\.0\]/);
    const s = lireShp(zip, base);
    assert.equal(s.n, n, `${base} : nombre d'entités`);
    assert.deepEqual(s.champs, [champ, 'LIBELLE'], `${base} : champs`);
    assert.equal(new Set(s.lignes.map((l) => l[champ])).size, n, `${base} : codes distincts`);
    for (const l of s.lignes) assert.notEqual(l[champ], '');
  }
});

test('couches côte à côte : aucune n\'est dans une autre (pas d\'emboîtement, pas de hiérarchie)', () => {
  const boite = (a) => ({ xmin: Math.min(...a.map((p) => p[0])), xmax: Math.max(...a.map((p) => p[0])), ymin: Math.min(...a.map((p) => p[1])), ymax: Math.max(...a.map((p) => p[1])) });
  const sep = (p, g) => p.xmax <= g.xmin || g.xmax <= p.xmin || p.ymax <= g.ymin || g.ymax <= p.ymin;
  const c = Object.fromEntries(['UG', 'Parcelles', 'FRT'].map((b) => [b, lireShp(zip, b).anneaux.map(boite)]));
  for (const [x, y] of [['UG', 'Parcelles'], ['UG', 'FRT'], ['Parcelles', 'FRT']]) for (const p of c[x]) for (const g of c[y]) assert.ok(sep(p, g), `${x} et ${y} se recouvrent`);
});

test('accents : les valeurs du .dbf (UTF-8, déclaré par le .cpg) et du GeoJSON sont lues sans corruption', () => {
  assert.equal(lireShp(zip, 'UG').lignes[0].LIBELLE, 'Chênaie sessile');
  assert.equal(lireShp(zip, 'Parcelles').lignes[0].LIBELLE, 'Parcelle 12, en régénération');
  assert.equal(lireShp(zip, 'FRT').lignes[0].LIBELLE, "Zone d'essai é 1");
  for (const l of lireShp(zip, 'FRT').lignes) assert.ok(!/fr[ée]quentation|touristique/i.test(l.LIBELLE), 'aucun libellé ne développe le sigle FRT');
  const g = JSON.parse(zip[NOM_PRODBOIS].donnees.toString('utf8'));
  assert.ok(g.features.some((f) => f.properties.observation === 'Chêne sessile, belle grume'));
  assert.ok(g.features.some((f) => f.properties.typeTige === 'Réservée'));
  assert.ok(!zip[NOM_PRODBOIS].donnees.toString('utf8').includes('\\u00'), 'accents écrits en clair, pas échappés');
});

test('ProdBois : GeoJSON avec crs CRS84 explicite, 10 points, essence (code) et diametre (entier) ; un point tombe au bon endroit', () => {
  const g = JSON.parse(zip[NOM_PRODBOIS].donnees.toString('utf8'));
  assert.deepEqual(g.crs, { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } });
  assert.equal(g.features.length, 10);
  for (const f of g.features) {
    assert.equal(f.geometry.type, 'Point');
    assert.match(f.properties.essence, /^[A-Z]{2,3}$/);
    assert.ok(Number.isInteger(f.properties.diametre) && f.properties.diametre > 0);
    const [lon, lat] = f.geometry.coordinates; // CRS84 : longitude puis latitude
    assert.ok(lon > 2.5 && lon < 2.8 && lat > 48.3 && lat < 48.5, `${lon},${lat} hors Fontainebleau`);
  }
  // Les dix tiges, en Lambert 93 : tiges 1 à 5 dans la parcelle 12, tiges 6 à 10 dans la parcelle 14.
  const [p12, p14] = [0, 2].map((i) => lireShp(zip, 'Parcelles').anneaux[i]);
  assert.deepEqual(lireShp(zip, 'Parcelles').lignes.map((l) => l.CODE_PARC), ['12', '13', '14', '15']);
  const dedans = ([x, y], a) => x > Math.min(...a.map((p) => p[0])) && x < Math.max(...a.map((p) => p[0])) && y > Math.min(...a.map((p) => p[1])) && y < Math.max(...a.map((p) => p[1]));
  g.features.forEach((f, i) => {
    const pt = versLambert93(...f.geometry.coordinates);
    assert.ok(dedans(pt, i < 5 ? p12 : p14), `tige ${i + 1} (${pt}) hors de la parcelle ${i < 5 ? 12 : 14}`);
    assert.ok(!dedans(pt, i < 5 ? p14 : p12), `tige ${i + 1} dans l'autre parcelle`);
  });
  // La première tige est posée à (674120 ; 6811120) : on la retrouve à moins de 1 cm.
  const [x, y] = versLambert93(...g.features[0].geometry.coordinates);
  assert.ok(Math.abs(x - 674120) < 0.01 && Math.abs(y - 6811120) < 0.01, `${x} ; ${y}`);
});

test('règles du plugin : chaque Shapefile est reconnu par nom (UG, Parcelles, FRT), avec le bon style et l\'étiquette', () => {
  const attendu = {
    UG: { couleur: '#0000FF', epaisseur_mm: 0.6, taille_pt: 10 },
    Parcelles: { couleur: '#FF8C00', epaisseur_mm: 1, taille_pt: 15 },
    FRT: { couleur: '#008B8B', epaisseur_mm: 0.6, taille_pt: 10 },
  };
  for (const [base, regle, champ] of COUCHES) {
    const champs = lireShp(zip, base).champs;
    const r = reconnaitre({ nom: base, geometrie: 'polygone', champs, qml: null });
    assert.deepEqual(r, { regle, source: 'nom', avertissement: null }, base);
    assert.equal(champCodeDe(regle), champ);
    assert.ok(champs.includes(champCodeDe(regle)), `${base} : le champ ${champ} existe`);
    const s = styleDe(regle, { champCode: champCodeDe(regle) });
    const a = attendu[base];
    assert.deepEqual(s.symbole, { type: 'contour', couleur: a.couleur, epaisseur_mm: a.epaisseur_mm, opacite_pct: 100, remplissage: false });
    assert.deepEqual(s.etiquette, { champ, taille_pt: a.taille_pt, couleur: a.couleur });
  }
});

test('règles du plugin : l\'export ProdBois est reconnu par ses champs, pas par son nom ; étiquette essence / diametre', () => {
  const g = JSON.parse(zip[NOM_PRODBOIS].donnees.toString('utf8'));
  const champs = Object.keys(g.features[0].properties);
  const nom = NOM_PRODBOIS.replace(/\.geojson$/, '');
  assert.deepEqual(reconnaitre({ nom, geometrie: 'point', champs, qml: null }), { regle: 'ProdBois', source: 'champs', avertissement: null });
  assert.equal(reconnaitre({ nom, geometrie: 'point', champs: ['x'], qml: null }).regle, null, 'sans les champs, le nom seul ne déclenche rien');
  const s = styleDe('ProdBois');
  assert.deepEqual(s.symbole, { type: 'cercle', couleur: '#000000', taille_mm: 2, remplissage: true });
  assert.equal(s.etiquette.expression, '"essence" || \'\\n\' || "diametre"');
  assert.equal(s.etiquette.taille_pt, 8);
  assert.deepEqual(s.etiquette.lisere, { couleur: '#FFFFFF' });
});

test('contrôles d\'import : les trois Shapefile passent (Lambert 93, emprise en métropole, rien refusé)', () => {
  const fichiers = Object.keys(zip);
  for (const [base] of COUCHES) {
    const s = lireShp(zip, base);
    let appels = 0;
    const r = controlerCouche({
      nom: `${base}.shp`, format: 'shp', fichiers, lisible: true, systeme: { valide: true, epsg: 2154 },
      nbEntites: s.n, emprise: s.emprise,
    }, { reprojeter: (emp) => { appels++; return emp; } });
    assert.deepEqual(r, { charge: true, controle: null, message: null, avertissements: [] }, base);
    assert.equal(appels, 1);
    const e = EMPRISE_VRAISEMBLANCE;
    assert.ok(s.emprise.xmin >= e.xmin && s.emprise.xmax <= e.xmax && s.emprise.ymin >= e.ymin && s.emprise.ymax <= e.ymax);
  }
});

test('contrôles d\'import : le GeoJSON ProdBois passe (CRS84, emprise reprojetée en Lambert 93 dans la métropole)', () => {
  const g = JSON.parse(zip[NOM_PRODBOIS].donnees.toString('utf8'));
  const lons = g.features.map((f) => f.geometry.coordinates[0]); const lats = g.features.map((f) => f.geometry.coordinates[1]);
  const emprise = { xmin: Math.min(...lons), ymin: Math.min(...lats), xmax: Math.max(...lons), ymax: Math.max(...lats) };
  let reprojetee;
  const r = controlerCouche({
    nom: NOM_PRODBOIS, format: 'geojson', fichiers: Object.keys(zip), lisible: true, systeme: { valide: true, epsg: 4326 },
    nbEntites: g.features.length, emprise,
  }, {
    reprojeter: (emp) => {
      const [x0, y0] = versLambert93(emp.xmin, emp.ymin); const [x1, y1] = versLambert93(emp.xmax, emp.ymax);
      reprojetee = { xmin: x0, ymin: y0, xmax: x1, ymax: y1 }; return reprojetee;
    },
  });
  assert.deepEqual(r, { charge: true, controle: null, message: null, avertissements: [] });
  assert.ok(reprojetee.xmin > 674000 && reprojetee.xmax < 675600 && reprojetee.ymin > 6811000 && reprojetee.ymax < 6811600, JSON.stringify(reprojetee));
});

test('contrôle de contrepartie : sans son .prj, le même Shapefile serait refusé (le test ci-dessus n\'est pas vide)', () => {
  const fichiers = Object.keys(zip).filter((n) => n !== 'UG.prj');
  const r = controlerCouche({ nom: 'UG.shp', format: 'shp', fichiers, lisible: true, systeme: { valide: true, epsg: 2154 }, nbEntites: 2, emprise: lireShp(zip, 'UG').emprise }, { reprojeter: (e) => e });
  assert.equal(r.charge, false);
  assert.equal(r.controle, 1);
});

test('si pyproj est là : le .prj est reconnu comme EPSG:2154 et les points GeoJSON retombent sur les tiges', { skip: spawnSync('python3', ['-I', '-c', 'import pyproj']).status !== 0 && 'pyproj absent' }, () => {
  const dossier = mkdtempSync(join(tmpdir(), 'cerf-t033p-'));
  try {
    const prj = join(dossier, 'UG.prj'); const gj = join(dossier, 'p.geojson');
    writeFileSync(prj, zip['UG.prj'].donnees); writeFileSync(gj, zip[NOM_PRODBOIS].donnees);
    const sortie = execFileSync('python3', ['-I', '-c', `
import sys, json, pyproj
crs = pyproj.CRS.from_wkt(open(sys.argv[1]).read())
t = pyproj.Transformer.from_crs(4326, 2154, always_xy=True)
g = json.load(open(sys.argv[2]))
print(json.dumps({"epsg": crs.to_epsg(), "pts": [t.transform(*f["geometry"]["coordinates"]) for f in g["features"]]}))
`, prj, gj], { encoding: 'utf8' });
    const r = JSON.parse(sortie);
    assert.equal(r.epsg, 2154);
    assert.ok(Math.abs(r.pts[0][0] - 674120) < 0.01 && Math.abs(r.pts[0][1] - 6811120) < 0.01);
  } finally { rmSync(dossier, { recursive: true, force: true }); }
});

// ---------- flashcode ----------
const OUTILS = !spawnSync('qrencode', ['--version'], { stdio: 'ignore' }).error && !spawnSync('zbarimg', ['--version'], { stdio: 'ignore' }).error;

test('flashcode : une seule adresse, celle de l\'étiquette fixe essai-manuel (jamais latest), identique en mode stable et essai', () => {
  const url = 'https://github.com/pobsteta/cerf/releases/download/essai-manuel/essai-manuel.zip';
  assert.deepEqual(flashcodes('manuel', 'essai').map((f) => f.url), [url]);
  assert.deepEqual(flashcodes('manuel', 'stable').map((f) => f.url), [url]);
  assert.ok(!url.includes('latest'));
  assert.match(notes('manuel', 'essai', 'essai-manuel'), /download\/essai-manuel\/flashcode-essai-manuel\.png/);
});

test('flashcode : PNG et SVG décodés donnent exactement l\'adresse du zip', { skip: OUTILS ? false : 'qrencode ou zbarimg absent' }, () => {
  const dossier = mkdtempSync(join(tmpdir(), 'cerf-t033f-'));
  try {
    assert.equal(generer(dossier, 'manuel', 'essai').length, 2);
    assert.deepEqual(verifier(dossier, 'manuel', 'essai'), []);
  } finally { rmSync(dossier, { recursive: true, force: true }); }
});

// ---------- workflow ----------
const wf = readFileSync(join(RACINE, '.github', 'workflows', 'release-essai-manuel.yml'), 'utf8');
const wfCode = wf.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

test('workflow : déclenché sur la branche de la mission et sur main, étiquette fixe essai-manuel, jamais latest', () => {
  assert.match(wfCode, /branches: \['main', 'mission\/033-essai-manuel'\]/);
  assert.match(wfCode, /concurrency:\n\s+group: release-essai-manuel\n\s+cancel-in-progress: false/);
  assert.match(wfCode, /gh release create essai-manuel dist\/essai-manuel\.zip dist\/flashcodes\/\*/);
  assert.match(wfCode, /--prerelease --latest=false/);
  assert.match(wfCode, /node outils\/zip-essai-manuel\.mjs dist/);
  assert.match(wfCode, /node outils\/flashcodes\.mjs generer dist\/flashcodes manuel essai/);
  assert.match(wfCode, /node outils\/flashcodes\.mjs verifier dist\/flashcodes manuel essai/);
  assert.doesNotMatch(wfCode, /--latest(?!=false)/);
  assert.doesNotMatch(wfCode, /plugin-essai|plugin-v|projet-modele/);
});

test('workflow : les notes disent données fictives, plugin 0.3.0 ou plus, et les couleurs de la spec § 5', () => {
  for (const motif of [/fictives/, /plugin Cerf 0\.3\.0/, /#0000FF/, /#FF8C00/, /#008B8B/, /15 pt/, /liseré blanc/, /cerf\.qgz/]) assert.match(wf, motif);
});

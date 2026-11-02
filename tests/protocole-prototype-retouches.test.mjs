// Mission 003, aller-retour 1/3 : tests des retouches et de l'ajout de périmètre.
// Ils vérifient le protocole (tests/recette/prototype-1.md) et les fichiers d'essai ; ils ne
// prouvent rien sur QField. Sources : docs/spec.md § 3.1, § 3.3, § 5, § 6 n° 7, § 9 ;
// ADR 0003 ; fiche de la mission 003 (rubrique « Aller-retour 1/3 »).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { spawnSync, execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ici = dirname(fileURLToPath(import.meta.url));
const PROTOCOLE = join(ici, 'recette', 'prototype-1.md');
const ESSAI = join(ici, 'recette', 'essai');
const ZIP = join(ESSAI, 'essai.zip');
const ZIP437 = join(ESSAI, 'essai-cp437.zip');
const SCRIPT_LOURD = join(ESSAI, 'fabriquer-geotiff-lourd.mjs');

const texte = () => readFileSync(PROTOCOLE, 'utf8');
function questions() {
  return texte().split(/^## /m).filter((p) => /^Question [1-9] /.test(p)).map((p) => ({ titre: p.split('\n')[0], corps: p }));
}
function gestes(corps) {
  return corps.split('\n').filter((l) => /^\|\s*\d+\s*\|/.test(l)).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
}

// CRC-32 écrit ici, indépendant du code qui fabrique les fichiers d'essai.
const TABLE = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(buf) { let c = 0xffffffff; for (const o of buf) c = TABLE[(c ^ o) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

// Entrées d'un zip lues par le répertoire central.
function entreesZip(chemin) {
  const b = readFileSync(chemin);
  let eocd = -1;
  for (let i = b.length - 22; i >= 0; i--) if (b.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  assert.ok(eocd >= 0);
  const n = b.readUInt16LE(eocd + 10);
  let p = b.readUInt32LE(eocd + 16);
  const out = [];
  for (let k = 0; k < n; k++) {
    const flag = b.readUInt16LE(p + 8); const methode = b.readUInt16LE(p + 10);
    const crc = b.readUInt32LE(p + 16); const cs = b.readUInt32LE(p + 20); const us = b.readUInt32LE(p + 24);
    const ln = b.readUInt16LE(p + 28); const lx = b.readUInt16LE(p + 30); const lc = b.readUInt16LE(p + 32);
    const off = b.readUInt32LE(p + 42);
    const nomOctets = Buffer.from(b.subarray(p + 46, p + 46 + ln));
    const flagLocal = b.readUInt16LE(off + 6);
    const debut = off + 30 + b.readUInt16LE(off + 26) + b.readUInt16LE(off + 28);
    const brut = b.subarray(debut, debut + cs);
    out.push({ nomOctets, flag, flagLocal, methode, crc, cs, us, brut, donnees: () => (methode === 0 ? brut : inflateRawSync(brut)) });
    p += 46 + ln + lx + lc;
  }
  return out;
}
const entree = (chemin, nom) => entreesZip(chemin).find((e) => e.nomOctets.toString('utf8') === nom);

// --- Retouche 1 -----------------------------------------------------------------------
test('retouche 1 : module-essai.mjs est dit embarqué par le prototype, pas copié sur le téléphone', () => {
  const t = texte();
  assert.match(t, /\*\*`module-essai\.mjs` n'est pas copié sur le téléphone\*\*/);
  assert.match(t, /embarqué par le\s+prototype/);
  const tab = t.split('**Fichiers à copier sur le téléphone**')[1].split('**`module-essai.mjs`')[0];
  assert.doesNotMatch(tab, /module-essai/);
  assert.doesNotMatch(t, /Les copier sur le téléphone/);
  assert.doesNotMatch(t, /1503/);
});

// --- Retouche 2 -----------------------------------------------------------------------
test('retouche 2 : aucun geste du Samsung ne demande de lancer node --test', () => {
  for (const q of questions()) {
    for (const c of gestes(q.corps)) assert.doesNotMatch(c.join(' '), /node --test/, `${q.titre} geste ${c[0]}`);
  }
  const q4 = questions()[3].corps;
  assert.match(q4, /Hors du Samsung/);
  assert.match(q4, /\.claude\/test-command/);
  assert.match(q4, /orchestrateur/);
});

// --- Retouche 3 -----------------------------------------------------------------------
test('retouche 3 : où Pascal lit cerf_id, et ce que « lister la copie » vise', () => {
  const t = texte();
  assert.match(t, /Où Pascal lit `cerf_id`/);
  assert.match(t, /variable de projet de `cerf\.qgz`/);
  assert.match(t, /Variables des propriétés du projet/);
  assert.match(t, /`cerf_id` du projet d'essai/);
  const q = questions();
  assert.match(q[1].corps, /valeur de `cerf_id` qu'il affiche/);
  assert.match(q[1].corps, /lister la copie\*\* \(le fichier du chemin lu au geste 2, pas l'original\)/);
  assert.match(q[2].corps, /\*\*Lister la copie\*\* de nouveau \(même geste que le geste 4 de la question 2\)/);
  assert.doesNotMatch(t, /Relister la copie/);
  assert.doesNotMatch(t, /relister la copie/i);
});

// --- Retouche 4 : le protocole ---------------------------------------------------------
test('ajout : neuf questions, dans l\'ordre, chacune avec « Si non » et « Vu autrement »', () => {
  const q = questions();
  assert.equal(q.length, 9);
  assert.match(q[4].titre, /^Question 5 .*Shapefile/);
  assert.match(q[5].titre, /^Question 6 .*\.qml/);
  assert.match(q[6].titre, /^Question 7 .*GeoTIFF.*200 Mo/);
  assert.match(q[7].titre, /^Question 8 .*Android 11/);
  assert.match(q[8].titre, /^Question 9 .*CP437/);
  for (const x of q) {
    assert.match(x.corps, /Si non/, `${x.titre} : « Si non » absent`);
    assert.match(x.corps, /Vu autrement/, `${x.titre} : « Vu autrement » absent`);
    const g = gestes(x.corps);
    assert.ok(g.length >= 1, `${x.titre} : aucun geste`);
    for (const c of g) assert.equal(c[3], '☐', `${x.titre} geste ${c[0]} : case non vide`);
  }
});

test('ajout : valeurs exactes attendues par question 5 à 9', () => {
  const q = questions();
  assert.ok(q[4].corps.includes('EPSG:2154'));
  assert.ok(q[4].corps.includes('X = 652301,56') && q[4].corps.includes('Y = 6861302,73'));
  assert.ok(q[5].corps.includes('635 octets'));
  assert.ok(q[5].corps.includes('255,0,0,255'));
  assert.ok(q[6].corps.includes('199996542 octets'));
  assert.ok(q[6].corps.includes('199996426 octets'));
  assert.ok(q[6].corps.includes('14142 x 14142'));
  assert.match(q[6].corps, /Noter le temps/);
  assert.match(q[6].corps, /ADR 0003/);
  assert.match(q[6].corps, /décompresser/);
  assert.match(q[7].corps, /11 ou plus/);
  assert.match(q[7].corps, /Téléchargements/);
  assert.match(q[7].corps, /Documents/);
  assert.ok(q[8].corps.includes('forêt/parcelle_é.txt'));
  assert.match(q[8].corps, /QGIS ou 7-Zip/);
  const t = texte();
  assert.ok(t.includes('essai-cp437.zip') && t.includes('0x88') && t.includes('0x82'));
});

test('protocole : neuf lignes dans la réponse de Pascal ; les décisions de Pascal du 2 novembre 2026 sont reportées, datées', () => {
  const t = texte();
  const rep = t.split('## Réponse de Pascal')[1].split('## Décisions de Pascal')[0];
  const lignes = rep.split('\n').filter((l) => /^\| [1-9]\. /.test(l));
  assert.equal(lignes.length, 9);
  for (const l of lignes) assert.match(l, /☐ \| ☐ \|$/);
  assert.doesNotMatch(t, /## Questions à Pascal/);
  assert.match(t, /## Décisions de Pascal \(2 novembre 2026\)/);
  const qp = t.split('## Décisions de Pascal')[1].split('## Sources')[0];
  assert.match(qp, /questions 1 à 4/);
  assert.match(qp, /questions 5 à 9[^.]*notées sans bloquer/);
  assert.match(qp, /temps[^.]*mesuré et noté/i);
  assert.match(qp, /temps\s+maximal[^.]*après l'essai/i);
  assert.match(qp, /Tolérance de 1 m[^.]*gardée/);
  assert.match(qp, /2108 octets/);
  assert.match(qp, /4096 octets/);
  assert.doesNotMatch(qp, /\?/);
  assert.doesNotMatch(t, /jugé réussi si les quatre/);
  assert.doesNotMatch(t, /## Hors de ce protocole/);
});

test('protocole : tailles et décomptes écrits = ceux des fichiers (9 entrées, 2108 octets ; 1 entrée, 181 octets)', () => {
  const t = texte();
  assert.equal(entreesZip(ZIP).length, 9);
  assert.equal(statSync(ZIP).size, 2108);
  assert.equal(entreesZip(ZIP437).length, 1);
  assert.equal(statSync(ZIP437).size, 181);
  assert.ok(t.includes('2108 octets') && t.includes('181 octets'));
  assert.ok(t.includes('(9 entrées, noms exacts)'));
  assert.doesNotMatch(t, /8 entrées|8 entrée/);
});

test('sources : versions, dates de consultation, refus d\'URL dits ; l\'état du dépôt est daté', () => {
  const s = texte().split('## Sources des valeurs')[1];
  assert.match(s, /pyproj 3\.8\.0/);
  assert.match(s, /PROJ 9\.8\.1/);
  assert.match(s, /v12\.029/);
  assert.match(s, /2025-10-02/);
  assert.match(s, /2 novembre 2026/);
  assert.match(s, /spatialreference\.org/);
  assert.match(s, /epsg\.io/);
  assert.match(s, /403/);
  assert.match(s, /GDAL 3\.12\.2/);
  assert.match(s, /pas dans QField/);
  assert.match(s, /e6ff190/);
});

// --- Retouche 4 : les fichiers d'essai -------------------------------------------------
test('essai.zip : le .prj du Shapefile est Lambert 93 (EPSG:2154), pas WGS84', () => {
  const prj = entree(ZIP, 'sous-dossier/shape_essai.prj').donnees().toString('utf8');
  assert.ok(prj.startsWith('PROJCS["RGF_1993_Lambert_93"'));
  for (const frag of [
    'SPHEROID["GRS_1980",6378137.0,298.257222101]',
    'PROJECTION["Lambert_Conformal_Conic"]',
    'PARAMETER["False_Easting",700000.0]',
    'PARAMETER["False_Northing",6600000.0]',
    'PARAMETER["Central_Meridian",3.0]',
    'PARAMETER["Standard_Parallel_1",49.0]',
    'PARAMETER["Standard_Parallel_2",44.0]',
    'PARAMETER["Latitude_Of_Origin",46.5]',
    'UNIT["Meter",1.0]',
  ]) assert.ok(prj.includes(frag), `fragment absent du .prj : ${frag}`);
  assert.ok(!prj.includes('GCS_WGS_1984'));
});

test('essai.zip : le point du Shapefile est en Lambert 93, X puis Y ; .shx et .dbf s\'accordent', () => {
  const X = 652301.56; const Y = 6861302.73; // pyproj 3.8.0 : (2,35 ; 48,85) EPSG:4326 -> EPSG:2154
  const shp = entree(ZIP, 'sous-dossier/shape_essai.shp').donnees();
  assert.equal(shp.readInt32BE(0), 9994);
  assert.equal(shp.readInt32LE(28), 1000);
  assert.equal(shp.readInt32LE(32), 1);
  assert.equal(shp.readInt32BE(24) * 2, shp.length);
  assert.equal(shp.readInt32LE(108), 1);
  assert.equal(shp.readDoubleLE(112), X, 'X (est) attendu en premier');
  assert.equal(shp.readDoubleLE(120), Y, 'Y (nord) attendu en second');
  assert.deepEqual([36, 44, 52, 60].map((o) => shp.readDoubleLE(o)), [X, Y, X, Y]);
  const shx = entree(ZIP, 'sous-dossier/shape_essai.shx').donnees();
  assert.equal(shx.length, 108);
  assert.equal(shx.readInt32BE(100), 50);
  assert.deepEqual([36, 44, 52, 60].map((o) => shx.readDoubleLE(o)), [X, Y, X, Y]);
  const dbf = entree(ZIP, 'sous-dossier/shape_essai.dbf').donnees();
  assert.equal(dbf.readUInt32LE(4), 1);
  assert.equal(dbf.toString('latin1', 32, 36), 'CODE');
  assert.equal(entree(ZIP, 'sous-dossier/shape_essai.cpg').donnees().toString('utf8'), 'UTF-8');
});

test('essai.zip : le .qml pèse 635 octets et donne un symbole rouge ; le .qmd reste vide', () => {
  const qml = entree(ZIP, 'sous-dossier/shape_essai.qml').donnees();
  assert.equal(qml.length, 635);
  const t = qml.toString('utf8');
  assert.ok(t.startsWith('<!DOCTYPE qgis>'));
  assert.ok(t.includes('255,0,0,255'));
  assert.ok(t.trimEnd().endsWith('</qgis>'));
  assert.equal(entree(ZIP, 'sous-dossier/shape_essai.qmd').donnees().toString('utf8'), '<qgis></qgis>');
});

test('essai.zip : taille et CRC de chaque entrée sont ceux du répertoire du zip', () => {
  for (const e of entreesZip(ZIP)) {
    const d = e.donnees();
    assert.equal(d.length, e.us, e.nomOctets.toString());
    assert.equal(crc32(d), e.crc, `CRC de ${e.nomOctets}`);
  }
});

test('essai-cp437.zip : 1 entrée, nom en CP437 (ê = 0x88, é = 0x82), drapeau UTF-8 NON positionné', () => {
  assert.ok(existsSync(ZIP437));
  const es = entreesZip(ZIP437);
  assert.equal(es.length, 1);
  assert.equal(es[0].nomOctets.toString('hex'), '666f7288742f70617263656c6c655f822e747874');
  assert.equal(es[0].flag & 0x0800, 0, 'bit 11 positionné dans le répertoire central');
  assert.equal(es[0].flagLocal & 0x0800, 0, 'bit 11 positionné dans l\'en-tête local');
  const cp437 = { 0x88: 'ê', 0x82: 'é' };
  const nom = [...es[0].nomOctets].map((o) => (o < 0x80 ? String.fromCharCode(o) : cp437[o])).join('');
  assert.equal(nom, 'forêt/parcelle_é.txt');
  assert.equal(crc32(es[0].donnees()), es[0].crc);
});

// --- GeoTIFF lourd : fabriqué par un script, jamais versé au dépôt -------------------------
function lireTiff(tif) {
  assert.equal(tif.toString('latin1', 0, 2), 'II');
  assert.equal(tif.readUInt16LE(2), 42);
  const ifd = tif.readUInt32LE(4);
  const n = tif.readUInt16LE(ifd);
  const tags = {};
  for (let i = 0; i < n; i++) {
    const o = ifd + 2 + 12 * i;
    tags[tif.readUInt16LE(o)] = { n: tif.readUInt32LE(o + 4), val: tif.readUInt32LE(o + 8), court: tif.readUInt16LE(o + 8) };
  }
  return tags;
}

test('GeoTIFF lourd : le script refuse de tourner sans dossier de sortie', () => {
  assert.ok(existsSync(SCRIPT_LOURD), 'fabriquer-geotiff-lourd.mjs absent');
  const r = spawnSync(process.execPath, [SCRIPT_LOURD], { encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /dossier-de-sortie/);
});

test('GeoTIFF lourd (à 1 Mo) : un zip d\'une entrée lourd.tif SANS compression, CRC juste, GeoTIFF en EPSG:2154', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'cerf-lourd-'));
  try {
    const avant = readdirSync(ESSAI).sort();
    const r = spawnSync(process.execPath, [SCRIPT_LOURD, dossier, '1'], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(readdirSync(ESSAI).sort(), avant, 'le script a écrit dans le dépôt');
    assert.deepEqual(readdirSync(dossier), ['lourd.zip'], 'le .tif intermédiaire doit être retiré');
    const es = entreesZip(join(dossier, 'lourd.zip'));
    assert.equal(es.length, 1);
    assert.equal(es[0].nomOctets.toString('utf8'), 'lourd.tif');
    assert.equal(es[0].methode, 0, 'méthode 0 (stocké) attendue, comme zip -0');
    assert.equal(es[0].cs, es[0].us);
    assert.equal(crc32(es[0].brut), es[0].crc);
    const tif = es[0].brut;
    const tags = lireTiff(tif);
    const w = tags[256].val; const h = tags[257].val;
    assert.equal(w, h);
    assert.equal(tags[259].court, 1, 'GeoTIFF sans compression attendu');
    assert.equal(tags[258].court, 8);
    assert.equal(tags[277].court, 1);
    assert.equal(tags[279].val, w * h);
    assert.equal(tags[273].val + w * h, tif.length);
    assert.ok(tif.subarray(tags[273].val).every((o) => o === 0));
    const ech = tags[33550].val; const att = tags[33922].val; const gk = tags[34735].val;
    assert.deepEqual([0, 1, 2].map((i) => tif.readDoubleLE(ech + 8 * i)), [5, 5, 0]);
    assert.deepEqual([0, 1, 2, 3, 4, 5].map((i) => tif.readDoubleLE(att + 8 * i)), [0, 0, 0, 600000, 6870000, 0]);
    const cles = [...Array(tags[34735].n)].map((_, i) => tif.readUInt16LE(gk + 2 * i));
    assert.deepEqual(cles.slice(0, 4), [1, 1, 0, 3]);
    const parCle = {};
    for (let i = 0; i < 3; i++) parCle[cles[4 + 4 * i]] = cles[4 + 4 * i + 3];
    assert.equal(parCle[3072], 2154, 'ProjectedCSType doit être 2154');
    assert.equal(parCle[1024], 1, 'GTModelType : projeté');
    assert.ok(tif.length <= 1_000_000 && 1_000_000 - tif.length < 2100, `taille ${tif.length}`); // carré : au plus 2 x côté de moins
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

test('GeoTIFF lourd : les tailles du protocole pour 200 Mo suivent la mise en page (14142 x 14142)', () => {
  // en-tête TIFF 8 + IFD (2 + 12 x 12 + 4) = 158 ; valeurs hors IFD 24 + 48 + 32 = 104
  const cote = Math.floor(Math.sqrt(200_000_000 - 158 - 104));
  assert.equal(cote, 14142);
  const tif = 158 + 104 + cote * cote;
  const zip = 30 + 9 + tif + 46 + 9 + 22;
  assert.equal(tif, 199996426);
  assert.equal(zip, 199996542);
  assert.ok(texte().includes(`${tif} octets`));
  assert.ok(texte().includes(`${zip} octets`));
  assert.ok(!existsSync(join(ESSAI, 'lourd.zip')) && !existsSync(join(ESSAI, 'lourd.tif')), 'le GeoTIFF lourd ne doit pas être versé');
});

test('aucun fichier de plus de 1 Mo sous tests/', () => {
  const trop = [];
  const parcourir = (d) => {
    for (const f of readdirSync(d, { withFileTypes: true })) {
      const c = join(d, f.name);
      if (f.isDirectory()) parcourir(c); else if (statSync(c).size > 1_000_000) trop.push(c);
    }
  };
  parcourir(ici);
  assert.deepEqual(trop, []);
});

test('les petits zips versés sont ceux que fabrique fabriquer-essais.mjs, octet pour octet', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'cerf-essais-'));
  try {
    execFileSync(process.execPath, [join(ESSAI, 'fabriquer-essais.mjs'), dossier]);
    for (const nom of ['essai.zip', 'essai-cp437.zip']) {
      assert.ok(readFileSync(join(dossier, nom)).equals(readFileSync(join(ESSAI, nom))), `${nom} diffère de sa fabrication`);
    }
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

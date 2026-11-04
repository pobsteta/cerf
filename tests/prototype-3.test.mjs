// Mission 027, prototype n° 3 : tests de ce qui est pur (zip entièrement compressé, fichiers
// d'essai, gardes de chemin, jugement de la copie, durées) et contrôles du texte de Essai.qml et
// du workflow. Aucun appel à QField ici : seul le protocole (« Prototype n° 3 » de
// tests/recette/prototype-2.md), rempli par Pascal sur le Samsung, dit ce que QField permet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import * as L from '../prototype-2/essai-logique.mjs';
import * as F from '../prototype-2/fabriquer-essais.mjs';
import { crc32 } from './recette/essai/zip-ecrire.mjs';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (f) => readFileSync(join(racine, f), 'utf8');
const z = F.fabriquerEssais3();
const parNom = Object.fromEntries(z.entrees.map((e) => [e.nom, e.donnees]));

// ---------------------------------------------------------------- le zip compressé

test('essai-styles-z.zip : 8 entrées, TOUTES de méthode 8 (répertoire central ET en-têtes locaux)', () => {
  const { entrees } = L.listerZip(z.zip);
  assert.deepEqual(entrees.map((e) => e.nom), F.NOMS_ENTREES_Z);
  assert.equal(entrees.length, 8);
  for (const e of entrees) assert.equal(e.methode, 8, e.nom);
  for (const e of entrees) {
    assert.equal(z.zip.readUInt16LE(e.decalageLocal + 8), 8, `méthode de l'en-tête local de ${e.nom}`);
    assert.equal(z.zip.readUInt32LE(e.decalageLocal), 0x04034b50, e.nom);
  }
  assert.equal(L.estProjetEssai('/x/cerf-essai-2.qgs'), true);
});

test('essai-styles-z.zip : tailles et CRC32 justes, inflateRawSync redonne les octets d\'origine', () => {
  const { entrees } = L.listerZip(z.zip);
  for (const e of entrees) {
    const origine = parNom[e.nom];
    assert.equal(e.taille, origine.length, `taille de ${e.nom}`);
    assert.equal(e.crc32, crc32(origine), `CRC32 de ${e.nom} (ecrireZip)`);
    assert.equal(e.crc32, L.crc32(origine), `CRC32 de ${e.nom} (module du plugin)`);
    const debut = e.decalageLocal + 30 + z.zip.readUInt16LE(e.decalageLocal + 26) + z.zip.readUInt16LE(e.decalageLocal + 28);
    const paquet = z.zip.subarray(debut, debut + e.tailleCompressee);
    const rendu = inflateRawSync(paquet);
    assert.equal(Buffer.compare(rendu, origine), 0, `aller-retour de ${e.nom}`);
  }
});

test('essai-styles-z.zip : vraiment compressé (le GeoJSON de 2 000 entités tient en moins du quart)', () => {
  const g = L.listerZip(z.zip).entrees.find((e) => e.nom === F.NOM_GRAND);
  assert.ok(g.tailleCompressee * 4 < g.taille, `${g.tailleCompressee} octets pour ${g.taille}`);
  assert.ok(z.zip.length < Buffer.concat(z.entrees.map((e) => e.donnees)).length);
});

test('le plugin refuse d\'extraire ce zip (pas de décompresseur) et le dit : l\'essai passe par GDAL', () => {
  const e = L.listerZip(z.zip).entrees[0];
  assert.throws(() => L.extraireEntree(z.zip, e), /entrée compressée \(méthode 8\)/);
});

test('fabrication déterministe : deux fabrications, mêmes octets', () => {
  assert.equal(Buffer.compare(F.fabriquerEssais3().zip, z.zip), 0);
});

test('l\'ancien zip essai-styles.zip est INCHANGÉ, octet pour octet (sha256 relevé avant la mission 027)', () => {
  const ancien = F.fabriquerEssais();
  assert.equal(createHash('sha256').update(ancien.zip).digest('hex'), 'b8274d36eaa5c04843b3b55e670347c7d44788366f3e5d05bf44aa5957d920da');
  assert.equal(createHash('sha256').update(ancien.gpkg).digest('hex'), '733486cf7aeae55b2d6881a20789e087f5432aa13397f9d60432d3121a67350b');
  for (const e of L.listerZip(ancien.zip).entrees) assert.equal(e.methode, 0, e.nom);
});

// ---------------------------------------------------------------- le Shapefile et ses accents

function lireDbf(b) {
  const nb = b.readUInt32LE(4); const tEntete = b.readUInt16LE(8); const tEnr = b.readUInt16LE(10);
  const champs = [];
  for (let o = 32; b[o] !== 0x0d; o += 32) champs.push({ nom: b.toString('latin1', o, o + 11).replace(/\0.*$/, ''), type: String.fromCharCode(b[o + 11]), longueur: b[o + 16] });
  assert.equal(tEntete, 32 + 32 * champs.length + 1, 'longueur de l\'en-tête');
  assert.equal(tEnr, 1 + champs.reduce((a, c) => a + c.longueur, 0), 'longueur d\'un enregistrement');
  assert.equal(b.length, tEntete + tEnr * nb + 1, 'taille du fichier');
  assert.equal(b[b.length - 1], 0x1a);
  const lignes = [];
  for (let i = 0; i < nb; i++) {
    let o = tEntete + tEnr * i + 1; const l = {};
    for (const c of champs) { l[c.nom] = b.toString('utf8', o, o + c.longueur).trimEnd(); o += c.longueur; }
    lignes.push(l);
  }
  return { champs, lignes };
}

test('FRT_q7.dbf du zip compressé : champs code_ug et nom, « Étang » et « Forêt » en UTF-8, .cpg UTF-8', () => {
  const d = lireDbf(parNom['FRT_q7.dbf']);
  assert.deepEqual(d.champs.map((c) => c.nom), ['code_ug', 'nom']);
  assert.deepEqual(d.lignes, [{ code_ug: 'FRT1', nom: 'Étang' }, { code_ug: 'FRT2', nom: 'Forêt' }]);
  assert.deepEqual(F.NOMS_FRT_Q7, ['Étang', 'Forêt']);
  assert.ok(parNom['FRT_q7.dbf'].includes(Buffer.from('Étang', 'utf8')));
  assert.ok(parNom['FRT_q7.dbf'].includes(Buffer.from('Forêt', 'utf8')));
  assert.equal(parNom['FRT_q7.cpg'].toString('utf8'), 'UTF-8');
  assert.match(parNom['FRT_q7.prj'].toString('latin1'), /Lambert/i);
  assert.deepEqual(L.CAS.shp.accents, ['Étang', 'Forêt']);
});

test('l\'ancien FRT_q7.dbf (zip stocké) garde son seul champ code_ug, sans accent', () => {
  const ancien = F.fabriquerEssais();
  const d = lireDbf(ancien.entrees.find((e) => e.nom === 'FRT_q7.dbf').donnees);
  assert.deepEqual(d.champs.map((c) => c.nom), ['code_ug']);
  assert.deepEqual(d.lignes.map((l) => l.code_ug), ['FRT1', 'FRT2']);
});

test('point du terrain : le premier sommet de FRT_q7.shp est en EPSG:2154, X (est) 1 051 763 puis Y (nord) 6 840 312, dans la France métropolitaine', () => {
  const shp = parNom['FRT_q7.shp'];
  assert.equal(shp.readInt32BE(0), 9994);
  assert.equal(shp.readInt32LE(32), 5, 'type polygone');
  // en-tête : Xmin, Ymin, Xmax, Ymax, en mètres, X (est) d'abord
  const [xmin, ymin, xmax, ymax] = [36, 44, 52, 60].map((o) => shp.readDoubleLE(o));
  assert.deepEqual([xmin, ymin, xmax, ymax], [1051113 + 800 - 150, 6840462 - 150, 1051113 + 800 + 150, 6840462 + 350 + 150]);
  assert.ok(L.empriseVraisemblable({ xMinimum: xmin, xMaximum: xmax, yMinimum: ymin, yMaximum: ymax }), 'emprise dans la France métropolitaine (EPSG:2154)');
  // premier sommet du premier anneau (anneau horaire : coin x0, y0)
  const x = shp.readDoubleLE(100 + 8 + 4 + 32 + 4 + 4 + 4);
  const y = shp.readDoubleLE(100 + 8 + 4 + 32 + 4 + 4 + 4 + 8);
  assert.equal(x, 1051763, 'X (est), EPSG:2154');
  assert.equal(y, 6840312, 'Y (nord), EPSG:2154');
});

// ---------------------------------------------------------------- GeoPackage à deux tables

test('essai-gpkg2.gpkg : deux tables Parcelles et Zones (2 entités chacune, EPSG:2154), AUCUN layer_styles', async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const d = mkdtempSync(join(tmpdir(), 'cerf-p3-'));
  try {
    const chemin = join(d, 'g.gpkg');
    writeFileSync(chemin, parNom[L.NOM_GPKG2]);
    const db = new DatabaseSync(chemin, { readOnly: true });
    try {
      assert.equal(db.prepare('PRAGMA application_id').get().application_id, 1196444487);
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((r) => r.name);
      assert.ok(tables.includes('Parcelles') && tables.includes('Zones'));
      assert.ok(!tables.includes('layer_styles'), 'le style ne doit venir que du .qml du plugin');
      assert.deepEqual(db.prepare('SELECT table_name, srs_id FROM gpkg_contents ORDER BY table_name').all().map((r) => [r.table_name, Number(r.srs_id)]), [['Parcelles', 2154], ['Zones', 2154]]);
      for (const [t, codes, ymin] of [['Parcelles', ['P1', 'P2'], 6840312], ['Zones', ['Z1', 'Z2'], 6839512]]) {
        const lignes = db.prepare(`SELECT code_ug, geom FROM ${t} ORDER BY fid`).all();
        assert.deepEqual(lignes.map((r) => r.code_ug), codes, t);
        const g = Buffer.from(lignes[0].geom);
        assert.equal(g.toString('latin1', 0, 2), 'GP');
        assert.equal(g.readInt32LE(4), 2154, `${t} : srs_id de la géométrie`);
        // enveloppe : minX, maxX, minY, maxY (X est d'abord)
        assert.equal(g.readDoubleLE(8), 1050963, `${t} : X (est) minimal, EPSG:2154`);
        assert.equal(g.readDoubleLE(24), ymin, `${t} : Y (nord) minimal, EPSG:2154`);
      }
    } finally { db.close(); }
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------- le jeu de 2 000 entités

test('ProdBois_2000.geojson : 2 000 polygones fermés, codes uniques, membre crs EPSG:2154, dans la France métropolitaine', () => {
  const g = JSON.parse(parNom[F.NOM_GRAND].toString('utf8'));
  assert.equal(F.NB_GRAND, 2000);
  assert.equal(g.features.length, 2000);
  assert.equal(L.CAS.grand.entites, 2000);
  assert.match(g.crs.properties.name, /EPSG::2154/);
  assert.equal(new Set(g.features.map((f) => f.properties.code_ug)).size, 2000);
  for (const f of g.features) {
    const a = f.geometry.coordinates[0];
    assert.equal(f.geometry.type, 'Polygon');
    assert.equal(a.length, 5);
    assert.deepEqual(a[0], a[4]);
  }
  const p = g.features[0].geometry.coordinates[0][0];
  assert.deepEqual(p, [1051113 - 625, 6840462 + 1500], 'premier sommet : X (est) puis Y (nord), EPSG:2154');
  const xs = g.features.flatMap((f) => f.geometry.coordinates[0].map((c) => c[0]));
  const ys = g.features.flatMap((f) => f.geometry.coordinates[0].map((c) => c[1]));
  assert.ok(L.empriseVraisemblable({ xMinimum: Math.min(...xs), xMaximum: Math.max(...xs), yMinimum: Math.min(...ys), yMaximum: Math.max(...ys) }));
});

test('UG_q1.geojson du zip compressé : avec crs EPSG:2154, 2 entités', () => {
  const g = JSON.parse(parNom['UG_q1.geojson'].toString('utf8'));
  assert.match(g.crs.properties.name, /EPSG::2154/);
  assert.deepEqual(g.features.map((f) => f.properties.code_ug), ['UG1', 'UG2']);
});

// ---------------------------------------------------------------- les cas

test('chaque cas pointe une entrée du zip (et une table du GeoPackage) qui existe', () => {
  for (const c of Object.values(L.CAS)) {
    assert.ok(F.NOMS_ENTREES_Z.includes(c.entree), c.cle);
    assert.equal(c.authid, 'EPSG:2154');
    if (c.style !== '') assert.ok(c.style in L.STYLES, c.cle);
  }
  assert.equal(L.CAS.parcelles.table, 'Parcelles');
  assert.equal(L.CAS.zones.table, 'Zones');
  assert.equal(L.CAS.parcelles.style, 'parcelles');
  assert.equal(L.CAS.shp.style, 'frt');
});

test('sourceDuCas : /vsizip/ du zip copié, table du GeoPackage après « |layername= »', () => {
  const zip = '/proj/cerf-imports/essai-styles-z.zip';
  assert.equal(L.sourceDuCas(L.CAS.shp, zip), '/vsizip//proj/cerf-imports/essai-styles-z.zip/FRT_q7.shp');
  assert.equal(L.sourceDuCas(L.CAS.zones, zip), '/vsizip//proj/cerf-imports/essai-styles-z.zip/essai-gpkg2.gpkg|layername=Zones');
});

test('qmlStyle repris dans le module du plugin : mêmes octets que ceux du zip stocké, étiquette sur code_ug', () => {
  const ancien = F.fabriquerEssais();
  assert.equal(L.qmlStyle(L.STYLES.ug), ancien.entrees.find((e) => e.nom === 'UG_q1.qml').donnees.toString('utf8'));
  assert.equal(F.qmlStyle, L.qmlStyle);
  assert.match(L.qmlStyle(L.STYLES.frt), /fieldName="code_ug"/);
  assert.match(L.qmlStyle(L.STYLES.frt), /0,139,139,255/);
  assert.match(L.qmlStyle(L.STYLES.parcelles), /255,140,0,255/);
});

test('octetsUtf8 : mêmes octets que Buffer pour l\'ASCII, les accents et un caractère hors plan de base', () => {
  for (const t of ['', 'UG1', 'Étang, Forêt', 'a€b', '😀']) assert.deepEqual(Array.from(L.octetsUtf8(t)), Array.from(Buffer.from(t, 'utf8')), t);
});

// ---------------------------------------------------------------- gardes de chemin

const P = '/storage/emulated/0/Android/data/ch.opengis.qfield/files/projets/cerf-essai-2';
const Q = P + '/cerf-imports/q3-4/';

test('garde d\'écriture : seul un .gpkg ou un .qml directement dans cerf-imports/q3-<N>/ du projet', () => {
  for (const ok of [Q + 'FRT_q7.gpkg', Q + 'FRT_q7.qml', P + '/cerf-imports/q3-12/Zones.gpkg']) assert.equal(L.peutEcrireQ3(ok, P), true, ok);
  for (const non of [
    P + '/cerf-imports/FRT_q7.gpkg', // pas dans q3-<N>
    P + '/cerf-imports/essai-styles-z.zip',
    Q + 'FRT_q7.gpkg-wal', Q + 'x.txt', Q + 'x.shp', Q + 'sous/x.gpkg',
    P + '/cerf-imports/q3-4/../x.gpkg', P + '/cerf-imports/q3-4/..\\x.gpkg', P + '/cerf-imports//q3-4/x.gpkg',
    P + '/autre/q3-4/x.gpkg', '/sdcard/q3-4/x.gpkg', P + '/cerf-imports/q3-/x.gpkg', P + '/cerf-imports/q3-4x/x.gpkg',
    'cerf-imports/q3-4/x.gpkg', '', null, undefined, 42,
  ]) assert.equal(L.peutEcrireQ3(non, P), false, String(non));
  assert.equal(L.peutEcrireQ3(Q + 'a.gpkg', ''), false);
  assert.equal(L.peutEcrireQ3(Q + 'a.gpkg', '/'), false);
  assert.equal(L.peutEcrireQ3(Q + 'a.gpkg', 'relatif'), false);
  assert.equal(L.peutEcrireQ3('/cerf-imports/q3-1/a.gpkg', '/'), false);
});

test('garde d\'effacement : les annexes du jeu q3-<N> seulement ; jamais le zip, jamais un autre dossier', () => {
  for (const s of L.SUFFIXES_ANNEXES) assert.equal(L.peutEffacerQ3(Q + 'FRT_q7' + s, P), true, s);
  for (const non of [
    P + '/cerf-imports/essai-styles-z.zip', P + '/cerf-imports/essai-styles.zip', P + '/cerf-imports/q1/UG_q1.qml',
    P + '/cerf-imports/FRT_q7.gpkg', P + '/cerf-imports/q3-4', P + '/cerf-imports/q3-4/', Q + 'x.geojson', Q + 'x.shp', Q + 'x.txt',
    Q + '../FRT_q7.gpkg', P + '/cerf-imports/q3-4/../../x.qml', P + '/cerf-imports/q3-4//x.qml', P + '/cerf-essai-2.qgs',
    '/storage/emulated/0/DCIM/x.gpkg', '/', '', null,
  ]) assert.equal(L.peutEffacerQ3(non, P), false, String(non));
  assert.equal(L.peutEffacerQ3(Q + 'a.qml', '/'), false);
});

test('prochainDossierQ3 : premier N libre à partir du départ, barre finale, rien d\'écrasé', () => {
  const pris = new Set([P + '/cerf-imports/q3-1', P + '/cerf-imports/q3-2']);
  const r = L.prochainDossierQ3(P, 1, (c) => pris.has(c));
  assert.deepEqual(r, { n: 3, chemin: P + '/cerf-imports/q3-3/' });
  assert.equal(L.prochainDossierQ3(P + '/', 7, () => false).chemin, P + '/cerf-imports/q3-7/');
  assert.equal(L.prochainDossierQ3(P, 0, () => false).n, 1);
  assert.throws(() => L.prochainDossierQ3(P, 1, () => true), /1000 dossiers/);
  assert.throws(() => L.prochainDossierQ3('', 1, () => false), /aucun projet/);
  assert.equal(L.peutEcrireQ3(r.chemin + 'a.gpkg', P), true);
});

test('cheminsAttendus : .gpkg, -wal, -shm, .qml, .aux.xml, .gpkg.aux.xml par base, tous effaçables', () => {
  const c = L.cheminsAttendus(Q, ['A', 'B']);
  assert.equal(c.length, 12);
  assert.ok(c.includes(Q + 'A.gpkg-wal') && c.includes(Q + 'B.gpkg.aux.xml'));
  for (const x of c) assert.equal(L.peutEffacerQ3(x, P), true, x);
});

// ---------------------------------------------------------------- jugement, durées

const cas = L.CAS.shp;
const bonne = { sourceValide: true, cheminRendu: Q + 'FRT_q7.gpkg', copieValide: true, octets: 98304, entites: 2, authid: 'EPSG:2154', accents: true };

test('jugerCopie : le libellé du plan « écrit : oui, N octets, 2 entités, EPSG:2154, accents lus : oui »', () => {
  const j = L.jugerCopie(cas, bonne);
  assert.equal(j.ok, true);
  assert.equal(j.ecrit, true);
  assert.equal(j.texte, 'écrit : oui, 98304 octets, 2 entités, EPSG:2154, accents lus : oui');
  assert.match(L.jugerCopie(L.CAS.geojson, { ...bonne, accents: null }).texte, /accents lus : sans objet$/);
});

test('jugerCopie : source invalide = essai raté ; chaîne vide = échec MUET dit ; tout échec commence par « ÉCHEC »', () => {
  const raté = L.jugerCopie(cas, { sourceValide: false });
  assert.equal(raté.ok, false);
  assert.match(raté.texte, /^ÉCHEC, essai raté : la source ne charge pas/);
  const muet = L.jugerCopie(cas, { sourceValide: true, cheminRendu: '' });
  assert.equal(muet.ok, false);
  assert.match(muet.texte, /^ÉCHEC MUET : saveVectorLayerAs a rendu une chaîne vide/);
  assert.match(L.jugerCopie(cas, { sourceValide: true }).texte, /^ÉCHEC MUET/);
  for (const m of [{ ...bonne, octets: 0 }, { ...bonne, copieValide: false }, { ...bonne, entites: 0 }, { ...bonne, entites: 1 }, { ...bonne, authid: '' },
    { ...bonne, authid: 'EPSG:4326' }, { ...bonne, accents: false }]) {
    const j = L.jugerCopie(cas, m);
    assert.equal(j.ok, false, JSON.stringify(m));
    assert.match(j.texte, /^ÉCHEC \(non conforme à 2 entités, EPSG:2154\) : écrit : /);
  }
  assert.match(L.jugerCopie(cas, { ...bonne, authid: '' }).texte, /système vide/);
  assert.match(L.jugerCopie(cas, { ...bonne, accents: false }).texte, /accents lus : NON/);
  assert.equal(L.jugerCopie(L.CAS.grand, { ...bonne, entites: 2000 }).ok, true);
  assert.equal(L.jugerCopie(L.CAS.grand, { ...bonne, entites: 2 }).ok, false);
});

test('accentsLus : tous les mots attendus dans les valeurs relues ; sans objet si rien d\'attendu', () => {
  assert.equal(L.accentsLus(['Étang', 'Forêt'], ['Étang', 'Forêt']), true);
  assert.equal(L.accentsLus(['Étang', 'Forêt'], ['Ã‰tang', 'ForÃªt']), false);
  assert.equal(L.accentsLus(['Étang', 'Forêt'], ['Étang']), false);
  assert.equal(L.accentsLus(['Étang'], null), false);
  assert.equal(L.accentsLus([], ['x']), null);
});

test('durées : texte en secondes et millisecondes, médiane, bilan du bouton 12', () => {
  assert.equal(L.texteDuree(1234), '1,23 s (1234 ms)');
  assert.equal(L.texteDuree(0), '0 s (0 ms)');
  assert.equal(L.texteDuree(-1), 'durée illisible');
  assert.equal(L.texteDuree(NaN), 'durée illisible');
  assert.equal(L.medianeMs([]), null);
  assert.equal(L.medianeMs([5, 1, 3]), 3);
  assert.equal(L.medianeMs([4, 1, 3, 2]), 2.5);
  assert.equal(L.medianeMs([7]), 7);
  assert.match(L.bilanChrono([10000]).join('\n'), /Encore 2 appui\(s\)/);
  assert.match(L.bilanChrono([10000, 20000, 30000]).join('\n'), /Médiane des trois derniers : 20 s \(20000 ms\) ; limite du brief 2 min : tenue/);
  assert.match(L.bilanChrono([10000, 200000, 300000]).join('\n'), /NON tenue/);
  assert.match(L.bilanChrono([500000, 10000, 20000, 30000]).join('\n'), /Médiane des trois derniers : 20 s/);
  assert.equal(L.LIMITE_MS, 120000);
  assert.match(L.bilanChrono([120000, 120000, 120000]).join('\n'), /: tenue/);
});

test('ligneSonde : taille ou « absent »', () => {
  assert.equal(L.ligneSonde(Q + 'A.gpkg', 4096, true), 'A.gpkg : 4096 octets');
  assert.equal(L.ligneSonde(Q + 'A.gpkg-wal', 0, false), 'A.gpkg-wal : absent');
  assert.equal(L.ligneSonde(Q + 'A.gpkg-shm', 0, true), 'A.gpkg-shm : 0 octets');
});

// ---------------------------------------------------------------- Essai.qml, version, noms

test('version 0.2.0 dans le module et metadata.txt ; boutons 0b et 8 à 12 présents, numérotés, uniques', () => {
  assert.equal(L.VERSION, '0.2.0');
  assert.match(lire('prototype-2/metadata.txt'), /^version=0\.2\.0$/m);
  const essai = lire('prototype-2/Essai.qml');
  for (const k of ['B0B', 'B8', 'B9', 'B9B', 'B10', 'B11', 'B12']) assert.ok(essai.includes(`text: Zip.BOUTONS.${k};`), k);
  assert.equal(L.NOM_ZIP_Z, 'essai-styles-z.zip');
});

// Corps d'une fonction de Essai.qml (de « function nom( » à la fonction suivante au même retrait).
function corps(nom) {
  const q = lire('prototype-2/Essai.qml');
  const i = q.search(new RegExp(`\\n  function ${nom}\\(`));
  assert.ok(i >= 0, nom);
  const j = q.indexOf('\n  }\n', i);
  return q.slice(i, j + 5);
}

test('Essai.qml : accolades et parenthèses équilibrées (hors chaînes)', () => {
  const q = lire('prototype-2/Essai.qml').replace(/\/\/.*$/gm, '').replace(/"(?:[^"\\\n]|\\.)*"/g, '""').replace(/\/[^/\n]+\/(?=[.,;)])/g, '');
  for (const [a, b] of [['{', '}'], ['(', ')'], ['[', ']']]) assert.equal(q.split(a).length, q.split(b).length, `${a}${b}`);
});

test('Essai.qml : chacun des boutons 0b et 8 à 12 commence par la garde du projet cerf-essai-2.qgs', () => {
  for (const f of ['preparerZipNomme', 'pretQ3', 'fichiersAnnexes']) assert.match(corps(f), /projetOk\(titre\)/, f);
  for (const f of ['unCas', 'geopackageDeuxTables', 'toutEnchainer']) assert.match(corps(f), /pretQ3\(titre, lignes\)/, f);
  assert.match(corps('pretQ3'), /if \(!projetOk\(titre\)\) return false;/);
  for (const [bouton, fonction] of [['B0B', 'preparerZipCompresse'], ['B8', 'shapefileReecrire'], ['B9', 'geojsonReecrire'], ['B9B', 'geojsonGrand'],
    ['B10', 'geopackageDeuxTables'], ['B11', 'fichiersAnnexes'], ['B12', 'toutEnchainer']]) {
    assert.ok(lire('prototype-2/Essai.qml').includes(`text: Zip.BOUTONS.${bouton}; onClicked: essai.${fonction}()`), bouton);
  }
});

test('Essai.qml : isValid de la source vérifié AVANT saveVectorLayerAs ; garde d\'écriture avant chaque écriture', () => {
  const r = corps('reecrire');
  assert.ok(r.indexOf('Source isValid') >= 0 && r.indexOf('Source isValid') < r.indexOf('LayerUtils.saveVectorLayerAs('));
  assert.ok(r.indexOf('if (!src || valide !== true)') < r.indexOf('LayerUtils.saveVectorLayerAs('));
  assert.ok(r.indexOf('Zip.peutEcrireQ3(cible') < r.indexOf('LayerUtils.saveVectorLayerAs('));
  assert.equal((lire('prototype-2/Essai.qml').match(/saveVectorLayerAs\(/g) || []).length, 1);
  assert.ok(corps('ecrireQml').indexOf('Zip.peutEcrireQ3(chemin') < corps('ecrireQml').indexOf('FileUtils.writeFileContent'));
  // le .qml est écrit avant le chargement de la copie
  assert.ok(r.indexOf('ecrireQml(') < r.indexOf('charger(Zip.uriGpkg(rendu'));
  // l'échec muet est rendu visible : chaîne vide dite, contrôles listés, fond rouge
  assert.match(r, /rendu === ""/);
  assert.match(r, /\(chaîne vide\)/);
  assert.match(lire('prototype-2/Essai.qml'), /cadreResultat\.color = echec \? "#ffcdd2"/);
});

test('Essai.qml : rmFile du prototype n° 3 seulement derrière peutEffacerQ3 ; aucune écriture hors des deux gardes', () => {
  const a = corps('fichiersAnnexes');
  assert.ok(a.indexOf('Zip.peutEffacerQ3(presents[i]') >= 0 && a.indexOf('Zip.peutEffacerQ3(') < a.indexOf('platformUtilities.rmFile'));
  assert.equal((a.match(/platformUtilities\.rmFile/g) || []).length, 1);
  const q = lire('prototype-2/Essai.qml');
  // toutes les écritures de fichier : extraire (prototype n° 2, sous cerf-imports par cheminSortie) et ecrireQml (garde q3)
  assert.equal((q.match(/FileUtils\.writeFileContent/g) || []).length, 2);
  // les rmFile sont : question4 (peutEffacerQml) et fichiersAnnexes (peutEffacerQ3)
  assert.equal((q.match(/platformUtilities\.rmFile/g) || []).length, 2);
});

test('Essai.qml : le plugin n\'extrait jamais le zip compressé (pas de inflate), il le lit seulement en /vsizip/', () => {
  const q = (lire('prototype-2/Essai.qml') + lire('prototype-2/essai-logique.mjs')).replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(q, /inflate|pako|DecompressionStream/i);
  assert.match(corps('reecrire'), /Zip\.sourceDuCas\(cas, copieZ\)/);
});

test('plugin/ n\'est pas touché ; le plugin livré garde les mêmes cinq fichiers', async () => {
  const { FICHIERS_PLUGIN } = await import('../prototype-2/empaqueter.mjs');
  assert.deepEqual(FICHIERS_PLUGIN, ['main.qml', 'Essai.qml', 'essai-logique.mjs', 'metadata.txt', 'icon.svg']);
  assert.doesNotMatch(lire('prototype-2/essai-logique.mjs') + lire('prototype-2/Essai.qml'), /\.\.\/plugin\//);
});

// ---------------------------------------------------------------- workflow

test('workflow : essai-styles-z.zip empaqueté, publié (create et upload) et son sha256 écrit dans les notes ; flashcodes inchangés', () => {
  const wf = lire('.github/workflows/release-prototype-2.yml').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  assert.match(wf, /sha256sum cerf-prototype-2\.zip cerf-essai-2\.zip essai-styles\.zip essai-styles-z\.zip essai-q3\.gpkg/);
  assert.match(wf, /gh release upload prototype-2 .*dist\/essai-styles-z\.zip .*dist\/flashcodes\/\* --clobber/);
  assert.match(wf, /avec_reprise\(\) \{ for essai in 1 2 3;/);
  assert.match(wf, /avec_reprise gh release upload prototype-2 /);
  assert.match(wf, /gh release create prototype-2 .*dist\/essai-styles-z\.zip .*dist\/flashcodes\/\*/);
  assert.match(wf, /node outils\/flashcodes\.mjs generer dist\/flashcodes prototype-2 essai/);
  assert.match(wf, /node outils\/flashcodes\.mjs notes prototype-2 essai prototype-2/);
  assert.match(wf, /\/vsizip\/dist\/essai-styles-z\.zip\/FRT_q7\.shp/);
  assert.match(wf, /Commit empaqueté : \$GITHUB_SHA/);
  assert.doesNotMatch(wf, /--latest(?!=false)/);
});

test('protocole : section « Prototype n° 3 », « essai raté » distinct de « non », une capture par réponse, mode avion', () => {
  const t = lire('tests/recette/prototype-2.md');
  const s = t.slice(t.indexOf('## Prototype n° 3'), t.indexOf('## Après l\'essai'));
  assert.ok(s.length > 1000);
  assert.match(s, /« Essai raté » n'est pas « non »/);
  assert.match(s, /Conforme ☐/);
  assert.match(s, /Noté ☐/);
  assert.match(s, /mode avion/i);
  assert.match(s, /essai-styles-z\.zip/);
  assert.match(s, /\*\*8 entrées, toutes\s+compressées\*\*/);
  for (const n of ['p3-q1-ecran.png', 'p3-q2-carte.png', 'p3-q3-ecran.png', 'p3-q3-carte.png', 'p3-q4-ecran.png', 'p3-q4-carte.png', 'p3-q5-ecran.png', 'p3-duree-9b.png', 'p3-duree-12.png']) {
    assert.ok(s.includes(n), n);
    assert.ok(t.split('## Réponses')[1].includes(n), `${n} dans le tableau des réponses`);
  }
  for (const r of ['P3-1', 'P3-2a', 'P3-2b', 'P3-3a', 'P3-3b', 'P3-4a', 'P3-4b', 'P3-5', 'P3-6']) {
    assert.ok(t.split('## Réponses')[1].includes(`| ${r} :`), `ligne ${r} du tableau`);
  }
  assert.match(s, /Étang/);
  assert.match(s, /Forêt/);
  assert.match(t, /Prototype n° 3 : qui fait quoi d'ici quand, et comment saura-t-on que ça marche \?/);
});

// Mission 030, prototype n° 4 : tests de ce qui est pur (zip des tables, GeoPackage d'essai, requête
// de la voie 1 rejouée sur SQLite, verdict, garde des noms de table) et contrôles du texte de
// Essai.qml, du workflow et du protocole. Aucun appel à QField ni à GDAL ici : seul le protocole
// (« Prototype n° 4 » de tests/recette/prototype-2.md), rempli par Pascal sur le Samsung, dit ce
// que QField permet. La requête est rejouée par node:sqlite : même moteur SQL que celui auquel GDAL
// la passe, pas la même chaîne d'appel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { inflateRawSync, inflateSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import * as L from '../prototype-2/essai-logique.mjs';
import * as F from '../prototype-2/fabriquer-essais.mjs';
import { crc32 } from './recette/essai/zip-ecrire.mjs';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (f) => readFileSync(join(racine, f), 'utf8');
const t4 = F.fabriquerEssais4();
const parNom = Object.fromEntries(t4.entrees.map((e) => [e.nom, e.donnees]));
const sha = (b) => createHash('sha256').update(b).digest('hex');

// Ouvre des octets de GeoPackage avec node:sqlite (lecture seule), rend fn(db).
function avecBase(octets, fn) {
  const d = mkdtempSync(join(tmpdir(), 'cerf-p4-'));
  try {
    const chemin = join(d, 'x.gpkg');
    writeFileSync(chemin, octets);
    const db = new DatabaseSync(chemin, { readOnly: true });
    try { return fn(db); } finally { db.close(); }
  } finally { rmSync(d, { recursive: true, force: true }); }
}

// ---------------------------------------------------------------- le zip des tables

test('essai-tables-z.zip : 6 entrées, TOUTES de méthode 8 (répertoire central et en-têtes locaux), dans l\'ordre', () => {
  const { entrees } = L.listerZip(t4.zip);
  assert.equal(L.NOM_ZIP_T, 'essai-tables-z.zip');
  assert.deepEqual(entrees.map((e) => e.nom), F.NOMS_ENTREES_T);
  assert.deepEqual(F.NOMS_ENTREES_T, ['essai-q3.gpkg', 'essai-gpkg2.gpkg', 'raster-seul.gpkg', 'vide.gpkg', 'tronque-debut.gpkg', 'tronque-fin.gpkg']);
  assert.deepEqual(L.ORDRE_GPKG_TABLES.map((k) => L.GPKG_TABLES[k].nom), F.NOMS_ENTREES_T);
  for (const e of entrees) {
    assert.equal(e.methode, 8, e.nom);
    assert.equal(t4.zip.readUInt32LE(e.decalageLocal), 0x04034b50, e.nom);
    assert.equal(t4.zip.readUInt16LE(e.decalageLocal + 8), 8, `méthode de l'en-tête local de ${e.nom}`);
  }
  assert.throws(() => L.extraireEntree(t4.zip, entrees[0]), /entrée compressée \(méthode 8\)/);
});

test('essai-tables-z.zip : tailles et CRC32 justes, inflateRawSync redonne les octets d\'origine, vraiment compressé', () => {
  for (const e of L.listerZip(t4.zip).entrees) {
    const origine = parNom[e.nom];
    assert.equal(e.taille, origine.length, e.nom);
    assert.equal(e.crc32, crc32(origine), e.nom);
    assert.equal(e.crc32, L.crc32(origine), e.nom);
    const debut = e.decalageLocal + 30 + t4.zip.readUInt16LE(e.decalageLocal + 26) + t4.zip.readUInt16LE(e.decalageLocal + 28);
    assert.equal(Buffer.compare(inflateRawSync(t4.zip.subarray(debut, debut + e.tailleCompressee)), origine), 0, e.nom);
  }
  assert.ok(t4.zip.length * 4 < t4.entrees.reduce((a, e) => a + e.donnees.length, 0));
});

test('fabrication déterministe ; les deux autres zips et essai-q3.gpkg INCHANGÉS (sha256 du commit 1a17b47)', () => {
  assert.equal(Buffer.compare(F.fabriquerEssais4().zip, t4.zip), 0);
  assert.equal(sha(F.fabriquerEssais().zip), 'b8274d36eaa5c04843b3b55e670347c7d44788366f3e5d05bf44aa5957d920da');
  assert.equal(sha(F.fabriquerEssais().gpkg), '733486cf7aeae55b2d6881a20789e087f5432aa13397f9d60432d3121a67350b');
  assert.equal(sha(F.fabriquerEssais3().zip), '5ed57a1239348464ff7a7967a7ba6c34c4a7f8444ac8576a57b1659168cfa648');
});

test('essai-q3.gpkg et essai-gpkg2.gpkg du zip des tables : les mêmes octets qu\'aux prototypes n° 2 et n° 3', () => {
  assert.equal(Buffer.compare(parNom['essai-q3.gpkg'], F.fabriquerEssais().gpkg), 0);
  assert.equal(Buffer.compare(parNom['essai-gpkg2.gpkg'], F.fabriquerEssais3().entrees.find((e) => e.nom === L.NOM_GPKG2).donnees), 0);
});

// ---------------------------------------------------------------- la requête de la voie 1, rejouée

const lignesSql = (octets) => avecBase(octets, (db) => db.prepare(L.SQL_TABLES).all().map((r) => [r.table_name, r.data_type]));

test('voie 1 rejouée (node:sqlite) : essai-q3.gpkg rend Parcelles_q3 (features) et layer_styles (attributes)', () => {
  assert.deepEqual(lignesSql(parNom['essai-q3.gpkg']), [['Parcelles_q3', 'features'], ['layer_styles', 'attributes']]);
});

test('voie 1 rejouée : essai-gpkg2.gpkg rend Parcelles et Zones, toutes deux « features »', () => {
  assert.deepEqual(lignesSql(parNom['essai-gpkg2.gpkg']), [['Parcelles', 'features'], ['Zones', 'features']]);
  assert.equal(L.TYPE_VECTEUR, 'features');
});

test('voie 1 rejouée : raster-seul.gpkg rend une seule ligne « tiles », vide.gpkg aucune ligne', () => {
  assert.deepEqual(lignesSql(parNom['raster-seul.gpkg']), [[F.TABLE_RASTER, 'tiles']]);
  assert.deepEqual(lignesSql(parNom['vide.gpkg']), []);
  for (const n of ['raster-seul.gpkg', 'vide.gpkg']) {
    avecBase(parNom[n], (db) => {
      assert.equal(db.prepare('PRAGMA application_id').get().application_id, 1196444487, n);
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM gpkg_geometry_columns').get().n, 0, `${n} : aucune colonne géométrique`);
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM gpkg_spatial_ref_sys WHERE srs_id = 2154').get().n, 1, n);
    });
  }
});

test('tronqués : coupés à une frontière de page de essai-gpkg2.gpkg ; SQLite les refuse (« malformed »), jamais une liste', () => {
  const deux = parNom['essai-gpkg2.gpkg'];
  assert.equal(deux.length, 11 * F.TAILLE_PAGE);
  assert.equal(deux.readUInt16BE(16), F.TAILLE_PAGE, 'taille de page de l\'en-tête SQLite');
  assert.equal(deux.readUInt32BE(28), 11, 'nombre de pages annoncé par l\'en-tête');
  for (const [n, pages] of [['tronque-debut.gpkg', F.PAGES_TRONQUE_DEBUT], ['tronque-fin.gpkg', F.PAGES_TRONQUE_FIN]]) {
    const b = parNom[n];
    assert.equal(b.length, pages * F.TAILLE_PAGE, n);
    assert.equal(Buffer.compare(b, deux.subarray(0, b.length)), 0, `${n} : début identique à essai-gpkg2.gpkg`);
    assert.ok(b.readUInt32BE(28) > pages, `${n} : l'en-tête annonce plus de pages que le fichier n'en a`);
    assert.throws(() => lignesSql(b), /malformed|corrupt/i, n);
  }
  assert.deepEqual([F.PAGES_TRONQUE_DEBUT, F.PAGES_TRONQUE_FIN], [1, 10]);
});

// ---------------------------------------------------------------- le GeoPackage raster

test('raster-seul.gpkg : une tuile PNG 256 x 256 valide, une matrice de tuiles, emprise en EPSG:2154', () => {
  avecBase(parNom['raster-seul.gpkg'], (db) => {
    const tms = db.prepare('SELECT * FROM gpkg_tile_matrix_set').all();
    assert.equal(tms.length, 1);
    assert.equal(Number(tms[0].srs_id), 2154);
    const tm = db.prepare('SELECT * FROM gpkg_tile_matrix').all();
    assert.deepEqual(tm.map((r) => [r.zoom_level, r.matrix_width, r.matrix_height, r.tile_width, r.tile_height]), [[0, 1, 1, 256, 256]]);
    assert.equal(tm[0].pixel_x_size * 256, tms[0].max_x - tms[0].min_x, 'taille du pixel x 256 = largeur de l\'emprise');
    const tuile = Buffer.from(db.prepare(`SELECT tile_data FROM ${F.TABLE_RASTER}`).get().tile_data);
    assert.deepEqual([...tuile.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'signature PNG');
    assert.equal(tuile.toString('latin1', 12, 16), 'IHDR');
    assert.equal(tuile.readUInt32BE(16), 256);
    assert.equal(tuile.readUInt32BE(20), 256);
    assert.equal(tuile.readUInt32BE(29), crc32(tuile.subarray(12, 29)), 'CRC de IHDR');
    const lIdat = tuile.readUInt32BE(33);
    assert.equal(tuile.toString('latin1', 37, 41), 'IDAT');
    assert.equal(inflateSync(tuile.subarray(41, 41 + lIdat)).length, 257 * 256, 'une ligne = octet de filtre + 256 pixels');
    assert.equal(tuile.toString('latin1', tuile.length - 8, tuile.length - 4), 'IEND');
  });
});

test('point du terrain : le coin sud-ouest du raster est en EPSG:2154, X (est) 1 050 963 puis Y (nord) 6 837 912, dans la France métropolitaine', () => {
  avecBase(parNom['raster-seul.gpkg'], (db) => {
    const c = db.prepare('SELECT min_x, min_y, max_x, max_y, srs_id FROM gpkg_contents').get();
    assert.equal(Number(c.srs_id), 2154);
    assert.equal(c.min_x, 1050963, 'X (est), EPSG:2154');
    assert.equal(c.min_y, 6837912, 'Y (nord), EPSG:2154');
    assert.deepEqual([c.max_x, c.max_y], [1051263, 6838212]);
    assert.ok(L.empriseVraisemblable({ xMinimum: c.min_x, xMaximum: c.max_x, yMinimum: c.min_y, yMaximum: c.max_y }));
  });
  assert.deepEqual(F.EMPRISE_RASTER, { xmin: 1050963, ymin: 6837912, xmax: 1051263, ymax: 6838212 });
});

// ---------------------------------------------------------------- sources, garde des noms

test('sources : requête après « |subset= », sondes « |layerid=N », table après « |layername= »', () => {
  const g = '/vsizip//p/cerf-imports/essai-tables-z.zip/essai-gpkg2.gpkg';
  assert.equal(L.uriTablesSql(g), g + '|subset=SELECT table_name, data_type FROM gpkg_contents ORDER BY table_name');
  assert.match(L.SQL_TABLES, /^SELECT /, 'QGIS ne passe à GDAL comme requête qu\'un filtre qui commence par « SELECT »');
  assert.equal(L.uriLayerId(g, 3), g + '|layerid=3');
  assert.equal(L.uriGpkg(g, 'Zones'), g + '|layername=Zones');
  assert.equal(L.cheminVsizip('/p/cerf-imports/essai-tables-z.zip', 'vide.gpkg'), '/vsizip//p/cerf-imports/essai-tables-z.zip/vide.gpkg');
  assert.ok(L.MAX_SONDES >= 2 && L.MAX_SONDES <= 50);
});

test('nomDeTableSur : refuse « | », retour à la ligne, vide, non-texte ; admet accents et espaces', () => {
  for (const ok of ['Parcelles', 'Parcelles_q3', 'Unités de gestion', 'UG-2026', 'Étang']) assert.equal(L.nomDeTableSur(ok), true, ok);
  for (const non of ['', 'a|subset=SELECT 1', 'a\nb', 'a\rb', 'a\u0000b', 'x'.repeat(201), null, undefined, 42]) assert.equal(L.nomDeTableSur(non), false, String(non));
});

// ---------------------------------------------------------------- relecture d'une table

test('jugerTableRelue : 2 et 2 = juste ; invalide, erreur, -1, comptes différents, 0 entité = échec', () => {
  assert.deepEqual(L.jugerTableRelue({ valide: true, compteDirect: 2, compteIterateur: 2 }), { ok: true, texte: 'featureCount() = 2, itérateur : 2 entité(s)' });
  assert.equal(L.jugerTableRelue({ valide: true, compteDirect: null, compteIterateur: 2 }).ok, true);
  assert.match(L.jugerTableRelue({ valide: true, compteDirect: null, compteIterateur: 2 }).texte, /featureCount\(\) non appelable/);
  for (const [r, motif] of [
    [null, /ne s'ouvre pas/], [{ valide: false }, /ne s'ouvre pas/],
    [{ valide: true, compteDirect: 2, compteIterateur: -1 }, /itérateur : ERREUR : lecture en échec/],
    [{ valide: true, compteDirect: -1, compteIterateur: 0 }, /nombre d'entités illisible/],
    [{ valide: true, compteDirect: 2, compteIterateur: 1 }, /les deux comptes diffèrent/],
    [{ valide: true, compteDirect: null, compteIterateur: 0 }, /0 entité lue \(table vide ou illisible : indiscernable\)/],
    [{ valide: true, compteDirect: 0, compteIterateur: 0 }, /indiscernable/],
  ]) {
    const j = L.jugerTableRelue(r);
    assert.equal(j.ok, false, JSON.stringify(r));
    assert.match(j.texte, motif);
  }
});

// ---------------------------------------------------------------- verdict

const deuxOk = { Parcelles: { valide: true, compteDirect: 2, compteIterateur: 2 }, Zones: { valide: true, compteDirect: 2, compteIterateur: 2 } };
const sqlDeux = { valide: true, lu: true, erreur: '', lignes: [{ table: 'Parcelles', type: 'features' }, { table: 'Zones', type: 'features' }] };
const invalide = { valide: false, lu: false, erreur: '', lignes: [] };

// Ce que les sources de QGIS et de GDAL prédisent pour chaque GeoPackage du zip (la mesure « comme prévu »).
const PREVU = {
  q3: { sql: { valide: true, lu: true, lignes: [{ table: 'Parcelles_q3', type: 'features' }, { table: 'layer_styles', type: 'attributes' }] },
    relues: { Parcelles_q3: { valide: true, compteDirect: 2, compteIterateur: 2 } }, sondes: { nombre: 2 }, raster: { valide: null } },
  deux: { sql: sqlDeux, relues: deuxOk, sondes: { nombre: 2 }, raster: { valide: null } },
  raster: { sql: invalide, relues: {}, sondes: { nombre: 0 }, raster: { valide: true } },
  vide: { sql: invalide, relues: {}, sondes: { nombre: 0 }, raster: { valide: false } },
  tronqueDebut: { sql: invalide, relues: {}, sondes: { nombre: 0 }, raster: { valide: false } },
  tronqueFin: { sql: invalide, relues: {}, sondes: { nombre: 0 }, raster: { valide: false } },
};

test('verdict « comme prévu » : conforme à l\'attendu pour les six GeoPackage, textes du protocole', () => {
  const textes = {};
  for (const k of L.ORDRE_GPKG_TABLES) {
    const v = L.verdictTables(PREVU[k]);
    assert.equal(L.conformeAttendu(v, L.GPKG_TABLES[k].attendu), true, k);
    assert.deepEqual(v.alertes, [], k);
    textes[k] = v.texte;
  }
  assert.equal(textes.q3, 'Tables vecteur (1) : Parcelles_q3 ; autres tables, non vecteur : layer_styles (attributes)');
  assert.equal(textes.deux, 'Tables vecteur (2) : Parcelles, Zones');
  assert.equal(textes.raster, 'Aucune table vecteur : rien ne s\'ouvre en vecteur, mais le GeoPackage est lu en raster (GeoPackage lisible, raster seul)');
  for (const k of ['vide', 'tronqueDebut', 'tronqueFin']) {
    assert.equal(textes[k], 'ÉCHEC : GeoPackage illisible, ou sans aucun contenu : GDAL ne l\'ouvre ni en vecteur ni en raster. Ce n\'est pas « aucune table ».', k);
  }
  const p = lire('tests/recette/prototype-2.md');
  for (const k of L.ORDRE_GPKG_TABLES) assert.ok(p.includes(textes[k]), `texte du verdict de ${k} recopié tel quel dans le protocole`);
});

test('verdict : une erreur ne rend JAMAIS « aucune » (toutes les combinaisons d\'échec de la voie 1, des sondes et du raster)', () => {
  const sqls = [invalide, { valide: true, lu: false, erreur: 'lecture des lignes : ERREUR x', lignes: [] }];
  for (const sql of sqls) {
    for (const nombre of [0, 1, 2]) {
      for (const raster of [false, null, undefined]) {
        const v = L.verdictTables({ sql, relues: {}, sondes: { nombre }, raster: { valide: raster } });
        assert.equal(v.genre, 'echec', JSON.stringify({ sql, nombre, raster }));
        assert.match(v.texte, /^ÉCHEC/);
      }
    }
  }
  // mesure absente ou vide : échec, pas « aucune »
  for (const m of [{}, { sql: null }, { sql: {} }]) assert.equal(L.verdictTables(m).genre, 'echec', JSON.stringify(m));
});

test('verdict : voie 1 en échec alors que la voie 2 ouvre des couches = échec de la voie, pas « aucune »', () => {
  const v = L.verdictTables({ sql: invalide, relues: {}, sondes: { nombre: 2 }, raster: { valide: null } });
  assert.equal(v.genre, 'echec');
  assert.equal(v.texte, 'ÉCHEC de la voie 1 : la requête sur gpkg_contents ne charge pas, alors que GDAL ouvre 2 couche(s) par layerid');
  // même si un raster répondait : les sondes passent avant
  assert.equal(L.verdictTables({ sql: invalide, relues: {}, sondes: { nombre: 1 }, raster: { valide: true } }).genre, 'echec');
});

test('verdict : une table listée mais illisible = échec qui la nomme (jamais une liste juste pour un fichier abîmé)', () => {
  for (const zones of [undefined, { valide: false }, { valide: true, compteDirect: -1, compteIterateur: 0 }, { valide: true, compteDirect: null, compteIterateur: 0 }]) {
    const v = L.verdictTables({ sql: sqlDeux, relues: { Parcelles: deuxOk.Parcelles, Zones: zones }, sondes: { nombre: 2 }, raster: { valide: null } });
    assert.equal(v.genre, 'echec', JSON.stringify(zones));
    assert.equal(v.texte, 'ÉCHEC : gpkg_contents nomme 2 table(s) vecteur (Parcelles, Zones), mais illisible(s) : Zones');
    assert.equal(L.conformeAttendu(v, L.GPKG_TABLES.deux.attendu), false);
  }
});

test('verdict : gpkg_contents lu sans table « features » = aucune (et ses lignes sont dites) ; lu vide = échec', () => {
  const a = L.verdictTables({ sql: { valide: true, lu: true, lignes: [{ table: 'layer_styles', type: 'attributes' }] }, relues: {}, sondes: { nombre: 1 }, raster: { valide: null } });
  assert.equal(a.genre, 'aucune');
  assert.equal(a.texte, 'Aucune table vecteur : gpkg_contents lu, 1 ligne(s), aucune de type « features » : layer_styles (attributes)');
  assert.deepEqual(a.alertes, []);
  const b = L.verdictTables({ sql: { valide: true, lu: true, lignes: [] }, relues: {}, sondes: { nombre: 1 }, raster: { valide: null } });
  assert.equal(b.genre, 'echec');
  assert.match(b.texte, /^ÉCHEC : la requête a ouvert le GeoPackage mais gpkg_contents est lu vide/);
});

test('verdict : nombre de la voie 2 différent de gpkg_contents = ATTENTION, sans changer la liste', () => {
  const v = L.verdictTables({ sql: sqlDeux, relues: deuxOk, sondes: { nombre: 3 }, raster: { valide: null } });
  assert.equal(v.genre, 'liste');
  assert.deepEqual(v.alertes, ['ATTENTION : la voie 2 ouvre 3 couche(s) par layerid, gpkg_contents en nomme 2 (vecteur et attributs)']);
});

test('conformeAttendu : genre et liste exacte (ordre indifférent) ; une table en trop ou en moins = non', () => {
  const att = L.GPKG_TABLES.deux.attendu;
  assert.equal(L.conformeAttendu({ genre: 'liste', tables: ['Zones', 'Parcelles'] }, att), true);
  assert.equal(L.conformeAttendu({ genre: 'liste', tables: ['Parcelles'] }, att), false);
  assert.equal(L.conformeAttendu({ genre: 'liste', tables: ['Parcelles', 'Zones', 'layer_styles'] }, att), false);
  assert.equal(L.conformeAttendu({ genre: 'liste', tables: ['Parcelles', 'Zone'] }, att), false);
  assert.equal(L.conformeAttendu({ genre: 'aucune', tables: [] }, L.GPKG_TABLES.vide.attendu), false, 'un vide pris pour « aucune » n\'est pas l\'attendu');
  assert.equal(L.conformeAttendu({ genre: 'aucune', tables: [] }, L.GPKG_TABLES.tronqueFin.attendu), false);
  assert.equal(L.conformeAttendu(null, att), false);
  assert.equal(L.texteAttendu(att), 'Tables vecteur (2) : Parcelles, Zones');
  assert.equal(L.texteAttendu(L.GPKG_TABLES.raster.attendu), 'Aucune table vecteur');
  assert.equal(L.texteAttendu(L.GPKG_TABLES.vide.attendu), 'ÉCHEC visible');
});

test('attendus : les deux GeoPackage lisibles listent exactement les tables « features » de leur gpkg_contents', () => {
  for (const k of ['q3', 'deux']) {
    const vect = lignesSql(parNom[L.GPKG_TABLES[k].nom]).filter((l) => l[1] === 'features').map((l) => l[0]);
    assert.deepEqual(L.GPKG_TABLES[k].attendu, { genre: 'liste', tables: vect }, k);
  }
});

// ---------------------------------------------------------------- Essai.qml

function corps(nom) {
  const q = lire('prototype-2/Essai.qml');
  const i = q.search(new RegExp(`\\n  function ${nom}\\(`));
  assert.ok(i >= 0, nom);
  const j = q.indexOf('\n  }\n', i);
  return q.slice(i, j + 5);
}

test('version 2.4.0 ; boutons 0c et 13 câblés, après le 12 ; la garde du projet d\'essai d\'abord', () => {
  assert.equal(L.VERSION, '2.4.0');
  assert.match(lire('prototype-2/metadata.txt'), /^version=2\.4\.0$/m);
  assert.equal(L.BOUTONS.B0C, '0c. Préparer le zip des tables');
  assert.equal(L.BOUTONS.B13, '13. Tables des GeoPackage');
  const q = lire('prototype-2/Essai.qml');
  const i12 = q.indexOf('text: Zip.BOUTONS.B12;');
  const i0c = q.indexOf('text: Zip.BOUTONS.B0C; onClicked: essai.preparerZipTables()');
  const i13 = q.indexOf('text: Zip.BOUTONS.B13; onClicked: essai.tablesDesGpkg()');
  assert.ok(i12 > 0 && i0c > i12 && i13 > i0c);
  assert.match(corps('preparerZipTables'), /preparerZipNomme\(Zip\.BOUTONS\.B0C, Zip\.NOM_ZIP_T\)/);
  assert.match(corps('zipRecu'), /zipEnCours === Zip\.NOM_ZIP_T\) \{ zipTablesRecu\(recu\); return; \}/);
  assert.match(corps('pretTables'), /if \(!projetOk\(titre\)\) return false;/);
  assert.match(corps('tablesDesGpkg'), /if \(!pretTables\(titre, lignes\)\)/);
  assert.match(corps('pretTables'), /ÉCHEC, essai raté : le zip des tables n'est pas là/);
});

test('Essai.qml, bouton 13 : n\'écrit rien, n\'efface rien, n\'ajoute rien à la carte', () => {
  const p4 = ['pretTables', 'liberer', 'voieSql', 'relireTable', 'voieLayerId', 'tablesDUnGpkg', 'tablesDesGpkg'].map(corps).join('\n');
  for (const interdit of ['writeFileContent', 'rmFile', 'saveVectorLayerAs', 'addMapLayer', 'charger(', 'deleteFiles']) assert.ok(!p4.includes(interdit), interdit);
  // les couches de sonde sont détruites après lecture
  for (const f of ['voieSql', 'relireTable', 'voieLayerId']) assert.match(corps(f), /liberer\(couche\)/, f);
  assert.match(corps('liberer'), /couche\.deleteLater\(\)/);
});

test('Essai.qml, bouton 13 : voie 1 par Zip.uriTablesSql, voie 2 par Zip.uriLayerId, relecture par Zip.uriGpkg derrière la garde du nom', () => {
  const v1 = corps('voieSql');
  assert.match(v1, /LayerUtils\.loadVectorLayer\(Zip\.uriTablesSql\(chemin\)/);
  assert.match(v1, /f\.attribute\("table_name"\)/);
  assert.match(v1, /f\.attribute\("data_type"\)/);
  assert.match(v1, /champ table_name absent/);
  assert.ok(v1.indexOf('r.lu = true') > v1.indexOf('it.close()'), 'lu seulement après la dernière ligne');
  assert.match(corps('voieLayerId'), /LayerUtils\.loadVectorLayer\(Zip\.uriLayerId\(chemin, i\)/);
  assert.match(corps('voieLayerId'), /i < Zip\.MAX_SONDES/);
  const r = corps('relireTable');
  assert.ok(r.indexOf('Zip.nomDeTableSur(table)') < r.indexOf('LayerUtils.loadVectorLayer(Zip.uriGpkg(chemin, table)'));
  const g = corps('tablesDUnGpkg');
  assert.match(g, /Zip\.cheminVsizip\(copieT, g\.nom\)/);
  assert.match(g, /Zip\.verdictTables\(/);
  assert.match(g, /Zip\.conformeAttendu\(v, g\.attendu\)/);
  // le raster n'est essayé que si rien ne s'ouvre en vecteur
  assert.match(g, /if \(!sql\.valide && sondes\.nombre === 0\) \{[\s\S]*LayerUtils\.loadRasterLayer\(chemin/);
  // le fond rouge ne vient que d'un GeoPackage non conforme à l'attendu
  assert.match(corps('tablesDesGpkg'), /\(r\.conforme \? "" : "ÉCHEC, non conforme à l'attendu : "\)/);
});

test('Essai.qml : le plugin n\'extrait toujours pas de zip compressé (aucun inflate), même nombre d\'écritures qu\'au prototype n° 3', () => {
  const q = lire('prototype-2/Essai.qml');
  assert.doesNotMatch((q + lire('prototype-2/essai-logique.mjs')).replace(/\/\/.*$/gm, ''), /inflate|pako|DecompressionStream/i);
  assert.equal((q.match(/FileUtils\.writeFileContent/g) || []).length, 2);
  assert.equal((q.match(/platformUtilities\.rmFile/g) || []).length, 2);
  assert.equal((q.match(/saveVectorLayerAs\(/g) || []).length, 1);
});

// ---------------------------------------------------------------- workflow et protocole

test('workflow : essai-tables-z.zip publié (create et upload), sha256 dans les notes, contrôle GDAL de la requête', () => {
  const wf = lire('.github/workflows/release-prototype-2.yml').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  assert.match(wf, /sha256sum [^\n]*essai-q3\.gpkg essai-tables-z\.zip\)/);
  assert.match(wf, /avec_reprise gh release upload prototype-2 [^\n]*dist\/essai-tables-z\.zip dist\/flashcodes\/\* --clobber/);
  assert.match(wf, /gh release create prototype-2 [^\n]*dist\/essai-tables-z\.zip dist\/flashcodes\/\*/);
  assert.match(wf, /ogrinfo -ro -sql 'SELECT table_name, data_type FROM gpkg_contents' essai-gpkg2\.gpkg/);
  assert.match(wf, /gdalinfo raster-seul\.gpkg/);
  assert.match(wf, /! ogrinfo -ro \$Z\/tronque-fin\.gpkg/);
  assert.match(wf, /if \[ -f tables\.txt \]; then cat tables\.txt; fi/);
  assert.match(wf, /node outils\/flashcodes\.mjs generer dist\/flashcodes prototype-2 essai/);
  assert.match(lire('prototype-2/empaqueter.mjs'), /'essai-tables-z\.zip': essais4\.zip/);
});

test('protocole : section « Prototype n° 4 » avant « Après l\'essai », trois questions, captures, réponses, mode avion', () => {
  const t = lire('tests/recette/prototype-2.md');
  const debut = t.indexOf('## Prototype n° 4');
  assert.ok(debut > t.indexOf('## Prototype n° 3') && debut < t.indexOf('## Après l\'essai'));
  const s = t.slice(debut, t.indexOf('## Après l\'essai'));
  for (const q of ['### Question P4-1', '### Question P4-2', '### Question P4-3']) assert.ok(s.includes(q), q);
  assert.match(s, /mode avion/i);
  assert.match(s, /\*\*2\.4\.0\*\*/);
  assert.match(s, /\*\*6 entrées, toutes compressées\*\*/);
  assert.ok(s.includes('https://github.com/pobsteta/cerf/releases/download/prototype-2/essai-tables-z.zip'));
  for (const b of ['B0C', 'B13']) assert.ok(s.includes(`« ${L.BOUTONS[b]} »`), b);
  for (const n of F.NOMS_ENTREES_T) assert.ok(s.includes(`\`${n}\``), n);
  assert.match(s, /« Essai raté » n'est pas « non »/);
  assert.match(s, /Conforme ☐/);
  assert.match(s, /Noté ☐/);
  assert.match(s, /\*\*erreur visible\*\*/);
  assert.match(s, /\*\*liste vide\*\*/);
  assert.match(s, /Conformes à l'attendu : 6 sur 6/);
  assert.match(s, /\*\*Si non/);
  assert.match(s, /\*\*Vu autrement/);
  const reponses = t.split('## Réponses')[1];
  for (const c of ['p4-q0-ecran.png', 'p4-resume.png', 'p4-detail-1.png']) {
    assert.ok(s.includes(c), c);
    assert.ok(reponses.includes(c), `${c} dans le tableau des réponses`);
  }
  for (const r of ['P4-1', 'P4-2', 'P4-3']) assert.ok(reponses.includes(`| ${r} :`), r);
  assert.match(t, /Prototype n° 4 : qui fait quoi d'ici quand, et comment saura-t-on que ça marche \?/);
});

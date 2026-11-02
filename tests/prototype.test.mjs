// SPDX-License-Identifier: GPL-3.0-or-later
// Mission 004 : tests du prototype n° 1 (plugin QField jetable, dossier prototype/).
// Ils prouvent la logique du module prototype/cerf-zip.mjs et la forme du plugin, sous
// Node. Ils ne prouvent RIEN sur QField : l'API de QField (copie, lecture, effacement,
// chargement des couches, import du .mjs) n'est prouvée que par le protocole
// tests/recette/prototype-1.md, rempli par Pascal sur le Samsung.
// Sources : prototype/PLAN.md (validé par Pascal le 2 novembre 2026) ; ADR 0003, 0005 ;
// docs/spec.md § 3.3 et § 9 ; décisions de Pascal dans pilotage/missions/004-prototype-1.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { ecrireZip } from './recette/essai/zip-ecrire.mjs';
import { X_L93, Y_L93, QML } from './recette/essai/fabriquer-essais.mjs';

const ici = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ici, '..');
const PROTO = join(RACINE, 'prototype');
const ESSAI = join(ici, 'recette', 'essai');

const Zip = await import(join(PROTO, 'cerf-zip.mjs'));
const Essai = await import(join(PROTO, 'module-essai.mjs'));

const octetsEssai = readFileSync(join(ESSAI, 'essai.zip'));
const octetsCp437 = readFileSync(join(ESSAI, 'essai-cp437.zip'));

// Copie exacte en ArrayBuffer : c'est ce que QML devrait rendre pour un QByteArray (Qt 6).
const enArrayBuffer = (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);

const NOMS_ESSAI = [
  'points_essai.geojson',
  'sous-dossier/notes.txt',
  'sous-dossier/shape_essai.cpg',
  'sous-dossier/shape_essai.dbf',
  'sous-dossier/shape_essai.prj',
  'sous-dossier/shape_essai.qml',
  'sous-dossier/shape_essai.qmd',
  'sous-dossier/shape_essai.shp',
  'sous-dossier/shape_essai.shx',
];

// ---------------------------------------------------------------- Question 4 : module .mjs

test('Q4 : prototype/module-essai.mjs est identique, octet pour octet, au module du testeur', () => {
  const a = readFileSync(join(PROTO, 'module-essai.mjs'));
  const b = readFileSync(join(ESSAI, 'module-essai.mjs'));
  assert.ok(a.equals(b), 'le module embarqué doit être la copie exacte de tests/recette/essai/module-essai.mjs');
});

test('Q4 : le module embarqué donne somme(2, 3) = 5 et SIGNATURE = cerf-prototype-1', () => {
  assert.equal(Essai.somme(2, 3), 5);
  assert.equal(Essai.SIGNATURE, 'cerf-prototype-1');
});

test('ADR 0005 : aucun .pragma ni .import dans les modules du prototype', () => {
  for (const f of ['cerf-zip.mjs', 'module-essai.mjs']) {
    const texte = readFileSync(join(PROTO, f), 'utf8');
    assert.doesNotMatch(texte, /^\s*\.pragma/m, `${f} : .pragma interdit`);
    assert.doesNotMatch(texte, /^\s*\.import/m, `${f} : .import interdit`);
    assert.doesNotMatch(texte, /^\s*import\s/m, `${f} : le module doit se suffire (aucun import)`);
  }
});

// ---------------------------------------------------------------- Questions 1, 2, 8 : lister

test('Q1 : la liste de essai.zip donne exactement les 9 noms du protocole (ArrayBuffer)', () => {
  const r = Zip.listerZip(enArrayBuffer(octetsEssai));
  assert.equal(r.entrees.length, 9);
  assert.deepEqual(r.entrees.map((e) => e.nom).sort(), [...NOMS_ESSAI].sort());
});

test('Q1 : la même liste depuis un Uint8Array', () => {
  const r = Zip.listerZip(new Uint8Array(octetsEssai));
  assert.deepEqual(r.entrees.map((e) => e.nom).sort(), [...NOMS_ESSAI].sort());
});

test('Q1 : chaque entrée porte sa méthode et ses tailles lues dans le répertoire central', () => {
  const r = Zip.listerZip(new Uint8Array(octetsEssai));
  const qml = r.entrees.find((e) => e.nom === 'sous-dossier/shape_essai.qml');
  assert.equal(qml.taille, 635, 'taille décompressée annoncée par le zip');
  assert.equal(qml.methode, 8, 'essai.zip range ses entrées en deflate');
  assert.ok(qml.tailleCompressee > 0 && qml.tailleCompressee < 635);
});

test('Q1 : des octets qui ne sont pas un zip donnent une erreur au message clair', () => {
  assert.throws(() => Zip.listerZip(new TextEncoder().encode('ceci n’est pas un zip, juste du texte')),
    (e) => /n'est pas un zip/.test(e.message));
  assert.throws(() => Zip.listerZip(new Uint8Array(0)), (e) => /vide/.test(e.message));
});

test('Q1 : un zip tronqué donne une erreur au message clair', () => {
  const tronque = new Uint8Array(octetsEssai.subarray(0, octetsEssai.length - 40));
  assert.throws(() => Zip.listerZip(tronque), (e) => /tronqué|n'est pas un zip/.test(e.message));
  // Fin de répertoire intacte mais répertoire central coupé.
  const coupe = new Uint8Array(octetsEssai);
  coupe.fill(0, coupe.length - 22 - 100, coupe.length - 22);
  assert.throws(() => Zip.listerZip(coupe), (e) => /tronqué|abîmé/.test(e.message));
});

test('Q1 : un ArrayBuffer vide (lecture refusée par QField) donne 0 octet, sans erreur', () => {
  assert.equal(Zip.octetsDe(new ArrayBuffer(0)).length, 0);
});

test('Q1 : un type d’octets inattendu (texte) est refusé avec son type', () => {
  assert.throws(() => Zip.listerZip('PK'), (e) => /string/.test(e.message));
});

test('Q8 : seul un fichier finissant par .zip est accepté, avec message sinon', () => {
  assert.equal(Zip.estNomDeZip('essai.zip'), true);
  assert.equal(Zip.estNomDeZip('ESSAI.ZIP'), true);
  assert.equal(Zip.estNomDeZip('essai.gpkg'), false);
  assert.equal(Zip.estNomDeZip(''), false);
  assert.match(Zip.messageNomRefuse('photo.jpg'), /photo\.jpg/);
  assert.match(Zip.messageNomRefuse('photo.jpg'), /\.zip/);
});

// ---------------------------------------------------------------- Question 9 : CP437

test('Q9 : le nom CP437 de essai-cp437.zip se lit forêt/parcelle_é.txt', () => {
  const r = Zip.listerZip(new Uint8Array(octetsCp437));
  assert.equal(r.entrees.length, 1);
  assert.equal(r.entrees[0].nom, 'forêt/parcelle_é.txt');
  assert.equal(r.entrees[0].utf8, false);
});

test('Q9 : la table CP437 a 128 valeurs ; 0x88 = ê, 0x82 = é, 0xE1 = ß', () => {
  assert.equal(Zip.CP437_HAUT.length, 128);
  assert.equal(Zip.decoderCp437(new Uint8Array([0x88, 0x82, 0xe1])), 'êéß');
  assert.equal(Zip.decoderCp437(new Uint8Array([0x41, 0x2f])), 'A/');
});

test('Q9 : un nom UTF-8 (bit 11) est décodé en UTF-8, caractères de 2, 3 et 4 octets', () => {
  const nom = 'forêt/€/𝄞.txt';
  assert.equal(Zip.decoderUtf8(new TextEncoder().encode(nom)), nom);
  assert.equal(Zip.decoderUtf8(new Uint8Array([0x66, 0xff, 0x67])), 'f�g');
});

// ---------------------------------------------------------------- Question 6 : .qml du zip

test('Q6 : le .qml voisin du Shapefile est trouvé dans la liste de essai.zip', () => {
  const r = Zip.listerZip(new Uint8Array(octetsEssai));
  const e = Zip.trouverQmlVoisin(r.entrees, 'sous-dossier/shape_essai.shp');
  assert.equal(e.nom, 'sous-dossier/shape_essai.qml');
  assert.equal(Zip.trouverQmlVoisin(r.entrees, 'absent.shp'), null);
});

test('Q6 (décision de Pascal : pas de deflate) : une entrée compressée donne « en attente »', () => {
  const octets = new Uint8Array(octetsEssai);
  const r = Zip.listerZip(octets);
  const e = r.entrees.find((x) => x.nom === 'sous-dossier/shape_essai.qml');
  assert.throws(() => Zip.lireEntreeStockee(octets, e), (err) => /en attente/.test(err.message));
});

test('Q6 : une entrée rangée sans compression est lue : 635 octets, <!DOCTYPE qgis>, 255,0,0,255', () => {
  const zip = ecrireZip([{ nom: Buffer.from('sous-dossier/shape_essai.qml'), donnees: Buffer.from(QML, 'utf8'), stocke: true, utf8: true }]);
  const octets = new Uint8Array(zip);
  const r = Zip.listerZip(octets);
  const brut = Zip.lireEntreeStockee(octets, r.entrees[0]);
  assert.equal(brut.length, 635);
  const texte = Zip.decoderUtf8(brut);
  assert.ok(texte.startsWith('<!DOCTYPE qgis>'));
  assert.equal(Zip.chercherCouleur(texte), '255,0,0,255');
});

// ---------------------------------------------------------------- Questions 2 et 3 : chemins

test('Q2 : le préfixe et le chemin de la copie hors projet suivent Imported Datasets/cerf/<cerf_id>/', () => {
  const app = '/storage/emulated/0/Android/data/ch.opengis.qfield/files';
  const id = '4b0e7c1a-1f5e-4d1b-9a77-2f3a8c6e9d01';
  assert.equal(Zip.prefixeHorsProjet(app, id), `${app}/Imported Datasets/cerf/${id}/`);
  assert.equal(Zip.prefixeHorsProjet(app + '/', id), `${app}/Imported Datasets/cerf/${id}/`);
  assert.equal(Zip.cheminRecu(Zip.prefixeHorsProjet(app, id), 'essai.zip'), `${app}/Imported Datasets/cerf/${id}/essai.zip`);
  // Un chemin déjà absolu, rendu tel quel.
  assert.equal(Zip.cheminRecu('/a/b/', '/x/essai.zip'), '/x/essai.zip');
});

test('Q2 : sans cerf_id, ou avec un cerf_id qui sort du dossier, la copie hors projet est refusée', () => {
  assert.throws(() => Zip.prefixeHorsProjet('/app', ''), (e) => /cerf_id absent/.test(e.message));
  assert.throws(() => Zip.prefixeHorsProjet('/app', undefined), (e) => /cerf_id absent/.test(e.message));
  assert.throws(() => Zip.prefixeHorsProjet('/app', '../x'), (e) => /cerf_id/.test(e.message));
  assert.throws(() => Zip.prefixeHorsProjet('/app', 'a/b'), (e) => /cerf_id/.test(e.message));
  assert.throws(() => Zip.prefixeHorsProjet('', 'abc'), (e) => /dossier de l'application/.test(e.message));
});

test('Q1 (repli spec § 9 n° 1) : le préfixe de la copie dans le projet est <projet>/cerf-essai/', () => {
  assert.equal(Zip.prefixeDansProjet('/p/Imported Projects/cerf-essai'), '/p/Imported Projects/cerf-essai/cerf-essai/');
  assert.throws(() => Zip.prefixeDansProjet(''), (e) => /aucun projet/.test(e.message));
});

test('Q2 : « hors du dossier projet » vrai et faux, dont le piège du dossier voisin au nom préfixe', () => {
  const projet = '/d/Imported Projects/cerf-essai';
  assert.equal(Zip.estHorsDossier('/d/Imported Datasets/cerf/x/essai.zip', projet), true);
  assert.equal(Zip.estHorsDossier(`${projet}/cerf-essai/essai.zip`, projet), false);
  assert.equal(Zip.estHorsDossier(`${projet}/essai.zip`, projet + '/'), false);
  assert.equal(Zip.estHorsDossier('/d/Imported Projects/cerf-essai-2/essai.zip', projet), true, 'dossier voisin au nom préfixe');
  assert.equal(Zip.estHorsDossier(`${projet}/../autre/essai.zip`, projet), true, 'remontée par ..');
  assert.equal(Zip.estHorsDossier(`${projet}//./cerf-essai/essai.zip`, projet), false, 'chemin non normalisé');
  assert.equal(Zip.estHorsDossier('/x/essai.zip', ''), true, 'aucun projet ouvert');
});

test('Q2 : le prototype dit s’il lit la copie hors projet ou la copie dans le projet', () => {
  const projet = '/d/Imported Projects/cerf-essai';
  assert.equal(Zip.lieuDeLecture('/d/Imported Datasets/cerf/x/essai.zip', projet), 'copie hors du dossier projet');
  assert.equal(Zip.lieuDeLecture(`${projet}/cerf-essai/essai.zip`, projet), 'copie dans le dossier projet');
});

test('Q5 et Q7 : chemins /vsizip/ de la copie', () => {
  const copie = '/d/Imported Datasets/cerf/x/essai.zip';
  assert.equal(Zip.cheminVsizip(copie, 'sous-dossier/shape_essai.shp'), '/vsizip//d/Imported Datasets/cerf/x/essai.zip/sous-dossier/shape_essai.shp');
  assert.equal(Zip.cheminVsizip(copie, '/points_essai.geojson'), '/vsizip//d/Imported Datasets/cerf/x/essai.zip/points_essai.geojson');
  assert.deepEqual(Zip.ENTREES_VECTEUR, ['points_essai.geojson', 'sous-dossier/shape_essai.shp']);
  assert.equal(Zip.ENTREE_GEOTIFF, 'lourd.tif');
});

test('Q3 : le nom de fichier d’un chemin, pour retrouver la taille de la copie', () => {
  assert.equal(Zip.nomDeFichier('/a/b/essai.zip'), 'essai.zip');
  assert.equal(Zip.dossierDe('/a/b/essai.zip'), '/a/b');
});

// ---------------------------------------------------------------- Question 7 : essai à risque

test('Q7 (décision de Pascal) : le listage d’un gros zip est réservé à l’essai à risque, en dernier', () => {
  assert.equal(Zip.SEUIL_LECTURE_OCTETS, 10_000_000);
  assert.equal(Zip.lectureSure(2108), true);
  assert.equal(Zip.lectureSure(199996542), false);
  // Relecture 1/3 : une taille inconnue ne doit pas ouvrir la lecture en mémoire par C.
  assert.equal(Zip.lectureSure(-1), false, 'taille inconnue : lecture refusée, renvoi au bouton I');
  assert.equal(Zip.lectureSure(undefined), false);
  assert.equal(Zip.lectureSure(NaN), false);
  assert.equal(Zip.lectureSure(0), true);
  assert.equal(Zip.lectureSure(Zip.SEUIL_LECTURE_OCTETS), true);
  assert.equal(Zip.lectureSure(Zip.SEUIL_LECTURE_OCTETS + 1), false);
});

test('Q7 : le refus de C dit pourquoi (taille inconnue ou trop grosse) et renvoie au bouton I', () => {
  const inconnue = Zip.messageLectureRefusee(-1);
  assert.match(inconnue, /taille de la copie inconnue/);
  assert.match(inconnue, /I\. Essai à risque/);
  const grosse = Zip.messageLectureRefusee(199996542);
  assert.match(grosse, /199996542 octets/);
  assert.match(grosse, /10000000 octets/);
  assert.match(grosse, /I\. Essai à risque/);
  const cerf = readFileSync(join(PROTO, 'Cerf.qml'), 'utf8');
  assert.ok(cerf.includes('Zip.messageLectureRefusee(taille)'), 'Cerf.qml affiche le message du module');
});

// ---------------------------------------------------------------- Question 5 : point du terrain

// Lit le point (X, Y) du premier enregistrement d'un .shp de type Point (type 1).
function pointDuShp(buf) {
  assert.equal(buf.readInt32BE(0), 9994, 'code de fichier Shapefile');
  assert.equal(buf.readInt32LE(108), 1, 'type Point');
  return { x: buf.readDoubleLE(112), y: buf.readDoubleLE(120) };
}

test('Q5 : le point du Shapefile d’essai, lu dans essai.zip, tombe au bon endroit (EPSG:2154, X est puis Y nord)', () => {
  const octets = new Uint8Array(octetsEssai);
  const r = Zip.listerZip(octets);
  const e = r.entrees.find((x) => x.nom === 'sous-dossier/shape_essai.shp');
  // Le module ne décompresse pas (décision de Pascal) : le test décompresse avec node:zlib,
  // à partir du décalage donné par le module.
  const debut = Zip.debutDesDonnees(octets, e);
  const shp = inflateRawSync(Buffer.from(octets.subarray(debut, debut + e.tailleCompressee)));
  const p = pointDuShp(shp);
  // Ordre et système explicites : EPSG:2154, X = est, Y = nord, en mètres.
  assert.equal(Zip.ecrirePosition(p.x, p.y, 'EPSG:2154'), 'EPSG:2154, X (est) = 652301,56 m ; Y (nord) = 6861302,73 m');
  const v = Zip.verifierPointEssai(p.x, p.y, 'EPSG:2154');
  assert.equal(v.verifie, true);
  assert.equal(v.conforme, true);
  assert.ok(v.ecartMetres <= 1);
  assert.equal(Zip.POINT_ESSAI_L93.x, X_L93);
  assert.equal(Zip.POINT_ESSAI_L93.y, Y_L93);
});

test('Q5 : un point décalé de 2 m est refusé ; un point dans un autre système n’est pas jugé', () => {
  const v = Zip.verifierPointEssai(X_L93 + 2, Y_L93, 'EPSG:2154');
  assert.equal(v.conforme, false);
  assert.ok(Math.abs(v.ecartMetres - 2) < 1e-6);
  assert.match(v.texte, /à 1 m près : non/);
  // X et Y inversés : très loin, donc refusé.
  assert.equal(Zip.verifierPointEssai(Y_L93, X_L93, 'EPSG:2154').conforme, false);
  const g = Zip.verifierPointEssai(2.35, 48.85, 'OGC:CRS84');
  assert.equal(g.verifie, false);
  assert.match(g.texte, /non jugé/);
});

test('Q5 bis : le point du GeoJSON s’écrit en longitude puis latitude (OGC:CRS84 ou EPSG:4326)', () => {
  const octets = new Uint8Array(octetsEssai);
  const e = Zip.listerZip(octets).entrees.find((x) => x.nom === 'points_essai.geojson');
  const d = Zip.debutDesDonnees(octets, e);
  const gj = JSON.parse(inflateRawSync(Buffer.from(octets.subarray(d, d + e.tailleCompressee))).toString('utf8'));
  const [lon, lat] = gj.features[0].geometry.coordinates;
  assert.equal(Zip.ecrirePosition(lon, lat, 'OGC:CRS84'), 'OGC:CRS84, longitude = 2,35 ; latitude = 48,85');
  assert.equal(Zip.ecrirePosition(lon, lat, 'EPSG:4326'), 'EPSG:4326, longitude = 2,35 ; latitude = 48,85');
  // Système inconnu : on n'invente pas le sens des axes.
  assert.equal(Zip.ecrirePosition(1, 2, 'EPSG:3857'), 'EPSG:3857, x = 1 ; y = 2 (sens des axes non interprété)');
  assert.equal(Zip.ecrirePosition(1, 2, ''), 'système inconnu, x = 1 ; y = 2 (sens des axes non interprété)');
});

// ---------------------------------------------------------------- Forme du plugin

test('Plugin : main.qml existe, ajoute un bouton à la barre des plugins et n’importe aucun .mjs lui-même', () => {
  const main = readFileSync(join(PROTO, 'main.qml'), 'utf8');
  assert.match(main, /iface\.addItemToPluginsToolbar\(/);
  assert.match(main, /import org\.qfield/);
  // Un échec d'import d'un .mjs doit rester visible : main.qml charge les écrans qui
  // importent les modules par Qt.createComponent et affiche l'erreur.
  assert.doesNotMatch(main, /^import\s+"[^"]+\.mjs"/m);
  assert.match(main, /Qt\.createComponent\("Cerf\.qml"\)/);
  assert.match(main, /errorString\(\)/);
});

test('Plugin : Cerf.qml importe cerf-zip.mjs, EssaiModule.qml importe module-essai.mjs, et les deux existent', () => {
  const cerf = readFileSync(join(PROTO, 'Cerf.qml'), 'utf8');
  const essai = readFileSync(join(PROTO, 'EssaiModule.qml'), 'utf8');
  assert.match(cerf, /^import "cerf-zip\.mjs" as Zip$/m);
  assert.match(essai, /^import "module-essai\.mjs" as Essai$/m);
  assert.ok(existsSync(join(PROTO, 'cerf-zip.mjs')));
  assert.ok(existsSync(join(PROTO, 'module-essai.mjs')));
});

test('Plugin : les noms des boutons A à I figurent dans les écrans, I marqué comme essai à risque', () => {
  const main = readFileSync(join(PROTO, 'main.qml'), 'utf8');
  const cerf = readFileSync(join(PROTO, 'Cerf.qml'), 'utf8');
  for (const lettre of Object.keys(Zip.BOUTONS)) assert.ok(cerf.includes(`Zip.BOUTONS.${lettre}`), `bouton ${lettre} dans Cerf.qml`);
  // Si cerf-zip.mjs ne se charge pas, main.qml garde son propre bouton E, au même nom.
  assert.ok(main.includes(`"${Zip.BOUTONS.E}"`), 'bouton E de secours dans main.qml');
  assert.deepEqual(Object.keys(Zip.BOUTONS), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);
  assert.match(Zip.BOUTONS.I, /risque/);
  for (const [lettre, nom] of Object.entries(Zip.BOUTONS)) assert.ok(nom.startsWith(`${lettre}. `), nom);
});

test('Plugin : l’API QField appelée est celle lue dans le code de QField (plan § 4)', () => {
  const cerf = readFileSync(join(PROTO, 'Cerf.qml'), 'utf8');
  for (const appel of ['platformUtilities.getFile(', 'onResourceReceived', 'FileUtils.readFileContent(', 'FileUtils.deleteFiles(',
    'platformUtilities.rmFile(', 'FileUtils.fileExists(', 'LayerUtils.loadVectorLayer(', 'LayerUtils.loadRasterLayer(',
    'LayerUtils.createFeatureIterator(', 'ExpressionContextUtils.projectVariables(qgisProject)', 'platformUtilities.applicationDirectory()']) {
    assert.ok(cerf.includes(appel), `Cerf.qml doit appeler ${appel}`);
  }
  // Pas de ruse (décision de Pascal n° 2) : aucune écriture de projet à la racine de l'application.
  assert.doesNotMatch(cerf, /writeFileContent|renameFile|\.qgz/);
});

test('Plugin : metadata.txt porte name, version, author, icon ; la version est celle du module', () => {
  const meta = readFileSync(join(PROTO, 'metadata.txt'), 'utf8');
  for (const cle of ['name', 'description', 'author', 'version', 'icon']) assert.match(meta, new RegExp(`^${cle}=.+$`, 'm'), cle);
  assert.match(meta, new RegExp(`^version=${Zip.VERSION.replace(/\./g, '\\.')}$`, 'm'));
  assert.match(meta, /^icon=icon\.svg$/m);
  assert.ok(existsSync(join(PROTO, 'icon.svg')));
});

test('Projet d’essai : cerf-essai.qgs en EPSG:2154 porte une variable de projet cerf_id (UUID)', () => {
  const qgs = readFileSync(join(PROTO, 'essai-projet', 'cerf-essai.qgs'), 'utf8');
  assert.match(qgs, /<authid>EPSG:2154<\/authid>/);
  const noms = qgs.match(/<variableNames[^>]*>([\s\S]*?)<\/variableNames>/)[1];
  const valeurs = qgs.match(/<variableValues[^>]*>([\s\S]*?)<\/variableValues>/)[1];
  const n = [...noms.matchAll(/<value>([^<]*)<\/value>/g)].map((m) => m[1]);
  const v = [...valeurs.matchAll(/<value>([^<]*)<\/value>/g)].map((m) => m[1]);
  const i = n.indexOf('cerf_id');
  assert.ok(i >= 0, 'variable cerf_id présente');
  assert.match(v[i], /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('Empaquetage : cerf-prototype.zip a main.qml à sa racine et tous les fichiers du plugin ; cerf-essai.zip porte le .qgs', () => {
  const sortie = mkdtempSync(join(tmpdir(), 'cerf-proto-'));
  try {
    execFileSync(process.execPath, [join(PROTO, 'empaqueter.mjs'), sortie], { stdio: 'pipe' });
    const plugin = Zip.listerZip(new Uint8Array(readFileSync(join(sortie, 'cerf-prototype.zip'))));
    const noms = plugin.entrees.map((e) => e.nom).sort();
    assert.deepEqual(noms, ['Cerf.qml', 'EssaiModule.qml', 'cerf-zip.mjs', 'icon.svg', 'main.qml', 'metadata.txt', 'module-essai.mjs']);
    const projet = Zip.listerZip(new Uint8Array(readFileSync(join(sortie, 'cerf-essai.zip'))));
    assert.deepEqual(projet.entrees.map((e) => e.nom), ['cerf-essai.qgs']);
  } finally {
    rmSync(sortie, { recursive: true, force: true });
  }
});

test('Empaquetage : le zip du plugin n’est pas versé au dépôt (.gitignore)', () => {
  const ignore = readFileSync(join(RACINE, '.gitignore'), 'utf8');
  assert.match(ignore, /^prototype\/dist\/$/m);
});

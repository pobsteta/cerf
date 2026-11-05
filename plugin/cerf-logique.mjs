// SPDX-License-Identifier: GPL-3.0-or-later
// Cerf, plugin QField d'application : la logique du squelette (mission 008).
// Écrit pour Cerf (ADR 0006) ; le lecteur de zip, la table CP437 et le décodeur UTF-8 sont
// repris du prototype n° 1 (prototype/cerf-zip.mjs, code de Cerf, prouvé sur le Samsung).
// Module ECMAScript pur, sans .pragma, sans .import, sans aucun import : chargé à la fois
// par QML (Cerf.qml) et par Node (tests/squelette.test.mjs, tests/plugin.test.mjs), ADR 0005.
// Prudence de syntaxe pour le moteur JavaScript de QML : ni chaînage optionnel, ni
// coalescence des nuls, ni séparateur de chiffres, ni TextDecoder.
//
// Contrat validé par Pascal le 3 novembre 2026 (tête de tests/squelette.test.mjs) ;
// décisions de Pascal sur le plan : pilotage/missions/008-squelette-plugin.md.
// Aucune fonction ne touche QField : tout passe par les objets reçus (réglages, chargerCouche,
// existe, platformUtilities), que Cerf.qml branche sur l'API de QField (plugin/PLAN.md § 5).

export const VERSION = '0.4.2';

// Mission 038 : comptage des entités par itérateur. Dans QGIS 3a92eb3, `featureCount()` (qgsvectorlayer.h l. 1701,
// `long long featureCount() const final;`) n'est ni Q_PROPERTY ni Q_INVOKABLE : QML ne peut pas l'appeler. QField v4.3.7
// expose `LayerUtils.createFeatureIterator(couche)` (qflayerutils.h l. 234), dont l'itérateur a hasNext(), next() et
// close() invocables (l. 52-75). `creerIterateur` est ce service, passé en paramètre (testable sans QField).
// Le contrôle 4 n'a besoin que de « vide » (0) ou « non vide » (au moins 1) : on s'arrête à la PREMIÈRE entité
// (plafond = 1), sans parcourir une grosse couche. nbEntites ne sert qu'à ce contrôle 4 : valeur 0 ou 1, jamais un total.
// Un itérateur impossible à créer ou qui lève rend { lisible: false } (contrôle 2, « illisible »), jamais « vide ».
// L'itérateur est toujours fermé.
export const PLAFOND_COMPTAGE = 1;
export function compterEntites(couche, creerIterateur) {
  let it = null;
  let nbEntites = 0;
  let lisible = true;
  try {
    it = creerIterateur(couche);
    if (!it) throw new Error('itérateur absent');
    while (nbEntites < PLAFOND_COMPTAGE && it.hasNext()) {
      it.next();
      nbEntites++;
    }
  } catch (e) {
    lisible = false;
    nbEntites = -1;
  }
  if (it) {
    try { it.close(); } catch (e) { /* fermeture sans effet sur le résultat */ }
  }
  return { lisible: lisible, nbEntites: nbEntites };
}

// Emprise d'une couche { xmin, ymin, xmax, ymax } (mission 037). Dans QGIS 3a92eb3, `extent` est une MÉTHODE
// (`Q_INVOKABLE virtual QgsRectangle extent() const`, qgsmaplayer.h l. 564), pas une propriété : `couche.extent` vaut
// alors une fonction, dont xMinimum est undefined. On l'appelle donc si c'est une fonction ; sinon on la lit telle quelle.
export function lireEmprise(couche) {
  let x = couche.extent;
  if (typeof x === 'function') x = couche.extent();
  return { xmin: Number(x.xMinimum), ymin: Number(x.yMinimum), xmax: Number(x.xMaximum), ymax: Number(x.yMaximum) };
}

// Mission 034 : jugement de validité du système de coordonnées d'une couche, d'après ce que QML voit.
// QGIS (commit 3a92eb3, embarqué par QField 4.3.7, src/core/proj/qgscoordinatereferencesystem.h, l. 218-223) n'expose
// à QML que mapUnits, isGeographic, authid et description (Q_PROPERTY) ; isValid() (l. 588) n'est ni Q_PROPERTY ni
// Q_INVOKABLE : crs.isValid vaut undefined côté QML. Règle : valide si authid non vide, à défaut si description non vide.
// `crs` est rendu tel quel (reprojection) ; epsg est tiré de authid (0 si pas de forme « EPSG:n »).
export function decrireSysteme(crs) {
  let authid = '';
  let description = '';
  try {
    authid = String(crs.authid || '').trim();
    description = String(crs.description || '').trim();
  } catch (e) {
    return { valide: false, epsg: 0, authid: '', crs: crs };
  }
  const m = /^EPSG:(\d+)$/.exec(authid);
  return { valide: authid !== '' || description !== '', epsg: m ? Number(m[1]) : 0, authid: authid, crs: crs };
}

// Dossier des copies, sous le dossier du projet : repli de la spec § 9 n° 1 appliqué par Pascal le
// 3 novembre 2026 (spec § 3.3, ADR 0003 et 0007) : QField 4.3.7 refuse à un plugin de lire hors
// du dossier projet (src/core/utils/qffileutils.cpp L620-628), vu à l'essai du squelette.
export const NOM_DOSSIER_COPIES = 'cerf-imports';

// Décision de Pascal n° 6 (3 novembre 2026) : plafond de listage d'un zip, 10 Mo, soit la
// valeur du prototype (prototype/cerf-zip.mjs, SEUIL_LECTURE_OCTETS = 10 000 000 octets).
export const PLAFOND_LISTAGE_OCTETS = 10000000;

// Style inscrit au registre quand aucune règle ne s'applique ; sinon le nom de la règle (UG,
// Parcelles, FRT, ProdBois) ou 'qml' (mission 010, plugin/cerf-styles.mjs).
export const STYLE_DEFAUT = 'defaut';
export const STYLE_QML = 'qml';
// Mission 047 : style enregistré dans le GeoPackage du zip (table layer_styles).
export const STYLE_GPKG = 'gpkg';

// --------------------------------------------------------------------------- octets

// Rend un Uint8Array à partir de ce que rend QML (QByteArray → ArrayBuffer en Qt 6) ou Node
// (Buffer, Uint8Array). Un QByteArray vide arrive en ArrayBuffer vide, et le moteur de Qt 6
// lève « Type error » sur new Uint8Array() d'un tel tampon (prototype, PLAN.md § 10 bis n° 6).
export function octetsDe(valeur) {
  if (valeur instanceof Uint8Array) return valeur;
  if (valeur instanceof ArrayBuffer) return valeur.byteLength === 0 ? new Uint8Array(0) : new Uint8Array(valeur);
  if (valeur && ArrayBuffer.isView(valeur)) return new Uint8Array(valeur.buffer, valeur.byteOffset, valeur.byteLength);
  const type = valeur === null ? 'null' : typeof valeur;
  throw new Error(`octets illisibles : type reçu « ${type} », attendu ArrayBuffer ou Uint8Array`);
}

function lire16(o, i) {
  return o[i] | (o[i + 1] << 8);
}

function lire32(o, i) {
  return (o[i] | (o[i + 1] << 8) | (o[i + 2] << 16)) + o[i + 3] * 0x1000000;
}

// --------------------------------------------------------------------------- noms

// Table CP437, octets 0x80 à 0xFF, en points de code Unicode. Source : codec cp437 de
// Python 3.13.18 (« generated from VENDORS/MICSFT/PC/CP437.TXT », fichier publié par l'Unicode
// Consortium), contrôlée identique à iconv de la glibc 2.39 (prototype, 2 novembre 2026).
const CP437_HAUT = [
  0x00c7, 0x00fc, 0x00e9, 0x00e2, 0x00e4, 0x00e0, 0x00e5, 0x00e7,
  0x00ea, 0x00eb, 0x00e8, 0x00ef, 0x00ee, 0x00ec, 0x00c4, 0x00c5,
  0x00c9, 0x00e6, 0x00c6, 0x00f4, 0x00f6, 0x00f2, 0x00fb, 0x00f9,
  0x00ff, 0x00d6, 0x00dc, 0x00a2, 0x00a3, 0x00a5, 0x20a7, 0x0192,
  0x00e1, 0x00ed, 0x00f3, 0x00fa, 0x00f1, 0x00d1, 0x00aa, 0x00ba,
  0x00bf, 0x2310, 0x00ac, 0x00bd, 0x00bc, 0x00a1, 0x00ab, 0x00bb,
  0x2591, 0x2592, 0x2593, 0x2502, 0x2524, 0x2561, 0x2562, 0x2556,
  0x2555, 0x2563, 0x2551, 0x2557, 0x255d, 0x255c, 0x255b, 0x2510,
  0x2514, 0x2534, 0x252c, 0x251c, 0x2500, 0x253c, 0x255e, 0x255f,
  0x255a, 0x2554, 0x2569, 0x2566, 0x2560, 0x2550, 0x256c, 0x2567,
  0x2568, 0x2564, 0x2565, 0x2559, 0x2558, 0x2552, 0x2553, 0x256b,
  0x256a, 0x2518, 0x250c, 0x2588, 0x2584, 0x258c, 0x2590, 0x2580,
  0x03b1, 0x00df, 0x0393, 0x03c0, 0x03a3, 0x03c3, 0x00b5, 0x03c4,
  0x03a6, 0x0398, 0x03a9, 0x03b4, 0x221e, 0x03c6, 0x03b5, 0x2229,
  0x2261, 0x00b1, 0x2265, 0x2264, 0x2320, 0x2321, 0x00f7, 0x2248,
  0x00b0, 0x2219, 0x00b7, 0x221a, 0x207f, 0x00b2, 0x25a0, 0x00a0,
];

function decoderCp437(octets) {
  let s = '';
  for (let i = 0; i < octets.length; i++) {
    const b = octets[i];
    s += String.fromCharCode(b < 0x80 ? b : CP437_HAUT[b - 0x80]);
  }
  return s;
}

// Décodeur UTF-8 (QML n'offre pas TextDecoder). Octet invalide : U+FFFD.
function decoderUtf8(octets) {
  let s = '';
  let i = 0;
  const n = octets.length;
  const suite = (k) => k < n && (octets[k] & 0xc0) === 0x80;
  while (i < n) {
    const b = octets[i];
    let cp = -1;
    let long = 1;
    if (b < 0x80) {
      cp = b;
    } else if (b >= 0xc2 && b <= 0xdf && suite(i + 1)) {
      cp = ((b & 0x1f) << 6) | (octets[i + 1] & 0x3f); long = 2;
    } else if (b >= 0xe0 && b <= 0xef && suite(i + 1) && suite(i + 2)) {
      cp = ((b & 0x0f) << 12) | ((octets[i + 1] & 0x3f) << 6) | (octets[i + 2] & 0x3f); long = 3;
      if (cp < 0x800 || (cp >= 0xd800 && cp <= 0xdfff)) cp = -1;
    } else if (b >= 0xf0 && b <= 0xf4 && suite(i + 1) && suite(i + 2) && suite(i + 3)) {
      cp = ((b & 0x07) << 18) | ((octets[i + 1] & 0x3f) << 12) | ((octets[i + 2] & 0x3f) << 6) | (octets[i + 3] & 0x3f); long = 4;
      if (cp < 0x10000 || cp > 0x10ffff) cp = -1;
    }
    if (cp < 0) { s += '�'; i += 1; continue; }
    s += String.fromCodePoint(cp);
    i += long;
  }
  return s;
}

// Texte UTF-8 d'un contenu d'octets (un .json, un .qml lus dans le zip).
export function texteDe(valeur) {
  return decoderUtf8(octetsDe(valeur));
}

// Octets UTF-8 d'un texte (le moteur de QML n'a pas TextEncoder), pour écrire un .qml.
export function octetsUtf8(texte) {
  const sortie = [];
  const t = String(texte);
  for (let i = 0; i < t.length; i++) {
    let c = t.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < t.length) {
      const d = t.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++; }
    }
    if (c < 0x80) sortie.push(c);
    else if (c < 0x800) sortie.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c < 0x10000) sortie.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    else sortie.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  return new Uint8Array(sortie);
}

// Un ArrayBuffer de la taille exacte des octets (celui que reçoit FileUtils.writeFileContent).
export function arrayBufferExact(octets) {
  const o = octetsDe(octets);
  return o.buffer.slice(o.byteOffset, o.byteOffset + o.byteLength);
}

// --------------------------------------------------------------------------- zip

// Noms des entrées d'un zip, dans l'ordre du répertoire central (APPNOTE de PKWARE : fin de
// répertoire 0x06054b50, répertoire central 0x02014b50, bit 11 = nom en UTF-8, sinon CP437).
// Pas de ZIP64. Erreur au message clair si ce n'est pas un zip ou s'il est tronqué.
export function nomsDuZip(valeur) {
  const o = octetsDe(valeur);
  if (o.length === 0) throw new Error('zip vide : 0 octet lu');
  if (o.length < 22) throw new Error(`ce fichier n'est pas un zip (${o.length} octets, trop court)`);
  let fin = -1;
  const plusBas = Math.max(0, o.length - 22 - 65535);
  for (let i = o.length - 22; i >= plusBas; i--) {
    if (o[i] === 0x50 && o[i + 1] === 0x4b && o[i + 2] === 0x05 && o[i + 3] === 0x06) { fin = i; break; }
  }
  if (fin < 0) {
    const debutZip = o[0] === 0x50 && o[1] === 0x4b;
    throw new Error(debutZip
      ? 'zip tronqué : fin de répertoire introuvable (fichier incomplet ?)'
      : "ce fichier n'est pas un zip (signature PK absente)");
  }
  const nombre = lire16(o, fin + 10);
  const tailleCentral = lire32(o, fin + 12);
  const decalageCentral = lire32(o, fin + 16);
  if (nombre === 0xffff || tailleCentral === 0xffffffff || decalageCentral === 0xffffffff) {
    throw new Error('zip de plus de 4 Go ou de 65535 entrées (ZIP64) : non lu par Cerf');
  }
  if (decalageCentral + tailleCentral > fin) {
    throw new Error('zip tronqué ou abîmé : le répertoire central dépasse la fin du fichier');
  }
  const noms = [];
  let p = decalageCentral;
  for (let k = 0; k < nombre; k++) {
    if (p + 46 > fin || lire32(o, p) !== 0x02014b50) {
      throw new Error(`zip tronqué ou abîmé : entrée ${k + 1} sur ${nombre} illisible dans le répertoire central`);
    }
    const drapeaux = lire16(o, p + 8);
    const lNom = lire16(o, p + 28);
    const lExtra = lire16(o, p + 30);
    const lComm = lire16(o, p + 32);
    if (p + 46 + lNom > fin) throw new Error(`zip tronqué ou abîmé : nom de l'entrée ${k + 1} coupé`);
    const brut = o.subarray(p + 46, p + 46 + lNom);
    noms.push((drapeaux & 0x0800) !== 0 ? decoderUtf8(brut) : decoderCp437(brut));
    p += 46 + lNom + lExtra + lComm;
  }
  return noms;
}

// Décision n° 6 : un zip ne se lit en mémoire pour être listé que si sa taille est connue et
// d'au plus PLAFOND_LISTAGE_OCTETS.
export function listageSur(taille) {
  return typeof taille === 'number' && taille >= 0 && taille <= PLAFOND_LISTAGE_OCTETS;
}

export function messageListageRefuse(nomZip, taille) {
  if (!(typeof taille === 'number' && taille >= 0)) {
    return `${nomZip} : taille de la copie inconnue, zip non lu (plafond de 10 Mo pour lister un zip)`;
  }
  const mo = Math.round(taille / 100000) / 10;
  return `${nomZip} : ${mo} Mo, au-delà du plafond de 10 Mo pour lister un zip ; zip non lu`;
}

// Décision n° 3 : lecture refusée par QField : le dire, avec la version de QField et, s'il est
// connu, l'avis de QField sur la copie (FileUtils.isWithinProjectDirectory) ; aucun repli de plus.
export function messageLectureRefusee(nomZip, versionQField, dansLeProjet) {
  const version = versionQField ? String(versionQField) : 'inconnue';
  let lieu = '';
  if (dansLeProjet === true) lieu = ' Copie dans le dossier du projet selon QField.';
  if (dansLeProjet === false) lieu = ' Copie hors du dossier du projet selon QField.';
  return `${nomZip} : lecture refusée par QField (0 octet rendu ; version de QField ${version}).${lieu} Aucune couche chargée.`;
}

// --------------------------------------------------------------------------- noms et chemins

export function nomDeFichier(chemin) {
  const s = String(chemin);
  return s.substring(s.lastIndexOf('/') + 1);
}

export function dossierDe(chemin) {
  const s = String(chemin);
  const i = s.lastIndexOf('/');
  return i <= 0 ? (i === 0 ? '/' : '') : s.substring(0, i);
}

const MOTIF_UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// cerf_id : UUID, gardé tel quel (il forme la clé du registre et un nom de dossier).
export function estUuid(t) {
  return typeof t === 'string' && MOTIF_UUID.test(t);
}

// Nom simple (spec § 3.3, règle du 3 novembre 2026) : ni « / », ni « \ », ni « . » ou « .. »
// comme nom entier, ni caractère de contrôle.
function estNomSimple(nom) {
  if (typeof nom !== 'string' || nom === '' || nom === '.' || nom === '..') return false;
  if (nom.indexOf('/') >= 0 || nom.indexOf('\\') >= 0) return false;
  for (let i = 0; i < nom.length; i++) if (nom.charCodeAt(i) < 0x20) return false;
  return true;
}

export function estNomDeZip(nom) {
  return estNomSimple(nom) && nom.length > 4 && /\.zip$/i.test(nom);
}

// Segments d'un chemin relatif : aucun vide, aucun « . » ni « .. ».
function segmentsSains(relatif) {
  if (typeof relatif !== 'string' || relatif === '') return false;
  const segs = relatif.split('/');
  for (let i = 0; i < segs.length; i++) {
    if (segs[i] === '' || segs[i] === '.' || segs[i] === '..') return false;
  }
  return true;
}

function sansBarreFinale(d) {
  let s = String(d);
  while (s.length > 1 && s.charAt(s.length - 1) === '/') s = s.substring(0, s.length - 1);
  return s;
}

// --------------------------------------------------------------------------- projet Cerf

export function lireCerfId(variables) {
  if (!variables || typeof variables !== 'object') return null;
  const v = variables.cerf_id;
  if (v === undefined || v === null) return null;
  const t = String(v);
  return estUuid(t) ? t : null;
}

export function estProjetCerf(variables) {
  return lireCerfId(variables) !== null;
}

export function cleRegistre(cerfId) {
  return 'cerf/' + cerfId;
}

// Dossier du projet sain : absolu, autre que la racine, sans segment vide, « . » ou « .. », sans
// « \ ». Les barres finales sont tolérées (retirées).
function dossierProjetSain(dossierProjet) {
  if (typeof dossierProjet !== 'string' || dossierProjet.charAt(0) !== '/') return false;
  if (dossierProjet.indexOf('\\') >= 0) return false;
  const d = sansBarreFinale(dossierProjet);
  return d !== '/' && segmentsSains(d.substring(1));
}

// '<dossier du projet>/cerf-imports' ; '' si le dossier du projet n'est pas sain.
export function dossierCopies(dossierProjet) {
  if (!dossierProjetSain(dossierProjet)) return '';
  return sansBarreFinale(dossierProjet) + '/' + NOM_DOSSIER_COPIES;
}

// '<dossier du projet>/cerf-imports/<nomZip>' ; '' si le dossier du projet n'est pas sain.
export function cheminCopie(dossierProjet, nomZip) {
  const d = dossierCopies(dossierProjet);
  return d === '' ? '' : d + '/' + nomZip;
}

// Nom du zip d'une source « /vsizip/<dossierCopies>/<zip>/<entrée> », sinon ''.
export function zipDeLaSource(source, dossier) {
  const debut = '/vsizip/' + dossier + '/';
  if (typeof source !== 'string' || source.indexOf(debut) !== 0) return '';
  const reste = source.substring(debut.length);
  const i = reste.indexOf('/');
  if (i <= 0 || i === reste.length - 1) return '';
  return reste.substring(0, i);
}

// --------------------------------------------------------------------------- couches du zip

// Mission 024 (spec § 3.1, § 4 ; ADR 0008) : GeoJSON, Shapefile complet, une couche par table de
// GeoPackage et GeoTIFF, extensions sans tenir compte de la casse. Vocabulaire des formats : celui
// de decrireEntree et de cerf-controles.mjs (geojson, shp, gpkg, tif).
// Chaque couche : { couche, entree, nom, format } ;
//   - couche : nom du fichier sans dossier ni extension ; pour une table de GeoPackage, le nom de la table ;
//   - nom : nom d'affichage des messages du § 4 = chemin complet dans le zip, avec l'extension ;
//     pour une table : « <chemin>.gpkg/<table> » (Pascal, 4 novembre 2026) ;
//   - Shapefile : + fichiers (fichiersDuShapefile, seule source, partagée avec decrireEntree) ;
//   - GeoPackage : + table. `tables` = { '<entrée .gpkg>': ['table', ...] } (tables vecteur lues par le
//     plugin, tablesDuGpkg). Tables inconnues (pas de clé) : une entrée table: null, refusée « tables
//     illisibles » ; liste vide : table: null, vide: true, refusée « aucune table vecteur ». Jamais perdu en silence.
// Un .json est retenu, marqué `json: true` : importerZip lit son contenu pour savoir si c'est du GeoJSON.
// Annexes (.shx, .dbf, .prj, .cpg seuls, .qix, .sbn, .sbx, .shp.xml, .tfw, .aux.xml, -wal, -shm), .qml, .qmd :
// aucune couche propre. Décision n° 7 : __MACOSX/ et les fichiers « ._* » ignorés en silence.
const FORMATS_PAR_EXTENSION = { geojson: 'geojson', json: 'geojson', shp: 'shp', gpkg: 'gpkg', tif: 'tif', tiff: 'tif' };
const EXTENSIONS_SHAPEFILE = ['shp', 'shx', 'dbf', 'prj', 'cpg'];

function extensionDe(fichier) {
  const m = /\.([^.]*)$/.exec(fichier);
  return m ? m[1].toLowerCase() : '';
}

function entreeIgnoree(entree) {
  if (entree === '' || entree.charAt(entree.length - 1) === '/') return true;
  if (('/' + entree).indexOf('/__MACOSX/') >= 0) return true;
  return nomDeFichier(entree).indexOf('._') === 0;
}

// Fichiers du Shapefile `entree` (son .shp) : entrées du zip du même dossier, même racine (casse libre),
// d'extension .shp .shx .dbf .prj .cpg, dans cet ordre, celles qui existent (la première de chaque
// extension). Chemins complets dans le zip. Seule source de ces fichiers (couchesDuZip, decrireEntree) :
// le contrôle 1 (spec § 4) lit cette liste.
export function fichiersDuShapefile(entree, noms) {
  const e = String(entree);
  const dossier = dossierDe(e);
  const fichier = nomDeFichier(e);
  const racine = fichier.replace(/\.[^.]*$/, '').toLowerCase();
  const trouves = {};
  for (let i = 0; i < noms.length; i++) {
    const n = String(noms[i]);
    if (entreeIgnoree(n) || dossierDe(n) !== dossier) continue;
    const f = nomDeFichier(n);
    const ext = extensionDe(f);
    if (EXTENSIONS_SHAPEFILE.indexOf(ext) < 0) continue;
    if (f.substring(0, f.length - ext.length - 1).toLowerCase() !== racine) continue;
    if (!Object.prototype.hasOwnProperty.call(trouves, ext)) trouves[ext] = n;
  }
  // Le .shp est l'entrée elle-même (si deux .shp ne diffèrent que par la casse, chacun garde le sien).
  if (extensionDe(fichier) === 'shp') trouves.shp = e;
  const fichiers = [];
  for (let k = 0; k < EXTENSIONS_SHAPEFILE.length; k++) {
    if (Object.prototype.hasOwnProperty.call(trouves, EXTENSIONS_SHAPEFILE[k])) fichiers.push(trouves[EXTENSIONS_SHAPEFILE[k]]);
  }
  return fichiers;
}

export function couchesDuZip(noms, tables) {
  const couches = [];
  const connues = tables && typeof tables === 'object' ? tables : {};
  for (let i = 0; i < noms.length; i++) {
    const entree = String(noms[i]);
    if (entreeIgnoree(entree)) continue;
    const fichier = nomDeFichier(entree);
    const ext = extensionDe(fichier);
    if (!Object.prototype.hasOwnProperty.call(FORMATS_PAR_EXTENSION, ext)) continue;
    const format = FORMATS_PAR_EXTENSION[ext];
    const couche = fichier.substring(0, fichier.length - ext.length - 1);
    if (couche === '') continue;
    if (format === 'geojson') {
      if (ext === 'json') couches.push({ couche, entree, nom: entree, format, json: true });
      else couches.push({ couche, entree, nom: entree, format });
    } else if (format === 'shp') {
      couches.push({ couche, entree, nom: entree, format, fichiers: fichiersDuShapefile(entree, noms) });
    } else if (format === 'tif') {
      couches.push({ couche, entree, nom: entree, format });
    } else {
      const liste = Object.prototype.hasOwnProperty.call(connues, entree) ? connues[entree] : null;
      if (!Array.isArray(liste)) {
        couches.push({ couche, entree, nom: entree, format, table: null });
      } else if (liste.length === 0) {
        couches.push({ couche, entree, nom: entree, format, table: null, vide: true });
      } else {
        for (let k = 0; k < liste.length; k++) {
          const table = String(liste[k]);
          couches.push({ couche: table, entree, nom: entree + '/' + table, format, table });
        }
      }
    }
  }
  return couches;
}

// Source /vsizip/ d'une couche du zip (copie du zip dans cerf-imports/) : l'entrée elle-même (le .shp
// pour un Shapefile) ; pour une table de GeoPackage, « |layername=<table> ». Un GeoPackage aux tables
// inconnues ou sans table (table: null) n'a PAS de source : '' (QGIS ouvrirait sa première table en silence).
export function sourceDeLaCouche(copie, c) {
  const base = '/vsizip/' + copie + '/' + c.entree;
  if (c.format !== 'gpkg') return base;
  if (typeof c.table !== 'string' || !nomDeTableSur(c.table)) return '';
  return base + '|layername=' + c.table;
}

// Source d'un raster (GeoTIFF) : Cerf.qml l'ouvre par LayerUtils.loadRasterLayer, et non loadVectorLayer.
export function estSourceRaster(source) {
  return typeof source === 'string' && /\.tiff?$/i.test(source);
}

// --------------------------------------------------------------------------- tables d'un GeoPackage (mission 024)

// Voie 1 du prototype n° 4 (mission 030, prototype-2/essai-logique.mjs, verdictTables ; bouton 13 de
// prototype-2/Essai.qml) : une couche OGR dont le filtre est une requête. QGIS 3a92eb3 passe un filtre qui
// commence par « SELECT » à GDALDatasetExecuteSQL (src/core/providers/ogr/qgsogrproviderutils.cpp
// l. 1390-1395) : chaque ligne de gpkg_contents devient une entité, lue par l'itérateur.
// NON PROUVÉE sur le Samsung (prototype n° 4 pas encore essayé) : en cas d'échec, « tables illisibles ».
export const SQL_TABLES_GPKG = 'SELECT table_name, data_type FROM gpkg_contents ORDER BY table_name';
export const TYPE_TABLE_VECTEUR = 'features';

// Nom de table sûr dans « |layername= » : ni « | » (séparateur des options de la source), ni retour à la
// ligne, ni caractère nul (garde du prototype n° 4, nomDeTableSur).
export function nomDeTableSur(nom) {
  return typeof nom === 'string' && nom !== '' && nom.length <= 200 && !/[|\r\n\u0000]/.test(nom);
}

function valeurTexte(v) {
  if (v === undefined || v === null) return '';
  return String(v);
}

function ouvrirSansPlanter(services, uri, nom) {
  try {
    const c = services.ouvrir(uri, nom);
    return c && c.isValid === true ? c : (c ? { invalide: c } : null);
  } catch (e) {
    return null;
  }
}

function liberer(services, c) {
  if (!c) return;
  try { if (typeof services.liberer === 'function') services.liberer(c.invalide ? c.invalide : c); } catch (e) { /* sans effet */ }
}

// Tables vecteur d'un GeoPackage `source` (« /vsizip/<copie>/<entrée .gpkg> »), sans réseau.
// services = { ouvrir(uri, nom) -> couche, creerIterateur(couche) -> itérateur, liberer(couche) }.
// Rend { etat, tables } :
//   - 'liste' : tables vecteur (data_type « features »), dans l'ordre de la requête ;
//   - 'aucune' : la liste est lue sans erreur, au moins une ligne, aucune de type « features », ET aucune
//     sonde « |layerid=0 » ne s'ouvre (exigence de la relecture de la 030) ;
//   - 'illisible' : tout le reste : requête qui ne s'ouvre pas, lecture qui lève, liste vide (GDAL y a ouvert
//     une couche : incohérent), table_name ou data_type manquant, nom de table non sûr, ou aucune table
//     vecteur alors que la sonde layerid ouvre une couche. Jamais « aucune » sur une erreur. Ne lève jamais.
export function tablesDuGpkg(source, services) {
  const illisible = { etat: 'illisible', tables: [] };
  if (!services || typeof services.ouvrir !== 'function' || typeof services.creerIterateur !== 'function') return illisible;
  const requete = ouvrirSansPlanter(services, source + '|subset=' + SQL_TABLES_GPKG, 'cerf_tables');
  if (!requete || requete.invalide) { liberer(services, requete); return illisible; }
  const lignes = [];
  let it = null;
  let lu = true;
  try {
    it = services.creerIterateur(requete);
    if (!it) throw new Error('itérateur absent');
    while (it.hasNext()) {
      const f = it.next();
      const table = valeurTexte(f.attribute('table_name'));
      const type = valeurTexte(f.attribute('data_type'));
      if (table === '' || type === '') throw new Error('table_name ou data_type manquant');
      lignes.push({ table: table, type: type });
    }
  } catch (e) {
    lu = false;
  }
  if (it) { try { it.close(); } catch (e) { /* fermeture sans effet sur le résultat */ } }
  liberer(services, requete);
  if (!lu || lignes.length === 0) return illisible;
  const tables = [];
  for (let i = 0; i < lignes.length; i++) {
    if (lignes[i].type !== TYPE_TABLE_VECTEUR) continue;
    if (!nomDeTableSur(lignes[i].table)) return illisible;
    tables.push(lignes[i].table);
  }
  if (tables.length > 0) return { etat: 'liste', tables: tables };
  // Aucune table vecteur lue : on ne le croit que si GDAL n'ouvre aucune couche par layerid.
  const sonde = ouvrirSansPlanter(services, source + '|layerid=0', 'cerf_sonde');
  const ouverte = !!sonde && !sonde.invalide;
  liberer(services, sonde);
  return ouverte ? illisible : { etat: 'aucune', tables: [] };
}

// --------------------------------------------------------------------------- style d'une table de GeoPackage (mission 047)

// Style enregistré par QGIS dans la table `layer_styles` du GeoPackage (« Enregistrer le style dans la base de
// données »). Même voie que gpkg_contents : une couche OGR dont le filtre est une requête SELECT, exécutée par
// GDALDatasetExecuteSQL sur le jeu de données (QGIS 3a92eb3, qgsogrprovider.cpp l. 2600-2630 et
// qgsogrproviderutils.cpp l. 1390-1395), sans réseau ; la couche 0 du fichier doit exister (analyzeURI,
// qgsogrproviderutils.cpp l. 82 : layerIndex = 0 par défaut). Ordre des lignes : celui de QGIS
// (qgsogrutils.cpp l. 3044-3048, loadStoredStyle) : style par défaut d'abord, puis le plus récent ; seule la
// première ligne est lue. NON PROUVÉE sur le Samsung (comme gpkg_contents).
export function requeteStyleGpkg(table) {
  const nom = String(table).replace(/'/g, "''");
  return "SELECT styleQML FROM layer_styles WHERE f_table_name = '" + nom
    + "' ORDER BY CASE WHEN useAsDefault THEN 1 ELSE 2 END, update_time DESC LIMIT 1";
}

// Style enregistré pour la table `table` du GeoPackage `source` (« /vsizip/<copie>/<entrée .gpkg> »).
// services = { ouvrir(uri, nom) -> couche, creerIterateur(couche) -> itérateur, liberer(couche) } (comme tablesDuGpkg).
// Rend { etat, texte } :
//   - 'lu' : une ligne existe ; `texte` = son styleQML ('' si vide ou NULL) ; le contrôle du .qml vient après ;
//   - 'illisible' : la requête s'est ouverte, une ligne existe, mais elle ne se lit pas ;
//   - 'absent' : tout le reste : pas de table layer_styles (la requête ne s'ouvre pas : on ne peut pas le
//     distinguer d'un échec d'ouverture), aucune ligne pour la table, nom de table non sûr (jamais interpolé),
//     services absents. Ne lève jamais.
// Le nom de table sans « \ » : cleanSubsetString (qgsogrproviderutils.cpp l. 1340-1365) suit les chaînes entre
// apostrophes et traite « \ » comme un échappement, ce que le doublement d'apostrophe de SQL ne suit pas.
export function styleDuGpkg(source, table, services) {
  const absent = { etat: 'absent' };
  if (!services || typeof services.ouvrir !== 'function' || typeof services.creerIterateur !== 'function') return absent;
  if (!nomDeTableSur(table) || String(table).indexOf('\\') >= 0) return absent;
  const requete = ouvrirSansPlanter(services, source + '|subset=' + requeteStyleGpkg(table), 'cerf_style');
  if (!requete || requete.invalide) { liberer(services, requete); return absent; }
  let it = null;
  let etat = absent;
  try {
    it = services.creerIterateur(requete);
    if (!it) throw new Error('itérateur absent');
    if (it.hasNext()) {
      const f = it.next();
      etat = { etat: 'lu', texte: valeurTexte(f.attribute('styleQML')) };
    }
  } catch (e) {
    etat = { etat: 'illisible' };
  }
  if (it) { try { it.close(); } catch (e) { /* fermeture sans effet sur le résultat */ } }
  liberer(services, requete);
  return etat;
}

// --------------------------------------------------------------------------- registre

// { liste, illisible } : illisible quand la valeur n'est ni absente, ni une liste JSON.
function etatRegistre(reglages, cerfId) {
  const brut = reglages.value(cleRegistre(cerfId), '');
  if (brut === undefined || brut === null || brut === '') return { liste: [], illisible: false };
  let v;
  try {
    v = JSON.parse(String(brut));
  } catch (e) {
    return { liste: [], illisible: true };
  }
  return Array.isArray(v) ? { liste: v, illisible: false } : { liste: [], illisible: true };
}

function ecrireRegistre(reglages, cerfId, liste) {
  reglages.setValue(cleRegistre(cerfId), JSON.stringify(liste));
}

export function lireRegistre(reglages, cerfId) {
  return etatRegistre(reglages, cerfId).liste;
}

function memeCouche(e, zip, couche) {
  return !!e && typeof e === 'object' && e.zip === zip && e.couche === couche;
}

// Remplace l'entrée de même (zip, couche) à sa place, ou ajoute à la fin.
export function inscrire(reglages, cerfId, entree) {
  const liste = lireRegistre(reglages, cerfId).slice();
  let place = -1;
  for (let i = 0; i < liste.length; i++) {
    if (memeCouche(liste[i], entree.zip, entree.couche)) {
      if (place < 0) { place = i; liste[i] = entree; } else { liste.splice(i, 1); i--; }
    }
  }
  if (place < 0) liste.push(entree);
  ecrireRegistre(reglages, cerfId, liste);
}

export function retirer(reglages, cerfId, cible) {
  const liste = lireRegistre(reglages, cerfId);
  const reste = [];
  let retiree = false;
  for (let i = 0; i < liste.length; i++) {
    if (memeCouche(liste[i], cible.zip, cible.couche)) retiree = true; else reste.push(liste[i]);
  }
  if (!retiree) return { retiree: false, zipInutile: false };
  ecrireRegistre(reglages, cerfId, reste);
  let encore = 0;
  for (let i = 0; i < reste.length; i++) if (reste[i] && reste[i].zip === cible.zip) encore++;
  return { retiree: true, zipInutile: encore === 0 };
}

function nombreDeCouchesDuZip(reglages, cerfId, zip) {
  const liste = lireRegistre(reglages, cerfId);
  let n = 0;
  for (let i = 0; i < liste.length; i++) if (liste[i] && liste[i].zip === zip) n++;
  return n;
}

export function zipUtilise(reglages, cerfId, zip) {
  return nombreDeCouchesDuZip(reglages, cerfId, zip) > 0;
}

// Entrée saine : nom de zip simple, couche nommée, et soit `chemin` (copie GeoPackage, ADR 0008 :
// « <dossier du zip>/<fichier>.gpkg » sous cerf-imports/), soit `chemin_vsi` dans ce zip (GeoTIFF
// lus dans le zip, entrées des versions 0.2.x) ; sans « .. ».
function entreeSaine(e) {
  if (!e || typeof e !== 'object') return false;
  if (!estNomDeZip(e.zip)) return false;
  if (typeof e.couche !== 'string' || e.couche === '') return false;
  if (typeof e.chemin === 'string') {
    if (e.chemin.indexOf('|') >= 0 || e.chemin.indexOf('\\') >= 0 || !segmentsSains(e.chemin)) return false;
    const segs = e.chemin.split('/');
    return segs.length === 2 && segs[0] === dossierDuZip(e.zip) && /\.gpkg$/.test(segs[1]) && segs[1] !== '.gpkg';
  }
  if (typeof e.chemin_vsi !== 'string' || e.chemin_vsi.indexOf(e.zip + '/') !== 0) return false;
  return segmentsSains(e.chemin_vsi);
}

// --------------------------------------------------------------------------- messages

function pluriel(n, un, plusieurs) {
  return n === 1 ? un : plusieurs;
}

function nomsDe(liste) {
  const noms = [];
  for (let i = 0; i < liste.length; i++) noms.push(liste[i].couche);
  return noms.join(', ');
}

// --------------------------------------------------------------------------- importer

function chargerSansPlanter(chargerCouche, source, nom, zip) {
  try {
    const c = zip === undefined ? chargerCouche(source, nom) : chargerCouche(source, nom, zip);
    if (!c) return { couche: null, raison: 'illisible' };
    if (!c.isValid) return { couche: null, raison: 'illisible' };
    return { couche: c, raison: '' };
  } catch (e) {
    return { couche: null, raison: 'illisible (' + (e && e.message ? e.message : String(e)) + ')' };
  }
}

// Description d'une entrée du zip pour les contrôles (spec § 4) : nom court avec extension,
// format d'après l'extension, et les fichiers (noms sans dossier). Pour un Shapefile, les fichiers sont
// ceux de fichiersDuShapefile (mission 024 : une seule source avec couchesDuZip, que lit le contrôle 1) ;
// pour les autres formats, les noms du zip dans le même dossier (inchangé depuis la mission 010).
export function decrireEntree(entree, noms) {
  const fichier = nomDeFichier(entree);
  const ext = extensionDe(fichier);
  const format = Object.prototype.hasOwnProperty.call(FORMATS_PAR_EXTENSION, ext) ? FORMATS_PAR_EXTENSION[ext] : ext;
  const fichiers = [];
  if (format === 'shp') {
    const liste = fichiersDuShapefile(entree, noms);
    for (let i = 0; i < liste.length; i++) fichiers.push(nomDeFichier(liste[i]));
  } else {
    const dossier = dossierDe(entree);
    for (let i = 0; i < noms.length; i++) {
      const n = String(noms[i]);
      if (dossierDe(n) === dossier) fichiers.push(nomDeFichier(n));
    }
  }
  return { nom: fichier, format, fichiers };
}

// Nom d'une couche dans les messages du § 4 : le chemin complet dans le zip, avec l'extension, et
// « /<table> » pour une table de GeoPackage (Pascal, 4 novembre 2026 ; mission 024). Repli : l'entrée.
function nomAffiche(c) {
  return typeof c.nom === 'string' && c.nom !== '' ? c.nom : String(c.entree);
}

// Mission 044 : fin de la ligne d'un .json écarté (« <chemin> : pas une couche GeoJSON, ignoré »).
const PHRASE_JSON_ECARTE = 'pas une couche GeoJSON, ignoré';

// Décrit puis contrôle une couche ; toute exception vaut refus (spec § 4). Si l'ouverture a
// échoué (`couche` nulle), on contrôle quand même avec `lisible: false` : le contrôle 1
// (Shapefile incomplet) passe avant le 2 (« illisible »), et le message porte le chemin complet
// dans le zip (mission 024), sans erreur technique. decrireEntree donne le format et les fichiers ;
// le nom transmis au contrôle est le nom affiché (cerf-controles.mjs en tire la racine du Shapefile).
function controlerSansPlanter(ctx, couche, c, noms) {
  const nom = nomAffiche(c);
  try {
    const entree = decrireEntree(c.entree, noms);
    const lue = couche ? ctx.decrireCouche(couche, entree.format) : { lisible: false };
    const description = Object.assign({}, lue, entree, { nom: nom });
    if (!couche) description.lisible = false;
    const v = ctx.controlerCouche(description);
    if (v && v.charge === true) return { charge: true, avertissements: Array.isArray(v.avertissements) ? v.avertissements : [] };
    return { charge: false, message: v && v.message ? String(v.message) : nom + ' : couche refusée' };
  } catch (e) {
    return { charge: false, message: nom + ' : contrôle impossible, couche refusée' };
  }
}

// --------------------------------------------------------------------------- copies et styles (mission 010, ADR 0008)

function messageErreur(e) {
  return e && e.message ? e.message : String(e);
}

// Nom du dossier des copies d'un zip : le nom du zip sans « .zip » (il ne peut pas porter le nom
// du zip lui-même, qui est un fichier du même dossier).
export function dossierDuZip(nomZip) {
  return String(nomZip).replace(/\.zip$/i, '');
}

// Chemins de la copie d'une couche vecteur : relatif à cerf-imports/ ('Serre/UG.gpkg'), absolu.
export function cheminsDeLaCopie(dossierProjet, nomZip, nomCouche) {
  const base = dossierCopies(dossierProjet);
  const relatif = dossierDuZip(nomZip) + '/' + nomCouche + '.gpkg';
  return { relatif, gpkg: base === '' ? '' : base + '/' + relatif, qml: base === '' ? '' : base + '/' + dossierDuZip(nomZip) + '/' + nomCouche + '.qml' };
}

// Garde avant toute écriture (saveVectorLayerAs crée les dossiers et écrase sans contrôle de
// chemin ; writeFileContent aussi) : seul un « .gpkg » ou un « .qml » directement dans
// <dossier des copies>/<dossier du zip>/ est écrivable. Ne se fie à aucun argument : dossier
// absolu en « /cerf-imports », segments sains, ni « \ » ni « | » (séparateur d'URI de couche),
// dossier du zip ne finissant pas par « .zip » (il se confondrait avec la copie du zip).
export function peutEcrireCopie(chemin, dossier) {
  if (typeof chemin !== 'string' || typeof dossier !== 'string') return false;
  if (!peutEffacer(chemin.replace(/\.(gpkg|qml)$/, '.x'), dossier)) return false;
  if (chemin.indexOf('|') >= 0) return false;
  for (let i = 0; i < chemin.length; i++) if (chemin.charCodeAt(i) < 0x20) return false;
  const reste = chemin.substring(dossier.length + 1).split('/');
  if (reste.length !== 2) return false;
  if (/\.zip$/i.test(reste[0]) || !/\.(gpkg|qml)$/.test(reste[1]) || /^\.(gpkg|qml)$/.test(reste[1])) return false;
  return true;
}

// Mission 047 : style enregistré dans le GeoPackage pour la table de `c`, par le service facultatif
// `ctx.styleGpkg(source, table)` (Cerf.qml : styleGpkg). Rend { etat: 'lu', texte } ou { etat: 'illisible' } quand une
// ligne existe ; null dans tous les autres cas (service absent, qui lève, réponse inattendue, « absent ») : la
// règle du manuel s'applique alors comme avant, sans avertissement.
function styleEnregistre(ctx, nomZip, c) {
  if (typeof ctx.styleGpkg !== 'function' || typeof c.table !== 'string') return null;
  let r = null;
  try { r = ctx.styleGpkg('/vsizip/' + cheminCopie(ctx.dossierProjet, nomZip) + '/' + c.entree, c.table); } catch (e) { r = null; }
  if (!r || typeof r !== 'object') return null;
  if (r.etat === 'illisible') return { etat: 'illisible' };
  if (r.etat === 'lu' && typeof r.texte === 'string') return { etat: 'lu', texte: r.texte };
  return null;
}

// Choisit le .qml à écrire à côté de la copie : le style enregistré dans le GeoPackage (mission 047), puis celui du zip
// s'il est valide (XML, racine <qgis>, <renderer-v2>), sinon celui de la règle du manuel (styleDe puis qmlDe). Rend
// { style, qml, contenu, avertissements } ; contenu null = rien à écrire (style par défaut).
// Les avertissements sont des phrases seules (l'appelant ajoute « <fichier> : », spec § 4).
function choisirStyle(ctx, couche, nomZip, c, noms) {
  const nomCouche = c.couche;
  const rien = { style: STYLE_DEFAUT, qml: '', contenu: null, avertissements: [] };
  const S = ctx.styles;
  if (!S || typeof ctx.infosCouche !== 'function') return rien;
  try {
    const infos = ctx.infosCouche(couche) || {};
    const champs = infos.champs || [];
    let cheminQml = null;
    let texte = null;
    // Mission 047 : le style enregistré dans le GeoPackage (layer_styles) passe avant la règle du manuel.
    const gpkg = c.format === 'gpkg' ? styleEnregistre(ctx, nomZip, c) : null;
    if (gpkg !== null) {
      // Une ligne existe : mêmes garde-fous qu'un .qml (non vide, XML <qgis>) ; sinon règle du manuel et l'avertissement
      // existant (reconnaitre) ; une ligne illisible vaut un texte vide.
      texte = gpkg.etat === 'lu' && S.qmlValide(gpkg.texte) ? gpkg.texte : '';
    } else {
      // Une table de GeoPackage : son .qml porte le nom de la table, à côté du .gpkg (spec § 5).
      if (c.format === 'gpkg') cheminQml = typeof S.trouverQmlDeTable === 'function' ? S.trouverQmlDeTable(c.entree, c.table, noms) : null;
      else cheminQml = typeof S.trouverQml === 'function' ? S.trouverQml(c.entree, noms) : null;
      if (cheminQml) {
        try { texte = typeof ctx.lireTexte === 'function' ? ctx.lireTexte(nomZip, cheminQml) : null; } catch (e) { texte = null; }
        texte = typeof texte === 'string' && S.qmlValide(texte) ? texte : '';
      }
    }
    const r = S.reconnaitre({ nom: nomCouche, geometrie: infos.geometrie, champs, qml: texte });
    if (r.source === 'qml') {
      if (gpkg !== null) return { style: STYLE_GPKG, qml: '', contenu: texte, avertissements: [] };
      return { style: STYLE_QML, qml: cheminQml, contenu: texte, avertissements: [] };
    }
    const avertissements = r.avertissement ? [r.avertissement] : [];
    const attendu = S.champCodeDe(r.regle);
    const style = S.styleDe(r.regle, {
      champCode: attendu === null ? undefined : (S.champReel(champs, S.sansCasseNiAccents(attendu)) || attendu),
      champEssence: S.champReel(champs, 'essence') || undefined,
      champDiametre: S.champReel(champs, 'diametre') || undefined,
    });
    const contenu = style === null ? null : S.qmlDe(style, infos.geometrie);
    if (contenu === null) return { style: STYLE_DEFAUT, qml: '', contenu: null, avertissements };
    return { style: r.regle, qml: '', contenu, avertissements };
  } catch (e) {
    return { style: STYLE_DEFAUT, qml: '', contenu: null, avertissements: ['style non appliqué (' + messageErreur(e) + ')'] };
  }
}

// Vrai seulement s'il est SÛR qu'aucun .qml n'existe à ce chemin (effacé, puis vérifié par `existe` :
// la valeur rendue par l'effacement n'est pas crue). Chemin non écrivable ou
// exception : faux. Seule exception : les deux services de fichiers absents (contextes d'essai des tests).
function qmlAbsent(ctx, chemin, dossier) {
  try {
    // Ces deux services sont FACULTATIFS dans importerZip à dessein : les tests du testeur (mission 024) ne
    // les fournissent pas, et les rendre obligatoires les casserait. Absents, la garde est sautée sans bruit.
    // Le branchement réel est donc figé ailleurs : tests/plugin-styles.test.mjs vérifie que Cerf.qml les passe.
    if (typeof ctx.existe !== 'function' || typeof ctx.effacerFichier !== 'function') return true;
    if (!ctx.existe(chemin)) return true;
    if (!peutEcrireCopie(chemin, dossier)) return false;
    ctx.effacerFichier(chemin);
    return !ctx.existe(chemin);
  } catch (e) {
    return false;
  }
}

// Réécrit la couche ouverte (contrôlée) en GeoPackage dans cerf-imports/<zip>/, écrit le .qml à
// côté AVANT le chargement, puis charge la copie. Rend { ok: false, message } ou
// { ok: true, copie, rendu, relatif, style, qml, avertissements }.
function copierEtStyler(ctx, couche, c, nomZip, noms) {
  const fichier = nomAffiche(c);
  const dossier = dossierCopies(ctx.dossierProjet);
  const p = cheminsDeLaCopie(ctx.dossierProjet, nomZip, c.couche);
  if (!peutEcrireCopie(p.gpkg, dossier) || !peutEcrireCopie(p.qml, dossier)) {
    return { ok: false, message: `${fichier} : nom non écrivable dans cerf-imports/, couche refusée` };
  }
  const st = choisirStyle(ctx, couche, nomZip, c, noms);
  let rendu = '';
  try { rendu = String(ctx.reecrireCouche(couche, p.gpkg) || ''); } catch (e) { rendu = ''; }
  if (rendu === '') return { ok: false, message: `${fichier} : copie impossible (écriture refusée par QField), couche refusée` };
  if (!/\.gpkg$/.test(rendu) || !peutEcrireCopie(rendu, dossier)) {
    return { ok: false, message: `${fichier} : copie écrite hors de cerf-imports/, couche refusée` };
  }
  const avertissements = st.avertissements.slice();
  const cheminQml = rendu.substring(0, rendu.length - '.gpkg'.length) + '.qml';
  // Arbitrage de Pascal (4 novembre 2026) : l'ancien .qml voisin est effacé AVANT toute écriture,
  // qu'il y ait ou non un style à poser (un .qml resté d'un import précédent s'appliquerait en
  // silence à la copie). Effacement non vérifié = couche refusée : le message ne peut pas dire
  // vrai sur un style que QGIS appliquerait malgré nous.
  if (!qmlAbsent(ctx, cheminQml, dossier)) {
    return { ok: false, message: `${fichier} : ancien style (.qml) impossible à effacer, couche refusée` };
  }
  let styleFinal = st.style;
  let qmlFinal = st.qml;
  if (st.contenu !== null) {
    let ecrit = false;
    try { ecrit = peutEcrireCopie(cheminQml, dossier) && ctx.ecrireFichier(cheminQml, st.contenu) === true; } catch (e) { ecrit = false; }
    if (!ecrit) {
      // Écriture ratée ou interrompue : un .qml tronqué peut rester sur le disque et s'appliquer
      // (ou faire échouer le chargement). On l'efface ; s'il reste, la couche est refusée.
      if (!qmlAbsent(ctx, cheminQml, dossier)) {
        return { ok: false, message: `${fichier} : style (.qml) mal écrit et impossible à effacer, couche refusée` };
      }
      // La couche reste utilisable, mais sans les couleurs du manuel : on le dit.
      styleFinal = STYLE_DEFAUT;
      qmlFinal = '';
      avertissements.push('style non écrit, couche chargée avec le style par défaut');
    }
  }
  const o = chargerSansPlanter(ctx.ouvrirCouche, rendu + '|layername=' + c.couche, c.couche);
  if (!o.couche) return { ok: false, message: `${fichier} : copie illisible après réécriture, couche refusée` };
  return { ok: true, copie: o.couche, rendu, relatif: rendu.substring(dossier.length + 1), style: styleFinal, qml: qmlFinal, avertissements };
}

// --------------------------------------------------------------------------- fichiers d'une couche (mission 031)

// Suffixes des fichiers réécrits d'une couche vecteur, dans l'ordre où leurs noms sont dits (ADR 0007
// amendée ; annexes SQLite et GDAL : -wal, -shm, .aux.xml).
const SUFFIXES_COUCHE = ['.gpkg', '.qml', '.gpkg-wal', '.gpkg-shm', '.gpkg.aux.xml'];

// Chemins protégés : fichiers qu'une autre entrée du registre utilise encore. On ne suit le `chemin`
// du registre que pour PROTÉGER, jamais pour effacer. Un .gpkg partagé protège aussi ses annexes et son .qml.
function cheminsProteges(dossier, autres) {
  const proteges = {};
  const proteger = (gpkg) => {
    const base = gpkg.replace(/\.gpkg$/, '');
    for (let k = 0; k < SUFFIXES_COUCHE.length; k++) proteges[base + SUFFIXES_COUCHE[k]] = true;
  };
  for (let i = 0; i < autres.length; i++) {
    const e = autres[i];
    if (!e || typeof e !== 'object' || typeof e.chemin !== 'string') continue;
    proteger(dossier + '/' + e.chemin);
    if (estNomDeZip(e.zip) && estNomSimple(e.couche)) proteger(dossier + '/' + dossierDuZip(e.zip) + '/' + e.couche + '.gpkg');
  }
  return proteges;
}

// Efface les fichiers réécrits d'une couche vecteur sortie du registre. Rend les noms des fichiers
// qui existaient et sont restés (ordre de SUFFIXES_COUCHE), et `nonVerifiable` quand le service `existe`
// manque : rien n'est alors tenté (la réponse de l'effacement n'est jamais crue : on vérifie avant et
// après). Ne lève jamais.
const PHRASE_NON_VERIFIABLE = 'Effacement non vérifiable : fichiers peut-être restés.';
function effacerFichiersDeCouche(ctx, zip, couche, autres) {
  const restes = [];
  const bilan = { restes, nonVerifiable: false };
  try {
    if (!estNomDeZip(zip) || !estNomSimple(couche) || couche.indexOf('|') >= 0) return bilan;
    if (/\.zip$/i.test(dossierDuZip(zip))) return bilan;
    const dossier = dossierCopies(ctx.dossierProjet);
    if (dossier === '') return bilan;
    if (typeof ctx.existe !== 'function') { bilan.nonVerifiable = true; return bilan; }
    let rm = null;
    if (typeof ctx.effacerFichier === 'function') rm = ctx.effacerFichier;
    else if (ctx.platformUtilities && typeof ctx.platformUtilities.rmFile === 'function') rm = (c) => ctx.platformUtilities.rmFile(c);
    const proteges = cheminsProteges(dossier, autres);
    for (let i = 0; i < SUFFIXES_COUCHE.length; i++) {
      const chemin = dossier + '/' + dossierDuZip(zip) + '/' + couche + SUFFIXES_COUCHE[i];
      if (Object.prototype.hasOwnProperty.call(proteges, chemin)) continue;
      if (!peutEffacer(chemin, dossier)) continue;
      try { if (!ctx.existe(chemin)) continue; } catch (e) { continue; }
      if (rm !== null) { try { rm(chemin); } catch (e) { /* vérifié ci-dessous */ } }
      let reste = true;
      try { reste = !!ctx.existe(chemin); } catch (e) { reste = true; }
      if (reste) restes.push(nomDeFichier(chemin));
    }
  } catch (e) {
    /* jamais d'exception : ce qui est connu est rendu */
  }
  return bilan;
}

function noterEffacement(cumul, bilan) {
  for (let i = 0; i < bilan.restes.length; i++) cumul.restes.push(bilan.restes[i]);
  if (bilan.nonVerifiable) cumul.nonVerifiable = true;
}

// Tables des GeoPackage du zip, par le service `ctx.tablesGpkg(source, entree)` (Cerf.qml : tablesDuGpkg
// sur QField) : il rend la liste des tables vecteur, [] si aucune, ou autre chose (null, exception) si
// illisibles. Service absent : tables inconnues, donc « tables illisibles » (jamais ouvert sans layername).
function tablesDesGpkg(ctx, copie, noms) {
  const tables = {};
  if (typeof ctx.tablesGpkg !== 'function') return tables;
  const sans = couchesDuZip(noms);
  for (let i = 0; i < sans.length; i++) {
    const c = sans[i];
    if (c.format !== 'gpkg' || Object.prototype.hasOwnProperty.call(tables, c.entree)) continue;
    let liste = null;
    try { liste = ctx.tablesGpkg('/vsizip/' + copie + '/' + c.entree, c.entree); } catch (e) { liste = null; }
    if (!Array.isArray(liste)) continue;
    let saine = true;
    for (let k = 0; k < liste.length; k++) if (!nomDeTableSur(liste[k])) saine = false;
    if (saine) tables[c.entree] = liste.slice();
  }
  return tables;
}

// Refus d'un GeoPackage sans table à charger (spec § 4, Pascal, 4 novembre 2026), avant toute ouverture.
function messageGpkgSansTable(c) {
  return c.vide === true
    ? `${nomAffiche(c)} : aucune table vecteur, couche non chargée`
    : `${nomAffiche(c)} : tables illisibles, couche non chargée`;
}

// Ouvre une couche du zip en /vsizip/, sans l'ajouter à la carte. Le format est passé à ouvrirCouche :
// Cerf.qml ouvre un GeoTIFF par LayerUtils.loadRasterLayer (mission 024), le reste par loadVectorLayer.
function ouvrirDuZip(ctx, copie, c) {
  const source = sourceDeLaCouche(copie, c);
  if (source === '') return { couche: null, raison: 'illisible' };
  return chargerSansPlanter(function (s, n) { return ctx.ouvrirCouche(s, n, c.format); }, source, c.couche);
}

export function importerZip(ctx) {
  const vide = (message) => ({ chargees: [], refusees: [], ecartees: [], message });
  if (!ctx || !estUuid(ctx.cerfId)) return vide("Projet non Cerf (cerf_id absent ou invalide) : rien n'est importé.");
  const nomZip = ctx.nomZip;
  if (!estNomDeZip(nomZip)) return vide(`Fichier refusé : « ${nomZip} » n'est pas un nom de zip simple (.zip).`);
  if (!dossierProjetSain(ctx.dossierProjet)) return vide("Dossier du projet inconnu : rien n'est importé.");
  let noms;
  try {
    const o = octetsDe(ctx.octets);
    if (o.length > PLAFOND_LISTAGE_OCTETS) return vide(messageListageRefuse(nomZip, o.length));
    noms = nomsDuZip(o);
  } catch (e) {
    return vide(`${nomZip} : ${e.message}`);
  }
  const copie = cheminCopie(ctx.dossierProjet, nomZip);
  // Un .json n'est une couche que s'il est du GeoJSON (spec § 3.1). Mission 044 : un .json écarté (contenu
  // lisible qui n'est pas du GeoJSON, ou, plus bas, ouverture ratée) n'est PAS un refus : il est dit par la
  // ligne « <chemin> : pas une couche GeoJSON, ignoré » (Pascal, 5 novembre 2026), jamais perdu en silence.
  // Contenu illisible (cas de l'appareil, lireTexte rend null) : on tente le chargement.
  const couches = [];
  const ecartees = [];
  const ecarter = (c) => ecartees.push({ couche: c.couche, entree: c.entree, message: `${nomAffiche(c)} : ${PHRASE_JSON_ECARTE}` });
  const candidates = couchesDuZip(noms, tablesDesGpkg(ctx, copie, noms));
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    if (c.json && ctx.styles && typeof ctx.styles.estGeoJson === 'function' && typeof ctx.lireTexte === 'function') {
      let texte = null;
      try { texte = ctx.lireTexte(nomZip, c.entree); } catch (e) { texte = null; }
      if (typeof texte === 'string' && !ctx.styles.estGeoJson(texte)) { ecarter(c); continue; }
    }
    couches.push(c);
  }
  // Zip sans couche à traiter : message existant, puis les lignes d'écart.
  const sansCouche = () => {
    // Décision n° 11 : zip réimporté sans aucune couche lisible = import avorté (registre et carte
    // intacts : ce retour précède le retrait de la décision n° 8).
    const dejaImporte = lireRegistre(ctx.reglages, ctx.cerfId).some((e) => e && typeof e === 'object' && e.zip === nomZip);
    const base = dejaImporte
      ? `aucune couche lisible dans ${nomZip}, rien changé`
      : `Aucune couche GeoJSON, Shapefile, GeoPackage ou GeoTIFF dans ${nomZip}.`;
    const r = vide([base].concat(ecartees.map((e) => e.message)).join('\n'));
    r.ecartees = ecartees;
    return r;
  };
  if (couches.length === 0) return sansCouche();
  // Mission 012 : le contrôle est obligatoire. Un service absent refuse tout (jamais « pas de
  // contrôle = tout passe »). Mission 010 (ADR 0008) : sans de quoi réécrire et écrire le .qml,
  // aucune couche n'est chargée non plus.
  for (const service of ['ouvrirCouche', 'decrireCouche', 'controlerCouche', 'ajouterALaCarte', 'reecrireCouche', 'ecrireFichier']) {
    if (typeof ctx[service] !== 'function') {
      return vide(`Contrôles d'import indisponibles (${service} absent) : rien n'est importé.`);
    }
  }
  // Mission 044 : un .json dont le contenu n'a pas pu être lu est ouvert d'abord ; s'il ne s'ouvre pas, il est
  // écarté (ligne d'écart, ni refus ni compté lisible). Un .geojson illisible, lui, reste refusé « illisible ».
  const ouvertesJson = {};
  for (let i = couches.length - 1; i >= 0; i--) {
    const c = couches[i];
    if (!c.json) continue;
    const o = ouvrirDuZip(ctx, copie, c);
    if (o.couche) { ouvertesJson[c.entree] = o; continue; }
    couches.splice(i, 1);
    ecarter(c);
  }
  // splice à rebours : remettre les lignes d'écart dans l'ordre du zip.
  ecartees.sort((a, b) => noms.indexOf(a.entree) - noms.indexOf(b.entree));
  if (couches.length === 0) return sansCouche();
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : () => new Date();
  // Un GeoPackage sans table à charger (table: null) n'est jamais ouvert ni compté comme présent.
  const aCharger = (c) => !(c.format === 'gpkg' && c.table === null);
  // Ouverture de toutes les couches AVANT de toucher au registre ou à la carte (décision n° 13) :
  // un zip réimporté dont aucune couche ne s'ouvre est un import avorté, rien n'est retiré.
  const ouvertes = {};
  const dejaImporte = lireRegistre(ctx.reglages, ctx.cerfId).some((e) => e && typeof e === 'object' && e.zip === nomZip);
  if (dejaImporte) {
    let nbLisibles = 0;
    for (let i = 0; i < couches.length; i++) {
      const c = couches[i];
      if (!aCharger(c)) continue;
      if (c.json) { nbLisibles++; continue; } // déjà ouvert plus haut
      if (Object.prototype.hasOwnProperty.call(ouvertes, c.couche)) continue; // doublon : refusé plus bas
      const o = ouvrirDuZip(ctx, copie, c);
      ouvertes[c.couche] = o;
      if (o.couche) nbLisibles++;
    }
    if (nbLisibles === 0) return sansCouche();
  }
  // Retrait de la carte des couches de ce zip (réimport), seulement maintenant.
  if (typeof ctx.retirerLeZipDeLaCarte === 'function') ctx.retirerLeZipDeLaCarte(nomZip);
  // Décision n° 8 : le zip réimporté remplace l'ancien en entier. Les couches de ce zip qui n'y
  // sont plus sortent du registre (la copie du zip est écrasée par QField ; les copies des
  // couches, réécrites par saveVectorLayerAs).
  const presentes = {};
  for (let i = 0; i < couches.length; i++) if (aCharger(couches[i])) presentes[couches[i].couche] = true;
  const bilanEfface = { restes: [], nonVerifiable: false };
  const anciennes = lireRegistre(ctx.reglages, ctx.cerfId);
  for (let i = 0; i < anciennes.length; i++) {
    const e = anciennes[i];
    if (e && typeof e === 'object' && e.zip === nomZip && !Object.prototype.hasOwnProperty.call(presentes, e.couche)) {
      retirer(ctx.reglages, ctx.cerfId, { zip: nomZip, couche: e.couche });
      if (typeof e.chemin === 'string') {
        noterEffacement(bilanEfface, effacerFichiersDeCouche(ctx, nomZip, e.couche, lireRegistre(ctx.reglages, ctx.cerfId)));
      }
    }
  }
  const chargees = [];
  const refusees = [];
  const avertissements = [];
  const vues = {};
  for (let i = 0; i < couches.length; i++) {
    const c = couches[i];
    const nom = nomAffiche(c);
    if (!aCharger(c)) {
      // GeoPackage aux tables illisibles ou sans table vecteur : refusé, jamais ouvert, voisins traités.
      const message = messageGpkgSansTable(c);
      refusees.push({ couche: c.couche, entree: c.entree, raison: message, message });
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(vues, c.couche)) {
      // Décision n° 4 : même nom dans deux dossiers du zip, la seconde est refusée.
      const raison = `nom de couche en double dans le zip (déjà pris par ${vues[c.couche]})`;
      refusees.push({ couche: c.couche, entree: c.entree, raison, message: `${nom} : ${raison}` });
      continue;
    }
    vues[c.couche] = nom;
    const source = sourceDeLaCouche(copie, c);
    // Ouvrir (en /vsizip/, sans ajouter à la carte), contrôler, réécrire, styler, charger la copie,
    // puis seulement ajouter à la carte et inscrire.
    const r = (c.json && ouvertesJson[c.entree]) || ouvertes[c.couche] || ouvrirDuZip(ctx, copie, c);
    // Ouverture ratée : le contrôle passe quand même (lisible: false), pour que le contrôle 1
    // précède « illisible » et que le message porte le chemin complet dans le zip.
    const verdict = controlerSansPlanter(ctx, r.couche, c, noms);
    const refuser = (message) => {
      // Réimport : une couche acceptée au premier import puis refusée ne doit pas rester au registre.
      const etaitInscrite = lireRegistre(ctx.reglages, ctx.cerfId).some((x) => memeCouche(x, nomZip, c.couche) && typeof x.chemin === 'string');
      retirer(ctx.reglages, ctx.cerfId, { zip: nomZip, couche: c.couche });
      if (etaitInscrite) noterEffacement(bilanEfface, effacerFichiersDeCouche(ctx, nomZip, c.couche, lireRegistre(ctx.reglages, ctx.cerfId)));
      refusees.push({ couche: c.couche, entree: c.entree, raison: message, message });
    };
    if (!verdict.charge) { refuser(verdict.message); continue; }
    // Un verdict d'acceptation ne vaut rien sur une couche qui ne s'est pas ouverte : jamais de copie d'une couche nulle.
    if (!r.couche) { refuser(nom + ' : couche illisible, couche refusée'); continue; }
    if (c.format === 'tif') {
      // GeoTIFF (ADR 0008, arbitrage n° 3) : lu dans le zip, style par défaut, sans réécriture ; au registre
      // par `chemin_vsi` (ADR 0003 amendée). Pas de readOnly : QgsRasterLayer n'a pas cette propriété
      // (QGIS 3a92eb3, src/core/raster/qgsrasterlayer.h ; elle est à QgsVectorLayer, qgsvectorlayer.h l. 420).
      for (let k = 0; k < verdict.avertissements.length; k++) avertissements.push(verdict.avertissements[k]);
      try {
        ctx.ajouterALaCarte(r.couche, c.couche, source, nomZip);
      } catch (e) {
        refuser(nom + ' : ajout à la carte impossible');
        continue;
      }
      inscrire(ctx.reglages, ctx.cerfId, {
        zip: nomZip, couche: c.couche, chemin_vsi: nomZip + '/' + c.entree, style: STYLE_DEFAUT, ajoutee_le: maintenant().toISOString(),
      });
      chargees.push({ couche: c.couche, entree: c.entree, source, style: STYLE_DEFAUT });
      continue;
    }
    const cp = copierEtStyler(ctx, r.couche, c, nomZip, noms);
    if (!cp.ok) { refuser(cp.message); continue; }
    for (let k = 0; k < verdict.avertissements.length; k++) avertissements.push(verdict.avertissements[k]);
    for (let k = 0; k < cp.avertissements.length; k++) avertissements.push(nom + ' : ' + cp.avertissements[k]);
    try {
      cp.copie.readOnly = true;
      ctx.ajouterALaCarte(cp.copie, c.couche, cp.rendu, nomZip);
    } catch (e) {
      refuser(nom + ' : ajout à la carte impossible');
      continue;
    }
    // Inscription après chaque couche (spec § 1, geste 5).
    const ligne = {
      zip: nomZip,
      couche: c.couche,
      chemin: cp.relatif,
      style: cp.style,
      ajoutee_le: maintenant().toISOString(),
    };
    if (cp.qml !== '') ligne.qml = cp.qml;
    inscrire(ctx.reglages, ctx.cerfId, ligne);
    chargees.push({ couche: c.couche, entree: c.entree, source: cp.rendu, style: cp.style });
  }
  const lignes = [];
  if (chargees.length > 0) {
    lignes.push(`${chargees.length} ${pluriel(chargees.length, 'couche chargée', 'couches chargées')} : ${nomsDe(chargees)}`);
  } else {
    lignes.push(`Aucune couche chargée depuis ${nomZip}`);
  }
  for (let i = 0; i < refusees.length; i++) lignes.push(refusees[i].message || `${refusees[i].couche} : ${refusees[i].raison}`);
  for (let i = 0; i < ecartees.length; i++) lignes.push(ecartees[i].message);
  for (let i = 0; i < avertissements.length; i++) lignes.push(avertissements[i]);
  if (bilanEfface.restes.length > 0) lignes.push(`Fichiers restés sur l'appareil : ${bilanEfface.restes.join(', ')}.`);
  if (bilanEfface.nonVerifiable) lignes.push(PHRASE_NON_VERIFIABLE);
  return { chargees, refusees, ecartees, avertissements, message: lignes.join('\n') };
}

// --------------------------------------------------------------------------- ouvrir

export function demarrerProjet(ctx) {
  const inactif = { actif: false, boutonVisible: false, rechargees: [], absentes: [], illisibles: [], douteuses: 0, message: '' };
  if (!ctx) return inactif;
  const cerfId = lireCerfId(ctx.variables);
  if (cerfId === null) return inactif;
  const dossier = dossierCopies(ctx.dossierProjet);
  if (dossier === '') {
    return {
      actif: true, boutonVisible: true, cerfId, rechargees: [], absentes: [], illisibles: [], douteuses: 0,
      message: 'Dossier du projet inconnu : aucune couche rechargée.',
    };
  }
  const etat = etatRegistre(ctx.reglages, cerfId);
  const saines = [];
  let douteuses = 0;
  for (let i = 0; i < etat.liste.length; i++) {
    if (entreeSaine(etat.liste[i])) saines.push(etat.liste[i]); else douteuses++;
  }
  // Décision n° 5 : les entrées douteuses sont retirées aussitôt, sans rien effacer.
  if (douteuses > 0) ecrireRegistre(ctx.reglages, cerfId, saines);
  const presence = {};
  const rechargees = [];
  const absentes = [];
  const illisibles = [];
  for (let i = 0; i < saines.length; i++) {
    const e = saines[i];
    if (typeof e.chemin === 'string') {
      // Copie GeoPackage (ADR 0008) : rechargée depuis le disque, le zip n'est pas relu ; son .qml
      // est à côté, QGIS l'applique seul au chargement.
      if (!ctx.existe(dossier + '/' + e.chemin)) { absentes.push({ zip: e.zip, couche: e.couche, copie: true }); continue; }
      const rc = chargerSansPlanter(ctx.chargerCouche, dossier + '/' + e.chemin + '|layername=' + e.couche, e.couche, e.zip);
      if (!rc.couche) { illisibles.push({ zip: e.zip, couche: e.couche }); continue; }
      rc.couche.readOnly = true;
      rechargees.push({ zip: e.zip, couche: e.couche });
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(presence, e.zip)) presence[e.zip] = !!ctx.existe(dossier + '/' + e.zip);
    if (!presence[e.zip]) { absentes.push({ zip: e.zip, couche: e.couche }); continue; }
    const source = '/vsizip/' + dossier + '/' + e.chemin_vsi;
    const r = chargerSansPlanter(ctx.chargerCouche, source, e.couche);
    if (!r.couche) { illisibles.push({ zip: e.zip, couche: e.couche }); continue; }
    // Un GeoTIFF (mission 024) n'a pas de readOnly (propriété de QgsVectorLayer seulement, qgsvectorlayer.h l. 420).
    if (!estSourceRaster(source)) r.couche.readOnly = true;
    rechargees.push({ zip: e.zip, couche: e.couche });
  }
  const lignes = [];
  if (etat.illisible) lignes.push("registre illisible : il sera remplacé au prochain ajout d'un zip");
  if (douteuses > 0) {
    lignes.push(`${douteuses} ${pluriel(douteuses, 'entrée douteuse retirée', 'entrées douteuses retirées')} du registre (aucun fichier effacé)`);
  }
  const zipsAbsents = absentes.filter((a) => !a.copie).length;
  const copiesAbsentes = absentes.length - zipsAbsents;
  if (zipsAbsents > 0) {
    lignes.push(zipsAbsents === 1
      ? "1 couche n'a pas pu être rechargée : zip absent"
      : `${zipsAbsents} couches n'ont pas pu être rechargées : zip absent`);
  }
  if (copiesAbsentes > 0) {
    lignes.push(copiesAbsentes === 1
      ? "1 couche n'a pas pu être rechargée : copie absente (réimporter le zip)"
      : `${copiesAbsentes} couches n'ont pas pu être rechargées : copie absente (réimporter le zip)`);
  }
  if (illisibles.length > 0) {
    lignes.push(illisibles.length === 1
      ? `1 couche n'a pas pu être rechargée : illisible (${nomsDe(illisibles)})`
      : `${illisibles.length} couches n'ont pas pu être rechargées : illisibles (${nomsDe(illisibles)})`);
  }
  return {
    actif: true, boutonVisible: true, cerfId, rechargees, absentes, illisibles, douteuses,
    message: lignes.join('\n'),
  };
}

// --------------------------------------------------------------------------- retirer et effacer

// Garde avant rmFile (ADR 0007) : ne se fie à aucun argument. Le dossier doit être absolu, sans
// segment vide, « . » ou « .. », sans « \ », et finir exactement par « /cerf-imports » sous un
// dossier de projet autre que la racine ; le chemin doit être dedans, sans segment douteux.
export function peutEffacer(chemin, dossier) {
  if (typeof chemin !== 'string' || typeof dossier !== 'string') return false;
  if (dossier.indexOf('\\') >= 0 || chemin.indexOf('\\') >= 0) return false;
  if (dossier.charAt(0) !== '/' || !segmentsSains(dossier.substring(1))) return false;
  const suffixe = '/' + NOM_DOSSIER_COPIES;
  if (dossier.length <= suffixe.length || dossier.substring(dossier.length - suffixe.length) !== suffixe) return false;
  if (chemin.indexOf(dossier + '/') !== 0) return false;
  return segmentsSains(chemin.substring(dossier.length + 1));
}

export function effacerCopie(platformUtilities, chemin, dossier) {
  const nom = nomDeFichier(chemin);
  if (!peutEffacer(chemin, dossier)) {
    return { efface: false, message: `Effacement refusé (hors du dossier des copies) : ${nom}` };
  }
  if (!platformUtilities || typeof platformUtilities.rmFile !== 'function') {
    return { efface: false, message: `Copie conservée sur l'appareil : ${nom}` };
  }
  let fait = false;
  try {
    fait = !!platformUtilities.rmFile(chemin);
  } catch (e) {
    fait = false;
  }
  return fait
    ? { efface: true, message: `Copie effacée : ${nom}` }
    : { efface: false, message: `Copie conservée sur l'appareil : ${nom}` };
}

export function retirerCouche(ctx) {
  if (!ctx || !estUuid(ctx.cerfId)) {
    return { efface: false, message: "Projet non Cerf (cerf_id absent ou invalide) : rien n'est retiré." };
  }
  const zip = ctx.zip;
  const couche = ctx.couche;
  if (typeof ctx.retirerDeLaCarte === 'function') ctx.retirerDeLaCarte(couche);
  const avant = lireRegistre(ctx.reglages, ctx.cerfId);
  let vectorielle = false;
  for (let i = 0; i < avant.length; i++) {
    if (memeCouche(avant[i], zip, couche) && typeof avant[i].chemin === 'string') vectorielle = true;
  }
  const r = retirer(ctx.reglages, ctx.cerfId, { zip, couche });
  if (!r.retiree) return { efface: false, message: `Couche absente du registre : ${couche}.` };
  const debut = `Couche retirée : ${couche}.`;
  // Fichiers réécrits de la couche (mission 031) : après la carte et le registre, jamais bloquant.
  let phrase = '';
  if (vectorielle) {
    const b = effacerFichiersDeCouche(ctx, zip, couche, lireRegistre(ctx.reglages, ctx.cerfId));
    if (b.restes.length > 0) phrase = ` Fichiers restés sur l'appareil : ${b.restes.join(', ')}.`;
    if (b.nonVerifiable) phrase += ` ${PHRASE_NON_VERIFIABLE}`;
  }
  if (!r.zipInutile) {
    const n = nombreDeCouchesDuZip(ctx.reglages, ctx.cerfId, zip);
    return { efface: false, message: `${debut}${phrase} La copie ${zip} sert encore à ${n} ${pluriel(n, 'couche', 'couches')}.` };
  }
  if (!estNomDeZip(zip)) {
    return { efface: false, message: `${debut}${phrase} Nom de zip douteux au registre : aucun fichier effacé.` };
  }
  if (!dossierProjetSain(ctx.dossierProjet)) {
    return { efface: false, message: `${debut}${phrase} Dossier du projet inconnu : aucun fichier effacé (${zip}).` };
  }
  const e = effacerCopie(ctx.platformUtilities, cheminCopie(ctx.dossierProjet, zip), dossierCopies(ctx.dossierProjet));
  return { efface: e.efface, message: `${debut}${phrase} ${e.message}` };
}

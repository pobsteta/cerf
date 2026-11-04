// SPDX-License-Identifier: GPL-3.0-or-later
// Cerf, prototype n° 2 (mission 023) : logique du plugin, sans API de QField.
// Écrit pour Cerf (rien de recopié, ADR 0006). Module ECMAScript pur, sans .pragma, sans
// .import, sans import : chargé à la fois par QML (Essai.qml) et par Node
// (tests/prototype-2.test.mjs), ADR 0005.
// Prudence de syntaxe pour le moteur JavaScript de QML : ni « ?. », ni « ?? », ni
// séparateur de chiffres, ni TextDecoder.
//
// Format zip lu : APPNOTE de PKWARE (fin de répertoire 0x06054b50, répertoire central
// 0x02014b50, en-tête local 0x04034b50). Pas de ZIP64. Seules les entrées STOCKÉES
// (méthode 0) sont extraites : un décompresseur « inflate » n'est pas dans ce prototype
// (décision de Pascal du 4 novembre 2026, question 1 du plan).

export const VERSION = '0.1.0';

// Noms des boutons, à reporter tels quels dans tests/recette/prototype-2.md.
export const BOUTONS = {
  B0: '0. Préparer le zip',
  B1: '1. Couche sortie du zip',
  B2: '2. Couche lue dans le zip',
  B3: '3. GeoPackage avec styles',
  B4: '4. .qml posé après',
  B4B: '4b. Écrire le .qml maintenant',
  B4C: '4c. Recharger la couche (reload)',
  B4D: '4d. Nouvelle couche, même fichier',
  B5M: '5. Mémoriser',
  B5R: '5. Après réouverture',
  B6: '6. Reprojection',
  B7: '7. Métadonnées d\'une couche',
};

export const NOM_ZIP = 'essai-styles.zip';

// Le seul projet où le prototype agit (relecture 1 : il ne doit rien écrire ni recharger dans
// un autre projet de l'appareil, en particulier le vrai projet de terrain).
export const PROJET_ESSAI = 'cerf-essai-2.qgs';

// Vrai si le fichier du projet ouvert (chemin complet ou nom) est cerf-essai-2.qgs.
export function estProjetEssai(fichierProjet) {
  if (typeof fichierProjet !== 'string' || fichierProjet === '') return false;
  return nomDeFichier(fichierProjet) === PROJET_ESSAI;
}

// Point de la question 6 : Strasbourg, WGS84, longitude puis latitude (décision de Pascal,
// 4 novembre 2026). Attendu en Lambert 93 : X (est) 1 051 113 ; Y (nord) 6 840 462 ; pyproj
// 3.8.0 donne 1 051 112,70 ; 6 840 461,54.
export const POINT_WGS84 = { lon: 7.76189, lat: 48.56906 };
export const POINT_ATTENDU_L93 = { x: 1051113, y: 6840462 };
export const TOLERANCE_METRES = 5;
// Rectangle de la question 6, deux coins WGS84 (longitude, latitude).
export const RECT_WGS84 = { lon1: 7.75, lat1: 48.56, lon2: 7.77, lat2: 48.58 };
// Emprise de vraisemblance de la spec § 4 (métropole, Corse comprise), Lambert 93, en mètres.
export const EMPRISE_L93 = { xmin: 89101, xmax: 1252436, ymin: 6036555, ymax: 7120480 };

// --------------------------------------------------------------------------- octets

// Rend un Uint8Array à partir de ce que rend QML (QByteArray → ArrayBuffer en Qt 6) ou Node.
export function octetsDe(valeur) {
  if (valeur instanceof Uint8Array) return valeur;
  // Un QByteArray vide arrive en ArrayBuffer vide, et le moteur de Qt 6 lève « Type error »
  // sur new Uint8Array() d'un tel tampon (vu le 2 novembre 2026) : traité à part.
  if (valeur instanceof ArrayBuffer) return valeur.byteLength === 0 ? new Uint8Array(0) : new Uint8Array(valeur);
  if (valeur && ArrayBuffer.isView(valeur)) return new Uint8Array(valeur.buffer, valeur.byteOffset, valeur.byteLength);
  const type = valeur === null ? 'null' : typeof valeur;
  throw new Error('octets illisibles : type reçu « ' + type + ' », attendu ArrayBuffer ou Uint8Array');
}

// Un ArrayBuffer de la taille exacte des octets (celui que reçoit writeFileContent).
export function arrayBufferExact(octets) {
  const o = octetsDe(octets);
  return o.buffer.slice(o.byteOffset, o.byteOffset + o.byteLength);
}

function lire16(o, i) {
  return o[i] | (o[i + 1] << 8);
}

function lire32(o, i) {
  return (o[i] | (o[i + 1] << 8) | (o[i + 2] << 16)) + o[i + 3] * 0x1000000;
}

// --------------------------------------------------------------------------- CRC32

let TABLE_CRC = null;
function tableCrc() {
  if (TABLE_CRC) return TABLE_CRC;
  TABLE_CRC = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    TABLE_CRC.push(c >>> 0);
  }
  return TABLE_CRC;
}

// CRC-32 (polynôme 0xEDB88320, celui du zip), rendu non signé.
export function crc32(valeur) {
  const o = octetsDe(valeur);
  const t = tableCrc();
  let c = 0xffffffff;
  for (let i = 0; i < o.length; i++) c = t[(c ^ o[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function hex32(n) {
  const s = (n >>> 0).toString(16).toUpperCase();
  return '00000000'.substring(s.length) + s;
}

// --------------------------------------------------------------------------- zip

// Décodage du nom : UTF-8 si le bit 11 est posé ; sinon les octets ASCII, le reste en « ? »
// (les noms d'essai sont ASCII ; le vrai plugin traitera CP437 : prototype n° 1, cerf-zip.mjs).
function nomDe(brut, utf8) {
  let s = '';
  let i = 0;
  while (i < brut.length) {
    const b = brut[i];
    if (b < 0x80) { s += String.fromCharCode(b); i += 1; continue; }
    if (utf8 && b >= 0xc2 && b <= 0xdf && i + 1 < brut.length) {
      s += String.fromCharCode(((b & 0x1f) << 6) | (brut[i + 1] & 0x3f)); i += 2; continue;
    }
    s += '?'; i += 1;
  }
  return s;
}

// Lit le répertoire central. Rend { entrees: [{ nom, methode, tailleCompressee, taille,
// crc32, decalageLocal }] }. Erreur au message clair sinon.
export function listerZip(valeur) {
  const o = octetsDe(valeur);
  if (o.length === 0) throw new Error('zip vide : 0 octet lu');
  if (o.length < 22) throw new Error("ce fichier n'est pas un zip (" + o.length + ' octets, trop court)');
  let fin = -1;
  const plusBas = Math.max(0, o.length - 22 - 65535);
  for (let i = o.length - 22; i >= plusBas; i--) {
    if (o[i] === 0x50 && o[i + 1] === 0x4b && o[i + 2] === 0x05 && o[i + 3] === 0x06) { fin = i; break; }
  }
  if (fin < 0) {
    throw new Error(o[0] === 0x50 && o[1] === 0x4b
      ? 'zip tronqué : fin de répertoire introuvable (fichier incomplet ?)'
      : "ce fichier n'est pas un zip (signature PK absente)");
  }
  const nombre = lire16(o, fin + 10);
  const tailleCentral = lire32(o, fin + 12);
  const decalageCentral = lire32(o, fin + 16);
  if (nombre === 0xffff || tailleCentral === 0xffffffff || decalageCentral === 0xffffffff) {
    throw new Error('zip ZIP64 : non lu par le prototype');
  }
  if (decalageCentral + tailleCentral > fin) throw new Error('zip tronqué ou abîmé : le répertoire central dépasse la fin du fichier');
  const entrees = [];
  let p = decalageCentral;
  for (let k = 0; k < nombre; k++) {
    if (p + 46 > fin || lire32(o, p) !== 0x02014b50) {
      throw new Error('zip tronqué ou abîmé : entrée ' + (k + 1) + ' sur ' + nombre + ' illisible dans le répertoire central');
    }
    const drapeaux = lire16(o, p + 8);
    const lNom = lire16(o, p + 28);
    const lExtra = lire16(o, p + 30);
    const lComm = lire16(o, p + 32);
    if (p + 46 + lNom > fin) throw new Error("zip tronqué ou abîmé : nom de l'entrée " + (k + 1) + ' coupé');
    entrees.push({
      nom: nomDe(o.subarray(p + 46, p + 46 + lNom), (drapeaux & 0x0800) !== 0),
      methode: lire16(o, p + 10),
      crc32: lire32(o, p + 16),
      tailleCompressee: lire32(o, p + 20),
      taille: lire32(o, p + 24),
      decalageLocal: lire32(o, p + 42),
    });
    p += 46 + lNom + lExtra + lComm;
  }
  return { entrees: entrees };
}

// Octets d'une entrée STOCKÉE : saute l'en-tête local (30 octets + nom + extra LOCAUX, qui
// peuvent différer de ceux du répertoire central), vérifie le CRC32.
export function extraireEntree(valeur, entree) {
  if (entree.methode !== 0) {
    throw new Error('« ' + entree.nom + ' » : entrée compressée (méthode ' + entree.methode + '), non extraite '
      + '(pas de décompresseur dans le prototype)');
  }
  const o = octetsDe(valeur);
  const h = entree.decalageLocal;
  if (h + 30 > o.length || lire32(o, h) !== 0x04034b50) throw new Error('zip abîmé : en-tête local de « ' + entree.nom + ' » introuvable');
  const debut = h + 30 + lire16(o, h + 26) + lire16(o, h + 28);
  if (debut + entree.taille > o.length) throw new Error('zip tronqué : données de « ' + entree.nom + ' » coupées');
  const donnees = o.subarray(debut, debut + entree.taille);
  const crc = crc32(donnees);
  if (crc !== entree.crc32) {
    throw new Error('« ' + entree.nom + ' » : CRC32 faux (zip ' + hex32(entree.crc32) + ', lu ' + hex32(crc) + ')');
  }
  return donnees;
}

export function trouverEntree(entrees, nom) {
  for (let i = 0; i < entrees.length; i++) if (entrees[i].nom === nom) return entrees[i];
  return null;
}

// --------------------------------------------------------------------------- chemins

function sansBarreFinale(d) {
  return d.length > 1 ? d.replace(/\/+$/, '') : d;
}

// <dossier du projet>/cerf-imports/ (spec § 3.3) ; QField refuse d'écrire hors du projet.
export function dossierImports(dossierProjet) {
  if (!dossierProjet) throw new Error('aucun projet ouvert : dossier cerf-imports inconnu');
  return sansBarreFinale(dossierProjet) + '/cerf-imports/';
}

export function cheminZipCopie(dossierProjet) {
  return dossierImports(dossierProjet) + NOM_ZIP;
}

export function cheminSortie(dossierProjet, sousDossier, nom) {
  return dossierImports(dossierProjet) + sousDossier + '/' + nom;
}

export function cheminVsizip(zip, entree) {
  return '/vsizip/' + zip + '/' + entree.replace(/^\/+/, '');
}

export function uriGpkg(chemin, table) {
  return chemin + '|layername=' + table;
}

// Garde avant platformUtilities.rmFile (ADR 0007, qui n'a aucun contrôle de chemin) : seul un
// .qml DANS <dossier du projet>/cerf-imports/ peut être effacé ; chemin absolu, sans « .. »,
// sans « // », sans antislash. Ne se fie à aucun argument.
export function peutEffacerQml(chemin, dossierProjet) {
  if (typeof chemin !== 'string' || typeof dossierProjet !== 'string') return false;
  if (dossierProjet.charAt(0) !== '/' || sansBarreFinale(dossierProjet) === '/') return false;
  if (chemin.charAt(0) !== '/' || chemin.indexOf('..') >= 0 || chemin.indexOf('//') >= 0 || chemin.indexOf('\\') >= 0) return false;
  const base = dossierImports(dossierProjet);
  if (chemin.indexOf(base) !== 0) return false;
  const reste = chemin.substring(base.length);
  return /^[A-Za-z0-9_.-]+(\/[A-Za-z0-9_.-]+)*\.qml$/.test(reste);
}

export function nomDeFichier(chemin) {
  return chemin.substring(chemin.lastIndexOf('/') + 1);
}

// --------------------------------------------------------------------------- jugements

function nombreFr(v, decimales) {
  let s = v.toFixed(decimales);
  if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s.replace('.', ',');
}

// Position écrite avec l'ordre et le système explicites (règle de test du projet).
export function ecrirePosition(x, y, authid) {
  if (authid === 'EPSG:2154') {
    return 'EPSG:2154, X (est) = ' + x.toFixed(2).replace('.', ',') + ' m ; Y (nord) = ' + y.toFixed(2).replace('.', ',') + ' m';
  }
  if (authid === 'EPSG:4326' || authid === 'OGC:CRS84') {
    return authid + ', longitude = ' + nombreFr(x, 7) + ' ; latitude = ' + nombreFr(y, 7);
  }
  return (authid || 'système inconnu') + ', x = ' + nombreFr(x, 7) + ' ; y = ' + nombreFr(y, 7) + ' (sens des axes non interprété)';
}

// Question 6, ligne 1 : le point reprojeté est-il à 5 m de 1 051 113 ; 6 840 462 ?
// Une valeur absente, non numérique ou nulle (échec silencieux de QField) est un « non ».
export function jugerPoint(x, y) {
  if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) {
    return { conforme: false, ecartMetres: null, texte: 'valeur absente ou non numérique : non' };
  }
  // Piège des axes : X et Y échangés (X ≈ 6 840 462 ; Y ≈ 1 051 113) = non, et on le dit.
  const ecartInverse = Math.sqrt((x - POINT_ATTENDU_L93.y) * (x - POINT_ATTENDU_L93.y) + (y - POINT_ATTENDU_L93.x) * (y - POINT_ATTENDU_L93.x));
  if (ecartInverse <= TOLERANCE_METRES) {
    return { conforme: false, ecartMetres: null, texte: 'AXES INVERSÉS : X et Y sont échangés (X lu ≈ 6 840 462, Y lu ≈ 1 051 113) : non' };
  }
  const ecart = Math.sqrt((x - POINT_ATTENDU_L93.x) * (x - POINT_ATTENDU_L93.x) + (y - POINT_ATTENDU_L93.y) * (y - POINT_ATTENDU_L93.y));
  const conforme = ecart <= TOLERANCE_METRES;
  return { conforme: conforme, ecartMetres: ecart, texte: 'écart à 1 051 113 ; 6 840 462 : ' + nombreFr(ecart, 2) + ' m ; à ' + TOLERANCE_METRES + ' m près : ' + (conforme ? 'oui' : 'non') };
}

// Question 6, ligne 3 : tous les coins de l'emprise dans l'emprise de la spec § 4 ?
// Une emprise nulle (isNull vrai), vide, à 0, inversée (min > max) ou à valeurs non finies
// n'est pas vraisemblable. Le rectangle « vide » de QGIS >= 3.34 (QgsRectangle()) vaut
// xMin = yMin = +DBL_MAX et xMax = yMax = -DBL_MAX : min > max, et valeurs de l'ordre de 1e308,
// qui passeraient sinon les deux bornes de l'emprise (relecture 1, bloquant).
export function empriseVraisemblable(r) {
  if (!r) return false;
  if (r.isNull === true) return false;
  const v = [r.xMinimum, r.xMaximum, r.yMinimum, r.yMaximum];
  for (let i = 0; i < 4; i++) if (typeof v[i] !== 'number' || !isFinite(v[i]) || Math.abs(v[i]) >= 1e300) return false;
  if (r.xMinimum > r.xMaximum || r.yMinimum > r.yMaximum) return false;
  if (r.xMinimum === 0 && r.xMaximum === 0 && r.yMinimum === 0 && r.yMaximum === 0) return false;
  return r.xMinimum >= EMPRISE_L93.xmin && r.xMaximum <= EMPRISE_L93.xmax
    && r.yMinimum >= EMPRISE_L93.ymin && r.yMaximum <= EMPRISE_L93.ymax;
}

// Un GeoJSON sans membre crs est lu en WGS84 (RFC 7946) : GDAL/QGIS le nomme EPSG:4326 ou,
// selon la version, OGC:CRS84 (même système, longitude puis latitude). Les deux sont admis.
export function estWgs84(authid) {
  return authid === 'EPSG:4326' || authid === 'OGC:CRS84';
}

// Question 7, Sans_crs : verdict du contrôle de vraisemblance de la spec § 4, appliqué à
// l'emprise reprojetée vers 2154 (vide ou hors de la France métropolitaine : refus).
export function verdictSansCrs(authid, empriseReprojetee) {
  const ok = empriseVraisemblable(empriseReprojetee);
  return 'Verdict spec § 4 (couche lue en ' + (authid || 'système inconnu') + ') : '
    + (ok ? 'emprise reprojetée vraisemblable, couche chargée' : 'emprise reprojetée vide ou hors de la France métropolitaine, refus');
}

// --------------------------------------------------------------------------- registre (question 5)

export const CLE_REGISTRE = 'cerf-proto2/couches';

export function ecrireRegistre(liste) {
  return JSON.stringify(liste);
}

// Liste { chemin, nom } ; texte vide ou illisible : liste vide ; entrée incomplète ignorée.
export function lireRegistre(texte) {
  let v = null;
  try {
    v = JSON.parse(String(texte || ''));
  } catch (e) {
    return [];
  }
  if (!Array.isArray(v)) return [];
  const sortie = [];
  for (let i = 0; i < v.length; i++) {
    const e = v[i];
    if (e && typeof e.chemin === 'string' && typeof e.nom === 'string' && e.chemin !== '' && e.nom !== '') {
      sortie.push({ chemin: e.chemin, nom: e.nom });
    }
  }
  return sortie;
}

// Partie « fichier » d'une source de couche QGIS : avant le premier « | » (options OGR).
export function cheminDeSource(source) {
  const s = String(source || '');
  const i = s.indexOf('|');
  return i < 0 ? s : s.substring(0, i);
}

function nomDeTable(source) {
  const m = /\|layername=([^|]*)/.exec(String(source || ''));
  return m ? m[1] : '';
}

// Vrai si la source d'une couche du projet est celle du registre (même fichier ; même table si
// le registre en nomme une). Compte par la SOURCE (chemin), pas par une marque posée par le
// plugin : une marque survit mal à un enregistrement du projet (relecture 3).
export function memeSource(sourceCouche, cheminRegistre) {
  const a = cheminDeSource(sourceCouche);
  const b = cheminDeSource(cheminRegistre);
  if (a === '' || a !== b) return false;
  const t = nomDeTable(cheminRegistre);
  return t === '' || nomDeTable(sourceCouche) === t;
}

// Parmi le registre, les couches dont une source du projet correspond : { nombre, noms }.
export function compterParSource(registre, sourcesDuProjet) {
  const noms = [];
  for (let i = 0; i < registre.length; i++) {
    for (let k = 0; k < sourcesDuProjet.length; k++) {
      if (memeSource(sourcesDuProjet[k], registre[i].chemin)) { noms.push(registre[i].nom); break; }
    }
  }
  return { nombre: noms.length, noms: noms };
}

// --------------------------------------------------------------------------- affichage

export function dossierDe(chemin) {
  return chemin.substring(0, chemin.lastIndexOf('/'));
}

// Chemin complet d'un fichier reçu de getFile (relatif au préfixe, ou déjà absolu).
export function cheminRecu(prefixe, recu) {
  if (recu.charAt(0) === '/') return recu;
  return prefixe.replace(/\/*$/, '/') + recu;
}

export function texteMethode(entree) {
  return entree.methode === 0 ? 'stockée' : 'COMPRESSÉE (méthode ' + entree.methode + '), non extraite';
}

// Une ligne de la liste du bouton 0 : nom, méthode, taille, CRC32.
export function ligneEntree(entree) {
  return entree.nom + ' : ' + texteMethode(entree) + ', ' + entree.taille + ' octets, CRC32 ' + hex32(entree.crc32);
}

// Ce que QField a rendu d'une reprojection : sortie comparée à l'entrée. Sert aux lignes 5 à 7
// de la question 6 : QField ne lève pas d'exception sur un échec, il rend un objet vide.
export function classerSortie(entree, sortie) {
  const x = sortie ? sortie.x : undefined;
  const y = sortie ? sortie.y : undefined;
  if (typeof x !== 'number' || typeof y !== 'number') return 'non numérique (undefined ou autre) : ÉCHEC';
  if (!isFinite(x) || !isFinite(y)) return 'valeurs infinies ou NaN : ÉCHEC';
  if (x === 0 && y === 0) return 'vide (0 ; 0) : ÉCHEC silencieux';
  if (entree && x === entree.x && y === entree.y) return 'rendue SANS changement';
  return 'transformée';
}

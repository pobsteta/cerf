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

export const VERSION = '0.2.0';

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
  // Prototype n° 3 (mission 027) : couche réécrite par LayerUtils.saveVectorLayerAs.
  B0B: '0b. Préparer le zip compressé',
  B8: '8. Shapefile : réécrire, styler',
  B9: '9. GeoJSON : réécrire, styler',
  B9B: '9b. GeoJSON de 2 000 entités',
  B10: '10. GeoPackage à deux tables',
  B11: '11. Fichiers annexes',
  B12: '12. Tout enchaîner et chronométrer',
};

export const NOM_ZIP = 'essai-styles.zip';
// Prototype n° 3 : le zip ENTIÈREMENT compressé (méthode 8), lu en /vsizip/ par GDAL, jamais extrait.
export const NOM_ZIP_Z = 'essai-styles-z.zip';
export const NOM_GPKG2 = 'essai-gpkg2.gpkg';

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

// =========================================================================== prototype n° 3
// Mission 027 : une couche d'un zip COMPRESSÉ, ouverte en /vsizip/, réécrite par
// LayerUtils.saveVectorLayerAs dans <projet>/cerf-imports/q3-<N>/, son .qml écrit à côté par le
// plugin, puis chargée. Tout ce qui suit est pur (testé sous Node) ; les appels à QField sont
// dans Essai.qml.

export const CHAMP_ETIQUETTE = 'code_ug';

// Styles du manuel (spec § 5) : couleur du contour ET de l'étiquette, épaisseur, police.
export const STYLES = {
  ug: { rvb: [0, 0, 255], epaisseurMm: '0.6', policePt: 10 },
  parcelles: { rvb: [255, 140, 0], epaisseurMm: '1', policePt: 15 },
  frt: { rvb: [0, 139, 139], epaisseurMm: '0.6', policePt: 10 },
};

// .qml d'une couche polygone : contour seul (remplissage « no »), étiquette simple sur code_ug.
export function qmlStyle(s) {
  const c = `${s.rvb[0]},${s.rvb[1]},${s.rvb[2]},255`;
  const transparent = `${s.rvb[0]},${s.rvb[1]},${s.rvb[2]},0`;
  return `<!DOCTYPE qgis PUBLIC 'http://mrcc.com/qgis.dtd' 'SYSTEM'>
<qgis version="3.34.0-Prizren" styleCategories="Symbology|Labeling" labelsEnabled="1" hasScaleBasedVisibilityFlag="0" minScale="100000000" maxScale="0">
  <renderer-v2 type="singleSymbol" symbollevels="0" enableorderby="0" forceraster="0" referencescale="-1">
    <symbols>
      <symbol type="fill" name="0" alpha="1" force_rhr="0" clip_to_extent="1">
        <data_defined_properties>
          <Option type="Map">
            <Option type="QString" name="name" value=""/>
            <Option name="properties"/>
            <Option type="QString" name="type" value="collection"/>
          </Option>
        </data_defined_properties>
        <layer class="SimpleFill" enabled="1" locked="0" pass="0">
          <Option type="Map">
            <Option type="QString" name="border_width_map_unit_scale" value="3x:0,0,0,0,0,0"/>
            <Option type="QString" name="color" value="${transparent}"/>
            <Option type="QString" name="joinstyle" value="bevel"/>
            <Option type="QString" name="offset" value="0,0"/>
            <Option type="QString" name="offset_map_unit_scale" value="3x:0,0,0,0,0,0"/>
            <Option type="QString" name="offset_unit" value="MM"/>
            <Option type="QString" name="outline_color" value="${c}"/>
            <Option type="QString" name="outline_style" value="solid"/>
            <Option type="QString" name="outline_width" value="${s.epaisseurMm}"/>
            <Option type="QString" name="outline_width_unit" value="MM"/>
            <Option type="QString" name="style" value="no"/>
          </Option>
        </layer>
      </symbol>
    </symbols>
    <rotation/>
    <sizescale/>
  </renderer-v2>
  <labeling type="simple">
    <settings calloutType="simple">
      <text-style fieldName="${CHAMP_ETIQUETTE}" isExpression="0" fontSize="${s.policePt}" fontSizeUnit="Point" textColor="${c}" textOpacity="1" fontWeight="50" fontItalic="0" fontUnderline="0" fontStrikeout="0" fontLetterSpacing="0" fontWordSpacing="0" blendMode="0" multilineHeight="1" previewBkgrdColor="255,255,255,255" namedStyle="Regular">
        <families/>
        <text-buffer bufferDraw="0" bufferSize="1" bufferSizeUnits="MM" bufferColor="255,255,255,255" bufferOpacity="1" bufferBlendMode="0" bufferJoinStyle="128" bufferNoFill="1"/>
        <background shapeDraw="0"/>
        <shadow shadowDraw="0"/>
      </text-style>
      <placement placement="1" placementFlags="10" polygonPlacementFlags="2" dist="0" distUnits="MM" priority="5" overlapHandling="PreventOverlap"/>
      <rendering scaleVisibility="0" scaleMin="0" scaleMax="0" fontMinPixelSize="3" fontMaxPixelSize="10000" fontLimitPixelSize="0" obstacle="1" obstacleFactor="1" obstacleType="1" labelPerPart="0" upsidedownLabels="0" limitNumLabels="0" maxNumLabels="2000" displayAll="1" mergeLines="0" minFeatureSize="0" zIndex="0"/>
    </settings>
  </labeling>
  <layerGeometryType>2</layerGeometryType>
</qgis>
`;
}

// --------------------------------------------------------------------------- UTF-8

// Octets UTF-8 d'un texte (le moteur de QML n'a pas TextEncoder) : pour écrire un .qml par
// FileUtils.writeFileContent.
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

// --------------------------------------------------------------------------- gardes de chemin

// Le reste du chemin sous <projet>/cerf-imports/, ou null si le chemin n'y est pas, est relatif,
// contient « .. », « // » ou un antislash. Ne se fie à aucun argument.
function resteSousImports(chemin, dossierProjet) {
  if (typeof chemin !== 'string' || typeof dossierProjet !== 'string') return null;
  if (dossierProjet.charAt(0) !== '/' || sansBarreFinale(dossierProjet) === '/') return null;
  if (chemin.charAt(0) !== '/' || chemin.indexOf('..') >= 0 || chemin.indexOf('//') >= 0 || chemin.indexOf('\\') >= 0) return null;
  const base = dossierImports(dossierProjet);
  if (chemin.indexOf(base) !== 0) return null;
  return chemin.substring(base.length);
}

// Garde avant LayerUtils.saveVectorLayerAs (qui crée les dossiers et écrase sans aucun contrôle
// de chemin) et avant FileUtils.writeFileContent : seul un .gpkg ou un .qml directement dans
// <projet>/cerf-imports/q3-<N>/ peut être écrit.
export function peutEcrireQ3(chemin, dossierProjet) {
  const reste = resteSousImports(chemin, dossierProjet);
  return reste !== null && /^q3-[0-9]+\/[A-Za-z0-9_-]+\.(gpkg|qml)$/.test(reste);
}

export const SUFFIXES_ANNEXES = ['.gpkg', '.gpkg-wal', '.gpkg-shm', '.qml', '.aux.xml', '.gpkg.aux.xml'];

// Garde avant platformUtilities.rmFile (ADR 0007, sans aucun contrôle de chemin) : seuls le .gpkg,
// ses annexes SQLite (-wal, -shm), le .qml et les .aux.xml, DANS <projet>/cerf-imports/q3-<N>/.
// Jamais le zip copié, jamais un autre dossier.
export function peutEffacerQ3(chemin, dossierProjet) {
  const reste = resteSousImports(chemin, dossierProjet);
  return reste !== null && /^q3-[0-9]+\/[A-Za-z0-9_-]+(\.gpkg|\.gpkg-wal|\.gpkg-shm|\.qml|\.aux\.xml|\.gpkg\.aux\.xml)$/.test(reste);
}

// Dossier neuf q3-<N>/ : premier N >= depart dont le dossier n'existe pas (existe : chemin sans
// barre finale -> booléen). Rend { n, chemin } avec une barre finale. Rien n'est jamais écrasé.
export function prochainDossierQ3(dossierProjet, depart, existe) {
  const base = dossierImports(dossierProjet);
  const debut = Math.max(1, Math.floor(depart));
  for (let n = debut; n < debut + 1000; n++) {
    if (!existe(base + 'q3-' + n)) return { n: n, chemin: base + 'q3-' + n + '/' };
  }
  throw new Error('1000 dossiers q3-<N> déjà présents : en effacer dans cerf-imports/');
}

// Chemins attendus pour un jeu de couches écrites : .gpkg, annexes SQLite et GDAL, .qml.
export function cheminsAttendus(dossierQ3, bases) {
  const sortie = [];
  for (let i = 0; i < bases.length; i++) for (let k = 0; k < SUFFIXES_ANNEXES.length; k++) sortie.push(dossierQ3 + bases[i] + SUFFIXES_ANNEXES[k]);
  return sortie;
}

// --------------------------------------------------------------------------- les cas d'essai

// Un cas = une couche du zip compressé réécrite. « table » : nom de la table d'un GeoPackage
// (le zip contient un .gpkg à deux tables : un appel par table).
export const CAS = {
  shp: { cle: 'shp', entree: 'FRT_q7.shp', table: '', base: 'FRT_q7', style: 'frt', entites: 2, authid: 'EPSG:2154', champAccents: 'nom', accents: ['Étang', 'Forêt'] },
  geojson: { cle: 'geojson', entree: 'UG_q1.geojson', table: '', base: 'UG_q1', style: 'ug', entites: 2, authid: 'EPSG:2154', champAccents: '', accents: [] },
  parcelles: { cle: 'parcelles', entree: NOM_GPKG2, table: 'Parcelles', base: 'Parcelles', style: 'parcelles', entites: 2, authid: 'EPSG:2154', champAccents: '', accents: [] },
  zones: { cle: 'zones', entree: NOM_GPKG2, table: 'Zones', base: 'Zones', style: 'ug', entites: 2, authid: 'EPSG:2154', champAccents: '', accents: [] },
  grand: { cle: 'grand', entree: 'ProdBois_2000.geojson', table: '', base: 'ProdBois_2000', style: '', entites: 2000, authid: 'EPSG:2154', champAccents: '', accents: [] },
};

// Source GDAL du cas, dans le zip compressé copié (/vsizip/, jamais extrait).
export function sourceDuCas(cas, zip) {
  const v = cheminVsizip(zip, cas.entree);
  return cas.table === '' ? v : uriGpkg(v, cas.table);
}

// --------------------------------------------------------------------------- jugement de la copie

// Les accents attendus sont-ils tous lus dans les valeurs du champ ? null si le cas n'en attend pas.
export function accentsLus(attendus, valeurs) {
  if (!attendus || attendus.length === 0) return null;
  if (!valeurs) return false;
  for (let i = 0; i < attendus.length; i++) if (valeurs.indexOf(attendus[i]) < 0) return false;
  return true;
}

// mesure : { sourceValide, cheminRendu, copieValide, octets, entites, authid, accents (true/false/null) }.
// Rend { ok, ecrit, texte } ; texte commence par « ÉCHEC » si la copie n'est pas conforme, et dit
// pourquoi (un échec muet de saveVectorLayerAs ne reste jamais muet).
export function jugerCopie(cas, mesure) {
  if (!mesure.sourceValide) {
    return { ok: false, ecrit: false, texte: 'ÉCHEC, essai raté : la source ne charge pas (isValid faux), rien n\'a été écrit' };
  }
  if (typeof mesure.cheminRendu !== 'string' || mesure.cheminRendu === '') {
    return { ok: false, ecrit: false, texte: 'ÉCHEC MUET : saveVectorLayerAs a rendu une chaîne vide (la raison n\'est que dans le journal de QField)' };
  }
  const ecrit = mesure.octets > 0 && mesure.copieValide === true;
  const acc = mesure.accents === null || mesure.accents === undefined ? 'sans objet' : (mesure.accents ? 'oui' : 'NON');
  const texte = 'écrit : ' + (ecrit ? 'oui' : 'NON') + ', ' + mesure.octets + ' octets, ' + mesure.entites + ' entités, '
    + (mesure.authid || 'système vide') + ', accents lus : ' + acc;
  const conforme = ecrit && mesure.entites === cas.entites && mesure.authid === cas.authid && acc !== 'NON';
  return { ok: conforme, ecrit: ecrit, texte: (conforme ? '' : 'ÉCHEC (non conforme à ' + cas.entites + ' entités, ' + cas.authid + ') : ') + texte };
}

// --------------------------------------------------------------------------- durées

export function texteDuree(ms) {
  if (typeof ms !== 'number' || !isFinite(ms) || ms < 0) return 'durée illisible';
  return nombreFr(ms / 1000, 2) + ' s (' + Math.round(ms) + ' ms)';
}

// Médiane d'une liste de durées (la règle du brief : médiane de 3 essais).
export function medianeMs(liste) {
  if (!liste || liste.length === 0) return null;
  const t = liste.slice().sort(function (a, b) { return a - b; });
  const m = Math.floor(t.length / 2);
  return t.length % 2 === 1 ? t[m] : (t[m - 1] + t[m]) / 2;
}

export const LIMITE_MS = 120000;

// Lignes du bilan du bouton 12 : les totaux déjà relevés, et la médiane quand il y en a trois.
export function bilanChrono(totaux) {
  const lignes = ['Totaux relevés depuis le démarrage du plugin : ' + totaux.map(texteDuree).join(' ; ')];
  if (totaux.length >= 3) {
    const dernier = totaux.slice(totaux.length - 3);
    const m = medianeMs(dernier);
    lignes.push('Médiane des trois derniers : ' + texteDuree(m) + ' ; limite du brief 2 min : ' + (m <= LIMITE_MS ? 'tenue' : 'NON tenue'));
  } else {
    lignes.push('Encore ' + (3 - totaux.length) + ' appui(s) pour la médiane de trois.');
  }
  return lignes;
}

// Résultat de la sonde d'un fichier : taille en octets, ou « absent ».
export function ligneSonde(chemin, octets, existe) {
  return nomDeFichier(chemin) + ' : ' + ((octets > 0 || existe) ? (octets + ' octets') : 'absent');
}

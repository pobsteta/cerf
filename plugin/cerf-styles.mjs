// SPDX-License-Identifier: GPL-3.0-or-later
// Cerf, plugin QField d'application : les styles du manuel (mission 010, spec § 5).
// Écrit pour Cerf (ADR 0006). Module ECMAScript pur, sans import, comme cerf-logique.mjs :
// chargé à la fois par QML (Cerf.qml) et par Node (tests/styles.test.mjs, tests/plugin.test.mjs).
// Prudence de syntaxe pour le moteur JavaScript de QML : ni chaînage optionnel, ni coalescence
// des nuls, ni séparateur de chiffres, ni TextDecoder.
//
// Ici, rien ne touche QGIS ni QField : on décide quelle règle s'applique et on décrit le
// style en données ; c'est Cerf.qml qui le pose sur la couche (plugin/PLAN.md).
// Couleurs et tailles de police : celles du mail de JFC (spec § 5), à respecter telles quelles.
// Champs de code : provisoires (CODE_UG, CODE_PARC, CODE_FRT), à lire dans les fichiers de JFC.

export const CHAMPS_CODE = { UG: 'CODE_UG', Parcelles: 'CODE_PARC', FRT: 'CODE_FRT' };

export const AVERTISSEMENT_PAS_UN_POLYGONE = 'nom reconnu mais pas un polygone';
export const AVERTISSEMENT_QML_ILLISIBLE = '.qml illisible, style du manuel appliqué';

// Champ de code provisoire de la règle, ou null (ProdBois, pas de règle).
export function champCodeDe(regle) {
  return Object.prototype.hasOwnProperty.call(CHAMPS_CODE, regle) ? CHAMPS_CODE[regle] : null;
}

const MOTIFS = [
  { regle: 'UG', motif: /^ug([_\- ].*)?$/ },
  { regle: 'Parcelles', motif: /^parcelles?([_\- ].*)?$/ },
  { regle: 'FRT', motif: /^frt([_\- ].*)?$/ },
];

const ACCENTS = {
  'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'ç': 'c',
  'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e', 'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
  'ñ': 'n', 'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
  'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u', 'ý': 'y', 'ÿ': 'y',
};

// Minuscules et sans accents (table écrite à la main : pas de normalize() dans le moteur de Qt).
export function sansCasseNiAccents(texte) {
  const s = String(texte === null || texte === undefined ? '' : texte).toLowerCase();
  let r = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charAt(i);
    r += Object.prototype.hasOwnProperty.call(ACCENTS, c) ? ACCENTS[c] : c;
  }
  return r;
}

function regleDuNom(nom) {
  const n = sansCasseNiAccents(nom);
  for (let i = 0; i < MOTIFS.length; i++) if (MOTIFS[i].motif.test(n)) return MOTIFS[i].regle;
  return null;
}

// Nom réel du champ qui correspond à `attendu` (casse et accents ignorés), ou null.
export function champReel(champs, attendu) {
  if (!champs || typeof champs.length !== 'number') return null;
  for (let i = 0; i < champs.length; i++) {
    if (sansCasseNiAccents(champs[i]) === attendu) return String(champs[i]);
  }
  return null;
}

function qmlLisible(qml) {
  return typeof qml === 'string' && qml.replace(/^\uFEFF/, '').replace(/\s+/g, '') !== '';
}

// Type géométrique de QGIS (Qgis.GeometryType : 0 point, 1 ligne, 2 polygone) vers le contrat.
export function geometrieDe(typeQgis) {
  if (typeQgis === 0 || typeQgis === 'point' || typeQgis === 'Point') return 'point';
  if (typeQgis === 1 || typeQgis === 'ligne' || typeQgis === 'Line') return 'ligne';
  if (typeQgis === 2 || typeQgis === 'polygone' || typeQgis === 'Polygon') return 'polygone';
  return null;
}

// Quelle règle pour cette couche ? Ordre de la spec § 5 : .qml, nom, champs, défaut.
// `avertissement` : la phrase seule, l'appelant ajoute « <nom avec extension> : » (spec § 4).
export function reconnaitre(couche) {
  const c = couche || {};
  let avertissement = null;
  if (c.qml !== null && c.qml !== undefined) {
    if (qmlLisible(c.qml)) return { regle: null, source: 'qml', avertissement: null };
    avertissement = AVERTISSEMENT_QML_ILLISIBLE;
  }
  const geometrie = c.geometrie;
  const parNom = regleDuNom(c.nom);
  if (geometrie === 'point' && champReel(c.champs, 'essence') !== null && champReel(c.champs, 'diametre') !== null) {
    return { regle: 'ProdBois', source: 'champs', avertissement };
  }
  if (parNom !== null) {
    if (geometrie === 'polygone') return { regle: parNom, source: 'nom', avertissement };
    const phrase = AVERTISSEMENT_PAS_UN_POLYGONE;
    return { regle: null, source: 'defaut', avertissement: avertissement === null ? phrase : avertissement + ' ; ' + phrase };
  }
  return { regle: null, source: 'defaut', avertissement };
}

function contour(couleur, epaisseur) {
  return { type: 'contour', couleur, epaisseur_mm: epaisseur, opacite_pct: 100, remplissage: false };
}

// Le style en données, ou null (pas de règle). Aucune autre clé que celles du contrat.
export function styleDe(regle, options) {
  const o = options || {};
  const code = (defaut) => (typeof o.champCode === 'string' && o.champCode !== '' ? o.champCode : defaut);
  if (regle === 'UG') {
    return {
      symbole: contour('#0000FF', 0.6),
      etiquette: { champ: code(CHAMPS_CODE.UG), taille_pt: 10, couleur: '#0000FF' },
    };
  }
  if (regle === 'Parcelles') {
    return {
      symbole: contour('#FF8C00', 1),
      etiquette: { champ: code(CHAMPS_CODE.Parcelles), taille_pt: 15, couleur: '#FF8C00' },
    };
  }
  if (regle === 'FRT') {
    return {
      symbole: contour('#008B8B', 0.6),
      etiquette: { champ: code(CHAMPS_CODE.FRT), taille_pt: 10, couleur: '#008B8B' },
    };
  }
  if (regle === 'ProdBois') {
    const essence = typeof o.champEssence === 'string' && o.champEssence !== '' ? o.champEssence : 'essence';
    const diametre = typeof o.champDiametre === 'string' && o.champDiametre !== '' ? o.champDiametre : 'diametre';
    return {
      symbole: { type: 'cercle', couleur: '#000000', taille_mm: 2, remplissage: true },
      etiquette: {
        expression: '"' + essence + '" || \'\\n\' || "' + diametre + '"',
        taille_pt: 8,
        couleur: '#000000',
        lisere: { couleur: '#FFFFFF' },
      },
    };
  }
  return null;
}

// `.qml` de même dossier et même nom que la couche, parmi les chemins du zip (extensions sans
// tenir compte de la casse) ; null s'il n'y en a pas. Pour une table de GeoPackage, on passe
// le chemin « dossier/<table>.gpkg » : le .qml porte le nom de la table (spec § 5), voir
// trouverQmlDeTable.
export function trouverQml(cheminCouche, cheminsDuZip) {
  const chemin = String(cheminCouche);
  const point = chemin.lastIndexOf('.');
  const barre = chemin.lastIndexOf('/');
  const base = point > barre ? chemin.substring(0, point) : chemin;
  return chercherQml(base + '.qml', cheminsDuZip);
}

export function trouverQmlDeTable(cheminGpkg, table, cheminsDuZip) {
  const chemin = String(cheminGpkg);
  return chercherQml(chemin.substring(0, chemin.lastIndexOf('/') + 1) + String(table) + '.qml', cheminsDuZip);
}

function chercherQml(voulu, cheminsDuZip) {
  const liste = cheminsDuZip || [];
  const v = voulu.toLowerCase();
  for (let i = 0; i < liste.length; i++) {
    if (String(liste[i]).toLowerCase() === v) return String(liste[i]);
  }
  return null;
}

// Est-ce du GeoJSON ? (spec § 3.1 : un .json qui n'en est pas est ignoré en silence.)
// Un objet JSON dont « type » est un type GeoJSON (RFC 7946) ; BOM toléré.
const TYPES_GEOJSON = ['FeatureCollection', 'Feature', 'Point', 'MultiPoint', 'LineString', 'MultiLineString',
  'Polygon', 'MultiPolygon', 'GeometryCollection'];
export function estGeoJson(texte) {
  if (typeof texte !== 'string') return false;
  let t = texte;
  if (t.charCodeAt(0) === 0xFEFF) t = t.substring(1);
  let o;
  try { o = JSON.parse(t); } catch (e) { return false; }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return false;
  return TYPES_GEOJSON.indexOf(o.type) >= 0;
}

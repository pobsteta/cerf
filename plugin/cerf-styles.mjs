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

// --------------------------------------------------------------------------- .qml (ADR 0008)
// Depuis l'ADR 0008, la pose du style passe par un .qml écrit à côté de la copie de la couche,
// avant son chargement : QGIS le lit seul au chargement. Ces deux fonctions sont pures.

// Un .qml du zip n'est écrit que s'il a l'air d'un style QGIS : du XML dont la racine est <qgis>
// et qui contient un <renderer-v2 (QGIS charge en silence un .qml quelconque : on filtre ici).
// Contrôle volontairement léger (pas d'analyseur XML dans le moteur de QML).
export function qmlValide(texte) {
  if (typeof texte !== 'string') return false;
  const t = texte.replace(/^﻿/, '');
  const sansProlog = t.replace(/^\s*(<\?xml[^>]*\?>\s*)?(<!DOCTYPE[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*/, '');
  if (!/^<qgis[\s>]/.test(sansProlog)) return false;
  if (!/<renderer-v2[\s>/]/.test(sansProlog)) return false;
  return /<\/qgis>\s*$/.test(sansProlog);
}

function echapper(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function rvba(hex, opacitePct) {
  const h = String(hex).replace('#', '');
  const alpha = Math.round((opacitePct === undefined ? 100 : opacitePct) * 255 / 100);
  return parseInt(h.substring(0, 2), 16) + ',' + parseInt(h.substring(2, 4), 16) + ',' + parseInt(h.substring(4, 6), 16) + ',' + alpha;
}

const PROPRIETES_VIDES = `<data_defined_properties>
          <Option type="Map">
            <Option type="QString" name="name" value=""/>
            <Option name="properties"/>
            <Option type="QString" name="type" value="collection"/>
          </Option>
        </data_defined_properties>`;

function symboleQml(s) {
  if (s.type === 'cercle') {
    const c = rvba(s.couleur, 100);
    return `<symbol type="marker" name="0" alpha="1" force_rhr="0" clip_to_extent="1">
        ${PROPRIETES_VIDES}
        <layer class="SimpleMarker" enabled="1" locked="0" pass="0">
          <Option type="Map">
            <Option type="QString" name="angle" value="0"/>
            <Option type="QString" name="color" value="${c}"/>
            <Option type="QString" name="name" value="circle"/>
            <Option type="QString" name="offset" value="0,0"/>
            <Option type="QString" name="outline_color" value="${c}"/>
            <Option type="QString" name="outline_style" value="solid"/>
            <Option type="QString" name="outline_width" value="0"/>
            <Option type="QString" name="outline_width_unit" value="MM"/>
            <Option type="QString" name="size" value="${s.taille_mm}"/>
            <Option type="QString" name="size_unit" value="MM"/>
          </Option>
        </layer>
      </symbol>`;
  }
  const trait = rvba(s.couleur, s.opacite_pct);
  const fond = rvba(s.couleur, 0);
  return `<symbol type="fill" name="0" alpha="1" force_rhr="0" clip_to_extent="1">
        ${PROPRIETES_VIDES}
        <layer class="SimpleFill" enabled="1" locked="0" pass="0">
          <Option type="Map">
            <Option type="QString" name="border_width_map_unit_scale" value="3x:0,0,0,0,0,0"/>
            <Option type="QString" name="color" value="${s.remplissage ? trait : fond}"/>
            <Option type="QString" name="joinstyle" value="bevel"/>
            <Option type="QString" name="offset" value="0,0"/>
            <Option type="QString" name="offset_unit" value="MM"/>
            <Option type="QString" name="outline_color" value="${trait}"/>
            <Option type="QString" name="outline_style" value="solid"/>
            <Option type="QString" name="outline_width" value="${s.epaisseur_mm}"/>
            <Option type="QString" name="outline_width_unit" value="MM"/>
            <Option type="QString" name="style" value="${s.remplissage ? 'solid' : 'no'}"/>
          </Option>
        </layer>
      </symbol>`;
}

// Le .qml (texte) d'un style de `styleDe`, pour une couche de géométrie 'polygone' ou 'point'.
// `null` si le style est nul ou la géométrie non prise en charge. L'épaisseur du liseré (1 mm) et
// la police (celle de QField par défaut) ne sont pas dans l'objet de style (spec § 5).
export function qmlDe(style, geometrie) {
  if (!style || !style.symbole || !style.etiquette) return null;
  if (geometrie !== 'polygone' && geometrie !== 'point') return null;
  const e = style.etiquette;
  const expression = typeof e.expression === 'string' && e.expression !== '';
  const champ = echapper(expression ? e.expression : e.champ);
  const couleur = rvba(e.couleur, 100);
  const lisere = e.lisere
    ? `<text-buffer bufferDraw="1" bufferSize="1" bufferSizeUnits="MM" bufferColor="${rvba(e.lisere.couleur, 100)}" bufferOpacity="1" bufferBlendMode="0" bufferJoinStyle="128" bufferNoFill="1"/>`
    : '<text-buffer bufferDraw="0" bufferSize="1" bufferSizeUnits="MM" bufferColor="255,255,255,255" bufferOpacity="1" bufferBlendMode="0" bufferJoinStyle="128" bufferNoFill="1"/>';
  const placement = geometrie === 'polygone'
    ? '<placement placement="1" placementFlags="10" polygonPlacementFlags="2" dist="0" distUnits="MM" priority="5" overlapHandling="PreventOverlap"/>'
    : '<placement placement="0" placementFlags="10" dist="0" distUnits="MM" priority="5" overlapHandling="PreventOverlap"/>';
  return `<!DOCTYPE qgis PUBLIC 'http://mrcc.com/qgis.dtd' 'SYSTEM'>
<qgis version="3.34.0-Prizren" styleCategories="Symbology|Labeling" labelsEnabled="1" hasScaleBasedVisibilityFlag="0" minScale="100000000" maxScale="0">
  <renderer-v2 type="singleSymbol" symbollevels="0" enableorderby="0" forceraster="0" referencescale="-1">
    <symbols>
      ${symboleQml(style.symbole)}
    </symbols>
    <rotation/>
    <sizescale/>
  </renderer-v2>
  <labeling type="simple">
    <settings calloutType="simple">
      <text-style fieldName="${champ}" isExpression="${expression ? 1 : 0}" fontSize="${e.taille_pt}" fontSizeUnit="Point" textColor="${couleur}" textOpacity="1" fontWeight="50" fontItalic="0" fontUnderline="0" fontStrikeout="0" fontLetterSpacing="0" fontWordSpacing="0" blendMode="0" multilineHeight="1" previewBkgrdColor="255,255,255,255" namedStyle="Regular">
        <families/>
        ${lisere}
        <background shapeDraw="0"/>
        <shadow shadowDraw="0"/>
      </text-style>
      ${placement}
      <rendering scaleVisibility="0" scaleMin="0" scaleMax="0" fontMinPixelSize="3" fontMaxPixelSize="10000" fontLimitPixelSize="0" obstacle="1" obstacleFactor="1" obstacleType="1" labelPerPart="0" upsidedownLabels="0" limitNumLabels="0" maxNumLabels="2000" displayAll="1" mergeLines="0" minFeatureSize="0" zIndex="0"/>
    </settings>
  </labeling>
  <layerGeometryType>${geometrie === 'polygone' ? 2 : 0}</layerGeometryType>
</qgis>
`;
}

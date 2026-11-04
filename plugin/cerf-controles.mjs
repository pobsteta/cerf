// SPDX-License-Identifier: GPL-3.0-or-later
// Cerf, plugin QField d'application (mission 012) : les cinq contrôles à l'import (spec § 4,
// ADR 0004), dans leur ordre. JavaScript pur, sans import de QField, sans réseau (ADR 0005) :
// testable sous Node. Écrit pour Cerf.
//
// Le premier contrôle qui échoue arrête la couche. Toute exception vaut refus.

// Emprise de vraisemblance, EPSG:2154 (x = Est, y = Nord, en mètres) : terre ferme de France
// métropolitaine, Corse comprise, élargie de 10 km. Copie de `elargie` dans
// docs/referentiels/emprise-metropole.json (mission 002, PROJ 9.8.1) ; un test compare les deux.
// Limite acceptée (ADR 0004) : Jersey et Genève sont dans le rectangle.
export const EMPRISE_VRAISEMBLANCE = { xmin: 89101, xmax: 1252436, ymin: 6036555, ymax: 7120480 };

export const MESSAGE_INCOHERENT = 'Coordonnées incohérentes : système mal déclaré ?';

function refus(nom, controle, texte, avertissements) {
  return { charge: false, controle, message: nom + ' : ' + texte, avertissements: avertissements || [] };
}

function basename(chemin) {
  const s = String(chemin);
  return s.substring(Math.max(s.lastIndexOf('/'), s.lastIndexOf('\\')) + 1);
}

// Vrai si `fichiers` contient « <racine><extension> » (casse libre) : la racine est celle de
// la couche ; un fichier d'une autre couche ne compte pas.
function aLeFichier(fichiers, racine, extension) {
  const voulu = (racine + extension).toLowerCase();
  for (let i = 0; i < fichiers.length; i++) {
    if (basename(fichiers[i]).toLowerCase() === voulu) return true;
  }
  return false;
}

function fini(v) {
  return typeof v === 'number' && isFinite(v);
}

// Contenue : bornes incluses ; toute valeur absente ou non finie, ou emprise inversée, refuse.
function contenue(e) {
  if (!e || typeof e !== 'object') return false;
  if (!fini(e.xmin) || !fini(e.ymin) || !fini(e.xmax) || !fini(e.ymax)) return false;
  if (e.xmin > e.xmax || e.ymin > e.ymax) return false;
  const r = EMPRISE_VRAISEMBLANCE;
  return e.xmin >= r.xmin && e.xmax <= r.xmax && e.ymin >= r.ymin && e.ymax <= r.ymax;
}

function controler(couche, services) {
  const nom = String(couche.nom);
  const avertissements = [];
  const fichiers = Array.isArray(couche.fichiers) ? couche.fichiers : [];

  // 1. Shapefile incomplet (ordre : .prj, .shx, .dbf ; .cpg seulement un avertissement).
  if (couche.format === 'shp') {
    const base = basename(nom);
    const racine = base.replace(/\.[^.]*$/, '');
    if (!aLeFichier(fichiers, racine, '.prj')) {
      return refus(nom, 1, 'fichier .prj manquant, système de coordonnées inconnu');
    }
    if (!aLeFichier(fichiers, racine, '.shx')) return refus(nom, 1, 'fichier .shx manquant, couche non chargée');
    if (!aLeFichier(fichiers, racine, '.dbf')) return refus(nom, 1, 'fichier .dbf manquant, couche non chargée');
    if (!aLeFichier(fichiers, racine, '.cpg')) avertissements.push(nom + ' : accents peut-être mal lus');
  }
  // 2. Lecture.
  if (couche.lisible !== true) return refus(nom, 2, 'illisible');
  // 3. Système invalide.
  if (!couche.systeme || couche.systeme.valide !== true) return refus(nom, 3, 'système de coordonnées inconnu');
  // 4. Couche vide : avertissement, chargée, sans contrôle d'emprise (un raster n'est jamais vide).
  if (couche.format !== 'tif' && couche.nbEntites === 0) {
    avertissements.push(nom + ' : couche vide');
    return { charge: true, controle: null, message: null, avertissements };
  }
  // 5. Vraisemblance : emprise reprojetée en EPSG:2154, contenue dans le rectangle.
  // reprojeter est appelé même en EPSG:2154 ; toute erreur vaut refus.
  let reprojetee = null;
  try {
    if (!services || typeof services.reprojeter !== 'function') throw new Error('service de reprojection absent');
    reprojetee = services.reprojeter(couche.emprise, couche.systeme.epsg, couche.systeme.crs);
  } catch (e) {
    reprojetee = null;
  }
  if (!contenue(reprojetee)) return refus(nom, 5, MESSAGE_INCOHERENT);
  return { charge: true, controle: null, message: null, avertissements };
}

export function controlerCouche(couche, services) {
  try {
    if (!couche || typeof couche !== 'object') throw new Error('couche absente');
    return controler(couche, services);
  } catch (e) {
    const nom = couche && couche.nom ? String(couche.nom) : 'couche';
    return refus(nom, 2, 'illisible');
  }
}

// ------------------------------------------------------------------ reprojection d'une emprise

// Nombre de segments par bord de l'emprise avant reprojection (21 points par bord, coins compris).
export const SEGMENTS_PAR_BORD = 20;

// Rectangle en EPSG:2154 d'une emprise `emprise` ({ xmin, ymin, xmax, ymax }, x = Est ou lon,
// y = Nord ou lat, dans le système `epsg`), les bords densifiés DANS le système de la couche
// puis chaque point reprojeté par `reprojeterPoint(x, y, epsg, crs) -> { x, y }` (`crs` : l'objet système de la couche, rendu tel quel) (fourni par QField).
// Lève une exception si l'emprise est absente ou non finie, ou si un point revient non fini.
export function reprojeterEmprise(emprise, epsg, reprojeterPoint, crs) {
  if (!emprise || !fini(emprise.xmin) || !fini(emprise.ymin) || !fini(emprise.xmax) || !fini(emprise.ymax)) {
    throw new Error('emprise absente ou non finie');
  }
  if (typeof reprojeterPoint !== 'function') throw new Error('reprojection de point absente');
  const n = SEGMENTS_PAR_BORD;
  let xmin = Infinity; let ymin = Infinity; let xmax = -Infinity; let ymax = -Infinity;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      if (i !== 0 && i !== n && j !== 0 && j !== n) continue; // bords seulement
      const x = emprise.xmin + (emprise.xmax - emprise.xmin) * i / n;
      const y = emprise.ymin + (emprise.ymax - emprise.ymin) * j / n;
      const p = reprojeterPoint(x, y, epsg, crs);
      // Point vide (QgsPoint() rendu par QField sur échec) : refus, même si x et y existaient.
      if (!p || p.isEmpty === true || (typeof p.isEmpty === 'function' && p.isEmpty()) || p.isNull === true ||
        (typeof p.isNull === 'function' && p.isNull()) || !fini(p.x) || !fini(p.y)) throw new Error('reprojection : valeur non finie');
      if (p.x < xmin) xmin = p.x;
      if (p.x > xmax) xmax = p.x;
      if (p.y < ymin) ymin = p.y;
      if (p.y > ymax) ymax = p.y;
    }
  }
  return { xmin, ymin, xmax, ymax };
}

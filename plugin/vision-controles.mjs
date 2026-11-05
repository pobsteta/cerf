// SPDX-License-Identifier: GPL-3.0-or-later
// Vision, plugin QField d'application (mission 012) : les cinq contrôles à l'import (spec § 4,
// ADR 0004), dans leur ordre. JavaScript pur, sans import de QField, sans réseau (ADR 0005) :
// testable sous Node. Écrit pour Vision.
//
// Le premier contrôle qui échoue arrête la couche. Toute exception vaut refus.

// Emprise de vraisemblance, EPSG:2154 (x = Est, y = Nord, en mètres) : terre ferme de France
// métropolitaine, Corse comprise, élargie de 10 km. Copie de `elargie` dans
// docs/referentiels/emprise-metropole.json (mission 002, PROJ 9.8.1) ; un test compare les deux.
// Limite acceptée (ADR 0004) : Jersey et Genève sont dans le rectangle.
export const EMPRISE_VRAISEMBLANCE = { xmin: 89101, xmax: 1252436, ymin: 6036555, ymax: 7120480 };

export const MESSAGE_INCOHERENT = 'Coordonnées incohérentes : système mal déclaré ?';

// `detail` (mission 037) : une ligne de diagnostic, remise à `services.detail` (si présent), jamais dans le verdict
// (sa forme est figée : avertissements, charge, controle, message) ni dans le texte de la spec § 4.
function refus(nom, controle, texte, avertissements, detail, services) {
  if (detail && services && typeof services.detail === 'function') {
    try { services.detail(detail); } catch (e) { /* le diagnostic ne doit jamais changer le verdict */ }
  }
  return { charge: false, controle, message: nom + ' : ' + texte, avertissements: avertissements || [] };
}

// Nombre court pour la ligne de détail : 3 décimales sous 1000 (degrés), entier au-delà (mètres).
function nombre(v) {
  if (typeof v !== 'number' || !isFinite(v)) return String(v);
  return Math.abs(v) < 1000 ? v.toFixed(3) : String(Math.round(v));
}

// « xmin ymin xmax ymax » d'une emprise, tel quel (NaN, undefined restent visibles) ; « absente » si pas d'objet.
export function texteEmprise(e) {
  if (!e || typeof e !== 'object') return 'absente';
  return nombre(e.xmin) + ' ' + nombre(e.ymin) + ' ' + nombre(e.xmax) + ' ' + nombre(e.ymax);
}

function texteAuthid(systeme) {
  const a = systeme && typeof systeme.authid === 'string' ? systeme.authid.trim() : '';
  return a === '' ? '(authid vide)' : a;
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
  if (!couche.systeme || couche.systeme.valide !== true) {
    return refus(nom, 3, 'système de coordonnées inconnu', undefined, 'système lu : ' + texteAuthid(couche.systeme), services);
  }
  // 4. Couche vide : avertissement, chargée, sans contrôle d'emprise (un raster n'est jamais vide).
  if (couche.format !== 'tif' && couche.nbEntites === 0) {
    avertissements.push(nom + ' : couche vide');
    return { charge: true, controle: null, message: null, avertissements };
  }
  // 5. Vraisemblance : emprise reprojetée en EPSG:2154, contenue dans le rectangle.
  // reprojeter est appelé même en EPSG:2154 ; toute erreur vaut refus.
  // Le 4e argument est l'authid lu : le service reconstruit le système source par son nom (mission 037).
  let reprojetee = null;
  let erreur = '';
  try {
    if (!services || typeof services.reprojeter !== 'function') throw new Error('service de reprojection absent');
    reprojetee = services.reprojeter(couche.emprise, couche.systeme.epsg, couche.systeme.crs, couche.systeme.authid);
  } catch (e) {
    reprojetee = null;
    erreur = e && e.message ? String(e.message) : String(e);
  }
  if (!contenue(reprojetee)) {
    // Ligne de diagnostic (mission 037) : ce qui a été lu et ce qui est sorti, sans rien affirmer d'autre.
    let sortie;
    if (erreur !== '') sortie = 'erreur : ' + erreur;
    else if (!reprojetee || typeof reprojetee !== 'object') sortie = 'résultat absent';
    else if (fini(reprojetee.xmin) && fini(reprojetee.ymin) && fini(reprojetee.xmax) && fini(reprojetee.ymax) &&
      reprojetee.xmin <= reprojetee.xmax && reprojetee.ymin <= reprojetee.ymax) sortie = texteEmprise(reprojetee) + ' (hors du rectangle)';
    else sortie = texteEmprise(reprojetee) + ' (valeurs invalides)';
    const detail = texteAuthid(couche.systeme) + ', emprise ' + texteEmprise(couche.emprise) + ' → ' + sortie;
    return refus(nom, 5, MESSAGE_INCOHERENT, undefined, detail, services);
  }
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

// ------------------------------------------------------------------ système source (mission 037)

// Système source de la reprojection : d'abord reconstruit PAR SON NOM, `fromDescription(authid)`
// (service de QField, CoordinateReferenceSystemUtils), comme l'avait fait le prototype n° 2 ; en repli seulement,
// l'objet de la couche, si l'authid est vide, si le service manque ou lève, ou si le système rendu a un authid vide.
// Seul `authid` est lu sur un système (mission 034 : QML ne voit que authid et description).
export function construireSource(authid, crsCouche, fromDescription) {
  const id = typeof authid === 'string' ? authid.trim() : '';
  if (id !== '' && typeof fromDescription === 'function') {
    try {
      const s = fromDescription(id);
      if (s && typeof s.authid === 'string' && s.authid.trim() !== '') return { source: s, via: 'authid' };
    } catch (e) { /* repli */ }
  }
  return { source: crsCouche, via: 'couche' };
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

// Contrôle d'une couche, et en cas de refus 3 ou 5 le détail de diagnostic en ligne à part sous le message
// (« <message>\n  détail : <détail> »). Le texte du message (spec § 4) n'est pas changé. Mission 037.
export function controlerAvecDetail(couche, services) {
  let detail = '';
  const sv = Object.assign({}, services, { detail: function (t) { detail = String(t); } });
  const v = controlerCouche(couche, sv);
  if (v && v.charge === false && detail !== '') return Object.assign({}, v, { message: v.message + '\n  détail : ' + detail });
  return v;
}

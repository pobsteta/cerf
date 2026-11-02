// SPDX-License-Identifier: GPL-3.0-or-later
// Cerf, prototype n° 1 (mission 004) : logique du plugin, sans API de QField.
// Écrit pour Cerf (rien de recopié, ADR 0006). Module ECMAScript pur, sans .pragma, sans
// .import, sans import : chargé à la fois par QML (Cerf.qml) et par Node
// (tests/prototype.test.mjs), ADR 0005.
// Prudence de syntaxe pour le moteur JavaScript de QML : ni « ?. », ni « ?? », ni
// séparateur de chiffres, ni TextDecoder.
//
// Format zip lu : APPNOTE de PKWARE (fin de répertoire 0x06054b50, répertoire central
// 0x02014b50, en-tête local 0x04034b50, bit 11 = nom en UTF-8). Pas de ZIP64.

export const VERSION = '0.1.0';

// Noms des boutons, à reporter dans le protocole tests/recette/prototype-1.md.
export const BOUTONS = {
  A: 'A. Copier hors projet',
  B: 'B. Copier dans le projet',
  C: 'C. Lister la copie',
  D: 'D. Effacer la copie',
  E: 'E. Module .mjs',
  F: 'F. Ouvrir les couches du zip',
  G: 'G. Trouver le .qml du zip',
  H: 'H. Ouvrir le GeoTIFF du zip',
  I: 'I. Essai à risque : lister un gros zip',
};

// Entrées de essai.zip et lourd.zip ouvertes par /vsizip/ (protocole, questions 5 et 7).
export const ENTREES_VECTEUR = ['points_essai.geojson', 'sous-dossier/shape_essai.shp'];
export const ENTREE_GEOTIFF = 'lourd.tif';

// Point d'essai en Lambert 93 (EPSG:2154), X (est) puis Y (nord), en mètres : valeur du
// protocole, tests/recette/essai/fabriquer-essais.mjs (X_L93, Y_L93).
export const POINT_ESSAI_L93 = { x: 652301.56, y: 6861302.73 };
// Tolérance de 1 m : décision de Pascal du 2 novembre 2026 (protocole, décision n° 3).
export const TOLERANCE_METRES = 1;

// Garde du prototype seul (décision de Pascal n° 3 : l'essai du gros zip est gardé, en
// dernier, comme essai à risque). Au-delà de ce seuil, le bouton C refuse de lire le zip en
// mémoire et renvoie au bouton I. Réglage du prototype, pas une valeur du produit.
export const SEUIL_LECTURE_OCTETS = 10000000;

// --------------------------------------------------------------------------- octets

// Rend un Uint8Array à partir de ce que rend QML (QByteArray → ArrayBuffer en Qt 6,
// non prouvé sur l'appareil) ou Node (Buffer, Uint8Array).
export function octetsDe(valeur) {
  if (valeur instanceof Uint8Array) return valeur;
  // Un QByteArray vide (lecture refusée par QField) arrive en ArrayBuffer vide, et le
  // moteur de Qt 6 lève « Type error » sur new Uint8Array() d'un tel tampon (vu le
  // 2 novembre 2026 avec Qt 6.12 hors QField) : on le traite à part.
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
// Python 3.13.18 (encodings/cp437.py, « generated from VENDORS/MICSFT/PC/CP437.TXT »,
// fichier publié par l'Unicode Consortium), contrôlée identique à iconv de la glibc 2.39
// le 2 novembre 2026. La page unicode.org a été refusée par le réseau de la session (403) :
// non lue directement.
export const CP437_HAUT = [
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

export function decoderCp437(octets) {
  let s = '';
  for (let i = 0; i < octets.length; i++) {
    const b = octets[i];
    s += String.fromCharCode(b < 0x80 ? b : CP437_HAUT[b - 0x80]);
  }
  return s;
}

// Décodeur UTF-8 écrit pour Cerf (QML n'offre pas TextDecoder). Octet invalide : U+FFFD.
export function decoderUtf8(octets) {
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

// --------------------------------------------------------------------------- zip

// Lit le répertoire central d'un zip. Rend { entrees: [{ nom, utf8, methode,
// tailleCompressee, taille, decalageLocal }] }. Erreur au message clair sinon.
export function listerZip(valeur) {
  const o = octetsDe(valeur);
  if (o.length === 0) throw new Error('zip vide : 0 octet lu');
  if (o.length < 22) throw new Error(`ce fichier n'est pas un zip (${o.length} octets, trop court)`);
  // Fin de répertoire : cherchée depuis la fin (commentaire de zip : 65535 octets au plus).
  let fin = -1;
  const plusBas = Math.max(0, o.length - 22 - 65535);
  for (let i = o.length - 22; i >= plusBas; i--) {
    if (o[i] === 0x50 && o[i + 1] === 0x4b && o[i + 2] === 0x05 && o[i + 3] === 0x06) { fin = i; break; }
  }
  if (fin < 0) {
    const debutZip = o[0] === 0x50 && o[1] === 0x4b;
    throw new Error(debutZip
      ? "zip tronqué : fin de répertoire introuvable (fichier incomplet ?)"
      : "ce fichier n'est pas un zip (signature PK absente)");
  }
  const nombre = lire16(o, fin + 10);
  const tailleCentral = lire32(o, fin + 12);
  const decalageCentral = lire32(o, fin + 16);
  if (nombre === 0xffff || tailleCentral === 0xffffffff || decalageCentral === 0xffffffff) {
    throw new Error('zip de plus de 4 Go ou de 65535 entrées (ZIP64) : non lu par le prototype');
  }
  if (decalageCentral + tailleCentral > fin) {
    throw new Error('zip tronqué ou abîmé : le répertoire central dépasse la fin du fichier');
  }
  const entrees = [];
  let p = decalageCentral;
  for (let k = 0; k < nombre; k++) {
    if (p + 46 > fin || lire32(o, p) !== 0x02014b50) {
      throw new Error(`zip tronqué ou abîmé : entrée ${k + 1} sur ${nombre} illisible dans le répertoire central`);
    }
    const drapeaux = lire16(o, p + 8);
    const methode = lire16(o, p + 10);
    const tailleCompressee = lire32(o, p + 20);
    const taille = lire32(o, p + 24);
    const lNom = lire16(o, p + 28);
    const lExtra = lire16(o, p + 30);
    const lComm = lire16(o, p + 32);
    const decalageLocal = lire32(o, p + 42);
    if (p + 46 + lNom > fin) throw new Error(`zip tronqué ou abîmé : nom de l'entrée ${k + 1} coupé`);
    const brut = o.subarray(p + 46, p + 46 + lNom);
    const utf8 = (drapeaux & 0x0800) !== 0;
    entrees.push({
      nom: utf8 ? decoderUtf8(brut) : decoderCp437(brut),
      utf8, methode, tailleCompressee, taille, decalageLocal,
    });
    p += 46 + lNom + lExtra + lComm;
  }
  return { entrees };
}

// Décalage du premier octet des données d'une entrée (après son en-tête local).
export function debutDesDonnees(valeur, entree) {
  const o = octetsDe(valeur);
  const h = entree.decalageLocal;
  if (h + 30 > o.length || lire32(o, h) !== 0x04034b50) {
    throw new Error(`zip abîmé : en-tête local de « ${entree.nom} » introuvable`);
  }
  const debut = h + 30 + lire16(o, h + 26) + lire16(o, h + 28);
  if (debut + entree.tailleCompressee > o.length) throw new Error(`zip tronqué : données de « ${entree.nom} » coupées`);
  return debut;
}

// Lit une entrée rangée SANS compression (méthode 0). Une entrée compressée n'est pas
// lue : décision de Pascal du 2 novembre 2026, pas de décompresseur deflate dans le
// prototype ; la question 6 reste « en attente ».
export function lireEntreeStockee(valeur, entree) {
  if (entree.methode !== 0) {
    throw new Error(`« ${entree.nom} » est compressée (méthode ${entree.methode}) : lecture en attente, `
      + 'pas de décompresseur dans le prototype (décision de Pascal, 2 novembre 2026)');
  }
  const o = octetsDe(valeur);
  const d = debutDesDonnees(o, entree);
  return o.subarray(d, d + entree.tailleCompressee);
}

// Le .qml de même nom qu'une couche, dans le même dossier du zip (spec § 5), ou null.
export function trouverQmlVoisin(entrees, cheminCouche) {
  const base = cheminCouche.replace(/\.[^./]*$/, '');
  const voulu = (base + '.qml').toLowerCase();
  for (let i = 0; i < entrees.length; i++) if (entrees[i].nom.toLowerCase() === voulu) return entrees[i];
  return null;
}

// Couleur du premier symbole d'un style QGIS (« r,g,b,a »), ou null.
export function chercherCouleur(texte) {
  const m = /name="color"\s+value="(\d+,\d+,\d+,\d+)"/.exec(texte) || /value="(\d+,\d+,\d+,\d+)"\s*name="color"/.exec(texte);
  return m ? m[1] : null;
}

// --------------------------------------------------------------------------- chemins

export function estNomDeZip(nom) {
  return typeof nom === 'string' && /\.zip$/i.test(nom) && nom.length > 4;
}

export function messageNomRefuse(nom) {
  return `« ${nom} » n'est pas un fichier .zip : le prototype ne lit que les .zip`;
}

function sansBarreFinale(d) {
  return d.length > 1 ? d.replace(/\/+$/, '') : d;
}

// Préfixe de la copie hors projet : <application>/Imported Datasets/cerf/<cerf_id>/
// (spec § 3.3, ADR 0003).
export function prefixeHorsProjet(dossierApplication, cerfId) {
  if (!dossierApplication) throw new Error("dossier de l'application inconnu : copie impossible");
  if (cerfId === undefined || cerfId === null || String(cerfId).trim() === '') {
    throw new Error('cerf_id absent du projet : copie hors projet refusée');
  }
  const id = String(cerfId);
  if (id.indexOf('/') >= 0 || id.indexOf('\\') >= 0 || id === '.' || id === '..' || id.indexOf('..') >= 0) {
    throw new Error(`cerf_id invalide (« ${id} ») : il ne doit contenir ni « / » ni « .. »`);
  }
  return `${sansBarreFinale(dossierApplication)}/Imported Datasets/cerf/${id}/`;
}

// Préfixe de la copie dans le projet (repli de la spec § 9, n° 1).
export function prefixeDansProjet(dossierProjet) {
  if (!dossierProjet) throw new Error('aucun projet ouvert : copie dans le projet impossible');
  return `${sansBarreFinale(dossierProjet)}/cerf-essai/`;
}

// Chemin complet d'un fichier reçu de getFile (relatif au préfixe, ou déjà absolu).
export function cheminRecu(prefixe, recu) {
  if (recu.charAt(0) === '/') return recu;
  return prefixe.replace(/\/*$/, '/') + recu;
}

export function nomDeFichier(chemin) {
  return chemin.substring(chemin.lastIndexOf('/') + 1);
}

export function dossierDe(chemin) {
  return chemin.substring(0, chemin.lastIndexOf('/'));
}

// Normalise un chemin absolu : supprime « . », « // », résout « .. ».
function normaliser(chemin) {
  const parts = [];
  const morceaux = chemin.split('/');
  for (let i = 0; i < morceaux.length; i++) {
    const m = morceaux[i];
    if (m === '' || m === '.') continue;
    if (m === '..') { parts.pop(); continue; }
    parts.push(m);
  }
  return '/' + parts.join('/');
}

// Vrai si `chemin` n'est pas dans `dossier` (ni le dossier lui-même, ni dessous).
export function estHorsDossier(chemin, dossier) {
  if (!dossier) return true; // aucun projet ouvert : tout est hors du dossier projet
  const c = normaliser(chemin);
  const d = normaliser(dossier);
  return !(c === d || c.indexOf(d === '/' ? '/' : d + '/') === 0);
}

export function lieuDeLecture(chemin, dossierProjet) {
  return estHorsDossier(chemin, dossierProjet) ? 'copie hors du dossier projet' : 'copie dans le dossier projet';
}

export function cheminVsizip(zip, entree) {
  return `/vsizip/${zip}/${entree.replace(/^\/+/, '')}`;
}

// Taille connue (≥ 0) au-dessus du seuil : lecture refusée par C, renvoyée à I.
export function lectureSure(taille) {
  return !(taille >= 0 && taille > SEUIL_LECTURE_OCTETS);
}

// --------------------------------------------------------------------------- positions

function nombreFr(v, decimales) {
  let s = v.toFixed(decimales);
  if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s.replace('.', ',');
}

const GEOGRAPHIQUES = ['EPSG:4326', 'OGC:CRS84'];

// Position écrite avec l'ordre et le système explicites (règle de test du projet).
export function ecrirePosition(x, y, authid) {
  if (authid === 'EPSG:2154') {
    return `EPSG:2154, X (est) = ${x.toFixed(2).replace('.', ',')} m ; Y (nord) = ${y.toFixed(2).replace('.', ',')} m`;
  }
  // QGIS range toujours la longitude en x, même pour EPSG:4326.
  if (GEOGRAPHIQUES.indexOf(authid) >= 0) {
    return `${authid}, longitude = ${nombreFr(x, 7)} ; latitude = ${nombreFr(y, 7)}`;
  }
  return `${authid || 'système inconnu'}, x = ${nombreFr(x, 7)} ; y = ${nombreFr(y, 7)} (sens des axes non interprété)`;
}

// Écart au point d'essai (Lambert 93 seulement ; un autre système n'est pas jugé).
export function verifierPointEssai(x, y, authid) {
  if (authid !== 'EPSG:2154') {
    return { verifie: false, conforme: null, ecartMetres: null, texte: `écart au point d'essai : non jugé (système ${authid || 'inconnu'}, attendu EPSG:2154)` };
  }
  const dx = x - POINT_ESSAI_L93.x;
  const dy = y - POINT_ESSAI_L93.y;
  const ecart = Math.sqrt(dx * dx + dy * dy);
  const conforme = ecart <= TOLERANCE_METRES;
  return {
    verifie: true, conforme, ecartMetres: ecart,
    texte: `écart au point d'essai : ${nombreFr(ecart, 2)} m ; à 1 m près : ${conforme ? 'oui' : 'non'}`,
  };
}

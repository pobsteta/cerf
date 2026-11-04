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

export const VERSION = '0.1.1';

// Dossier des copies, sous le dossier du projet : repli de la spec § 9 n° 1 appliqué par Pascal le
// 3 novembre 2026 (spec § 3.3, ADR 0003 et 0007) : QField 4.3.7 refuse à un plugin de lire hors
// du dossier projet (src/core/utils/qffileutils.cpp L620-628), vu à l'essai du squelette.
export const NOM_DOSSIER_COPIES = 'cerf-imports';

// Décision de Pascal n° 6 (3 novembre 2026) : plafond de listage d'un zip, 10 Mo, soit la
// valeur du prototype (prototype/cerf-zip.mjs, SEUIL_LECTURE_OCTETS = 10 000 000 octets).
export const PLAFOND_LISTAGE_OCTETS = 10000000;

// Style inscrit au registre par le squelette (les styles du manuel viennent à la mission 010).
export const STYLE_DEFAUT = 'defaut';

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

// Squelette : GeoJSON par l'extension .geojson (le .json est confié à la mission 010).
// Décision n° 7 : __MACOSX/ et les fichiers « ._* » (zips faits sur Mac) ignorés en silence.
export function couchesDuZip(noms) {
  const couches = [];
  for (let i = 0; i < noms.length; i++) {
    const entree = String(noms[i]);
    if (entree === '' || entree.charAt(entree.length - 1) === '/') continue;
    if (('/' + entree).indexOf('/__MACOSX/') >= 0) continue;
    const fichier = nomDeFichier(entree);
    if (fichier.indexOf('._') === 0) continue;
    if (!/\.geojson$/i.test(fichier)) continue;
    const couche = fichier.substring(0, fichier.length - '.geojson'.length);
    if (couche === '') continue;
    couches.push({ couche, entree });
  }
  return couches;
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

// Entrée saine : nom de zip simple, couche nommée, chemin_vsi dans ce zip, sans « .. ».
function entreeSaine(e) {
  if (!e || typeof e !== 'object') return false;
  if (!estNomDeZip(e.zip)) return false;
  if (typeof e.couche !== 'string' || e.couche === '') return false;
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

function chargerSansPlanter(chargerCouche, source, nom) {
  try {
    const c = chargerCouche(source, nom);
    if (!c) return { couche: null, raison: 'illisible' };
    if (!c.isValid) return { couche: null, raison: 'illisible' };
    return { couche: c, raison: '' };
  } catch (e) {
    return { couche: null, raison: 'illisible (' + (e && e.message ? e.message : String(e)) + ')' };
  }
}

// Description d'une entrée du zip pour les contrôles (spec § 4) : nom avec extension,
// format d'après l'extension, noms du zip dans le même dossier (pour .prj, .shx, .dbf, .cpg).
export function decrireEntree(entree, noms) {
  const fichier = nomDeFichier(entree);
  const m = /\.([^.]*)$/.exec(fichier);
  const ext = m ? m[1].toLowerCase() : '';
  const format = { geojson: 'geojson', json: 'geojson', gpkg: 'gpkg', shp: 'shp', tif: 'tif', tiff: 'tif' }[ext] || ext;
  const dossier = dossierDe(entree);
  const fichiers = [];
  for (let i = 0; i < noms.length; i++) {
    const n = String(noms[i]);
    if (dossierDe(n) === dossier) fichiers.push(nomDeFichier(n));
  }
  return { nom: fichier, format, fichiers };
}

// Décrit puis contrôle une couche ; toute exception vaut refus (spec § 4). Si l'ouverture a
// échoué (`couche` nulle), on contrôle quand même avec `lisible: false` : le contrôle 1
// (Shapefile incomplet) passe avant le 2 (« illisible »), et le message porte le nom avec
// extension, sans erreur technique.
function controlerSansPlanter(ctx, couche, c, noms) {
  const nom = nomDeFichier(c.entree);
  try {
    const entree = decrireEntree(c.entree, noms);
    const lue = couche ? ctx.decrireCouche(couche) : { lisible: false };
    const description = Object.assign({}, lue, entree);
    if (!couche) description.lisible = false;
    const v = ctx.controlerCouche(description);
    if (v && v.charge === true) return { charge: true, avertissements: Array.isArray(v.avertissements) ? v.avertissements : [] };
    return { charge: false, message: v && v.message ? String(v.message) : nom + ' : couche refusée' };
  } catch (e) {
    return { charge: false, message: nom + ' : contrôle impossible, couche refusée' };
  }
}

export function importerZip(ctx) {
  const vide = (message) => ({ chargees: [], refusees: [], message });
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
  const couches = couchesDuZip(noms);
  if (couches.length === 0) return vide(`Aucune couche GeoJSON dans ${nomZip}.`);
  // Mission 012 : le contrôle est obligatoire. Un service absent refuse tout (jamais « pas de
  // contrôle = tout passe »).
  for (const service of ['ouvrirCouche', 'decrireCouche', 'controlerCouche', 'ajouterALaCarte']) {
    if (typeof ctx[service] !== 'function') {
      return vide(`Contrôles d'import indisponibles (${service} absent) : rien n'est importé.`);
    }
  }
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : () => new Date();
  const copie = cheminCopie(ctx.dossierProjet, nomZip);
  const chargees = [];
  const refusees = [];
  const avertissements = [];
  const vues = {};
  for (let i = 0; i < couches.length; i++) {
    const c = couches[i];
    if (Object.prototype.hasOwnProperty.call(vues, c.couche)) {
      // Décision n° 4 : même nom dans deux dossiers du zip, la seconde est refusée.
      refusees.push({ couche: c.couche, entree: c.entree, raison: `nom de couche en double dans le zip (déjà pris par ${vues[c.couche]})` });
      continue;
    }
    vues[c.couche] = c.entree;
    const source = '/vsizip/' + copie + '/' + c.entree;
    // Ouvrir (sans ajouter à la carte), contrôler, puis seulement ajouter et inscrire.
    const r = chargerSansPlanter(ctx.ouvrirCouche, source, c.couche);
    // Ouverture ratée : le contrôle passe quand même (lisible: false), pour que le contrôle 1
    // précède « illisible » et que le message porte le nom avec extension.
    const verdict = controlerSansPlanter(ctx, r.couche, c, noms);
    if (!verdict.charge) {
      // Réimport : une couche acceptée au premier import puis refusée ne doit pas rester au registre.
      retirer(ctx.reglages, ctx.cerfId, { zip: nomZip, couche: c.couche });
      refusees.push({ couche: c.couche, entree: c.entree, raison: verdict.message, message: verdict.message });
      continue;
    }
    for (let k = 0; k < verdict.avertissements.length; k++) avertissements.push(verdict.avertissements[k]);
    try {
      r.couche.readOnly = true;
      ctx.ajouterALaCarte(r.couche, c.couche, source);
    } catch (e) {
      const message = nomDeFichier(c.entree) + ' : ajout à la carte impossible';
      retirer(ctx.reglages, ctx.cerfId, { zip: nomZip, couche: c.couche });
      refusees.push({ couche: c.couche, entree: c.entree, raison: message, message });
      continue;
    }
    // Inscription après chaque couche (spec § 1, geste 5).
    inscrire(ctx.reglages, ctx.cerfId, {
      zip: nomZip,
      couche: c.couche,
      chemin_vsi: nomZip + '/' + c.entree,
      style: STYLE_DEFAUT,
      ajoutee_le: maintenant().toISOString(),
    });
    chargees.push({ couche: c.couche, entree: c.entree, source });
  }
  const lignes = [];
  if (chargees.length > 0) {
    lignes.push(`${chargees.length} ${pluriel(chargees.length, 'couche chargée', 'couches chargées')} : ${nomsDe(chargees)}`);
  } else {
    lignes.push(`Aucune couche chargée depuis ${nomZip}`);
  }
  for (let i = 0; i < refusees.length; i++) lignes.push(refusees[i].message || `${refusees[i].couche} : ${refusees[i].raison}`);
  for (let i = 0; i < avertissements.length; i++) lignes.push(avertissements[i]);
  return { chargees, refusees, avertissements, message: lignes.join('\n') };
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
    if (!Object.prototype.hasOwnProperty.call(presence, e.zip)) presence[e.zip] = !!ctx.existe(dossier + '/' + e.zip);
    if (!presence[e.zip]) { absentes.push({ zip: e.zip, couche: e.couche }); continue; }
    const r = chargerSansPlanter(ctx.chargerCouche, '/vsizip/' + dossier + '/' + e.chemin_vsi, e.couche);
    if (!r.couche) { illisibles.push({ zip: e.zip, couche: e.couche }); continue; }
    r.couche.readOnly = true;
    rechargees.push({ zip: e.zip, couche: e.couche });
  }
  const lignes = [];
  if (etat.illisible) lignes.push("registre illisible : il sera remplacé au prochain ajout d'un zip");
  if (douteuses > 0) {
    lignes.push(`${douteuses} ${pluriel(douteuses, 'entrée douteuse retirée', 'entrées douteuses retirées')} du registre (aucun fichier effacé)`);
  }
  if (absentes.length > 0) {
    lignes.push(absentes.length === 1
      ? "1 couche n'a pas pu être rechargée : zip absent"
      : `${absentes.length} couches n'ont pas pu être rechargées : zip absent`);
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
  const r = retirer(ctx.reglages, ctx.cerfId, { zip, couche });
  if (!r.retiree) return { efface: false, message: `Couche absente du registre : ${couche}.` };
  const debut = `Couche retirée : ${couche}.`;
  if (!r.zipInutile) {
    const n = nombreDeCouchesDuZip(ctx.reglages, ctx.cerfId, zip);
    return { efface: false, message: `${debut} La copie ${zip} sert encore à ${n} ${pluriel(n, 'couche', 'couches')}.` };
  }
  if (!estNomDeZip(zip)) {
    return { efface: false, message: `${debut} Nom de zip douteux au registre : aucun fichier effacé.` };
  }
  if (!dossierProjetSain(ctx.dossierProjet)) {
    return { efface: false, message: `${debut} Dossier du projet inconnu : aucun fichier effacé (${zip}).` };
  }
  const e = effacerCopie(ctx.platformUtilities, cheminCopie(ctx.dossierProjet, zip), dossierCopies(ctx.dossierProjet));
  return { efface: e.efface, message: `${debut} ${e.message}` };
}

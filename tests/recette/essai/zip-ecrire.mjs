// Mission 003 : petit écrivain de zip pour les fichiers d'essai (sans dépendance).
// Écrit pour Cerf. Pas de ZIP64 : toute entrée et tout zip font moins de 4 Gio.
import { deflateRawSync } from 'node:zlib';

const TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  TABLE[n] = c >>> 0;
}

// CRC-32 incrémental : crc32(bloc, crcPrécédent) ; départ à 0.
export function crc32(buf, crc = 0) {
  let c = ~crc >>> 0;
  for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

// Date fixe (2 novembre 2026, 00:00) : le même zip à chaque fabrication.
export const DATE_DOS = ((2026 - 1980) << 9) | (11 << 5) | 2;
export const HEURE_DOS = 0;

// nom : Buffer (octets exacts) ; utf8 : positionne le bit 11 de l'indicateur.
export function enTeteLocal({ nom, utf8, methode, crc, taillePacked, tailleOrigine }) {
  const h = Buffer.alloc(30 + nom.length);
  h.writeUInt32LE(0x04034b50, 0);
  h.writeUInt16LE(20, 4);
  h.writeUInt16LE(utf8 ? 0x0800 : 0, 6);
  h.writeUInt16LE(methode, 8);
  h.writeUInt16LE(HEURE_DOS, 10);
  h.writeUInt16LE(DATE_DOS, 12);
  h.writeUInt32LE(crc, 14);
  h.writeUInt32LE(taillePacked, 18);
  h.writeUInt32LE(tailleOrigine, 22);
  h.writeUInt16LE(nom.length, 26);
  h.writeUInt16LE(0, 28);
  nom.copy(h, 30);
  return h;
}

export function enTeteCentral({ nom, utf8, methode, crc, taillePacked, tailleOrigine, decalage }) {
  const h = Buffer.alloc(46 + nom.length);
  h.writeUInt32LE(0x02014b50, 0);
  h.writeUInt16LE(20, 4);
  h.writeUInt16LE(20, 6);
  h.writeUInt16LE(utf8 ? 0x0800 : 0, 8);
  h.writeUInt16LE(methode, 10);
  h.writeUInt16LE(HEURE_DOS, 12);
  h.writeUInt16LE(DATE_DOS, 14);
  h.writeUInt32LE(crc, 16);
  h.writeUInt32LE(taillePacked, 20);
  h.writeUInt32LE(tailleOrigine, 24);
  h.writeUInt16LE(nom.length, 28);
  h.writeUInt32LE(decalage, 42);
  nom.copy(h, 46);
  return h;
}

export function finDeRepertoire(nombre, tailleCentral, decalageCentral) {
  const e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0);
  e.writeUInt16LE(nombre, 8);
  e.writeUInt16LE(nombre, 10);
  e.writeUInt32LE(tailleCentral, 12);
  e.writeUInt32LE(decalageCentral, 16);
  return e;
}

// entrees : [{ nom: Buffer, donnees: Buffer, stocke: bool, utf8: bool }]
export function ecrireZip(entrees) {
  const locaux = []; const centraux = []; let decalage = 0;
  for (const e of entrees) {
    const crc = crc32(e.donnees);
    const paquet = e.stocke ? e.donnees : deflateRawSync(e.donnees);
    const methode = e.stocke ? 0 : 8;
    const info = { nom: e.nom, utf8: e.utf8, methode, crc, taillePacked: paquet.length, tailleOrigine: e.donnees.length, decalage };
    const loc = Buffer.concat([enTeteLocal(info), paquet]);
    locaux.push(loc); centraux.push(enTeteCentral(info)); decalage += loc.length;
  }
  const central = Buffer.concat(centraux);
  return Buffer.concat([...locaux, central, finDeRepertoire(entrees.length, central.length, decalage)]);
}

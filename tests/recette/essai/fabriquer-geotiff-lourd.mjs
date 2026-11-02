// Mission 003 : fabrique lourd.zip, un zip d'une entrée, un GeoTIFF de 200 Mo rangé SANS
// compression (méthode 0, comme `zip -0`), pour le point « GeoTIFF de 200 Mo » de
// l'ADR 0003 et de la spec § 9 n° 6. Le fichier n'est pas versé au dépôt.
//
// Usage : node fabriquer-geotiff-lourd.mjs <dossier-de-sortie> [taille-en-Mo]
//   <dossier-de-sortie> est obligatoire (pas de sortie par défaut : rien ne tombe dans le dépôt).
//   taille-en-Mo : 200 par défaut (1 Mo = 1 000 000 octets) ; le test automatique utilise 1.
// Écrit : <dossier>/lourd.zip. Affiche la taille exacte du .tif et du zip.
//
// Le GeoTIFF : 8 bits, 1 bande, sans compression, une seule bande de lignes, pixels à 0,
// géoréférencé en Lambert 93 (EPSG:2154, GeoKey ProjectedCSType 3072), pixel de 5 m, coin
// haut-gauche (600000 ; 6870000) : la zone reste en France métropolitaine.
import { openSync, writeSync, readSync, closeSync, mkdirSync, unlinkSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { crc32, enTeteLocal, enTeteCentral, finDeRepertoire } from './zip-ecrire.mjs';

export const NOM_TIF = 'lourd.tif';
export const X0 = 600000;
export const Y0 = 6870000;
export const PIXEL_M = 5;

export function fabriquer(dossier, tailleMo = 200) {
  mkdirSync(dossier, { recursive: true });
  const cible = Math.round(tailleMo * 1_000_000);
  // Carré de côté c : c*c octets de pixels + en-tête.
  const entete = 8 + 2 + 12 * 12 + 4; // en-tête TIFF + IFD (12 entrées)
  const extras = 24 + 48 + 32; // échelle (3 doubles), point d'attache (6 doubles), GeoKeys (16 shorts)
  const cote = Math.floor(Math.sqrt(cible - entete - extras));
  const nPixels = cote * cote;

  const debut = Buffer.alloc(entete + extras);
  let o = 0;
  debut.write('II', o); o += 2; debut.writeUInt16LE(42, o); o += 2; debut.writeUInt32LE(8, o); o += 4;
  debut.writeUInt16LE(12, o); o += 2;
  const offExtras = entete;
  const offPixels = entete + extras;
  const ifd = (tag, type, n, val) => {
    debut.writeUInt16LE(tag, o); debut.writeUInt16LE(type, o + 2); debut.writeUInt32LE(n, o + 4);
    if (type === 3 && n === 1) debut.writeUInt16LE(val, o + 8); else debut.writeUInt32LE(val, o + 8);
    o += 12;
  };
  ifd(256, 4, 1, cote); // largeur
  ifd(257, 4, 1, cote); // hauteur
  ifd(258, 3, 1, 8); // bits par échantillon
  ifd(259, 3, 1, 1); // compression : aucune
  ifd(262, 3, 1, 1); // photométrie : noir = 0
  ifd(273, 4, 1, offPixels); // début des données
  ifd(277, 3, 1, 1); // une bande
  ifd(278, 4, 1, cote); // lignes par bande : toute l'image
  ifd(279, 4, 1, nPixels); // octets de la bande
  ifd(33550, 12, 3, offExtras); // ModelPixelScale
  ifd(33922, 12, 6, offExtras + 24); // ModelTiepoint
  ifd(34735, 3, 16, offExtras + 72); // GeoKeyDirectory
  debut.writeUInt32LE(0, o); o += 4; // pas d'IFD suivant
  [PIXEL_M, PIXEL_M, 0].forEach((v, i) => debut.writeDoubleLE(v, offExtras + 8 * i));
  [0, 0, 0, X0, Y0, 0].forEach((v, i) => debut.writeDoubleLE(v, offExtras + 24 + 8 * i));
  [1, 1, 0, 3, 1024, 0, 1, 1, 1025, 0, 1, 1, 3072, 0, 1, 2154].forEach((v, i) => debut.writeUInt16LE(v, offExtras + 72 + 2 * i));

  const tailleTif = offPixels + nPixels;
  const tif = join(dossier, NOM_TIF);
  const fd = openSync(tif, 'w');
  writeSync(fd, debut);
  const bloc = Buffer.alloc(4 * 1024 * 1024);
  for (let reste = nPixels; reste > 0;) {
    const n = Math.min(reste, bloc.length);
    writeSync(fd, bloc, 0, n); reste -= n;
  }
  closeSync(fd);

  // CRC du .tif, lu par blocs.
  let crc = 0;
  const fr = openSync(tif, 'r');
  for (let lu; (lu = readSync(fr, bloc, 0, bloc.length, null)) > 0;) crc = crc32(bloc.subarray(0, lu), crc);
  closeSync(fr);

  const nom = Buffer.from(NOM_TIF, 'utf8');
  const info = { nom, utf8: true, methode: 0, crc, taillePacked: tailleTif, tailleOrigine: tailleTif, decalage: 0 };
  const central = enTeteCentral(info);
  const zipChemin = join(dossier, 'lourd.zip');
  const fz = openSync(zipChemin, 'w');
  writeSync(fz, enTeteLocal(info));
  const f2 = openSync(tif, 'r');
  for (let lu; (lu = readSync(f2, bloc, 0, bloc.length, null)) > 0;) writeSync(fz, bloc, 0, lu);
  closeSync(f2);
  writeSync(fz, central);
  writeSync(fz, finDeRepertoire(1, central.length, 30 + nom.length + tailleTif));
  closeSync(fz);
  unlinkSync(tif);
  return { zip: zipChemin, tailleTif, tailleZip: statSync(zipChemin).size, cote, crc };
}

if (process.argv[1] && process.argv[1].endsWith('fabriquer-geotiff-lourd.mjs')) {
  if (!process.argv[2]) {
    console.error('Usage : node fabriquer-geotiff-lourd.mjs <dossier-de-sortie> [taille-en-Mo]');
    process.exit(2);
  }
  const r = fabriquer(process.argv[2], process.argv[3] ? Number(process.argv[3]) : 200);
  console.log(`écrit : ${r.zip}\n.tif : ${r.tailleTif} octets (${r.cote} x ${r.cote} pixels) ; zip : ${r.tailleZip} octets`);
}

#!/usr/bin/env node
// Mission 021 : fabrique les deux zips du projet modèle (décision de Pascal n° 1, 3 novembre 2026).
//   projet-cerf-mise-a-jour.zip = cerf.qgz seul : MISE À JOUR, par copie de cerf.qgz à la main (câble USB)
//                                 dans le dossier du projet (mission 028 : QField importe un zip dans un dossier
//                                 neuf, sans les points saisis). Sans saisie.gpkg : ne peut rien écraser.
//   projet-cerf.zip             = cerf.qgz + saisie.gpkg vide : PREMIÈRE INSTALLATION, une seule fois par
//                                 appareil (un saisie.gpkg rempli recopié serait perdu).
// Déterministe (dates MS-DOS fixes, ordre fixe). Écrit pour Cerf, sans dépendance.
// Usage : node outils/zips-projet-modele.mjs <dossier-de-sortie> [dossier-des-sources (défaut : racine du dépôt)]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ecrireZip } from '../tests/recette/essai/zip-ecrire.mjs';

export const ZIP_MISE_A_JOUR = 'projet-cerf-mise-a-jour.zip';
export const ZIP_PREMIERE_INSTALLATION = 'projet-cerf.zip';
export const NOM_QGZ = 'cerf.qgz', NOM_GPKG = 'saisie.gpkg';

const entree = (nom, donnees) => ({ nom: Buffer.from(nom, 'utf8'), donnees, stocke: false, utf8: true });

// Noms des membres d'un zip (répertoire central), pour le garde-fou.
export function nomsDuZip(buf) {
  let fin = buf.length - 22;
  while (fin >= 0 && buf.readUInt32LE(fin) !== 0x06054b50) fin--;
  if (fin < 0) throw new Error('pas un zip (fin de répertoire introuvable)');
  const n = buf.readUInt16LE(fin + 10); let p = buf.readUInt32LE(fin + 16); const noms = [];
  for (let i = 0; i < n; i++) {
    const lf = buf.readUInt16LE(p + 28), lx = buf.readUInt16LE(p + 30), lc = buf.readUInt16LE(p + 32);
    noms.push(buf.toString('utf8', p + 46, p + 46 + lf)); p += 46 + lf + lx + lc;
  }
  return noms;
}

// Garde-fou : le zip de mise à jour ne doit JAMAIS contenir saisie.gpkg (même dans un sous-dossier).
export function verifierMiseAJour(buf) {
  const noms = nomsDuZip(buf);
  if (noms.some((n) => /(^|\/)saisie\.gpkg$/i.test(n))) throw new Error(`${ZIP_MISE_A_JOUR} contient saisie.gpkg : il écraserait les points saisis sur l'appareil`);
  if (noms.length !== 1 || noms[0] !== NOM_QGZ) throw new Error(`${ZIP_MISE_A_JOUR} doit contenir cerf.qgz seul, trouvé : ${JSON.stringify(noms)}`);
}
export function verifierPremiereInstallation(buf) {
  const noms = nomsDuZip(buf).sort();
  if (noms.length !== 2 || noms[0] !== NOM_QGZ || noms[1] !== NOM_GPKG) throw new Error(`${ZIP_PREMIERE_INSTALLATION} doit contenir cerf.qgz et saisie.gpkg, trouvé : ${JSON.stringify(noms)}`);
}

export function fabriquerZips(sortie, sources) {
  const qgz = readFileSync(join(sources, NOM_QGZ)), gpkg = readFileSync(join(sources, NOM_GPKG));
  const miseAJour = ecrireZip([entree(NOM_QGZ, qgz)]);
  const premiere = ecrireZip([entree(NOM_QGZ, qgz), entree(NOM_GPKG, gpkg)]);
  verifierMiseAJour(miseAJour); verifierPremiereInstallation(premiere);
  mkdirSync(sortie, { recursive: true });
  const a = join(sortie, ZIP_MISE_A_JOUR), b = join(sortie, ZIP_PREMIERE_INSTALLATION);
  writeFileSync(a, miseAJour); writeFileSync(b, premiere);
  return { miseAJour: a, premiereInstallation: b };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [, , sortie, sources = fileURLToPath(new URL('..', import.meta.url))] = process.argv;
  if (!sortie) { console.error('Usage : node outils/zips-projet-modele.mjs <dossier-de-sortie> [dossier-des-sources]'); process.exit(2); }
  const r = fabriquerZips(sortie, sources);
  console.log(`écrit : ${r.miseAJour}\nécrit : ${r.premiereInstallation}`);
}

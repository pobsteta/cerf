// SPDX-License-Identifier: GPL-3.0-or-later
// Cerf, prototype n° 2 (mission 023, puis 027 et 030) : fabrique les six fichiers à poser sur le téléphone.
//   plugin-cerf-prototype-2.zip : le plugin, main.qml à la racine (exigence de QField) ; le nom du
//                          zip donne le nom du dossier du plugin : ne pas le renommer.
//   projet-cerf-essai-2.zip : le projet d'essai cerf-essai-2.qgs (sans cerf_id, sans fond).
//   essai-styles.zip     : le zip d'essai (entrées stockées), voir fabriquer-essais.mjs.
//   essai-styles-z.zip   : le zip d'essai ENTIÈREMENT compressé (méthode 8), mission 027.
//   essai-tables-z.zip   : les GeoPackage du bouton 13 (lister les tables), compressés, mission 030.
//   essai-q3.gpkg        : le GeoPackage seul, en repli.
// Rien n'est versé au dépôt (prototype-2/dist/ est dans .gitignore).
//
// Usage : node prototype-2/empaqueter.mjs [dossier-de-sortie]   (défaut : prototype-2/dist)
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ecrireZip } from '../tests/recette/essai/zip-ecrire.mjs';
import { fabriquerEssais, fabriquerEssais3, fabriquerEssais4 } from './fabriquer-essais.mjs';

const ici = dirname(fileURLToPath(import.meta.url));

export const FICHIERS_PLUGIN = ['main.qml', 'Essai.qml', 'essai-logique.mjs', 'metadata.txt', 'icon.svg'];

const entree = (nom, chemin) => ({ nom: Buffer.from(nom, 'utf8'), donnees: readFileSync(chemin), stocke: false, utf8: true });

export function empaqueter(sortie) {
  mkdirSync(sortie, { recursive: true });
  const essais = fabriquerEssais();
  const essais3 = fabriquerEssais3();
  const essais4 = fabriquerEssais4();
  const contenu = {
    'plugin-cerf-prototype-2.zip': ecrireZip(FICHIERS_PLUGIN.map((f) => entree(f, join(ici, f)))),
    'projet-cerf-essai-2.zip': ecrireZip([entree('cerf-essai-2.qgs', join(ici, 'essai-projet', 'cerf-essai-2.qgs'))]),
    'essai-styles.zip': essais.zip,
    'essai-styles-z.zip': essais3.zip,
    'essai-tables-z.zip': essais4.zip,
    'essai-q3.gpkg': essais.gpkg,
  };
  const fichiers = {};
  for (const [nom, octets] of Object.entries(contenu)) {
    const chemin = join(sortie, nom);
    writeFileSync(chemin, octets);
    fichiers[nom] = { chemin, taille: statSync(chemin).size };
  }
  return { fichiers };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = empaqueter(process.argv[2] || join(ici, 'dist'));
  for (const f of Object.values(r.fichiers)) console.log(`écrit : ${f.chemin} (${f.taille} octets)`);
}

// SPDX-License-Identifier: GPL-3.0-or-later
// Cerf, plugin QField d'application (mission 008) : fabrique plugin-cerf.zip, à installer par URL.
// main.qml à la racine du zip (exigence de QField : src/app/qfpluginmanager.cpp L441-448,
// v4.3.7). Le nom « plugin-cerf.zip » donne le dossier du plugin « plugin-cerf » (L452) : ne pas le renommer
// (mission 028 ; l'ancien « Cerf », dossier « cerf », est à désinstaller une fois).
// Le zip n'est pas versé au dépôt : il est publié en release par
// .github/workflows/release-plugin.yml (décision de Pascal n° 2, 3 novembre 2026).
//
// Usage : node plugin/empaqueter.mjs <dossier-de-sortie>   (obligatoire : rien n'est écrit
// dans le dépôt par défaut)
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ecrireZip } from '../tests/recette/essai/zip-ecrire.mjs';

const ici = dirname(fileURLToPath(import.meta.url));

export const FICHIERS_PLUGIN = ['main.qml', 'Cerf.qml', 'Panneau.qml', 'cerf-logique.mjs', 'cerf-controles.mjs', 'metadata.txt', 'icon.svg'];

const entree = (nom) => ({ nom: Buffer.from(nom, 'utf8'), donnees: readFileSync(join(ici, nom)), stocke: false, utf8: true });

export function empaqueter(sortie) {
  mkdirSync(sortie, { recursive: true });
  const chemin = join(sortie, 'plugin-cerf.zip');
  writeFileSync(chemin, ecrireZip(FICHIERS_PLUGIN.map(entree)));
  return { chemin, taille: statSync(chemin).size };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (!process.argv[2]) {
    console.error('usage : node plugin/empaqueter.mjs <dossier-de-sortie>');
    process.exit(2);
  }
  const r = empaqueter(process.argv[2]);
  console.log(`écrit : ${r.chemin} (${r.taille} octets)`);
}

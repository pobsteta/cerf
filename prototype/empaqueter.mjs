// SPDX-License-Identifier: GPL-3.0-or-later
// Vision, prototype n° 1 (mission 004) : fabrique les deux zips à poser sur le téléphone.
//   vision-prototype.zip : le plugin, main.qml à la racine (exigence de QField,
//                        src/app/qfpluginmanager.cpp L443-448, v4.3.7) ; installé par URL.
//   vision-essai.zip     : le projet d'essai vision-essai.qgs (variable vision_id), importé
//                        par l'import d'archive de projet de QField.
// Les zips ne sont PAS versés au dépôt (décision de Pascal n° 1 : release GitHub mise en
// ligne par l'orchestrateur ; prototype/dist/ est dans .gitignore).
//
// Usage : node prototype/empaqueter.mjs [dossier-de-sortie]   (défaut : prototype/dist)
// Le nom « vision-prototype.zip » est voulu : QField nomme le dossier du plugin d'après le
// nom du zip, sans suffixe de version (qfpluginmanager.cpp L452, v4.3.7).
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ecrireZip } from '../tests/recette/essai/zip-ecrire.mjs';

const ici = dirname(fileURLToPath(import.meta.url));

export const FICHIERS_PLUGIN = ['main.qml', 'Vision.qml', 'EssaiModule.qml', 'vision-zip.mjs', 'module-essai.mjs', 'metadata.txt', 'icon.svg'];

const entree = (nom, chemin) => ({ nom: Buffer.from(nom, 'utf8'), donnees: readFileSync(chemin), stocke: false, utf8: true });

export function empaqueter(sortie) {
  mkdirSync(sortie, { recursive: true });
  const plugin = join(sortie, 'vision-prototype.zip');
  writeFileSync(plugin, ecrireZip(FICHIERS_PLUGIN.map((f) => entree(f, join(ici, f)))));
  const projet = join(sortie, 'vision-essai.zip');
  writeFileSync(projet, ecrireZip([entree('vision-essai.qgs', join(ici, 'essai-projet', 'vision-essai.qgs'))]));
  return { plugin, taillePlugin: statSync(plugin).size, projet, tailleProjet: statSync(projet).size };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = empaqueter(process.argv[2] || join(ici, 'dist'));
  console.log(`écrit : ${r.plugin} (${r.taillePlugin} octets)\nécrit : ${r.projet} (${r.tailleProjet} octets)`);
}

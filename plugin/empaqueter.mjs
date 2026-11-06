// SPDX-License-Identifier: GPL-3.0-or-later
// Vision, plugin QField d'application (mission 008) : fabrique plugin-vision.zip, à installer par URL.
// main.qml à la racine du zip (exigence de QField : src/app/qfpluginmanager.cpp L441-448,
// v4.3.7). Le nom « plugin-vision.zip » donne le dossier du plugin « plugin-vision » (L452) : ne pas le renommer
// (mission 028 ; l'ancien « Vision », dossier « vision », est à désinstaller une fois).
// Le zip n'est pas versé au dépôt : il est publié en release par
// .github/workflows/release-plugin.yml (décision de Pascal n° 2, 3 novembre 2026).
//
// Usage : node plugin/empaqueter.mjs <dossier-de-sortie>   (obligatoire : rien n'est écrit
// dans le dépôt par défaut)
import { readFileSync, writeFileSync, mkdirSync, statSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ecrireZip } from '../tests/recette/essai/zip-ecrire.mjs';

const ici = dirname(fileURLToPath(import.meta.url));

export const FICHIERS_PLUGIN = ['main.qml', 'Vision.qml', 'Panneau.qml', 'vision-logique.mjs', 'vision-controles.mjs', 'vision-styles.mjs', 'vision-bibliotheque.mjs', 'metadata.txt', 'icon.svg'];

const entree = (nom) => ({ nom: Buffer.from(nom, 'utf8'), donnees: readFileSync(join(ici, nom)), stocke: false, utf8: true });

// Mission 052 : la bibliothèque de styles (plugin/styles/*.qml, fournis par Pascal, jamais modifiés) est embarquée dans
// un module JavaScript, car QField 4.3.7 ne laisse pas un plugin lire un fichier de son propre dossier
// (src/core/utils/qffileutils.cpp l. 620-628 : readFileContent refuse hors du dossier du projet). Le module est
// versionné (le plugin se charge tel quel depuis le dépôt) ; tests/bibliotheque-052.test.mjs vérifie qu'il est
// identique à ce que cette fonction génère. Pour le régénérer : node plugin/empaqueter.mjs --bibliotheque
export function genererBibliotheque() {
  const dossier = join(ici, 'styles');
  const noms = readdirSync(dossier).filter((f) => f.endsWith('.qml')).map((f) => f.slice(0, -4)).sort();
  const echapper = (t) => JSON.stringify(t).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const lignes = noms.map((n) => `  ${echapper(n)}: ${echapper(readFileSync(join(dossier, n + '.qml'), 'utf8'))},`);
  return `// SPDX-License-Identifier: GPL-3.0-or-later
// Vision, plugin QField d'application (mission 052) : bibliothèque de styles modèles, fournis par Pascal.
// FICHIER GÉNÉRÉ par plugin/empaqueter.mjs depuis plugin/styles/*.qml : ne pas le modifier à la main
// (node plugin/empaqueter.mjs --bibliotheque le régénère ; un test le compare au dossier).
// Module pur, sans import : { nom du fichier sans « .qml » : texte du .qml }.
export const BIBLIOTHEQUE = {
${lignes.join('\n')}
};
`;
}

const fichierPlugin = (nom) => (nom === 'vision-bibliotheque.mjs'
  ? { nom: Buffer.from(nom, 'utf8'), donnees: Buffer.from(genererBibliotheque(), 'utf8'), stocke: false, utf8: true }
  : entree(nom));

export function empaqueter(sortie) {
  mkdirSync(sortie, { recursive: true });
  const chemin = join(sortie, 'plugin-vision.zip');
  writeFileSync(chemin, ecrireZip(FICHIERS_PLUGIN.map(fichierPlugin)));
  return { chemin, taille: statSync(chemin).size };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv[2] === '--bibliotheque') {
    writeFileSync(join(ici, 'vision-bibliotheque.mjs'), genererBibliotheque());
    console.log('écrit : plugin/vision-bibliotheque.mjs');
    process.exit(0);
  }
  if (!process.argv[2]) {
    console.error('usage : node plugin/empaqueter.mjs <dossier-de-sortie>   |   node plugin/empaqueter.mjs --bibliotheque');
    process.exit(2);
  }
  const r = empaqueter(process.argv[2]);
  console.log(`écrit : ${r.chemin} (${r.taille} octets)`);
}

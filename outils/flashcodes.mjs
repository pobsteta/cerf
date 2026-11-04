// Mission 025 : flashcodes (QR codes) des adresses de téléchargement des releases.
// Ce que QField 4.3.7 accepte dans un flashcode : une URL http(s) directe, sans enveloppe qfield://
// (voir docs de la mission : QfPluginManagerSettings.qml onDecoded, QfLocalDataPickerScreen.qml onDecoded).
// Générateur : qrencode ; contrôle : zbarimg (paquet Ubuntu zbar-tools). Deux outils libres, installés
// dans les workflows. Les URL sont celles des adresses stables ; en préversion d'essai, ce sont celles des
// releases d'essai (pour que Pascal installe l'essai avant fusion), jamais les adresses stables.
//
// Usage :
//   node outils/flashcodes.mjs generer  <dossier> <plugin|projet|manuel|manuel-geojson> <stable|essai>   PNG + SVG dans <dossier>
//   node outils/flashcodes.mjs verifier <dossier> <plugin|projet|manuel|manuel-geojson> <stable|essai>   décode et compare
//   node outils/flashcodes.mjs notes    <plugin|projet|manuel|manuel-geojson> <stable|essai> <étiquette> bloc Markdown des notes
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEPOT = 'https://github.com/pobsteta/cerf/releases';

// Mission 028 : noms des fichiers publiés. Pas de flashcode pour la mise à jour du projet (copie de cerf.qgz à la main).
const PLUGIN = 'plugin-cerf.zip';
const PROJET = 'projet-cerf.zip';

const ACCES_PLUGIN =
  'dans QField, Paramètres, Plugins, « Install plugin from URL », touche l\'icône QR code du champ, puis vise cet écran';
const ACCES_PROJET =
  'dans QField, écran d\'accueil, « Projets et jeux de données locaux », bouton d\'actions en bas à droite (« Import Actions »), ' +
  '« Import URL », touche l\'icône QR code du champ, puis vise cet écran';

// Les flashcodes d'un type de release, dans l'ordre d'affichage des notes.
// `mode` : « stable » (adresses stables) ou « essai » (adresses des préversions d'essai).
export function flashcodes(type, mode) {
  if (!['stable', 'essai'].includes(mode)) throw new Error(`mode inconnu : ${mode}`);
  if (type === 'plugin') {
    const url = mode === 'stable' ? `${DEPOT}/latest/download/${PLUGIN}` : `${DEPOT}/download/plugin-essai/${PLUGIN}`;
    return [{ nom: 'flashcode-plugin', url, titre: 'Plugin Cerf', phrase: `Installe le plugin Cerf : ${ACCES_PLUGIN}.` }];
  }
  if (type === 'projet') {
    const etiquette = mode === 'stable' ? 'projet-modele' : 'projet-modele-essai';
    return [
      {
        nom: 'flashcode-projet',
        url: `${DEPOT}/download/${etiquette}/${PROJET}`,
        titre: 'Projet Cerf, première installation',
        phrase: `Installe le projet Cerf avec sa couche « Saisie terrain » vide, une seule fois par appareil : ${ACCES_PROJET}.`,
      },
    ];
  }
  if (type === 'manuel') {
    // Mission 033 : zip de démonstration, une seule adresse (étiquette fixe « essai-manuel »), même en mode stable ou essai.
    return [
      {
        nom: 'flashcode-essai-manuel',
        url: `${DEPOT}/download/essai-manuel/essai-manuel.zip`,
        titre: 'Zip de démonstration essai-manuel.zip',
        phrase: 'Télécharge le zip de démonstration (données fictives) en visant cet écran avec l\'appareil photo du Samsung, puis importe-le dans cerf.qgz avec le plugin Cerf.',
      },
    ];
  }
  if (type === 'manuel-geojson') {
    // Mission 035 : variante tout en GeoJSON, dans la même préversion « essai-manuel » (même adresse stable, autre fichier).
    return [
      {
        nom: 'flashcode-essai-manuel-geojson',
        url: `${DEPOT}/download/essai-manuel/essai-manuel-geojson.zip`,
        titre: 'Zip de démonstration essai-manuel-geojson.zip (tout en GeoJSON)',
        phrase: 'Télécharge la variante tout en GeoJSON du zip de démonstration (données fictives) en visant cet écran avec l\'appareil photo du Samsung, puis importe-la dans cerf.qgz avec le plugin Cerf : à prendre tant que le plugin ne lit pas les Shapefile.',
      },
    ];
  }
  throw new Error(`type inconnu : ${type}`);
}

// PNG : 16 pixels par module, bordure de 4 modules, correction d'erreur M : lisible depuis un écran de PC.
export function generer(dossier, type, mode) {
  mkdirSync(dossier, { recursive: true });
  const fichiers = [];
  for (const f of flashcodes(type, mode)) {
    for (const [fmt, ext, extra] of [['PNG', 'png', ['-s', '16']], ['SVG', 'svg', []]]) {
      const sortie = join(dossier, `${f.nom}.${ext}`);
      execFileSync('qrencode', ['-t', fmt, ...extra, '-m', '4', '-l', 'M', '-o', sortie, f.url]);
      fichiers.push(sortie);
    }
  }
  return fichiers;
}

// Le SVG de qrencode est une suite de <rect width="1" height="1"> dans un groupe décalé de la bordure.
// On le relit en matrice de modules, puis on le réécrit en image PBM agrandie, que zbarimg décode : on
// contrôle ainsi le SVG lui-même (et non le PNG).
export function svgVersPbm(svg, echelle = 8) {
  const vb = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  const tr = svg.match(/<g id="Pattern" transform="translate\((\d+),(\d+)\)">/);
  if (!vb || !tr) throw new Error('SVG de flashcode non reconnu');
  const taille = Number(vb[1]);
  const [dx, dy] = [Number(tr[1]), Number(tr[2])];
  const noir = new Set();
  for (const m of svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="1" height="1" fill="#000000"\/>/g)) {
    noir.add(`${Number(m[1]) + dx},${Number(m[2]) + dy}`);
  }
  if (noir.size === 0) throw new Error('SVG de flashcode sans module noir');
  const lignes = [];
  for (let y = 0; y < taille; y++) {
    let ligne = '';
    for (let x = 0; x < taille; x++) ligne += (noir.has(`${x},${y}`) ? '1' : '0').repeat(echelle);
    for (let k = 0; k < echelle; k++) lignes.push(ligne);
  }
  return `P1\n${taille * echelle} ${taille * echelle}\n${lignes.join('\n')}\n`;
}

function zbar(chemin) {
  return execFileSync('zbarimg', ['--raw', '--quiet', chemin], { encoding: 'utf8' }).replace(/\n$/, '');
}

// Texte décodé d'un fichier PNG ou SVG de flashcode.
export function decoder(chemin) {
  if (!chemin.endsWith('.svg')) return zbar(chemin);
  const tmp = mkdtempSync(join(tmpdir(), 'cerf-qr-'));
  try {
    const pbm = join(tmp, 'qr.pbm');
    writeFileSync(pbm, svgVersPbm(readFileSync(chemin, 'utf8')));
    return zbar(pbm);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// Décode chaque image du dossier et compare à l'URL attendue ; renvoie les écarts (vide = tout est bon).
export function verifier(dossier, type, mode) {
  const ecarts = [];
  for (const f of flashcodes(type, mode)) {
    for (const ext of ['png', 'svg']) {
      const chemin = join(dossier, `${f.nom}.${ext}`);
      let lu;
      try {
        lu = decoder(chemin);
      } catch (e) {
        ecarts.push(`${f.nom}.${ext} : illisible (${e.message.split('\n')[0]})`);
        continue;
      }
      if (lu !== f.url) ecarts.push(`${f.nom}.${ext} : lu « ${lu} », attendu « ${f.url} »`);
    }
  }
  return ecarts;
}

// Bloc Markdown des notes : image (jointe à la release d'étiquette `etiquette`), URL en clair, une phrase.
export function notes(type, mode, etiquette) {
  const blocs = [mode === 'essai' ? '## Flashcodes de l\'essai (préversion)' : '## Flashcodes'];
  for (const f of flashcodes(type, mode)) {
    blocs.push(
      `### ${f.titre}`,
      `![${f.titre}](${DEPOT}/download/${etiquette}/${f.nom}.png)`,
      `\`${f.url}\``,
      f.phrase,
    );
  }
  return blocs.join('\n\n') + '\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, ...a] = process.argv.slice(2);
  try {
    if (cmd === 'generer') {
      for (const f of generer(a[0], a[1], a[2])) console.log(f);
    } else if (cmd === 'verifier') {
      const ecarts = verifier(a[0], a[1], a[2]);
      if (ecarts.length) {
        console.error(ecarts.join('\n'));
        process.exit(1);
      }
      console.log('Flashcodes décodés : URL exactes.');
    } else if (cmd === 'notes') {
      process.stdout.write(notes(a[0], a[1], a[2]));
    } else {
      console.error('Usage : generer|verifier <dossier> <type> <mode> ; notes <type> <mode> <étiquette>');
      process.exit(2);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

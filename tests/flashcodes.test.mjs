// Mission 025 : les flashcodes décodent exactement l'URL attendue (PNG et SVG), et les workflows les joignent.
// Outils : qrencode (générateur) et zbarimg (décodeur), paquets Ubuntu qrencode et zbar-tools, installés par
// les workflows. En local sans ces outils, les tests de décodage sont sautés, sauf si VISION_FLASHCODES_EXIGER=1
// (positionné dans les workflows : un décodage sauté y est un échec).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { flashcodes, generer, verifier, decoder, notes, svgVersPbm } from '../outils/flashcodes.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const dispo = (cmd, arg) => !spawnSync(cmd, [arg], { stdio: 'ignore' }).error;
const OUTILS = dispo('qrencode', '--version') && dispo('zbarimg', '--version');
const EXIGER = process.env.VISION_FLASHCODES_EXIGER === '1';
const saut = OUTILS ? false : 'qrencode ou zbarimg absent (paquets qrencode, zbar-tools)';

const DEPOT = 'https://github.com/pobsteta/vision/releases';
const code = (f) => readFileSync(join(RACINE, '.github', 'workflows', f), 'utf8')
  .split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

test('les outils de décodage sont présents quand on les exige', () => {
  if (EXIGER) assert.ok(OUTILS, 'qrencode et zbarimg doivent être installés');
});

test('adresses stables : celles de la fiche 025, noms de la fiche 028 (aucun flashcode pour la mise à jour)', () => {
  assert.deepEqual(flashcodes('plugin', 'stable').map((f) => f.url), [`${DEPOT}/latest/download/plugin-vision.zip`]);
  assert.deepEqual(flashcodes('projet', 'stable').map((f) => f.url), [
    `${DEPOT}/download/projet-modele/projet-vision.zip`,
  ]);
});

test('préversions d\'essai : adresses des releases d\'essai, jamais les adresses stables', () => {
  const urls = [...flashcodes('plugin', 'essai'), ...flashcodes('projet', 'essai')].map((f) => f.url);
  assert.deepEqual(urls, [
    `${DEPOT}/download/plugin-essai/plugin-vision.zip`,
    `${DEPOT}/download/projet-modele-essai/projet-vision.zip`,
  ]);
  assert.throws(() => flashcodes('plugin', 'autre'));
  assert.throws(() => flashcodes('autre', 'stable'));
});

for (const [type, mode] of [['plugin', 'stable'], ['projet', 'stable'], ['plugin', 'essai'], ['projet', 'essai']]) {
  test(`décodage ${type} ${mode} : PNG et SVG donnent exactement l'URL`, { skip: saut }, () => {
    const dossier = mkdtempSync(join(tmpdir(), 'vision-flash-'));
    try {
      const fichiers = generer(dossier, type, mode);
      assert.equal(fichiers.length, 2 * flashcodes(type, mode).length);
      for (const f of flashcodes(type, mode)) {
        assert.equal(decoder(join(dossier, `${f.nom}.png`)), f.url, `${f.nom}.png`);
        assert.equal(decoder(join(dossier, `${f.nom}.svg`)), f.url, `${f.nom}.svg`);
      }
      assert.deepEqual(verifier(dossier, type, mode), []);
    } finally {
      rmSync(dossier, { recursive: true, force: true });
    }
  });
}

test('PNG assez grand pour un écran de PC (au moins 500 pixels de côté)', { skip: saut }, () => {
  const dossier = mkdtempSync(join(tmpdir(), 'vision-flash-'));
  try {
    generer(dossier, 'projet', 'stable');
    for (const f of flashcodes('projet', 'stable')) {
      const png = readFileSync(join(dossier, `${f.nom}.png`));
      assert.equal(png.subarray(1, 4).toString(), 'PNG');
      const [l, h] = [png.readUInt32BE(16), png.readUInt32BE(20)];
      assert.ok(l >= 500 && h >= 500 && l === h, `${l}x${h}`);
      assert.ok(statSync(join(dossier, `${f.nom}.svg`)).size > 0);
    }
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

test('verifier signale un flashcode qui ne donne pas la bonne URL', { skip: saut }, () => {
  const dossier = mkdtempSync(join(tmpdir(), 'vision-flash-'));
  try {
    generer(dossier, 'plugin', 'stable');
    // Les images du plugin « essai » sont attendues sous le même nom mais avec une autre URL.
    const ecarts = verifier(dossier, 'plugin', 'essai');
    assert.equal(ecarts.length, 2);
    assert.match(ecarts[0], /attendu/);
    // Un dossier vide : illisible, pas de faux positif.
    assert.equal(verifier(join(dossier, 'vide'), 'plugin', 'stable').length, 2);
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

test('svgVersPbm : matrice de modules relue, SVG inconnu refusé', () => {
  const svg = '<svg viewBox="0 0 3 3"><g id="Pattern" transform="translate(1,1)"><rect x="0" y="0" width="1" height="1" fill="#000000"/></g></svg>';
  assert.equal(svgVersPbm(svg, 1), 'P1\n3 3\n000\n010\n000\n');
  assert.throws(() => svgVersPbm('<svg/>'), /non reconnu/);
});

test('notes : image, URL en clair, une phrase avec l\'écran de QField', () => {
  const n = notes('projet', 'stable', 'projet-modele');
  assert.match(n, /!\[Projet Vision, première installation\]\(https:\/\/github\.com\/pobsteta\/vision\/releases\/download\/projet-modele\/flashcode-projet\.png\)/);
  assert.match(n, /`https:\/\/github\.com\/pobsteta\/vision\/releases\/download\/projet-modele\/projet-vision\.zip`/);
  assert.doesNotMatch(n, /mise-a-jour/);
  assert.match(n, /« Import URL »/);
  const p = notes('plugin', 'stable', 'plugin-v0.1.0');
  assert.match(p, /download\/plugin-v0\.1\.0\/flashcode-plugin\.png/);
  assert.match(p, /`https:\/\/github\.com\/pobsteta\/vision\/releases\/latest\/download\/plugin-vision\.zip`/);
  assert.match(p, /« Install plugin from URL »/);
  assert.match(notes('plugin', 'essai', 'plugin-essai'), /essai/);
});

test('workflow plugin : génère, contrôle, joint les flashcodes aux releases et aux notes', () => {
  const wf = code('release-plugin.yml');
  assert.match(wf, /apt-get install -y qrencode zbar-tools/);
  assert.match(wf, /VISION_FLASHCODES_EXIGER: '1'/);
  assert.match(wf, /node outils\/flashcodes\.mjs generer dist\/flashcodes plugin "\$mode"/);
  assert.match(wf, /node outils\/flashcodes\.mjs verifier dist\/flashcodes plugin "\$mode"/);
  assert.match(wf, /node outils\/flashcodes\.mjs notes plugin stable "plugin-v\$version" >> notes\.md/);
  assert.match(wf, /node outils\/flashcodes\.mjs notes plugin essai plugin-essai >> notes\.md/);
  assert.match(wf, /gh release create "plugin-v\$version" dist\/plugin-vision\.zip dist\/flashcodes\/\*/);
  assert.match(wf, /gh release upload plugin-essai dist\/plugin-vision\.zip dist\/essai\.zip dist\/flashcodes\/\* --clobber/);
  // Le plugin n'a pas changé de contenu ni de rôle : seule plugin-v<version> reste « latest ».
  assert.match(wf, /--title "Vision \$version" --notes-file notes\.md --latest\b(?!=)/);
});

test('workflow projet modèle : génère, contrôle, joint les flashcodes aux releases et aux notes', () => {
  const wf = code('release-projet-modele.yml');
  assert.match(wf, /apt-get install -y qrencode zbar-tools/);
  assert.match(wf, /VISION_FLASHCODES_EXIGER: '1'/);
  assert.match(wf, /node outils\/flashcodes\.mjs generer dist\/flashcodes projet "\$mode"/);
  assert.match(wf, /node outils\/flashcodes\.mjs verifier dist\/flashcodes projet "\$mode"/);
  assert.match(wf, /gh release create projet-modele dist\/projet-vision\.zip dist\/projet-vision-mise-a-jour\.zip dist\/flashcodes\/\*/);
  assert.match(wf, /gh release upload projet-modele-essai dist\/projet-vision\.zip dist\/projet-vision-mise-a-jour\.zip dist\/flashcodes\/\* --clobber/);
  assert.match(wf, /--title "Projet modèle Vision" --notes-file notes\.md --latest=false/);
  assert.doesNotMatch(wf, /--latest(?!=false)/);
});

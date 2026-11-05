// Mission 021 : les deux zips du projet modèle (décision de Pascal n° 1) et le garde-fou
// « pas de saisie.gpkg dans le zip de mise à jour ».
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { ecrireZip } from './recette/essai/zip-ecrire.mjs';
import { fabriquerZips, nomsDuZip, verifierMiseAJour, verifierPremiereInstallation, ZIP_MISE_A_JOUR, ZIP_PREMIERE_INSTALLATION } from '../outils/zips-projet-modele.mjs';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'vision-zips-021-'));
test.after(() => rmSync(tmp, { recursive: true, force: true }));
const e = (nom, d = 'x') => ({ nom: Buffer.from(nom), donnees: Buffer.from(d), stocke: false, utf8: true });
function contenu(buf, nom) { // lit un membre
  const fin = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])); let p = buf.readUInt32LE(fin + 16);
  for (let i = 0; i < buf.readUInt16LE(fin + 10); i++) {
    const lf = buf.readUInt16LE(p + 28), lx = buf.readUInt16LE(p + 30), lc = buf.readUInt16LE(p + 32), loc = buf.readUInt32LE(p + 42);
    if (buf.toString('utf8', p + 46, p + 46 + lf) === nom) {
      const d = loc + 30 + buf.readUInt16LE(loc + 26) + buf.readUInt16LE(loc + 28);
      return inflateRawSync(buf.subarray(d, d + buf.readUInt32LE(p + 20)));
    }
    p += 46 + lf + lx + lc;
  }
  return null;
}

test('le zip de mise à jour contient vision.qgz seul, sans saisie.gpkg', () => {
  const r = fabriquerZips(join(tmp, 'a'), RACINE), buf = readFileSync(r.miseAJour);
  assert.deepEqual(nomsDuZip(buf), ['vision.qgz']);
  assert.ok(contenu(buf, 'vision.qgz').equals(contenu(readFileSync(r.premiereInstallation), 'vision.qgz')));
});
test('le zip de première installation contient vision.qgz et saisie.gpkg (vide, identique à celui du dépôt)', () => {
  const r = fabriquerZips(join(tmp, 'b'), RACINE), buf = readFileSync(r.premiereInstallation);
  assert.deepEqual(nomsDuZip(buf).sort(), ['saisie.gpkg', 'vision.qgz']);
  assert.ok(contenu(buf, 'saisie.gpkg').equals(readFileSync(join(RACINE, 'saisie.gpkg'))));
  assert.ok(contenu(buf, 'vision.qgz').equals(readFileSync(join(RACINE, 'vision.qgz'))));
});
test('noms des fichiers : ceux de la décision de Pascal (fiche 028)', () => {
  assert.equal(ZIP_MISE_A_JOUR, 'projet-vision-mise-a-jour.zip');
  assert.equal(ZIP_PREMIERE_INSTALLATION, 'projet-vision.zip');
  const r = fabriquerZips(join(tmp, 'n'), RACINE);
  assert.ok(r.miseAJour.endsWith('/projet-vision-mise-a-jour.zip') && r.premiereInstallation.endsWith('/projet-vision.zip'));
});
test('déterministe : deux fabrications donnent les mêmes octets', () => {
  const a = fabriquerZips(join(tmp, 'c1'), RACINE), b = fabriquerZips(join(tmp, 'c2'), RACINE);
  assert.ok(readFileSync(a.miseAJour).equals(readFileSync(b.miseAJour)));
  assert.ok(readFileSync(a.premiereInstallation).equals(readFileSync(b.premiereInstallation)));
});
test('garde-fou : un zip de mise à jour avec saisie.gpkg (racine ou sous-dossier, casse libre) est refusé', () => {
  for (const nom of ['saisie.gpkg', 'SAISIE.GPKG', 'projet/saisie.gpkg']) {
    assert.throws(() => verifierMiseAJour(ecrireZip([e('vision.qgz'), e(nom)])), /écraserait/, nom);
  }
});
test('garde-fou : un zip de mise à jour avec autre chose que vision.qgz seul est refusé ; vision.qgz seul est accepté', () => {
  assert.throws(() => verifierMiseAJour(ecrireZip([e('vision.qgz'), e('notes.txt')])), /seul/);
  assert.throws(() => verifierMiseAJour(ecrireZip([e('autre.qgz')])), /seul/);
  assert.doesNotThrow(() => verifierMiseAJour(ecrireZip([e('vision.qgz')])));
});
test('garde-fou : la première installation sans saisie.gpkg ou avec un intrus est refusée', () => {
  assert.throws(() => verifierPremiereInstallation(ecrireZip([e('vision.qgz')])), /vision\.qgz et saisie\.gpkg/);
  assert.throws(() => verifierPremiereInstallation(ecrireZip([e('vision.qgz'), e('saisie.gpkg'), e('x')])), /vision\.qgz et saisie\.gpkg/);
  assert.doesNotThrow(() => verifierPremiereInstallation(ecrireZip([e('vision.qgz'), e('saisie.gpkg')])));
});
test('fabriquerZips échoue si une source manque', () => {
  const vide = join(tmp, 'vide'); writeFileSync(join(tmp, 'seul.qgz'), 'x');
  assert.throws(() => fabriquerZips(join(tmp, 'd'), vide));
});

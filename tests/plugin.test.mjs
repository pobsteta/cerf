// SPDX-License-Identifier: GPL-3.0-or-later
// Mission 008 : tests du dev, en plus des 46 tests de la mission 007 (tests/squelette.test.mjs).
// Ils couvrent ce que le plan (plugin/PLAN.md) et les décisions de Pascal du 3 novembre 2026
// (pilotage/missions/008-squelette-plugin.md) ajoutent au contrat, et la forme du plugin.
//
// Ils ne prouvent RIEN sur QField : l'API de QField est simulée. Le chargement réel, la
// lecture seule, le registre après redémarrage et le point au bon endroit sont vérifiés par
// l'essai sur le Samsung (plugin/PLAN.md § 9). Règle du projet « un point du terrain tombe au
// bon endroit » : le squelette ne reprojette rien et Node n'a pas GDAL ; aucun test Node ne
// peut le prouver ici, c'est l'étape 3 de l'essai.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ecrireZip } from './recette/essai/zip-ecrire.mjs';

const ici = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ici, '..');
const PLUGIN = join(RACINE, 'plugin');
const MODULE = join(PLUGIN, 'cerf-logique.mjs');

let charge;
async function M() {
  if (!existsSync(MODULE)) throw new Error('plugin/cerf-logique.mjs absent : rouge attendu avant le code de la mission 008');
  charge ??= await import(MODULE);
  return charge;
}

// cerf_id de cerf.qgz (le même que tests/squelette.test.mjs).
const ID = 'ebad8ff8-577e-48bc-9489-6bab871230c2';
// Dossier de projet FICTIF d'Android, sans valeur métier.
const PROJET = '/storage/emulated/0/Android/data/ch.opengis.qfield/files/Imported Projects/Serre';
const COPIES = `${PROJET}/cerf-imports`; // repli du 3 novembre 2026 (spec § 3.3)
const GJ = '{"type":"FeatureCollection","features":[]}';

const ent = (nom, { utf8 = true, txt = GJ } = {}) => ({ nom: Buffer.from(nom, 'utf8'), donnees: Buffer.from(txt, 'utf8'), stocke: false, utf8 });
const zipDe = (...noms) => ecrireZip(noms.map((n) => ent(n)));

function faussesReglages(depart = {}) {
  const m = new Map(Object.entries(depart));
  return {
    magasin: m,
    ecritures: [],
    value(cle, defaut) { return m.has(cle) ? m.get(cle) : defaut; },
    setValue(cle, v) { m.set(cle, v); this.ecritures.push(cle); },
  };
}
function faussesCouches({ echecs = [] } = {}) {
  const f = {
    appels: [],
    charger(source, nom) {
      f.appels.push({ source, nom });
      return { source, name: nom, isValid: !echecs.includes(source), readOnly: false };
    },
  };
  return f;
}
function ctxImport(extra = {}) {
  const couches = extra.couches ?? faussesCouches();
  const reglages = extra.reglages ?? faussesReglages();
  return {
    couches, reglages,
    ctx: {
      cerfId: ID, dossierProjet: PROJET, nomZip: 'x.zip', octets: zipDe('a.geojson'),
      reglages, chargerCouche: (s, n) => couches.charger(s, n),
      maintenant: () => new Date('2026-11-03T10:00:00Z'),
      ...extra.ctx,
    },
  };
}
const entree = (zip, couche, chemin = `${zip}/${couche}.geojson`) =>
  ({ zip, couche, chemin_vsi: chemin, style: 'defaut', ajoutee_le: '2026-11-03T10:00:00.000Z' });

// ============================================================================ lecture du zip
test('nomsDuZip : nom UTF-8 (bit 11) accentué, et Uint8Array accepté', async () => {
  const m = await M();
  const z = ecrireZip([ent('forêt/Parcelles_é.geojson')]);
  assert.deepEqual(m.nomsDuZip(new Uint8Array(z)), ['forêt/Parcelles_é.geojson']);
});

test('nomsDuZip : ArrayBuffer vide (lecture refusée par QField) -> erreur claire, pas de plantage', async () => {
  const m = await M();
  assert.throws(() => m.nomsDuZip(new ArrayBuffer(0)), /0 octet/);
});

test('nomsDuZip : ZIP64 (nombre d\'entrées 0xffff) -> refus au message clair', async () => {
  const m = await M();
  const z = Buffer.from(zipDe('a.geojson'));
  const fin = z.length - 22;
  z.writeUInt16LE(0xffff, fin + 10);
  assert.throws(() => m.nomsDuZip(z), /ZIP64/);
});

test('décision 7 : __MACOSX/ et ._* ignorés en silence ; .GEOJSON dans un sous-sous-dossier gardé', async () => {
  const m = await M();
  assert.deepEqual(m.couchesDuZip([
    '__MACOSX/._UG.geojson', '__MACOSX/x/UG.geojson', 'x/._Parcelles.geojson', '._a.geojson',
    'a/b/FRT.GEOJSON', 'dossier/',
  ]), [{ couche: 'FRT', entree: 'a/b/FRT.GEOJSON' }]);
});

// ============================================================================ décision 6 : plafond
test('décision 6 : plafond de listage de 10 Mo (10 000 000 octets, valeur du prototype), taille inconnue refusée', async () => {
  const m = await M();
  assert.equal(m.PLAFOND_LISTAGE_OCTETS, 10000000);
  assert.equal(m.listageSur(10000000), true);
  assert.equal(m.listageSur(2108), true);
  assert.equal(m.listageSur(10000001), false);
  assert.equal(m.listageSur(-1), false, 'taille inconnue');
  assert.equal(m.listageSur(Number.NaN), false);
  const msg = m.messageListageRefuse('lourd.zip', 200045802);
  assert.match(msg, /lourd\.zip/);
  assert.match(msg, /10 Mo/);
  assert.match(m.messageListageRefuse('x.zip', -1), /inconnue/);
});

test('décision 6 : importerZip refuse des octets au-delà du plafond, sans rien charger ni écrire', async () => {
  const m = await M();
  const { ctx, couches, reglages } = ctxImport({ ctx: { octets: Buffer.alloc(10000001) } });
  const r = m.importerZip(ctx);
  assert.deepEqual(r.chargees, []);
  assert.match(r.message, /10 Mo/);
  assert.deepEqual(couches.appels, []);
  assert.deepEqual(reglages.ecritures, []);
});

// ============================================================================ décision 3 : lecture refusée
test('décision 3 : message de lecture refusée, avec le nom du zip et la version de QField', async () => {
  const m = await M();
  const msg = m.messageLectureRefusee('essai.zip', '4.3.7');
  assert.match(msg, /essai\.zip/);
  assert.match(msg, /4\.3\.7/);
  assert.match(msg, /refus/i);
  assert.match(m.messageLectureRefusee('essai.zip', ''), /inconnue/);
  assert.ok(!/hors du dossier/.test(msg), 'sans avis de QField, le message ne présume pas du lieu de la copie');
});

test('repli du 3 novembre : le message de lecture refusée rapporte l\'avis de QField sur la copie (isWithinProjectDirectory)', async () => {
  const m = await M();
  assert.match(m.messageLectureRefusee('essai.zip', '4.3.7', true), /dans le dossier du projet selon QField/);
  assert.match(m.messageLectureRefusee('essai.zip', '4.3.7', false), /hors du dossier du projet selon QField/);
});

test('repli du 3 novembre : dossier du projet avec barre finale toléré ; cheminCopie vide si le projet est inconnu', async () => {
  const m = await M();
  assert.equal(m.NOM_DOSSIER_COPIES, 'cerf-imports');
  assert.equal(m.dossierCopies(PROJET + '/'), COPIES);
  assert.equal(m.cheminCopie('', 'essai.zip'), '');
  assert.equal(m.cheminCopie('relatif', 'essai.zip'), '');
});

test('repli du 3 novembre : importerZip, demarrerProjet et retirerCouche sans dossier du projet sain -> rien chargé, rien écrit, rien effacé', async () => {
  const m = await M();
  for (const p of ['', '/', 'relatif', undefined]) {
    const { ctx, couches, reglages } = ctxImport({ ctx: { dossierProjet: p } });
    const r = m.importerZip(ctx);
    assert.deepEqual(r.chargees, []);
    assert.deepEqual(couches.appels, []);
    assert.deepEqual(reglages.ecritures, []);
    const reg2 = faussesReglages({ [`cerf/${ID}`]: JSON.stringify([entree('z.zip', 'a')]) });
    const d = m.demarrerProjet({ variables: { cerf_id: ID }, reglages: reg2, dossierProjet: p, existe: () => true, chargerCouche: (s, n) => couches.charger(s, n) });
    assert.match(d.message, /Dossier du projet inconnu/);
    assert.deepEqual(couches.appels, []);
    const tel = { appels: [], rmFile(c) { this.appels.push(c); return true; } };
    const rc = m.retirerCouche({ cerfId: ID, dossierProjet: p, zip: 'z.zip', couche: 'a', reglages: reg2, retirerDeLaCarte: () => {}, platformUtilities: tel });
    assert.equal(rc.efface, false);
    assert.deepEqual(tel.appels, []);
  }
});

// ============================================================================ décision 4 : doublon de nom
test('décision 4 : deux GeoJSON de même nom dans deux dossiers -> la seconde refusée avec un message', async () => {
  const m = await M();
  const { ctx, couches, reglages } = ctxImport({ ctx: { octets: zipDe('a/UG.geojson', 'b/UG.geojson', 'c.geojson') } });
  const r = m.importerZip(ctx);
  assert.deepEqual(couches.appels.map((a) => a.source), [`/vsizip/${COPIES}/x.zip/a/UG.geojson`, `/vsizip/${COPIES}/x.zip/c.geojson`]);
  assert.deepEqual(r.refusees.map((x) => x.couche), ['UG']);
  assert.equal(r.refusees[0].entree, 'b/UG.geojson');
  assert.match(r.refusees[0].raison, /double/);
  assert.deepEqual(m.lireRegistre(reglages, ID).map((x) => x.chemin_vsi), ['x.zip/a/UG.geojson', 'x.zip/c.geojson']);
});

// ============================================================================ import : messages, dates
test('importerZip : message de bilan (singulier, pluriel, refus) et date par défaut', async () => {
  const m = await M();
  const { ctx } = ctxImport({ ctx: { maintenant: undefined } });
  const avant = Date.now();
  const r = m.importerZip(ctx);
  assert.equal(r.message, '1 couche chargée : a');
  const date = new Date(m.lireRegistre(ctx.reglages, ID)[0].ajoutee_le).getTime();
  assert.ok(date >= avant - 1000 && date <= Date.now() + 1000);
  const couches = faussesCouches({ echecs: [`/vsizip/${COPIES}/x.zip/b.geojson`] });
  const r2 = m.importerZip(ctxImport({ couches, ctx: { octets: zipDe('a.geojson', 'b.geojson', 'c.geojson') } }).ctx);
  assert.match(r2.message, /^2 couches chargées : a, c/);
  assert.match(r2.message, /b : /);
});

test('importerZip : zip sans GeoJSON -> message qui le dit', async () => {
  const m = await M();
  const r = m.importerZip(ctxImport({ ctx: { octets: zipDe('lisez-moi.txt') } }).ctx);
  assert.match(r.message, /Aucune couche GeoJSON dans x\.zip/);
});

// ============================================================================ registre
test('inscrire : une entrée remplacée garde sa place (ordre d\'affichage stable)', async () => {
  const m = await M();
  const reglages = faussesReglages();
  m.inscrire(reglages, ID, entree('a.zip', 'x'));
  m.inscrire(reglages, ID, entree('a.zip', 'y'));
  m.inscrire(reglages, ID, { ...entree('a.zip', 'x'), ajoutee_le: '2026-11-05T00:00:00.000Z' });
  assert.deepEqual(m.lireRegistre(reglages, ID).map((e) => e.couche), ['x', 'y']);
});

test('registre illisible (texte non JSON, ou JSON qui n\'est pas une liste) : lireRegistre rend [] ; le démarrage le dit sans écrire', async () => {
  const m = await M();
  for (const brut of ['{pas du json', '{"a":1}', '"texte"']) {
    const reglages = faussesReglages({ [`cerf/${ID}`]: brut });
    assert.deepEqual(m.lireRegistre(reglages, ID), []);
    const r = m.demarrerProjet({ variables: { cerf_id: ID }, reglages, dossierProjet: PROJET, existe: () => true, chargerCouche: () => null });
    assert.match(r.message, /registre illisible/);
    assert.deepEqual(reglages.ecritures, []);
  }
});

// ============================================================================ décision 5 : entrée douteuse
test('décision 5 : entrées douteuses vues à l\'ouverture retirées aussitôt, sans rien effacer, annoncées ; les saines rechargées', async () => {
  const m = await M();
  const saine = entree('bon.zip', 'a');
  const douteuses = [
    entree('../x.zip', 'c', '../x.zip/c.geojson'),
    entree('a/b.zip', 'c', 'a/b.zip/c.geojson'),
    entree('bon.zip', 'd', 'bon.zip/../../autre/d.geojson'),
    entree('bon.zip', 'e', 'autre.zip/e.geojson'),
    entree('bon.zip', '', 'bon.zip/f.geojson'),
    null,
    'texte',
  ];
  const reglages = faussesReglages({ [`cerf/${ID}`]: JSON.stringify([saine, ...douteuses]) });
  const couches = faussesCouches();
  const r = m.demarrerProjet({
    variables: { cerf_id: ID }, reglages, dossierProjet: PROJET, existe: () => true,
    chargerCouche: (s, n) => couches.charger(s, n),
  });
  assert.deepEqual(couches.appels, [{ source: `/vsizip/${COPIES}/bon.zip/a.geojson`, nom: 'a' }]);
  assert.deepEqual(m.lireRegistre(reglages, ID), [saine]);
  assert.equal(reglages.ecritures.length, 1, 'une seule écriture');
  assert.match(r.message, /7 entrées douteuses retirées du registre/);
  assert.match(r.message, /aucun fichier effacé/);
  assert.equal(r.douteuses, 7);
});

test('démarrage : couche illisible -> message au singulier et au pluriel', async () => {
  const m = await M();
  const reglages = faussesReglages({ [`cerf/${ID}`]: JSON.stringify([entree('z.zip', 'a'), entree('z.zip', 'b')]) });
  const un = m.demarrerProjet({ variables: { cerf_id: ID }, reglages, dossierProjet: PROJET, existe: () => true,
    chargerCouche: (s, n) => faussesCouches({ echecs: [`/vsizip/${COPIES}/z.zip/a.geojson`] }).charger(s, n) });
  assert.equal(un.message, "1 couche n'a pas pu être rechargée : illisible (a)");
  const deux = m.demarrerProjet({ variables: { cerf_id: ID }, reglages, dossierProjet: PROJET, existe: () => true,
    chargerCouche: () => { throw new Error('simulé'); } });
  assert.equal(deux.message, "2 couches n'ont pas pu être rechargées : illisibles (a, b)");
});

test('retirerCouche : message quand la copie sert encore', async () => {
  const m = await M();
  const reglages = faussesReglages({ [`cerf/${ID}`]: JSON.stringify([entree('z.zip', 'a'), entree('z.zip', 'b')]) });
  const r = m.retirerCouche({ cerfId: ID, dossierProjet: PROJET, zip: 'z.zip', couche: 'a', reglages,
    retirerDeLaCarte: () => {}, platformUtilities: { rmFile: () => true } });
  assert.equal(r.message, 'Couche retirée : a. La copie z.zip sert encore à 1 couche.');
});

// ============================================================================ forme du plugin
const FICHIERS = ['main.qml', 'Cerf.qml', 'Panneau.qml', 'cerf-logique.mjs', 'metadata.txt', 'icon.svg'];
const lire = (f) => readFileSync(join(PLUGIN, f), 'utf8');

test('forme : les six fichiers du plugin existent ; metadata.txt porte name, version, icon (src/app/qfpluginmodel.cpp L368-392)', async () => {
  for (const f of FICHIERS) assert.ok(existsSync(join(PLUGIN, f)), `absent : plugin/${f}`);
  const meta = lire('metadata.txt');
  assert.match(meta, /^\[general\]$/m);
  assert.match(meta, /^name=Cerf$/m);
  assert.match(meta, /^version=\d+\.\d+\.\d+$/m);
  assert.match(meta, /^icon=icon\.svg$/m);
  assert.match(meta, /^homepage=https:\/\/github\.com\/pobsteta\/cerf$/m);
});

test('forme : SPDX GPL-3.0-or-later dans chaque QML et module (ADR 0006)', async () => {
  for (const f of ['main.qml', 'Cerf.qml', 'Panneau.qml', 'cerf-logique.mjs', 'empaqueter.mjs']) {
    assert.match(lire(f), /SPDX-License-Identifier: GPL-3\.0-or-later/, f);
  }
});

test('forme : main.qml n\'importe aucun .mjs ; Cerf.qml importe cerf-logique.mjs ; les composants créés existent', async () => {
  const main = lire('main.qml');
  assert.ok(!/import\s+"[^"]+\.mjs"/.test(main), 'main.qml ne doit importer aucun .mjs (motif du prototype)');
  assert.match(lire('Cerf.qml'), /^import "cerf-logique\.mjs" as Logique$/m);
  const crees = [...(main + lire('Panneau.qml')).matchAll(/Qt\.createComponent\("([^"]+)"\)/g)].map((x) => x[1]);
  assert.ok(crees.includes('Cerf.qml') && crees.includes('Panneau.qml'), `créés : ${crees}`);
  for (const c of crees) assert.ok(FICHIERS.includes(c), `composant inconnu : ${c}`);
});

test('forme : cerf-logique.mjs sans import, sans ?. ni ?? ni TextDecoder (moteur QML, ADR 0005)', async () => {
  const src = lire('cerf-logique.mjs').replace(/\/\/.*$/gm, '');
  assert.ok(!/^\s*import\b/m.test(src), 'aucun import');
  assert.ok(!/\?\.|\?\?/.test(src), 'ni ?. ni ??');
  assert.ok(!/TextDecoder/.test(src), 'pas de TextDecoder');
});

test('forme : le QML appelle les fonctions de QField du plan (§ 5) ; rmFile passe par platformUtilities, donné à la logique', async () => {
  const qml = lire('main.qml') + lire('Cerf.qml') + lire('Panneau.qml');
  for (const appel of ['iface.addItemToPluginsToolbar', 'onLoadProjectEnded', 'ExpressionContextUtils.projectVariables',
    'settings.setValue', 'settings.sync', 'platformUtilities.getFile', 'FileUtils.readFileContent', 'FileUtils.fileExists',
    'LayerUtils.loadVectorLayer', 'ProjectUtils.addMapLayer', 'ProjectUtils.removeMapLayer', 'setCustomProperty',
    'platformUtilities: platformUtilities', 'Qfield.version', 'LocalFilesModel',
    'qgisProject.homePath', 'FileUtils.isWithinProjectDirectory']) {
    assert.ok(qml.includes(appel), `appel absent : ${appel}`);
  }
});

test('empaquetage : cerf.zip a main.qml à sa racine et exactement les six fichiers du plugin', async () => {
  const m = await M();
  const { empaqueter } = await import(join(PLUGIN, 'empaqueter.mjs'));
  const sortie = mkdtempSync(join(tmpdir(), 'cerf-plugin-'));
  try {
    const r = empaqueter(sortie);
    assert.equal(r.chemin, join(sortie, 'cerf.zip'));
    const noms = m.nomsDuZip(readFileSync(r.chemin));
    assert.deepEqual([...noms].sort(), [...FICHIERS].sort());
    assert.ok(noms.includes('main.qml'));
  } finally {
    rmSync(sortie, { recursive: true, force: true });
  }
});

test('mise en ligne : le workflow publie plugin-essai sur la branche, plugin-v<version> sur main (décision 2)', async () => {
  const wf = readFileSync(join(RACINE, '.github', 'workflows', 'release-plugin.yml'), 'utf8');
  assert.match(wf, /node --test/);
  assert.match(wf, /node plugin\/empaqueter\.mjs dist/);
  assert.match(wf, /plugin-essai/);
  assert.match(wf, /plugin-v\$version/);
  assert.match(wf, /mission\/008-squelette-plugin/);
});

// ============================================================================ aides du pont QML (Cerf.qml)
test('zipDeLaSource : retrouve le nom du zip d\'une source /vsizip/ du dossier des copies, sinon chaîne vide', async () => {
  const m = await M();
  assert.equal(m.zipDeLaSource(`/vsizip/${COPIES}/essai.zip/sous/a.geojson`, COPIES), 'essai.zip');
  assert.equal(m.zipDeLaSource(`/vsizip/${COPIES}/essai.zip/a.geojson`, COPIES), 'essai.zip');
  assert.equal(m.zipDeLaSource(`/vsizip/${COPIES}-voisin/essai.zip/a.geojson`, COPIES), '');
  assert.equal(m.zipDeLaSource(`/autre/${COPIES}/essai.zip/a.geojson`, COPIES), '');
  assert.equal(m.zipDeLaSource(`/vsizip/${COPIES}/essai.zip`, COPIES), '');
});

test('zipUtilise : vrai tant qu\'une entrée du registre vient de ce zip (la copie ne doit pas être effacée)', async () => {
  const m = await M();
  const reglages = faussesReglages({ [`cerf/${ID}`]: JSON.stringify([entree('z.zip', 'a')]) });
  assert.equal(m.zipUtilise(reglages, ID, 'z.zip'), true);
  assert.equal(m.zipUtilise(reglages, ID, 'y.zip'), false);
});

test('version : la constante VERSION du module est celle de metadata.txt', async () => {
  const m = await M();
  assert.match(lire('metadata.txt'), new RegExp(`^version=${m.VERSION.replace(/\./g, '\\.')}$`, 'm'));
});

test('repli du 3 novembre : Cerf.qml ne vise plus le dossier de l\'application (ni applicationDirectory, ni Imported Datasets)', async () => {
  const qml = lire('Cerf.qml');
  assert.ok(!qml.includes('applicationDirectory'), 'applicationDirectory encore appelé');
  assert.ok(!qml.includes('Imported Datasets'), 'Imported Datasets encore cité');
  assert.match(lire('metadata.txt'), /^version=0\.1\.1$/m);
});

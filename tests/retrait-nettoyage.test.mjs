// SPDX-License-Identifier: GPL-3.0-or-later
// Mission 031 : tests d'acceptation de l'effacement, au retrait d'une couche, des fichiers réécrits
// (ADR 0007 amendée par l'ADR 0008 ; spec § 3.3 « Retrait », § 9 n° 2). Écrits par le testeur AVANT le code,
// sans lire plugin/ : ROUGE ATTENDU JUSQU'À LA MISSION 031.
//
// Contrat supposé pour retirerCouche(ctx) (noms repris des tests existants, aucun inventé) :
//   - effacement par ctx.platformUtilities.rmFile(chemin) (tests/squelette.test.mjs, ADR 0007) ; le mock donne
//     AUSSI ctx.effacerFichier (nom de tests/plugin-styles.test.mjs), même fonction : le dev peut utiliser l'un ou l'autre ;
//   - ctx.existe(chemin) -> boolean (nom de tests/plugin-styles.test.mjs) sert à vérifier qu'un fichier a bien disparu.
// Les fichiers d'une couche vecteur se déduisent de son nom (ADR 0007 amendée) dans cerf-imports/<zip sans .zip>/ :
//   <couche>.gpkg, <couche>.qml, <couche>.gpkg-wal, <couche>.gpkg-shm, <couche>.gpkg.aux.xml
// (forme exacte des annexes : question posée à Pascal, la spec dit seulement « -wal, -shm, .aux.xml »).
// Le message d'un effacement raté est celui décidé par Pascal : « Fichiers restés sur l'appareil : a.gpkg, a.qml. ».
// La fausse rmFile répond faux pour un fichier absent, comme QFile::remove (ADR 0007).
// Réimport (fiche 031) : une couche absente du nouveau zip, ou refusée au réimport, perd ses fichiers (via importerZip).
// Hors champ (question ouverte de la mission 014) : dossier vide, remplacement du dossier au réimport.
// Signalé à l'orchestrateur : l'ADR 0008 § « Ce qui change » n° 1 écrit « dossier remplacé en entier à un réimport réussi »,
// alors que l'ADR 0007 amendée et la spec § 3.3 le laissent en question ouverte (014) : non tranché ici.
// L'API de QField est simulée : ces tests ne prouvent rien sur le Samsung (fiche 031, § Terrain).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { ecrireZip } from './recette/essai/zip-ecrire.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ici = dirname(fileURLToPath(import.meta.url));
// CERF_PLUGIN_031 : dossier d'un autre plugin (module jetable de la preuve de satisfiabilité) ; par défaut plugin/.
const MODULE = join(process.env.CERF_PLUGIN_031 || join(ici, '..', 'plugin'), 'cerf-logique.mjs');
const R = "rouge attendu jusqu'à la mission 031";

let charge;
async function M() {
  if (!existsSync(MODULE)) throw new Error(`${MODULE} absent : ${R}`);
  if (!charge) charge = await import(MODULE);
  return charge;
}

const ID = 'ebad8ff8-577e-48bc-9489-6bab871230c2';
const PROJET = '/storage/emulated/0/Android/data/ch.opengis.qfield/files/Imported Projects/Serre';
const COPIES = `${PROJET}/cerf-imports`;
const DATE = '2026-11-04T10:00:00.000Z';

const dossierDe = (zip) => zip.replace(/\.zip$/, '');
const vec = (zip, couche, extra = {}) => ({ zip, couche, chemin: `${dossierDe(zip)}/${couche}.gpkg`, style: 'defaut', ajoutee_le: DATE, ...extra });
const vsi = (zip, couche) => ({ zip, couche, chemin_vsi: `${zip}/${couche}.tif`, style: 'defaut', ajoutee_le: DATE });
const gpkg = (zip, couche) => `${COPIES}/${dossierDe(zip)}/${couche}.gpkg`;
const fichiers = (zip, couche) => ['.gpkg', '.qml', '.gpkg-wal', '.gpkg-shm', '.gpkg.aux.xml'].map((s) => `${COPIES}/${dossierDe(zip)}/${couche}${s}`);
const trie = (l) => [...l].sort();

function faussesReglages(entrees, cle = `cerf/${ID}`) {
  const m = new Map([[cle, JSON.stringify(entrees)]]);
  return { magasin: m, ecritures: [], value(c, d) { return m.has(c) ? m.get(c) : d; }, setValue(c, v) { m.set(c, v); this.ecritures.push(c); } };
}

// `rate` : chemins pour lesquels rmFile répond faux ; `leve` : chemins pour lesquels il lève ; `menteur` : il répond
// vrai mais le fichier reste (existe reste vrai). Le journal garde l'ordre des appels (carte puis effacements).
function monde({ entrees, disque = [], rate = [], leve = [], menteur = [] }) {
  const journal = [];
  const appels = [];
  const sur_disque = new Set(disque);
  const rm = (chemin) => {
    journal.push('effacer ' + chemin); appels.push(chemin);
    if (leve.includes(chemin)) throw new Error('refusé (simulé)');
    if (menteur.includes(chemin)) return true;
    // QFile::remove (ADR 0007, prototype/PLAN.md) répond faux pour un fichier absent, comme pour un échec.
    if (!sur_disque.has(chemin) || rate.includes(chemin)) return false;
    sur_disque.delete(chemin);
    return true;
  };
  const reglages = faussesReglages(entrees);
  const ctx = {
    cerfId: ID, dossierProjet: PROJET, zip: 'z.zip', couche: 'a', reglages,
    retirerDeLaCarte: (nom) => { journal.push('carte ' + nom); },
    platformUtilities: { rmFile: rm },
    effacerFichier: rm,
    existe: (chemin) => sur_disque.has(chemin),
  };
  return { ctx, journal, appels, sur_disque, reglages };
}
const lance = async (w, extra = {}) => { const m = await M(); return await Promise.resolve(m.retirerCouche({ ...w.ctx, ...extra })); };
// Mot entier : « a.gpkg » ne doit pas être trouvé dans « a.gpkg-wal » ni « a.gpkg.aux.xml » (un point final de phrase passe).
const nomme = (message, nom) => new RegExp('(^|[^\\w.-])' + nom.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '(?![-\\w]|\\.\\w)').test(message);
// Phrase décidée par Pascal : « Fichiers restés sur l'appareil : a.gpkg, a.qml. » (noms réellement restés, « , », point final).
const phraseRestes = (message) => { const m = /Fichiers restés sur l'appareil : (.*?)\.(?=\s|$)/s.exec(message); return m ? m[0] : null; };
const sansZip = (appels) => appels.filter((c) => !c.endsWith('.zip'));

// ---- Cas nominal --------------------------------------------------------------------------------
test('nominal : retirer une couche efface son .gpkg, son .qml, -wal, -shm et .aux.xml, et eux seuls (le zip reste servi par une autre couche)', async () => {
  const w = monde({
    entrees: [vec('z.zip', 'a'), vec('z.zip', 'a2'), vec('y.zip', 'a')],
    disque: [...fichiers('z.zip', 'a'), ...fichiers('z.zip', 'a2'), ...fichiers('y.zip', 'a'), `${COPIES}/z.zip`, `${COPIES}/y.zip`],
  });
  await lance(w);
  const m = await M();
  assert.deepEqual(trie(w.appels), trie(fichiers('z.zip', 'a')), `les cinq fichiers de la couche a, exactement : ${R}`);
  for (const f of fichiers('z.zip', 'a')) assert.equal(w.sur_disque.has(f), false, `${f} doit avoir disparu : ${R}`);
  for (const f of [...fichiers('z.zip', 'a2'), ...fichiers('y.zip', 'a'), `${COPIES}/z.zip`, `${COPIES}/y.zip`]) {
    assert.equal(w.sur_disque.has(f), true, `${f} ne doit pas être touché (autre couche ou autre zip, piège du préfixe de nom)`);
  }
  assert.deepEqual(m.lireRegistre(w.reglages, ID).map((x) => `${x.zip}/${x.couche}`).sort(), ['y.zip/a', 'z.zip/a2']);
});

test('nominal : seuls .gpkg et .qml existent (pas d\'annexes) -> ils disparaissent, aucun autre effacement que ceux des noms déduits', async () => {
  const deux = fichiers('z.zip', 'a').slice(0, 2);
  const w = monde({ entrees: [vec('z.zip', 'a'), vec('z.zip', 'b')], disque: [...deux, ...fichiers('z.zip', 'b')] });
  await lance(w);
  for (const f of deux) assert.equal(w.sur_disque.has(f), false, `${f} doit avoir disparu : ${R}`);
  for (const f of fichiers('z.zip', 'b')) assert.equal(w.sur_disque.has(f), true, f);
  for (const c of w.appels) assert.ok(fichiers('z.zip', 'a').includes(c), `effacement hors des noms déduits de la couche : ${c}`);
});

test('ordre : la couche est retirée de la carte AVANT tout effacement de fichier (fiche 031 ; spec § 1 geste 7)', async () => {
  const w = monde({ entrees: [vec('z.zip', 'a'), vec('z.zip', 'b')], disque: fichiers('z.zip', 'a') });
  await lance(w);
  assert.equal(w.journal.filter((l) => l === 'carte a').length, 1, `couche retirée de la carte une seule fois : ${R}`);
  const iCarte = w.journal.indexOf('carte a');
  const iEff = w.journal.findIndex((l) => l.startsWith('effacer '));
  assert.ok(iEff >= 0, `au moins un effacement : ${R}`);
  assert.ok(iCarte >= 0 && iCarte < iEff, `carte (${iCarte}) avant le premier effacement (${iEff}) : ${w.journal.join(' | ')}`);
});

test('dernière couche du zip : ses fichiers ET la copie du zip sont effacés (comportement 008 gardé), rien hors de cerf-imports/', async () => {
  const w = monde({ entrees: [vec('z.zip', 'a')], disque: [...fichiers('z.zip', 'a'), `${COPIES}/z.zip`, `${PROJET}/cerf.qgz`] });
  await lance(w);
  assert.deepEqual(trie(w.appels), trie([...fichiers('z.zip', 'a'), `${COPIES}/z.zip`]), R);
  assert.equal(w.sur_disque.has(`${PROJET}/cerf.qgz`), true);
  const iCarte = w.journal.indexOf('carte a');
  assert.ok(iCarte === 0, `la carte d'abord : ${w.journal.join(' | ')}`);
});

// ---- Gardes de chemin ----------------------------------------------------------------------------
test('garde : un chemin trafiqué au registre n\'est jamais suivi (les fichiers se déduisent du nom, ADR 0007 amendée)', async () => {
  for (const chemin of ['../../cerf.qgz', '../autre/a.gpkg', '/sdcard/a.gpkg', `${PROJET}/cerf.qgz`]) {
    const w = monde({ entrees: [vec('z.zip', 'a', { chemin }), vec('z.zip', 'b')], disque: [...fichiers('z.zip', 'a'), `${PROJET}/cerf.qgz`, '/sdcard/a.gpkg', `${COPIES}/../autre/a.gpkg`] });
    await lance(w);
    for (const c of w.appels) assert.ok(fichiers('z.zip', 'a').includes(c), `${chemin} : effacement hors des noms déduits : ${c}`);
    assert.equal(w.sur_disque.has(`${PROJET}/cerf.qgz`), true, chemin);
    assert.equal(w.sur_disque.has('/sdcard/a.gpkg'), true, chemin);
    for (const f of fichiers('z.zip', 'a')) assert.equal(w.sur_disque.has(f), false, `${chemin} : ${f} doit disparaître : ${R}`);
  }
});

test('garde : nom de couche douteux au registre (« .. », « a/b », « ../x ») -> rien n\'est effacé hors de cerf-imports/<dossier du zip>/<nom>', async () => {
  for (const couche of ['..', 'a/b', '../x', '../../cerf']) {
    const w = monde({ entrees: [vec('z.zip', couche), vec('z.zip', 'b')], disque: [`${PROJET}/cerf.qgz`, `${PROJET}/cerf.qml`, `${COPIES}/z/b.gpkg`] });
    await lance(w, { couche });
    const pasDirect = new RegExp('^' + (COPIES + '/z/').replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '[^/]+$');
    for (const c of w.appels) {
      assert.match(c, pasDirect, `couche « ${couche} » : ${c} n'est pas directement dans cerf-imports/z/`);
      assert.ok(!c.split('/').some((seg) => seg === '..' || seg === '.'), `couche « ${couche} » : segment relatif dans ${c}`);
    }
    assert.equal(w.sur_disque.has(`${PROJET}/cerf.qgz`), true, couche);
    assert.equal(w.sur_disque.has(`${COPIES}/z/b.gpkg`), true, couche);
  }
});

test('garde : zip trafiqué au registre (entrée vecteur) -> rien effacé, l\'entrée est retirée', async () => {
  for (const zip of ['../x.zip', 'a/b.zip', '/etc/x.zip', '..']) {
    const w = monde({ entrees: [{ zip, couche: 'c', chemin: `${zip}/c.gpkg`, style: 'defaut', ajoutee_le: DATE }], disque: [`${COPIES}/x/c.gpkg`, `${PROJET}/x/c.gpkg`] });
    const r = await lance(w, { zip, couche: 'c' });
    const m = await M();
    assert.deepEqual(w.appels, [], `${zip} : ${R}`);
    assert.equal(r.efface, false, zip);
    assert.deepEqual(m.lireRegistre(w.reglages, ID), [], zip);
  }
});

test('garde : dossier du projet absent ou hors forme + entrée vecteur -> rien effacé', async () => {
  for (const p of ['', '/', 'relatif', undefined]) {
    const w = monde({ entrees: [vec('z.zip', 'a')], disque: fichiers('z.zip', 'a') });
    await lance(w, { dossierProjet: p });
    assert.deepEqual(w.appels, [], `dossier ${JSON.stringify(p)} : ${R}`);
  }
});

test('garde : cerfId hors référentiel + entrée vecteur -> rien effacé, registre intact', async () => {
  for (const id of ['../..', 'pas-un-uuid', '', 'a/b']) {
    const w = monde({ entrees: [vec('z.zip', 'a')], disque: fichiers('z.zip', 'a') });
    const brut = JSON.stringify([vec('z.zip', 'a')]);
    w.reglages.magasin.set(`cerf/${id}`, brut);
    await lance(w, { cerfId: id });
    assert.deepEqual(w.appels, [], `cerfId « ${id} » : ${R}`);
    assert.equal(w.reglages.magasin.get(`cerf/${id}`), brut, id);
  }
});

test('couche inconnue du registre : rien n\'est effacé, même si des fichiers du même nom traînent', async () => {
  const w = monde({ entrees: [vec('z.zip', 'b')], disque: [...fichiers('z.zip', 'a'), ...fichiers('z.zip', 'b')] });
  await lance(w);
  assert.deepEqual(w.appels, [], R);
});

// ---- Fichier encore utilisé par une autre couche --------------------------------------------------
test('partage : un .gpkg que le registre donne encore à une autre couche n\'est pas effacé, ni ses -wal et -shm', async () => {
  const w = monde({
    entrees: [vec('z.zip', 'a'), vec('z.zip', 'autre', { chemin: 'z/a.gpkg' })],
    disque: fichiers('z.zip', 'a'),
  });
  await lance(w);
  for (const f of [gpkg('z.zip', 'a'), gpkg('z.zip', 'a') + '-wal', gpkg('z.zip', 'a') + '-shm']) {
    assert.equal(w.sur_disque.has(f), true, `${f} sert encore à la couche « autre » : ${R}`);
    assert.ok(!w.appels.includes(f), `${f} ne doit pas être effacé`);
  }
});

// ---- Effacement raté (spec § 9 n° 2 par analogie : « la copie reste, son nom est affiché ») --------
test('rmFile répond faux pour un fichier : son nom est dit, les autres fichiers sont quand même effacés, le registre est à jour', async () => {
  const m = await M();
  const [g, q, ...annexes] = fichiers('z.zip', 'a');
  const w = monde({ entrees: [vec('z.zip', 'a'), vec('z.zip', 'b')], disque: fichiers('z.zip', 'a'), rate: [g] });
  const r = await lance(w);
  assert.ok(nomme(r.message, 'a.gpkg'), `le nom du fichier resté est affiché : « ${r.message} » : ${R}`);
  assert.equal(w.sur_disque.has(g), true);
  for (const f of [q, ...annexes]) assert.equal(w.sur_disque.has(f), false, `${f} : l'échec d'un fichier n'arrête pas les autres : ${R}`);
  assert.deepEqual(m.lireRegistre(w.reglages, ID).map((x) => x.couche), ['b']);
});

test('rmFile répond faux pour tout : les noms du .gpkg et du .qml sont dits', async () => {
  const w = monde({ entrees: [vec('z.zip', 'a'), vec('z.zip', 'b')], disque: fichiers('z.zip', 'a'), rate: fichiers('z.zip', 'a') });
  const r = await lance(w);
  assert.ok(nomme(r.message, 'a.gpkg'), `« ${r.message} » : ${R}`);
  assert.ok(nomme(r.message, 'a.qml'), `« ${r.message} » : ${R}`);
  // Les cinq fichiers sont présents et tous refusent : les cinq restent, listés par la phrase décidée par Pascal (ordre libre).
  const ph = phraseRestes(r.message);
  assert.ok(ph && ph.startsWith("Fichiers restés sur l'appareil : "), r.message);
  assert.deepEqual(ph.slice("Fichiers restés sur l'appareil : ".length, -1).split(', ').sort(), ['a.gpkg', 'a.gpkg-shm', 'a.gpkg-wal', 'a.gpkg.aux.xml', 'a.qml']);
});

test('message exact (décision de Pascal) : .gpkg et .qml restés, seuls fichiers existants -> « Fichiers restés sur l\'appareil : a.gpkg, a.qml. »', async () => {
  const [g, q] = fichiers('z.zip', 'a');
  const w = monde({ entrees: [vec('z.zip', 'a'), vec('z.zip', 'b')], disque: [g, q], rate: [g, q] });
  const r = await lance(w);
  assert.equal(phraseRestes(r.message), "Fichiers restés sur l'appareil : a.gpkg, a.qml.", `« ${r.message} » : ${R}`);
});

test('annexes qui n\'ont jamais existé (seuls .gpkg et .qml sont là) : le message ne les nomme jamais comme « restées »', async () => {
  const [g, q] = fichiers('z.zip', 'a');
  const annexes = ['a.gpkg-wal', 'a.gpkg-shm', 'a.gpkg.aux.xml'];
  const cas = { 'tout est effacé': [], '.gpkg refuse': [g], '.gpkg et .qml refusent': [g, q] };
  for (const [nom, rate] of Object.entries(cas)) {
    const w = monde({ entrees: [vec('z.zip', 'a'), vec('z.zip', 'b')], disque: [g, q], rate });
    const r = await lance(w);
    for (const a of annexes) assert.ok(!r.message.includes(a), `${nom} : « ${a} » n'a jamais existé mais figure dans « ${r.message} »`);
    assert.equal(nomme(r.message, 'a.gpkg'), rate.includes(g), `${nom} : a.gpkg nommé si et seulement s'il est resté : « ${r.message} » : ${R}`);
    assert.equal(nomme(r.message, 'a.qml'), rate.includes(q), `${nom} : a.qml nommé si et seulement s'il est resté : « ${r.message} » : ${R}`);
  }
});

test('rmFile lève une erreur : pas d\'exception, le nom est dit, les autres fichiers sont tentés, le registre est à jour', async () => {
  const m = await M();
  const [g, q] = fichiers('z.zip', 'a');
  const w = monde({ entrees: [vec('z.zip', 'a'), vec('z.zip', 'b')], disque: fichiers('z.zip', 'a'), leve: [g] });
  const r = await lance(w);
  assert.ok(nomme(r.message, 'a.gpkg'), `« ${r.message} » : ${R}`);
  assert.equal(w.sur_disque.has(q), false, `le .qml est effacé malgré l'erreur sur le .gpkg : ${R}`);
  assert.deepEqual(m.lireRegistre(w.reglages, ID).map((x) => x.couche), ['b']);
});

test('rmFile répond vrai mais existe reste vrai : on ne croit pas la réponse, le nom est dit', async () => {
  const [g] = fichiers('z.zip', 'a');
  const w = monde({ entrees: [vec('z.zip', 'a'), vec('z.zip', 'b')], disque: fichiers('z.zip', 'a'), menteur: [g] });
  const r = await lance(w);
  assert.ok(nomme(r.message, 'a.gpkg'), `« ${r.message} » : ${R}`);
});

test('platformUtilities.rmFile absent (QField l\'a déplacé) : pas d\'exception, les noms des fichiers restants sont dits, registre à jour', async () => {
  const m = await M();
  const w = monde({ entrees: [vec('z.zip', 'a'), vec('z.zip', 'b')], disque: fichiers('z.zip', 'a') });
  const r = await lance(w, { platformUtilities: {}, effacerFichier: undefined });
  assert.ok(nomme(r.message, 'a.gpkg'), `« ${r.message} » : ${R}`);
  assert.deepEqual(m.lireRegistre(w.reglages, ID).map((x) => x.couche), ['b']);
});

// ---- Anciennes entrées (version 0.2.x, GeoTIFF) ----------------------------------------------------
test('entrée chemin_vsi (GeoTIFF, 0.2.x) : aucun .gpkg ni .qml n\'est visé, pas de plantage, la couche quitte le registre', async () => {
  const m = await M();
  const rodeurs = [`${COPIES}/z/t.gpkg`, `${COPIES}/z/t.qml`, `${COPIES}/z/t.gpkg-wal`, `${COPIES}/z/t.gpkg.aux.xml`];
  const w = monde({ entrees: [vsi('z.zip', 't'), vsi('z.zip', 'u')], disque: [...rodeurs, `${COPIES}/z.zip`] });
  const r = await lance(w, { couche: 't' });
  assert.deepEqual(w.appels, [], `la copie du zip reste (une autre couche s'en sert) et rien d'autre n'est visé : ${R}`);
  assert.equal(typeof r.message, 'string');
  for (const f of rodeurs) assert.equal(w.sur_disque.has(f), true, f);
  assert.deepEqual(m.lireRegistre(w.reglages, ID).map((x) => x.couche), ['u']);
});

test('entrée chemin_vsi, dernière du zip : seule la copie du zip est effacée', async () => {
  const w = monde({ entrees: [vsi('z.zip', 't')], disque: [`${COPIES}/z/t.gpkg`, `${COPIES}/z.zip`] });
  await lance(w, { couche: 't' });
  assert.deepEqual(w.appels, [`${COPIES}/z.zip`], R);
});

test('registre mêlant ancienne entrée et vecteur dans le même zip : seul le vecteur retiré perd ses fichiers', async () => {
  const w = monde({ entrees: [vsi('z.zip', 't'), vec('z.zip', 'a')], disque: [...fichiers('z.zip', 'a'), `${COPIES}/z/t.gpkg`] });
  await lance(w);
  assert.deepEqual(trie(w.appels), trie(fichiers('z.zip', 'a')), R);
  assert.equal(w.sur_disque.has(`${COPIES}/z/t.gpkg`), true);
});

// ---- Réimport : une couche sort du registre (absente du nouveau zip, ou refusée) ---------------------
// importerZip est celui de tests/squelette.test.mjs et tests/plugin-styles.test.mjs ; effacement par
// ctx.effacerFichier (plugin-styles) ou platformUtilities.rmFile (squelette), même fonction.
const GJ = '{"type":"FeatureCollection","features":[]}';
const zipDe = (...noms) => ecrireZip(noms.map((nom) => ({ nom: Buffer.from(nom, 'utf8'), donnees: Buffer.from(GJ), stocke: false, utf8: true })));
const OK = { charge: true, controle: null, message: null, avertissements: [] };
const REFUS = { charge: false, controle: 5, message: 'a.geojson : Coordonnées incohérentes : système mal déclaré ?', avertissements: [] };

function mondeImport({ disque = [], rate = [], leve = [] } = {}) {
  const sur_disque = new Set(disque);
  const appels = [];
  const m = new Map();
  const reglages = { value: (k, d) => (m.has(k) ? m.get(k) : d), setValue: (k, v) => m.set(k, v) };
  const rm = (chemin) => {
    appels.push(chemin);
    if (leve.includes(chemin)) throw new Error('refusé (simulé)');
    if (!sur_disque.has(chemin) || rate.includes(chemin)) return false;
    sur_disque.delete(chemin);
    return true;
  };
  const ctx = {
    cerfId: ID, dossierProjet: PROJET, nomZip: 'deux.zip', reglages, octets: zipDe('a.geojson', 'sous/b.geojson'),
    maintenant: () => new Date(DATE),
    ouvrirCouche: (source, nom) => ({ source, name: nom, isValid: true, readOnly: false }),
    decrireCouche: () => ({ lisible: true, systeme: 'EPSG:2154', nbEntites: 1, emprise: [600000, 6800000, 601000, 6801000] }),
    controlerCouche: () => OK,
    reecrireCouche: (c, cible) => cible,
    ecrireFichier: (chemin) => { sur_disque.add(chemin); return true; },
    ajouterALaCarte: () => {},
    existe: (chemin) => sur_disque.has(chemin),
    effacerFichier: rm,
    platformUtilities: { rmFile: rm },
  };
  return { ctx, reglages, sur_disque, appels };
}
const couchesDe = (m, reglages, zip) => m.lireRegistre(reglages, ID).filter((x) => x.zip === zip).map((x) => x.couche);

test('réimport : une couche absente du nouveau zip perd son .gpkg, son .qml et ses annexes ; les autres fichiers sont intacts', async () => {
  const m = await M();
  const w = mondeImport();
  await Promise.resolve(m.importerZip(w.ctx));
  assert.deepEqual(couchesDe(m, w.reglages, 'deux.zip'), ['a', 'b']);
  const autres = [...fichiers('y.zip', 'b'), gpkg('deux.zip', 'a')];
  for (const f of [...fichiers('deux.zip', 'b'), ...autres]) w.sur_disque.add(f);
  w.appels.length = 0;
  await Promise.resolve(m.importerZip({ ...w.ctx, octets: zipDe('a.geojson') }));
  for (const f of fichiers('deux.zip', 'b')) assert.equal(w.sur_disque.has(f), false, `${f} doit avoir disparu : ${R}`);
  for (const f of autres) assert.equal(w.sur_disque.has(f), true, `${f} ne doit pas être touché (autre zip, ou couche gardée)`);
  assert.ok(!w.appels.includes(gpkg('deux.zip', 'a')), 'le .gpkg de la couche gardée n\'est pas effacé');
  for (const c of w.appels) assert.ok(c.startsWith(`${COPIES}/deux/`), `effacement hors du dossier du zip réimporté : ${c}`);
  assert.deepEqual(couchesDe(m, w.reglages, 'deux.zip'), ['a']);
});

test('réimport : une couche refusée au réimport (contrôle) perd ses fichiers ; la couche acceptée garde les siens', async () => {
  const m = await M();
  const w = mondeImport();
  await Promise.resolve(m.importerZip(w.ctx));
  for (const f of [...fichiers('deux.zip', 'a'), ...fichiers('deux.zip', 'b')]) w.sur_disque.add(f);
  w.appels.length = 0;
  await Promise.resolve(m.importerZip({ ...w.ctx, controlerCouche: (d) => (d.nom === 'a.geojson' ? REFUS : OK) }));
  for (const f of fichiers('deux.zip', 'a')) assert.equal(w.sur_disque.has(f), false, `${f} (couche refusée) doit avoir disparu : ${R}`);
  assert.equal(w.sur_disque.has(gpkg('deux.zip', 'b')), true, 'le .gpkg de b (acceptée) reste');
  assert.ok(!w.appels.includes(gpkg('deux.zip', 'b')), 'le .gpkg de b n\'est pas effacé');
  assert.deepEqual(couchesDe(m, w.reglages, 'deux.zip'), ['b']);
});

test('réimport : effacement raté ou qui lève -> pas d\'exception, le registre est quand même à jour', async () => {
  const m = await M();
  for (const mode of ['rate', 'leve']) {
    const fb = fichiers('deux.zip', 'b');
    const w = mondeImport({ [mode]: fb });
    await Promise.resolve(m.importerZip(w.ctx));
    for (const f of fb) w.sur_disque.add(f);
    await Promise.resolve(m.importerZip({ ...w.ctx, octets: zipDe('a.geojson') }));
    assert.deepEqual(couchesDe(m, w.reglages, 'deux.zip'), ['a'], mode);
    for (const f of fb) assert.equal(w.sur_disque.has(f), true, `${mode} : ${f} reste, l'effacement a échoué`);
  }
});

test('réimport : un zip trafiqué (nom douteux) ne fait rien effacer', async () => {
  const m = await M();
  const w = mondeImport({ disque: [`${PROJET}/cerf.qgz`] });
  for (const nomZip of ['../deux.zip', 'a/b.zip', '..']) {
    await Promise.resolve(m.importerZip({ ...w.ctx, nomZip }));
    assert.deepEqual(w.appels, [], nomZip);
  }
  assert.equal(w.sur_disque.has(`${PROJET}/cerf.qgz`), true);
});

// ---- Branchement dans Cerf.qml (modèle : tests/plugin-styles.test.mjs, test « Cerf.qml : branche saveVectorLayerAs ») -----
test('Cerf.qml : l\'appel à Logique.retirerCouche passe existe (FileUtils.fileExists) et effacerFichier', () => {
  const qml = readFileSync(new URL('../plugin/Cerf.qml', import.meta.url), 'utf8');
  const appel = /Logique\.retirerCouche\(\{[\s\S]*?\}\);/.exec(qml);
  assert.ok(appel, 'appel à Logique.retirerCouche introuvable dans Cerf.qml');
  assert.match(appel[0], /existe: function \(chemin\) \{ return FileUtils\.fileExists\(chemin\); \}/, `existe non branché : ${R}`);
  assert.match(appel[0], /effacerFichier: effacerFichier/, `effacerFichier non branché : ${R}`);
});

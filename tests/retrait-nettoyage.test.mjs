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
// Hors champ (question ouverte de la mission 014) : dossier vide, remplacement du dossier au réimport.
// L'API de QField est simulée : ces tests ne prouvent rien sur le Samsung (fiche 031, § Terrain).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
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
    if (rate.includes(chemin)) return false;
    if (menteur.includes(chemin)) return true;
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
    await lance(w);
    const pasDirect = new RegExp('^' + (COPIES + '/z/').replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '[^/]+$');
    for (const c of w.appels) assert.match(c, pasDirect, `couche « ${couche} » : ${c} n'est pas directement dans cerf-imports/z/`);
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
  assert.ok(r.message.includes('a.gpkg'), `le nom du fichier resté est affiché : « ${r.message} » : ${R}`);
  assert.equal(w.sur_disque.has(g), true);
  for (const f of [q, ...annexes]) assert.equal(w.sur_disque.has(f), false, `${f} : l'échec d'un fichier n'arrête pas les autres : ${R}`);
  assert.deepEqual(m.lireRegistre(w.reglages, ID).map((x) => x.couche), ['b']);
});

test('rmFile répond faux pour tout : les noms du .gpkg et du .qml sont dits', async () => {
  const w = monde({ entrees: [vec('z.zip', 'a'), vec('z.zip', 'b')], disque: fichiers('z.zip', 'a'), rate: fichiers('z.zip', 'a') });
  const r = await lance(w);
  assert.ok(r.message.includes('a.gpkg'), `« ${r.message} » : ${R}`);
  assert.ok(r.message.includes('a.qml'), `« ${r.message} » : ${R}`);
});

test('rmFile lève une erreur : pas d\'exception, le nom est dit, les autres fichiers sont tentés, le registre est à jour', async () => {
  const m = await M();
  const [g, q] = fichiers('z.zip', 'a');
  const w = monde({ entrees: [vec('z.zip', 'a'), vec('z.zip', 'b')], disque: fichiers('z.zip', 'a'), leve: [g] });
  const r = await lance(w);
  assert.ok(r.message.includes('a.gpkg'), `« ${r.message} » : ${R}`);
  assert.equal(w.sur_disque.has(q), false, `le .qml est effacé malgré l'erreur sur le .gpkg : ${R}`);
  assert.deepEqual(m.lireRegistre(w.reglages, ID).map((x) => x.couche), ['b']);
});

test('rmFile répond vrai mais existe reste vrai : on ne croit pas la réponse, le nom est dit', async () => {
  const [g] = fichiers('z.zip', 'a');
  const w = monde({ entrees: [vec('z.zip', 'a'), vec('z.zip', 'b')], disque: fichiers('z.zip', 'a'), menteur: [g] });
  const r = await lance(w);
  assert.ok(r.message.includes('a.gpkg'), `« ${r.message} » : ${R}`);
});

test('platformUtilities.rmFile absent (QField l\'a déplacé) : pas d\'exception, les noms des fichiers restants sont dits, registre à jour', async () => {
  const m = await M();
  const w = monde({ entrees: [vec('z.zip', 'a'), vec('z.zip', 'b')], disque: fichiers('z.zip', 'a') });
  const r = await lance(w, { platformUtilities: {}, effacerFichier: undefined });
  assert.ok(r.message.includes('a.gpkg'), `« ${r.message} » : ${R}`);
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

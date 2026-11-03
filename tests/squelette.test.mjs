// SPDX-License-Identifier: GPL-3.0-or-later
// Mission 007 : tests de la LOGIQUE du squelette du plugin (mission 008), sous Node.
//
// ROUGE ATTENDU jusqu'à la mission 008 : le module `plugin/cerf-logique.mjs` n'existe pas
// encore. Chaque test commence par le charger (fonction `M()`) et échoue avec le message
// « plugin/cerf-logique.mjs absent : rouge attendu jusqu'à la mission 008 ».
//
// Ces tests ne prouvent RIEN sur QField : tous les appels à QField sont simulés (réglages,
// platformUtilities.rmFile, chargement de couche). Le vrai chargement, le bouton, la copie par
// Android, la lecture seule réelle et le redémarrage de l'appareil restent vérifiés par la
// recette sur le Samsung (docs/spec.md § 6, ADR 0005).
//
// Sources : docs/spec.md § 1 (gestes 2 à 8), § 3.3 (registre et copies), § 6 (critères 4, 8, 9),
// § 9 n° 2 (repli : la copie reste, son nom est affiché), § 10 (résultat du prototype n° 1) ;
// ADR 0003 (copie, /vsizip/, registre), ADR 0005 (modules .mjs), ADR 0007 (rmFile) ;
// prototype/PLAN.md § 3 et § 4 (formes de l'API QField simulée : variables de projet rendues
// par ExpressionContextUtils.projectVariables, platformUtilities.rmFile, LayerUtils.loadVectorLayer).
//
// CONTRAT PROPOSÉ (la spec ne nomme aucune fonction : les noms ci-dessous sont une PROPOSITION
// du testeur, à faire valider par Pascal avant la mission 008 ; voir le rendu de la mission) :
//   estProjetCerf(variables) -> boolean              variables = { cerf_id: '…' } (objet rendu par QField)
//   lireCerfId(variables) -> string | null
//   cleRegistre(cerfId) -> 'cerf/<cerf_id>'
//   dossierCopies(dossierApp, cerfId) -> '<app>/Imported Datasets/cerf/<cerf_id>'
//   cheminCopie(dossierApp, cerfId, nomZip) -> '<dossierCopies>/<nomZip>'
//   listerZip(octets) -> string[]                    noms des entrées, dans l'ordre du zip
//   couchesDuZip(noms) -> [{ couche, entree }]       couches GeoJSON seulement (squelette)
//   lireRegistre(reglages, cerfId) -> entrée[]
//   inscrire(reglages, cerfId, entrée) -> void       remplace l'entrée de même (zip, couche)
//   retirer(reglages, cerfId, { zip, couche }) -> { retiree, zipInutile }
//   importerZip(ctx) -> Promise|valeur { chargees, refusees }
//   demarrerProjet(ctx) -> Promise|valeur { actif, boutonVisible, rechargees, absentes, message }
//   retirerCouche(ctx) -> Promise|valeur { efface, message }
//   peutEffacer(chemin, dossierCopies) -> boolean
//   effacerCopie(platformUtilities, chemin, dossierCopies) -> { efface, message }
// `reglages` simule Settings de QField : { value(cle, defaut), setValue(cle, valeur) }.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ecrireZip } from './recette/essai/zip-ecrire.mjs';

const ici = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ici, '..');
const MODULE = join(RACINE, 'plugin', 'cerf-logique.mjs');
const ESSAI = join(ici, 'recette', 'essai');

// Chargement du module à tester : message de rouge explicite tant que 008 n'a pas eu lieu.
let charge;
async function M() {
  if (!existsSync(MODULE)) {
    throw new Error("plugin/cerf-logique.mjs absent : rouge attendu jusqu'à la mission 008");
  }
  charge ??= await import(MODULE);
  return charge;
}

// ---- Données d'essai -------------------------------------------------------------------------
// cerf_id : valeurs lues dans les fichiers du dépôt.
//   - cerf.qgz, variable de projet cerf_id (cerf.qgs, ligne 104 de l'archive), fabriqué le 2 nov. 2026
//   - projet d'essai du prototype : prototype/essai-projet/cerf-essai.qgs ligne 21
const ID = 'ebad8ff8-577e-48bc-9489-6bab871230c2';
const ID_AUTRE = '936eb144-5447-4094-a579-fac12a9f0595';
// Dossier de l'application : chemin FICTIF d'Android, sans valeur métier (jamais lu sur l'appareil).
const APP = '/storage/emulated/0/Android/data/ch.opengis.qfield/files';
const COPIES = `${APP}/Imported Datasets/cerf/${ID}`;

// essai.zip : les 9 entrées du protocole (tests/recette/essai/essai.zip, `unzip -l`, 9 files).
const NOMS_ESSAI = [
  'points_essai.geojson',
  'sous-dossier/notes.txt',
  'sous-dossier/shape_essai.cpg',
  'sous-dossier/shape_essai.dbf',
  'sous-dossier/shape_essai.prj',
  'sous-dossier/shape_essai.qml',
  'sous-dossier/shape_essai.qmd',
  'sous-dossier/shape_essai.shp',
  'sous-dossier/shape_essai.shx',
];
const octetsEssai = readFileSync(join(ESSAI, 'essai.zip'));
const octetsCp437 = readFileSync(join(ESSAI, 'essai-cp437.zip'));

const GJ = '{"type":"FeatureCollection","features":[]}';
const e = (nom, txt = GJ) => ({ nom: Buffer.from(nom, 'utf8'), donnees: Buffer.from(txt, 'utf8'), stocke: false, utf8: true });
const zipDe = (...noms) => ecrireZip(noms.map((n) => e(n)));
// Zip à deux couches GeoJSON, une dans un sous-dossier (spec § 3.1 : racine ou sous-dossiers).
const octetsDeux = zipDe('a.geojson', 'sous/b.geojson', 'lisez-moi.txt');

// ---- Simulations de QField -------------------------------------------------------------------
function faussesReglages(depart = {}) {
  const m = new Map(Object.entries(depart));
  return {
    magasin: m,
    ecritures: [],
    value(cle, defaut) { return m.has(cle) ? m.get(cle) : defaut; },
    setValue(cle, v) { m.set(cle, v); this.ecritures.push(cle); },
  };
}
// Simule LayerUtils.loadVectorLayer(source, nom) : rend une couche. `echecs` : sources illisibles.
function faussesCouches({ echecs = [], leve = [] } = {}) {
  const f = {
    appels: [],
    couches: [],
    charger(source, nom) {
      f.appels.push({ source, nom });
      if (leve.includes(source)) throw new Error('chargement impossible (simulé)');
      const c = { source, name: nom, isValid: !echecs.includes(source), readOnly: false };
      f.couches.push(c);
      return c;
    },
  };
  return f;
}
// Simule platformUtilities.rmFile : QFile::remove, rend un booléen (prototype/PLAN.md § 3 n° 3).
function fausseTelephonie({ rend = true } = {}) {
  return { appels: [], rmFile(chemin) { this.appels.push(chemin); return rend; } };
}
const attendre = async (v) => await v;

function ctxImport(extra = {}) {
  const couches = extra.couches ?? faussesCouches();
  const reglages = extra.reglages ?? faussesReglages();
  return {
    couches, reglages,
    ctx: {
      cerfId: ID, dossierApp: APP, nomZip: 'essai.zip', octets: octetsEssai,
      reglages, chargerCouche: (s, n) => couches.charger(s, n),
      maintenant: () => new Date('2026-11-03T10:00:00Z'),
      ...extra.ctx,
    },
  };
}

// ============================================================================================
// 1. Projet Cerf reconnu ou non (spec § 1 geste 2 ; § 3.3 ; critère 9)
// ============================================================================================
test('projet Cerf : cerf_id présent -> reconnu, et lu tel quel (§ 3.3)', async () => {
  const m = await M();
  assert.equal(m.estProjetCerf({ cerf_id: ID }), true);
  assert.equal(m.lireCerfId({ cerf_id: ID }), ID);
});

test('critère 9 : sans cerf_id (absent, vide, espaces, variables nulles) -> pas un projet Cerf', async () => {
  const m = await M();
  for (const v of [{}, { autre: 'x' }, { cerf_id: '' }, { cerf_id: '   ' }, { cerf_id: null }, null, undefined]) {
    assert.equal(m.estProjetCerf(v), false, JSON.stringify(v));
    assert.equal(m.lireCerfId(v), null, JSON.stringify(v));
  }
});

test('valeur hors référentiel : un cerf_id qui n\'est pas un UUID est refusé (il sert de nom de dossier)', async () => {
  const m = await M();
  // Un cerf_id entre dans un chemin (§ 3.3) : '..' ou '/' permettraient d'écrire hors du dossier des copies.
  for (const mauvais of ['../..', '../autre', 'a/b', ID + '/..', 'pas-un-uuid', ID.slice(0, -1), ID.toUpperCase() + 'x']) {
    assert.equal(m.estProjetCerf({ cerf_id: mauvais }), false, mauvais);
  }
});

test('critère 9 : projet sans cerf_id -> bouton caché, aucune écriture, aucune couche chargée', async () => {
  const m = await M();
  const reglages = faussesReglages({ [`cerf/${ID}`]: '[{"zip":"essai.zip"}]' });
  const couches = faussesCouches();
  const r = await attendre(m.demarrerProjet({
    variables: {}, reglages, dossierApp: APP, existe: () => true,
    chargerCouche: (s, n) => couches.charger(s, n),
  }));
  assert.equal(r.actif, false);
  assert.equal(r.boutonVisible, false);
  assert.deepEqual(couches.appels, []);
  assert.deepEqual(reglages.ecritures, []);
});

test('projet Cerf, registre vide : actif, bouton visible, rien à recharger', async () => {
  const m = await M();
  const couches = faussesCouches();
  const r = await attendre(m.demarrerProjet({
    variables: { cerf_id: ID }, reglages: faussesReglages(), dossierApp: APP, existe: () => true,
    chargerCouche: (s, n) => couches.charger(s, n),
  }));
  assert.equal(r.actif, true);
  assert.equal(r.boutonVisible, true);
  assert.deepEqual(couches.appels, []);
});

// ============================================================================================
// 2. Chemins et clé du registre (spec § 3.3 ; ADR 0003)
// ============================================================================================
test('clé du registre = cerf/<cerf_id> ; deux projets, deux clés', async () => {
  const m = await M();
  assert.equal(m.cleRegistre(ID), `cerf/${ID}`);
  assert.notEqual(m.cleRegistre(ID), m.cleRegistre(ID_AUTRE));
});

test('copies : <application>/Imported Datasets/cerf/<cerf_id>/<zip>', async () => {
  const m = await M();
  assert.equal(m.dossierCopies(APP, ID), COPIES);
  assert.equal(m.cheminCopie(APP, ID, 'essai.zip'), `${COPIES}/essai.zip`);
});

// ============================================================================================
// 3. Lire la liste d'un zip (spec § 1 geste 4 ; § 3.1)
// ============================================================================================
test('liste d\'un zip : les 9 entrées de essai.zip, depuis un Buffer et depuis un ArrayBuffer', async () => {
  const m = await M();
  assert.deepEqual([...await attendre(m.listerZip(octetsEssai))], NOMS_ESSAI);
  const ab = octetsEssai.buffer.slice(octetsEssai.byteOffset, octetsEssai.byteOffset + octetsEssai.byteLength);
  assert.deepEqual([...await attendre(m.listerZip(ab))], NOMS_ESSAI);
});

test('liste d\'un zip fait « à la Windows » (CP437) : nom accentué lu correctement (spec § 3.1)', async () => {
  const m = await M();
  assert.deepEqual([...await attendre(m.listerZip(octetsCp437))], ['forêt/parcelle_é.txt']);
});

test('saisie incomplète : octets qui ne sont pas un zip, ou zip tronqué -> erreur, pas de liste fausse', async () => {
  const m = await M();
  const faux = Buffer.from('ceci n\'est pas un zip');
  await assert.rejects(async () => { await m.listerZip(faux); }, (err) => err instanceof Error && err.message.length > 0);
  const tronque = octetsEssai.subarray(0, octetsEssai.length - 10);
  await assert.rejects(async () => { await m.listerZip(tronque); }, (err) => err instanceof Error && err.message.length > 0);
});

test('couches du zip (squelette) : seul le GeoJSON, nom sans extension, casse ignorée (spec § 3.1)', async () => {
  const m = await M();
  // essai.zip contient aussi un Shapefile, un .qml, un .qmd, un .txt : ignorés dans le squelette (008).
  assert.deepEqual(m.couchesDuZip(NOMS_ESSAI), [{ couche: 'points_essai', entree: 'points_essai.geojson' }]);
  assert.deepEqual(
    m.couchesDuZip(['x/Parcelles.GeoJSON', 'lisez-moi.txt', 'a.tif']),
    [{ couche: 'Parcelles', entree: 'x/Parcelles.GeoJSON' }],
  );
  assert.deepEqual(m.couchesDuZip([]), []);
});

// ============================================================================================
// 4. Importer un zip : charger, lecture seule, inscrire au registre (geste 5 ; ADR 0003)
// ============================================================================================
test('nominal : une couche GeoJSON du zip est chargée par /vsizip/ sur la copie, en lecture seule', async () => {
  const m = await M();
  const { ctx, couches } = ctxImport();
  const r = await attendre(m.importerZip(ctx));
  assert.equal(couches.appels.length, 1);
  assert.deepEqual(couches.appels[0], {
    source: `/vsizip/${COPIES}/essai.zip/points_essai.geojson`,
    nom: 'points_essai',
  });
  assert.equal(couches.couches[0].readOnly, true, 'couche importée : lecture seule (CLAUDE.md, Terrain)');
  assert.equal(r.chargees.length, 1);
  assert.deepEqual(r.refusees, []);
});

test('nominal : l\'entrée du registre a la forme de la spec § 3.3, chemin relatif au dossier des copies', async () => {
  const m = await M();
  const { ctx, reglages } = ctxImport();
  await attendre(m.importerZip(ctx));
  const brut = reglages.magasin.get(`cerf/${ID}`);
  assert.equal(typeof brut, 'string', 'la valeur est du JSON (texte), comme dans QSettings');
  const liste = JSON.parse(brut);
  assert.equal(liste.length, 1);
  const [en] = liste;
  assert.deepEqual(Object.keys(en).sort(), ['ajoutee_le', 'chemin_vsi', 'couche', 'style', 'zip']);
  assert.equal(en.zip, 'essai.zip');
  assert.equal(en.couche, 'points_essai');
  assert.equal(en.chemin_vsi, 'essai.zip/points_essai.geojson');
  assert.ok(!en.chemin_vsi.startsWith('/') && !en.chemin_vsi.includes(ID) && !en.chemin_vsi.includes('Imported'),
    'chemin relatif : ni dossier de l\'application, ni cerf_id');
  assert.equal(typeof en.style, 'string');
  assert.equal(new Date(en.ajoutee_le).getTime(), new Date('2026-11-03T10:00:00Z').getTime());
});

test('couches dans un sous-dossier : le chemin du zip garde le sous-dossier ; une couche par GeoJSON', async () => {
  const m = await M();
  const { ctx, couches } = ctxImport({ ctx: { nomZip: 'deux.zip', octets: octetsDeux } });
  await attendre(m.importerZip(ctx));
  assert.deepEqual(couches.appels.map((a) => a.source), [
    `/vsizip/${COPIES}/deux.zip/a.geojson`,
    `/vsizip/${COPIES}/deux.zip/sous/b.geojson`,
  ]);
  assert.deepEqual(couches.appels.map((a) => a.nom), ['a', 'b']);
});

test('critère « après chaque couche » (§ 1 geste 5) : si la 2e couche plante, la 1re est déjà inscrite', async () => {
  const m = await M();
  const couches = faussesCouches({ leve: [`/vsizip/${COPIES}/deux.zip/sous/b.geojson`] });
  const { ctx, reglages } = ctxImport({ couches, ctx: { nomZip: 'deux.zip', octets: octetsDeux } });
  let r;
  try { r = await attendre(m.importerZip(ctx)); } catch { /* l'exception est admise : l'état du registre compte */ }
  const liste = JSON.parse(reglages.magasin.get(`cerf/${ID}`));
  assert.deepEqual(liste.map((x) => x.couche), ['a']);
  if (r) assert.deepEqual(r.chargees.map((c) => c.couche ?? c.name), ['a']);
});

test('couche illisible : refusée avec un message, non inscrite ; les autres couches du zip sont chargées (§ 3.1)', async () => {
  const m = await M();
  const couches = faussesCouches({ echecs: [`/vsizip/${COPIES}/deux.zip/a.geojson`] });
  const { ctx, reglages } = ctxImport({ couches, ctx: { nomZip: 'deux.zip', octets: octetsDeux } });
  const r = await attendre(m.importerZip(ctx));
  assert.equal(r.refusees.length, 1);
  assert.equal(r.refusees[0].couche, 'a');
  assert.equal(typeof r.refusees[0].raison, 'string');
  assert.ok(r.refusees[0].raison.length > 0, 'un message par couche refusée (geste 5)');
  assert.deepEqual(JSON.parse(reglages.magasin.get(`cerf/${ID}`)).map((x) => x.couche), ['b']);
  assert.deepEqual(r.chargees.map((c) => c.couche ?? c.name), ['b']);
});

test('saisie incomplète : zip sans aucune couche GeoJSON -> rien chargé, rien écrit au registre', async () => {
  const m = await M();
  const { ctx, couches, reglages } = ctxImport({ ctx: { nomZip: 'vide.zip', octets: zipDe('lisez-moi.txt') } });
  const r = await attendre(m.importerZip(ctx));
  assert.deepEqual(couches.appels, []);
  assert.deepEqual(reglages.ecritures, []);
  assert.deepEqual(r.chargees, []);
});

test('saisie incomplète : octets qui ne sont pas un zip -> rien chargé, rien écrit (erreur ou résultat vide)', async () => {
  const m = await M();
  const { ctx, couches, reglages } = ctxImport({ ctx: { octets: Buffer.from('pas un zip') } });
  let r; let leve = false;
  try { r = await attendre(m.importerZip(ctx)); } catch { leve = true; }
  assert.ok(leve || (r && r.chargees.length === 0), 'ni exception ni résultat vide : le plugin a fait semblant');
  assert.deepEqual(couches.appels, []);
  assert.deepEqual(reglages.ecritures, []);
});

test('valeur hors référentiel : nom de zip avec chemin (« ../x.zip ») refusé, rien chargé', async () => {
  const m = await M();
  for (const nom of ['../x.zip', 'a/b.zip', '', 'essai.txt']) {
    const { ctx, couches, reglages } = ctxImport({ ctx: { nomZip: nom } });
    let r; let leve = false;
    try { r = await attendre(m.importerZip(ctx)); } catch { leve = true; }
    assert.ok(leve || (r && r.chargees.length === 0), `nom accepté à tort : « ${nom} »`);
    assert.deepEqual(couches.appels, [], nom);
    assert.deepEqual(reglages.ecritures, [], nom);
  }
});

test('doublon : zip réimporté sous le même nom -> une seule entrée par couche, couche rechargée (§ 3.3)', async () => {
  const m = await M();
  const reglages = faussesReglages();
  const couches = faussesCouches();
  await attendre(m.importerZip(ctxImport({ reglages, couches }).ctx));
  await attendre(m.importerZip(ctxImport({ reglages, couches, ctx: { maintenant: () => new Date('2026-11-04T08:00:00Z') } }).ctx));
  const liste = JSON.parse(reglages.magasin.get(`cerf/${ID}`));
  assert.equal(liste.length, 1);
  assert.equal(new Date(liste[0].ajoutee_le).getTime(), new Date('2026-11-04T08:00:00Z').getTime(), 'la nouvelle remplace l\'ancienne');
});

test('registre : l\'ajout d\'un second zip s\'accumule, sans toucher au premier (§ 3.3)', async () => {
  const m = await M();
  const reglages = faussesReglages();
  const couches = faussesCouches();
  await attendre(m.importerZip(ctxImport({ reglages, couches }).ctx));
  await attendre(m.importerZip(ctxImport({ reglages, couches, ctx: { nomZip: 'deux.zip', octets: octetsDeux } }).ctx));
  const liste = JSON.parse(reglages.magasin.get(`cerf/${ID}`));
  assert.deepEqual(liste.map((x) => `${x.zip}:${x.couche}`), ['essai.zip:points_essai', 'deux.zip:a', 'deux.zip:b']);
});

test('registre : un autre cerf_id a son propre registre (clé cerf/<cerf_id>)', async () => {
  const m = await M();
  const reglages = faussesReglages();
  await attendre(m.importerZip(ctxImport({ reglages }).ctx));
  assert.deepEqual(m.lireRegistre(reglages, ID_AUTRE), []);
  assert.equal(m.lireRegistre(reglages, ID).length, 1);
});

test('registre : lireRegistre rend [] quand la clé n\'existe pas encore', async () => {
  const m = await M();
  assert.deepEqual(m.lireRegistre(faussesReglages(), ID), []);
});

// ============================================================================================
// 5. Recharger à l'ouverture (geste 2 et 8 ; critère 4 ; § 3.3 zip absent)
// ============================================================================================
test('critère 4 (logique) : après « redémarrage » (nouveaux objets, mêmes réglages), la couche revient en lecture seule', async () => {
  const m = await M();
  const reglages = faussesReglages();
  await attendre(m.importerZip(ctxImport({ reglages }).ctx));
  // Redémarrage : plus aucune couche en mémoire ; seuls les réglages (texte) survivent.
  const reglagesRelus = faussesReglages(Object.fromEntries(reglages.magasin));
  const couches2 = faussesCouches();
  const r = await attendre(m.demarrerProjet({
    variables: { cerf_id: ID }, reglages: reglagesRelus, dossierApp: APP, existe: () => true,
    chargerCouche: (s, n) => couches2.charger(s, n),
  }));
  assert.equal(r.actif, true);
  assert.deepEqual(couches2.appels, [{ source: `/vsizip/${COPIES}/essai.zip/points_essai.geojson`, nom: 'points_essai' }]);
  assert.equal(couches2.couches[0].readOnly, true);
  assert.deepEqual(reglagesRelus.ecritures, [], 'recharger ne réécrit pas le registre');
  assert.equal(r.absentes?.length ?? 0, 0);
});

test('« existe » est interrogé avec le chemin de la copie du zip (pas de la couche)', async () => {
  const m = await M();
  const reglages = faussesReglages();
  await attendre(m.importerZip(ctxImport({ reglages }).ctx));
  const vus = [];
  await attendre(m.demarrerProjet({
    variables: { cerf_id: ID }, reglages, dossierApp: APP, existe: (c) => { vus.push(c); return true; },
    chargerCouche: (s, n) => faussesCouches().charger(s, n),
  }));
  assert.deepEqual([...new Set(vus)], [`${COPIES}/essai.zip`]);
});

test('zip absent à l\'ouverture : l\'entrée reste au registre, un message unique « N couches … zip absent » (§ 3.3)', async () => {
  const m = await M();
  const reglages = faussesReglages();
  await attendre(m.importerZip(ctxImport({ reglages, ctx: { nomZip: 'deux.zip', octets: octetsDeux } }).ctx));
  const avant = reglages.magasin.get(`cerf/${ID}`);
  const couches = faussesCouches();
  const r = await attendre(m.demarrerProjet({
    variables: { cerf_id: ID }, reglages, dossierApp: APP, existe: () => false,
    chargerCouche: (s, n) => couches.charger(s, n),
  }));
  assert.deepEqual(couches.appels, []);
  assert.equal(r.message, "2 couches n'ont pas pu être rechargées : zip absent");
  assert.equal(reglages.magasin.get(`cerf/${ID}`), avant, 'le registre n\'est pas modifié');
});

test('zip absent pour une seule couche : « 1 couche n\'a pas pu être rechargée : zip absent » (singulier)', async () => {
  const m = await M();
  const reglages = faussesReglages();
  await attendre(m.importerZip(ctxImport({ reglages }).ctx));
  const r = await attendre(m.demarrerProjet({
    variables: { cerf_id: ID }, reglages, dossierApp: APP, existe: () => false,
    chargerCouche: (s, n) => faussesCouches().charger(s, n),
  }));
  assert.equal(r.message, "1 couche n'a pas pu être rechargée : zip absent");
});

test('un zip absent ne bloque pas les couches d\'un autre zip présent', async () => {
  const m = await M();
  const reglages = faussesReglages();
  const c0 = faussesCouches();
  await attendre(m.importerZip(ctxImport({ reglages, couches: c0 }).ctx));
  await attendre(m.importerZip(ctxImport({ reglages, couches: c0, ctx: { nomZip: 'deux.zip', octets: octetsDeux } }).ctx));
  const couches = faussesCouches();
  const r = await attendre(m.demarrerProjet({
    variables: { cerf_id: ID }, reglages, dossierApp: APP, existe: (c) => c.endsWith('/essai.zip'),
    chargerCouche: (s, n) => couches.charger(s, n),
  }));
  assert.deepEqual(couches.appels.map((a) => a.nom), ['points_essai']);
  assert.equal(r.message, "2 couches n'ont pas pu être rechargées : zip absent");
  assert.equal(m.lireRegistre(reglages, ID).length, 3, 'les trois entrées restent au registre');
});

test('couche du registre qui ne se charge plus : message, entrée conservée, autres couches rechargées', async () => {
  const m = await M();
  const reglages = faussesReglages();
  const c0 = faussesCouches();
  await attendre(m.importerZip(ctxImport({ reglages, couches: c0, ctx: { nomZip: 'deux.zip', octets: octetsDeux } }).ctx));
  const couches = faussesCouches({ echecs: [`/vsizip/${COPIES}/deux.zip/a.geojson`] });
  const r = await attendre(m.demarrerProjet({
    variables: { cerf_id: ID }, reglages, dossierApp: APP, existe: () => true,
    chargerCouche: (s, n) => couches.charger(s, n),
  }));
  assert.equal(couches.appels.length, 2);
  assert.equal(typeof r.message, 'string');
  assert.ok(r.message.length > 0);
  assert.equal(m.lireRegistre(reglages, ID).length, 2);
});

// ============================================================================================
// 6. Retirer une couche (geste 7 ; critère 8 ; ADR 0007 ; § 9 n° 2)
// ============================================================================================
test('retirer : sort l\'entrée du registre ; zipInutile seulement quand plus aucune couche n\'utilise le zip', async () => {
  const m = await M();
  const reglages = faussesReglages();
  await attendre(m.importerZip(ctxImport({ reglages, ctx: { nomZip: 'deux.zip', octets: octetsDeux } }).ctx));
  const r1 = m.retirer(reglages, ID, { zip: 'deux.zip', couche: 'a' });
  assert.deepEqual(r1, { retiree: true, zipInutile: false });
  const r2 = m.retirer(reglages, ID, { zip: 'deux.zip', couche: 'b' });
  assert.deepEqual(r2, { retiree: true, zipInutile: true });
  assert.deepEqual(m.lireRegistre(reglages, ID), []);
});

test('retirer une couche absente du registre : retiree=false, registre inchangé', async () => {
  const m = await M();
  const reglages = faussesReglages();
  await attendre(m.importerZip(ctxImport({ reglages }).ctx));
  const avant = reglages.magasin.get(`cerf/${ID}`);
  assert.deepEqual(m.retirer(reglages, ID, { zip: 'essai.zip', couche: 'inconnue' }), { retiree: false, zipInutile: false });
  assert.equal(reglages.magasin.get(`cerf/${ID}`), avant);
});

test('critère 8 (logique) : couche retirée, puis « redémarrage » : elle ne revient pas', async () => {
  const m = await M();
  const reglages = faussesReglages();
  await attendre(m.importerZip(ctxImport({ reglages, ctx: { nomZip: 'deux.zip', octets: octetsDeux } }).ctx));
  m.retirer(reglages, ID, { zip: 'deux.zip', couche: 'a' });
  const couches = faussesCouches();
  await attendre(m.demarrerProjet({
    variables: { cerf_id: ID }, reglages: faussesReglages(Object.fromEntries(reglages.magasin)), dossierApp: APP,
    existe: () => true, chargerCouche: (s, n) => couches.charger(s, n),
  }));
  assert.deepEqual(couches.appels.map((a) => a.nom), ['b']);
});

test('retirerCouche : retire de la carte et du registre ; la copie reste tant qu\'une autre couche s\'en sert', async () => {
  const m = await M();
  const reglages = faussesReglages();
  await attendre(m.importerZip(ctxImport({ reglages, ctx: { nomZip: 'deux.zip', octets: octetsDeux } }).ctx));
  const tel = fausseTelephonie();
  const retirees = [];
  const r = await attendre(m.retirerCouche({
    cerfId: ID, dossierApp: APP, zip: 'deux.zip', couche: 'a', reglages,
    retirerDeLaCarte: (nom) => retirees.push(nom), platformUtilities: tel,
  }));
  assert.deepEqual(retirees, ['a']);
  assert.deepEqual(tel.appels, []);
  assert.equal(r.efface, false);
  assert.deepEqual(m.lireRegistre(reglages, ID).map((x) => x.couche), ['b']);
});

test('ADR 0007 : la dernière couche retirée -> la copie est effacée par rmFile, chemin exact', async () => {
  const m = await M();
  const reglages = faussesReglages();
  await attendre(m.importerZip(ctxImport({ reglages }).ctx));
  const tel = fausseTelephonie();
  const r = await attendre(m.retirerCouche({
    cerfId: ID, dossierApp: APP, zip: 'essai.zip', couche: 'points_essai', reglages,
    retirerDeLaCarte: () => {}, platformUtilities: tel,
  }));
  assert.deepEqual(tel.appels, [`${COPIES}/essai.zip`]);
  assert.equal(r.efface, true);
  assert.deepEqual(m.lireRegistre(reglages, ID), []);
});

test('§ 9 n° 2 : rmFile échoue -> la copie reste, son nom est affiché, le registre est quand même à jour', async () => {
  const m = await M();
  const reglages = faussesReglages();
  await attendre(m.importerZip(ctxImport({ reglages }).ctx));
  const tel = fausseTelephonie({ rend: false });
  const r = await attendre(m.retirerCouche({
    cerfId: ID, dossierApp: APP, zip: 'essai.zip', couche: 'points_essai', reglages,
    retirerDeLaCarte: () => {}, platformUtilities: tel,
  }));
  assert.equal(r.efface, false);
  assert.ok(r.message.includes('essai.zip'), 'le nom de la copie restante est affiché');
  assert.deepEqual(m.lireRegistre(reglages, ID), []);
});

test('§ 9 n° 2 : platformUtilities.rmFile absent (QField l\'a déplacé) -> même repli, sans exception', async () => {
  const m = await M();
  const reglages = faussesReglages();
  await attendre(m.importerZip(ctxImport({ reglages }).ctx));
  const r = await attendre(m.retirerCouche({
    cerfId: ID, dossierApp: APP, zip: 'essai.zip', couche: 'points_essai', reglages,
    retirerDeLaCarte: () => {}, platformUtilities: {},
  }));
  assert.equal(r.efface, false);
  assert.ok(r.message.includes('essai.zip'));
});

// ---- Garde de chemin avant rmFile (ADR 0007, rubrique « Responsable ») -------------------------
test('ADR 0007 : peutEffacer n\'admet que le contenu de Imported Datasets/cerf/<cerf_id>/', async () => {
  const m = await M();
  assert.equal(m.peutEffacer(`${COPIES}/essai.zip`, COPIES), true);
  assert.equal(m.peutEffacer(`${COPIES}/sous/essai.zip`, COPIES), true);
  const refus = [
    `${COPIES}/../${ID_AUTRE}/essai.zip`,              // remontée de dossier
    `${COPIES}-voisin/essai.zip`,                       // dossier voisin au nom préfixe
    `${APP}/Imported Datasets/cerf/${ID_AUTRE}/essai.zip`, // registre d'un autre projet
    `${APP}/Imported Projects/cerf.qgz`,                // le projet lui-même
    COPIES,                                             // le dossier lui-même
    `${COPIES}/`,
    `${COPIES}/..`,                                     // remontée sans barre finale
    `${COPIES}/sous/..`,
    '',
    'essai.zip',                                        // chemin relatif
  ];
  for (const c of refus) assert.equal(m.peutEffacer(c, COPIES), false, c);
});

test('ADR 0007 : peutEffacer ne se fie pas à son 2e argument (dossierCopies vide, racine, relatif, hors forme)', async () => {
  const m = await M();
  const mauvais = [
    '', '/', 'relatif/dossier', 'Imported Datasets/cerf/' + ID,
    `${APP}/Imported Datasets/cerf`,                    // sans <cerf_id>
    `${APP}/Imported Datasets/cerf/pas-un-uuid`,        // <cerf_id> hors référentiel
    `${APP}/Imported Datasets/cerf/${ID}/sous`,         // trop profond
    `${APP}/Imported Datasets`,
    `${APP}/Autre/cerf/${ID}`,                          // pas sous Imported Datasets/cerf
    `${APP}/Imported Datasets/cerf/${ID}/..`,
  ];
  for (const d of mauvais) {
    assert.equal(m.peutEffacer(`${d}/essai.zip`, d), false, `dossier accepté à tort : « ${d} »`);
    assert.equal(m.peutEffacer('/essai.zip', d), false, `dossier accepté à tort : « ${d} »`);
    assert.equal(m.peutEffacer(`${COPIES}/essai.zip`, d), false, `dossier accepté à tort : « ${d} »`);
  }
});

test('ADR 0007 : effacerCopie avec un dossierCopies hors forme -> rmFile jamais appelé', async () => {
  const m = await M();
  for (const d of ['', '/', 'rel', `${APP}/Imported Datasets/cerf`]) {
    const tel = fausseTelephonie();
    const r = await attendre(m.effacerCopie(tel, `${d}/essai.zip`, d));
    assert.deepEqual(tel.appels, [], d);
    assert.equal(r.efface, false);
  }
});

test('ADR 0007 : registre trafiqué (zip « ../x.zip », « a/b.zip ») -> rmFile jamais appelé ; l\'entrée est retirée, sans effacement', async () => {
  const m = await M();
  // Choix le plus prudent : aucun fichier n'est touché, mais l'agent peut retirer l'entrée douteuse.
  for (const zip of ['../x.zip', 'a/b.zip', '/etc/x.zip', '..']) {
    const reglages = faussesReglages({
      [`cerf/${ID}`]: JSON.stringify([{ zip, couche: 'c', chemin_vsi: `${zip}/c.geojson`, style: 'defaut', ajoutee_le: '2026-11-03T10:00:00.000Z' }]),
    });
    const tel = fausseTelephonie();
    const r = await attendre(m.retirerCouche({
      cerfId: ID, dossierApp: APP, zip, couche: 'c', reglages,
      retirerDeLaCarte: () => {}, platformUtilities: tel,
    }));
    assert.deepEqual(tel.appels, [], zip);
    assert.equal(r.efface, false, zip);
    assert.deepEqual(m.lireRegistre(reglages, ID), [], zip);
  }
});

test('ADR 0007 : cerfId du contexte hors référentiel -> rmFile jamais appelé, registre laissé intact', async () => {
  const m = await M();
  for (const id of ['../..', 'pas-un-uuid', '', 'a/b']) {
    const brut = JSON.stringify([{ zip: 'essai.zip', couche: 'c', chemin_vsi: 'essai.zip/c.geojson', style: 'defaut', ajoutee_le: '2026-11-03T10:00:00.000Z' }]);
    const reglages = faussesReglages({ [`cerf/${id}`]: brut });
    const tel = fausseTelephonie();
    const r = await attendre(m.retirerCouche({
      cerfId: id, dossierApp: APP, zip: 'essai.zip', couche: 'c', reglages,
      retirerDeLaCarte: () => {}, platformUtilities: tel,
    }));
    assert.deepEqual(tel.appels, [], id);
    assert.equal(r.efface, false, id);
    assert.equal(reglages.magasin.get(`cerf/${id}`), brut, `registre modifié pour cerfId « ${id} »`);
    assert.deepEqual(reglages.ecritures, [], id);
  }
});

// ---- inscrire (export exigé) -------------------------------------------------------------------
test('inscrire : écrit du JSON sous cerf/<cerf_id> ; une entrée de même (zip, couche) est remplacée, les autres gardées', async () => {
  const m = await M();
  const reglages = faussesReglages();
  const base = { style: 'defaut', ajoutee_le: '2026-11-03T10:00:00.000Z' };
  m.inscrire(reglages, ID, { zip: 'a.zip', couche: 'x', chemin_vsi: 'a.zip/x.geojson', ...base });
  m.inscrire(reglages, ID, { zip: 'a.zip', couche: 'y', chemin_vsi: 'a.zip/y.geojson', ...base });
  m.inscrire(reglages, ID, { zip: 'a.zip', couche: 'x', chemin_vsi: 'a.zip/x.geojson', style: 'defaut', ajoutee_le: '2026-11-05T00:00:00.000Z' });
  assert.equal(typeof reglages.magasin.get(`cerf/${ID}`), 'string');
  const liste = m.lireRegistre(reglages, ID);
  assert.equal(liste.length, 2);
  assert.deepEqual(liste.map((x) => x.couche).sort(), ['x', 'y']);
  assert.equal(liste.find((x) => x.couche === 'x').ajoutee_le, '2026-11-05T00:00:00.000Z');
  assert.deepEqual(m.lireRegistre(reglages, ID_AUTRE), []);
});

// REPORTÉ à une mission ultérieure (spec § 3.1) : un `.json` qui est du GeoJSON compte comme couche.
// Le reconnaître exige de lire le contenu (membre "type": "FeatureCollection"), donc un contrat
// d'API différent de couchesDuZip(noms) ; hors squelette (008 : « couches GeoJSON » = `.geojson`).

test('ADR 0007 : effacerCopie hors du dossier des copies -> rmFile jamais appelé', async () => {
  const m = await M();
  const tel = fausseTelephonie();
  const r = await attendre(m.effacerCopie(tel, `${COPIES}/../${ID_AUTRE}/essai.zip`, COPIES));
  assert.deepEqual(tel.appels, []);
  assert.equal(r.efface, false);
});

test('ADR 0007 : effacerCopie dans le dossier des copies -> un seul appel rmFile, résultat vrai', async () => {
  const m = await M();
  const tel = fausseTelephonie();
  const r = await attendre(m.effacerCopie(tel, `${COPIES}/essai.zip`, COPIES));
  assert.deepEqual(tel.appels, [`${COPIES}/essai.zip`]);
  assert.equal(r.efface, true);
});

// ============================================================================================
// 7. Forme du dépôt : les modules sont des .mjs sans .pragma ni .import (ADR 0005)
// ============================================================================================
test('ADR 0005 : plugin/cerf-logique.mjs existe, sans .pragma ni .import, et se charge sous Node', async () => {
  const m = await M();
  const src = readFileSync(MODULE, 'utf8');
  assert.ok(!/^\s*\.pragma\b/m.test(src), '.pragma interdit (ADR 0005)');
  assert.ok(!/^\s*\.import\b/m.test(src), '.import interdit (ADR 0005)');
  for (const nom of ['estProjetCerf', 'lireCerfId', 'cleRegistre', 'dossierCopies', 'cheminCopie', 'listerZip',
    'couchesDuZip', 'lireRegistre', 'inscrire', 'retirer', 'importerZip', 'demarrerProjet', 'retirerCouche',
    'peutEffacer', 'effacerCopie']) {
    assert.equal(typeof m[nom], 'function', `export manquant : ${nom}`);
  }
});

test('licence : plugin/cerf-logique.mjs porte l\'étiquette SPDX GPL-3.0-or-later (ADR 0006)', async () => {
  await M();
  const src = readFileSync(MODULE, 'utf8');
  assert.match(src, /SPDX-License-Identifier: GPL-3\.0-or-later/);
});

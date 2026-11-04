// SPDX-License-Identifier: GPL-3.0-or-later
// Mission 009 : tests de la reconnaissance des couches et du style attendu (spec § 5).
// Écrits SANS lire le code du plugin : ils partent de docs/spec.md § 5 (consultée le 4 novembre 2026,
// branche mission/010-styles = origin/main e950dc5) et de la fiche 009.
//
// ROUGE ATTENDU JUSQU'À LA MISSION 010 : le module plugin/cerf-styles.mjs n'existe pas encore.
//
// CONTRAT PROPOSÉ à la mission 010 (module `plugin/cerf-styles.mjs`, fonctions pures, sans QField ni QGIS) :
//
//   reconnaitre({ nom, geometrie, champs, qml }) -> { regle, source }
//     nom        : nom de la couche SANS extension (« Parcelles_serre » pour Parcelles_serre.gpkg)
//     geometrie  : 'polygone' | 'point' | 'ligne' (les Multi* sont ramenées à leur type par l'appelant)
//     champs     : tableau de noms de champs (peut être absent ou vide)
//     qml        : contenu du .qml de même nom trouvé dans le zip, ou absent/null
//     regle      : 'UG' | 'Parcelles' | 'FRT' | 'ProdBois' | null (null = style par défaut de QGIS)
//     source     : 'qml' | 'nom' | 'champs' | 'defaut'      (ordre de priorité du § 5)
//     Quand un .qml est fourni : { regle: null, source: 'qml' } (le .qml gagne, le plugin le lit lui-même).
//
//   styleDe(regle, { champCode }) -> style | null
//     champCode : nom du champ de code (UG, Parcelles, FRT) ; sans effet pour ProdBois.
//     style = { symbole, etiquette } exactement comme les constantes ATTENDU et PRODBOIS ci-dessous.
//
//   trouverQml(cheminCouche, cheminsDuZip) -> chemin du .qml | null
//     même dossier, même nom de base, extension .qml (casse ignorée) ; un .qmd n'est jamais un style.
//
// Ce que ces tests ne prouvent pas : ils portent sur la logique pure. Ni le rendu dans QField, ni la
// lecture du .qml par le plugin, ni l'application du style à une vraie couche ne sont couverts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ici = dirname(fileURLToPath(import.meta.url));
const SPEC = join(ici, '..', 'docs', 'spec.md');
// Variable CERF_STYLES_MODULE : sert uniquement à vérifier ces tests sur un module jetable non versé.
const MODULE = process.env.CERF_STYLES_MODULE ?? join(ici, '..', 'plugin', 'cerf-styles.mjs');

let charge;
async function M() {
  if (!existsSync(MODULE)) throw new Error('plugin/cerf-styles.mjs absent : rouge attendu jusqu\'à la mission 010');
  charge ??= await import(MODULE);
  for (const f of ['reconnaitre', 'styleDe', 'trouverQml']) {
    if (typeof charge[f] !== 'function') throw new Error(`${f}() non exportée : rouge attendu jusqu'à la mission 010`);
  }
  return charge;
}

// ---- Valeurs du § 5 (source : docs/spec.md, tableau ; couleurs et tailles = mail de JFC, 2 nov. 2026) ----
const ATTENDU = {
  UG: { symbole: { type: 'contour', couleur: '#0000FF', epaisseur_mm: 0.6, opacite_pct: 100, remplissage: false },
        etiquette: { taille_pt: 10, couleur: '#0000FF' } },
  Parcelles: { symbole: { type: 'contour', couleur: '#FF8C00', epaisseur_mm: 1, opacite_pct: 100, remplissage: false },
        etiquette: { taille_pt: 15, couleur: '#FF8C00' } },
  FRT: { symbole: { type: 'contour', couleur: '#008B8B', epaisseur_mm: 0.6, opacite_pct: 100, remplissage: false },
        etiquette: { taille_pt: 10, couleur: '#008B8B' } },
};
// « noir » et « blanc » du § 5 sont lus #000000 et #FFFFFF (hypothèse du testeur, à confirmer).
const PRODBOIS = {
  symbole: { type: 'cercle', couleur: '#000000', taille_mm: 2, remplissage: true },
  etiquette: { expression: '"essence" || \'\\n\' || "diametre"', taille_pt: 8, couleur: '#000000', lisere: { couleur: '#FFFFFF' } },
};
// Noms des champs de code : VALEURS PROVISOIRES (fiche 009), à lire dans les fichiers de JFC avant la recette.
const CODE = { UG: 'CODE_UG', Parcelles: 'CODE_PARC', FRT: 'CODE_FRT' };

const poly = (nom, extra = {}) => ({ nom, geometrie: 'polygone', champs: [], ...extra });
const pts = (nom, champs, extra = {}) => ({ nom, geometrie: 'point', champs, ...extra });
const DEFAUT = { regle: null, source: 'defaut' };

// ---- 1. Oracle indépendant : le tableau de la spec lui-même (passe sans le plugin) ----
function tableauSpec() {
  const lignes = readFileSync(SPEC, 'utf8').split('\n').filter((l) => /^\| (UG|Parcelles|FRT|ProdBois) /.test(l));
  return lignes.map((l) => l.split(/(?<!\\)\|/).map((c) => c.trim()).filter(Boolean));
}
const norm = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

test('spec § 5 : le tableau a 4 lignes, et les valeurs de ces tests sont celles de la spec', () => {
  const t = tableauSpec();
  assert.equal(t.length, 4);
  assert.deepEqual(t.map((r) => r[0].split(' ')[0]), ['UG', 'Parcelles', 'FRT', 'ProdBois']);
  for (const r of t.slice(0, 3)) {
    const e = ATTENDU[r[0]];
    assert.ok(r[3].includes(e.symbole.couleur), `${r[0]} : couleur de contour`);
    assert.ok(r[3].includes(`${String(e.symbole.epaisseur_mm).replace('.', ',')} mm`), `${r[0]} : épaisseur`);
    assert.ok(r[3].includes('opacité 100 %') && r[3].includes('sans remplissage'), `${r[0]} : opacité, remplissage`);
    assert.ok(r[4].includes(`**${e.etiquette.taille_pt} pt**`) && r[4].includes(e.etiquette.couleur), `${r[0]} : étiquette`);
  }
  assert.ok(t[3][3].includes('cercle noir plein, 2 mm'));
  assert.ok(t[3][4].includes('8 pt') && t[3][4].includes('liseré blanc'));
});

const MOTIFS = () => Object.fromEntries(tableauSpec().slice(0, 3).map((r) => [r[0], new RegExp(r[1].replace(/^`|`$/g, ''))]));
const OUI = {
  UG: ['UG', 'ug', 'Ug', 'UG_serre', 'UG-1', 'UG 2', 'ug_', 'ÛG_Serre'],
  Parcelles: ['Parcelles', 'PARCELLE', 'parcelle', 'Parcelles_serre', 'parcelles-2026', 'Parcellés'],
  FRT: ['FRT', 'frt', 'Frt', 'frt-2026', 'FRT_Serre', 'FRT 1'],
};
const NON = ['ugly', 'ugs', 'ug2', 'Serre_UG', 'parcellaire', 'parcelle2', 'parcellesx', 'frtx', 'FRTS', 'Zone_inconnue', 'UG.shp', ''];

test('oracle : les noms attendus de ces tests sont tranchés comme la spec (motifs lus dans docs/spec.md)', () => {
  const m = MOTIFS();
  for (const [r, noms] of Object.entries(OUI)) for (const n of noms) assert.ok(m[r].test(norm(n)), `${n} devrait être ${r}`);
  for (const n of NON) {
    for (const [r, re] of Object.entries(m)) assert.ok(!re.test(norm(n)), `${n} ne devrait pas être ${r}`);
  }
});

// ---- 2. Reconnaissance par le nom ----
test('nom : UG.shp, Parcelles_serre.gpkg, frt-2026.geojson, PARCELLE.shp sont reconnus (noms sans extension)', async () => {
  const { reconnaitre } = await M();
  assert.deepEqual(reconnaitre(poly('UG')), { regle: 'UG', source: 'nom' });
  assert.deepEqual(reconnaitre(poly('Parcelles_serre')), { regle: 'Parcelles', source: 'nom' });
  assert.deepEqual(reconnaitre(poly('frt-2026')), { regle: 'FRT', source: 'nom' });
  assert.deepEqual(reconnaitre(poly('PARCELLE')), { regle: 'Parcelles', source: 'nom' });
});

test('nom : tous les noms du tableau de motifs (casse, accents, séparateurs _ - espace)', async () => {
  const { reconnaitre } = await M();
  for (const [r, noms] of Object.entries(OUI)) {
    for (const n of noms) assert.deepEqual(reconnaitre(poly(n)), { regle: r, source: 'nom' }, n);
  }
});

test('nom : ugly.shp ne doit pas être UG, ni les autres presque-noms', async () => {
  const { reconnaitre } = await M();
  for (const n of NON) assert.deepEqual(reconnaitre(poly(n)), DEFAUT, `« ${n} »`);
});

test('nom : le motif exige la géométrie polygone (tableau § 5) ; UG en points ou lignes n\'est pas UG', async () => {
  const { reconnaitre } = await M();
  for (const g of ['point', 'ligne']) {
    for (const n of ['UG', 'Parcelles', 'FRT']) assert.deepEqual(reconnaitre({ nom: n, geometrie: g, champs: [] }), DEFAUT, `${n} ${g}`);
  }
});

// ---- 3. Reconnaissance par les champs (ProdBois / Relevés) ----
test('champs : point avec essence ET diametre = ProdBois, quel que soit son nom', async () => {
  const { reconnaitre } = await M();
  const c = ['idTige', 'essence', 'diametre', 'color'];
  assert.deepEqual(reconnaitre(pts('Serre_EA2026_p5_13_30_Res', c)), { regle: 'ProdBois', source: 'champs' });
  assert.deepEqual(reconnaitre(pts('Releves_2026', ['diametre', 'essence'])), { regle: 'ProdBois', source: 'champs' });
  assert.deepEqual(reconnaitre(pts('Saisie terrain', ['essence', 'diametre', 'remarque', 'date'])), { regle: 'ProdBois', source: 'champs' });
});

test('champs : il faut les DEUX champs ; un seul, ou aucun, donne le style par défaut', async () => {
  const { reconnaitre } = await M();
  assert.deepEqual(reconnaitre(pts('Releves', ['essence', 'remarque'])), DEFAUT);
  assert.deepEqual(reconnaitre(pts('Releves', ['diametre', 'remarque'])), DEFAUT);
  assert.deepEqual(reconnaitre(pts('Releves', [])), DEFAUT);
  assert.deepEqual(reconnaitre({ nom: 'Releves', geometrie: 'point' }), DEFAUT); // champs absents
});

test('champs : la règle ProdBois ne vaut que pour une couche ponctuelle', async () => {
  const { reconnaitre } = await M();
  assert.deepEqual(reconnaitre({ nom: 'Releves', geometrie: 'polygone', champs: ['essence', 'diametre'] }), DEFAUT);
  assert.deepEqual(reconnaitre({ nom: 'Releves', geometrie: 'ligne', champs: ['essence', 'diametre'] }), DEFAUT);
});

test('champs : un nom « ProdBois » sans les champs n\'est pas reconnu', async () => {
  const { reconnaitre } = await M();
  assert.deepEqual(reconnaitre(pts('ProdBois_export', ['idTige'])), DEFAUT);
});

// ---- 4. Priorités : .qml > nom > champs > défaut ----
test('priorité : un .qml fourni l\'emporte sur le nom (UG.qml pour UG), sur les champs, et sur le défaut', async () => {
  const { reconnaitre } = await M();
  const qml = '<qgis version="3.34"/>';
  assert.deepEqual(reconnaitre(poly('UG', { qml })), { regle: null, source: 'qml' });
  assert.deepEqual(reconnaitre(pts('Releves', ['essence', 'diametre'], { qml })), { regle: null, source: 'qml' });
  assert.deepEqual(reconnaitre(poly('Zone_inconnue', { qml })), { regle: null, source: 'qml' });
});

test('priorité : qml null ou absent = pas de .qml', async () => {
  const { reconnaitre } = await M();
  assert.deepEqual(reconnaitre(poly('UG', { qml: null })), { regle: 'UG', source: 'nom' });
  assert.deepEqual(reconnaitre(poly('UG', { qml: undefined })), { regle: 'UG', source: 'nom' });
});

test('priorité : le nom l\'emporte sur les champs (polygone UG portant essence et diametre)', async () => {
  const { reconnaitre } = await M();
  assert.deepEqual(reconnaitre(poly('UG', { champs: ['essence', 'diametre'] })), { regle: 'UG', source: 'nom' });
});

test('priorité : un point nommé UG avec essence et diametre passe aux champs (le nom ne vaut que pour un polygone)', async () => {
  const { reconnaitre } = await M();
  assert.deepEqual(reconnaitre(pts('UG', ['essence', 'diametre'])), { regle: 'ProdBois', source: 'champs' });
});

// ---- 5. Le .qml du zip : lequel appartient à quelle couche ----
test('trouverQml : même dossier, même nom de base ; .qmd ignoré', async () => {
  const { trouverQml } = await M();
  const zip = ['Serre/UG.shp', 'Serre/UG.shx', 'Serre/UG.qml', 'Serre/FRT.shp', 'Serre/FRT.qmd', 'Parcelles.qml', 'x.geojson'];
  assert.equal(trouverQml('Serre/UG.shp', zip), 'Serre/UG.qml');
  assert.equal(trouverQml('Serre/FRT.shp', zip), null); // .qmd = métadonnées, pas un style (spec § 3.1)
  assert.equal(trouverQml('Serre/Parcelles.shp', zip), null); // le .qml est à la racine, pas dans Serre/
  assert.equal(trouverQml('x.geojson', zip), null);
});

test('trouverQml : extension en majuscules acceptée (spec § 3.1 : casse des extensions ignorée) ; liste vide', async () => {
  const { trouverQml } = await M();
  assert.equal(trouverQml('UG.shp', ['UG.shp', 'UG.QML']), 'UG.QML');
  assert.equal(trouverQml('UG.shp', []), null);
});

// ---- 6. Styles exacts ----
test('style UG, Parcelles, FRT : contour seul, couleur, épaisseur, opacité, étiquette (valeurs du § 5)', async () => {
  const { styleDe } = await M();
  for (const r of ['UG', 'Parcelles', 'FRT']) {
    const s = styleDe(r, { champCode: CODE[r] });
    assert.deepEqual(s.symbole, ATTENDU[r].symbole, `${r} : symbole`);
    assert.deepEqual(s.etiquette, { champ: CODE[r], ...ATTENDU[r].etiquette }, `${r} : étiquette`);
  }
});

test('style : la couleur du contour est celle de l\'étiquette (spec § 5, fin)', async () => {
  const { styleDe } = await M();
  for (const r of ['UG', 'Parcelles', 'FRT']) {
    const s = styleDe(r, { champCode: CODE[r] });
    assert.equal(s.symbole.couleur, s.etiquette.couleur);
  }
});

test('style : le champ de code est celui qu\'on passe (valeur provisoire, jamais codée en dur)', async () => {
  const { styleDe } = await M();
  assert.equal(styleDe('UG', { champCode: 'AUTRE_CHAMP' }).etiquette.champ, 'AUTRE_CHAMP');
  assert.equal(styleDe('Parcelles', { champCode: 'N_PARC' }).etiquette.champ, 'N_PARC');
});

test('style ProdBois : cercle noir plein 2 mm ; étiquette "essence" || \'\\n\' || "diametre", 8 pt, noire, liseré blanc', async () => {
  const { styleDe } = await M();
  assert.deepEqual(styleDe('ProdBois', { champCode: null }), PRODBOIS);
  assert.deepEqual(styleDe('ProdBois', {}), PRODBOIS); // champCode sans effet
});

test('style : l\'étiquette ProdBois reste celle du mail de JFC (|| et non concat) tant qu\'il n\'a pas répondu (§ 5, § 9 n° 8)', async () => {
  const { styleDe } = await M();
  const e = styleDe('ProdBois', {}).etiquette.expression;
  assert.ok(e.includes('||') && !/concat/i.test(e), e);
});

test('style : règle nulle = pas de style imposé (défaut de QGIS)', async () => {
  const { styleDe } = await M();
  assert.equal(styleDe(null, { champCode: null }), null);
});

test('codes : toute règle produite appartient à {UG, Parcelles, FRT, ProdBois, null} ; toute source à {qml, nom, champs, defaut}', async () => {
  const { reconnaitre } = await M();
  const cas = [poly('UG'), poly('Parcelles'), poly('FRT'), pts('r', ['essence', 'diametre']), poly('ugly'), poly('UG', { qml: 'x' })];
  for (const c of cas) {
    const { regle, source } = reconnaitre(c);
    assert.ok([null, 'UG', 'Parcelles', 'FRT', 'ProdBois'].includes(regle), String(regle));
    assert.ok(['qml', 'nom', 'champs', 'defaut'].includes(source), source);
  }
});

test('pureté : reconnaitre ne modifie pas ses arguments', async () => {
  const { reconnaitre } = await M();
  const c = pts('Releves', ['essence', 'diametre']);
  const avant = JSON.stringify(c);
  reconnaitre(c);
  assert.equal(JSON.stringify(c), avant);
});

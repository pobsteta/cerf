// SPDX-License-Identifier: GPL-3.0-or-later
// Mission 009 : tests de la reconnaissance des couches et du style attendu (spec § 5).
// Écrits SANS lire le code du plugin : ils partent de docs/spec.md § 5 (consultée le 4 novembre 2026,
// y compris les décisions de Pascal du 4 novembre : polygones seuls avec avertissement, casse des champs)
// et de la fiche 009.
//
// ROUGE ATTENDU JUSQU'À LA MISSION 010 : le module plugin/cerf-styles.mjs n'existe pas encore.
//
// CONTRAT PROPOSÉ à la mission 010 (module `plugin/cerf-styles.mjs`, fonctions pures, sans QField ni QGIS) :
//
//   reconnaitre({ nom, geometrie, champs, qml }) -> { regle, source, avertissement }
//     nom        : nom de la couche SANS extension (« Parcelles_serre » pour Parcelles_serre.gpkg)
//     geometrie  : 'polygone' | 'point' | 'ligne' (les Multi* sont ramenées à leur type par l'appelant)
//     champs     : tableau de noms RÉELS de champs (peut être absent ou vide). essence et diametre sont reconnus
//                  sans tenir compte de la casse ni des accents (ESSENCE, Diametre, diamètre, DIAMÈTRE...).
//     qml        : contenu du .qml de même nom trouvé dans le zip, ou absent/null
//     regle      : 'UG' | 'Parcelles' | 'FRT' | 'ProdBois' | null (null = style par défaut de QGIS)
//     source     : 'qml' | 'nom' | 'champs' | 'defaut'      (ordre de priorité du § 5)
//     avertissement : TOUJOURS présent (objet comparé en entier) : la chaîne exacte
//                  « nom reconnu mais pas un polygone » quand le nom (sans extension, casse et accents ignorés) est celui
//                  d'UG, Parcelles ou FRT mais que la couche est ponctuelle ou linéaire ET qu'elle garde le style par
//                  défaut ; null dans tous les autres cas. Choix du testeur : un point nommé UG portant essence et
//                  diametre devient ProdBois (il a un style) : avertissement null ; un .qml fourni : null aussi.
//     Quand un .qml est fourni : { regle: null, source: 'qml', avertissement: null } (le .qml gagne, le plugin le lit lui-même).
//
//   styleDe(regle, { champCode, champEssence, champDiametre }) -> style | null
//     champCode : nom du champ de code (UG, Parcelles, FRT) ; sans effet pour ProdBois.
//     champEssence, champDiametre : noms RÉELS des champs (ProdBois seulement), trouvés par l'appelant sans tenir
//                  compte de la casse ni des accents (le nom réel, accent compris, est conservé) ; l'expression est "<champEssence>" || '\n' || "<champDiametre>". Absents :
//                  'essence' et 'diametre' (donc l'expression exacte de la spec).
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
const DEFAUT = { regle: null, source: 'defaut', avertissement: null };

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
  assert.deepEqual(reconnaitre(poly('UG')), { regle: 'UG', source: 'nom', avertissement: null });
  assert.deepEqual(reconnaitre(poly('Parcelles_serre')), { regle: 'Parcelles', source: 'nom', avertissement: null });
  assert.deepEqual(reconnaitre(poly('frt-2026')), { regle: 'FRT', source: 'nom', avertissement: null });
  assert.deepEqual(reconnaitre(poly('PARCELLE')), { regle: 'Parcelles', source: 'nom', avertissement: null });
});

test('nom : tous les noms du tableau de motifs (casse, accents, séparateurs _ - espace)', async () => {
  const { reconnaitre } = await M();
  for (const [r, noms] of Object.entries(OUI)) {
    for (const n of noms) assert.deepEqual(reconnaitre(poly(n)), { regle: r, source: 'nom', avertissement: null }, n);
  }
});

test('nom : ugly.shp ne doit pas être UG, ni les autres presque-noms', async () => {
  const { reconnaitre } = await M();
  for (const n of NON) assert.deepEqual(reconnaitre(poly(n)), DEFAUT, `« ${n} »`);
});

const AVERT = 'nom reconnu mais pas un polygone';
test('nom : UG, Parcelles, FRT en points ou lignes gardent le défaut, avec l\'avertissement « nom reconnu mais pas un polygone »', async () => {
  const { reconnaitre } = await M();
  for (const g of ['point', 'ligne']) {
    for (const n of ['UG', 'Parcelles', 'FRT', 'ug_serre', 'PARCELLE', 'frt-2026', 'Parcellés'])
      assert.deepEqual(reconnaitre({ nom: n, geometrie: g, champs: [] }), { regle: null, source: 'defaut', avertissement: AVERT }, `${n} ${g}`);
  }
  assert.deepEqual(reconnaitre({ nom: 'UG', geometrie: 'point' }), { regle: null, source: 'defaut', avertissement: AVERT }); // champs absents
});

test('nom : pas d\'avertissement pour un nom non reconnu (ugly), ni pour un polygone reconnu', async () => {
  const { reconnaitre } = await M();
  for (const g of ['point', 'ligne', 'polygone']) assert.deepEqual(reconnaitre({ nom: 'ugly', geometrie: g, champs: [] }), DEFAUT, g);
  assert.equal(reconnaitre(poly('UG')).avertissement, null);
});

test('nom : ligne nommée UG portant essence et diametre : défaut (ProdBois est ponctuel) et avertissement', async () => {
  const { reconnaitre } = await M();
  assert.deepEqual(reconnaitre({ nom: 'UG', geometrie: 'ligne', champs: ['essence', 'diametre'] }), { regle: null, source: 'defaut', avertissement: AVERT });
});

test('nom : avec un .qml, un point nommé UG n\'a pas d\'avertissement (le .qml gagne)', async () => {
  const { reconnaitre } = await M();
  assert.deepEqual(reconnaitre({ nom: 'UG', geometrie: 'point', champs: [], qml: '<qgis/>' }), { regle: null, source: 'qml', avertissement: null });
});

// ---- 3. Reconnaissance par les champs (ProdBois / Relevés) ----
test('champs : point avec essence ET diametre = ProdBois, quel que soit son nom', async () => {
  const { reconnaitre } = await M();
  const c = ['idTige', 'essence', 'diametre', 'color'];
  assert.deepEqual(reconnaitre(pts('Serre_EA2026_p5_13_30_Res', c)), { regle: 'ProdBois', source: 'champs', avertissement: null });
  assert.deepEqual(reconnaitre(pts('Releves_2026', ['diametre', 'essence'])), { regle: 'ProdBois', source: 'champs', avertissement: null });
  assert.deepEqual(reconnaitre(pts('Saisie terrain', ['essence', 'diametre', 'remarque', 'date'])), { regle: 'ProdBois', source: 'champs', avertissement: null });
});

test('champs : il faut les DEUX champs ; un seul, ou aucun, donne le style par défaut', async () => {
  const { reconnaitre } = await M();
  assert.deepEqual(reconnaitre(pts('Releves', ['essence', 'remarque'])), DEFAUT);
  assert.deepEqual(reconnaitre(pts('Releves', ['diametre', 'remarque'])), DEFAUT);
  assert.deepEqual(reconnaitre(pts('Releves', [])), DEFAUT);
  assert.deepEqual(reconnaitre({ nom: 'Releves', geometrie: 'point' }), DEFAUT); // champs absents
});

test('champs : essence et diametre reconnus sans tenir compte de la casse (ESSENCE, Diametre...)', async () => {
  const { reconnaitre } = await M();
  const PB = { regle: 'ProdBois', source: 'champs', avertissement: null };
  assert.deepEqual(reconnaitre(pts('Releves', ['ESSENCE', 'DIAMETRE'])), PB);
  assert.deepEqual(reconnaitre(pts('Releves', ['Essence', 'Diametre', 'x'])), PB);
  assert.deepEqual(reconnaitre(pts('Releves', ['diametre', 'eSsEnCe'])), PB);
  assert.deepEqual(reconnaitre(pts('Releves', ['ESSENCE', 'remarque'])), DEFAUT); // les DEUX restent exigés
  assert.deepEqual(reconnaitre(pts('Releves', ['essences', 'diametres'])), DEFAUT); // pas de correspondance partielle
});

test('champs : diamètre accentué (diamètre, DIAMÈTRE, Diamètre, éssence) reconnu comme diametre ; correspondance partielle refusée', async () => {
  const { reconnaitre } = await M();
  const PB = { regle: 'ProdBois', source: 'champs', avertissement: null };
  assert.deepEqual(reconnaitre(pts('Releves', ['essence', 'diamètre'])), PB);
  assert.deepEqual(reconnaitre(pts('Releves', ['ESSENCE', 'DIAMÈTRE'])), PB);
  assert.deepEqual(reconnaitre(pts('Releves', ['Diamètre', 'Essence', 'x'])), PB);
  assert.deepEqual(reconnaitre(pts('Releves', ['éssence', 'diametre'])), PB); // accent sur essence : même règle, sans coût
  assert.deepEqual(reconnaitre(pts('Releves', ['essence', 'diamètres'])), DEFAUT);
  assert.deepEqual(reconnaitre(pts('Releves', ['essence', 'diamètre_cm'])), DEFAUT);
  assert.deepEqual(reconnaitre(pts('Releves', ['essence', 'diamètr'])), DEFAUT);
  assert.deepEqual(reconnaitre(pts('Releves', ['essence', 'mondiamètre'])), DEFAUT);
  assert.deepEqual(reconnaitre(pts('Releves', ['diamètre', 'remarque'])), DEFAUT); // les DEUX restent exigés
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
  assert.deepEqual(reconnaitre(poly('UG', { qml })), { regle: null, source: 'qml', avertissement: null });
  assert.deepEqual(reconnaitre(pts('Releves', ['essence', 'diametre'], { qml })), { regle: null, source: 'qml', avertissement: null });
  assert.deepEqual(reconnaitre(poly('Zone_inconnue', { qml })), { regle: null, source: 'qml', avertissement: null });
});

test('priorité : qml null ou absent = pas de .qml', async () => {
  const { reconnaitre } = await M();
  assert.deepEqual(reconnaitre(poly('UG', { qml: null })), { regle: 'UG', source: 'nom', avertissement: null });
  assert.deepEqual(reconnaitre(poly('UG', { qml: undefined })), { regle: 'UG', source: 'nom', avertissement: null });
});

test('priorité : le nom l\'emporte sur les champs (polygone UG portant essence et diametre)', async () => {
  const { reconnaitre } = await M();
  assert.deepEqual(reconnaitre(poly('UG', { champs: ['essence', 'diametre'] })), { regle: 'UG', source: 'nom', avertissement: null });
});

test('priorité : un point nommé UG avec essence et diametre passe aux champs (le nom ne vaut que pour un polygone)', async () => {
  const { reconnaitre } = await M();
  assert.deepEqual(reconnaitre(pts('UG', ['essence', 'diametre'])), { regle: 'ProdBois', source: 'champs', avertissement: null });
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

test('style ProdBois : l\'étiquette garde le nom réel accentué (diamètre, DIAMÈTRE)', async () => {
  const { styleDe } = await M();
  assert.equal(styleDe('ProdBois', { champEssence: 'essence', champDiametre: 'diamètre' }).etiquette.expression, '"essence" || \'\\n\' || "diamètre"');
  assert.equal(styleDe('ProdBois', { champEssence: 'ESSENCE', champDiametre: 'DIAMÈTRE' }).etiquette.expression, '"ESSENCE" || \'\\n\' || "DIAMÈTRE"');
});

test('style ProdBois : l\'étiquette utilise le nom réel des champs (ESSENCE, Diametre) ; minuscules = expression exacte de la spec', async () => {
  const { styleDe } = await M();
  const s = styleDe('ProdBois', { champEssence: 'ESSENCE', champDiametre: 'Diametre' });
  assert.equal(s.etiquette.expression, '"ESSENCE" || \'\\n\' || "Diametre"');
  assert.deepEqual(s, { ...PRODBOIS, etiquette: { ...PRODBOIS.etiquette, expression: '"ESSENCE" || \'\\n\' || "Diametre"' } });
  assert.deepEqual(styleDe('ProdBois', { champEssence: 'essence', champDiametre: 'diametre' }), PRODBOIS);
  assert.equal(styleDe('ProdBois', { champEssence: 'Essence', champDiametre: 'DIAMETRE' }).etiquette.expression, '"Essence" || \'\\n\' || "DIAMETRE"');
});

test('style : règle nulle = pas de style imposé (défaut de QGIS)', async () => {
  const { styleDe } = await M();
  assert.equal(styleDe(null, { champCode: null }), null);
});

test('codes : toute règle produite appartient à {UG, Parcelles, FRT, ProdBois, null} ; toute source à {qml, nom, champs, defaut}', async () => {
  const { reconnaitre } = await M();
  const cas = [poly('UG'), poly('Parcelles'), poly('FRT'), pts('r', ['essence', 'diametre']), poly('ugly'), poly('UG', { qml: 'x' }), { nom: 'UG', geometrie: 'point', champs: [] }];
  for (const c of cas) {
    const { regle, source, avertissement } = reconnaitre(c);
    assert.ok(avertissement === null || avertissement === AVERT, String(avertissement));
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

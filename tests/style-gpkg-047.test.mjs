// SPDX-License-Identifier: GPL-3.0-or-later
// Mission 047 : le style enregistré dans un GeoPackage du zip (table `layer_styles`, que QGIS remplit avec
// « Enregistrer le style dans la base de données ») est lu par une couche filtrée « |subset=SELECT … » (même voie
// que gpkg_contents, mission 024) et écrit comme .qml à côté de la copie réécrite, à la place de celui de la règle
// du manuel. L'API de QField est simulée : un vert ne prouve rien sur le Samsung (la voie SELECT y est « non
// prouvée », comme pour gpkg_contents) ; la fiche terrain est essai-gpkg-style.zip.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ecrireZip } from './recette/essai/zip-ecrire.mjs';
import * as L from '../plugin/vision-logique.mjs';
import * as S from '../plugin/vision-styles.mjs';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (chemin) => readFileSync(resolve(RACINE, chemin), 'utf8');
const ID = 'd98bf4b8-0fac-4dac-85cf-58e6701aceeb';
const PROJET = '/storage/emulated/0/Android/data/ch.opengis.qfield/files/Imported Projects/Serre';
const COPIES = `${PROJET}/vision-imports`;
const SOURCE = `/vsizip/${COPIES}/x.zip/Serre.gpkg`;
const AVERT = '.qml illisible, style du manuel appliqué';

// Style « inhabituel » d'un GeoPackage : contour vert épais (celui du zip d'essai).
const QML_VERT = '<!DOCTYPE qgis PUBLIC \'http://mrcc.com/qgis.dtd\' \'SYSTEM\'>\n<qgis version="3.34"><renderer-v2 type="singleSymbol"><symbols><symbol type="fill" name="0"><layer class="SimpleFill"><Option type="Map"><Option name="outline_color" value="0,160,0,255" type="QString"/><Option name="outline_width" value="2" type="QString"/></Option></layer></symbol></symbols></renderer-v2></qgis>';

// ============================================================================ styleDuGpkg (lecture)

// Faux QField : `lignes` = les lignes que la requête rend, dans l'ordre (chaque ligne = { styleQML }) ;
// `ouverture` : 'valide' | 'invalide' | 'null' | 'leve' ; `itLeve` : le curseur lève ; `attrLeve` : attribute lève.
function faux({ lignes = [], ouverture = 'valide', itLeve = false, attrLeve = false, curseurNul = false } = {}) {
  const j = { ouvertes: [], iterateurs: 0, fermes: 0, liberees: 0, attributs: [] };
  const services = {
    ouvrir: (uri, nom) => {
      j.ouvertes.push({ uri, nom });
      if (ouverture === 'leve') throw new Error('loadVectorLayer a levé');
      if (ouverture === 'null') return null;
      return { isValid: ouverture === 'valide' };
    },
    creerIterateur: () => {
      j.iterateurs++;
      if (itLeve) throw new Error('createFeatureIterator a levé');
      if (curseurNul) return null;
      let i = 0;
      return {
        hasNext: () => i < lignes.length,
        next: () => {
          const ligne = lignes[i++];
          return { attribute: (nom) => { j.attributs.push(nom); if (attrLeve) throw new Error('attribute a levé'); return ligne[nom]; } };
        },
        close: () => { j.fermes++; },
      };
    },
    liberer: () => { j.liberees++; },
  };
  return { services, j };
}

test('requête : couche filtrée « <source>|subset=SELECT styleQML FROM layer_styles WHERE f_table_name = \'<table>\' … » (même voie que gpkg_contents)', () => {
  const { services, j } = faux({ lignes: [{ styleQML: QML_VERT }] });
  const r = L.styleDuGpkg(SOURCE, 'UG', services);
  assert.deepEqual(r, { etat: 'lu', texte: QML_VERT });
  assert.equal(j.ouvertes.length, 1);
  assert.equal(j.ouvertes[0].uri, SOURCE + '|subset=' + L.requeteStyleGpkg('UG'));
  assert.equal(j.ouvertes[0].nom, 'vision_style');
  const sql = L.requeteStyleGpkg('UG');
  assert.match(sql, /^SELECT styleQML FROM layer_styles WHERE f_table_name = 'UG' /, 'doit commencer par « SELECT » (qgsogrproviderutils.cpp l. 1390)');
  // Ordre de QGIS (qgsogrutils.cpp l. 3044-3048) : style par défaut d'abord, puis le plus récent.
  assert.match(sql, /ORDER BY CASE WHEN useAsDefault THEN 1 ELSE 2 END, update_time DESC LIMIT 1$/);
  assert.deepEqual(j.attributs, ['styleQML']);
  assert.equal(j.fermes, 1, 'le curseur est fermé');
  assert.equal(j.liberees, 1, 'la couche est libérée (deleteLater)');
});

test('requête : une apostrophe du nom de table est doublée (jamais de SQL fabriqué par un nom)', () => {
  assert.match(L.requeteStyleGpkg("O'Brien"), /f_table_name = 'O''Brien' /);
  assert.match(L.requeteStyleGpkg("a'; DROP TABLE x; --"), /f_table_name = 'a''; DROP TABLE x; --' /);
});

test('plusieurs lignes : seule la première est lue (l\'ordre est celui du SQL : par défaut d\'abord, puis la plus récente)', () => {
  const { services } = faux({ lignes: [{ styleQML: QML_VERT }, { styleQML: '<qgis><renderer-v2/></qgis>' }] });
  assert.deepEqual(L.styleDuGpkg(SOURCE, 'UG', services), { etat: 'lu', texte: QML_VERT });
});

test('aucune ligne pour la table : « absent » (la règle du manuel s\'applique, sans avertissement)', () => {
  const { services, j } = faux({ lignes: [] });
  assert.deepEqual(L.styleDuGpkg(SOURCE, 'UG', services), { etat: 'absent' });
  assert.equal(j.fermes, 1);
  assert.equal(j.liberees, 1);
});

test('pas de table layer_styles (la requête ne s\'ouvre pas : null, invalide ou exception) : « absent », rien ne plante', () => {
  for (const ouverture of ['null', 'invalide', 'leve']) {
    const { services, j } = faux({ ouverture });
    assert.deepEqual(L.styleDuGpkg(SOURCE, 'UG', services), { etat: 'absent' }, ouverture);
    assert.equal(j.iterateurs, 0, ouverture + ' : pas de lecture d\'une couche invalide');
  }
});

test('une ligne existe mais ne se lit pas (itérateur ou attribut qui lève, curseur absent) : « illisible », curseur et couche libérés', () => {
  for (const options of [{ lignes: [{ styleQML: 'x' }], attrLeve: true }, { lignes: [{ styleQML: 'x' }], itLeve: true }, { lignes: [{ styleQML: 'x' }], curseurNul: true }]) {
    const { services, j } = faux(options);
    assert.deepEqual(L.styleDuGpkg(SOURCE, 'UG', services), { etat: 'illisible' }, JSON.stringify(Object.keys(options)));
    assert.equal(j.liberees, 1);
  }
});

test('styleQML vide ou NULL : « lu » avec un texte vide (le contrôle du .qml le refuse ensuite)', () => {
  for (const v of ['', null, undefined]) {
    const { services } = faux({ lignes: [{ styleQML: v }] });
    assert.deepEqual(L.styleDuGpkg(SOURCE, 'UG', services), { etat: 'lu', texte: '' });
  }
});

test('texte long : rendu en entier (un styleQML de 200 000 caractères n\'est pas tronqué)', () => {
  const long = '<qgis><renderer-v2>' + 'x'.repeat(200000) + '</renderer-v2></qgis>';
  const { services } = faux({ lignes: [{ styleQML: long }] });
  assert.equal(L.styleDuGpkg(SOURCE, 'UG', services).texte.length, long.length);
});

test('nom de table non sûr (« | », retour à la ligne, nul, « \\ », vide, trop long) : « absent » SANS ouvrir de couche', () => {
  for (const nom of ['a|b', 'a\nb', 'a\u0000b', 'a\\b', '', 'x'.repeat(201), null, undefined, 3]) {
    const { services, j } = faux({ lignes: [{ styleQML: QML_VERT }] });
    assert.deepEqual(L.styleDuGpkg(SOURCE, nom, services), { etat: 'absent' }, JSON.stringify(nom));
    assert.equal(j.ouvertes.length, 0, JSON.stringify(nom));
  }
});

test('services absents ou incomplets : « absent », jamais d\'exception', () => {
  assert.deepEqual(L.styleDuGpkg(SOURCE, 'UG', null), { etat: 'absent' });
  assert.deepEqual(L.styleDuGpkg(SOURCE, 'UG', {}), { etat: 'absent' });
  assert.deepEqual(L.styleDuGpkg(SOURCE, 'UG', { ouvrir: () => null }), { etat: 'absent' });
});

// ============================================================================ importerZip : le style est posé

const zipDe = (...noms) => ecrireZip(noms.map((nom) => ({ nom: Buffer.from(nom, 'utf8'), donnees: Buffer.from('x'), stocke: false, utf8: true })));

// styles : table -> réponse du service styleGpkg (objet), ou Error (le service lève) ; absent = { etat: 'absent' }.
function monde({ tables = ['UG', 'Parcelles'], styles = {}, existants = [], sansService = false, noms = ['Serre.gpkg'], infos = {} } = {}) {
  const journal = [];
  const ecrits = [];
  const effaces = [];
  const disque = new Set(existants);
  const m = new Map();
  const ctx = {
    visionId: ID, dossierProjet: PROJET, nomZip: 'x.zip', octets: zipDe(...noms),
    reglages: { value: (k, d) => (m.has(k) ? m.get(k) : d), setValue: (k, v) => m.set(k, v) },
    maintenant: () => new Date('2026-11-05T10:00:00Z'),
    ouvrirCouche: (source, nom) => { journal.push('ouvrir ' + source); return { source, name: nom, isValid: true, readOnly: false }; },
    decrireCouche: () => ({ lisible: true }),
    controlerCouche: () => ({ charge: true, avertissements: [] }),
    reecrireCouche: (couche, cible) => { journal.push('reecrire ' + cible); return cible; },
    ecrireFichier: (chemin, texte) => { journal.push('ecrire ' + chemin); ecrits.push({ chemin, texte }); disque.add(chemin); return true; },
    existe: (chemin) => disque.has(chemin),
    effacerFichier: (chemin) => { journal.push('effacer ' + chemin); effaces.push(chemin); disque.delete(chemin); return true; },
    ajouterALaCarte: () => {},
    styles: S,
    infosCouche: (couche) => infos[couche.name] || { geometrie: 'polygone', champs: [] },
    lireTexte: () => null,
    tablesGpkg: () => tables,
  };
  const appels = [];
  if (!sansService) {
    ctx.styleGpkg = (source, table) => {
      journal.push('styleGpkg ' + table);
      appels.push({ source, table });
      const s = Object.prototype.hasOwnProperty.call(styles, table) ? styles[table] : { etat: 'absent' };
      if (s instanceof Error) throw s;
      return s;
    };
  }
  return { ctx, journal, ecrits, effaces, appels, registre: () => L.lireRegistre(ctx.reglages, ID) };
}
const ecritSur = (w, nom) => w.ecrits.filter((e) => e.chemin === `${COPIES}/x/${nom}.qml`);

test('style lu : écrit tel quel comme UG.qml à côté de la copie, À LA PLACE de la règle du manuel (contour bleu #0000FF absent)', () => {
  const w = monde({ tables: ['UG'], styles: { UG: { etat: 'lu', texte: QML_VERT } } });
  const r = L.importerZip(w.ctx);
  assert.deepEqual(w.ecrits, [{ chemin: `${COPIES}/x/UG.qml`, texte: QML_VERT }]);
  assert.ok(!w.ecrits[0].texte.includes('0,0,255,255'), 'pas le bleu de la règle UG');
  assert.deepEqual(r.avertissements, []);
  assert.deepEqual(r.chargees.map((c) => [c.couche, c.style]), [['UG', 'gpkg']]);
  const e = w.registre()[0];
  assert.equal(e.style, 'gpkg');
  assert.equal(e.chemin, 'x/UG.gpkg');
  assert.ok(!('qml' in e), 'pas de chemin de .qml du zip : le style vient du GeoPackage');
});

test('le service est appelé avec la source /vsizip/ du GeoPackage et la table, AVANT la réécriture, et seulement pour un GeoPackage', () => {
  const w = monde({ tables: ['UG'], styles: { UG: { etat: 'lu', texte: QML_VERT } }, noms: ['d/Serre.gpkg', 'p.geojson'] });
  L.importerZip(w.ctx);
  assert.deepEqual(w.appels, [{ source: `/vsizip/${COPIES}/x.zip/d/Serre.gpkg`, table: 'UG' }], 'pas d\'appel pour le GeoJSON');
  const i = w.journal.indexOf('styleGpkg UG');
  assert.ok(i >= 0 && i < w.journal.indexOf(`reecrire ${COPIES}/x/UG.gpkg`), w.journal.join('\n'));
  assert.ok(w.journal.indexOf(`ecrire ${COPIES}/x/UG.qml`) > w.journal.indexOf(`reecrire ${COPIES}/x/UG.gpkg`), 'le .qml est écrit avant le chargement de la copie, après sa réécriture');
});

test('deux tables : celle qui a un style le garde, l\'autre prend la règle du manuel (Parcelles : orange #FF8C00), sans avertissement', () => {
  const w = monde({ styles: { UG: { etat: 'lu', texte: QML_VERT }, Parcelles: { etat: 'absent' } } });
  const r = L.importerZip(w.ctx);
  assert.equal(ecritSur(w, 'UG')[0].texte, QML_VERT);
  assert.match(ecritSur(w, 'Parcelles')[0].texte, /name="outline_color" value="255,140,0,255"/);
  assert.deepEqual(r.avertissements, []);
  assert.deepEqual(w.registre().map((e) => [e.couche, e.style]), [['UG', 'gpkg'], ['Parcelles', 'Parcelles']]);
});

test('sans layer_styles ou table sans ligne (« absent ») : la règle du manuel comme aujourd\'hui, aucun avertissement', () => {
  const w = monde({ tables: ['UG'], styles: { UG: { etat: 'absent' } } });
  const r = L.importerZip(w.ctx);
  assert.match(ecritSur(w, 'UG')[0].texte, /name="outline_color" value="0,0,255,255"/);
  assert.deepEqual(r.avertissements, []);
  assert.equal(w.registre()[0].style, 'UG');
});

test('service styleGpkg non fourni : la règle du manuel (comportement d\'avant la mission 047, tests existants inchangés)', () => {
  const w = monde({ tables: ['UG'], sansService: true });
  const r = L.importerZip(w.ctx);
  assert.match(ecritSur(w, 'UG')[0].texte, /name="outline_color" value="0,0,255,255"/);
  assert.deepEqual(r.avertissements, []);
});

test('ligne illisible : règle du manuel + l\'avertissement existant « .qml illisible, style du manuel appliqué », chemin complet', () => {
  const w = monde({ tables: ['UG'], styles: { UG: { etat: 'illisible' } } });
  const r = L.importerZip(w.ctx);
  assert.match(ecritSur(w, 'UG')[0].texte, /name="outline_color" value="0,0,255,255"/);
  assert.deepEqual(r.avertissements, ['Serre.gpkg/UG : ' + AVERT]);
  assert.equal(w.registre()[0].style, 'UG');
  assert.equal(r.chargees.length, 1, 'la couche est chargée quand même');
});

test('styleQML vide, blanc ou non XML : règle du manuel + l\'avertissement existant (mêmes garde-fous que pour un .qml)', () => {
  const mauvais = ['', '   \n', 'pas du qml', '<html><renderer-v2/></html>', '<qgis version="3"><labeling/></qgis>', '<qgis version="3"><renderer-v2/>', '<script>alert(1)</script><qgis><renderer-v2/></qgis>'];
  for (const texte of mauvais) {
    const w = monde({ tables: ['UG'], styles: { UG: { etat: 'lu', texte } } });
    const r = L.importerZip(w.ctx);
    assert.equal(w.ecrits.length, 1, JSON.stringify(texte));
    assert.notEqual(w.ecrits[0].texte, texte, JSON.stringify(texte) + ' : jamais écrit');
    assert.match(w.ecrits[0].texte, /name="outline_color" value="0,0,255,255"/);
    assert.deepEqual(r.avertissements, ['Serre.gpkg/UG : ' + AVERT], JSON.stringify(texte));
    assert.equal(w.registre()[0].style, 'UG', JSON.stringify(texte));
  }
});

test('table au nom non reconnu (ni UG, Parcelles, FRT) mais avec style : le style du GeoPackage est posé (pas de style par défaut)', () => {
  const w = monde({ tables: ['Zone_x'], styles: { Zone_x: { etat: 'lu', texte: QML_VERT } } });
  const r = L.importerZip(w.ctx);
  assert.deepEqual(w.ecrits, [{ chemin: `${COPIES}/x/Zone_x.qml`, texte: QML_VERT }]);
  assert.deepEqual(r.avertissements, []);
});

test('table nommée UG mais ponctuelle, avec un style : le style du GeoPackage prime, aucun avertissement « pas un polygone »', () => {
  const w = monde({ tables: ['UG'], styles: { UG: { etat: 'lu', texte: QML_VERT } }, infos: { UG: { geometrie: 'point', champs: [] } } });
  const r = L.importerZip(w.ctx);
  assert.equal(ecritSur(w, 'UG')[0].texte, QML_VERT);
  assert.deepEqual(r.avertissements, []);
});

test('le service lève : règle du manuel, pas de plantage, l\'import continue', () => {
  const w = monde({ styles: { UG: new Error('boum'), Parcelles: { etat: 'lu', texte: QML_VERT } } });
  const r = L.importerZip(w.ctx);
  assert.deepEqual(r.chargees.map((c) => c.couche), ['UG', 'Parcelles']);
  assert.match(ecritSur(w, 'UG')[0].texte, /name="outline_color" value="0,0,255,255"/);
  assert.equal(ecritSur(w, 'Parcelles')[0].texte, QML_VERT);
  assert.deepEqual(r.refusees, []);
});

test('réponse du service inattendue (null, texte, état inconnu) : traitée comme « absent »', () => {
  for (const reponse of [null, undefined, 'x', 3, {}, { etat: 'autre' }, { etat: 'lu' }]) {
    const w = monde({ tables: ['UG'], styles: { UG: reponse } });
    const r = L.importerZip(w.ctx);
    assert.match(ecritSur(w, 'UG')[0].texte, /name="outline_color" value="0,0,255,255"/, JSON.stringify(reponse));
    assert.deepEqual(r.avertissements, [], JSON.stringify(reponse));
  }
});

test('ancien .qml voisin effacé AVANT l\'écriture du style du GeoPackage (règles de la mission 032 inchangées)', () => {
  const w = monde({ tables: ['UG'], styles: { UG: { etat: 'lu', texte: QML_VERT } }, existants: [`${COPIES}/x/UG.qml`] });
  L.importerZip(w.ctx);
  assert.deepEqual(w.effaces, [`${COPIES}/x/UG.qml`]);
  const jn = w.journal;
  assert.ok(jn.indexOf(`effacer ${COPIES}/x/UG.qml`) < jn.indexOf(`ecrire ${COPIES}/x/UG.qml`), jn.join('\n'));
});

test('ancien .qml qui ne s\'efface pas : couche refusée comme avant, même avec un style de GeoPackage', () => {
  const w = monde({ tables: ['UG'], styles: { UG: { etat: 'lu', texte: QML_VERT } }, existants: [`${COPIES}/x/UG.qml`] });
  w.ctx.effacerFichier = () => false;
  const r = L.importerZip(w.ctx);
  assert.deepEqual(r.refusees.map((x) => x.message), ['Serre.gpkg/UG : ancien style (.qml) impossible à effacer, couche refusée']);
  assert.deepEqual(w.ecrits, []);
});

test('écriture ratée du style du GeoPackage : style par défaut + avertissement existant « style non écrit… » (règles de la 032)', () => {
  const w = monde({ tables: ['UG'], styles: { UG: { etat: 'lu', texte: QML_VERT } } });
  w.ctx.ecrireFichier = () => false;
  const r = L.importerZip(w.ctx);
  assert.deepEqual(r.avertissements, ['Serre.gpkg/UG : style non écrit, couche chargée avec le style par défaut']);
  assert.equal(w.registre()[0].style, 'defaut');
});

test('réimport : le style du GeoPackage est relu à chaque import (un .qml d\'un import précédent n\'est jamais réutilisé)', () => {
  const w = monde({ tables: ['UG'], styles: { UG: { etat: 'lu', texte: QML_VERT } } });
  L.importerZip(w.ctx);
  w.ctx.styleGpkg = () => ({ etat: 'absent' });
  w.ctx.octets = zipDe('Serre.gpkg');
  L.importerZip(w.ctx);
  const dernier = w.ecrits[w.ecrits.length - 1];
  assert.match(dernier.texte, /name="outline_color" value="0,0,255,255"/, 'le style du manuel remplace l\'ancien');
  assert.ok(w.effaces.includes(`${COPIES}/x/UG.qml`), 'ancien .qml effacé avant');
});

// ============================================================================ forme de Vision.qml, version, déclencheur

const qml = lire('plugin/Vision.qml');
const code = qml.split('\n').filter((x) => !/^\s*\/\//.test(x)).join('\n');
const fonction = (nom) => {
  const m = new RegExp(`function ${nom}\\([\\s\\S]*?\\n  \\}\\n`).exec(code);
  assert.ok(m, `${nom} présent dans Vision.qml`);
  return m[0];
};

test('Vision.qml : styleGpkg passe par Logique.styleDuGpkg (loadVectorLayer, createFeatureIterator, deleteLater) et est branché dans importerZip', () => {
  const t = fonction('styleGpkg');
  assert.match(t, /function styleGpkg\(source, table\)/);
  assert.match(t, /return Logique\.styleDuGpkg\(source, table, \{/);
  assert.match(t, /LayerUtils\.loadVectorLayer\(uri, nom\)/);
  assert.match(t, /LayerUtils\.createFeatureIterator\(l\)/);
  assert.match(t, /l\.deleteLater\(\)/);
  assert.match(fonction('zipRecu'), /styleGpkg: styleGpkg,/);
});

test('vision-logique.mjs : la requête ne lit que styleQML de layer_styles (pas de DROP/INSERT/UPDATE/DELETE), sans ?. ni ??', () => {
  const sql = L.requeteStyleGpkg('UG');
  assert.doesNotMatch(sql, /\b(DROP|INSERT|UPDATE|DELETE|ATTACH|PRAGMA)\b/i);
  const src = lire('plugin/vision-logique.mjs').split('\n').filter((x) => !/^\s*\/\//.test(x)).join('\n');
  assert.doesNotMatch(src, /\?\./);
  assert.doesNotMatch(src, /\?\?/);
});

test('version 0.6.0 (constante, metadata.txt) et préversion : branche de la mission 050 dans release-plugin.yml', () => {
  assert.equal(L.VERSION, '0.6.0');
  assert.match(lire('plugin/metadata.txt'), /^version=0\.6\.0$/m);
  assert.match(lire('.github/workflows/release-plugin.yml'), /'mission\/050-vision'/);
});

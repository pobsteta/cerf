// Mission 024 : tests unitaires du dev, à côté des tests d'acceptation du testeur (tests/lecture-formats.test.mjs).
// Service de lecture des tables d'un GeoPackage (tablesDuGpkg, voie 1 du prototype n° 4), GeoTIFF lus en /vsizip/
// (loadRasterLayer, registre chemin_vsi), tables de GeoPackage dans importerZip, chemin complet dans le zip pour
// les messages du § 4, zip piege de bout en bout avec le vrai cerf-controles.mjs, forme de Cerf.qml, version 0.4.4.
// Coordonnées : EPSG:2154 (x = Est, y = Nord, mètres) sauf mention ; EPSG:4326 / CRS84 : x = longitude, y = latitude.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as L from '../plugin/cerf-logique.mjs';
import * as C from '../plugin/cerf-controles.mjs';
import * as S from '../plugin/cerf-styles.mjs';
import { ecrireZip } from './recette/essai/zip-ecrire.mjs';
import { fabriquerPiege } from '../outils/zips-recette.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const lire = (f) => readFileSync(join(ICI, '..', f), 'utf8');
const ID = '123e4567-e89b-42d3-a456-426614174000';
const PROJET = '/storage/emulated/0/Projet';
const COPIES = `${PROJET}/cerf-imports`;
const zipDe = (noms) => ecrireZip(noms.map((n) => ({ nom: Buffer.from(n), donnees: Buffer.from('x'), stocke: true, utf8: true })));

// ============================================================================ service des tables (tablesDuGpkg)

const SRC = `/vsizip/${COPIES}/essai.zip/d/Serre.gpkg`;
const REQ = `${SRC}|subset=SELECT table_name, data_type FROM gpkg_contents ORDER BY table_name`;
const SONDE = `${SRC}|layerid=0`;

// Faux QField : `lignes` = entités rendues par la requête ({ table_name, data_type }) ; `sondeOuvre` : la sonde
// layerid=0 rend une couche valide ; `panne` : où lever. Journal des appels, itérateurs fermés, couches libérées.
function fauxQField({ lignes = [], sondeOuvre = false, panne = {} } = {}) {
  const j = { ouvertes: [], fermes: 0, liberees: [] };
  const services = {
    ouvrir(uri, nom) {
      j.ouvertes.push(uri);
      if (uri === REQ) {
        if (panne.ouvrir === 'leve') throw new Error('GDAL');
        if (panne.ouvrir === 'null') return null;
        return { uri, nom, isValid: panne.ouvrir !== 'invalide' };
      }
      if (uri === SONDE) return { uri, nom, isValid: sondeOuvre };
      return { uri, nom, isValid: false };
    },
    creerIterateur(couche) {
      if (panne.iterateur === 'leve') throw new Error('itérateur');
      if (panne.iterateur === 'null') return null;
      let i = 0;
      return {
        hasNext() { if (panne.hasNext) throw new Error('hasNext'); return i < lignes.length; },
        next() {
          if (panne.next) throw new Error('next');
          const l = lignes[i++];
          return { attribute: (n) => l[n] };
        },
        close() { j.fermes++; if (panne.close) throw new Error('close'); },
      };
    },
    liberer(c) { j.liberees.push(c.uri); },
  };
  return { services, j };
}
const ligne = (table_name, data_type) => ({ table_name, data_type });

test('tablesDuGpkg : requête « |subset=SELECT … FROM gpkg_contents », tables « features » seules, dans l\'ordre ; itérateur fermé, couche libérée', () => {
  const { services, j } = fauxQField({ lignes: [ligne('Parcelles', 'features'), ligne('layer_styles', 'attributes'), ligne('Releves', 'features')] });
  assert.deepEqual(L.tablesDuGpkg(SRC, services), { etat: 'liste', tables: ['Parcelles', 'Releves'] });
  assert.deepEqual(j.ouvertes, [REQ], 'une seule ouverture, la requête ; pas de sonde quand des tables vecteur sont lues');
  assert.equal(j.fermes, 1);
  assert.deepEqual(j.liberees, [REQ]);
  assert.equal(L.SQL_TABLES_GPKG, 'SELECT table_name, data_type FROM gpkg_contents ORDER BY table_name', 'requête du prototype n° 4');
});

test('tablesDuGpkg : aucune ligne « features », liste lue sans erreur, sonde layerid=0 fermée -> « aucune »', () => {
  const { services, j } = fauxQField({ lignes: [ligne('ortho', 'tiles')] });
  assert.deepEqual(L.tablesDuGpkg(SRC, services), { etat: 'aucune', tables: [] });
  assert.deepEqual(j.ouvertes, [REQ, SONDE]);
  assert.deepEqual(j.liberees, [REQ, SONDE], 'la sonde aussi est libérée');
});

test('tablesDuGpkg : exigence de la relecture de la 030 : aucune table vecteur lue mais la sonde layerid ouvre une couche -> « illisible », jamais « aucune »', () => {
  const { services } = fauxQField({ lignes: [ligne('ortho', 'tiles')], sondeOuvre: true });
  assert.deepEqual(L.tablesDuGpkg(SRC, services), { etat: 'illisible', tables: [] });
  // Une table d'attributs seule, que GDAL ouvre par layerid : prudence, « illisible » (voir le rendu de la mission).
  const att = fauxQField({ lignes: [ligne('notes', 'attributes')], sondeOuvre: true });
  assert.equal(L.tablesDuGpkg(SRC, att.services).etat, 'illisible');
});

test('tablesDuGpkg : exigence de la relecture de la 030 : data_type manquant (null, undefined, vide) -> « illisible », même à côté d\'une table vecteur', () => {
  for (const manque of [null, undefined, '']) {
    const { services, j } = fauxQField({ lignes: [ligne('Parcelles', 'features'), ligne('Zones', manque)] });
    assert.deepEqual(L.tablesDuGpkg(SRC, services), { etat: 'illisible', tables: [] }, `data_type ${manque}`);
    assert.equal(j.fermes, 1, 'itérateur fermé malgré l\'erreur');
    assert.deepEqual(j.liberees, [REQ]);
  }
  for (const manque of [null, undefined, '']) {
    const { services } = fauxQField({ lignes: [ligne(manque, 'features')] });
    assert.equal(L.tablesDuGpkg(SRC, services).etat, 'illisible', `table_name ${manque}`);
  }
});

test('tablesDuGpkg : requête qui ne s\'ouvre pas, itérateur absent ou qui lève, liste vide -> « illisible » ; jamais d\'exception', () => {
  const cas = [
    ['ouvrir lève', { panne: { ouvrir: 'leve' } }],
    ['ouvrir rend null', { panne: { ouvrir: 'null' } }],
    ['requête invalide', { panne: { ouvrir: 'invalide' } }],
    ['itérateur qui lève', { lignes: [ligne('P', 'features')], panne: { iterateur: 'leve' } }],
    ['itérateur absent', { lignes: [ligne('P', 'features')], panne: { iterateur: 'null' } }],
    ['hasNext lève', { lignes: [ligne('P', 'features')], panne: { hasNext: true } }],
    ['next lève', { lignes: [ligne('P', 'features')], panne: { next: true } }],
    ['gpkg_contents lu vide (incohérent : GDAL y a ouvert une couche)', { lignes: [] }],
  ];
  for (const [quoi, monde] of cas) {
    const { services, j } = fauxQField(monde);
    assert.deepEqual(L.tablesDuGpkg(SRC, services), { etat: 'illisible', tables: [] }, quoi);
    assert.ok(!j.ouvertes.includes(SONDE), `${quoi} : pas de sonde, la liste n'a pas été lue sans erreur`);
  }
  // close qui lève ne change pas une liste bien lue.
  const { services } = fauxQField({ lignes: [ligne('P', 'features')], panne: { close: true } });
  assert.deepEqual(L.tablesDuGpkg(SRC, services), { etat: 'liste', tables: ['P'] });
  // Services absents ou incomplets.
  assert.equal(L.tablesDuGpkg(SRC, undefined).etat, 'illisible');
  assert.equal(L.tablesDuGpkg(SRC, { ouvrir: () => null }).etat, 'illisible');
});

test('tablesDuGpkg : nom de table non sûr dans « |layername= » (« | », retour à la ligne) -> « illisible » pour tout le fichier', () => {
  for (const nom of ['a|layerid=0', 'a\nb', 'a\rb']) {
    const { services } = fauxQField({ lignes: [ligne('Bon', 'features'), ligne(nom, 'features')] });
    assert.equal(L.tablesDuGpkg(SRC, services).etat, 'illisible', JSON.stringify(nom));
  }
  assert.equal(L.nomDeTableSur('Zones humides'), true);
  assert.equal(L.nomDeTableSur('Forêt'), true);
  assert.equal(L.nomDeTableSur(''), false);
  assert.equal(L.sourceDeLaCouche('/c/x.zip', { format: 'gpkg', entree: 'a.gpkg', table: 'a|b' }), '', 'pas de source pour un nom non sûr');
});

// ============================================================================ importerZip : monde simulé

// Faux QField pour importerZip : `descriptions` par nom de couche (ce que decrireCouche rendrait) ; `tables` : réponse
// du service tablesGpkg par entrée .gpkg (absent = service non fourni) ; vrai contrôle (cerf-controles.mjs) avec une
// reprojection simulée : identité en EPSG:2154, conversion approchée en EPSG:4326 (lon, lat -> L93) près de Paris.
const vers2154 = (x, y, epsg) => {
  if (epsg === 2154) return { x, y };
  if (epsg === 4326 && Math.abs(x) <= 180 && Math.abs(y) <= 90) return { x: 700000 + (x - 3) * 73000, y: 6600000 + (y - 46.5) * 111000 };
  return { x: NaN, y: NaN }; // QgsPoint() vide de QField : x et y à NaN
};
const L93 = { valide: true, epsg: 2154, authid: 'EPSG:2154' };
const W84 = { valide: true, epsg: 4326, authid: 'EPSG:4326' };
const SANS = { valide: false, epsg: 0, authid: '' };
const DANS = { xmin: 668000, ymin: 6826000, xmax: 668500, ymax: 6826500 };

function monde({ noms, descriptions = {}, tables, textes = {}, extra = {} }) {
  const stock = {}; const j = { ouvertes: [], decrites: [], ajoutees: [], reecrites: [], ecrits: [], tablesLues: [] };
  const ctx = {
    cerfId: ID, dossierProjet: PROJET, nomZip: 'essai.zip', octets: zipDe(noms),
    reglages: { value: (k, d) => (k in stock ? stock[k] : d), setValue: (k, v) => { stock[k] = v; } },
    ouvrirCouche: (source, nom, format) => { j.ouvertes.push({ source, nom, format }); return { source, nom, isValid: true, readOnly: false }; },
    decrireCouche: (c, format) => {
      j.decrites.push({ nom: c.nom, format });
      const d = descriptions[c.nom] || {};
      return { lisible: true, systeme: L93, nbEntites: 1, emprise: DANS, ...d };
    },
    controlerCouche: (d) => C.controlerAvecDetail(d, { reprojeter: (e, epsg) => C.reprojeterEmprise(e, epsg, (x, y) => vers2154(x, y, epsg)) }),
    ajouterALaCarte: (c, nom, source, zip) => { j.ajoutees.push({ nom, source, zip, readOnly: c.readOnly }); },
    reecrireCouche: (c, cible) => { j.reecrites.push({ source: c.source, cible }); return cible; },
    ecrireFichier: (chemin, texte) => { j.ecrits.push(chemin); return true; },
    styles: S,
    infosCouche: () => ({ geometrie: 'polygone', champs: ['code'] }),
    lireTexte: (zip, chemin) => (chemin in textes ? textes[chemin] : null),
    maintenant: () => new Date('2026-11-04T10:00:00Z'),
    ...extra,
  };
  if (tables) ctx.tablesGpkg = (source, entree) => { j.tablesLues.push({ source, entree }); const t = tables[entree]; if (t instanceof Error) throw t; return t; };
  return { ctx, j, registre: () => L.lireRegistre(ctx.reglages, ID) };
}
const lignes = (r) => r.message.split('\n');

// ============================================================================ GeoTIFF

test('GeoTIFF : ouvert en /vsizip/ avec le format « tif » (loadRasterLayer), contrôlé, ni réécrit ni stylé, au registre par chemin_vsi', () => {
  const { ctx, j, registre } = monde({ noms: ['o/ortho.tif', 'o/ortho.tfw'] });
  const r = L.importerZip(ctx);
  const source = `/vsizip/${COPIES}/essai.zip/o/ortho.tif`;
  assert.deepEqual(j.ouvertes, [{ source, nom: 'ortho', format: 'tif' }], 'une seule ouverture, en raster, dans le zip');
  assert.deepEqual(j.decrites, [{ nom: 'ortho', format: 'tif' }], 'decrireCouche reçoit le format (pas de comptage pour un raster, Cerf.qml)');
  assert.deepEqual(j.reecrites, [], 'pas de saveVectorLayerAs pour un raster (ADR 0008)');
  assert.deepEqual(j.ecrits, [], 'pas de .qml : style par défaut');
  assert.deepEqual(j.ajoutees, [{ nom: 'ortho', source, zip: 'essai.zip', readOnly: false }], 'readOnly non posé : QgsRasterLayer n\'a pas cette propriété');
  assert.deepEqual(registre(), [{ zip: 'essai.zip', couche: 'ortho', chemin_vsi: 'essai.zip/o/ortho.tif', style: 'defaut', ajoutee_le: '2026-11-04T10:00:00.000Z' }]);
  assert.deepEqual(r.chargees, [{ couche: 'ortho', entree: 'o/ortho.tif', source, style: 'defaut' }]);
  assert.equal(r.message, '1 couche chargée : ortho');
});

test('GeoTIFF sans géoréférencement : refus du contrôle 3, chemin complet dans le zip, ni carte ni registre', () => {
  const { ctx, j, registre } = monde({ noms: ['r/FRT_sans_georef.tif'], descriptions: { FRT_sans_georef: { systeme: SANS, emprise: { xmin: 0, ymin: -8, xmax: 8, ymax: 0 } } } });
  const r = L.importerZip(ctx);
  assert.ok(lignes(r).includes('r/FRT_sans_georef.tif : système de coordonnées inconnu'), r.message);
  assert.deepEqual(j.ajoutees, []);
  assert.deepEqual(registre(), []);
});

test('GeoTIFF au système valide mais posé à l\'origine (QField lui aurait donné un système) : refus du contrôle 5, jamais chargé', () => {
  const { ctx, j } = monde({ noms: ['FRT_sans_georef.tif'], descriptions: { FRT_sans_georef: { emprise: { xmin: 0, ymin: -8, xmax: 8, ymax: 0 } } } });
  const r = L.importerZip(ctx);
  assert.ok(lignes(r).includes('FRT_sans_georef.tif : Coordonnées incohérentes : système mal déclaré ?'), r.message);
  assert.deepEqual(j.ajoutees, []);
});

test('GeoTIFF réimporté : rechargé dans le zip à la réouverture (chargerCouche en /vsizip/), sans readOnly ; un vecteur 0.2.x garde readOnly', () => {
  const { ctx, registre } = monde({ noms: ['o/ortho.tif'] });
  L.importerZip(ctx);
  const lues = [];
  const r = L.demarrerProjet({
    variables: { cerf_id: ID }, reglages: ctx.reglages, dossierProjet: PROJET, existe: () => true,
    chargerCouche: (source, nom) => { const c = { source, nom, isValid: true }; lues.push(c); return c; },
  });
  assert.deepEqual(lues.map((c) => c.source), [`/vsizip/${COPIES}/essai.zip/o/ortho.tif`]);
  assert.equal('readOnly' in lues[0], false, 'aucune propriété readOnly posée sur un raster');
  assert.deepEqual(r.rechargees, [{ zip: 'essai.zip', couche: 'ortho' }]);
  assert.equal(registre().length, 1, 'entrée saine (chemin_vsi dans le zip), gardée');
  assert.equal(L.estSourceRaster(`/vsizip/${COPIES}/essai.zip/o/ortho.TIFF`), true);
  assert.equal(L.estSourceRaster(`/vsizip/${COPIES}/essai.zip/a.geojson`), false);
  assert.equal(L.estSourceRaster(`${COPIES}/essai/a.gpkg|layername=a`), false);
});

// ============================================================================ GeoPackage dans importerZip

test('GeoPackage lu par le service : chaque table ouverte par « |layername= », réécrite dans <zip>/<table>.gpkg, son .qml de table appliqué', () => {
  const QML = '<!DOCTYPE qgis><qgis version="3.34"><renderer-v2 type="singleSymbol"/></qgis>';
  const { ctx, j, registre } = monde({ noms: ['d/Serre.gpkg', 'd/Releves.qml'], tables: { 'd/Serre.gpkg': ['Releves', 'Parcelles'] }, textes: { 'd/Releves.qml': QML } });
  const r = L.importerZip(ctx);
  assert.deepEqual(j.tablesLues, [{ source: `/vsizip/${COPIES}/essai.zip/d/Serre.gpkg`, entree: 'd/Serre.gpkg' }], 'service appelé une fois, avec la source /vsizip/');
  assert.deepEqual(j.ouvertes.filter((o) => o.source.includes('/vsizip/')).map((o) => o.source), [
    `/vsizip/${COPIES}/essai.zip/d/Serre.gpkg|layername=Releves`,
    `/vsizip/${COPIES}/essai.zip/d/Serre.gpkg|layername=Parcelles`,
  ]);
  assert.ok(j.ouvertes.every((o) => !/\.gpkg/.test(o.source) || /layername=/.test(o.source)), 'jamais un .gpkg sans layername');
  assert.deepEqual(j.reecrites.map((x) => x.cible), [`${COPIES}/essai/Releves.gpkg`, `${COPIES}/essai/Parcelles.gpkg`]);
  assert.deepEqual(registre().map((e) => [e.couche, e.chemin, e.style, e.qml]), [
    ['Releves', 'essai/Releves.gpkg', 'qml', 'd/Releves.qml'],
    ['Parcelles', 'essai/Parcelles.gpkg', 'Parcelles', undefined],
  ]);
  assert.equal(lignes(r)[0], '2 couches chargées : Releves, Parcelles');
});

test('GeoPackage sans table vecteur (le service rend []) : « <chemin>.gpkg : aucune table vecteur, couche non chargée », jamais ouvert ; illisible (null, exception, nom non sûr) : « tables illisibles »', () => {
  const cas = [
    [[], 'd/Serre.gpkg : aucune table vecteur, couche non chargée'],
    [null, 'd/Serre.gpkg : tables illisibles, couche non chargée'],
    [new Error('GDAL'), 'd/Serre.gpkg : tables illisibles, couche non chargée'],
    [['a|b'], 'd/Serre.gpkg : tables illisibles, couche non chargée'],
    ['Releves', 'd/Serre.gpkg : tables illisibles, couche non chargée'],
  ];
  for (const [reponse, attendu] of cas) {
    const { ctx, j, registre } = monde({ noms: ['d/Serre.gpkg', 'b.geojson'], tables: { 'd/Serre.gpkg': reponse } });
    const r = L.importerZip(ctx);
    assert.ok(lignes(r).includes(attendu), `${String(reponse)} : ${r.message}`);
    assert.deepEqual(j.ouvertes.filter((o) => /Serre\.gpkg/.test(o.source)), [], 'jamais ouvert');
    assert.deepEqual(registre().map((e) => e.couche), ['b'], 'voisin chargé et inscrit');
  }
});

test('table de GeoPackage refusée : message « <chemin>.gpkg/<table> : … » (spec § 4)', () => {
  const { ctx } = monde({ noms: ['d/Serre.gpkg'], tables: { 'd/Serre.gpkg': ['Releves'] }, descriptions: { Releves: { lisible: false } } });
  const r = L.importerZip(ctx);
  assert.ok(lignes(r).includes('d/Serre.gpkg/Releves : illisible'), r.message);
});

// ============================================================================ chemin complet dans tous les messages (§ 4)

test('messages du § 4 : chemin complet dans le zip pour les avertissements (.cpg absent, couche vide, style) et le doublon', () => {
  const { ctx } = monde({
    noms: ['a/b/UG.shp', 'a/b/UG.shx', 'a/b/UG.dbf', 'a/b/UG.prj', 'v/Vide.geojson', 'x/Dup.geojson', 'y/Dup.geojson'],
    descriptions: { Vide: { nbEntites: 0 } },
    extra: { infosCouche: () => ({ geometrie: 'point', champs: ['id'] }) },
  });
  const r = L.importerZip(ctx);
  const l = lignes(r);
  assert.ok(l.includes('a/b/UG.shp : accents peut-être mal lus'), r.message);
  assert.ok(l.includes('v/Vide.geojson : couche vide'), r.message);
  assert.ok(l.includes('a/b/UG.shp : nom reconnu mais pas un polygone'), r.message);
  assert.ok(l.includes('y/Dup.geojson : nom de couche en double dans le zip (déjà pris par x/Dup.geojson)'), r.message);
});

test('messages du § 4 : chemin complet pour « couche illisible » (verdict d\'acceptation sur une ouverture ratée), la copie et l\'ajout à la carte', () => {
  const ouvrirNul = monde({ noms: ['d/UG.geojson'], extra: { ouvrirCouche: () => null, controlerCouche: () => ({ charge: true, avertissements: [] }) } });
  assert.ok(lignes(L.importerZip(ouvrirNul.ctx)).includes('d/UG.geojson : couche illisible, couche refusée'));
  const carte = monde({ noms: ['d/UG.geojson'], extra: { ajouterALaCarte: () => { throw new Error('x'); } } });
  assert.ok(lignes(L.importerZip(carte.ctx)).includes('d/UG.geojson : ajout à la carte impossible'));
  const carteTif = monde({ noms: ['o/t.tif'], extra: { ajouterALaCarte: () => { throw new Error('x'); } } });
  const rt = L.importerZip(carteTif.ctx);
  assert.ok(lignes(rt).includes('o/t.tif : ajout à la carte impossible'), rt.message);
  assert.deepEqual(carteTif.registre(), []);
  const horsCopie = monde({ noms: ['d/UG.geojson'], extra: { reecrireCouche: () => '/ailleurs/UG.gpkg' } });
  assert.ok(lignes(L.importerZip(horsCopie.ctx)).includes('d/UG.geojson : copie écrite hors de cerf-imports/, couche refusée'));
});

test('Shapefile complet dans un dossier : ouvert par son .shp, le contrôle 1 reçoit ses cinq fichiers (decrireEntree), chargé sans avertissement', () => {
  const noms = ['Serre EA/réf/Parcelles.shp', 'Serre EA/réf/Parcelles.shx', 'Serre EA/réf/Parcelles.dbf', 'Serre EA/réf/Parcelles.prj', 'Serre EA/réf/Parcelles.cpg', 'Serre EA/réf/Parcelles.qix'];
  const vues = [];
  const { ctx, j, registre } = monde({ noms });
  const controle = ctx.controlerCouche;
  ctx.controlerCouche = (d) => { vues.push({ nom: d.nom, format: d.format, fichiers: d.fichiers }); return controle(d); };
  const r = L.importerZip(ctx);
  assert.deepEqual(vues, [{ nom: 'Serre EA/réf/Parcelles.shp', format: 'shp', fichiers: ['Parcelles.shp', 'Parcelles.shx', 'Parcelles.dbf', 'Parcelles.prj', 'Parcelles.cpg'] }]);
  assert.equal(j.ouvertes[0].source, `/vsizip/${COPIES}/essai.zip/Serre EA/réf/Parcelles.shp`);
  assert.equal(j.ouvertes[0].format, 'shp');
  assert.deepEqual(registre().map((e) => e.chemin), ['essai/Parcelles.gpkg']);
  assert.equal(r.message, '1 couche chargée : Parcelles');
});

test('zip sans aucun format lu : message qui nomme les quatre formats', () => {
  const { ctx } = monde({ noms: ['lisez-moi.txt', 'x.qmd'] });
  assert.equal(L.importerZip(ctx).message, 'Aucune couche GeoJSON, Shapefile, GeoPackage ou GeoTIFF dans essai.zip.');
});

// ============================================================================ zip piege de bout en bout (016, critère 6)

test('zip piege : 5 pièges, un message clair chacun (vrai cerf-controles.mjs), seules Zone_inconnue et UG_vide chargées', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'cerf-t024d-'));
  const octets = readFileSync(fabriquerPiege(dossier));
  const { ctx, j, registre } = monde({
    noms: [],
    descriptions: {
      // GeoJSON en Lambert 93 sans membre crs : lu en WGS84 (RFC 7946), X = 668 000 « degrés ».
      UG_sans_crs: { systeme: W84, emprise: { xmin: 668000, ymin: 6826000, xmax: 668500, ymax: 6826500 } },
      UG_vide: { systeme: W84, nbEntites: 0 },
      // Zone_inconnue : CRS84 déclaré, carré de 0,005° près de Fontainebleau (lon 2,7 ; lat 48,4).
      Zone_inconnue: { systeme: W84, emprise: { xmin: 2.7, ymin: 48.4, xmax: 2.705, ymax: 48.405 } },
      FRT_sans_georef: { systeme: SANS, emprise: { xmin: 0, ymin: -8, xmax: 8, ymax: 0 } },
    },
    extra: { infosCouche: () => ({ geometrie: 'polygone', champs: ['libelle'] }) },
  });
  ctx.octets = octets;
  const r = L.importerZip(ctx);
  const l = lignes(r);
  assert.equal(l[0], '2 couches chargées : UG_vide, Zone_inconnue');
  assert.ok(l.includes('FRT_sans_georef.tif : système de coordonnées inconnu'), r.message);
  assert.ok(l.includes('Parcelles_sans_prj.shp : fichier .prj manquant, système de coordonnées inconnu'), r.message);
  assert.ok(l.includes('UG_sans_crs.geojson : Coordonnées incohérentes : système mal déclaré ?'), r.message);
  assert.ok(l.includes('UG_vide.geojson : couche vide'), r.message);
  assert.deepEqual(registre().map((e) => [e.couche, e.style]), [['UG_vide', 'UG'], ['Zone_inconnue', 'defaut']], 'nom non reconnu : style par défaut ; UG_vide prend la règle UG');
  assert.equal(j.ouvertes.find((o) => o.nom === 'FRT_sans_georef').format, 'tif', 'le GeoTIFF est ouvert en raster');
});

// ============================================================================ forme de Cerf.qml

const qml = lire('plugin/Cerf.qml');
const code = qml.split('\n').filter((x) => !/^\s*\/\//.test(x)).join('\n');
const fonction = (nom) => {
  const m = new RegExp(`function ${nom}\\([\\s\\S]*?\\n  \\}\\n`).exec(code);
  assert.ok(m, `${nom} présent dans Cerf.qml`);
  return m[0];
};

test('Cerf.qml : ouvrirCouche ouvre un « tif » par LayerUtils.loadRasterLayer, le reste par loadVectorLayer ; le chargeur suit estSourceRaster', () => {
  const o = fonction('ouvrirCouche');
  assert.match(o, /function ouvrirCouche\(source, nom, format\)/);
  assert.match(o, /if \(format === "tif"\) return LayerUtils\.loadRasterLayer\(source, nom\);/);
  assert.match(o, /return LayerUtils\.loadVectorLayer\(source, nom\);/);
  assert.match(fonction('chargeur'), /Logique\.estSourceRaster\(source\) \? LayerUtils\.loadRasterLayer\(source, nom\) : LayerUtils\.loadVectorLayer\(source, nom\)/);
});

test('Cerf.qml : tablesGpkg passe par Logique.tablesDuGpkg (loadVectorLayer, createFeatureIterator, deleteLater) et est branché dans importerZip', () => {
  const t = fonction('tablesGpkg');
  assert.match(t, /Logique\.tablesDuGpkg\(source, \{/);
  assert.match(t, /LayerUtils\.loadVectorLayer\(uri, nom\)/);
  assert.match(t, /LayerUtils\.createFeatureIterator\(l\)/);
  assert.match(t, /l\.deleteLater\(\)/);
  assert.match(t, /if \(r\.etat === "liste"\) return r\.tables;\s*if \(r\.etat === "aucune"\) return \[\];\s*return null;/);
  assert.match(fonction('zipRecu'), /tablesGpkg: tablesGpkg,/);
});

test('Cerf.qml : aucune lecture de featureCount, isEmpty ni isValid() appelé comme méthode (seuls les membres exposés à QML)', () => {
  assert.doesNotMatch(code, /featureCount/);
  assert.doesNotMatch(code, /isEmpty/);
  assert.doesNotMatch(code, /isValid\(\)/);
});

// ============================================================================ version

test('version et préversion : 0.4.4, branche de la mission 024 dans release-plugin.yml', () => {
  assert.equal(L.VERSION, '0.4.4');
  assert.match(lire('plugin/metadata.txt'), /^version=0\.4\.4$/m);
  assert.match(lire('.github/workflows/release-plugin.yml'), /'mission\/024-lecture-formats'/);
});

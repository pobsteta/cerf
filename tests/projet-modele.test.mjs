// Mission 005 : tests du projet modèle vision.qgz (écrits avant le projet, mission 006).
// Sources des valeurs (aucune n'est inventée) :
//   - docs/spec.md § 2 point 1 : Lambert 93 (EPSG:2154), deux fonds XYZ, variable de projet vision_id ;
//   - docs/spec.md § 3.3 : vision_id est un UUID, écrit par QGIS dans le projet ; § 3.4 : zoom max, « © IGN », aucune clé ;
//   - mission 045 (5 novembre 2026, arbitrages de Pascal) : cinq fonds XYZ dans le groupe, du dessus au dessous : Cadastre (visible),
//     Plan IGN v2 (visible), OpenStreetMap, OpenTopoMap, BD ORTHO (décochés) ; zoom et attribution par fond ; docs/referentiels/fonds-osm-cadastre.md ;
//   - docs/referentiels/fonds-ign.md § 1 (gabarits XYZ, mesurés le 2 novembre 2026) et § 2 (zoom 0 à 19) ;
//   - docs/adr/0002-fonds-ign-xyz.md et son amendement du 2 novembre 2026 (PM gardé, zoom 19, « © IGN »).
// Amendement du 3 novembre 2026 (Pascal) : les contrôles « deux fonds XYZ, zoom 0 à 19, © IGN » portent sur les couches du groupe
// « Fonds de carte », non sur toutes les couches du projet (la couche « Saisie terrain » de la mission 021 est hors du groupe).
// Emplacement : vision.qgz à la racine du dépôt. La fiche 006 ne donne pas de chemin : CHEMIN ci-dessous
// est une hypothèse du testeur, à confirmer par l'orchestrateur.
// ROUGE ATTENDU tant que vision.qgz n'existe pas (mission 006) : chaque test « vision.qgz » échoue avec le message
// « vision.qgz absent ». Les tests « garde-fou » (fixtures en mémoire) sont verts : ils prouvent que la
// vérification accepte un projet juste et refuse chaque projet fautif.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const CHEMIN = new URL('../vision.qgz', import.meta.url);

// --- Valeurs attendues (voir sources en tête de fichier) -------------------------------------------
const GABARIT = (couche, format) =>
  `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${couche}` +
  `&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=${format}`;
const IGN = '© IGN';
const FONDS = [
  { nom: 'Cadastre', url: GABARIT('CADASTRALPARCELS.PARCELLAIRE_EXPRESS', 'image/png'), visible: true, zmin: 0, zmax: 19, attribution: IGN },
  { nom: 'Plan IGN v2', url: GABARIT('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', 'image/png'), visible: true, zmin: 0, zmax: 19, attribution: IGN },
  { nom: 'OpenStreetMap', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', visible: false, zmin: 0, zmax: 19, attribution: "© les contributeurs d'OpenStreetMap" },
  { nom: 'OpenTopoMap', url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png', visible: false, zmin: 0, zmax: 13, attribution: "© les contributeurs d'OpenStreetMap, SRTM | © OpenTopoMap (CC-BY-SA)" },
  { nom: 'BD ORTHO', url: GABARIT('ORTHOIMAGERY.ORTHOPHOTOS', 'image/jpeg'), visible: false, zmin: 0, zmax: 19, attribution: IGN },
];
const F = Object.fromEntries(FONDS.map((f) => [f.nom, f]));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_NUL = '00000000-0000-0000-0000-000000000000';

// --- Lecture d'un zip (sans dépendance) ------------------------------------------------------------
function lireZip(buf) {
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error("vision.qgz n'est pas un zip (fin de répertoire introuvable)");
  const n = buf.readUInt16LE(e + 10);
  let p = buf.readUInt32LE(e + 16);
  const entrees = {};
  for (let i = 0; i < n; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('répertoire central du zip corrompu');
    const methode = buf.readUInt16LE(p + 10), taille = buf.readUInt32LE(p + 20);
    const lf = buf.readUInt16LE(p + 28), lx = buf.readUInt16LE(p + 30), lc = buf.readUInt16LE(p + 32);
    const loc = buf.readUInt32LE(p + 42);
    const nom = buf.toString('utf8', p + 46, p + 46 + lf);
    const debut = loc + 30 + buf.readUInt16LE(loc + 26) + buf.readUInt16LE(loc + 28);
    const brut = buf.subarray(debut, debut + taille);
    if (methode !== 0 && methode !== 8) throw new Error(`méthode de compression ${methode} non gérée`);
    entrees[nom] = methode === 8 ? inflateRawSync(brut) : brut;
    p += 46 + lf + lx + lc;
  }
  return entrees;
}

// --- Écriture d'un zip (pour les fixtures) ---------------------------------------------------------
const TABLE = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = TABLE[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function ecrireZip(fichiers) {
  const locaux = [], centraux = []; let off = 0;
  for (const [nom, texte] of Object.entries(fichiers)) {
    const d = Buffer.from(texte, 'utf8'), n = Buffer.from(nom, 'utf8'), crc = crc32(d);
    const l = Buffer.alloc(30); l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4);
    l.writeUInt32LE(crc, 14); l.writeUInt32LE(d.length, 18); l.writeUInt32LE(d.length, 22); l.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(d.length, 20); c.writeUInt32LE(d.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(off, 42);
    locaux.push(l, n, d); centraux.push(c, n); off += 30 + n.length + d.length;
  }
  const cd = Buffer.concat(centraux), f = Buffer.alloc(22);
  f.writeUInt32LE(0x06054b50, 0); f.writeUInt16LE(Object.keys(fichiers).length, 8); f.writeUInt16LE(Object.keys(fichiers).length, 10);
  f.writeUInt32LE(cd.length, 12); f.writeUInt32LE(off, 16);
  return Buffer.concat([...locaux, cd, f]);
}

// --- Lecture du XML QGIS (regex : on ne vérifie que des éléments plats et stables du .qgs) -----------
const dexml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
function analyser(buf) {
  const zip = lireZip(buf);
  const qgs = Object.keys(zip).filter((n) => /\.qgs$/i.test(n));
  if (qgs.length !== 1) throw new Error(`le .qgz doit contenir exactement un .qgs, trouvé ${qgs.length}`);
  const xml = zip[qgs[0]].toString('utf8');
  const couches = [...xml.matchAll(/<maplayer\b[\s\S]*?<\/maplayer>/g)].map((m) => m[0]);
  const horsCouches = xml.replace(/<maplayer\b[\s\S]*?<\/maplayer>/g, '');
  const champ = (bloc, balise) => { const m = bloc.match(new RegExp(`<${balise}(?:\\s[^>]*)?>([\\s\\S]*?)</${balise}>`)); return m ? dexml(m[1]) : null; };
  const crsProjet = horsCouches.match(/<projectCrs>[\s\S]*?<\/projectCrs>/)?.[0] ?? '';
  const crsCarte = horsCouches.match(/<destinationsrs>[\s\S]*?<\/destinationsrs>/)?.[0] ?? '';
  const noms = horsCouches.match(/<Variables>[\s\S]*?<variableNames[^>]*>([\s\S]*?)<\/variableNames>/)?.[1] ?? '';
  const vals = horsCouches.match(/<Variables>[\s\S]*?<variableValues[^>]*>([\s\S]*?)<\/variableValues>/)?.[1] ?? '';
  const valeurs = (s) => [...s.matchAll(/<value>([\s\S]*?)<\/value>/g)].map((m) => dexml(m[1]));
  const lesVals = valeurs(vals);
  const variables = valeurs(noms).map((n, i) => [n, lesVals[i]]);
  // Fonds de carte = les couches du groupe « Fonds de carte » (la couche « Saisie terrain », mission 021, est hors du groupe).
  const groupe = xml.match(/<layer-tree-group\b[^>]*\bname="Fonds de carte"[^>]*>([\s\S]*?)<\/layer-tree-group>/)?.[1] ?? '';
  const feuillesFonds = [...groupe.matchAll(/<layer-tree-layer\b[^>]*>/g)].map((m) => ({ id: m[0].match(/\bid="([^"]*)"/)?.[1], coche: m[0].match(/\bchecked="([^"]*)"/)?.[1] === 'Qt::Checked' }));
  const idsFonds = feuillesFonds.map((f) => f.id);
  const arbre = [...xml.matchAll(/<layer-tree-layer\b[^>]*>/g)].map((m) => m[0].match(/\bid="([^"]*)"/)?.[1]);
  return {
    xml,
    crsProjet: { authid: champ(crsProjet, 'authid'), srid: champ(crsProjet, 'srid') },
    crsCarte: champ(crsCarte, 'authid'),
    variables,
    arbre,
    feuillesFonds,
    couches: couches.map((b) => ({
      id: champ(b, 'id'), nom: champ(b, 'layername'), fournisseur: champ(b, 'provider'),
      source: champ(b, 'datasource') ?? '', brut: b,
    })),
    get fonds() { return this.couches.filter((c) => idsFonds.includes(c.id)); },
    // fonds dans l'ordre de l'arbre (premier = dessus), avec leur case cochée
    get fondsOrdonnes() { return feuillesFonds.map((f) => ({ ...this.couches.find((c) => c.id === f.id), coche: f.coche })); },
  };
}
// Source lue comme une chaîne de requête : aucun ordre imposé, paramètres inconnus tolérés
// (QgsDataSourceUri::encodedUri range par ordre alphabétique et ajoute les « http-header:… » à la fin).
const decoder = (t) => t.replace(/(%[0-9A-Fa-f]{2})+/g, (m) => { try { return decodeURIComponent(m); } catch { return m; } });
// QGIS encode les « & » de l'URL (%26) : une URL non encodée n'est pas reconnue (ses « &SERVICE=… » sont
// des paramètres inconnus, ignorés) et le gabarit exact n'est alors pas trouvé : la source est refusée.
// Une clé connue répétée est un défaut (QGIS lirait vraisemblablement la dernière valeur) : champ « doublons ».
const CLES = ['type', 'url', 'zmin', 'zmax'];
const lireSource = (s) => {
  const vus = {};
  for (const seg of s.split('&')) {
    const i = seg.indexOf('='); if (i < 0) continue;
    const k = seg.slice(0, i); if (CLES.includes(k)) (vus[k] ??= []).push(seg.slice(i + 1));
  }
  if (vus.type === undefined || vus.url === undefined) return null;
  let url = vus.url[0]; try { url = decodeURIComponent(url); } catch { /* url non encodée */ }
  const n = (v) => (v !== undefined && /^\d+$/.test(v) ? Number(v) : undefined);
  return { type: vus.type[0], url, zmin: n(vus.zmin?.[0]), zmax: n(vus.zmax?.[0]), doublons: CLES.filter((k) => vus[k]?.length > 1) };
};

// --- Vérifications : chacune renvoie une liste de défauts (vide = conforme) -----------------------------
const verifs = {
  'CRS du projet EPSG:2154': (p) => (p.crsProjet.authid === 'EPSG:2154' && p.crsProjet.srid === '2154' ? [] : [`projectCrs = ${p.crsProjet.authid}/${p.crsProjet.srid}, attendu EPSG:2154/2154`]),
  'CRS de la carte (destinationsrs) EPSG:2154': (p) => (p.crsCarte === 'EPSG:2154' ? [] : [`destinationsrs = ${p.crsCarte}, attendu EPSG:2154`]),
  'variable de projet vision_id : une seule, UUID non nul': (p) => {
    const v = p.variables.filter(([n]) => n === 'vision_id');
    if (v.length !== 1) return [`${v.length} variable(s) vision_id au niveau du projet, attendu 1`];
    if (!UUID.test(v[0][1] ?? '')) return [`vision_id = « ${v[0][1]} », pas un UUID`];
    return v[0][1] === UUID_NUL ? ["vision_id est l'UUID nul : à générer par QGIS"] : [];
  },
  'exactement cinq fonds XYZ dans le groupe « Fonds de carte »': (p) => {
    const d = [];
    if (p.fonds.length !== 5) d.push(`${p.fonds.length} couche(s) dans le groupe « Fonds de carte », attendu 5`);
    for (const c of p.fonds) {
      const s = lireSource(c.source);
      for (const k of s?.doublons ?? []) d.push(`couche « ${c.nom} » : paramètre ${k} en double`);
      if (c.fournisseur !== 'wms' || !s || s.type !== 'xyz') d.push(`couche « ${c.nom} » : source « ${c.source.slice(0, 60)} », attendu type=xyz (fournisseur wms)`);
    }
    return d;
  },
  'les cinq fonds attendus, gabarit XYZ exact (PM {z}/{y}/{x} pour la Géoplateforme, {z}/{x}/{y}.png pour OSM)': (p) => {
    const urls = p.fonds.map((c) => lireSource(c.source)?.url);
    return FONDS.filter((f) => !urls.includes(f.url)).map((f) => `fond ${f.nom} : URL XYZ attendue absente ou différente : ${f.url}`)
      .concat(urls.filter((u) => u && !FONDS.some((f) => f.url === u)).map((u) => `URL inattendue : ${u}`));
  },
  'chaque fond a son URL (association nom et URL)': (p) => p.fonds.flatMap((c) => {
    const f = F[c.nom]; const u = lireSource(c.source)?.url;
    return !f ? [`fond « ${c.nom} » inattendu`] : u === f.url ? [] : [`« ${c.nom} » : URL ${u}, attendu ${f.url}`];
  }),
  "ordre de l'arbre (premier = dessus) : Cadastre, Plan IGN v2, OpenStreetMap, OpenTopoMap, BD ORTHO": (p) => {
    const noms = p.fondsOrdonnes.map((c) => c.nom), attendu = FONDS.map((f) => f.nom);
    return JSON.stringify(noms) === JSON.stringify(attendu) ? [] : [`ordre ${JSON.stringify(noms)}, attendu ${JSON.stringify(attendu)}`];
  },
  'visibilité : Cadastre et Plan IGN v2 cochés, les trois autres décochés': (p) => p.fondsOrdonnes.flatMap((c) => {
    const f = F[c.nom]; return f && c.coche !== f.visible ? [`« ${c.nom} » : ${c.coche ? 'coché' : 'décoché'}, attendu ${f.visible ? 'coché' : 'décoché'}`] : [];
  }),
  'zoom de chaque fond : 0 à 19 (Géoplateforme, OpenStreetMap), 0 à 13 (OpenTopoMap)': (p) => p.fonds.flatMap((c) => {
    const s = lireSource(c.source) ?? {}; const d = []; const f = F[c.nom] ?? {};
    if (s.zmax !== f.zmax) d.push(`« ${c.nom} » : zmax = ${s.zmax}, attendu ${f.zmax}`);
    if (s.zmin !== f.zmin) d.push(`« ${c.nom} » : zmin = ${s.zmin}, attendu ${f.zmin}`);
    return d;
  }),
  'attribution propre à chaque fond (« © IGN » pour les trois fonds de la Géoplateforme)': (p) => p.fonds.filter((c) => !c.brut.includes(`<rights>${F[c.nom]?.attribution}</rights>`) || !c.brut.includes(`<attribution>${F[c.nom]?.attribution}</attribution>`))
    .map((c) => `« ${c.nom} » : attribution « ${F[c.nom]?.attribution} » absente de la couche`),
  "les fonds sont dans l'arbre des couches": (p) => p.couches.filter((c) => !p.arbre.includes(c.id)).map((c) => `« ${c.nom} » (${c.id}) absent du layer-tree`),
  'aucune couche raster ou wms hors du groupe « Fonds de carte » (seules les vectorielles y sont admises)': (p) => {
    const dans = new Set(p.fonds.map((c) => c.id));
    return p.couches.filter((c) => !dans.has(c.id) && (/<maplayer\b[^>]*\btype="raster"/.test(c.brut) || /^(wms|wmts|gdal|xyz)$/i.test(c.fournisseur ?? '')))
      .map((c) => `couche « ${c.nom} » (${c.id}) : raster ou wms hors du groupe « Fonds de carte »`);
  },
  "aucune clé d'API dans le projet": (p) => (/(apikey|api_key|[?&;]key=|[?&;]token=)/i.test(decoder(dexml(p.xml))) ? ['une clé ou un jeton apparaît dans le projet'] : []),
};
const defauts = (buf) => { const p = analyser(buf); return Object.entries(verifs).flatMap(([n, f]) => f(p).map((d) => `${n} : ${d}`)); };

// --- Fixture : un projet conforme, écrit comme QGIS 3.x l'écrit ---------------------------------------
const UUID_ESSAI = '3f2b8c1e-7a4d-4e59-9b1a-0c6d5e8f7a21';
const encode = (u) => encodeURIComponent(u).replace(/%7B/g, '{').replace(/%7D/g, '}');
const couche = (i, f, o = {}) => `<maplayer type="raster"><id>fond_${i}</id><layername>${f.nom}</layername><provider encoding="">wms</provider>` +
  `<datasource>${(o.source ?? `type=xyz&url=${encode(o.url ?? f.url)}&zmax=${o.zmax ?? f.zmax}&zmin=0`).replace(/&/g, '&amp;')}</datasource>` +
  `<srs><spatialrefsys><authid>EPSG:3857</authid></spatialrefsys></srs><resourceMetadata><rights>${o.rights ?? f.attribution}</rights></resourceMetadata><attribution>${o.rights ?? f.attribution}</attribution></maplayer>`;
// Couche vectorielle hors du groupe « Fonds de carte » (mission 021) : ni XYZ, ni zoom, ni attribution.
const COUCHE_SAISIE = '<maplayer type="vector" geometry="Point"><id>saisie_0</id><layername>Saisie terrain</layername><provider encoding="UTF-8">ogr</provider>' +
  '<datasource>./saisie.gpkg|layername=saisie_terrain</datasource><srs><spatialrefsys><authid>EPSG:2154</authid></spatialrefsys></srs></maplayer>';
function projet(o = {}) {
  const fonds = o.fonds ?? FONDS;
  const noms = o.sansId ? '' : `<value>${o.nomVar ?? 'vision_id'}</value>`;
  const vals = o.sansId ? '' : `<value>${o.valeur ?? UUID_ESSAI}</value>`;
  return `<!DOCTYPE qgis><qgis version="3.34"><projectCrs><spatialrefsys><srid>${o.srid ?? 2154}</srid><authid>${o.authid ?? 'EPSG:2154'}</authid></spatialrefsys></projectCrs>` +
    `<layer-tree-group>${o.horsGroupe ? '<layer-tree-layer id="hors_0" name="Fond égaré"/>' : ''}${o.saisie ? '<layer-tree-layer id="saisie_0" name="Saisie terrain"/>' : ''}<layer-tree-group name="${o.nomGroupe ?? 'Fonds de carte'}">${fonds.map((f, i) => `<layer-tree-layer id="fond_${i}" name="${f.nom}" checked="${(o.cochees ?? FONDS.map((g) => g.visible))[i] ? 'Qt::Checked' : 'Qt::Unchecked'}"/>`).join('')}</layer-tree-group></layer-tree-group>` +
    `<mapcanvas name="theMapCanvas"><destinationsrs><spatialrefsys><srid>2154</srid><authid>${o.canvas ?? 'EPSG:2154'}</authid></spatialrefsys></destinationsrs></mapcanvas>` +
    `<projectlayers>${fonds.map((f, i) => couche(i, f, i === 0 ? o.c0 : undefined)).join('')}${o.saisie ? COUCHE_SAISIE : ''}${o.horsGroupe ? couche('hors', { nom: 'Fond égaré', url: FONDS[0].url }).replace('<id>fond_hors</id>', '<id>hors_0</id>') : ''}</projectlayers>` +
    `<properties><Variables><variableNames type="QStringList">${noms}</variableNames><variableValues type="QStringList">${vals}</variableValues></Variables></properties></qgis>`;
}
const qgz = (xml) => ecrireZip({ 'vision.qgs': xml });

// --- Garde-fous : la vérification accepte le juste, refuse chaque faute -------------------------------------
test('garde-fou : un projet conforme (fixture) ne donne aucun défaut', () => {
  assert.deepEqual(defauts(qgz(projet())), []);
});
test('garde-fou : une couche vectorielle hors du groupe « Fonds de carte » ne fait échouer aucun contrôle', () => {
  assert.deepEqual(defauts(qgz(projet({ saisie: true }))), []);
});
test('garde-fou : une couche raster (GeoTIFF, fournisseur gdal) à la racine est refusée', () => {
  const xml = projet().replace('</projectlayers>', '<maplayer type="raster"><id>tif_0</id><layername>MNT</layername><provider encoding="">gdal</provider><datasource>./mnt.tif</datasource></maplayer></projectlayers>')
    .replace('<layer-tree-group name=', '<layer-tree-layer id="tif_0" name="MNT"/><layer-tree-group name=');
  assert.ok(defauts(qgz(xml)).some((x) => x.includes('hors du groupe')));
});
test('garde-fou : la couche vectorielle hors du groupe ne compte pas parmi les fonds (le groupe garde exactement cinq fonds)', () => {
  const p = analyser(qgz(projet({ saisie: true })));
  assert.equal(p.couches.length, 6);
  assert.deepEqual(p.fonds.map((c) => c.nom), FONDS.map((f) => f.nom));
});
test('garde-fou : une couche vectorielle ajoutée DANS le groupe est refusée (le groupe ne contient que cinq fonds XYZ)', () => {
  const xml = projet({ saisie: true }).replace('<layer-tree-layer id="saisie_0" name="Saisie terrain"/>', '').replace('</layer-tree-group></layer-tree-group>', '<layer-tree-layer id="saisie_0" name="Saisie terrain"/></layer-tree-group></layer-tree-group>');
  const d = defauts(qgz(xml));
  assert.ok(d.some((x) => x.includes('exactement cinq fonds')), JSON.stringify(d));
});
const enc = (f) => encode(f.url);
test('garde-fou : projet conforme, « http-header:referer=& » en tête de source', () => {
  const o = { c0: { source: `http-header:referer=&type=xyz&url=${enc(FONDS[0])}&zmax=19&zmin=0` } };
  assert.deepEqual(defauts(qgz(projet(o))), []);
});
test('garde-fou : projet conforme, « tilePixelRatio=1 » avant type et « &http-header:referer= » à la fin', () => {
  const o = { c0: { source: `tilePixelRatio=1&type=xyz&url=${enc(FONDS[0])}&zmax=19&zmin=0&http-header:referer=` } };
  assert.deepEqual(defauts(qgz(projet(o))), []);
});
test('garde-fou : projet conforme, paramètre inconnu (styleUrl=) placé après url', () => {
  const o = { c0: { source: `type=xyz&url=${enc(FONDS[0])}&styleUrl=&zmax=19&zmin=0` } };
  assert.deepEqual(defauts(qgz(projet(o))), []);
});
test('garde-fou : projet conforme, ordre alphabétique de QGIS (interpretation, tilePixelRatio, type, url, zmax, zmin)', () => {
  const o = { c0: { source: `interpretation=&tilePixelRatio=0&type=xyz&url=${enc(FONDS[0])}&zmax=19&zmin=0` } };
  assert.deepEqual(defauts(qgz(projet(o))), []);
});
const fautes = {
  'CRS projet EPSG:4326': [{ authid: 'EPSG:4326', srid: 4326 }, 'CRS du projet'],
  'CRS carte EPSG:3857': [{ canvas: 'EPSG:3857' }, 'CRS de la carte'],
  'vision_id absent': [{ sansId: true }, 'variable de projet vision_id'],
  'variable mal nommée (vision-id)': [{ nomVar: 'vision-id' }, 'variable de projet vision_id'],
  'vision_id pas un UUID': [{ valeur: 'ma-foret' }, 'variable de projet vision_id'],
  'vision_id UUID nul': [{ valeur: UUID_NUL }, 'UUID nul'],
  'zoom max 20 (404 au-delà de 19)': [{ c0: { zmax: 20 } }, 'zoom de chaque fond'],
  'jeu PM_0_19 au lieu de PM': [{ c0: { url: FONDS[0].url.replace('TILEMATRIXSET=PM&', 'TILEMATRIXSET=PM_0_19&') } }, 'gabarit XYZ exact'],
  'lignes et colonnes inversées': [{ c0: { url: FONDS[0].url.replace('TILEROW={y}&TILECOL={x}', 'TILEROW={x}&TILECOL={y}') } }, 'gabarit XYZ exact'],
  'format PNG au lieu de JPEG sur la BD ORTHO': [{ fonds: FONDS.map((f) => (f.nom === 'BD ORTHO' ? { ...f, url: f.url.replace('image/jpeg', 'image/png') } : f)) }, 'gabarit XYZ exact'],
  'couche WMTS au lieu de XYZ': [{ c0: { source: 'contextualWMSLegend=0&crs=EPSG:3857&format=image/png&layers=X&tileMatrixSet=PM&url=https://data.geopf.fr/wmts?SERVICE%3DWMTS%26REQUEST%3DGetCapabilities' } }, 'attendu type=xyz'],
  'groupe « Fonds de carte » absent (groupe mal nommé)': [{ nomGroupe: 'Fonds' }, 'exactement cinq fonds'],
  'fond wms placé à la racine, hors du groupe': [{ horsGroupe: true }, 'hors du groupe'],
  'attribution absente': [{ c0: { rights: '' } }, 'attribution'],
  'un seul fond': [{ fonds: [FONDS[0]] }, 'exactement cinq fonds'],
  'une sixième couche (SCAN 25 : pas en tranche 1)': [{ fonds: [...FONDS, { nom: 'SCAN 25', url: GABARIT('GEOGRAPHICALGRIDSYSTEMS.MAPS', 'image/jpeg'), visible: false, zmax: 19, attribution: IGN }] }, 'exactement cinq fonds'],
  'quatre fonds seulement (OpenTopoMap manquant)': [{ fonds: FONDS.filter((f) => f.nom !== 'OpenTopoMap') }, 'exactement cinq fonds'],
  "ordre inversé : le cadastre n'est plus au-dessus": [{ fonds: [FONDS[1], FONDS[0], ...FONDS.slice(2)] }, "ordre de l'arbre"],
  'OpenStreetMap coché par défaut': [{ cochees: [true, true, true, false, false] }, 'visibilité'],
  'cadastre décoché': [{ cochees: [false, true, false, false, false] }, 'visibilité'],
  'BD ORTHO cochée': [{ cochees: [true, true, false, false, true] }, 'visibilité'],
  'URL OpenStreetMap en http': [{ fonds: FONDS.map((f) => (f.nom === 'OpenStreetMap' ? { ...f, url: f.url.replace('https', 'http') } : f)) }, 'gabarit XYZ exact'],
  'URL OpenTopoMap sur l\'ancien sous-domaine a.tile': [{ fonds: FONDS.map((f) => (f.nom === 'OpenTopoMap' ? { ...f, url: f.url.replace('https://tile', 'https://a.tile') } : f)) }, 'gabarit XYZ exact'],
  'OpenTopoMap à 19 (tuiles vides au-delà du plafond)': [{ fonds: FONDS.map((f) => (f.nom === 'OpenTopoMap' ? { ...f, zmax: 19 } : f)) }, 'zoom de chaque fond'],
  'OpenStreetMap à 20': [{ fonds: FONDS.map((f) => (f.nom === 'OpenStreetMap' ? { ...f, zmax: 20 } : f)) }, 'zoom de chaque fond'],
  "attribution « © IGN » sur OpenStreetMap": [{ fonds: FONDS.map((f) => (f.nom === 'OpenStreetMap' ? { ...f, attribution: IGN } : f)) }, 'attribution propre'],
  "attribution d'OpenTopoMap sans OpenTopoMap": [{ fonds: FONDS.map((f) => (f.nom === 'OpenTopoMap' ? { ...f, attribution: "© les contributeurs d'OpenStreetMap" } : f)) }, 'attribution propre'],
  "clé encodée dans l'URL (%26key%3DSECRET)": [{ c0: { url: FONDS[0].url + '&key=SECRET', source: `type=xyz&url=${encode(FONDS[0].url)}%26key%3DSECRET&zmax=19&zmin=0` } }, 'aucune clé'],
  'type=wmts caché en fin de source': [{ c0: { source: `type=xyz&url=${encode(FONDS[0].url)}&zmax=19&zmin=0&type=wmts` } }, 'paramètre type en double'],
  'url en double après zmin': [{ c0: { source: `type=xyz&url=${encode(FONDS[0].url)}&zmax=19&zmin=0&url=${encode(FONDS[1].url)}` } }, 'paramètre url en double'],
  'zmax=20 en double': [{ c0: { source: `type=xyz&url=${encode(FONDS[0].url)}&zmax=19&zmin=0&zmax=20` } }, 'paramètre zmax en double'],
  "clé dans l'URL": [{ c0: { url: FONDS[0].url + '&apikey=SECRET' } }, 'aucune clé'],
};
for (const [nom, [opts, attendu]] of Object.entries(fautes)) {
  test(`garde-fou : refuse « ${nom} »`, () => {
    const d = defauts(qgz(projet(opts)));
    assert.ok(d.some((x) => x.includes(attendu)), `défaut « ${attendu} » non détecté ; défauts : ${JSON.stringify(d)}`);
  });
}
test("garde-fou : un fichier qui n'est pas un zip est refusé", () => {
  assert.throws(() => defauts(Buffer.from('pas un zip, juste du texte, assez long pour passer 22 octets')), /pas un zip/);
});

// --- Le vrai vision.qgz : rouge tant que la mission 006 n'est pas faite ----------------------------------------
function reel() {
  assert.ok(existsSync(CHEMIN), "vision.qgz absent à la racine du dépôt : le projet modèle n'est pas encore produit (mission 006)");
  return analyser(readFileSync(CHEMIN));
}
test('vision.qgz existe et contient un seul .qgs', () => { reel(); });
for (const [nom, f] of Object.entries(verifs)) {
  test(`vision.qgz : ${nom}`, () => {
    assert.deepEqual(f(reel()), []);
  });
}

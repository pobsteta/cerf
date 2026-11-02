// Mission 005 : tests du projet modèle cerf.qgz (écrits avant le projet, mission 006).
// Sources des valeurs (aucune n'est inventée) :
//   - docs/spec.md § 2 point 1 : Lambert 93 (EPSG:2154), deux fonds XYZ, variable de projet cerf_id ;
//   - docs/spec.md § 3.3 : cerf_id est un UUID, écrit par QGIS dans le projet ; § 3.4 : zoom max, « © IGN », aucune clé ;
//   - docs/referentiels/fonds-ign.md § 1 (gabarits XYZ, mesurés le 2 novembre 2026) et § 2 (zoom 0 à 19) ;
//   - docs/adr/0002-fonds-ign-xyz.md et son amendement du 2 novembre 2026 (PM gardé, zoom 19, « © IGN »).
// Emplacement : cerf.qgz à la racine du dépôt. La fiche 006 ne donne pas de chemin : CHEMIN ci-dessous
// est une hypothèse du testeur, à confirmer par l'orchestrateur.
// ROUGE ATTENDU tant que cerf.qgz n'existe pas (mission 006) : chaque test « cerf.qgz » échoue avec le message
// « cerf.qgz absent ». Les tests « garde-fou » (fixtures en mémoire) sont verts : ils prouvent que la
// vérification accepte un projet juste et refuse chaque projet fautif.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const CHEMIN = new URL('../cerf.qgz', import.meta.url);

// --- Valeurs attendues (voir sources en tête de fichier) -------------------------------------------
const GABARIT = (couche, format) =>
  `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${couche}` +
  `&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=${format}`;
const FONDS = [
  { nom: 'Plan IGN v2', couche: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', url: GABARIT('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', 'image/png') },
  { nom: 'BD ORTHO', couche: 'ORTHOIMAGERY.ORTHOPHOTOS', url: GABARIT('ORTHOIMAGERY.ORTHOPHOTOS', 'image/jpeg') },
];
const ZMIN = 0, ZMAX = 19, ATTRIBUTION = '© IGN';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_NUL = '00000000-0000-0000-0000-000000000000';

// --- Lecture d'un zip (sans dépendance) ------------------------------------------------------------
function lireZip(buf) {
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error("cerf.qgz n'est pas un zip (fin de répertoire introuvable)");
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
  const arbre = [...xml.matchAll(/<layer-tree-layer\b[^>]*>/g)].map((m) => m[0].match(/\bid="([^"]*)"/)?.[1]);
  return {
    xml,
    crsProjet: { authid: champ(crsProjet, 'authid'), srid: champ(crsProjet, 'srid') },
    crsCarte: champ(crsCarte, 'authid'),
    variables,
    arbre,
    couches: couches.map((b) => ({
      id: champ(b, 'id'), nom: champ(b, 'layername'), fournisseur: champ(b, 'provider'),
      source: champ(b, 'datasource') ?? '', brut: b,
    })),
  };
}
// Source lue comme une chaîne de requête : aucun ordre imposé, paramètres inconnus tolérés
// (QgsDataSourceUri::encodedUri range par ordre alphabétique et ajoute les « http-header:… » à la fin).
const PARAMS_CONNUS = /^(type|url|zmin|zmax|tilePixelRatio|interpretation|username|password|authcfg|crs|http-header:.*)$/;
const decoder = (t) => t.replace(/(%[0-9A-Fa-f]{2})+/g, (m) => { try { return decodeURIComponent(m); } catch { return m; } });
const lireSource = (s) => {
  const p = {}; let dernier = null;
  for (const seg of s.split('&')) {
    const i = seg.indexOf('='); const k = i < 0 ? seg : seg.slice(0, i);
    if (i >= 0 && PARAMS_CONNUS.test(k) && !(k in p)) { p[k] = seg.slice(i + 1); dernier = k; }
    else if (dernier === 'url') p.url += '&' + seg; // URL non encodée : ses « & » ne sont pas des séparateurs
  }
  if (p.type === undefined || p.url === undefined) return null;
  let url = p.url; try { url = decodeURIComponent(url); } catch { /* url non encodée */ }
  const n = (v) => (v !== undefined && /^\d+$/.test(v) ? Number(v) : undefined);
  return { type: p.type, url, zmin: n(p.zmin), zmax: n(p.zmax) };
};

// --- Vérifications : chacune renvoie une liste de défauts (vide = conforme) -----------------------------
const verifs = {
  'CRS du projet EPSG:2154': (p) => (p.crsProjet.authid === 'EPSG:2154' && p.crsProjet.srid === '2154' ? [] : [`projectCrs = ${p.crsProjet.authid}/${p.crsProjet.srid}, attendu EPSG:2154/2154`]),
  'CRS de la carte (destinationsrs) EPSG:2154': (p) => (p.crsCarte === 'EPSG:2154' ? [] : [`destinationsrs = ${p.crsCarte}, attendu EPSG:2154`]),
  'variable de projet cerf_id : une seule, UUID non nul': (p) => {
    const v = p.variables.filter(([n]) => n === 'cerf_id');
    if (v.length !== 1) return [`${v.length} variable(s) cerf_id au niveau du projet, attendu 1`];
    if (!UUID.test(v[0][1] ?? '')) return [`cerf_id = « ${v[0][1]} », pas un UUID`];
    return v[0][1] === UUID_NUL ? ["cerf_id est l'UUID nul : à générer par QGIS"] : [];
  },
  'exactement deux couches, toutes XYZ (aucune donnée métier)': (p) => {
    const d = [];
    if (p.couches.length !== 2) d.push(`${p.couches.length} couche(s), attendu 2`);
    for (const c of p.couches) {
      const s = lireSource(c.source);
      if (c.fournisseur !== 'wms' || !s || s.type !== 'xyz') d.push(`couche « ${c.nom} » : source « ${c.source.slice(0, 60)} », attendu type=xyz (fournisseur wms)`);
    }
    return d;
  },
  'les deux fonds attendus, gabarit XYZ exact (PM, {z}/{y}/{x}, format)': (p) => {
    const urls = p.couches.map((c) => lireSource(c.source)?.url);
    return FONDS.filter((f) => !urls.includes(f.url)).map((f) => `fond ${f.nom} : URL XYZ attendue absente ou différente : ${f.url}`)
      .concat(urls.filter((u) => u && !FONDS.some((f) => f.url === u)).map((u) => `URL inattendue : ${u}`));
  },
  'zoom 0 à 19 sur chaque fond': (p) => p.couches.flatMap((c) => {
    const s = lireSource(c.source) ?? {}; const d = [];
    if (s.zmax !== ZMAX) d.push(`« ${c.nom} » : zmax = ${s.zmax}, attendu ${ZMAX}`);
    if (s.zmin !== ZMIN) d.push(`« ${c.nom} » : zmin = ${s.zmin}, attendu ${ZMIN}`);
    return d;
  }),
  'attribution « © IGN » sur chaque fond': (p) => p.couches.filter((c) => !c.brut.includes(ATTRIBUTION)).map((c) => `« ${c.nom} » : « ${ATTRIBUTION} » absent de la couche`),
  "les deux fonds sont dans l'arbre des couches": (p) => p.couches.filter((c) => !p.arbre.includes(c.id)).map((c) => `« ${c.nom} » (${c.id}) absent du layer-tree`),
  "aucune clé d'API dans le projet": (p) => (/(apikey|api_key|[?&;]key=|[?&;]token=)/i.test(decoder(dexml(p.xml))) ? ['une clé ou un jeton apparaît dans le projet'] : []),
};
const defauts = (buf) => { const p = analyser(buf); return Object.entries(verifs).flatMap(([n, f]) => f(p).map((d) => `${n} : ${d}`)); };

// --- Fixture : un projet conforme, écrit comme QGIS 3.x l'écrit ---------------------------------------
const UUID_ESSAI = '3f2b8c1e-7a4d-4e59-9b1a-0c6d5e8f7a21';
const encode = (u) => encodeURIComponent(u).replace(/%7B/g, '{').replace(/%7D/g, '}');
const couche = (i, f, o = {}) => `<maplayer type="raster"><id>fond_${i}</id><layername>${f.nom}</layername><provider encoding="">wms</provider>` +
  `<datasource>${(o.source ?? `type=xyz&url=${encode(o.url ?? f.url)}&zmax=${o.zmax ?? 19}&zmin=0`).replace(/&/g, '&amp;')}</datasource>` +
  `<srs><spatialrefsys><authid>EPSG:3857</authid></spatialrefsys></srs><resourceMetadata><rights>${o.rights ?? '© IGN'}</rights></resourceMetadata></maplayer>`;
function projet(o = {}) {
  const fonds = o.fonds ?? FONDS;
  const noms = o.sansId ? '' : `<value>${o.nomVar ?? 'cerf_id'}</value>`;
  const vals = o.sansId ? '' : `<value>${o.valeur ?? UUID_ESSAI}</value>`;
  return `<!DOCTYPE qgis><qgis version="3.34"><projectCrs><spatialrefsys><srid>${o.srid ?? 2154}</srid><authid>${o.authid ?? 'EPSG:2154'}</authid></spatialrefsys></projectCrs>` +
    `<layer-tree-group>${fonds.map((f, i) => `<layer-tree-layer id="fond_${i}" name="${f.nom}"/>`).join('')}</layer-tree-group>` +
    `<mapcanvas name="theMapCanvas"><destinationsrs><spatialrefsys><srid>2154</srid><authid>${o.canvas ?? 'EPSG:2154'}</authid></spatialrefsys></destinationsrs></mapcanvas>` +
    `<projectlayers>${fonds.map((f, i) => couche(i, f, i === 0 ? o.c0 : undefined)).join('')}</projectlayers>` +
    `<properties><Variables><variableNames type="QStringList">${noms}</variableNames><variableValues type="QStringList">${vals}</variableValues></Variables></properties></qgis>`;
}
const qgz = (xml) => ecrireZip({ 'cerf.qgs': xml });

// --- Garde-fous : la vérification accepte le juste, refuse chaque faute -------------------------------------
test('garde-fou : un projet conforme (fixture) ne donne aucun défaut', () => {
  assert.deepEqual(defauts(qgz(projet())), []);
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
test('garde-fou : projet conforme, ordre alphabétique de QGIS (interpretation, tilePixelRatio, type, url, zmax, zmin)', () => {
  const o = { c0: { source: `interpretation=&tilePixelRatio=0&type=xyz&url=${enc(FONDS[0])}&zmax=19&zmin=0` } };
  assert.deepEqual(defauts(qgz(projet(o))), []);
});
const fautes = {
  'CRS projet EPSG:4326': [{ authid: 'EPSG:4326', srid: 4326 }, 'CRS du projet'],
  'CRS carte EPSG:3857': [{ canvas: 'EPSG:3857' }, 'CRS de la carte'],
  'cerf_id absent': [{ sansId: true }, 'variable de projet cerf_id'],
  'variable mal nommée (cerf-id)': [{ nomVar: 'cerf-id' }, 'variable de projet cerf_id'],
  'cerf_id pas un UUID': [{ valeur: 'ma-foret' }, 'variable de projet cerf_id'],
  'cerf_id UUID nul': [{ valeur: UUID_NUL }, 'UUID nul'],
  'zoom max 20 (404 au-delà de 19)': [{ c0: { zmax: 20 } }, 'zoom 0 à 19'],
  'jeu PM_0_19 au lieu de PM': [{ c0: { url: FONDS[0].url.replace('TILEMATRIXSET=PM&', 'TILEMATRIXSET=PM_0_19&') } }, 'gabarit XYZ exact'],
  'lignes et colonnes inversées': [{ c0: { url: FONDS[0].url.replace('TILEROW={y}&TILECOL={x}', 'TILEROW={x}&TILECOL={y}') } }, 'gabarit XYZ exact'],
  'format PNG au lieu de JPEG sur la BD ORTHO': [{ fonds: [FONDS[0], { ...FONDS[1], url: FONDS[1].url.replace('image/jpeg', 'image/png') }] }, 'gabarit XYZ exact'],
  'couche WMTS au lieu de XYZ': [{ c0: { source: 'contextualWMSLegend=0&crs=EPSG:3857&format=image/png&layers=X&tileMatrixSet=PM&url=https://data.geopf.fr/wmts?SERVICE%3DWMTS%26REQUEST%3DGetCapabilities' } }, 'toutes XYZ'],
  'attribution absente': [{ c0: { rights: '' } }, 'attribution'],
  'un seul fond': [{ fonds: [FONDS[0]] }, 'exactement deux couches'],
  'une troisième couche': [{ fonds: [...FONDS, { nom: 'SCAN 25', url: GABARIT('GEOGRAPHICALGRIDSYSTEMS.MAPS', 'image/jpeg') }] }, 'exactement deux couches'],
  "clé encodée dans l'URL (%26key%3DSECRET)": [{ c0: { url: FONDS[0].url + '&key=SECRET', source: `type=xyz&url=${encode(FONDS[0].url)}%26key%3DSECRET&zmax=19&zmin=0` } }, 'aucune clé'],
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

// --- Le vrai cerf.qgz : rouge tant que la mission 006 n'est pas faite ----------------------------------------
function reel() {
  assert.ok(existsSync(CHEMIN), "cerf.qgz absent à la racine du dépôt : le projet modèle n'est pas encore produit (mission 006)");
  return analyser(readFileSync(CHEMIN));
}
test('cerf.qgz existe et contient un seul .qgs', () => { reel(); });
for (const [nom, f] of Object.entries(verifs)) {
  test(`cerf.qgz : ${nom}`, () => {
    assert.deepEqual(f(reel()), []);
  });
}

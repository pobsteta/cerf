// Mission 020 : tests de la couche de saisie « Saisie terrain » (écrits avant la production, mission 021).
// Sources des valeurs (aucune n'est inventée) :
//   - docs/spec.md § 3.5 : saisie.gpkg à côté de cerf.qgz, chemin relatif ; table saisie_terrain, Point, EPSG:2154, vide ;
//     couche « Saisie terrain » modifiable, au-dessus du groupe « Fonds de carte » ; champs fid, essence (texte),
//     diametre (entier), remarque (texte), date (date et heure, défaut now(), modifiable) ;
//   - docs/spec.md § 5 (règle ProdBois / Relevés) : cercle noir plein 2 mm ; étiquette "essence" || '\n' || "diametre",
//     8 pt, noire, liseré blanc ; § 2 point 1 et § 3.4 : deux fonds XYZ, groupe « Fonds de carte » ;
//   - docs/spec.md § 6 n° 10 et docs/brief.md (amendement du 3 novembre 2026).
// Emplacement : saisie.gpkg et cerf.qgz à la racine du dépôt (comme tests/projet-modele.test.mjs).
//   La variable d'environnement CERF_RACINE (facultative) remplace cette racine : elle sert à prouver que les tests
//   sont satisfiables sur des fichiers jetables ; elle n'est pas posée en CI.
// ROUGE ATTENDU jusqu'à la mission 021 : chaque test « réel » échoue avec « saisie.gpkg absent : rouge attendu… »
//   ou « couche « Saisie terrain » absente… ». Les tests « garde-fou » (fixtures fabriquées ici) sont verts : ils
//   prouvent que chaque vérification accepte un fichier juste et refuse chaque faute.
// Choix tolérants (non tranchés par la spec) : repérés « TOLÉRANCE » ci-dessous et listés dans le rapport du testeur.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync, mkdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';

// Une URL n'est jamais lue par .pathname (encodage en pourcent, « /C:/ » sous Windows) : fileURLToPath partout.
const racineDepuis = (dossier) => pathToFileURL(resolve(dossier) + sep);
const cheminGpkg = (racine) => fileURLToPath(new URL('saisie.gpkg', racine));
const RACINE = process.env.CERF_RACINE ? racineDepuis(process.env.CERF_RACINE) : new URL('../', import.meta.url);
const CHEMIN_QGZ = new URL('cerf.qgz', RACINE);
const CHEMIN_GPKG = new URL('saisie.gpkg', RACINE);

// --- Valeurs attendues ---------------------------------------------------------------------------------
const NOM_COUCHE = 'Saisie terrain', NOM_GROUPE = 'Fonds de carte';
const FICHIER = 'saisie.gpkg', TABLE = 'saisie_terrain', SRID = 2154;
const CHAMPS = ['fid', 'essence', 'diametre', 'remarque', 'date'];
const ETIQUETTE = `"essence" || '\\n' || "diametre"`; // le « \n » est le caractère « \ » puis « n », comme dans la spec
const APP_ID_GPKG = [0x47504b47, 0x47503130, 0x47503131]; // « GPKG » (1.2+), « GP10 », « GP11 »

// --- Lecture d'un zip (copie de tests/projet-modele.test.mjs, sans dépendance) -------------------------------
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
function qgsDuQgz(buf) {
  const zip = lireZip(buf);
  const qgs = Object.keys(zip).filter((n) => /\.qgs$/i.test(n));
  if (qgs.length !== 1) throw new Error(`le .qgz doit contenir exactement un .qgs, trouvé ${qgs.length}`);
  return zip[qgs[0]].toString('utf8');
}

// =====================================================================================================
// PARTIE 1 : le GeoPackage
// =====================================================================================================
function lireGpkg(chemin) {
  const g = { erreurs: [] };
  const essai = (nom, f, defaut) => { try { return f(); } catch (e) { g.erreurs.push(`${nom} : ${e.message}`); return defaut; } };
  const entete = readFileSync(chemin).subarray(0, 16).toString('latin1');
  g.estSqlite = entete === 'SQLite format 3\0';
  if (!g.estSqlite) return g;
  const db = new DatabaseSync(chemin, { readOnly: true });
  try {
    g.appId = essai('application_id', () => db.prepare('PRAGMA application_id').get().application_id);
    g.integrite = essai('integrity_check', () => db.prepare('PRAGMA integrity_check').all().map((r) => r.integrity_check));
    g.tables = essai('sqlite_master', () => db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name), []);
    g.contenus = essai('gpkg_contents', () => db.prepare('SELECT * FROM gpkg_contents').all(), []);
    g.colsGeom = essai('gpkg_geometry_columns', () => db.prepare('SELECT * FROM gpkg_geometry_columns').all(), []);
    g.srs = essai('gpkg_spatial_ref_sys', () => db.prepare('SELECT * FROM gpkg_spatial_ref_sys').all(), []);
    g.colonnes = essai(`table ${TABLE}`, () => db.prepare(`PRAGMA table_info("${TABLE}")`).all(), []);
    g.lignes = essai(`table ${TABLE}`, () => db.prepare(`SELECT count(*) AS n FROM "${TABLE}"`).get().n, null);
  } finally { db.close(); }
  return g;
}
const type = (t) => String(t ?? '').toUpperCase().replace(/\(.*\)/, '').trim();
const TYPES = {
  // TOLÉRANCE : noms de types GeoPackage (OGC 12-128r19) ; la spec Cerf dit seulement « entier », « texte », « date et heure ».
  essence: [/^TEXT$/], remarque: [/^TEXT$/],
  diametre: [/^(INTEGER|INT|SMALLINT|MEDIUMINT)$/],   // pas REAL ni TEXT ; TINYINT exclu (127 cm au plus)
  date: [/^(DATETIME|TIMESTAMP)$/],                    // TOLÉRANCE : TIMESTAMP accepté ; DATE seul ou TEXT refusés (il faut l'heure)
};
const nonSqlite = ['pas un fichier SQLite'];
const verifsGpkg = {
  'saisie.gpkg est un fichier SQLite valide (en-tête, integrity_check)': (g) => {
    if (!g.estSqlite) return ["l'en-tête n'est pas « SQLite format 3 »"];
    return g.integrite?.length === 1 && g.integrite[0] === 'ok' ? [] : [`integrity_check = ${JSON.stringify(g.integrite)}`];
  },
  'saisie.gpkg est un GeoPackage (application_id, tables gpkg_*)': (g) => {
    if (!g.estSqlite) return nonSqlite;
    const d = [];
    if (!APP_ID_GPKG.includes(g.appId)) d.push(`application_id = ${g.appId}, attendu 0x47504B47 (« GPKG »)`);
    for (const t of ['gpkg_spatial_ref_sys', 'gpkg_contents', 'gpkg_geometry_columns']) if (!g.tables.includes(t)) d.push(`table ${t} absente`);
    return d;
  },
  "une table saisie_terrain, enregistrée comme couche d'entités en EPSG:2154": (g) => {
    if (!g.estSqlite) return nonSqlite;
    const c = g.contenus?.find((r) => r.table_name === TABLE);
    if (!c) return [`${TABLE} absente de gpkg_contents (tables : ${JSON.stringify(g.contenus?.map((r) => r.table_name))})`];
    const d = [];
    if (c.data_type !== 'features') d.push(`data_type = ${c.data_type}, attendu features`);
    if (c.srs_id !== SRID) d.push(`gpkg_contents.srs_id = ${c.srs_id}, attendu ${SRID}`);
    if (!g.tables.includes(TABLE)) d.push(`la table ${TABLE} n'existe pas`);
    return d;
  },
  'géométrie Point, srs_id 2154 (gpkg_geometry_columns)': (g) => {
    if (!g.estSqlite) return nonSqlite;
    const r = g.colsGeom?.filter((x) => x.table_name === TABLE) ?? [];
    if (r.length !== 1) return [`${r.length} colonne(s) géométrique(s) déclarée(s) pour ${TABLE}, attendu 1`];
    const d = [];
    if (String(r[0].geometry_type_name).toUpperCase() !== 'POINT') d.push(`geometry_type_name = ${r[0].geometry_type_name}, attendu POINT (ni MULTIPOINT ni GEOMETRY)`);
    if (r[0].srs_id !== SRID) d.push(`geometry_columns.srs_id = ${r[0].srs_id}, attendu ${SRID}`);
    return d;
  },
  'EPSG:2154 déclaré dans gpkg_spatial_ref_sys (organisation EPSG, code 2154)': (g) => {
    if (!g.estSqlite) return nonSqlite;
    const r = g.srs?.find((x) => x.srs_id === SRID);
    if (!r) return [`srs_id ${SRID} absent de gpkg_spatial_ref_sys`];
    return String(r.organization).toUpperCase() === 'EPSG' && r.organization_coordsys_id === SRID ? [] : [`srs ${SRID} : organisation ${r.organization}:${r.organization_coordsys_id}, attendu EPSG:${SRID}`];
  },
  "champs : fid (clé entière), essence, diametre, remarque, date, et la géométrie, rien d'autre": (g) => {
    if (!g.estSqlite) return nonSqlite;
    if (!g.colonnes?.length) return [`table ${TABLE} sans colonnes (absente ?)`];
    const geom = g.colsGeom?.find((x) => x.table_name === TABLE)?.column_name;
    const d = [];
    if (!geom || !g.colonnes.some((c) => c.name === geom)) d.push(`colonne géométrique « ${geom} » absente de la table`);
    const noms = g.colonnes.map((c) => c.name).filter((n) => n !== geom);
    for (const n of CHAMPS) if (!noms.includes(n)) d.push(`champ ${n} absent`);
    for (const n of noms) if (!CHAMPS.includes(n)) d.push(`champ inattendu « ${n} » (la spec § 3.5 n'en prévoit pas d'autre)`);
    const col = (n) => g.colonnes.find((c) => c.name === n);
    if (col('fid') && !(col('fid').pk === 1 && type(col('fid').type) === 'INTEGER')) d.push(`fid : pk=${col('fid').pk}, type ${col('fid').type}, attendu clé primaire INTEGER`);
    for (const [n, motifs] of Object.entries(TYPES)) if (col(n) && !motifs.some((m) => m.test(type(col(n).type)))) d.push(`${n} : type ${col(n).type}, attendu ${motifs.map(String).join(' ou ')}`);
    // Facultatif en saisie : ni essence, ni diametre, ni remarque ne doit être NOT NULL.
    for (const n of ['essence', 'diametre', 'remarque']) if (col(n)?.notnull) d.push(`${n} : NOT NULL, la saisie doit pouvoir le laisser vide`);
    return d;
  },
  'la table est vide à la livraison (zéro ligne)': (g) => {
    if (!g.estSqlite) return nonSqlite;
    return g.lignes === 0 ? [] : [`${g.lignes} ligne(s) dans ${TABLE}, attendu 0`];
  },
};
const defautsGpkg = (chemin) => { const g = lireGpkg(chemin); return Object.entries(verifsGpkg).flatMap(([n, f]) => f(g).map((d) => `${n} : ${d}`)); };

// =====================================================================================================
// PARTIE 2 : la couche dans cerf.qgz
// =====================================================================================================
const dexml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:.-]+)="([^"]*)"/g)].map((m) => [m[1], dexml(m[2])]));
const balise = (bloc, nom) => { const m = bloc.match(new RegExp(`<${nom}(?:\\s[^>]*)?>([\\s\\S]*?)</${nom}>`)); return m ? dexml(m[1]).trim() : null; };
// « 0,0,0,255 », « 0,0,0,255,rgb:0,0,0,1 » (QGIS 3.34) ou « #000000 » → {r,g,b,a} ; null si illisible
function couleur(s) {
  if (s == null) return null;
  const h = String(s).trim().match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (h) return { r: parseInt(h[1].slice(0, 2), 16), g: parseInt(h[1].slice(2, 4), 16), b: parseInt(h[1].slice(4, 6), 16), a: h[2] ? parseInt(h[2], 16) : 255 };
  const p = String(s).split(',').map((x) => x.trim());
  if (p.length < 3 || p.slice(0, 3).some((x) => !/^\d+$/.test(x))) return null;
  return { r: +p[0], g: +p[1], b: +p[2], a: /^\d+$/.test(p[3] ?? '') ? +p[3] : 255 };
}
const estCouleur = (s, r, g, b) => { const c = couleur(s); return !!c && c.r === r && c.g === g && c.b === b && c.a === 255; };
const options = (bloc) => { // <Option name= value=> (QGIS 3.x) et <prop k= v=> (écritures anciennes)
  const o = {};
  for (const m of bloc.matchAll(/<(?:Option|prop)\b[^>]*>/g)) { const a = attrs(m[0]); const k = a.name ?? a.k, v = a.value ?? a.v; if (k !== undefined && v !== undefined) o[k] = v; }
  return o;
};

function analyserQgs(xml) {
  const couches = [...xml.matchAll(/<maplayer\b[\s\S]*?<\/maplayer>/g)].map((m) => m[0]).map((b) => ({
    id: balise(b, 'id'), nom: balise(b, 'layername'), fournisseur: balise(b, 'provider'), source: balise(b, 'datasource') ?? '',
    attrs: attrs(b.match(/<maplayer\b[^>]*>/)[0]), brut: b,
  }));
  // Arbre des couches : jeton par jeton, pile de groupes (les layer-tree-layer ne s'emboîtent pas).
  const racines = []; const pile = [];
  for (const m of xml.matchAll(/<(\/?)layer-tree-(group|layer)\b([^>]*?)(\/?)>/g)) {
    const [, fermant, genre, reste, auto] = m;
    if (genre === 'group') {
      if (fermant) { pile.pop(); continue; }
      const noeud = { genre: 'groupe', nom: attrs(reste).name, enfants: [] };
      if (pile.length) pile.at(-1).enfants.push(noeud); else racines.push(noeud);
      if (!auto) pile.push(noeud);
    } else if (!fermant && pile.length) pile.at(-1).enfants.push({ genre: 'couche', id: attrs(reste).id, nom: attrs(reste).name });
  }
  const ordre = xml.match(/<custom-order\b([^>]*)>([\s\S]*?)<\/custom-order>/);
  return {
    xml, couches, racine: racines[0] ?? null,
    ordrePerso: ordre ? { actif: ['1', 'true'].includes(attrs(ordre[1]).enabled), items: [...ordre[2].matchAll(/<item>([\s\S]*?)<\/item>/g)].map((x) => dexml(x[1]).trim()) } : null,
  };
}
const saisies = (p) => p.couches.filter((c) => c.nom === NOM_COUCHE);
const saisie = (p) => saisies(p)[0];
const absente = () => [`couche « ${NOM_COUCHE} » absente de cerf.qgz : rouge attendu jusqu'à la mission 021`];
const vrai = (v) => ['1', 'true'].includes(v);

const verifsQgs = {
  'une seule couche « Saisie terrain », vectorielle, ponctuelle, fournisseur ogr, en EPSG:2154': (p) => {
    const n = saisies(p).length; if (n !== 1) return n === 0 ? absente() : [`${n} couches « ${NOM_COUCHE} », attendu 1`];
    const c = saisie(p), d = [];
    if (c.attrs.type !== 'vector') d.push(`type = ${c.attrs.type}, attendu vector`);
    if (c.attrs.geometry !== undefined && c.attrs.geometry !== 'Point') d.push(`geometry = ${c.attrs.geometry}, attendu Point`);
    if (c.fournisseur !== 'ogr') d.push(`fournisseur = ${c.fournisseur}, attendu ogr`);
    const srs = c.brut.match(/<srs>[\s\S]*?<\/srs>/)?.[0] ?? '';
    if (balise(srs, 'authid') !== 'EPSG:2154') d.push(`srs de la couche = ${balise(srs, 'authid')}, attendu EPSG:2154`);
    return d;
  },
  'source : saisie.gpkg par chemin relatif, table saisie_terrain': (p) => {
    const c = saisie(p); if (!c) return absente();
    const [chemin, ...params] = c.source.split('|'), d = [];
    if (/^([a-z]:[\\/]|[\\/]|file:|\/vsi)/i.test(chemin) || /^[a-z][a-z0-9+.-]*:\/\//i.test(chemin)) d.push(`chemin absolu ou URL : « ${chemin} » (QField déplace le projet)`);
    else if (chemin.replace(/^\.\//, '') !== FICHIER) d.push(`chemin « ${chemin} », attendu ./${FICHIER} ou ${FICHIER} (à côté de cerf.qgz, sans sous-dossier ni « .. »)`);
    if (!params.includes(`layername=${TABLE}`)) d.push(`layername=${TABLE} absent de la source (« ${c.source} »)`);
    return d;
  },
  "la couche n'est pas en lecture seule, et ses champs essence, diametre, remarque, date sont modifiables": (p) => {
    const c = saisie(p); if (!c) return absente();
    const d = [];
    for (const [k, v] of Object.entries(c.attrs)) if (/read-?only/i.test(k) && vrai(v)) d.push(`attribut ${k} vrai sur la couche`);
    if (/<readOnly>\s*(1|true)\s*<\/readOnly>/i.test(c.brut)) d.push('élément <readOnly> vrai dans la couche');
    // Lecture seule au niveau du projet (Propriétés > Sources de données) : un élément « *ReadOnly* » qui cite l'identifiant de la couche.
    const horsCouches = p.xml.replace(/<maplayer\b[\s\S]*?<\/maplayer>/g, '');
    for (const m of horsCouches.matchAll(/<([\w-]*[Rr]ead-?[Oo]nly[\w-]*)\b[^>]*>([\s\S]*?)<\/\1>/g)) if (c.id && m[2].includes(c.id)) d.push(`couche listée dans <${m[1]}> du projet`);
    const ed = c.brut.match(/<editable>([\s\S]*?)<\/editable>/)?.[1] ?? '';
    for (const m of ed.matchAll(/<field\b[^>]*>/g)) { const a = attrs(m[0]); if (['essence', 'diametre', 'remarque', 'date'].includes(a.name) && a.editable === '0') d.push(`champ ${a.name} non modifiable (editable="0")`); }
    return d;
  },
  'arbre : la couche est à la racine, au-dessus du groupe « Fonds de carte » (et hors de lui)': (p) => {
    const c = saisie(p); if (!c) return absente();
    if (!p.racine) return ['arbre des couches introuvable'];
    const ids = p.racine.enfants.map((e) => (e.genre === 'couche' ? e.id : `groupe:${e.nom}`));
    const iCouche = p.racine.enfants.findIndex((e) => e.genre === 'couche' && e.id === c.id);
    const iGroupe = p.racine.enfants.findIndex((e) => e.genre === 'groupe' && e.nom === NOM_GROUPE);
    if (iGroupe < 0) return [`groupe « ${NOM_GROUPE} » absent de la racine de l'arbre`];
    const d = [];
    const dansGroupe = p.racine.enfants[iGroupe].enfants.some((e) => e.genre === 'couche' && e.id === c.id);
    if (dansGroupe) d.push(`la couche est DANS le groupe « ${NOM_GROUPE} » (doit être hors du groupe)`);
    else if (iCouche < 0) d.push(`la couche (id ${c.id}) n'est pas à la racine de l'arbre (racine : ${JSON.stringify(ids)})`);
    else if (iCouche > iGroupe) d.push(`la couche est SOUS le groupe « ${NOM_GROUPE} » (racine : ${JSON.stringify(ids)}), elle doit être au-dessus`);
    // Si l'ordre de dessin est personnalisé, la couche doit y précéder les fonds.
    const o = p.ordrePerso;
    if (o?.actif) {
      const fonds = p.racine.enfants[iGroupe].enfants.map((e) => e.id);
      const i = o.items.indexOf(c.id), j = Math.min(...fonds.map((f) => (o.items.includes(f) ? o.items.indexOf(f) : Infinity)));
      if (i < 0 || i > j) d.push("ordre de dessin personnalisé (custom-order) : la couche n'est pas avant les fonds");
    }
    return d;
  },
  'le groupe « Fonds de carte » contient toujours exactement les deux fonds XYZ (non-régression de la 005)': (p) => {
    const g = p.racine?.enfants.find((e) => e.genre === 'groupe' && e.nom === NOM_GROUPE);
    if (!g) return [`groupe « ${NOM_GROUPE} » absent`];
    const d = [];
    const cs = g.enfants.filter((e) => e.genre === 'couche');
    if (cs.length !== 2 || g.enfants.length !== 2) d.push(`${g.enfants.length} élément(s) dans le groupe, attendu 2 couches`);
    for (const e of cs) { const c = p.couches.find((x) => x.id === e.id); if (!c || c.fournisseur !== 'wms' || !/(^|&)type=xyz(&|$)/.test(c.source)) d.push(`« ${e.nom} » n'est pas une couche XYZ (fournisseur wms)`); }
    return d;
  },
  'défaut du champ date : now(), appliqué à la création seulement': (p) => {
    const c = saisie(p); if (!c) return absente();
    const defs = [...(c.brut.match(/<defaults>([\s\S]*?)<\/defaults>/)?.[1] ?? '').matchAll(/<default\b[^>]*>/g)].map((m) => attrs(m[0]));
    const dd = defs.filter((a) => a.field === 'date');
    if (dd.length !== 1) return [`${dd.length} défaut(s) déclaré(s) pour le champ date, attendu 1 (défauts : ${JSON.stringify(defs)})`];
    const d = [];
    // TOLÉRANCE : espaces et casse libres autour de now() ; forme XML de QGIS 3.x (<default field= expression= applyOnUpdate=>).
    if (!/^\s*now\(\s*\)\s*$/i.test(dd[0].expression ?? '')) d.push(`expression = « ${dd[0].expression} », attendu now()`);
    if (vrai(dd[0].applyOnUpdate)) d.push('applyOnUpdate = 1 : la date serait réécrite à chaque modification (la spec : « modifiable »)');
    return d;
  },
  'symbole : un cercle noir plein de 2 mm': (p) => {
    const c = saisie(p); if (!c) return absente();
    // Seul le rendu de la couche compte : le fond d'étiquette et le symbole de sélection ont aussi des symboles marker.
    const rendu = c.brut.match(/<renderer-v2\b[\s\S]*?<\/renderer-v2>/)?.[0];
    if (!rendu) return ['<renderer-v2> absent'];
    const marqueurs = [...rendu.matchAll(/<symbol\b[^>]*>/g)].map((m) => attrs(m[0])).filter((a) => a.type === 'marker');
    if (marqueurs.length !== 1) return [`${marqueurs.length} symbole(s) de type marker, attendu 1`];
    const s = rendu.match(/<layer\b[^>]*class="SimpleMarker"[^>]*>([\s\S]*?)<\/layer>/);
    if (!s) return ['aucune couche de symbole SimpleMarker'];
    const o = options(s[1]), d = [];
    if (o.name !== 'circle') d.push(`forme = ${o.name}, attendu circle`);
    if (!estCouleur(o.color, 0, 0, 0)) d.push(`remplissage = ${o.color}, attendu noir opaque (0,0,0,255)`);
    if (!(Number(o.size) === 2)) d.push(`taille = ${o.size}, attendu 2`);
    if (o.size_unit !== undefined && o.size_unit !== 'MM') d.push(`unité de taille = ${o.size_unit}, attendu MM`);
    if (marqueurs[0].alpha !== undefined && Number(marqueurs[0].alpha) !== 1) d.push(`opacité du symbole = ${marqueurs[0].alpha}, attendu 1`);
    if (o.style !== undefined && o.style !== 'solid') d.push(`style de remplissage = ${o.style}, attendu solid (plein)`);
    return d;
  },
  "étiquette : \"essence\" || '\\n' || \"diametre\", 8 pt, noire, liseré blanc": (p) => {
    const c = saisie(p); if (!c) return absente();
    if (['0', 'false'].includes(c.attrs.labelsEnabled)) return ['étiquettes désactivées (labelsEnabled="0")'];
    const l = c.brut.match(/<labeling\b([^>]*)>([\s\S]*?)<\/labeling>/);
    if (!l) return ["aucun bloc <labeling> : pas d'étiquette"];
    if (!['simple', 'rule-based'].includes(attrs(l[1]).type)) return [`labeling de type ${attrs(l[1]).type}, attendu simple`];
    const ts = l[2].match(/<text-style\b[^>]*>/); if (!ts) return ['<text-style> absent'];
    const t = attrs(ts[0]), d = [];
    // TOLÉRANCE : espaces libres autour de « || » ; un vrai saut de ligne entre apostrophes vaut « \n ».
    const expr = (t.fieldName ?? balise(l[2], 'fieldName') ?? '').replace(/\r?\n/g, '\\n').replace(/\s+/g, ' ').replace(/\s*\|\|\s*/g, ' || ').trim();
    if (expr !== ETIQUETTE) d.push(`expression = « ${expr} », attendu « ${ETIQUETTE} »`);
    if (t.isExpression !== undefined && !vrai(t.isExpression)) d.push("isExpression faux alors que l'étiquette est une expression");
    if (Number(t.fontSize) !== 8) d.push(`taille de police = ${t.fontSize}, attendu 8`);
    if (t.fontSizeUnit !== undefined && !/^Points?$/.test(t.fontSizeUnit)) d.push(`unité de police = ${t.fontSizeUnit}, attendu Point`);
    if (!estCouleur(t.textColor, 0, 0, 0)) d.push(`couleur du texte = ${t.textColor}, attendu noir opaque`);
    const tb = l[2].match(/<text-buffer\b[^>]*>/);
    if (!tb) d.push('<text-buffer> absent : pas de liseré');
    else {
      const b = attrs(tb[0]);
      if (!vrai(b.bufferDraw)) d.push('liseré non dessiné (bufferDraw)');
      if (!estCouleur(b.bufferColor, 255, 255, 255)) d.push(`couleur du liseré = ${b.bufferColor}, attendu blanc opaque`);
      if (!(Number(b.bufferSize) > 0)) d.push(`épaisseur du liseré = ${b.bufferSize}, attendu > 0`);
    }
    return d;
  },
};
const defautsQgs = (xml) => { const p = analyserQgs(xml); return Object.entries(verifsQgs).flatMap(([n, f]) => f(p).map((d) => `${n} : ${d}`)); };

// =====================================================================================================
// FIXTURES (garde-fous) : un GeoPackage et un projet justes, écrits comme GDAL / QGIS 3.34 les écrivent
// =====================================================================================================
const tmp = mkdtempSync(join(tmpdir(), 'cerf-saisie-'));
test.after(() => rmSync(tmp, { recursive: true, force: true }));
let compteur = 0;
function fabriquerGpkg(o = {}) {
  const chemin = join(tmp, `essai-${++compteur}.gpkg`);
  const db = new DatabaseSync(chemin);
  const t = o.types ?? {};
  if (o.appId !== 0) db.exec(`PRAGMA application_id = ${o.appId ?? 0x47504b47}; PRAGMA user_version = 10300;`);
  db.exec(`
    CREATE TABLE gpkg_spatial_ref_sys (srs_name TEXT NOT NULL, srs_id INTEGER PRIMARY KEY, organization TEXT NOT NULL, organization_coordsys_id INTEGER NOT NULL, definition TEXT NOT NULL, description TEXT);
    INSERT INTO gpkg_spatial_ref_sys VALUES ('Undefined Cartesian SRS',-1,'NONE',-1,'undefined',NULL),('Undefined geographic SRS',0,'NONE',0,'undefined',NULL),
      ('WGS 84',4326,'EPSG',4326,'GEOGCS["WGS 84"]',NULL),('RGF93 v1 / Lambert-93',2154,'EPSG',2154,'PROJCS["RGF93 v1 / Lambert-93"]',NULL);
    CREATE TABLE gpkg_contents (table_name TEXT NOT NULL PRIMARY KEY, data_type TEXT NOT NULL, identifier TEXT UNIQUE, description TEXT DEFAULT '', last_change DATETIME NOT NULL DEFAULT '2026-11-03T00:00:00.000Z', min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE, srs_id INTEGER);
    CREATE TABLE gpkg_geometry_columns (table_name TEXT NOT NULL, column_name TEXT NOT NULL, geometry_type_name TEXT NOT NULL, srs_id INTEGER NOT NULL, z TINYINT NOT NULL, m TINYINT NOT NULL, PRIMARY KEY (table_name, column_name));
  `);
  const tab = o.table ?? TABLE;
  const colonnes = [
    `fid ${t.fid ?? 'INTEGER'} PRIMARY KEY NOT NULL`, 'geom POINT',
    ...(o.sans?.includes('essence') ? [] : [`essence ${t.essence ?? 'TEXT'}`]), `diametre ${t.diametre ?? 'INTEGER'}`,
    `remarque ${t.remarque ?? 'TEXT'}${o.remarqueNotNull ? ' NOT NULL' : ''}`, `date ${t.date ?? 'DATETIME'}`, ...(o.extra ? [`${o.extra} TEXT`] : []),
  ];
  db.exec(`CREATE TABLE "${tab}" (${colonnes.join(', ')});`);
  db.exec(`INSERT INTO gpkg_contents (table_name, data_type, identifier, srs_id) VALUES ('${tab}', '${o.dataType ?? 'features'}', '${tab}', ${o.srsContenu ?? o.srs ?? 2154});`);
  db.exec(`INSERT INTO gpkg_geometry_columns VALUES ('${tab}', 'geom', '${o.geomDecl ?? 'POINT'}', ${o.srs ?? 2154}, 0, 0);`);
  for (let i = 0; i < (o.lignes ?? 0); i++) db.exec(`INSERT INTO "${tab}" (essence, diametre) VALUES ('CHE', ${30 + i});`);
  db.close();
  return chemin;
}

const ID = 'Saisie_terrain_6f1c2a90_3b7d_4c1e_8a55_0d9e7b1c2f34';
const FONDS_FIXTURE = [
  ['Plan_IGN_v2_1', 'Plan IGN v2', 'type=xyz&amp;url=https://data.geopf.fr/wmts?SERVICE%3DWMTS%26LAYER%3DX&amp;zmax=19&amp;zmin=0'],
  ['BD_ORTHO_2', 'BD ORTHO', 'type=xyz&amp;url=https://data.geopf.fr/wmts?SERVICE%3DWMTS%26LAYER%3DY&amp;zmax=19&amp;zmin=0'],
];
const symbole = (o) => `<renderer-v2 type="singleSymbol" symbollevels="0" forceraster="0" enableorderby="0"><symbols>` +
  `<symbol type="marker" name="0" alpha="${o.alphaSymbole ?? 1}" clip_to_extent="1" force_rhr="0"><data_defined_properties><Option type="Map"><Option name="name" value="" type="QString"/><Option name="properties"/><Option name="type" value="collection" type="QString"/></Option></data_defined_properties>` +
  `<layer class="SimpleMarker" enabled="1" locked="0" pass="0"><Option type="Map"><Option name="angle" value="0" type="QString"/><Option name="color" value="${o.couleur ?? '0,0,0,255,rgb:0,0,0,1'}" type="QString"/>` +
  `<Option name="name" value="${o.forme ?? 'circle'}" type="QString"/><Option name="outline_color" value="35,35,35,255,rgb:0.137,0.137,0.137,1" type="QString"/><Option name="size" value="${o.taille ?? '2'}" type="QString"/>` +
  `<Option name="size_unit" value="${o.uniteTaille ?? 'MM'}" type="QString"/></Option></layer></symbol></symbols></renderer-v2>`;
const PARASITE = (c) => `<symbol type="marker" name="markerSymbol" alpha="1"><layer class="SimpleMarker" enabled="1"><Option type="Map"><Option name="color" value="${c}" type="QString"/><Option name="name" value="square" type="QString"/><Option name="size" value="5" type="QString"/></Option></layer></symbol>`;
// QGIS 3.x : symbole marker dans le fond d'étiquette, et symbole de sélection hors du rendu
const PARASITES = `<parasites><background shapeDraw="0">${PARASITE('255,0,0,255')}</background></parasites><selection>${PARASITE('0,255,255,255')}</selection>`;
const echapper = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&apos;').replace(/</g, '&lt;');
const etiquette = (o) => (o.sansEtiquette ? '' : `<labeling type="simple"><settings calloutType="simple"><text-style fontSize="${o.police ?? 8}" fontSizeUnit="${o.unitePolice ?? 'Point'}" textColor="${o.couleurTexte ?? '0,0,0,255,rgb:0,0,0,1'}" ` +
  `fieldName="${echapper(o.expression ?? ETIQUETTE)}" isExpression="1" fontFamily="Sans Serif">` +
  (o.sansLisere ? '' : `<text-buffer bufferDraw="1" bufferColor="${o.couleurLisere ?? '255,255,255,255,rgb:1,1,1,1'}" bufferSize="1" bufferSizeUnits="MM"/>`) + `</text-style></settings></labeling>`);
function coucheSaisie(o = {}) {
  const defaut = o.sansDefaut ? '' : `<default field="date" expression="${o.defaut ?? 'now()'}" applyOnUpdate="${o.applyOnUpdate ?? 0}"/>`;
  return `<maplayer type="vector" geometry="${o.geometry ?? 'Point'}" labelsEnabled="${o.etiquettesActives ?? 1}" ${o.attrCouche ?? ''}>` +
    `<id>${ID}</id><datasource>${(o.source ?? './saisie.gpkg|layername=saisie_terrain').replace(/&/g, '&amp;')}</datasource><layername>${o.nom ?? NOM_COUCHE}</layername>` +
    `<srs><spatialrefsys><authid>${o.srs ?? 'EPSG:2154'}</authid></spatialrefsys></srs><provider encoding="UTF-8">${o.fournisseur ?? 'ogr'}</provider>` +
    symbole(o) + etiquette(o) + (o.parasites ? PARASITES : '') +
    `<editable><field name="fid" editable="0"/><field name="essence" editable="${o.essenceEditable ?? 1}"/><field name="diametre" editable="1"/><field name="remarque" editable="1"/><field name="date" editable="${o.dateEditable ?? 1}"/></editable>` +
    `<defaults><default field="fid" expression="" applyOnUpdate="0"/>${defaut}</defaults>${o.dansCouche ?? ''}</maplayer>`;
}
function projetFixture(o = {}) {
  const fonds = o.fonds ?? FONDS_FIXTURE;
  const feuilleSaisie = `<layer-tree-layer id="${ID}" name="${o.nom ?? NOM_COUCHE}" source="./saisie.gpkg" providerKey="ogr" checked="Qt::Checked"><customproperties><Option/></customproperties></layer-tree-layer>`;
  const groupe = `<layer-tree-group name="${NOM_GROUPE}" checked="Qt::Checked" expanded="1"><customproperties><Option/></customproperties>` +
    fonds.map(([i, n]) => `<layer-tree-layer id="${i}" name="${n}" providerKey="wms" checked="Qt::Checked"><customproperties><Option/></customproperties></layer-tree-layer>`).join('') +
    (o.saisieDansGroupe ? feuilleSaisie : '') + `</layer-tree-group>`;
  const racine = o.sansSaisie || o.saisieDansGroupe ? groupe : o.saisieDessous ? groupe + feuilleSaisie : feuilleSaisie + groupe;
  const ordre = o.ordrePerso ?? `<custom-order enabled="1"><item>${ID}</item>${fonds.map(([i]) => `<item>${i}</item>`).join('')}</custom-order>`;
  const couchesFonds = fonds.map(([i, n, s]) => `<maplayer type="raster"><id>${i}</id><layername>${n}</layername><provider encoding="">wms</provider><datasource>${s}</datasource></maplayer>`).join('');
  return `<!DOCTYPE qgis><qgis version="3.34.0-Prizren"><layer-tree-group><customproperties><Option/></customproperties>${racine}${ordre}</layer-tree-group>` +
    `<projectlayers>${couchesFonds}${o.sansSaisie ? '' : coucheSaisie(o)}${o.doublon ? coucheSaisie(o) : ''}</projectlayers>${o.horsCouches ?? ''}</qgis>`;
}

// --- Garde-fous GeoPackage ----------------------------------------------------------------------------------
test('garde-fou GeoPackage : un fichier conforme ne donne aucun défaut', () => {
  assert.deepEqual(defautsGpkg(fabriquerGpkg()), []);
});
test('garde-fou GeoPackage : accepte les variantes de types TIMESTAMP, INT, TEXT(50)', () => {
  assert.deepEqual(defautsGpkg(fabriquerGpkg({ types: { date: 'TIMESTAMP', diametre: 'INT', essence: 'TEXT(50)' } })), []);
});
const fautesGpkg = {
  'application_id absent (SQLite ordinaire)': [{ appId: 0 }, 'GeoPackage'],
  'srs 4326 (géométrie)': [{ srs: 4326 }, 'geometry_columns.srs_id'],
  'srs 4326 (gpkg_contents)': [{ srsContenu: 4326 }, 'gpkg_contents.srs_id'],
  'géométrie POLYGON déclarée': [{ geomDecl: 'POLYGON' }, 'attendu POINT'],
  'géométrie MULTIPOINT déclarée': [{ geomDecl: 'MULTIPOINT' }, 'attendu POINT'],
  'table mal nommée (saisie)': [{ table: 'saisie' }, 'absente de gpkg_contents'],
  'data_type attributes': [{ dataType: 'attributes' }, 'attendu features'],
  'une ligne déjà saisie': [{ lignes: 1 }, 'attendu 0'],
  'trois lignes déjà saisies': [{ lignes: 3 }, 'attendu 0'],
  'diametre décimal (REAL)': [{ types: { diametre: 'REAL' } }, 'diametre : type REAL'],
  'diametre texte': [{ types: { diametre: 'TEXT' } }, 'diametre : type TEXT'],
  'essence entier': [{ types: { essence: 'INTEGER' } }, 'essence : type INTEGER'],
  'date en TEXT (pas de vrai type date-heure)': [{ types: { date: 'TEXT' } }, 'date : type TEXT'],
  "date en DATE seul (sans l'heure)": [{ types: { date: 'DATE' } }, 'date : type DATE'],
  'fid non entier': [{ types: { fid: 'TEXT' } }, 'fid'],
  'champ essence absent': [{ sans: ['essence'] }, 'champ essence absent'],
  'champ en trop (commentaire)': [{ extra: 'commentaire' }, 'champ inattendu'],
  'remarque obligatoire (NOT NULL)': [{ remarqueNotNull: true }, 'NOT NULL'],
};
for (const [nom, [o, attendu]] of Object.entries(fautesGpkg)) {
  test(`garde-fou GeoPackage : refuse « ${nom} »`, () => {
    const d = defautsGpkg(fabriquerGpkg(o));
    assert.ok(d.some((x) => x.includes(attendu)), `défaut « ${attendu} » non détecté ; défauts : ${JSON.stringify(d)}`);
  });
}
test("garde-fou GeoPackage : un fichier qui n'est pas SQLite est refusé", () => {
  const f = join(tmp, 'faux.gpkg'); writeFileSync(f, 'ceci est du texte, pas une base SQLite');
  assert.ok(defautsGpkg(f).some((x) => x.includes('SQLite')));
});

test('garde-fou chemin : un dossier avec espace et accent est lu (fileURLToPath, pas .pathname)', () => {
  const dossier = join(tmp, 'racine é x'); mkdirSync(dossier);
  copyFileSync(fabriquerGpkg(), join(dossier, 'saisie.gpkg'));
  const racine = racineDepuis(dossier);
  assert.notEqual(new URL('saisie.gpkg', racine).pathname, join(dossier, 'saisie.gpkg'), 'précondition : .pathname est encodé');
  assert.ok(existsSync(cheminGpkg(racine)));
  assert.deepEqual(defautsGpkg(cheminGpkg(racine)), []);
});

// --- Garde-fous projet ------------------------------------------------------------------------------------------------
test('garde-fou projet : un projet conforme (fixture) ne donne aucun défaut', () => {
  assert.deepEqual(defautsQgs(projetFixture()), []);
});
const variantesAdmises = {
  'symboles marker parasites (fond d\'étiquette, sélection) hors du rendu': { parasites: true },
  'source sans « ./ »': { source: 'saisie.gpkg|layername=saisie_terrain' },
  'défaut NOW( ) avec espaces et casse': { defaut: ' NOW( ) ' },
  'couleurs en hexadécimal et sans suffixe rgb:': { couleur: '#000000', couleurTexte: '0,0,0,255', couleurLisere: '#ffffff' },
  'étiquette avec un vrai saut de ligne entre apostrophes': { expression: `"essence" || '\n' || "diametre"` },
  'étiquette sans espaces autour de ||': { expression: `"essence"||'\\n'||"diametre"` },
};
for (const [nom, o] of Object.entries(variantesAdmises)) test(`garde-fou projet : accepte ${nom}`, () => assert.deepEqual(defautsQgs(projetFixture(o)), []));
const fautesQgs = {
  'couche absente': [{ sansSaisie: true }, 'absente de cerf.qgz'],
  'couche mal nommée (Saisie)': [{ nom: 'Saisie' }, 'absente de cerf.qgz'],
  'deux couches « Saisie terrain »': [{ doublon: true }, 'attendu 1'],
  'fournisseur gdal (raster)': [{ fournisseur: 'gdal' }, 'fournisseur = gdal'],
  'géométrie Polygon': [{ geometry: 'Polygon' }, 'attendu Point'],
  'srs de la couche 4326': [{ srs: 'EPSG:4326' }, 'srs de la couche'],
  'chemin absolu Linux': [{ source: '/storage/emulated/0/saisie.gpkg|layername=saisie_terrain' }, 'chemin absolu'],
  'chemin absolu Windows': [{ source: 'C:\\cerf\\saisie.gpkg|layername=saisie_terrain' }, 'chemin absolu'],
  'chemin vers un sous-dossier': [{ source: './donnees/saisie.gpkg|layername=saisie_terrain' }, 'attendu ./saisie.gpkg'],
  'chemin remontant (../)': [{ source: '../saisie.gpkg|layername=saisie_terrain' }, 'attendu ./saisie.gpkg'],
  'autre fichier (saisie_2.gpkg)': [{ source: './saisie_2.gpkg|layername=saisie_terrain' }, 'attendu ./saisie.gpkg'],
  'layername absent': [{ source: './saisie.gpkg' }, 'layername=saisie_terrain absent'],
  'mauvaise table': [{ source: './saisie.gpkg|layername=points' }, 'layername=saisie_terrain absent'],
  'lecture seule (attribut readOnly)': [{ attrCouche: 'readOnly="1"' }, 'readOnly'],
  'lecture seule (élément <readOnly>)': [{ dansCouche: '<readOnly>1</readOnly>' }, '<readOnly>'],
  'lecture seule (liste du projet)': [{ horsCouches: `<properties><ReadOnlyLayers type="QStringList"><value>${ID}</value></ReadOnlyLayers></properties>` }, 'listée'],
  'champ date non modifiable': [{ dateEditable: 0 }, 'date non modifiable'],
  'champ essence non modifiable': [{ essenceEditable: 0 }, 'essence non modifiable'],
  'couche dans le groupe « Fonds de carte »': [{ saisieDansGroupe: true }, 'DANS le groupe'],
  'couche sous le groupe « Fonds de carte »': [{ saisieDessous: true }, 'SOUS le groupe'],
  'ordre de dessin personnalisé, saisie après les fonds': [{ ordrePerso: `<custom-order enabled="1"><item>Plan_IGN_v2_1</item><item>BD_ORTHO_2</item><item>${ID}</item></custom-order>` }, 'custom-order'],
  'un seul fond dans le groupe': [{ fonds: [FONDS_FIXTURE[0]] }, 'attendu 2'],
  'trois fonds dans le groupe': [{ fonds: [...FONDS_FIXTURE, ['SCAN_3', 'SCAN 25', 'type=xyz&amp;url=x']] }, 'attendu 2'],
  'fond WMTS au lieu de XYZ': [{ fonds: [['Plan_IGN_v2_1', 'Plan IGN v2', 'contextualWMSLegend=0&amp;url=x'], FONDS_FIXTURE[1]] }, "n'est pas une couche XYZ"],
  'défaut de date absent': [{ sansDefaut: true }, '0 défaut(s)'],
  'défaut de date = today()': [{ defaut: 'today()' }, 'attendu now()'],
  'défaut de date vide': [{ defaut: '' }, 'attendu now()'],
  'défaut de date réappliqué à chaque modification': [{ applyOnUpdate: 1 }, 'applyOnUpdate'],
  'symbole carré': [{ forme: 'square' }, 'attendu circle'],
  'symbole rouge': [{ couleur: '255,0,0,255,rgb:1,0,0,1' }, 'attendu noir'],
  'symbole noir translucide': [{ couleur: '0,0,0,128' }, 'attendu noir'],
  'symbole de 3 mm': [{ taille: '3' }, 'attendu 2'],
  'symbole de 2,5 mm': [{ taille: '2.5' }, 'attendu 2'],
  'symbole de 2 pixels': [{ uniteTaille: 'Pixel' }, 'unité de taille'],
  "symbole à 50 % d'opacité": [{ alphaSymbole: 0.5 }, 'opacité'],
  'étiquette absente': [{ sansEtiquette: true }, 'étiquette'],
  'étiquettes désactivées': [{ etiquettesActives: 0 }, 'désactivées'],
  'étiquette sur un seul champ': [{ expression: '"essence"' }, 'expression'],
  'étiquette en concat() (question JFC non tranchée)': [{ expression: `concat("essence", '\\n', "diametre")` }, 'expression'],
  'étiquette champs inversés': [{ expression: `"diametre" || '\\n' || "essence"` }, 'expression'],
  'étiquette sans saut de ligne (espace)': [{ expression: `"essence" || ' ' || "diametre"` }, 'expression'],
  'police 10 pt': [{ police: 10 }, 'attendu 8'],
  'police 8 mm': [{ unitePolice: 'MM' }, 'unité de police'],
  'texte rouge': [{ couleurTexte: '255,0,0,255' }, 'couleur du texte'],
  'sans liseré': [{ sansLisere: true }, 'liseré'],
  'liseré noir': [{ couleurLisere: '0,0,0,255' }, 'couleur du liseré'],
};
for (const [nom, [o, attendu]] of Object.entries(fautesQgs)) {
  test(`garde-fou projet : refuse « ${nom} »`, () => {
    const d = defautsQgs(projetFixture(o));
    assert.ok(d.some((x) => x.includes(attendu)), `défaut « ${attendu} » non détecté ; défauts : ${JSON.stringify(d)}`);
  });
}

// =====================================================================================================
// LES VRAIS FICHIERS : rouges tant que la mission 021 n'est pas faite
// =====================================================================================================
function gpkgReel() {
  assert.ok(existsSync(CHEMIN_GPKG), "saisie.gpkg absent à la racine du dépôt (à côté de cerf.qgz) : rouge attendu jusqu'à la mission 021");
  return cheminGpkg(RACINE);
}
function qgsReel() {
  assert.ok(existsSync(CHEMIN_QGZ), 'cerf.qgz absent à la racine du dépôt');
  return analyserQgs(qgsDuQgz(readFileSync(CHEMIN_QGZ)));
}
test('saisie.gpkg existe à côté de cerf.qgz', () => {
  assert.ok(existsSync(CHEMIN_QGZ), 'cerf.qgz absent');
  gpkgReel();
});
for (const [nom, f] of Object.entries(verifsGpkg)) test(`saisie.gpkg : ${nom}`, () => assert.deepEqual(f(lireGpkg(gpkgReel())), []));
for (const [nom, f] of Object.entries(verifsQgs)) test(`cerf.qgz : ${nom}`, () => assert.deepEqual(f(qgsReel()), []));

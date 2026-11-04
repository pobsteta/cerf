// SPDX-License-Identifier: GPL-3.0-or-later
// Cerf, prototype n° 2 (mission 023) : fabrique les fichiers d'essai (zip stocké
// essai-styles.zip, GeoPackage essai-q3.gpkg avec table layer_styles) à partir de rien :
// mêmes octets à chaque fabrication, jamais versés au dépôt (publiés par la préversion).
// Données FICTIVES : carrés de 300 m autour de Strasbourg, sans valeur métier, en Lambert 93
// (EPSG:2154), coordonnées X (est) puis Y (nord), en mètres.
//
// Usage : node prototype-2/fabriquer-essais.mjs [dossier-de-sortie]
//
// Limite dite : ni QGIS ni GDAL dans la session de fabrication ; les .qml et le GeoPackage
// ont été écrits de mémoire du format QGIS et contrôlés par des tests Node seulement. Pascal
// les ouvre dans QGIS avant l'essai (tests/recette/prototype-2.md, « Avant de commencer »).
import { writeFileSync, readFileSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { ecrireZip } from '../tests/recette/essai/zip-ecrire.mjs';
import { PRJ_L93 } from '../tests/recette/essai/fabriquer-essais.mjs';

// Centre des essais : le point de la question 6 reprojeté (1 051 112,70 ; 6 840 461,54,
// pyproj 3.8.0), arrondi au mètre.
export const CENTRE_L93 = { x: 1051113, y: 6840462 };
const COTE = 300;

// Styles du manuel (spec § 5) : couleur du contour ET de l'étiquette, épaisseur, police.
export const STYLES = {
  ug: { rvb: [0, 0, 255], epaisseurMm: '0.6', policePt: 10 },
  parcelles: { rvb: [255, 140, 0], epaisseurMm: '1', policePt: 15 },
  frt: { rvb: [0, 139, 139], epaisseurMm: '0.6', policePt: 10 },
};

const CHAMP = 'code_ug';

// .qml d'une couche polygone : contour seul (remplissage « no »), étiquette simple sur code_ug.
export function qmlStyle(s) {
  const c = `${s.rvb[0]},${s.rvb[1]},${s.rvb[2]},255`;
  const transparent = `${s.rvb[0]},${s.rvb[1]},${s.rvb[2]},0`;
  return `<!DOCTYPE qgis PUBLIC 'http://mrcc.com/qgis.dtd' 'SYSTEM'>
<qgis version="3.34.0-Prizren" styleCategories="Symbology|Labeling" labelsEnabled="1" hasScaleBasedVisibilityFlag="0" minScale="100000000" maxScale="0">
  <renderer-v2 type="singleSymbol" symbollevels="0" enableorderby="0" forceraster="0" referencescale="-1">
    <symbols>
      <symbol type="fill" name="0" alpha="1" force_rhr="0" clip_to_extent="1">
        <data_defined_properties>
          <Option type="Map">
            <Option type="QString" name="name" value=""/>
            <Option name="properties"/>
            <Option type="QString" name="type" value="collection"/>
          </Option>
        </data_defined_properties>
        <layer class="SimpleFill" enabled="1" locked="0" pass="0">
          <Option type="Map">
            <Option type="QString" name="border_width_map_unit_scale" value="3x:0,0,0,0,0,0"/>
            <Option type="QString" name="color" value="${transparent}"/>
            <Option type="QString" name="joinstyle" value="bevel"/>
            <Option type="QString" name="offset" value="0,0"/>
            <Option type="QString" name="offset_map_unit_scale" value="3x:0,0,0,0,0,0"/>
            <Option type="QString" name="offset_unit" value="MM"/>
            <Option type="QString" name="outline_color" value="${c}"/>
            <Option type="QString" name="outline_style" value="solid"/>
            <Option type="QString" name="outline_width" value="${s.epaisseurMm}"/>
            <Option type="QString" name="outline_width_unit" value="MM"/>
            <Option type="QString" name="style" value="no"/>
          </Option>
        </layer>
      </symbol>
    </symbols>
    <rotation/>
    <sizescale/>
  </renderer-v2>
  <labeling type="simple">
    <settings calloutType="simple">
      <text-style fieldName="${CHAMP}" isExpression="0" fontSize="${s.policePt}" fontSizeUnit="Point" textColor="${c}" textOpacity="1" fontWeight="50" fontItalic="0" fontUnderline="0" fontStrikeout="0" fontLetterSpacing="0" fontWordSpacing="0" blendMode="0" multilineHeight="1" previewBkgrdColor="255,255,255,255" namedStyle="Regular">
        <families/>
        <text-buffer bufferDraw="0" bufferSize="1" bufferSizeUnits="MM" bufferColor="255,255,255,255" bufferOpacity="1" bufferBlendMode="0" bufferJoinStyle="128" bufferNoFill="1"/>
        <background shapeDraw="0"/>
        <shadow shadowDraw="0"/>
      </text-style>
      <placement placement="1" placementFlags="10" polygonPlacementFlags="2" dist="0" distUnits="MM" priority="5" overlapHandling="PreventOverlap"/>
      <rendering scaleVisibility="0" scaleMin="0" scaleMax="0" fontMinPixelSize="3" fontMaxPixelSize="10000" fontLimitPixelSize="0" obstacle="1" obstacleFactor="1" obstacleType="1" labelPerPart="0" upsidedownLabels="0" limitNumLabels="0" maxNumLabels="2000" displayAll="1" mergeLines="0" minFeatureSize="0" zIndex="0"/>
    </settings>
  </labeling>
  <layerGeometryType>2</layerGeometryType>
</qgis>
`;
}

// Le .qml de la question 4, écrit PAR LE PLUGIN après le chargement : même texte que celui
// rangé dans le zip, en vert-bleu (style FRT) pour qu'on le distingue du bleu des questions 1 et 2.
export function qmlQ4() {
  return qmlStyle(STYLES.frt);
}

// --------------------------------------------------------------------------- géométries

// Deux carrés de 300 m : (dx, dy) = décalage du premier par rapport au centre, le second
// est 350 m plus au nord. Anneaux : [[x, y], …] fermés, sens anti-horaire (GeoJSON, GeoPackage).
function carres(dx, dy) {
  const un = (cx, cy) => {
    const x0 = CENTRE_L93.x + cx - COTE / 2;
    const y0 = CENTRE_L93.y + cy - COTE / 2;
    return [[x0, y0], [x0 + COTE, y0], [x0 + COTE, y0 + COTE], [x0, y0 + COTE], [x0, y0]];
  };
  return [un(dx, dy), un(dx, dy + 350)];
}

const geojson = (nom, anneaux, codes, avecCrs) => JSON.stringify({
  type: 'FeatureCollection',
  name: nom,
  ...(avecCrs ? { crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::2154' } } } : {}),
  features: anneaux.map((a, i) => ({ type: 'Feature', properties: { [CHAMP]: codes[i] }, geometry: { type: 'Polygon', coordinates: [a] } })),
}) + '\n';

function emprise(anneaux) {
  const xs = anneaux.flat().map((p) => p[0]); const ys = anneaux.flat().map((p) => p[1]);
  return { xmin: Math.min(...xs), xmax: Math.max(...xs), ymin: Math.min(...ys), ymax: Math.max(...ys) };
}

// Shapefile polygone (ESRI, 1998) : anneaux horaires dans le .shp.
function shapefile(anneaux, codes) {
  const e = emprise(anneaux);
  const tailleEnr = 8 + 4 + 32 + 4 + 4 + 4 + 16 * 5; // en-tête d'enregistrement + contenu = 136
  const shp = Buffer.alloc(100 + tailleEnr * anneaux.length);
  const shx = Buffer.alloc(100 + 8 * anneaux.length);
  const entete = (b, octets) => {
    b.writeInt32BE(9994, 0); b.writeInt32BE(octets / 2, 24); b.writeInt32LE(1000, 28); b.writeInt32LE(5, 32);
    [e.xmin, e.ymin, e.xmax, e.ymax].forEach((v, i) => b.writeDoubleLE(v, 36 + 8 * i));
  };
  entete(shp, shp.length); entete(shx, shx.length);
  anneaux.forEach((a, i) => {
    const horaire = [a[0], a[3], a[2], a[1], a[0]];
    const ex = emprise([a]);
    const o = 100 + tailleEnr * i;
    shp.writeInt32BE(i + 1, o); shp.writeInt32BE((tailleEnr - 8) / 2, o + 4);
    shp.writeInt32LE(5, o + 8);
    [ex.xmin, ex.ymin, ex.xmax, ex.ymax].forEach((v, k) => shp.writeDoubleLE(v, o + 12 + 8 * k));
    shp.writeInt32LE(1, o + 44); shp.writeInt32LE(5, o + 48); shp.writeInt32LE(0, o + 52);
    horaire.forEach((p, k) => { shp.writeDoubleLE(p[0], o + 56 + 16 * k); shp.writeDoubleLE(p[1], o + 64 + 16 * k); });
    shx.writeInt32BE(o / 2, 100 + 8 * i); shx.writeInt32BE((tailleEnr - 8) / 2, 104 + 8 * i);
  });
  // .dbf : un champ texte « code_ug » de 10 caractères.
  const dbf = Buffer.alloc(65 + 11 * codes.length + 1);
  dbf[0] = 3; dbf[1] = 126; dbf[2] = 11; dbf[3] = 4;
  dbf.writeUInt32LE(codes.length, 4); dbf.writeUInt16LE(65, 8); dbf.writeUInt16LE(11, 10);
  dbf.write(CHAMP, 32, 'latin1'); dbf[43] = 0x43; dbf[48] = 10; dbf[64] = 0x0d;
  codes.forEach((c, i) => { dbf.write(' ' + c.padEnd(10, ' '), 65 + 11 * i, 'latin1'); });
  dbf[dbf.length - 1] = 0x1a;
  return { shp, shx, dbf };
}

// --------------------------------------------------------------------------- GeoPackage

// Écrit avec node:sqlite (comme outils/projet-modele.mjs) : GeoPackage OGC 12-128 1.3, sans
// R-tree (ses déclencheurs appellent ST_*, absentes de node:sqlite). WKT des deux systèmes
// repris de outils/projet-modele.mjs (même source : base EPSG via GDAL/PROJ).
const WKT_4326 = 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AXIS["Latitude",NORTH],AXIS["Longitude",EAST],AUTHORITY["EPSG","4326"]]';
const WKT_2154 = 'PROJCS["RGF93 v1 / Lambert-93",GEOGCS["RGF93 v1",DATUM["RGF93_v1",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],TOWGS84[0,0,0,0,0,0,0],AUTHORITY["EPSG","6171"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4171"]],PROJECTION["Lambert_Conformal_Conic_2SP"],PARAMETER["latitude_of_origin",46.5],PARAMETER["central_meridian",3],PARAMETER["standard_parallel_1",49],PARAMETER["standard_parallel_2",44],PARAMETER["false_easting",700000],PARAMETER["false_northing",6600000],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["Easting",EAST],AXIS["Northing",NORTH],AUTHORITY["EPSG","2154"]]';
const DATE_FIXE = '2026-11-04T00:00:00.000Z';
export const TABLE_Q3 = 'Parcelles_q3';

// Géométrie GeoPackage (en-tête « GP », enveloppe XY) + WKB polygone, petit-boutiste.
function blobPolygone(anneau) {
  const e = emprise([anneau]);
  const b = Buffer.alloc(40 + 1 + 4 + 4 + 4 + 16 * anneau.length);
  b.write('GP', 0, 'latin1'); b[2] = 0; b[3] = 0x03; b.writeInt32LE(2154, 4);
  b.writeDoubleLE(e.xmin, 8); b.writeDoubleLE(e.xmax, 16); b.writeDoubleLE(e.ymin, 24); b.writeDoubleLE(e.ymax, 32);
  b[40] = 1; b.writeUInt32LE(3, 41); b.writeUInt32LE(1, 45); b.writeUInt32LE(anneau.length, 49);
  anneau.forEach((p, k) => { b.writeDoubleLE(p[0], 53 + 16 * k); b.writeDoubleLE(p[1], 61 + 16 * k); });
  return b;
}

function fabriquerGpkg(anneaux, codes) {
  const dossier = mkdtempSync(join(tmpdir(), 'cerf-gpkg-'));
  const chemin = join(dossier, 'essai-q3.gpkg');
  try {
    const db = new DatabaseSync(chemin);
    try {
      db.exec(`PRAGMA page_size = 4096; PRAGMA journal_mode = DELETE; PRAGMA application_id = 1196444487; PRAGMA user_version = 10300;
CREATE TABLE gpkg_spatial_ref_sys (srs_name TEXT NOT NULL, srs_id INTEGER PRIMARY KEY, organization TEXT NOT NULL, organization_coordsys_id INTEGER NOT NULL, definition TEXT NOT NULL, description TEXT);
CREATE TABLE gpkg_contents (table_name TEXT NOT NULL PRIMARY KEY, data_type TEXT NOT NULL, identifier TEXT UNIQUE, description TEXT DEFAULT '', last_change DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE, srs_id INTEGER, CONSTRAINT fk_gc_r_srs_id FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys(srs_id));
CREATE TABLE gpkg_geometry_columns (table_name TEXT NOT NULL, column_name TEXT NOT NULL, geometry_type_name TEXT NOT NULL, srs_id INTEGER NOT NULL, z TINYINT NOT NULL, m TINYINT NOT NULL, CONSTRAINT pk_geom_cols PRIMARY KEY (table_name, column_name), CONSTRAINT uk_gc_table_name UNIQUE (table_name), CONSTRAINT fk_gc_tn FOREIGN KEY (table_name) REFERENCES gpkg_contents(table_name), CONSTRAINT fk_gc_srs FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys (srs_id));
CREATE TABLE ${TABLE_Q3} (fid INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, geom POLYGON, ${CHAMP} TEXT);
CREATE TABLE layer_styles (id INTEGER PRIMARY KEY AUTOINCREMENT, f_table_catalog TEXT(256), f_table_schema TEXT(256), f_table_name TEXT(256), f_geometry_column TEXT(256), styleName TEXT(30), styleQML TEXT, styleSLD TEXT, useAsDefault BOOLEAN, description TEXT, owner TEXT(30), ui TEXT(30), update_time DATETIME DEFAULT CURRENT_TIMESTAMP);`);
      const srs = db.prepare('INSERT INTO gpkg_spatial_ref_sys VALUES (?,?,?,?,?,?)');
      srs.run('Undefined Cartesian SRS', -1, 'NONE', -1, 'undefined', 'undefined Cartesian coordinate reference system');
      srs.run('Undefined geographic SRS', 0, 'NONE', 0, 'undefined', 'undefined geographic coordinate reference system');
      srs.run('WGS 84 geodetic', 4326, 'EPSG', 4326, WKT_4326, 'longitude/latitude coordinates in decimal degrees on the WGS 84 spheroid');
      srs.run('RGF93 v1 / Lambert-93', 2154, 'EPSG', 2154, WKT_2154, 'Lambert-93, France métropolitaine (Corse comprise)');
      const e = emprise(anneaux);
      db.prepare('INSERT INTO gpkg_contents (table_name, data_type, identifier, description, last_change, min_x, min_y, max_x, max_y, srs_id) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .run(TABLE_Q3, 'features', TABLE_Q3, '', DATE_FIXE, e.xmin, e.ymin, e.xmax, e.ymax, 2154);
      // layer_styles déclarée comme table non spatiale (data_type « attributes »), comme le fait
      // QGIS : sans cela, un lecteur strict du GeoPackage la signale hors du contenu.
      db.prepare('INSERT INTO gpkg_contents (table_name, data_type, identifier, description, last_change, srs_id) VALUES (?,?,?,?,?,?)')
        .run('layer_styles', 'attributes', 'layer_styles', '', DATE_FIXE, null);
      db.prepare('INSERT INTO gpkg_geometry_columns VALUES (?,?,?,?,0,0)').run(TABLE_Q3, 'geom', 'POLYGON', 2154);
      const ins = db.prepare(`INSERT INTO ${TABLE_Q3} (geom, ${CHAMP}) VALUES (?, ?)`);
      anneaux.forEach((a, i) => ins.run(blobPolygone(a), codes[i]));
      db.prepare('INSERT INTO layer_styles (f_table_catalog, f_table_schema, f_table_name, f_geometry_column, styleName, styleQML, styleSLD, useAsDefault, description, owner, ui, update_time) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .run('', '', TABLE_Q3, 'geom', TABLE_Q3, qmlStyle(STYLES.parcelles), '', 1, '', '', '', DATE_FIXE);
    } finally { db.close(); }
    return readFileSync(chemin);
  } finally { rmSync(dossier, { recursive: true, force: true }); }
}

// --------------------------------------------------------------------------- le zip

// Ordre et noms des entrées (17 : 13 de la fabrication de base + 4 du Shapefile « sans .prj »).
export const NOMS_ENTREES = [
  'UG_q1.geojson', 'UG_q1.qml',
  'UG_q2.geojson', 'UG_q2.qml',
  'UG_q4.geojson', 'UG_q4.qml',
  'Parcelles_q3.gpkg',
  'Sans_crs.geojson',
  'FRT_q7.shp', 'FRT_q7.shx', 'FRT_q7.dbf', 'FRT_q7.prj', 'FRT_q7.cpg',
  'FRT_sansprj.shp', 'FRT_sansprj.shx', 'FRT_sansprj.dbf', 'FRT_sansprj.cpg',
];

// Rend { entrees: [{ nom, donnees }], zip, gpkg }. Toutes les entrées sont STOCKÉES.
export function fabriquerEssais() {
  const q1 = carres(-800, 0); const q2 = carres(-400, 0); const q4 = carres(400, 0);
  const q3 = carres(0, 0); const q7 = carres(800, 0); const sp = carres(800, 800); const sc = carres(0, 800);
  const qmlUG = qmlStyle(STYLES.ug);
  const gpkg = fabriquerGpkg(q3, ['P1', 'P2']);
  const f7 = shapefile(q7, ['FRT1', 'FRT2']);
  const fp = shapefile(sp, ['FRT3', 'FRT4']);
  const b = (x) => (Buffer.isBuffer(x) ? x : Buffer.from(x, 'utf8'));
  const contenus = {
    'UG_q1.geojson': geojson('UG_q1', q1, ['UG1', 'UG2'], true), 'UG_q1.qml': qmlUG,
    'UG_q2.geojson': geojson('UG_q2', q2, ['UG3', 'UG4'], true), 'UG_q2.qml': qmlUG,
    'UG_q4.geojson': geojson('UG_q4', q4, ['UG5', 'UG6'], true), 'UG_q4.qml': qmlQ4(),
    'Parcelles_q3.gpkg': gpkg,
    'Sans_crs.geojson': geojson('Sans_crs', sc, ['SC1', 'SC2'], false),
    'FRT_q7.shp': f7.shp, 'FRT_q7.shx': f7.shx, 'FRT_q7.dbf': f7.dbf, 'FRT_q7.prj': PRJ_L93, 'FRT_q7.cpg': 'UTF-8',
    'FRT_sansprj.shp': fp.shp, 'FRT_sansprj.shx': fp.shx, 'FRT_sansprj.dbf': fp.dbf, 'FRT_sansprj.cpg': 'UTF-8',
  };
  const entrees = NOMS_ENTREES.map((nom) => ({ nom, donnees: b(contenus[nom]) }));
  const zip = ecrireZip(entrees.map((e) => ({ nom: Buffer.from(e.nom, 'utf8'), donnees: e.donnees, stocke: true, utf8: true })));
  return { entrees, zip, gpkg };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const sortie = process.argv[2] || dirname(fileURLToPath(import.meta.url));
  mkdirSync(sortie, { recursive: true });
  const r = fabriquerEssais();
  writeFileSync(join(sortie, 'essai-styles.zip'), r.zip);
  writeFileSync(join(sortie, 'essai-q3.gpkg'), r.gpkg);
  console.log(`écrit : ${join(sortie, 'essai-styles.zip')} (${r.zip.length} octets, ${r.entrees.length} entrées) et essai-q3.gpkg (${r.gpkg.length} octets)`);
}

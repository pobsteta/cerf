// Mission 047 : fabrique `essai-gpkg-style.zip`, zip d'essai du style enregistré dans un GeoPackage
// (table `layer_styles`, que QGIS remplit avec « Enregistrer le style dans la base de données »).
// Écrit pour Vision, sans dépendance (Node >= 22.13 pour node:sqlite). DONNÉES FICTIVES, en Lambert 93
// (EPSG:2154), près de Fontainebleau (elles passent le contrôle de vraisemblance, spec § 4).
//
// Contenu : un seul fichier, Essai_style.gpkg, deux tables de polygones :
//   - Parcelles : style enregistré INHABITUEL, contour vert #00A000 de 2 mm, sans remplissage (la règle du manuel
//     donnerait un contour orange #FF8C00 de 1 mm) ; une seconde ligne, NON par défaut mais plus récente, en rouge :
//     elle ne doit jamais s'afficher (l'ordre de lecture est « par défaut d'abord, puis la plus récente », comme QGIS) ;
//   - UG : aucun style enregistré, la règle du manuel s'applique (contour bleu #0000FF de 0,6 mm).
// Le zip est compressé (deflate) comme les zips réels. Mêmes octets à chaque fabrication avec le même Node
// (en-tête SQLite : numéro de version de la bibliothèque) ; aucun hasard, dates fixes.
//
// Usage : node --no-warnings outils/zip-essai-gpkg-style.mjs <dossier-de-sortie>   (écrit essai-gpkg-style.zip ; rien dans le dépôt)
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { ecrireZip } from '../tests/recette/essai/zip-ecrire.mjs';

export const NOM_ZIP = 'essai-gpkg-style.zip';
export const NOM_GPKG = 'Essai_style.gpkg';

// ---------- les deux styles enregistrés (QML minimal, symbologie seule, polygone, contour sans remplissage) ----------
const qmlContour = (couleur, epaisseur) => `<!DOCTYPE qgis PUBLIC 'http://mrcc.com/qgis.dtd' 'SYSTEM'>
<qgis version="3.34.0-Prizren" styleCategories="Symbology">
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
            <Option type="QString" name="color" value="${couleur.replace(/,\d+$/, ',0')}"/>
            <Option type="QString" name="joinstyle" value="bevel"/>
            <Option type="QString" name="offset" value="0,0"/>
            <Option type="QString" name="offset_unit" value="MM"/>
            <Option type="QString" name="outline_color" value="${couleur}"/>
            <Option type="QString" name="outline_style" value="solid"/>
            <Option type="QString" name="outline_width" value="${epaisseur}"/>
            <Option type="QString" name="outline_width_unit" value="MM"/>
            <Option type="QString" name="style" value="no"/>
          </Option>
        </layer>
      </symbol>
    </symbols>
    <rotation/>
    <sizescale/>
  </renderer-v2>
  <layerGeometryType>2</layerGeometryType>
</qgis>
`;
export const QML_VERT = qmlContour('0,160,0,255', 2);
export const QML_ROUGE = qmlContour('255,0,0,255', 1);

// ---------- données fictives (Lambert 93, mètres) ----------
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]; // anneau fermé, sens antihoraire
export const PARCELLES = [
  { CODE_PARC: '12', rect: [674050, 6811050, 674400, 6811550] },
  { CODE_PARC: '13', rect: [674400, 6811050, 674750, 6811550] },
  { CODE_PARC: '14', rect: [674850, 6811050, 675200, 6811550] },
];
export const UG = [
  { CODE_UG: 'UG01', rect: [674000, 6810200, 674800, 6810800] },
  { CODE_UG: 'UG02', rect: [674800, 6810200, 675600, 6810800] },
];

const wkbPolygone = (anneau) => {
  const b = Buffer.alloc(13 + 16 * anneau.length); b[0] = 1; b.writeUInt32LE(3, 1); b.writeUInt32LE(1, 5); b.writeUInt32LE(anneau.length, 9);
  anneau.forEach(([x, y], i) => { b.writeDoubleLE(x, 13 + 16 * i); b.writeDoubleLE(y, 21 + 16 * i); });
  return b;
};
// En-tête GeoPackage : 'GP', version 0, drapeaux 0b00000011 (little-endian, enveloppe XY), srs_id, enveloppe.
const blobGpkg = (srs, [xmin, xmax, ymin, ymax], wkb) => {
  const h = Buffer.alloc(40); h.write('GP', 0, 'latin1'); h[2] = 0; h[3] = 0b00000011; h.writeInt32LE(srs, 4);
  [xmin, xmax, ymin, ymax].forEach((v, i) => h.writeDoubleLE(v, 8 + 8 * i));
  return Buffer.concat([h, wkb]);
};

const DATE = '2026-11-05T00:00:00.000Z';

// GeoPackage (OGC 12-128, 1.3) écrit avec node:sqlite ; R-tree omis (ses déclencheurs appellent ST_*, absentes de
// node:sqlite) : GeoPackage valide sans lui. layer_styles : mêmes colonnes que celles que crée QGIS
// (qgsogrutils.cpp, saveStyle), déclarée « attributes » dans gpkg_contents comme le fait GDAL.
export function fabriquerGpkg(chemin) {
  rmSync(chemin, { force: true });
  const db = new DatabaseSync(chemin);
  db.exec(`PRAGMA application_id = 1196444487; PRAGMA user_version = 10300;
    CREATE TABLE gpkg_spatial_ref_sys (srs_name TEXT NOT NULL, srs_id INTEGER PRIMARY KEY, organization TEXT NOT NULL, organization_coordsys_id INTEGER NOT NULL, definition TEXT NOT NULL, description TEXT);
    CREATE TABLE gpkg_contents (table_name TEXT NOT NULL PRIMARY KEY, data_type TEXT NOT NULL, identifier TEXT UNIQUE, description TEXT DEFAULT '', last_change DATETIME NOT NULL DEFAULT '${DATE}', min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE, srs_id INTEGER);
    CREATE TABLE gpkg_geometry_columns (table_name TEXT NOT NULL, column_name TEXT NOT NULL, geometry_type_name TEXT NOT NULL, srs_id INTEGER NOT NULL, z TINYINT NOT NULL, m TINYINT NOT NULL, PRIMARY KEY (table_name, column_name));`);
  const srs = db.prepare('INSERT INTO gpkg_spatial_ref_sys VALUES (?,?,?,?,?,?)');
  srs.run('Undefined cartesian SRS', -1, 'NONE', -1, 'undefined', 'undefined cartesian coordinate reference system');
  srs.run('Undefined geographic SRS', 0, 'NONE', 0, 'undefined', 'undefined geographic coordinate reference system');
  srs.run('WGS 84', 4326, 'EPSG', 4326, 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]', '');
  srs.run('RGF93 v1 / Lambert-93', 2154, 'EPSG', 2154, 'PROJCS["RGF93 v1 / Lambert-93",GEOGCS["RGF93 v1",DATUM["Reseau_Geodesique_Francais_1993_v1",SPHEROID["GRS 1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Lambert_Conformal_Conic_2SP"],PARAMETER["latitude_of_origin",46.5],PARAMETER["central_meridian",3],PARAMETER["standard_parallel_1",49],PARAMETER["standard_parallel_2",44],PARAMETER["false_easting",700000],PARAMETER["false_northing",6600000],UNIT["metre",1]]', '');
  const contenu = db.prepare('INSERT INTO gpkg_contents (table_name,data_type,identifier,min_x,min_y,max_x,max_y,srs_id) VALUES (?,?,?,?,?,?,?,?)');
  const colonnes = db.prepare("INSERT INTO gpkg_geometry_columns VALUES (?, 'geom', 'POLYGON', 2154, 0, 0)");

  const table = (nom, champ, entites) => {
    db.exec(`CREATE TABLE ${nom} (fid INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, geom POLYGON, ${champ} TEXT)`);
    const ins = db.prepare(`INSERT INTO ${nom} (geom, ${champ}) VALUES (?,?)`);
    for (const e of entites) {
      const [x0, y0, x1, y1] = e.rect;
      ins.run(blobGpkg(2154, [x0, x1, y0, y1], wkbPolygone(rect(...e.rect))), e[champ]);
    }
    const r = entites.map((e) => e.rect);
    contenu.run(nom, 'features', nom, Math.min(...r.map((v) => v[0])), Math.min(...r.map((v) => v[1])), Math.max(...r.map((v) => v[2])), Math.max(...r.map((v) => v[3])), 2154);
    colonnes.run(nom);
  };
  table('Parcelles', 'CODE_PARC', PARCELLES);
  table('UG', 'CODE_UG', UG);

  db.exec(`CREATE TABLE layer_styles (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, f_table_catalog TEXT, f_table_schema TEXT, f_table_name TEXT, f_geometry_column TEXT, styleName TEXT, styleQML TEXT, styleSLD TEXT, useAsDefault BOOLEAN, description TEXT, owner TEXT, ui TEXT, update_time DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))`);
  contenu.run('layer_styles', 'attributes', 'layer_styles', null, null, null, null, null);
  const style = db.prepare("INSERT INTO layer_styles (f_table_catalog, f_table_schema, f_table_name, f_geometry_column, styleName, styleQML, useAsDefault, description, update_time) VALUES ('', '', ?, 'geom', ?, ?, ?, ?, ?)");
  style.run('Parcelles', 'contour vert', QML_VERT, 1, 'Contour vert épais (essai, données fictives)', '2026-11-04T09:00:00.000Z');
  style.run('Parcelles', 'ancien rouge', QML_ROUGE, 0, 'Plus récent mais pas par défaut : ne doit pas s\'afficher', '2026-11-04T10:00:00.000Z');
  db.close();
}

export function fabriquerGpkgStyle(dossier) {
  mkdirSync(dossier, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), 'vision-gpkg-style-'));
  try {
    const f = join(tmp, NOM_GPKG);
    fabriquerGpkg(f);
    const chemin = join(dossier, NOM_ZIP);
    const octets = ecrireZip([{ nom: Buffer.from(NOM_GPKG, 'utf8'), donnees: readFileSync(f), stocke: false, utf8: true }]);
    writeFileSync(chemin, octets);
    return chemin;
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [, , dossier] = process.argv;
  if (!dossier) { console.error('Usage : node --no-warnings outils/zip-essai-gpkg-style.mjs <dossier-de-sortie>'); process.exit(2); }
  console.log(`écrit : ${fabriquerGpkgStyle(dossier)}`);
}

#!/usr/bin/env node
// Mission 006 : écrit le projet modèle vision.qgz (QGIS n'est pas dans le conteneur, d'où ce script).
//
// Mission 021 : écrit aussi saisie.gpkg (couche « Saisie terrain », vide) et déclare la couche dans vision.qgz.
//
// Usage :  node outils/projet-modele.mjs [--vision-id <UUID>] [--sortie <chemin.qgz>] [--gpkg <chemin.gpkg>]
//   --vision-id  UUID de la variable de projet vision_id (spec § 3.3). Par défaut : VISION_ID_PAR_DEFAUT ci-dessous,
//              tiré une fois le 2 novembre 2026 puis figé : un seul vision.qgz par appareil, pas de
//              consigne de changer vision_id (spec § 3.3). Seul cet UUID peut varier d'une exécution à l'autre.
//   --sortie   chemin du .qgz (par défaut : vision.qgz à la racine du dépôt).
//   --gpkg     chemin du saisie.gpkg (par défaut : saisie.gpkg à la racine du dépôt). Le script n'écrit que dans
//              le dépôt : il ne touche jamais un saisie.gpkg d'appareil (voir outils/zips-projet-modele.mjs).
// Le script est déterministe : même UUID => mêmes octets (horodatage du zip fixé, identifiants de couche dérivés du nom).
//
// Valeurs : docs/referentiels/fonds-ign.md § 1 (gabarits XYZ) et § 2 (zoom 0 à 19) ; ADR 0002 amendée
// (PM gardé, « © IGN ») ; docs/referentiels/fonds-osm-cadastre.md (mission 045 : cadastre, OpenStreetMap, OpenTopoMap) ; spec § 2 point 1, § 3.3, § 3.4. Aucune clé d'API.
// Le .qgs est écrit comme QGIS 3.x l'écrit, de mémoire du format (le code source de QGIS n'a pas pu être
// consulté depuis le conteneur) : la vérification de Pascal dans QGIS conditionne la fusion.
import { createHash } from 'node:crypto';
import { writeFileSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { deflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

export const VISION_ID_PAR_DEFAUT = 'd98bf4b8-0fac-4dac-85cf-58e6701aceeb';
export const VERSION_QGIS = '3.34.0-Prizren'; // version d'écriture déclarée (LTR) ; QGIS la met à jour à l'enregistrement
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const gabarit = (couche, format) =>
  `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${couche}` +
  `&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=${format}`;
const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OPENTOPOMAP = 'https://tile.opentopomap.org/{z}/{x}/{y}.png';
const IGN = '© IGN';
// Ordre de l'arbre : premier = dessus (mission 045). Cadastre (PNG transparent) au-dessus de tous les fonds et visible ;
// Plan IGN v2 visible ; OpenStreetMap, OpenTopoMap et BD ORTHO décochés (une orthophoto ou un fond plein cochés
// masqueraient le plan). Zoom et attribution par fond : docs/referentiels/fonds-osm-cadastre.md § 2 et § 3.
// OpenStreetMap et OpenTopoMap : EN LIGNE SEULEMENT (politique de l'OSMF, arbitrage de Pascal du 5 novembre 2026), hors critère J+2.
// OpenTopoMap : zoom max 13 = valeur la plus prudente des sources (17 wiki, 15 site, 13 ticket), à mesurer sur l'appareil.
export const FONDS = [
  { nom: 'Cadastre', url: gabarit('CADASTRALPARCELS.PARCELLAIRE_EXPRESS', 'image/png'), visible: true, zmin: 0, zmax: 19, attribution: IGN },
  { nom: 'Plan IGN v2', url: gabarit('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', 'image/png'), visible: true, zmin: 0, zmax: 19, attribution: IGN },
  { nom: 'OpenStreetMap', url: OSM, visible: false, zmin: 0, zmax: 19, attribution: "© les contributeurs d'OpenStreetMap" },
  { nom: 'OpenTopoMap', url: OPENTOPOMAP, visible: false, zmin: 0, zmax: 13, attribution: "© les contributeurs d'OpenStreetMap, SRTM | © OpenTopoMap (CC-BY-SA)" },
  { nom: 'BD ORTHO', url: gabarit('ORTHOIMAGERY.ORTHOPHOTOS', 'image/jpeg'), visible: false, zmin: 0, zmax: 19, attribution: IGN },
];
export const GROUPE_FONDS = 'Fonds de carte';

// ---------- Mission 046 : fond embarqué fabriqué par QFieldSync (voie B, arbitrage de Pascal du 5 novembre 2026) ----------
// Thème de carte « Fond embarqué » : Plan IGN v2 et Cadastre visibles, rien d'autre (ni OSM ni OpenTopoMap : en ligne seulement).
// Propriétés lues par libqfieldsync (project.py l. 36-39 et 60-62, ProjectConfig, préfixe « qfieldsync ») : QFieldSync en tire
// native:tilesxyzmbtiles (offline_converter.py l. 686-695) et écrit basemap.mbtiles. Voir docs/referentiels/fond-embarque-qfieldsync.md.
export const THEME_FOND = 'Fond embarqué';
export const FONDS_DU_THEME = ['Plan IGN v2', 'Cadastre'];
// Zoom max 17 (Pascal) ; zoom min 13 : environ 13 m par pixel à 47° de latitude, une UT de 10 km tient sur un écran ; les niveaux
// 13 à 16 ajoutent environ un tiers du nombre de tuiles du niveau 17 (calcul de l'étude § 4). Tuiles de 256 px : la correspondance
// zoom / mètres par pixel est alors celle de la grille standard (0,8 m par pixel au zoom 17) ; avec 512 ou 1024 elle n'est pas lue.
export const PROPRIETES_QFIELDSYNC = [
  { cle: 'createBaseMap', type: 'bool', valeur: 'true' },
  { cle: 'baseMapType', type: 'QString', valeur: 'mapTheme' },
  { cle: 'baseMapTheme', type: 'QString', valeur: THEME_FOND },
  { cle: 'baseMapTileSize', type: 'int', valeur: '256' },
  { cle: 'baseMapTilesMinZoomLevel', type: 'int', valeur: '13' },
  { cle: 'baseMapTilesMaxZoomLevel', type: 'int', valeur: '17' },
];

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// QgsDataSourceUri::encodedUri : paramètres par ordre alphabétique (type, url, zmax, zmin) ; dans la valeur de
// url, « & », « = », « % », « + », « # », « { » et « } » sont encodés (comme %7Bz%7D dans une source OSM XYZ).
const encoderUrl = (u) => u.replace(/[%&=+#{}]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
const source = (f) => `type=xyz&url=${encoderUrl(f.url)}&zmax=${f.zmax}&zmin=${f.zmin}`;
// Identifiant de couche à la manière de QGIS (nom + UUID, tirets en « _ »), mais dérivé du nom : déterministe.
const idCouche = (f) => {
  const h = createHash('sha1').update('vision:' + f.nom).digest('hex');
  return `${f.nom.replace(/[^A-Za-z0-9]/g, '_')}_${h.slice(0, 8)}_${h.slice(8, 12)}_${h.slice(12, 16)}_${h.slice(16, 20)}_${h.slice(20, 32)}`;
};

const EXTENT = { xmin: 99000, ymin: 6045000, xmax: 1242000, ymax: 7110000 }; // métropole, Lambert 93 (ordre x puis y)
const SRS_2154 = `<spatialrefsys nativeFormat="Wkt"><wkt>PROJCRS["RGF93 v1 / Lambert-93",BASEGEOGCRS["RGF93 v1",DATUM["Reseau Geodesique Francais 1993 v1",ELLIPSOID["GRS 1980",6378137,298.257222101,LENGTHUNIT["metre",1]]],PRIMEM["Greenwich",0,ANGLEUNIT["degree",0.0174532925199433]],ID["EPSG",4171]],CONVERSION["Lambert-93",METHOD["Lambert Conic Conformal (2SP)",ID["EPSG",9802]],PARAMETER["Latitude of false origin",46.5,ANGLEUNIT["degree",0.0174532925199433],ID["EPSG",8821]],PARAMETER["Longitude of false origin",3,ANGLEUNIT["degree",0.0174532925199433],ID["EPSG",8822]],PARAMETER["Latitude of 1st standard parallel",49,ANGLEUNIT["degree",0.0174532925199433],ID["EPSG",8823]],PARAMETER["Latitude of 2nd standard parallel",44,ANGLEUNIT["degree",0.0174532925199433],ID["EPSG",8824]],PARAMETER["Easting at false origin",700000,LENGTHUNIT["metre",1],ID["EPSG",8826]],PARAMETER["Northing at false origin",6600000,LENGTHUNIT["metre",1],ID["EPSG",8827]]],CS[Cartesian,2],AXIS["easting (X)",east,ORDER[1],LENGTHUNIT["metre",1]],AXIS["northing (Y)",north,ORDER[2],LENGTHUNIT["metre",1]],USAGE[SCOPE["Engineering survey, topographic mapping."],AREA["France - onshore and offshore, mainland and Corsica (France métropolitaine including Corsica)."],BBOX[41.15,-9.86,51.56,10.38]],ID["EPSG",2154]]</wkt><proj4>+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs</proj4><srsid>145</srsid><srid>2154</srid><authid>EPSG:2154</authid><description>RGF93 v1 / Lambert-93</description><projectionacronym>lcc</projectionacronym><ellipsoidacronym>EPSG:7019</ellipsoidacronym><geographicflag>false</geographicflag></spatialrefsys>`;
const SRS_3857 = `<spatialrefsys nativeFormat="Wkt"><wkt>PROJCRS["WGS 84 / Pseudo-Mercator",BASEGEOGCRS["WGS 84",ENSEMBLE["World Geodetic System 1984 ensemble",MEMBER["World Geodetic System 1984 (Transit)"],MEMBER["World Geodetic System 1984 (G730)"],MEMBER["World Geodetic System 1984 (G873)"],MEMBER["World Geodetic System 1984 (G1150)"],MEMBER["World Geodetic System 1984 (G1674)"],MEMBER["World Geodetic System 1984 (G1762)"],MEMBER["World Geodetic System 1984 (G2139)"],ELLIPSOID["WGS 84",6378137,298.257223563,LENGTHUNIT["metre",1]],ENSEMBLEACCURACY[2.0]],PRIMEM["Greenwich",0,ANGLEUNIT["degree",0.0174532925199433]],ID["EPSG",4326]],CONVERSION["Popular Visualisation Pseudo-Mercator",METHOD["Popular Visualisation Pseudo Mercator",ID["EPSG",1024]],PARAMETER["Latitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433],ID["EPSG",8801]],PARAMETER["Longitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433],ID["EPSG",8802]],PARAMETER["False easting",0,LENGTHUNIT["metre",1],ID["EPSG",8806]],PARAMETER["False northing",0,LENGTHUNIT["metre",1],ID["EPSG",8807]]],CS[Cartesian,2],AXIS["easting (X)",east,ORDER[1],LENGTHUNIT["metre",1]],AXIS["northing (Y)",north,ORDER[2],LENGTHUNIT["metre",1]],USAGE[SCOPE["Web mapping and visualisation."],AREA["World between 85.06 S and 85.06 N."],BBOX[-85.06,-180,85.06,180]],ID["EPSG",3857]]</wkt><proj4>+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs</proj4><srsid>3857</srsid><srid>3857</srid><authid>EPSG:3857</authid><description>WGS 84 / Pseudo-Mercator</description><projectionacronym>merc</projectionacronym><ellipsoidacronym>EPSG:7030</ellipsoidacronym><geographicflag>false</geographicflag></spatialrefsys>`;

const MONDE_3857 = '<extent><xmin>-20037508.34</xmin><ymin>-20037508.34</ymin><xmax>20037508.34</xmax><ymax>20037508.34</ymax></extent>';

function maplayer(f) {
  const id = idCouche(f);
  return `    <maplayer autoRefreshMode="Disabled" autoRefreshTime="0" refreshOnNotifyEnabled="0" refreshOnNotifyMessage="" hasScaleBasedVisibilityFlag="0" maxScale="0" minScale="1e+08" styleCategories="AllStyleCategories" type="raster">
      ${MONDE_3857}
      <wgs84extent><xmin>-180</xmin><ymin>-85.05112878</ymin><xmax>180</xmax><ymax>85.05112878</ymax></wgs84extent>
      <id>${id}</id>
      <datasource>${xml(source(f))}</datasource>
      <keywordList><value></value></keywordList>
      <layername>${xml(f.nom)}</layername>
      <srs>${SRS_3857}</srs>
      <resourceMetadata>
        <identifier></identifier>
        <parentidentifier></parentidentifier>
        <language></language>
        <type></type>
        <title>${xml(f.nom)}</title>
        <abstract></abstract>
        <links/>
        <fees></fees>
        <encoding></encoding>
        <crs>${SRS_3857}</crs>
        <extent/>
        <rights>${xml(f.attribution)}</rights>
      </resourceMetadata>
      <provider>wms</provider>
      <noData><noDataList bandNo="1" useSrcNoData="0"/></noData>
      <map-layer-style-manager current="default"><map-layer-style name="default"/></map-layer-style-manager>
      <attribution>${xml(f.attribution)}</attribution>
      <attributionUrl></attributionUrl>
    </maplayer>`;
}

// ---------- Mission 021 : la couche « Saisie terrain » (spec § 3.5 et § 5) ----------
export const NOM_SAISIE = 'Saisie terrain';
export const TABLE_SAISIE = 'saisie_terrain';
export const SOURCE_SAISIE = `./saisie.gpkg|layername=${TABLE_SAISIE}`; // relatif au dossier du projet : QField le déplace
const idSaisie = () => idCouche({ nom: NOM_SAISIE });
const CONTRAINTE_DIAMETRE = '"diametre" IS NULL OR "diametre" >= 0'; // le vide est admis : champ facultatif
const ETIQUETTE_SAISIE = `"essence" || '\\n' || "diametre"`; // « \n » littéral (caractère \ puis n), comme dans la spec § 5

function maplayerSaisie() {
  const champ = (nom, type, editable) => ({ nom, type, editable });
  const champs = [champ('fid', 'qlonglong', 0), champ('essence', 'QString', 1), champ('diametre', 'int', 1), champ('remarque', 'QString', 1), champ('date', 'QDateTime', 1)];
  const widget = {
    fid: '<editWidget type="TextEdit"><config><Option/></config></editWidget>',
    essence: '<editWidget type="TextEdit"><config><Option/></config></editWidget>',
    diametre: '<editWidget type="TextEdit"><config><Option/></config></editWidget>',
    remarque: '<editWidget type="TextEdit"><config><Option type="Map"><Option name="IsMultiline" value="true" type="bool"/></Option></config></editWidget>',
    date: '<editWidget type="DateTime"><config><Option type="Map"><Option name="allow_null" value="true" type="bool"/><Option name="calendar_popup" value="true" type="bool"/><Option name="display_format" value="yyyy-MM-dd HH:mm:ss" type="QString"/><Option name="field_format" value="yyyy-MM-dd HH:mm:ss" type="QString"/><Option name="field_iso_format" value="false" type="bool"/></Option></config></editWidget>',
  };
  const e = EXTENT;
  const noir = '0,0,0,255,rgb:0,0,0,1', blanc = '255,255,255,255,rgb:1,1,1,1';
  return `    <maplayer autoRefreshMode="Disabled" autoRefreshTime="0" refreshOnNotifyEnabled="0" refreshOnNotifyMessage="" hasScaleBasedVisibilityFlag="0" maxScale="0" minScale="100000000" geometry="Point" readOnly="0" labelsEnabled="1" simplifyDrawingHints="0" simplifyAlgorithm="0" simplifyLocal="1" simplifyMaxScale="1" simplifyDrawingTol="1" styleCategories="AllStyleCategories" type="vector">
      <extent><xmin>${e.xmin}</xmin><ymin>${e.ymin}</ymin><xmax>${e.xmax}</xmax><ymax>${e.ymax}</ymax></extent>
      <id>${idSaisie()}</id>
      <datasource>${xml(SOURCE_SAISIE)}</datasource>
      <keywordList><value></value></keywordList>
      <layername>${xml(NOM_SAISIE)}</layername>
      <srs>${SRS_2154}</srs>
      <resourceMetadata>
        <identifier></identifier>
        <parentidentifier></parentidentifier>
        <language></language>
        <type></type>
        <title>${xml(NOM_SAISIE)}</title>
        <abstract></abstract>
        <links/>
        <fees></fees>
        <encoding></encoding>
        <crs>${SRS_2154}</crs>
        <extent/>
      </resourceMetadata>
      <provider encoding="UTF-8">ogr</provider>
      <flags>
        <Identifiable>1</Identifiable>
        <Removable>0</Removable>
        <Searchable>1</Searchable>
        <Private>0</Private>
      </flags>
      <map-layer-style-manager current="default"><map-layer-style name="default"/></map-layer-style-manager>
      <renderer-v2 type="singleSymbol" symbollevels="0" forceraster="0" enableorderby="0" referencescale="-1">
        <symbols>
          <symbol type="marker" name="0" alpha="1" clip_to_extent="1" force_rhr="0">
            <data_defined_properties><Option type="Map"><Option name="name" value="" type="QString"/><Option name="properties"/><Option name="type" value="collection" type="QString"/></Option></data_defined_properties>
            <layer class="SimpleMarker" enabled="1" locked="0" pass="0">
              <Option type="Map">
                <Option name="angle" value="0" type="QString"/>
                <Option name="cap_style" value="square" type="QString"/>
                <Option name="color" value="${noir}" type="QString"/>
                <Option name="horizontal_anchor_point" value="1" type="QString"/>
                <Option name="joinstyle" value="bevel" type="QString"/>
                <Option name="name" value="circle" type="QString"/>
                <Option name="offset" value="0,0" type="QString"/>
                <Option name="offset_unit" value="MM" type="QString"/>
                <Option name="outline_color" value="${noir}" type="QString"/>
                <Option name="outline_style" value="solid" type="QString"/>
                <Option name="outline_width" value="0" type="QString"/>
                <Option name="outline_width_unit" value="MM" type="QString"/>
                <Option name="scale_method" value="diameter" type="QString"/>
                <Option name="size" value="2" type="QString"/>
                <Option name="size_unit" value="MM" type="QString"/>
                <Option name="vertical_anchor_point" value="1" type="QString"/>
              </Option>
            </layer>
          </symbol>
        </symbols>
      </renderer-v2>
      <labeling type="simple">
        <settings calloutType="simple">
          <text-style fontSize="8" fontSizeUnit="Point" textColor="${noir}" fieldName="${xml(ETIQUETTE_SAISIE)}" isExpression="1" fontFamily="Sans Serif" textOpacity="1" namedStyle="Regular">
            <text-buffer bufferDraw="1" bufferSize="1" bufferSizeUnits="MM" bufferColor="${blanc}" bufferOpacity="1" bufferJoinStyle="128" bufferNoFill="1"/>
          </text-style>
          <placement placement="6" dist="1" distUnits="MM" quadOrientation="0"/>
          <rendering scaleVisibility="0" obstacle="1" drawLabels="1" displayAll="0"/>
        </settings>
      </labeling>
      <customproperties><Option/></customproperties>
      <featureBlendMode>0</featureBlendMode>
      <layerOpacity>1</layerOpacity>
      <fieldConfiguration>
${champs.map((c) => `        <field configurationFlags="NoFlag" name="${c.nom}">
          <editWidget type="${/type="(\w+)"/.exec(widget[c.nom])[1]}">${widget[c.nom].replace(/^<editWidget[^>]*>/, '').replace(/<\/editWidget>$/, '')}</editWidget>
        </field>`).join('\n')}
      </fieldConfiguration>
      <editable>
${champs.map((c) => `        <field name="${c.nom}" editable="${c.editable}"/>`).join('\n')}
      </editable>
      <constraints>
        <constraint field="fid" constraints="3" unique_strength="1" notnull_strength="1" exp_strength="0"/>
        <constraint field="essence" constraints="0" unique_strength="0" notnull_strength="0" exp_strength="0"/>
        <constraint field="diametre" constraints="4" unique_strength="0" notnull_strength="0" exp_strength="1"/>
        <constraint field="remarque" constraints="0" unique_strength="0" notnull_strength="0" exp_strength="0"/>
        <constraint field="date" constraints="0" unique_strength="0" notnull_strength="0" exp_strength="0"/>
      </constraints>
      <defaults>
        <default field="fid" expression="" applyOnUpdate="0"/>
        <default field="essence" expression="" applyOnUpdate="0"/>
        <default field="diametre" expression="" applyOnUpdate="0"/>
        <default field="remarque" expression="" applyOnUpdate="0"/>
        <default field="date" expression="now()" applyOnUpdate="0"/>
      </defaults>
      <constraintExpressions>
        <constraint field="fid" exp="" desc=""/>
        <constraint field="essence" exp="" desc=""/>
        <constraint field="diametre" exp="${xml(CONTRAINTE_DIAMETRE)}" desc="Le diamètre doit être positif ou nul (en cm)"/>
        <constraint field="remarque" exp="" desc=""/>
        <constraint field="date" exp="" desc=""/>
      </constraintExpressions>
    </maplayer>`;
}

// saisie.gpkg : GeoPackage (OGC 12-128, 1.3) vide, écrit avec node:sqlite. Contenu logique identique à chaque
// exécution (aucune date du jour, aucun UUID) ; les octets peuvent varier d'une version de SQLite à l'autre.
// R-tree omis (ses déclencheurs appellent ST_*, absentes de node:sqlite) : GeoPackage valide sans lui.
const WKT_4326 = 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AXIS["Latitude",NORTH],AXIS["Longitude",EAST],AUTHORITY["EPSG","4326"]]';
const WKT_2154 = 'PROJCS["RGF93 v1 / Lambert-93",GEOGCS["RGF93 v1",DATUM["RGF93_v1",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],TOWGS84[0,0,0,0,0,0,0],AUTHORITY["EPSG","6171"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4171"]],PROJECTION["Lambert_Conformal_Conic_2SP"],PARAMETER["latitude_of_origin",46.5],PARAMETER["central_meridian",3],PARAMETER["standard_parallel_1",49],PARAMETER["standard_parallel_2",44],PARAMETER["false_easting",700000],PARAMETER["false_northing",6600000],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["Easting",EAST],AXIS["Northing",NORTH],AUTHORITY["EPSG","2154"]]';
export const DATE_GPKG = '2026-11-03T00:00:00.000Z';
export function ecrireGpkg(chemin) {
  rmSync(chemin, { force: true });
  const db = new DatabaseSync(chemin);
  try {
    db.exec(`PRAGMA page_size = 4096; PRAGMA journal_mode = DELETE; PRAGMA application_id = 1196444487; PRAGMA user_version = 10300;
CREATE TABLE gpkg_spatial_ref_sys (srs_name TEXT NOT NULL, srs_id INTEGER PRIMARY KEY, organization TEXT NOT NULL, organization_coordsys_id INTEGER NOT NULL, definition TEXT NOT NULL, description TEXT);
CREATE TABLE gpkg_contents (table_name TEXT NOT NULL PRIMARY KEY, data_type TEXT NOT NULL, identifier TEXT UNIQUE, description TEXT DEFAULT '', last_change DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE, srs_id INTEGER, CONSTRAINT fk_gc_r_srs_id FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys(srs_id));
CREATE TABLE gpkg_geometry_columns (table_name TEXT NOT NULL, column_name TEXT NOT NULL, geometry_type_name TEXT NOT NULL, srs_id INTEGER NOT NULL, z TINYINT NOT NULL, m TINYINT NOT NULL, CONSTRAINT pk_geom_cols PRIMARY KEY (table_name, column_name), CONSTRAINT uk_gc_table_name UNIQUE (table_name), CONSTRAINT fk_gc_tn FOREIGN KEY (table_name) REFERENCES gpkg_contents(table_name), CONSTRAINT fk_gc_srs FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys (srs_id));
CREATE TABLE ${TABLE_SAISIE} (fid INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, geom POINT, essence TEXT, diametre INTEGER, remarque TEXT, date DATETIME);`);
    const srs = db.prepare('INSERT INTO gpkg_spatial_ref_sys VALUES (?,?,?,?,?,?)');
    srs.run('Undefined Cartesian SRS', -1, 'NONE', -1, 'undefined', 'undefined Cartesian coordinate reference system');
    srs.run('Undefined geographic SRS', 0, 'NONE', 0, 'undefined', 'undefined geographic coordinate reference system');
    srs.run('WGS 84 geodetic', 4326, 'EPSG', 4326, WKT_4326, 'longitude/latitude coordinates in decimal degrees on the WGS 84 spheroid');
    srs.run('RGF93 v1 / Lambert-93', 2154, 'EPSG', 2154, WKT_2154, 'Lambert-93, France métropolitaine (Corse comprise)');
    db.prepare('INSERT INTO gpkg_contents (table_name, data_type, identifier, description, last_change, min_x, min_y, max_x, max_y, srs_id) VALUES (?,?,?,?,?,NULL,NULL,NULL,NULL,?)')
      .run(TABLE_SAISIE, 'features', TABLE_SAISIE, '', DATE_GPKG, 2154);
    db.prepare('INSERT INTO gpkg_geometry_columns VALUES (?,?,?,?,0,0)').run(TABLE_SAISIE, 'geom', 'POINT', 2154);
  } finally { db.close(); }
}

export function ecrireQgs(visionId = VISION_ID_PAR_DEFAUT) {
  if (!UUID.test(visionId) || /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(visionId)) throw new Error(`vision_id « ${visionId} » : UUID valide et non nul attendu`);
  const e = EXTENT;
  const feuilles = FONDS.map((f) => `      <layer-tree-layer id="${idCouche(f)}" name="${xml(f.nom)}" source="${xml(source(f))}" providerKey="wms" expanded="1" checked="${f.visible ? 'Qt::Checked' : 'Qt::Unchecked'}" legend_exp="" patch_size="-1,-1" legend_split_behavior="0">
        <customproperties><Option/></customproperties>
      </layer-tree-layer>`).join('\n');
  // Groupe de l'arbre des couches, comme QGIS 3.x l'écrit ; custom-order = ordre de rendu (désactivé : suit l'arbre).
  const feuilleSaisie = `    <layer-tree-layer id="${idSaisie()}" name="${xml(NOM_SAISIE)}" source="${xml(SOURCE_SAISIE)}" providerKey="ogr" expanded="1" checked="Qt::Checked" legend_exp="" patch_size="-1,-1" legend_split_behavior="0">
      <customproperties><Option/></customproperties>
    </layer-tree-layer>
`;
  const arbre = feuilleSaisie + `    <layer-tree-group name="${xml(GROUPE_FONDS)}" checked="Qt::Checked" expanded="1">
      <customproperties><Option/></customproperties>
${feuilles}
    </layer-tree-group>
    <custom-order enabled="0">
      <item>${idSaisie()}</item>
${FONDS.map((f) => `      <item>${idCouche(f)}</item>`).join('\n')}
    </custom-order>`;
  // has-checked-group-info="1" + checked-group-nodes : appliquer le thème recoche le groupe « Fonds de carte » (QGIS 3a92eb3,
  // qgsmapthemecollection.cpp l. 575-576 et 661-667 lecture, l. 196-197 application ; id de groupe = chemin des noms sous la racine).
  const themeFond = `  <visibility-presets>
    <visibility-preset name="${xml(THEME_FOND)}" has-checked-group-info="1">
${FONDS_DU_THEME.map((n) => `      <layer id="${idCouche({ nom: n })}" visible="1" style="default"/>`).join('\n')}
      <checked-group-nodes>
        <checked-group-node id="${xml(GROUPE_FONDS)}"/>
      </checked-group-nodes>
    </visibility-preset>
  </visibility-presets>
`;
  const proprietesFond = PROPRIETES_QFIELDSYNC.map((p) => `      <${p.cle} type="${p.type}">${xml(p.valeur)}</${p.cle}>`).join('\n');
  return `<!DOCTYPE qgis PUBLIC 'http://mrcc.com/qgis.dtd' 'SYSTEM'>
<qgis projectname="Vision" version="${VERSION_QGIS}" saveUser="vision" saveUserFull="Vision">
  <homePath path=""/>
  <title>Vision</title>
  <transaction mode="Disabled"/>
  <projectFlags set=""/>
  <projectCrs>${SRS_2154}</projectCrs>
  <layer-tree-group>
    <customproperties><Option/></customproperties>
${arbre}
  </layer-tree-group>
  <snapping-settings enabled="0" mode="2" type="1" tolerance="12" unit="1" intersection-snapping="0" scaleDependencyMode="0" minScale="0" maxScale="0"/>
  <mapcanvas name="theMapCanvas" annotationsVisible="1">
    <units>meters</units>
    <extent><xmin>${e.xmin}</xmin><ymin>${e.ymin}</ymin><xmax>${e.xmax}</xmax><ymax>${e.ymax}</ymax></extent>
    <rotation>0</rotation>
    <destinationsrs>${SRS_2154}</destinationsrs>
    <rendermaptile>0</rendermaptile>
    <expressionContextScope/>
  </mapcanvas>
  <projectModels/>
  <legend updateDrawingOrder="true"/>
  <projectlayers>
${maplayerSaisie()}
${FONDS.map(maplayer).join('\n')}
  </projectlayers>
  <layerorder>
    <layer id="${idSaisie()}"/>
${FONDS.map((f) => `    <layer id="${idCouche(f)}"/>`).join('\n')}
  </layerorder>
  <properties>
    <Variables>
      <variableNames type="QStringList">
        <value>vision_id</value>
      </variableNames>
      <variableValues type="QStringList">
        <value>${visionId}</value>
      </variableValues>
    </Variables>
    <SpatialRefSys>
      <ProjectionsEnabled type="int">1</ProjectionsEnabled>
      <ProjectCrs type="QString">EPSG:2154</ProjectCrs>
    </SpatialRefSys>
    <qfieldsync>
${proprietesFond}
    </qfieldsync>
  </properties>
${themeFond}</qgis>
`;
}

// --- zip déterministe (un seul membre, deflate, horodatage MS-DOS fixe : 2026-11-02 00:00) ---
const TABLE = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = TABLE[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function ecrireQgz(texte, nom = 'vision.qgs') {
  const brut = Buffer.from(texte, 'utf8'), pk = deflateRawSync(brut, { level: 9 }), n = Buffer.from(nom, 'utf8'), crc = crc32(brut);
  const heure = 0, date = ((2026 - 1980) << 9) | (11 << 5) | 2;
  const l = Buffer.alloc(30);
  l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt16LE(0x0800, 6); l.writeUInt16LE(8, 8);
  l.writeUInt16LE(heure, 10); l.writeUInt16LE(date, 12); l.writeUInt32LE(crc, 14); l.writeUInt32LE(pk.length, 18); l.writeUInt32LE(brut.length, 22); l.writeUInt16LE(n.length, 26);
  const c = Buffer.alloc(46);
  c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10);
  c.writeUInt16LE(heure, 12); c.writeUInt16LE(date, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(pk.length, 20); c.writeUInt32LE(brut.length, 24); c.writeUInt16LE(n.length, 28);
  const centre = Buffer.concat([c, n]), fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(1, 8); fin.writeUInt16LE(1, 10); fin.writeUInt32LE(centre.length, 12); fin.writeUInt32LE(30 + n.length + pk.length, 16);
  return Buffer.concat([l, n, pk, centre, fin]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), val = (opt) => { const i = a.indexOf(opt); return i >= 0 ? a[i + 1] : undefined; };
  const sortie = val('--sortie') ?? fileURLToPath(new URL('../vision.qgz', import.meta.url));
  const visionId = val('--vision-id') ?? VISION_ID_PAR_DEFAUT;
  const gpkg = val('--gpkg') ?? fileURLToPath(new URL('../saisie.gpkg', import.meta.url));
  writeFileSync(sortie, ecrireQgz(ecrireQgs(visionId)));
  console.log(`${sortie} écrit (vision_id = ${visionId})`);
  ecrireGpkg(gpkg);
  console.log(`${gpkg} écrit (vide, table ${TABLE_SAISIE})`);
}

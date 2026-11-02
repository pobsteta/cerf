#!/usr/bin/env node
// Mission 006 : écrit le projet modèle cerf.qgz (QGIS n'est pas dans le conteneur, d'où ce script).
//
// Usage :  node outils/projet-modele.mjs [--cerf-id <UUID>] [--sortie <chemin.qgz>]
//   --cerf-id  UUID de la variable de projet cerf_id (spec § 3.3). Par défaut : CERF_ID_PAR_DEFAUT ci-dessous,
//              tiré une fois le 2 novembre 2026 puis figé : un seul cerf.qgz par appareil, pas de
//              consigne de changer cerf_id (spec § 3.3). Seul cet UUID peut varier d'une exécution à l'autre.
//   --sortie   chemin du .qgz (par défaut : cerf.qgz à la racine du dépôt).
// Le script est déterministe : même UUID => mêmes octets (horodatage du zip fixé, identifiants de couche dérivés du nom).
//
// Valeurs : docs/referentiels/fonds-ign.md § 1 (gabarits XYZ) et § 2 (zoom 0 à 19) ; ADR 0002 amendée
// (PM gardé, « © IGN ») ; spec § 2 point 1, § 3.3, § 3.4. Aucune clé d'API.
// Le .qgs est écrit comme QGIS 3.x l'écrit, de mémoire du format (le code source de QGIS n'a pas pu être
// consulté depuis le conteneur) : la vérification de Pascal dans QGIS conditionne la fusion.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

export const CERF_ID_PAR_DEFAUT = 'ebad8ff8-577e-48bc-9489-6bab871230c2';
export const VERSION_QGIS = '3.34.0-Prizren'; // version d'écriture déclarée (LTR) ; QGIS la met à jour à l'enregistrement
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const gabarit = (couche, format) =>
  `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${couche}` +
  `&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=${format}`;
// Ordre de l'arbre : premier = dessus. Plan IGN v2 visible ; BD ORTHO dessous, décochée (une orthophoto cochée masquerait le plan).
export const FONDS = [
  { nom: 'Plan IGN v2', url: gabarit('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', 'image/png'), visible: true },
  { nom: 'BD ORTHO', url: gabarit('ORTHOIMAGERY.ORTHOPHOTOS', 'image/jpeg'), visible: false },
];
export const GROUPE_FONDS = 'Fonds de carte';
const ZMIN = 0, ZMAX = 19, ATTRIBUTION = '© IGN';

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// QgsDataSourceUri::encodedUri : paramètres par ordre alphabétique (type, url, zmax, zmin) ; dans la valeur de
// url, « & », « = », « % », « + », « # », « { » et « } » sont encodés (comme %7Bz%7D dans une source OSM XYZ).
const encoderUrl = (u) => u.replace(/[%&=+#{}]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
const source = (f) => `type=xyz&url=${encoderUrl(f.url)}&zmax=${ZMAX}&zmin=${ZMIN}`;
// Identifiant de couche à la manière de QGIS (nom + UUID, tirets en « _ »), mais dérivé du nom : déterministe.
const idCouche = (f) => {
  const h = createHash('sha1').update('cerf:' + f.nom).digest('hex');
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
        <rights>${xml(ATTRIBUTION)}</rights>
      </resourceMetadata>
      <provider>wms</provider>
      <noData><noDataList bandNo="1" useSrcNoData="0"/></noData>
      <map-layer-style-manager current="default"><map-layer-style name="default"/></map-layer-style-manager>
      <attribution>${xml(ATTRIBUTION)}</attribution>
      <attributionUrl></attributionUrl>
    </maplayer>`;
}

export function ecrireQgs(cerfId = CERF_ID_PAR_DEFAUT) {
  if (!UUID.test(cerfId) || /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(cerfId)) throw new Error(`cerf_id « ${cerfId} » : UUID valide et non nul attendu`);
  const e = EXTENT;
  const feuilles = FONDS.map((f) => `      <layer-tree-layer id="${idCouche(f)}" name="${xml(f.nom)}" source="${xml(source(f))}" providerKey="wms" expanded="1" checked="${f.visible ? 'Qt::Checked' : 'Qt::Unchecked'}" legend_exp="" patch_size="-1,-1" legend_split_behavior="0">
        <customproperties><Option/></customproperties>
      </layer-tree-layer>`).join('\n');
  // Groupe de l'arbre des couches, comme QGIS 3.x l'écrit ; custom-order = ordre de rendu (désactivé : suit l'arbre).
  const arbre = `    <layer-tree-group name="${xml(GROUPE_FONDS)}" checked="Qt::Checked" expanded="1">
      <customproperties><Option/></customproperties>
${feuilles}
    </layer-tree-group>
    <custom-order enabled="0">
${FONDS.map((f) => `      <item>${idCouche(f)}</item>`).join('\n')}
    </custom-order>`;
  return `<!DOCTYPE qgis PUBLIC 'http://mrcc.com/qgis.dtd' 'SYSTEM'>
<qgis projectname="Cerf" version="${VERSION_QGIS}" saveUser="cerf" saveUserFull="Cerf">
  <homePath path=""/>
  <title>Cerf</title>
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
${FONDS.map(maplayer).join('\n')}
  </projectlayers>
  <layerorder>
${FONDS.map((f) => `    <layer id="${idCouche(f)}"/>`).join('\n')}
  </layerorder>
  <properties>
    <Variables>
      <variableNames type="QStringList">
        <value>cerf_id</value>
      </variableNames>
      <variableValues type="QStringList">
        <value>${cerfId}</value>
      </variableValues>
    </Variables>
    <SpatialRefSys>
      <ProjectionsEnabled type="int">1</ProjectionsEnabled>
      <ProjectCrs type="QString">EPSG:2154</ProjectCrs>
    </SpatialRefSys>
  </properties>
</qgis>
`;
}

// --- zip déterministe (un seul membre, deflate, horodatage MS-DOS fixe : 2026-11-02 00:00) ---
const TABLE = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = TABLE[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function ecrireQgz(texte, nom = 'cerf.qgs') {
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
  const sortie = val('--sortie') ?? fileURLToPath(new URL('../cerf.qgz', import.meta.url));
  const cerfId = val('--cerf-id') ?? CERF_ID_PAR_DEFAUT;
  writeFileSync(sortie, ecrireQgz(ecrireQgs(cerfId)));
  console.log(`${sortie} écrit (cerf_id = ${cerfId})`);
}

// Mission 003 : fabrique les deux petits zips d'essai du protocole (essai.zip et
// essai-cp437.zip) dans le dossier donné en argument (par défaut : ce dossier).
// Usage : node fabriquer-essais.mjs [dossier-de-sortie]
// Les données d'essai sont fictives : un point près de Paris, sans valeur métier.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ecrireZip } from './zip-ecrire.mjs';

// Le point, en Lambert 93 (EPSG:2154) : transformation de (longitude 2.35, latitude 48.85)
// par pyproj 3.8.0 (PROJ 9.8.1), arrondie au centimètre.
export const X_L93 = 652301.56;
export const Y_L93 = 6861302.73;

// .prj : export WKT1 ESRI de EPSG:2154, tel que donné par pyproj 3.8.0 (PROJ 9.8.1,
// base EPSG v12.029 du 2025-10-02), consulté le 2 novembre 2026.
export const PRJ_L93 = 'PROJCS["RGF_1993_Lambert_93",GEOGCS["GCS_RGF_1993",DATUM["D_RGF_1993",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Lambert_Conformal_Conic"],PARAMETER["False_Easting",700000.0],PARAMETER["False_Northing",6600000.0],PARAMETER["Central_Meridian",3.0],PARAMETER["Standard_Parallel_1",49.0],PARAMETER["Standard_Parallel_2",44.0],PARAMETER["Latitude_Of_Origin",46.5],UNIT["Meter",1.0]]';

export const QML = '<!DOCTYPE qgis>\n<qgis version="3.34.0" styleCategories="Symbology">\n  <renderer-v2 type="singleSymbol" symbollevels="0" enableorderby="0" forceraster="0">\n    <symbols>\n      <symbol type="marker" name="0" alpha="1" force_rhr="0" clip_to_extent="1">\n        <layer class="SimpleMarker" enabled="1" locked="0" pass="0">\n          <Option type="Map">\n            <Option type="QString" name="color" value="255,0,0,255"/>\n            <Option type="QString" name="name" value="circle"/>\n            <Option type="QString" name="size" value="6"/>\n          </Option>\n        </layer>\n      </symbol>\n    </symbols>\n  </renderer-v2>\n</qgis>\n';

function enTete(b, mots) {
  b.writeInt32BE(9994, 0); b.writeInt32BE(mots, 24); b.writeInt32LE(1000, 28); b.writeInt32LE(1, 32);
  [X_L93, Y_L93, X_L93, Y_L93].forEach((v, i) => b.writeDoubleLE(v, 36 + 8 * i));
}
function shp() {
  const b = Buffer.alloc(128);
  enTete(b, 64);
  b.writeInt32BE(1, 100); b.writeInt32BE(10, 104); b.writeInt32LE(1, 108);
  b.writeDoubleLE(X_L93, 112); b.writeDoubleLE(Y_L93, 120);
  return b;
}
function shx() {
  const b = Buffer.alloc(108);
  enTete(b, 54);
  b.writeInt32BE(50, 100); b.writeInt32BE(10, 104);
  return b;
}
function dbf() {
  const b = Buffer.alloc(71);
  b[0] = 3; b[1] = 126; b[2] = 11; b[3] = 2; b.writeUInt32LE(1, 4);
  b.writeUInt16LE(65, 8); b.writeUInt16LE(5, 10);
  b.write('CODE', 32, 'latin1'); b[43] = 0x43; b[48] = 4; b[64] = 0x0d;
  b.write(' UG01', 65, 'latin1'); b[70] = 0x1a;
  return b;
}
const geojson = '{"type":"FeatureCollection","name":"points_essai","crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:OGC:1.3:CRS84"}},"features":[{"type":"Feature","properties":{"essence":"ESS","diametre":30},"geometry":{"type":"Point","coordinates":[2.35,48.85]}}]}';

const e = (nom, donnees) => ({ nom: Buffer.from(nom, 'utf8'), donnees: Buffer.isBuffer(donnees) ? donnees : Buffer.from(donnees, 'utf8'), stocke: false, utf8: true });

export const ESSAI = [
  e('points_essai.geojson', geojson),
  e('sous-dossier/notes.txt', "Fichier d'essai Cerf, sans valeur.\n"),
  e('sous-dossier/shape_essai.cpg', 'UTF-8'),
  e('sous-dossier/shape_essai.dbf', dbf()),
  e('sous-dossier/shape_essai.prj', PRJ_L93),
  e('sous-dossier/shape_essai.qml', QML),
  e('sous-dossier/shape_essai.qmd', '<qgis></qgis>'),
  e('sous-dossier/shape_essai.shp', shp()),
  e('sous-dossier/shape_essai.shx', shx()),
];

// Zip « à la Windows » : nom en CP437, bit 11 (UTF-8) NON positionné.
// « forêt/parcelle_é.txt » : ê = 0x88, é = 0x82 en CP437.
export const NOM_CP437_OCTETS = Buffer.from([
  0x66, 0x6f, 0x72, 0x88, 0x74, 0x2f, 0x70, 0x61, 0x72, 0x63, 0x65, 0x6c, 0x6c, 0x65, 0x5f, 0x82, 0x2e, 0x74, 0x78, 0x74,
]);
export const CP437 = [
  { nom: NOM_CP437_OCTETS, donnees: Buffer.from("Nom accentué d'essai Cerf, sans valeur.\n", 'utf8'), stocke: false, utf8: false },
];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sortie = process.argv[2] ?? dirname(fileURLToPath(import.meta.url));
  writeFileSync(join(sortie, 'essai.zip'), ecrireZip(ESSAI));
  writeFileSync(join(sortie, 'essai-cp437.zip'), ecrireZip(CP437));
  console.log(`écrit : ${join(sortie, 'essai.zip')} et ${join(sortie, 'essai-cp437.zip')}`);
}

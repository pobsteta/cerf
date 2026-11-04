#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later
// Cerf, prototype n° 2 : écrit le projet d'essai prototype-2/essai-projet/cerf-essai-2.qgs.
// Demande de Pascal (4 novembre 2026, fiche 030) : y ajouter les fonds IGN. Les sources, l'attribution
// « © IGN », le zoom 0 à 19, les identifiants de couche et le groupe viennent de outils/projet-modele.mjs
// (les mêmes que cerf.qgz) : rien n'est recopié à la main. Le projet reste SANS cerf_id et SANS autre couche :
// les couches que les boutons ajoutent se placent en haut de l'arbre, donc au-dessus du groupe « Fonds de carte ».
// Usage : node prototype-2/projet-essai.mjs   (réécrit le fichier versé au dépôt ; un test le compare)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { FONDS, GROUPE_FONDS, SRS_2154, EXTENT, VERSION_QGIS, xml, source, idCouche, maplayer } from '../outils/projet-modele.mjs';

export const CHEMIN_QGS = fileURLToPath(new URL('./essai-projet/cerf-essai-2.qgs', import.meta.url));

export function ecrireQgsEssai() {
  const e = EXTENT;
  const feuilles = FONDS.map((f) => `      <layer-tree-layer id="${idCouche(f)}" name="${xml(f.nom)}" source="${xml(source(f))}" providerKey="wms" expanded="1" checked="${f.visible ? 'Qt::Checked' : 'Qt::Unchecked'}" legend_exp="" patch_size="-1,-1" legend_split_behavior="0">
        <customproperties><Option/></customproperties>
      </layer-tree-layer>`).join('\n');
  return `<!DOCTYPE qgis PUBLIC 'http://mrcc.com/qgis.dtd' 'SYSTEM'>
<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Projet d'essai du prototype n° 2 de Cerf (mission 023). Fichier GÉNÉRÉ par prototype-2/projet-essai.mjs :
     ne pas le modifier à la main. Il contient les deux fonds IGN de cerf.qgz (Plan IGN v2 coché, BD ORTHO décochée,
     groupe « Fonds de carte »), en Lambert 93, SANS variable de projet d'identifiant (le prototype n'en a pas besoin).
     Les fonds ont besoin du réseau : hors ligne, ils restent vides, ce qui ne gêne pas l'essai. -->
<qgis projectname="cerf-essai-2" version="${VERSION_QGIS}">
  <homePath path=""/>
  <title>cerf-essai-2</title>
  <projectCrs>${SRS_2154}</projectCrs>
  <layer-tree-group>
    <customproperties><Option/></customproperties>
    <layer-tree-group name="${xml(GROUPE_FONDS)}" checked="Qt::Checked" expanded="1">
      <customproperties><Option/></customproperties>
${feuilles}
    </layer-tree-group>
    <custom-order enabled="0">
${FONDS.map((f) => `      <item>${idCouche(f)}</item>`).join('\n')}
    </custom-order>
  </layer-tree-group>
  <mapcanvas name="theMapCanvas" annotationsVisible="1">
    <units>meters</units>
    <extent><xmin>${e.xmin}</xmin><ymin>${e.ymin}</ymin><xmax>${e.xmax}</xmax><ymax>${e.ymax}</ymax></extent>
    <rotation>0</rotation>
    <destinationsrs>${SRS_2154}</destinationsrs>
  </mapcanvas>
  <legend updateDrawingOrder="true"/>
  <projectlayers>
${FONDS.map(maplayer).join('\n')}
  </projectlayers>
  <layerorder>
${FONDS.map((f) => `    <layer id="${idCouche(f)}"/>`).join('\n')}
  </layerorder>
  <properties>
    <SpatialRefSys>
      <ProjectionsEnabled type="int">1</ProjectionsEnabled>
      <ProjectCrs type="QString">EPSG:2154</ProjectCrs>
    </SpatialRefSys>
  </properties>
</qgis>
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(CHEMIN_QGS, ecrireQgsEssai());
  console.log(`${CHEMIN_QGS} écrit`);
}

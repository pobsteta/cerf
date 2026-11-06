# Mission 052 — Bibliothèque de styles modèles et plafond du zip à 100 Mo (plugin 0.6.0)

> Fiche rédigée par Claude (orchestrateur) le 6 novembre 2026, à la demande de Pascal (« garde le
> plafond de 100 Mo. Peux-tu ajouter comme modèle de style le zip joint et mettre à jour la partie
> readme et le manuel sur ce point »). **Statut : validée par Pascal le 6 novembre 2026.**

## Décisions de Pascal (6 novembre 2026)

1. **Plafond du zip : 100 Mo** (100 000 000 octets) au lieu de 10 Mo (spec § 11 n° 1 tranché).
2. **Bibliothèque de styles** : les 25 fichiers `.qml` fournis par Pascal (`styles_qml.zip`) sont
   versés dans `plugin/styles/` et livrés avec le plugin. **Correspondance par nom exact** : une
   couche dont le nom (sans extension, casse et accents ignorés, comme les règles du manuel) est
   égal au nom d'un fichier de la bibliothèque prend ce style. **Ordre** : style enregistré dans le
   GeoPackage (047) → **bibliothèque** → règle du manuel → style par défaut.
3. **Styles raster** (`D50`, `G`, `MNH`, `VAT`, `compoRVB`, `mnh_classe_res10m`) : versés dans la
   bibliothèque mais **non appliqués** pour l'instant (un GeoTIFF reste lu dans le zip, ADR 0008) ;
   la spec et le README le disent ; mission à part plus tard.

## Mission

**En une phrase :** Le plugin 0.6.0 lit la bibliothèque `plugin/styles/` et pose, avant le
chargement, le `.qml` dont le nom correspond exactement au nom d'une couche vecteur importée, à la
place de la règle du manuel ; le plafond du zip passe à 100 Mo ; README et spec (§ 3.1, § 4, § 5,
§ 11) à jour.

- Lecture du `.qml` de la bibliothèque : le plugin est installé sur le disque, hors `/vsizip/` ;
  vérifier dans les sources de QField 4.3.7 comment un plugin connaît son propre dossier
  (`Qt.resolvedUrl`, chemin du `main.qml`) et que `FileUtils.readFileContent` lit ce fichier
  (il ne lisait pas en `/vsizip/`, mission 041 ; ici c'est un fichier ordinaire). Si ce n'est pas
  prouvable dans les sources, arrête-toi et dis-le avant de coder (règle « preuve avant code »,
  bilan n° 1).
- Le `.qml` retenu est contrôlé comme les autres (`qmlValide`), écrit à côté de la copie réécrite
  (ADR 0008), ancien `.qml` effacé avant (mission 032) ; registre : `style: "bibliotheque"`.
- Un style raster de la bibliothèque n'est jamais posé sur un vecteur, ni l'inverse.
- Messages : **aucun nouveau texte** sans le soumettre à Pascal ; le message du plafond change de
  nombre (10 → 100).
- `plugin/styles/` est un **dépôt de styles fournis par Pascal** : ne pas les modifier.
- Constat à signaler, non à trancher : les styles RDF_UG, RDF_Parc et RDF_FRT étiquettent par
  `CCOD_UG`, `CCOD_PRF` et `CCOD_FRT`, alors que les règles du manuel utilisent les champs
  provisoires `CODE_UG`, `CODE_PARC`, `CODE_FRT` (spec § 5, question à JFC).

## Harnais

- **Agent :** `dev`, tests compris. Branche `mission/052-styles-modeles`, depuis `main`.
- **Doit :** tests (nom exact, casse et accents, priorité GeoPackage > bibliothèque > règle,
  style raster ignoré pour un vecteur, `.qml` illisible de la bibliothèque → règle du manuel avec
  l'avertissement existant, plafond 100 Mo) ; plugin 0.6.0 et `plugin/styles/` dans le zip du
  plugin (`release-plugin.yml`, liste des fichiers du plugin) ; README (styles, plafond) et spec
  datés ; aucun test affaibli.
- **Ne doit pas :** toucher au journal, au kanban, à `prototype/`.

## Terrain

Sur le Samsung, avec `plugin-essai` 0.6.0 : un zip avec une couche `RDF_UG.geojson` (ou `.shp`)
prend le style de `RDF_UG.qml` ; une couche `UG` garde la règle du manuel ; un zip de 50 Mo est lu.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal. **Qui tranche :** Pascal.

**Redite par l'agent :** à remplir.

## Arbitrage de Pascal (6 novembre 2026, après l'arrêt du dev)

- **Voie 1** : les styles sont embarqués dans un module JavaScript du plugin, **généré** à
  l'empaquetage depuis `plugin/styles/` (le dossier reste la source, intact). Le plugin ne lit
  aucun fichier `.qml` sur le disque (`FileUtils.readFileContent` refuse hors du projet,
  QField v4.3.7 `qffileutils.cpp` l. 620-628).
- **Les 25 styles** sont embarqués, vecteur et raster ; les 6 raster restent non appliqués
  (GeoTIFF lu dans le zip, ADR 0008).

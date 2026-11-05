# Mission 047 — Garder le style enregistré dans un GeoPackage du zip (table `layer_styles`)

> Fiche rédigée par Claude (orchestrateur) le 5 novembre 2026, à la demande de Pascal (« est-ce que
> le plugin gère les styles des couches contenues dans un gpkg du zip ? Si non il doit le faire »).
> **Statut : validée par Pascal le 5 novembre 2026.** Priorité du style du GeoPackage sur la règle
> du manuel : proposée par l'orchestrateur, **à confirmer par Pascal** (même intention que le
> `.qml` posé dans le zip, brief, reporté pour une raison technique propre au `.qml`).

## Constat (plugin 0.4.1, `main`)

- La **règle du manuel** s'applique déjà par **nom de table** (spec § 5) : une table `UG` d'un
  `Serre.gpkg` prend le style UG.
- Le **style enregistré dans le GeoPackage** (table `layer_styles`, que QGIS remplit avec
  « Enregistrer le style dans la base de données ») est **perdu** : la table est réécrite par
  `saveVectorLayerAs` dans `cerf-imports/<zip>/<table>.gpkg` (ADR 0008), qui ne recopie que les
  entités (à vérifier dans les sources de QGIS), puis le `.qml` de la règle est posé à côté.
- QField 4.3.7 n'expose à un plugin ni `loadNamedStyle` ni `saveNamedStyle` (ADR 0008) ; mais le
  plugin lit déjà une table système d'un GeoPackage par une couche filtrée
  `|subset=SELECT … FROM gpkg_contents` (mission 024, voie 1 du prototype n° 4).

## Mission

**En une phrase :** Pour chaque table vecteur d'un GeoPackage du zip, lire son style par défaut
dans `layer_styles` (`styleQML` de la ligne où `f_table_name` = la table et `useAsDefault` vrai,
sinon la plus récente) par la même voie `|subset=SELECT …` que `gpkg_contents`, et l'écrire comme
`.qml` à côté de la copie réécrite **à la place** de celui de la règle du manuel ; sans
`layer_styles`, sans ligne pour la table, ou si la lecture échoue : la règle du manuel s'applique
comme aujourd'hui, avec un avertissement seulement si une ligne existait mais n'a pas pu être lue.

- Contrôles du `.qml` lu : mêmes garde-fous que pour un `.qml` (non vide, XML `<qgis`), sinon règle
  du manuel et l'avertissement existant « .qml illisible, style du manuel appliqué » ; **aucun
  nouveau texte** sans le soumettre à Pascal dans le rapport.
- Ancien `.qml` voisin effacé avant écriture (règles de la mission 032, inchangées).
- Plugin **0.4.2** ; préversion `plugin-essai` ; zip d'essai `essai-gpkg-style.zip` (GeoPackage
  fictif, deux tables, l'une avec un style enregistré inhabituel — par exemple contour vert épais —
  l'autre sans), publié avec les zips d'essai et son flashcode si c'est simple, sinon dit.
- Spec § 5 (ordre de priorité : style du GeoPackage → règle par nom → règle par champs → défaut)
  et README à jour, avec la date.

## Moyens

- `plugin/cerf-logique.mjs` (`tablesDuGpkg`, `construireSource`, `copierEtStyler`),
  `plugin/cerf-styles.mjs`, `plugin/Cerf.qml` ; sources QGIS (`qgsogrprovider.cpp`, ExecuteSQL,
  `qgsvectorfilewriter.cpp`) et QField 4.3.7 (lecture par raw.githubusercontent.com) ; prototype
  n° 4 et fiche 024 ; `outils/zip-essai-manuel.mjs`, `.github/workflows/release-essai-manuel.yml`.

## Harnais

- **Agent :** `dev`, tests compris. Branche `mission/047-styles-gpkg`, depuis `main`.
- **Doit :** tests (style lu et posé ; pas de `layer_styles` ; table sans ligne ; plusieurs lignes ;
  `styleQML` vide ou non XML ; lecture qui échoue) ; vérifier dans les sources que
  `saveVectorLayerAs` ne recopie pas `layer_styles` et que le `SELECT` sur `layer_styles` passe
  comme celui sur `gpkg_contents` (couche 0 ouverte d'abord ?) ; ne rien affaiblir.
- **Ne doit pas :** toucher au projet modèle (`outils/projet-modele.mjs`, mission 045 en cours) ;
  journal, kanban.

## Terrain

Sur le Samsung avec `plugin-essai` 0.4.2 : `essai-gpkg-style.zip` → la table stylée garde son style
(contour vert épais), l'autre prend la règle du manuel ; réouverture du projet : styles gardés.
Non prouvé tant que ce n'est pas vu : la voie `SELECT` sur l'appareil (déjà en attente avec
`essai-tables-z.zip`).

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal. **Qui tranche :** Pascal.

**Redite par l'agent :** Pour chaque table vecteur d'un GeoPackage du zip, lire (avant la réécriture, par une couche
OGR filtrée `|subset=SELECT styleQML FROM layer_styles WHERE f_table_name = '<table>' ORDER BY …`, comme la liste des
tables de la mission 024) le style par défaut, sinon le plus récent, et l'écrire comme `.qml` à côté de la copie
réécrite à la place de celui de la règle du manuel, pour que l'agent garde sur le terrain le style qu'il a choisi dans
QGIS ; sans `layer_styles`, sans ligne, ou si la lecture échoue, la règle du manuel s'applique comme aujourd'hui.

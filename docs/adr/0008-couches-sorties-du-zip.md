# ADR 0008 — Couches sorties du zip, avec leur style écrit à côté

- **Date :** 2026-11-04
- **Statut :** **proposée** — décidée sur le principe par Pascal le 4 novembre 2026 après
  l'essai du prototype n° 2 ; à critiquer par le `contradicteur`, puis à accepter par Pascal
- **Proposée par :** Claude (orchestrateur)
- **Tranchée par :** Pascal
- **Amende :** ADR 0003 (lecture dans le zip par `/vsizip/`)

## La décision en une phrase

Le plugin ne lit plus les couches **dans** le zip : il sort chaque couche à charger (tous ses
fichiers : `.shp`, `.shx`, `.dbf`, `.prj`, `.cpg`, ou le `.geojson`, le `.gpkg`, le `.tif`)
dans `<dossier du projet>/cerf-imports/<nom du zip>/`, écrit **à côté et avant le
chargement** le `.qml` du style (celui du zip s'il existe, sinon celui de la règle du
manuel), puis la charge depuis le disque ; QGIS applique alors ce style tout seul.

## Contexte

- QField 4.3.7 n'offre à un plugin aucune fonction pour poser un style sur une couche
  (`setRenderer`, `setLabeling`, `loadNamedStyle` non exposés à QML : dev de la 010,
  acquéreur, dev de la 023, d'après les sources de QField et de QGIS).
- QGIS charge au constructeur de la couche le style par défaut : un `.qml` de même nom
  **à côté d'un fichier sur disque**, ou la table `layer_styles` d'un GeoPackage.
- Prototype n° 2 sur le Samsung de Pascal (fiche 023, 4 novembre 2026) : couche sortie du zip
  avec son `.qml` écrit avant : couleurs **et** étiquettes (1a, 1b oui) ; couche lue en
  `/vsizip/` avec le `.qml` dans le zip : **style par défaut** (2 non) ; GeoPackage
  `layer_styles` : oui (3a, 3b) ; `.qml` écrit après le chargement : ignoré (4) ; style gardé
  à la réouverture, couche rechargée depuis le disque (5).
- Le prototype n'a extrait que des entrées **stockées** ; les zips réels sont compressés
  (deflate) : il faut un décompresseur en JavaScript (mission 026).

## Ce qui change

1. **Import** : copie du zip dans `cerf-imports/` (inchangé, sous nom provisoire : 014) ;
   lecture de son répertoire ; pour chaque couche retenue, extraction de ses fichiers dans
   `cerf-imports/<nom du zip>/` (dossier remplacé en entier à un réimport réussi) ;
   `.qml` écrit à côté ; contrôles (012) sur la couche ouverte depuis le disque ; ajout à la
   carte.
2. **Registre** (ADR 0003) : `chemin` relatif au fichier extrait, plus `chemin_vsi`.
3. **Réouverture** : rechargement depuis les fichiers extraits ; le zip n'est plus relu.
4. **Retrait** : effacement des fichiers extraits de la couche (ADR 0007 à étendre au
   dossier `cerf-imports/<nom du zip>/` et aux extensions des couches et du `.qml`).
5. **Lecture seule** : inchangée (couches posées `readOnly`).

## Le crible FRANCE

| Lettre | Question | Réponse | Ce que ça coûte | Prêts à payer ? |
|---|---|---|---|---|
| **F**rugale | Plus simple ? | Seule voie prouvée pour les couleurs du manuel ; un mécanisme de QGIS, pas de code de rendu. | Un extracteur (inflate) écrit pour Cerf. | à trancher par Pascal |
| **R**esponsable | Qui fait quoi ? | Le plugin seul ; JFC ne change rien à ses zips. | — | oui |
| **A**nticiper | Imprévu ? | Zip compressé non lisible tant que la 026 n'est pas livrée ; GeoTIFF lourd à extraire ; place doublée (zip + fichiers) ; extraction interrompue. | Place sur l'appareil ; temps d'import. | à mesurer (critère 1 : 2 min) |
| **N**ovateur | Idées écoutées ? | Quatre voies essayées (pose directe, `.qml` dans le zip, `.qml` voisin, `layer_styles`). | — | — |
| **C**oût | Dépense inutile ? | Effacer le zip après extraction réussie réduirait la place (à trancher). | — | à trancher |
| **É**cologique | Réutilisation ? | Extracteur et pose du style réutilisables par d'autres plugins QField. | — | — |

## Valeurs sacrifiées

- **Place sur l'appareil** : zip et fichiers extraits (sauf si le zip est effacé après
  extraction).
- **Temps d'import** sur les gros GeoTIFF : à mesurer avec le zip `lourd` (critère 7).

## Questions ouvertes (pour Pascal, après la critique)

1. Garder ou effacer la copie du zip après une extraction réussie ?
2. GeoTIFF de 200 Mo : extraire aussi, ou le lire dans le zip sans style (pas de `.qml` pour
   un raster dans le manuel) ?
3. GeoPackage : extraire le fichier et écrire `layer_styles`, ou un `.qml` voisin ?

## Question de contrôle

On saura que la décision tient quand le zip `Serre_EA2026` de JFC, compressé, importé hors
ligne, montre UG, Parcelles et FRT aux couleurs du mail de JFC en 2 minutes au plus, et les
garde à la réouverture du projet.

## Critique du contradicteur et arbitrages de Pascal (4 novembre 2026)

Critique : voie plus simple vue dans QField 4.3.7, `LayerUtils.saveVectorLayerAs(layer,
filePath, driverName, filterExpression)` : ouvrir la couche en `/vsizip/` (GDAL décompresse),
la contrôler (012), la réécrire dans `cerf-imports/`, écrire le `.qml` à côté, la charger ;
`.qml` voisin inopérant pour un GeoPackage à plusieurs tables (QGIS cherche `<fichier>.qml`) ;
retrait et réimport sans listage ni renommage dans l'API des plugins (dossier neuf par import,
liste des fichiers au registre, ADR 0007 à étendre à `.qml`, `-wal`, `-shm`, `.aux.xml`) ;
`.qml` du zip à contrôler par le plugin avant de l'écrire (QGIS le charge en silence) ; `.qml`
à côté du zip : voie vue, non retenue (un style par zip).

Arbitrages de Pascal :
1. **Essai court d'abord** de la voie `saveVectorLayerAs` sur le Samsung (prototype n° 3,
   mission 027) ; la mission 026 (inflate) attend son résultat.
2. **Garder la copie du zip** dans `cerf-imports/` (réparation, réimport).
3. **GeoTIFF : restent lus dans le zip**, style par défaut, en tranche 1.
4. **GeoPackage à plusieurs tables : une table par fichier**, chacune avec son `.qml` voisin.

L'ADR reste **proposée** jusqu'au résultat du prototype n° 3.

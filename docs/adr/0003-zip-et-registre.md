# ADR 0003 — Lecture dans le zip et registre des couches

- **Date :** 2026-11-02
- **Statut :** proposée — clé et emplacement tranchés par Pascal le 2 novembre 2026 (arbitrage 6)
- **Proposée par :** Claude (orchestrateur), d'après la critique du `contradicteur`
- **Tranchée par :** Pascal

## La décision en une phrase

Le plugin copie le zip choisi dans `Imported Datasets/cerf/<cerf_id>/`, hors du dossier
projet, lit les couches **dans** le zip par `/vsizip/` sans le décompresser, et tient un
registre JSON dans les réglages de QField sous la clé `cerf/<cerf_id>`, rechargé à la fin
de chaque ouverture de projet.

## Contexte

QField n'écrit pas le fichier projet : les couches ajoutées doivent être rechargées par le
plugin. `qfield_addLayer` montre l'idée (registre dans `Settings`, `onLoadProjectEnded`,
`LayerUtils.loadVectorLayer`, `ProjectUtils.addMapLayer`), mais **n'a aucune licence** :
idée reprise, code réécrit. `qfield-layer-loader` ne préfixe `/vsizip/` que pour un zip
distant et ne liste pas les zips. **Aucune fonction QML connue ne liste un zip ;
`FileUtils.deleteFiles` refuse un `.zip`** (contradicteur, d'après le code de QField). Options : décompresser (aucune API QML prouvée) ;
**`/vsizip/`** ; laisser QField importer le zip comme dossier (comportement non vérifié
pour un zip sans projet). Clé du registre : nom du fichier projet (fragile) ou
**identifiant propre** (retenu).

## Le crible FRANCE

| Lettre | Question | Réponse | Ce que ça coûte | Prêts à payer ? |
|---|---|---|---|---|
| **F**rugale | Plus simple ? | Recopier deux mécanismes existants. | — | oui |
| **R**esponsable | Qui fait quoi ? | Le plugin seul ; la notice dit de changer `cerf_id` quand on copie le projet. | Une consigne de plus. | à trancher par Pascal |
| **A**nticiper | Imprévu ? | Zip disparu → message, entrée retirée. QField désinstallé → tout perdu, zip d'origine chez JFC. | Ré-import. | oui (lecture seule) |
| **N**ovateur | Idées écoutées ? | Trois lectures, deux clés. | — | — |
| **C**oût | Dépense inutile ? | Pas de décompression : pas de double stockage. | GeoTIFF lourd lu lentement dans un zip. | à mesurer (prototype) |
| **É**cologique | Réutilisation ? | Registre et lecteur réutilisables par d'autres projets. | — | — |

## Valeurs sacrifiées

- **Vitesse sur les gros rasters** : lecture dans le zip plus lente ; à mesurer sur un
  GeoTIFF de 200 Mo. Si elle est trop lente, décompresser les seuls GeoTIFF.

## À prototyper avant de coder la suite

Lister le contenu d'un zip depuis QML ; Shapefile dans un zip ; `.qml` trouvé dans le zip ;
GeoTIFF de 200 Mo ; sélecteur de fichier sous Android 11 et plus.

## Sources

- [qfield_addLayer, main.qml](https://github.com/lukashelmke/qfield_addLayer/blob/main/main.qml) (lu par le contradicteur) ;
  [qfield-layer-loader, main.qml](https://github.com/mbernasocchi/qfield-layer-loader/blob/main/main.qml) (lu) ;
  [GDAL, systèmes de fichiers virtuels](https://gdal.org/en/stable/user/virtual_file_systems.html) (non lu, domaine bloqué).

## Question de contrôle

Cette décision tient-elle nos six valeurs, et que sommes-nous prêts à payer pour cela ?

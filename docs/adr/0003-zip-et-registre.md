# ADR 0003 — Lecture dans le zip et registre des couches

- **Date :** 2026-11-02
- **Statut :** **acceptée par Pascal le 2 novembre 2026** (porte n° 1) — arbitrages de Pascal reportés (brief, arbitrage 6 ; spec § 9, n° 1 à 3)
- **Proposée par :** Claude (orchestrateur), d'après la critique du `contradicteur`
- **Tranchée par :** Pascal

## La décision en une phrase

Le plugin copie le zip choisi dans `<dossier du projet>/cerf-imports/` (repli du 3 novembre 2026, voir en fin d'ADR) — à l'origine `Imported Datasets/cerf/<cerf_id>/`, hors du dossier
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
| **A**nticiper | Imprévu ? | Zip disparu → message, entrée gardée au registre (spec § 3.3, corrigé le 3 novembre 2026). QField désinstallé → tout perdu, zip d'origine chez JFC. | Ré-import. | oui (lecture seule) |
| **N**ovateur | Idées écoutées ? | Trois lectures, deux clés. | — | — |
| **C**oût | Dépense inutile ? | Pas de décompression : pas de double stockage. | GeoTIFF lourd lu lentement dans un zip. | à mesurer (prototype) |
| **É**cologique | Réutilisation ? | Registre et lecteur réutilisables par d'autres projets. | — | — |

## Arbitrages de Pascal après critique (2 novembre 2026)

- **Un seul `cerf.qgz` par appareil** ; `cerf_id` lu, jamais écrit par le plugin.
- Si le plugin ne peut pas lister le zip hors du dossier projet : le zip va **dans** le
  dossier projet, Cerf n'est pas utilisé avec QFieldCloud, et l'on demande à QField
  d'exposer le listage aux plugins.
- Si l'effacement d'un `.zip` est impossible : la copie reste, son nom est affiché.
- Valeurs sacrifiées ajoutées : la **place sur l'appareil** (si l'effacement est
  impossible) ; la **compatibilité QFieldCloud** (si le zip doit aller dans le dossier
  projet).

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

## Résultat du prototype n° 1 (3 novembre 2026)

Sur le Samsung de Pascal : un zip copié **hors du dossier projet** se liste (9 entrées sur
9) ; il s'efface par `platformUtilities.rmFile` (`FileUtils.deleteFiles` refuse les
`.zip`). La décision ci-dessus tient sans repli. Reste ouvert : dépendre de `rmFile`
(spec § 10), à trancher par Pascal dans une ADR.

## Repli appliqué (3 novembre 2026)

À l'essai du squelette, QField v4.3.7 refuse à un plugin de lire une copie hors du dossier
projet. Pascal applique le repli de la spec § 9 n° 1 : copies dans
`<dossier du projet>/cerf-imports/` ; Cerf n'est pas utilisé avec QFieldCloud. Valeur
sacrifiée ajoutée : la compatibilité QFieldCloud, et la survie des copies à la suppression
du projet.

## Question de contrôle

Cette décision tient-elle nos six valeurs, et que sommes-nous prêts à payer pour cela ?

## Amendée par l'ADR 0008 (4 novembre 2026)

Décision de Pascal après le prototype n° 3 (voir [ADR 0008](0008-couches-sorties-du-zip.md)).
Ce qui précède reste lisible tel quel ; ce qui change :

- **Vecteurs** (GeoJSON, GeoPackage, Shapefile) : ils ne sont **plus lus dans le zip**. Le
  plugin les ouvre en `/vsizip/`, les contrôle (ADR 0004), puis les **réécrit** par
  `LayerUtils.saveVectorLayerAs` en GeoPackage dans
  `<dossier du projet>/cerf-imports/<nom du zip>/`, **une table par fichier**, avec à côté,
  avant le chargement, le `.qml` du style (celui du zip s'il existe, sinon la règle du
  manuel). La couche est chargée depuis ce fichier, en lecture seule, et revient de même à la
  réouverture.
- **GeoTIFF** : **inchangés**, lus dans le zip par `/vsizip/`, style par défaut (tranche 1).
- **Copie du zip** : **gardée** dans `cerf-imports/` (réparation, réimport). La phrase
  « pas de décompression : pas de double stockage » ne vaut plus pour les vecteurs : la
  place sur l'appareil est doublée (zip et fichiers réécrits).
- **Registre** : pour une couche vecteur, le **chemin de la copie réécrite** (relatif au
  dossier des copies) remplace `chemin_vsi` ; le champ `zip` est **gardé**. Un GeoTIFF garde
  son `chemin_vsi`.
- **Valeur sacrifiée ajoutée** : la fidélité au format d'origine (un Shapefile devient un
  GeoPackage).
- La mission 026 (décompresseur JavaScript) est abandonnée.

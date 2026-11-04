# Prototype n° 3 (mission 027) — plan, étape 1, aucun code

**Mission redite.** Ajouter au prototype n° 2 des boutons qui ouvrent en `/vsizip/` une couche
d'un zip **compressé** (Shapefile, GeoJSON, GeoPackage à deux tables), la réécrivent dans
`cerf-imports/` par `LayerUtils.saveVectorLayerAs`, écrivent son `.qml` à côté, la chargent, et
mesurent le temps : pour que Pascal voie sur le Samsung si cette voie évite le décompresseur de
la mission 026 (ADR 0008).

## 1. Ce que disent les sources de QField 4.3.7 (lues par `curl` sur raw.githubusercontent.com, accès accordé, HTTP 200)

`qflayerutils.h` / `.cpp` :

```
Q_INVOKABLE static QString saveVectorLayerAs( QgsVectorLayer *layer, const QString &filePath,
    const QString &driverName = QString(), const QString &filterExpression = QString() );
```
- **Retour** : le chemin final écrit (`finalFileName`), **chaîne vide** en cas d'échec. Pas d'exception.
- **Vide aussi** si : couche nulle, chemin vide, pilote introuvable, `mkpath` du dossier impossible,
  `writer->hasError()` (message seulement dans le journal Qt, `qInfo`, pas rendu au QML).
- **Pilote** : `driverName` vide = déduit de l'extension (`.gpkg` donne `GPKG`) ; on passe `"GPKG"`
  explicitement. Toute chaîne de pilote OGR est acceptée, aucune liste blanche.
- **Dossier** : `QDir().mkpath(dossier du fichier)` : crée les dossiers manquants. **Aucun contrôle
  de chemin** (pas de limite à `cerf-imports/`) : la limite est la nôtre (garde `peutEcrire…`, comme
  `peutEffacerQml`). Fichier existant : **écrasé** (`CreateOrOverwriteFile`).
- **Couche en lecture seule** : sans effet, la fonction ne fait que lire (`getFeatures`) ; la
  couche source n'est pas vérifiée (`isValid` non testé : une couche invalide donne un fichier
  vide ou un échec, à tester nous-mêmes avant).
- **Ce qui est écrit** : une table nommée comme le fichier (`completeBaseName`), UTF-8, **système de
  la couche source sans reprojection**, types et champs de la source, `NoSymbology` (aucun
  `layer_styles` écrit : le style ne vient que de notre `.qml`), clé primaire régénérée (`fid`).
  Toutes les entités, de façon synchrone (l'appel bloque l'interface pendant l'écriture) ; l'écrivain
  est détruit au retour, donc fichier fermé (le `-wal` ne devrait pas survivre : question 5).
- Une couche = une table : le GeoPackage à deux tables demande **deux appels**, un par table.

## 2. Boutons (un par question de la fiche), ajoutés à `Essai.qml` après le 7

Tous : vérifient d'abord que le projet ouvert est `cerf-essai-2.qgs` ; écrivent dans
`<projet>/cerf-imports/q3-<N>/`, **N = compteur du plugin à chaque appui** (dossier neuf, pas de
collision, pas d'effacement). Chaque ligne affiche `isValid`, `crs.authid`, `featureCount()`,
`extent()` de la source puis de la copie, et le temps.

| Bouton | Appels exacts, dans l'ordre | Réponse attendue de Pascal |
|---|---|---|
| **8. Shapefile : réécrire, styler** (Q1, Q2) | `src = LayerUtils.loadVectorLayer("/vsizip/<projet>/cerf-imports/essai-styles-z.zip/FRT_q7.shp","src")` ; si `!isValid` stop ; `chemin = LayerUtils.saveVectorLayerAs(src, "<dossier>/FRT_q7.gpkg", "GPKG")` ; si `""` stop ; `FileUtils.writeFileContent("<dossier>/FRT_q7.qml", qml)` (le `.qml` vient du **plugin**, pas du zip) ; **alors** `loadVectorLayer(chemin + "\|layername=FRT_q7", "FRT_q7")` ; `ProjectUtils.addMapLayer` | Q1 : fichier écrit (taille > 0), 2 entités, `EPSG:2154`, accents d'un champ lisibles (« Étang », « Forêt » dans le `.dbf` d'essai, à ajouter) ; Q2 : contour bleu/vert et étiquettes du manuel, deux réponses (couleurs, étiquettes) |
| **9. GeoJSON : réécrire, styler** (Q4) | idem avec `UG_q1.geojson`, `"GPKG"`, `.qml` UG | idem Q1 et Q2 ; système de la copie : `EPSG:4326` si la source n'a pas de `crs` (à noter, non à corriger : c'est le travail de la 012) |
| **10. GeoPackage 2 tables** (Q3) | source `…/essai-gpkg2.gpkg\|layername=Parcelles` puis `=Zones` (noms fixes de l'essai) ; deux `saveVectorLayerAs` vers `Parcelles.gpkg` et `Zones.gpkg` ; **un `.qml` voisin chacun** (orange, bleu) ; deux `loadVectorLayer` ; deux `addMapLayer` | chaque table dans son fichier, chacune avec son style et sans mélange : oui/non par table |
| **11. Fichiers annexes** (Q5) | avant : couche copie retirée (`ProjectUtils`/`removeMapLayer`) ; **listage** : QField n'en offre pas, donc on **sonde** par `FileUtils.readFileContent` chaque nom attendu (`.gpkg`, `.gpkg-wal`, `.gpkg-shm`, `.qml`, `.aux.xml`, `.gpkg.aux.xml`) ; affiche taille ou « absent » ; puis `platformUtilities.rmFile` sur chacun présent (garde : sous `cerf-imports/`, ADR 0007) et **re-sonde** | liste des annexes vues, et « tout effacé : oui/non » après retrait |
| **12. Tout enchaîner et chronométrer** | boutons 8, 9, 10 à la suite, sans écran entre ; `Date.now()` (ms) avant/après chaque étape | trois durées lisibles, plus le total |

Bouton **0b. Préparer le zip compressé** : copie par `platformUtilities.getFile` (geste déjà prouvé
au 0) du zip `essai-styles-z.zip`. Le zip n'est pas extrait : **aucun décompresseur dans le plugin.**

## 3. Fichiers écrits, où

Seulement sous `<projet>/cerf-imports/q3-<N>/` : `FRT_q7.gpkg` (+ `.qml`), `UG_q1.gpkg` (+ `.qml`),
`Parcelles.gpkg`, `Zones.gpkg` (+ un `.qml` chacun), et les annexes que GDAL ajoute. Le zip copié
reste à `cerf-imports/` (arbitrage 2 de Pascal). Rien ailleurs.

## 4. Mesure du temps

`Date.now()` (ms) autour de : (a) `loadVectorLayer` source, (b) `saveVectorLayerAs`, (c) écriture du
`.qml`, (d) `loadVectorLayer` de la copie ; total de chaque bouton. Jeu d'essai **petit** (2 entités
par couche) : on mesure le coût fixe (décompression GDAL, création du GPKG), pas le volume. Pour le
volume : un **GeoJSON de 2 000 polygones** (ordre du ProdBois de Serre_EA2026) ajouté au zip, bouton
« 9b », temps lu seul. La règle du brief est 2 minutes au total, médiane de 3 essais : Pascal
appuie **trois fois** sur le 12 et note les trois totaux.

## 5. Zip d'essai compressé (`fabriquer-essais.mjs`)

`ecrireZip` (`tests/recette/essai/zip-ecrire.mjs`) sait déjà deflater (`stocke: false`,
`deflateRawSync` de `node:zlib`, méthode 8). Ajouts : une fonction `fabriquerEssais3()` qui sort
`essai-styles-z.zip` **entièrement compressé**, avec `FRT_q7.*` (Shapefile complet avec `.prj`,
`.cpg`, accents), `UG_q1.geojson`, `essai-gpkg2.gpkg` (deux tables `Parcelles`, `Zones`, sans
`layer_styles`, pour que le style ne puisse venir que de notre `.qml`), le GeoJSON de 2 000
polygones. Tests `node --test` : toutes les entrées de méthode 8 (relecture du répertoire
central), tailles et CRC32 justes, `inflateRawSync` redonne les octets d'origine, le Shapefile et
le GPKG relus par `ogrinfo`/`node:sqlite` s'il est disponible (déjà fait au 023). Le `.gpkg` dans le
zip est lui-même déjà compressible : on le fait deflater aussi, c'est le cas réel.

## 6. Ce que Pascal doit voir pour répondre oui ou non (mode avion, projet `cerf-essai-2`)

- **Q1 oui** : écran du bouton 8 : « écrit : oui, N octets, 2 entités, EPSG:2154, accents lus : oui », et
  durée < quelques secondes. **Non** : chemin vide, 0 entité, système vide ou accents déformés.
- **Q2 oui** : carte aux couleurs du manuel (FRT : vert-bleu, étiquettes). **Non** : style par défaut.
- **Q3 oui** : bouton 10 : deux couches, orange et bleue, chacune avec sa propre étiquette.
- **Q4 oui** : comme Q1 et Q2 pour le GeoJSON (le système noté à part).
- **Q5** : liste des annexes ; « effacées : oui » après `rmFile` et re-sonde.
- Une capture par écran + par carte, comme au 023. Réponse « essai raté » (et non « non ») si la
  source ne charge pas.

## 7. Risques

| Risque | Effet | Parade |
|---|---|---|
| GDAL ne lit pas un `.gpkg` (SQLite) dans `/vsizip/` compressé | bouton 10 invalide à la source | c'est **une réponse** (non, voie fermée pour GPKG ; le zip des vrais GPKG devra être traité autrement) ; on la note, on n'insiste pas |
| `saveVectorLayerAs` bloque l'interface sur gros fichier | écran figé, perçu comme un plantage | 2 000 entités mesurées au 9b ; on le dit, pas de thread (non réalisable en QML) |
| Échec muet (chaîne vide, raison en `qInfo`) | on ne sait pas pourquoi | afficher `isValid`, `featureCount` source, droits du dossier (`writeFileContent` d'un test) avant de conclure |
| Système de la copie = celui de la source (pas de reprojection, GeoJSON sans `crs` en 4326) | copie valide en apparence, mal placée | la copie affiche `crs` ; contrôle de vraisemblance reste à la 012 ; non traité ici |
| Écriture synchrone entre deux couches du GPKG à deux tables : un `-wal` laissé | annexes à effacer | question 5 le dit |
| `writer` nul non testé dans QField (`writer->hasError()` sans garde) | plantage possible si création impossible | tester sur chemin non inscriptible **seulement si** Pascal le demande (planter QField n'apprend rien d'utile) |
| `rmFile` sans contrôle de chemin (ADR 0007) | effacement hors périmètre | garde `peutEffacerQml` étendue **dans le prototype** à `.gpkg`, `-wal`, `-shm`, `.aux.xml`, `.qml` sous `cerf-imports/` |
| Mauvaise lecture `/vsizip/` si le chemin du zip contient une espace ou un accent | source invalide | nom du zip sans accent ni espace (comme au 023) |

## 8. Questions pour Pascal (réponse proposée)

1. Jeu d'essai de 2 000 entités (bouton 9b) en plus du petit : **oui**, c'est ce qui donne un vrai temps.
2. Un seul zip `essai-styles-z.zip`, à côté de l'ancien stocké (inchangé) : **oui**, deux noms distincts.
3. Réutiliser le projet `cerf-essai-2.zip` et le plugin « prototype n° 2 » (version 0.2.0) plutôt que d'en
   publier un nouveau : **oui**, une préversion `prototype-2` mise à jour (sha du commit dans les notes).
4. Accents : ajouter « Étang » et « Forêt » dans le `.dbf` d'essai (le `.cpg` dit UTF-8) : **oui**.
5. Le chemin de sortie par un dossier neuf `q3-<N>` à chaque appui (rien d'effacé, sauf le bouton 11 sur
   les annexes) : **oui**.
6. Test du chemin non inscriptible (échec de `saveVectorLayerAs`) : **non**, risque de plantage sans
   enseignement ; on s'en tient aux sources lues.
7. Protocole : section « Prototype n° 3 » dans `tests/recette/prototype-2.md`, relue par le testeur : **oui**.

## Question de contrôle

Qui fait quoi d'ici quand, et comment saura-t-on que ça marche ? Le dev écrit le code, les tests et le
protocole après validation de ce plan ; Pascal, sur le Samsung en mode avion, répond oui/non aux cinq
questions avec captures et trois durées ; on saura que ça marche quand les cinq cases sont cochées
sans écran d'erreur, et la décision de la 026 se prend sur ces réponses.

## Ligne de journal proposée

`2026-11-04 · dev · 027 · étape 1 : plan rendu (prototype-2/PLAN-3.md), aucun code ; saveVectorLayerAs lue sur les sources 4.3.7 : rend le chemin ou "", écrase, GPKG par extension ou "GPKG", crée le dossier sans garde de chemin, ne reprojette pas, NoSymbology, synchrone ; ecrireZip sait déjà deflater ; sept questions à Pascal.`

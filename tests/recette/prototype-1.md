# Protocole d'essai du prototype n° 1

> Rédigé par le `testeur` le 2 novembre 2026, à partir de `docs/spec.md` (§ 3.1, § 3.3, § 5,
> § 6, § 8 n° 5, § 9), de l'ADR 0003 et de l'ADR 0005. Mission 003, aller-retour 1/3.
> **Statut : proposé, pas encore suivi.**
> Le prototype (mission 004) est écrit : les gestes nomment ses boutons tels qu'ils figurent
> dans `prototype/Cerf.qml` (A à I), correspondance au § 10 bis de `prototype/PLAN.md`.
> Ce que le protocole attend que le prototype **affiche** (liste,
> chemin, taille, `cerf_id`, temps…) est une exigence pour la mission 004 : si le prototype
> n'affiche pas la valeur, le geste n'est pas coché et Pascal le dit dans « Vu autrement ».

**But.** Dire, sur critère fixé d'avance, si un plugin QField sait : (1) lister le contenu
d'un zip, (2) le copier hors du dossier projet, (3) effacer un `.zip`, (4) charger un module
`.mjs`, puis les cinq points « À prototyper » de l'ADR 0003 et de la spec § 3.1 : (5) lire un
Shapefile dans un zip, (6) trouver un `.qml` dans un zip, (7) lire un GeoTIFF de 200 Mo rangé
sans compression, (8) choisir un fichier sous Android 11 et plus, (9) lire des noms accentués
d'un zip Windows (CP437). Les réponses décident de l'architecture (spec § 9, n° 1, 2 et 6 ;
ADR 0003 et 0005).

**Comment remplir.** Pour chaque geste : le faire, regarder, puis cocher `☐` en `☒` si le
résultat attendu est vu tel quel. Un résultat différent se note dans « Vu autrement », jamais
dans la case. Une case non cochée veut dire non.

## Avant de commencer

| À noter | Valeur |
|---|---|
| Date de l'essai | |
| Appareil (modèle Samsung) | |
| Version d'Android (la question 8 n'a de sens qu'à partir de la 11) | |
| Version de QField | |
| Prototype installé (version ou commit) | |
| `cerf_id` du projet d'essai (voir ci-dessous) | |
| Projet d'essai choisi par Pascal (`cerf-essai` ou `cerf.qgz`) | |

**Avant le mode avion : télécharger les zips d'essai** depuis la release `prototype-1` :
`essai.zip` (https://github.com/pobsteta/cerf/releases/download/prototype-1/essai.zip) et
`essai-cp437.zip` (https://github.com/pobsteta/cerf/releases/download/prototype-1/essai-cp437.zip).

**Le plugin** `cerf-prototype.zip`, à installer par URL dans QField
(https://github.com/pobsteta/cerf/releases/download/prototype-1/cerf-prototype.zip), et le
projet `cerf-essai.zip`
(https://github.com/pobsteta/cerf/releases/download/prototype-1/cerf-essai.zip), même release.

**Le projet d'essai** est `cerf-essai` (`cerf_id` 936eb144-5447-4094-a579-fac12a9f0595) ou,
au choix de Pascal, le projet modèle `cerf.qgz`
(https://github.com/pobsteta/cerf/releases/download/prototype-1/cerf-projet-modele.zip,
`cerf_id` ebad8ff8-577e-48bc-9489-6bab871230c2).

**Permission de stockage.** Au premier toucher de « A. Copier hors projet » ou de « B. Copier
dans le projet », le prototype peut demander une permission de stockage d'Android : l'accepter,
et l'écrire dans « Vu autrement ».

**Fichiers à copier sur le téléphone** (par câble ou par le moyen habituel de Pascal,
**avant** de passer en mode avion), tous **hors du dossier projet** :

| Fichier | Taille | Entrées | Où il est |
|---|---|---|---|
| `essai.zip` | 2108 octets | **9** | `tests/recette/essai/essai.zip` |
| `essai-cp437.zip` | 181 octets | **1** | `tests/recette/essai/essai-cp437.zip` |
| `lourd.zip` | 199996542 octets | **1** | fabriqué, **non versé au dépôt** : voir ci-dessous |

**`module-essai.mjs` n'est pas copié sur le téléphone** : il est **embarqué par le
prototype** (la mission 004 le range dans le plugin). Le fichier
`tests/recette/essai/module-essai.mjs` est la référence : le prototype embarque ce
fichier-là, sans le modifier.

**Fabriquer `lourd.zip`** (sur le poste, pas sur le téléphone) :
`node tests/recette/essai/fabriquer-geotiff-lourd.mjs <dossier-de-sortie>`. Il écrit
`lourd.zip` : une entrée, `lourd.tif`, un GeoTIFF de **199996426 octets** (14142 x 14142
pixels, 8 bits, une bande), **rangé sans compression** (méthode 0, comme `zip -0`),
géoréférencé en Lambert 93 (EPSG:2154), pixel de 5 m. « 200 Mo » s'entend ici à 10^6 octets
le mégaoctet. Les pixels sont à 0 : le raster est noir, sans valeur.

**Contenu attendu de `essai.zip`** (9 entrées, noms exacts) :
`points_essai.geojson`, `sous-dossier/notes.txt`, `sous-dossier/shape_essai.cpg`,
`sous-dossier/shape_essai.dbf`, `sous-dossier/shape_essai.prj`,
`sous-dossier/shape_essai.qml`, `sous-dossier/shape_essai.qmd`,
`sous-dossier/shape_essai.shp`, `sous-dossier/shape_essai.shx`.

**Contenu attendu de `essai-cp437.zip`** (1 entrée) : `forêt/parcelle_é.txt`, nom écrit
en CP437 (ê = octet 0x88, é = octet 0x82), sans le drapeau UTF-8 du zip, comme le fait
l'explorateur Windows.

**Les données d'essai sont fictives** (un point près de Paris, sans valeur métier). Le
GeoJSON est en WGS84 (`crs` CRS84), longitude 2,35 puis latitude 48,85. Le Shapefile
`shape_essai` est **le même point en Lambert 93** : X = 652301,56 et Y = 6861302,73, avec un
`.prj` Lambert 93 (EPSG:2154).

**Où Pascal lit `cerf_id`.** `cerf_id` est la variable de projet de `cerf.qgz` (spec § 3.3) :
Pascal la lit sur le poste, dans QGIS, onglet Variables des propriétés du projet. Le projet
d'essai (`cerf-essai` ou `cerf.qgz`) en porte une. **Le prototype affiche la valeur
qu'il lit** ; les chemins du protocole contiennent cette valeur. Pascal compare la valeur
affichée à celle de QGIS et la note dans le tableau ci-dessus.

- Passer le téléphone en **mode avion** : tout le protocole se fait sans réseau.
- Ouvrir le projet d'essai choisi par Pascal : `cerf-essai` ou `cerf.qgz` (voir plus haut).

**Chemin de secours.** Si « C. Lister la copie » affiche « taille de la copie inconnue », les
questions 1, 2, 3, 8 et 9 listent par « I. Essai à risque : lister un gros zip » au lieu de C.
Avant de confirmer le second toucher de I, Pascal vérifie que la ligne « Copie visée » nomme le
petit zip, jamais `lourd.zip`. Il note ce passage par I dans « Vu autrement ».

## Question 1 — Le plugin peut-il lister le contenu d'un zip ?

**Question reformulée (décision de Pascal du 2 novembre 2026).** Sous Android 11 et plus, le
plugin ne voit jamais le fichier d'origine, seulement la copie faite par le sélecteur de
fichiers. La question porte donc sur le **listage de la copie** : hors du dossier projet par
« A. Copier hors projet », puis dans le dossier projet par « B. Copier dans le projet ».

| N° | Geste | Résultat attendu | Vu |
|---|---|---|---|
| 1 | Toucher « A. Copier hors projet », choisir `essai.zip` dans le sélecteur de fichiers d'Android, le zip étant **hors du dossier projet** (par exemple Téléchargements). | Le sélecteur s'ouvre et le choix est accepté, sans message d'erreur. | ☐ |
| 2 | Toucher « C. Lister la copie », puis lire la liste affichée par le prototype. | Exactement 9 entrées, avec les noms de la liste ci-dessus, sous-dossier compris. | ☐ |
| 3 | Toucher « B. Copier dans le projet », choisir de nouveau `essai.zip` (la copie est faite **dans** le dossier du projet), puis « C. Lister la copie ». | La même liste de 9 entrées s'affiche. | ☐ |

**Si non** au geste 2 (zip hors du dossier projet non listé) : le zip sera posé dans le
dossier projet, sans QFieldCloud, et l'on demandera à QField d'exposer le listage d'un zip
aux plugins (spec § 9, n° 1). Le geste 3 dit si ce repli marche.

**Vu autrement :**

## Question 2 — Le plugin peut-il copier le zip hors du dossier projet ?

| N° | Geste | Résultat attendu | Vu |
|---|---|---|---|
| 1 | Toucher « A. Copier hors projet » pour `essai.zip` (celui du geste 1 de la question 1). | Le prototype annonce la copie faite, sans message d'erreur. | ☐ |
| 2 | Lire le chemin de la copie affiché par le prototype, et la valeur de `cerf_id` qu'il affiche (voir « Où Pascal lit `cerf_id` »). | Le chemin est `Imported Datasets/cerf/<cerf_id>/essai.zip`, sous le dossier de l'application, **hors du dossier projet**, et `<cerf_id>` est la valeur notée plus haut. | ☐ |
| 3 | Lire la taille de la copie affichée par le prototype. | 2108 octets, la même que `essai.zip` d'origine. | ☐ |
| 4 | Avec « C. Lister la copie », **lister la copie** (le fichier du chemin lu au geste 2, pas l'original). | Les mêmes 9 entrées s'affichent, et le prototype dit qu'il les lit dans la copie. | ☐ |

**Si non** : la copie hors du dossier projet est impossible ; le zip est posé dans le dossier
projet, sans QFieldCloud (spec § 9, n° 1, ADR 0003).

**Vu autrement :**

## Question 3 — Le plugin peut-il effacer un .zip ?

| N° | Geste | Résultat attendu | Vu |
|---|---|---|---|
| 1 | Avec « D. Effacer la copie », effacer la **copie** de `essai.zip` faite à la question 2 (jamais l'original). | Le prototype annonce l'effacement fait, sans message d'erreur. | ☐ |
| 2 | **Lister la copie** de nouveau avec « C. Lister la copie » (même geste que le geste 4 de la question 2). | Le prototype dit « zip absent » ou ne trouve plus le fichier ; aucune entrée n'est listée. | ☐ |
| 3 | Dans le gestionnaire de fichiers d'Android, regarder l'original de `essai.zip`. | L'original est toujours là, intact. | ☐ |

**Si non** au geste 1 ou 2 (effacement d'un `.zip` refusé, comme le fait `FileUtils.deleteFiles`
d'après l'ADR 0003) : la copie reste sur l'appareil et son nom est affiché (spec § 9, n° 2) ;
valeur sacrifiée : la place.

**Vu autrement :**

## Question 4 — Un module .mjs se charge-t-il dans QField ?

`module-essai.mjs` est **embarqué par le prototype** : Pascal n'a rien à copier.

| N° | Geste | Résultat attendu | Vu |
|---|---|---|---|
| 1 | Toucher « E. Module .mjs », qui appelle le module embarqué. | Aucune erreur de chargement n'est affichée. | ☐ |
| 2 | Lire le résultat de `somme(2, 3)` affiché par le prototype. | `5`. | ☐ |
| 3 | Lire la valeur de `SIGNATURE` affichée par le prototype. | `cerf-prototype-1`. | ☐ |

**Si non** : la logique du plugin ne peut pas être partagée avec Node sous cette forme, et la
pile de tests de l'ADR 0005 est à reprendre avec Pascal.

**Hors du Samsung** (rien à faire pour Pascal) : l'import du même module par Node et les
tests de `tests/protocole-prototype.test.mjs` passent par `.claude/test-command`, lancée
par l'orchestrateur.

**Vu autrement :**

## Question 5 — Un Shapefile se lit-il dans le zip ?

À faire sur la **copie** de `essai.zip` (question 2), donc avant l'effacement de la
question 3 ; sinon recopier le zip avec « A. Copier hors projet ».

| N° | Geste | Résultat attendu | Vu |
|---|---|---|---|
| 1 | Avec « F. Ouvrir les couches du zip », ouvrir `sous-dossier/shape_essai.shp` **dans** le zip (lecture par `/vsizip/`, sans décompresser). | La couche s'ouvre, sans message d'erreur. | ☐ |
| 2 | Lire le nombre d'objets affiché par le prototype. | 1. | ☐ |
| 3 | Lire le système de coordonnées affiché. | EPSG:2154 (Lambert 93). | ☐ |
| 4 | Lire la position du point affichée, en mètres. | X = 652301,56 et Y = 6861302,73, à 1 m près. | ☐ |

**Si non** : la lecture d'un Shapefile dans le zip est à reprendre ; l'ADR 0003 cite la
décompression (aucune API QML prouvée) ; la décision reste à Pascal.

**Vu autrement :**

## Question 6 — Un .qml se trouve-t-il et se lit-il dans le zip ?

| N° | Geste | Résultat attendu | Vu |
|---|---|---|---|
| 1 | Si la copie de `essai.zip` n'est pas la copie en cours, la refaire avec « A. Copier hors projet ». Puis **lister la copie** avec « C. Lister la copie » (ou « I. Essai à risque : lister un gros zip » par le chemin de secours) : « G » refuse tant que la copie en cours n'a pas été listée (« Lister d'abord la copie »). | La liste de 9 entrées s'affiche. | ☐ |
| 2 | Avec « G. Trouver le .qml du zip », chercher `sous-dossier/shape_essai.qml` **dans** la copie du zip (même nom que la couche de la question 5). | Le prototype annonce qu'il l'a trouvé, sans message d'erreur ; il affiche la taille et le début du texte. | ☐ |
| 3 | Lire la taille et le début du texte affichés. | 635 octets (taille annoncée par le zip) ; le début du texte affiche « EN ATTENTE » (le prototype n'a pas de décompresseur) ; s'il est affiché, il commence par `<!DOCTYPE qgis>`. | ☐ |
| 4 | Lire la couleur du symbole affichée. | « EN ATTENTE » (pas de décompresseur) ; si le texte est lu, `255,0,0,255` (rouge). | ☐ |

**Si non** : la surcharge d'un style par un `.qml` posé dans le zip (spec § 5) n'est pas
possible telle quelle ; la décision reste à Pascal.

**Vu autrement :**

## Question 7 — Un GeoTIFF de 200 Mo, rangé sans compression, se lit-il dans le zip ?

Avant ce geste, `lourd.zip` est sur le téléphone, hors du dossier projet (voir « Avant de
commencer »).

**Cette question se fait en tout dernier, après les questions 8 et 9** : « I » peut fermer
QField, et chaque « A » des questions 8 et 9 remplace la copie en cours. Si QField s'est fermé,
le rouvrir et refaire le geste 1 avant le geste 3.

| N° | Geste | Résultat attendu | Vu |
|---|---|---|---|
| 1 | Toucher « A. Copier hors projet » et choisir `lourd.zip`, puis **vérifier que la ligne « Copie visée » nomme `lourd.zip`** (et non `essai-cp437.zip`, copie en cours des questions 8 et 9). | La copie est annoncée faite ; sa taille affichée est de 199996542 octets ; « Copie visée » nomme `lourd.zip`. | ☐ |
| 2 | Toucher « I. Essai à risque : lister un gros zip » **deux fois** (« C. Lister la copie » refuse un gros zip) ; avant le second toucher, relire « Copie visée » : `lourd.zip`. **QField peut se fermer.** | 1 entrée, `lourd.tif`, de 199996426 octets. | ☐ |
| 3 | Toucher « H. Ouvrir le GeoTIFF du zip » : ouvrir `lourd.tif` **dans** le zip (lecture par `/vsizip/`) et chronométrer, du toucher au résultat affiché. | La couche s'ouvre : système EPSG:2154, **emprise de 70710 m × 70710 m** (14142 pixels de 5 m), coin bas-gauche et temps d'ouverture affichés. Le prototype n'affiche **pas** la taille en pixels (« non lisible depuis QML ») : l'emprise la remplace (`prototype/PLAN.md` § 4 et § 10 bis), à noter dans « Vu autrement ». **Noter le temps :** ______ s. | ☐ |
| 4 | **Après I**, toucher « D. Effacer la copie » pour la copie de `lourd.zip` (comme à la question 3). | Effacement annoncé ; la place est rendue. | ☐ |

**Si non** au geste 3, ou temps jugé trop long par Pascal : l'ADR 0003 prévoit de décompresser
les seuls GeoTIFF (valeur sacrifiée : vitesse sur les gros rasters). **Aucun seuil de temps n'est
fixé par la spec** (§ 6 n° 7 : « temps d'affichage mesuré et noté ») : le temps est noté, et
son maximum sera fixé après l'essai (voir « Décisions de Pascal »).

**Vu autrement :**

## Question 8 — Le sélecteur de fichiers marche-t-il sous Android 11 et plus ?

Cette question ne se coche que si la version d'Android notée plus haut est **11 ou plus**.
Sinon, laisser les cases vides et l'écrire dans « Vu autrement » : elle reste sans réponse.
Le choix d'un **dossier** n'est pas essayé : la spec § 3.1 ne le retient pas en tranche 1.

| N° | Geste | Résultat attendu | Vu |
|---|---|---|---|
| 1 | Avec « A. Copier hors projet », ouvrir le sélecteur de fichiers d'Android et choisir `essai.zip` dans **Téléchargements**, puis « C. Lister la copie ». | Le fichier est accepté ; le prototype le liste (9 entrées), sans message d'erreur. | ☐ |
| 2 | Poser `essai.zip` dans **Documents**, le choisir depuis ce dossier avec « A. Copier hors projet », puis « C. Lister la copie ». | Le fichier est accepté ; le prototype le liste (9 entrées), sans message d'erreur. | ☐ |

**Si non** : le choix d'un fichier est à reprendre ; la décision reste à Pascal (spec § 3.1,
ADR 0003).

**Vu autrement :**

## Question 9 — Les noms accentués d'un zip Windows (CP437) se lisent-ils ?

| N° | Geste | Résultat attendu | Vu |
|---|---|---|---|
| 1 | Toucher « A. Copier hors projet », choisir `essai-cp437.zip`, puis « C. Lister la copie ». | Le zip est lu, sans message d'erreur ; exactement 1 entrée. | ☐ |
| 2 | Lire le nom de l'entrée affichée. | `forêt/parcelle_é.txt`, avec ses deux accents, sans caractère étrange. | ☐ |

**Si non** au geste 2 : la notice conseillera un zip fait par QGIS ou 7-Zip (spec § 3.1).
Noter dans « Vu autrement » le nom tel qu'affiché.

*Limite :* `essai-cp437.zip` est fabriqué par un script
(`tests/recette/essai/fabriquer-essais.mjs`) qui écrit les noms en CP437 ; il n'est pas fait
par l'explorateur Windows lui-même. Pascal peut refaire l'essai avec un zip de l'explorateur
Windows et l'écrire dans « Vu autrement ».

**Vu autrement :**

## Réponse de Pascal

| Question | Oui, toutes les cases cochées | Non ou en partie |
|---|---|---|
| 1. Lister un zip hors du dossier projet | ☐ | ☐ |
| 2. Copier hors du dossier projet | ☐ | ☐ |
| 3. Effacer un .zip | ☐ | ☐ |
| 4. Module .mjs dans QField | ☐ | ☐ |
| 5. Shapefile lu dans le zip | ☐ | ☐ |
| 6. `.qml` lu dans le zip | ☐ | ☐ |
| 7. GeoTIFF de 200 Mo dans le zip | ☐ | ☐ |
| 8. Sélecteur de fichiers, Android 11 et plus | ☐ | ☐ |
| 9. Noms accentués CP437 | ☐ | ☐ |

Chaque « non » applique la ligne « Si non » de sa question ; la décision reste à Pascal.

## Décisions de Pascal (2 novembre 2026)

Décisions prises par Pascal le 2 novembre 2026 sur l'aller-retour 1/3 (source : la fiche
`pilotage/missions/003-protocole-prototype.md`). Elles remplacent les anciennes « Questions à
Pascal ».

1. **Critère de réussite.** Le prototype est jugé sur les **questions 1 à 4** (lister, copier,
   effacer, module `.mjs`). Les questions 5 à 9 sont **notées sans bloquer**.
2. **Temps du GeoTIFF de 200 Mo** (question 7, geste 3) : **mesuré et noté**. Le temps
   maximal sera fixé **après l'essai**, par Pascal ; il n'est pas fixé à ce jour.
3. **Tolérance de 1 m** sur la position du point d'essai (question 5, geste 4) : **gardée**.
4. **Zip d'essai** de 2108 octets et **plafond du test à 4096 octets** : acceptés (pris acte).

## Sources des valeurs

- **`.prj` Lambert 93** : export WKT1 ESRI de EPSG:2154, tel que donné par **pyproj 3.8.0**
  (PROJ 9.8.1, base EPSG **v12.029 du 2025-10-02**), installé depuis PyPI par `pip` et
  consulté le **2 novembre 2026** (`CRS.from_epsg(2154).to_wkt(version='WKT1_ESRI')`). Les
  pages `spatialreference.org` et `epsg.io` ont été essayées et refusées par le réseau de la
  session (403) : **non lues**. Aucune URL de page n'a donc été lue ; la source est la base
  EPSG embarquée dans pyproj.
- **Position du point en Lambert 93** : X = 652301,56 et Y = 6861302,73, transformation de
  (2,35 ; 48,85) de EPSG:4326 vers EPSG:2154 par pyproj 3.8.0 (PROJ 9.8.1), le 2 novembre
  2026, arrondie au centimètre.
- **Lecture des fichiers d'essai** : relus le 2 novembre 2026 avec GDAL 3.12.2 (rasterio
  1.5.2, pyogrio) : le Shapefile sort en EPSG:2154 avec 1 objet à la position ci-dessus ; le
  GeoTIFF de `lourd.zip`, lu par `/vsizip/`, sort en EPSG:2154, 14142 x 14142 pixels, 1 bande
  8 bits. Cette relecture est faite **sur le poste, avec GDAL, pas dans QField** : elle ne
  prouve rien sur le téléphone.
- **Tailles et décomptes** : `unzip -l`, relancé le 2 novembre 2026 sur `essai.zip` (9
  entrées, 2108 octets) et `essai-cp437.zip` (1 entrée, 181 octets) ; sortie de
  `fabriquer-geotiff-lourd.mjs` pour `lourd.zip`, relancé le 2 novembre 2026.
- **Le reste** : `docs/spec.md` (§ 3.1, § 3.3, § 5, § 6 n° 7, § 9), ADR 0003 (« À prototyper »,
  « Valeurs sacrifiées »), ADR 0005, dans l'état du commit de départ `e6ff190`.

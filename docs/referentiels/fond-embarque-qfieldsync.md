# Fond embarqué IGN fabriqué par QFieldSync (« base map »)

- **Propriétaire :** Pascal Obstétar. Rédigé par l'`acquereur` (mission 046, étape 1).
- **Décision éclairée :** quelle voie (A, B ou C, § 7) choisir pour livrer un fond IGN lisible sans réseau
  dans `cerf.qgz`, sans casser `cerf_id`, `cerf-imports/`, le registre ni `saisie.gpkg` (ADR 0002, spec § 3.3 à 3.5 et § 9 n° 5).
- **Date de consultation :** 5 novembre 2026.
- **Sources lues :**
  - code de `opengisch/libqfieldsync`, branche `master` (`raw.githubusercontent.com`), fichiers
    `libqfieldsync/offline_converter.py`, `libqfieldsync/project.py`, `libqfieldsync/layer.py`, `libqfieldsync/utils/qgis.py` ;
  - code de `opengisch/qfieldsync`, branche `master` : `qfieldsync/gui/package_dialog.py`,
    `qfieldsync/ui/project_configuration_widget.ui`, `qfieldsync/metadata.txt`.
  - **Version : non épinglée.** `metadata.txt` donne `version=dev`, `qgisMinimumVersion=3.40`. Le SHA du commit n'est
    pas obtenu (`api.github.com` répond 403 ; `github.com` injoignable). `main` n'existe pas (404). Le code lu est
    donc « `master` au 5 novembre 2026 », pas une version publiée. **Le plugin que Pascal installera depuis le
    dépôt de plugins QGIS peut être plus ancien** (voir § 1, écart `baseMapMupp`).
  - documentation : `docs.qfield.org` et `qfield.org` injoignables (échec de résolution). Seul recours : l'extrait renvoyé par
    une recherche web (pages « get started qfs » de docs.qfield.org et page marquée « Outdated documentation » de
    qfield.org/docs/synchronise/basemaps.html), **non lues en entier**.
- **Limites :** les outils de lecture résument le code (ils ne donnent ni numéros de ligne ni fichier complet) ; les
  citations entre guillemets sont celles qu'ils ont renvoyées, je cite la fonction plutôt que la ligne.
  Aucun essai d'exécution (ni QGIS ni QFieldSync dans le conteneur). Ce qui est déduit et non lu est marqué « (déduit) ».

## 1. Comment QFieldSync fabrique le fond

**Propriétés de projet** (`project.py`, classe `ProjectConfig`, préfixe `qfieldsync` ; défauts du code) :

| Clé | Défaut | Rôle |
|---|---|---|
| `/createBaseMap` | `False` | active le fond |
| `/baseMapType` | `singleLayer` (autre valeur : `mapTheme`) | une couche, ou un thème de carte |
| `/baseMapTheme` | aucun | nom du thème de carte |
| `/baseMapLayer` | aucun | identifiant de la couche (mode une couche) |
| `/baseMapTileSize` | `1024` (l'interface propose 256, 512, 1024) | taille de tuile en pixels |
| `/baseMapTilesMinZoomLevel` | `14` | zoom min |
| `/baseMapTilesMaxZoomLevel` | `14` | zoom max |
| `/offlineCopyOnlyAoi` | `False` | limite aussi la copie hors ligne des vecteurs à l'emprise |
| `/areaOfInterest`, `/areaOfInterestCrs` | aucun | emprise en WKT et son système |
| `/layerActionPreference`, `/mapThemesActiveLayers` | — | actions par couche, couches actives par thème |

Écrits dans le `.qgs` sous `<properties><qfieldsync>…` (déduit de la convention `QgsProject.writeEntry`, non lu).
**Écart avec la fiche :** `baseMapMupp` **n'existe pas** dans `master` : il y a `baseMapTileSize` + zooms min/max.
L'extrait de l'ancienne documentation (« Outdated documentation ») parle d'une taille « en unités de carte par pixel » :
c'est l'ancien réglage (mupp), remplacé. Une version plus ancienne du plugin, si Pascal en installe une, aura une autre
interface. **À vérifier à l'installation :** l'écran « Base Map » doit montrer « Tiles min zoom level » et « Tiles max zoom level ».

**Interface** (`project_configuration_widget.ui`) : groupe « Base Map », « A raster base map can be generated when triggering a
cable packaging process. The generated raster will cover the project's full extent or the customized area of interest
defined above. » ; boutons « Single layer » / « Map theme » ; champs « Map Theme », « Layer », « Tile size »,
« Tiles min zoom level », « Tiles max zoom level » (info-bulle : « …minimum zoom level of the basemap tiles (mbtiles format),
generated during cable export »). La documentation (extrait de recherche) confirme : défaut 14, plus haut = plus de
place et de temps d'export ; le fond est une couche raster ajoutée **tout en bas** du projet empaqueté.

**Algorithme** (`offline_converter.py`) : `_convert()` appelle `_export_basemap()` si `create_basemap` (paramètre de l'export)
**et** `create_base_map` (propriété) sont vrais. Deux cas :
- *une couche* : le code cherche `project.mapLayer(base_map_layer)`, la clone, et reprojette l'emprise de l'AOI dans le système de la couche ;
- *thème* : il écrit le projet dans un `.qgz` temporaire (non supprimé), le relit, applique le thème (`applyTheme`) sur le clone.

Puis `_export_basemap_as_mbtiles` lance l'algorithme de traitement **`native:tilesxyzmbtiles`** (QGIS « Generate XYZ tiles (MBTiles) »)
avec `EXTENT` (emprise de l'AOI), `ZOOM_MIN`, `ZOOM_MAX`, `TILE_SIZE`. Je n'ai pas vu de paramètre de format
(PNG/JPEG) ni de qualité passé : l'algorithme prend alors ses valeurs par défaut (PNG, d'après ma connaissance de QGIS, non lu ici).
Rendu **Web Mercator** (déduit de l'algorithme XYZ), pas Lambert 93.

**Sortie :** un fichier **MBTiles** (SQLite de tuiles ; ce n'est **pas un GeoPackage raster**), nommé **`basemap.mbtiles`**
(`self._export_filename.with_name("basemap.mbtiles")`, supprimé s'il existe), à côté du projet empaqueté. Déclaré dans le projet :
`QgsRasterLayer(results["OUTPUT_FILE"], "Basemap")`, puis `addMapLayer(..., False)` et
`layer_tree.insertLayer(len(layer_tree.children()), new_layer)` : couche nommée **« Basemap »**, **en bas de l'arbre**, à la racine.
Chemin relatif ou absolu dans le `.qgs` : non lu (QGIS écrit des chemins relatifs par défaut, déduit ; à vérifier sur un paquet réel).
La couche « Basemap » n'entre pas dans la boucle de copie des couches (la liste est prise avant). Échec : avertissement
« Failed to create basemap » ; il faut le module Processing.

## 2. Ce que « Package for QField » fait au reste du projet

Constats du code (`offline_converter.py`, `layer.py`, `package_dialog.py`) :

| Question de la fiche | Constat | Source |
|---|---|---|
| Copie du projet ? | Le projet est **écrit** (`QgsProject.write`) sous un autre nom : le paquet propose `<nom du projet>_qfield.qgz` (filtre `*.qgz, *.qgs`). Il ne remplace pas le projet source. | `package_dialog.py` |
| Variables de projet (`cerf_id`) | Le code ne les traite pas explicitement ; le projet est réécrit tel quel avec ses propriétés, donc `cerf_id` **reste** (déduit, **à vérifier sur un paquet réel** : ouvrir le `.qgz` produit, Propriétés > Variables). | `offline_converter.py` (absence de traitement) |
| Couches XYZ | Une couche non fichier (WMS, XYZ…) a l'action par défaut **`NO_ACTION`** : gardée **en ligne**, intacte. Le code ne nomme pas XYZ. Si l'agent a choisi un thème pour le fond, les couches du thème peuvent être retirées du paquet (documentation, extrait). | `layer.py` `default_action` ; doc (extrait) |
| Couche « Saisie terrain » (`saisie.gpkg`) | Fichier GeoPackage vecteur : action par défaut **`COPY`** (fichier copié, source repointée). La conversion « hors ligne » (`data.gpkg`, `QgsOfflineEditing`) n'a lieu que pour l'action `OFFLINE` (par défaut : couches PostgreSQL). Un GeoPackage déjà GPKG est copié tel quel. **Le `saisie.gpkg` copié est celui de l'ordinateur, vide.** | `layer.py`, `offline_converter.py` |
| Emprise | `areaOfInterest` du projet, sinon emprise courante du canevas (`mapCanvas().extent()`), système du projet. Sert au fond ; aux vecteurs seulement si `offlineCopyOnlyAoi`. | `package_dialog.py`, `offline_converter.py` |
| Dossier de sortie | Dossier d'export du plugin (préférences `exportDirectoryProject` / `exportDirectory`) ; `mkdir(parents=True)`. Contient `*.qgz`, `basemap.mbtiles`, les copies de couches (+ `data.gpkg` si hors ligne), pièces jointes. | `package_dialog.py`, `offline_converter.py` |
| Couches ECW | Retirées (non supportées). | `layer.py` |

Deuxième source : la documentation (extrait) concorde sur « fond = couche raster tout en bas du paquet » et sur le défaut de zoom 14.
Elle n'a pas pu être lue pour le détail de « Package for QField » (copie / hors ligne).

## 3. Conséquences pour Cerf

1. **Le paquet remplace-t-il `cerf.qgz` ?** Pas par lui-même : il produit **un autre projet** (`<nom>_qfield.qgz`) dans un autre dossier, à copier
   sur l'appareil par câble. Mais il contient un `saisie.gpkg` **vide** : le copier sur celui de l'appareil **écraserait les points saisis**
   (spec § 3.5 : la mise à jour ne doit pas écraser `saisie.gpkg`). Le nom du projet change aussi (`_qfield`), alors que la spec veut « un seul `cerf.qgz` par appareil » :
   il faudrait renommer ou exporter sous le nom `cerf.qgz`.
2. **`cerf-imports/` et registre.** Le registre est dans les réglages de QField, clé `cerf/<cerf_id>` ; les copies sont dans
   `<dossier du projet>/cerf-imports/`. Un paquet copié dans un **nouveau** dossier garde `cerf_id` (à vérifier) mais n'a **pas** `cerf-imports/` : le registre
   renvoie « copie absente (réimporter le zip) » pour tous les vecteurs. Copié **sur** le dossier existant : les fichiers hors paquet restent
   (`cerf-imports/` n'est pas dans le paquet), mais `saisie.gpkg` et `cerf.qgz` sont écrasés. La voie A est donc la plus risquée pour les
   données déjà en place.
3. **Livrer seulement le fond ?** Le code le permet : `basemap.mbtiles` est un fichier autonome, produit à côté du projet empaqueté,
   sans dépendance à celui-ci. Il peut être copié à côté de `cerf.qgz` et déclaré d'avance dans le projet modèle comme couche raster
   (source relative `./basemap.mbtiles`, comme `saisie.gpkg`, spec § 3.5). **Non vérifié** (rien dans le code ni la doc lue) :
   comportement de QField quand le fichier est **absent** à l'ouverture (couche invalide au premier lancement, message ?), et lecture d'un MBTiles
   hors du dossier du projet : il sera **dans** le dossier du projet, ce qui respecte la limite vue avec QField 4.3.7 (spec § 3.3).
   À essayer sur le Samsung.
4. Le fond est produit à partir du projet **QGIS de l'ordinateur** : il faut que les couches IGN y soient lisibles avec réseau (XYZ du projet modèle, ADR 0002)
   et que la couche ou le thème soit choisi dans « Base Map ». Le thème « Fond embarqué » prévu à l'étape 2 sert à cela.

## 4. Taille et résolution

- **Résolution par niveau** (formule Web Mercator, ma propre arithmétique : 156 543 m/px à l'équateur ÷ 2^z × cos(latitude), tuiles de 256 px ; latitude 47° ; en Corse, 42° : +9 %).

  | Zoom | m/pixel à 47° | Tuiles 256 px pour 10 km × 10 km |
  |---|---|---|
  | 15 | 3,26 | ≈ 144 |
  | 16 | 1,63 | ≈ 580 |
  | 17 | 0,81 | ≈ 2 300 |
  | 18 | 0,41 | ≈ 9 200 |
  | 19 | 0,20 | ≈ 36 900 |

  Chaque niveau en plus **multiplie par 4** le nombre de tuiles ; les niveaux inférieurs ajoutent environ un tiers au total (pyramide).
  Les « aperçus » sont donc inclus par construction (un MBTiles contient tous les zooms de `ZOOM_MIN` à `ZOOM_MAX`).
  **Réserve :** avec `TILE_SIZE` 512 ou 1024, le lien entre niveau de zoom et mètres par pixel n'est pas lu dans le code (déduit : QGIS
  garde la grille XYZ standard et assemble les pixels ; à vérifier sur un essai).
- **Taille estimée** (ordre de grandeur, **mon calcul**, pas une mesure de QFieldSync) à partir des tuiles mesurées par la mission 001
  (`docs/referentiels/fonds-ign.md`, § 1 et § 2 : Plan IGN v2 PNG 15 474 octets au zoom 19 ; 41 112 octets au zoom 15 ; BD ORTHO JPEG 11 065 octets au zoom 19, en un seul point) :
  - Plan IGN, zoom 19 : 36 900 × ~15 Ko ≈ 550 Mo, × 4/3 ≈ **700 Mo** : retrouve le chiffre de JFC (700 Mo, niveau inconnu) ; **hypothèse : JFC a utilisé le zoom 19**, à lui demander.
  - Plan IGN, zoom 17 : ≈ 2 300 × 15-40 Ko ≈ 35-90 Mo ; zoom 18 : ≈ 140-370 Mo.
  - BD ORTHO : une tuile rastérisée par QGIS est écrite en PNG par défaut (déduit), bien plus lourde que le JPEG de 11 Ko du serveur
    (ordre de 100 Ko, **non mesuré**) : zoom 17 ≈ 200 Mo, zoom 19 ≈ plusieurs Go. Un seul point mesuré : prendre ces chiffres comme des ordres de grandeur.
- **Résolution conseillée** : la documentation donne 14 comme défaut (environ 9,9 m/px à 47° : trop grossier pour une UT). Le choix
  réel est **zoom 17** (0,8 m/px) ou **18** (0,4 m/px) pour la forêt ; le **zoom 19** est la limite de la Géoplateforme (ADR 0002) et coûte 4 fois le 18.
  Décision de Pascal ; à régler en fonction du cadastre superposé et du critère « moins de 5 m du fond IGN » (brief).
- **QField lit-il un MBTiles de cette taille ?** Rien de lu ne le dit (ni code, ni doc accessible). Le plugin QFieldSync le produit pour QField
  précisément (info-bulle : « mbtiles format, generated during cable export »), ce qui indique un usage prévu, mais **aucune limite de taille**
  n'est documentée dans mes sources. **À essayer** : un fichier de 700 Mo sur le Samsung (place disponible, temps d'ouverture, fluidité).
- **Temps de préparation :** non documenté ; proportionnel au nombre de tuiles (un rendu par tuile, avec téléchargement des tuiles XYZ IGN sur le réseau de l'ordinateur) : à noter lors de l'essai.

## 5. Licence : rasteriser Plan IGN v2 et le cadastre pour un usage hors ligne

**Non tranché par les sources. Les CGU de cartes.gouv.fr (`https://cartes.gouv.fr/cgu`) n'ont pas pu être lues** (hors des domaines joignables).
Ce qui est établi, par recoupement :
- Le GetCapabilities (mission 001) renvoie aux CGU : « Conditions Générales d'Utilisation disponibles ici : https://cartes.gouv.fr/cgu », frais `none`,
  aucune licence nommée (`docs/referentiels/fonds-ign.md` § 4). Source 1.
- Des résultats de recherche web (non lus en entier, non officiels pour certains) : l'IGN a ouvert ses données publiques au 1er janvier 2021 (BD ORTHO citée) ;
  le Plan IGN est présenté comme libre et gratuit, avec des métadonnées indiquant la Licence Ouverte 2.0 ; une réserve sur les cartes sous droit
  d'auteur (SCAN) ; un forum signale qu'Etalab ne s'applique pas partout à l'identique : lire les mentions de chaque produit. Source 2, faible.
- **Le cadastre n'est pas traité** : aucune source lue (la couche cadastre n'est pas dans le projet modèle actuel ; son nom de couche Géoplateforme et sa licence sont à acquérir).
- **Aucune source lue ne parle du cas « rastériser des tuiles pour un usage hors ligne »**. Une Licence Ouverte autorise en général la reproduction et la
  réutilisation avec mention de la source (ma connaissance, non vérifiée ici) ; cela ne dispense pas de lire les CGU, qui peuvent fixer des conditions d'usage du **service de tuiles** (volume de requêtes : 37 000 tuiles à un zoom 19, c'est un moissonnage à petite échelle).
- Attribution « © IGN » : acquise (ADR 0002). Elle devra figurer aussi sur le fond embarqué.
- **À faire par Pascal avant la mise en œuvre : lire les CGU et, si doute, demander à l'IGN** ; pour l'ONF, le contexte « usage professionnel » peut jouer.

**Écart relevé entre sources :** l'ADR 0002 dit « MBTiles ou GeoPackage raster » ; le code de QFieldSync ne produit que du **MBTiles**.
Un GeoPackage raster demanderait un autre outil (QGIS : « Convertir en GeoPackage », ou GDAL).

## 6. Points non vérifiés (à essayer sur un vrai paquet)

1. `cerf_id` présent dans le `.qgz` empaqueté.
2. Chemin du MBTiles (relatif ou absolu) dans le `.qgs` produit, et lecture du MBTiles par QField 4.3.7 sur le Samsung.
3. QField et un projet qui déclare `./basemap.mbtiles` absent.
4. Version réelle de QFieldSync installée (clés `baseMapMupp` ou `baseMapTilesMaxZoomLevel` ?).
5. Taille et durée réelles pour l'UT de Pascal (zoom 17, 18).
6. CGU de cartes.gouv.fr ; licence et nom de couche du cadastre.

## 7. À trancher par Pascal

Rien n'est tranché ici. Trois voies.

### Voie A : le projet empaqueté par QFieldSync est copié sur l'appareil
- **Gestes sur PC (agent ou JFC) :** installer QFieldSync dans QGIS ; ouvrir `cerf.qgz` ; régler « Base Map » (thème « Fond embarqué », zoom min/max, taille de tuile) ; définir l'emprise de l'UT ; « Package for QField » ; obtenir un dossier avec `<nom>_qfield.qgz`, `basemap.mbtiles`, `saisie.gpkg` vide.
- **Gestes sur le Samsung :** copier le dossier par câble USB, sur l'ancien ou dans un autre ; renommer en `cerf.qgz` ; réimporter les zips.
- **Risques :** `saisie.gpkg` écrasé par un fichier vide (points perdus) ; `cerf-imports/` absent dans un nouveau dossier, donc « copie absente » pour chaque couche du registre ; deux projets sur l'appareil contre « un seul `cerf.qgz` » ; `cerf_id` à vérifier ; nom `_qfield` à corriger. Le plus de gestes, le plus de risques.
- **Taille :** fond + projet + `saisie.gpkg` ; fond seul de l'ordre de 35-90 Mo (Plan IGN, zoom 17) à ~700 Mo (zoom 19) ; ortho, plusieurs fois plus.

### Voie B : seul `basemap.mbtiles`, déposé à côté de `cerf.qgz`, déclaré d'avance dans le projet modèle
- **Gestes sur PC :** les mêmes jusqu'au paquet ; on ne garde que `basemap.mbtiles` (le reste du paquet est jeté).
- **Gestes sur le Samsung :** copier **un seul fichier** à côté de `cerf.qgz` (même dossier que `saisie.gpkg`), mode avion pour la vérification. Le projet modèle (étape 2, `outils/projet-modele.mjs`) déclare une couche raster `./basemap.mbtiles` sous le groupe « Fonds de carte ».
- **Risques :** `cerf.qgz`, `cerf_id`, `saisie.gpkg`, `cerf-imports/` et registre **non touchés** (aucun fichier existant écrasé, sauf un ancien `basemap.mbtiles`). Reste à vérifier : couche invalide tant que le fichier est absent (message de QField ?), un fond par UT sous le même nom à écraser, lecture par QField.
- **Taille :** celle du seul fichier (voir § 4).

### Voie C : autre, fond produit sans QFieldSync, même sortie MBTiles
- **Gestes sur PC :** dans QGIS, algorithme « Generate XYZ tiles (MBTiles) » directement (le même `native:tilesxyzmbtiles` que QFieldSync), sur l'emprise de l'UT, avec choix du format (JPEG pour l'ortho, plus léger : paramètre non lu ici, à confirmer) ; aucun plugin à installer. Ou un MBTiles tiers.
- **Gestes sur le Samsung :** ceux de la voie B.
- **Risques :** ceux de la voie B ; moins de préparation guidée que le bouton QFieldSync (la mission demande QFieldSync) ; mêmes questions de licence.
- **Taille :** comparable pour le Plan IGN ; plus petite pour l'ortho si JPEG (non mesuré).

**Questions préalables, à poser à Pascal :** zoom maximal voulu (17, 18 ou 19) ; ortho incluse ou Plan IGN seul ; cadastre en raster embarqué ou laissé en couche à part ;
CGU lues ; qui prépare le fond (l'agent ou JFC).

## 8. Trois points au sol

1. **Le paquet réel sur un PC :** produire un paquet de l'UT de Pascal et ouvrir le `.qgz` produit : `cerf_id` présent ? « Basemap » en bas ? chemin du MBTiles relatif ?
2. **Samsung, mode avion :** un `basemap.mbtiles` de ~100 Mo puis ~700 Mo à côté de `cerf.qgz` : s'ouvre-t-il, à quelle vitesse, et que dit QField si le fichier manque ?
3. **Résolution contre erreur de 5 m :** zoom 17 contre 18 sur un point de l'UT, avec le cadastre par-dessus : suffisant à l'œil sur tablette en plein soleil ?

## 9. Liste de contrôle

1. Sources et emplacements : **passée** pour le code (fichier et fonction, branche `master` ; pas de numéro de ligne ni de SHA : dit § en tête).
2. Décomptes : 5 questions de la fiche traitées (§ 1 à 5) ; 3 voies (A, B, C).
3. Termes exacts : clés recopiées du code ; **écart `baseMapMupp` signalé** ; cadastre non traité.
- **Non cochés :** version épinglée (aucune) ; documentation officielle lue en entier (injoignable) ; CGU non lues ; aucun essai sur paquet réel ; `.claude/test-command` non lancé (étude seule, aucun code).

**Question de contrôle :** quelle décision cette donnée va-t-elle éclairer ? Le choix, par Pascal, de la voie A, B ou C pour le fond embarqué de l'UT.

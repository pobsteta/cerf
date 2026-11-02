# Plan du prototype n° 1 (mission 004)

> Rédigé par le `dev` le 2 novembre 2026. **Plan seul : aucun code n'est écrit avant
> l'accord de Pascal** (mission tenue). Sources autorisées par la fiche : ADR 0001, 0003,
> 0005, 0006 ; `docs/spec.md` § 3.3 et § 9 ; protocole `tests/recette/prototype-1.md` ;
> code de QField. Rien n'est lu ni recopié de `qfield-layer-loader` ni de `qfield_addLayer`
> (ADR 0006).

## 1. La mission en une phrase

Construire un plugin QField jetable qui essaie, sur le Samsung de Pascal et hors réseau, de
lister un zip, de le copier dans `Imported Datasets/cerf/<cerf_id>/`, de l'effacer et de
charger un module `.mjs` aussi testé sous Node, pour que les « oui » ou « non » vus sur
l'appareil décident des replis de la spec § 9 (n° 1 et 2) et confirment ou non l'ADR 0005.

## 2. Version de référence du code lu

- **QField v4.3.7**, dernière version publiée, commit
  [`3fb12810b42654c6c45b39d669227d82a25f1fc8`](https://github.com/opengisch/QField/tree/3fb12810b42654c6c45b39d669227d82a25f1fc8)
  (24 octobre 2026). Lien d'une ligne :
  `https://github.com/opengisch/QField/blob/3fb12810b42654c6c45b39d669227d82a25f1fc8/<fichier>#L<n>`.
- **QGIS embarqué** par cette version : commit `3a92eb30c83d7d52751a330628d72b8eb9e64876`
  (QGIS 4.2), lu dans `vcpkg/ports/qgis/portfile.cmake`, ligne 1, de QField v4.3.7.
- Comparé à `master` de QField (commit `5623dde9a35e7759c8ff81a48f5a8fc0043dc9d1`,
  2 novembre 2026) : mêmes conclusions ; `master` ajoute `FileUtils.fileSize`, **absent de
  la v4.3.7** (voir § 4).
- Lu dans le code, pas essayé sur un appareil. **Rien de ce qui suit n'est prouvé sur le
  Samsung** : seul le protocole rempli par Pascal le prouvera.

## 3. Ce que le code de QField dit déjà (et qui change la donne)

1. **Lire les octets d'un fichier n'est permis que dans le dossier du projet.**
   `FileUtils.readFileContent` (seule lecture d'octets offerte à QML) refuse tout chemin
   hors du dossier projet : `src/core/utils/qffileutils.cpp` L620-628, contrôle par
   `isWithinProjectDirectory` L541-618. `getFileInfo` fait de même (L717). La lecture par
   requête web est fermée aussi : `QfXmlHttpRequest` refuse tout schéma autre que
   `http(s)`, donc `file://` (`src/core/qfxmlhttprequest.cpp` L279-287).
   **Aucune fonction QML ne liste le contenu d'un zip** (`QgsZipUtils::files` n'est appelée
   qu'en C++ : `qfpluginmanager.cpp` L442, `qfappinterface.cpp` L536).
   → Pour lister, le plugin lit les octets du zip et lit lui-même le répertoire central
   (module `.mjs`, testé sous Node). **Cela ne marche que si le zip est dans le dossier
   projet.** Prévision tirée du code : question 1 geste 2 et question 2 geste 4 → **non** ;
   question 1 geste 3 → oui. C'est le cas prévu par la spec § 9, n° 1.
2. **GDAL, lui, lit partout.** `LayerUtils.loadVectorLayer` et `loadRasterLayer` créent la
   couche sans contrôle de chemin (`src/core/utils/qflayerutils.cpp` L615-627) : un chemin
   `/vsizip/<copie hors projet>/<entrée>` devrait s'ouvrir, **à condition de connaître le
   nom de l'entrée**. Questions 5 et 7 : probables oui, même hors du dossier projet.
3. **Effacer un `.zip` : `FileUtils.deleteFiles` refuse, mais `platformUtilities.rmFile`
   accepte.** `isDeletable` n'admet que `pdf, png, jpg, jpeg, mp4, mp4a, mp3`
   (`qffileutils.cpp` L974) : l'ADR 0003 a raison sur ce point. En revanche
   `platformUtilities.rmFile` est un simple `QFile::remove`, **sans aucun contrôle**
   (`src/core/platforms/qfplatformutilities.cpp` L208-212, déclaré invocable dans
   `qfplatformutilities.h` L131) ; QField l'appelle lui-même depuis QML
   (`src/gui/qml/QfCamera.qml` L950, `QfCodeReader.qml` L75). Prévision : question 3 → oui.
   Un détail de plus : `deleteFiles` accepte aussi un **dossier** dont le parent direct est
   `Imported Datasets` (`qffileutils.cpp` L940-966) ; le prototype ne l'essaie pas (il
   effacerait `Imported Datasets/cerf/` en entier, toutes forêts comprises).
4. **Copier hors du dossier projet : `platformUtilities.getFile` fait le choix et la copie
   d'un seul geste.** Sous Android, il ouvre le sélecteur du système
   (`ACTION_OPEN_DOCUMENT`) puis copie le fichier choisi vers `préfixe + chemin`, le préfixe
   étant libre (`src/core/platforms/android/qfandroidplatformutilities.cpp` L533-557 ;
   `platform/android/src/ch/opengis/qfield/QFieldActivity.java` L949-963 et L1411-1430).
   Le signal `resourceReceived(path)` annonce la fin (`src/core/qfresourcesource.h` L52).
   **Conséquence à dire franchement :** sous Android 11 et plus, le plugin ne reçoit jamais
   le chemin de l'original (Téléchargements) ; il ne voit que la copie. Le prototype listera
   donc **toujours une copie**, et le dira.
5. **`renameFile` déplace et efface l'original** (`qfplatformutilities.cpp` L214-256) : il n'est pas utilisé.

## 4. Fonctions de l'API QML appelées, avec leur source

Fichiers de QField v4.3.7 (commit `3fb1281`) sauf mention QGIS (commit `3a92eb3`).
Le plugin importe `org.qfield` et emploie les **anciens noms** (`FileUtils`, `LayerUtils`…),
gardés pour les plugins : `src/core/qfcore.cpp` L270 (« Pre-Qf names, reached through
org.qfield ») et L326-337 ; module `org.qfield` déclaré dans `src/app/qfapp.cpp` L43-47.

| Usage dans le prototype | Fonction | Source | Prouvé ? |
|---|---|---|---|
| Bouton dans la barre des plugins | `iface.addItemToPluginsToolbar(item)` | `src/core/qfappinterface.h` L181 ; `iface` posé en contexte : `src/app/qgismobileapp.cpp` L423 ; plugin créé dans ce contexte : `src/app/qfpluginmanager.cpp` L103-113 | lu |
| Lire `cerf_id` | `ExpressionContextUtils.projectVariables(qgisProject)["cerf_id"]` | `src/core/utils/qfexpressioncontextutils.h` L92, `.cpp` L180-188 (rend `customVariables()`) ; `qgisProject` : `qgismobileapp.cpp` L422 | lu |
| Dossier du projet | `qgisProject.homePath`, `qgisProject.fileName` | QGIS `src/core/project/qgsproject.h` L118-119 ; déjà employé par QField : `src/gui/qml/editorwidgets/relationeditors/gallery_relation_editor.qml` L33 | lu |
| Dossier de l'application | `platformUtilities.applicationDirectory()` | `qfplatformutilities.h` L138 ; Android : `qfandroidplatformutilities.cpp` L171-182, `QFieldActivity.java` L573-580 | lu |
| Choisir et copier un zip | `platformUtilities.getFile(préfixe, "{filename}", "*/*", parent)` puis `onResourceReceived` | voir § 3 n° 4 ; balise `{filename}` : `platform/android/src/ch/opengis/qfield/QFieldUtils.java` L52-67 ; usage QField : `src/gui/qml/editorwidgets/QfEditorWidgetExternalResource.qml` L798 | lu |
| Taille et présence de la copie | `LocalFilesModel` (`currentPath`, `get(i).path`, `get(i).size`) ; `FileUtils.fileExists(chemin)` | `src/gui/qflocalfilesmodel.h` L31 et L83, `.cpp` L181-196 et L232-356 (le `.zip` y est rangé avec sa taille, L338-340) ; type QML : `src/gui/qfgui.cpp` L91 ; `fileExists` sans contrôle de dossier : `qffileutils.cpp` L90-94 | lu |
| Lire les octets d'un zip | `FileUtils.readFileContent(chemin)` | `qffileutils.h` L83, `.cpp` L620-650 (**dossier projet seulement**) | lu |
| Effacer la copie | d'abord `FileUtils.deleteFiles([chemin])` (attendu : refus, preuve de l'ADR 0003), puis `platformUtilities.rmFile(chemin)` | `qffileutils.h` L176, `.cpp` L892-1027 ; `qfplatformutilities.h` L131, `.cpp` L208-212 | lu |
| Ouvrir une couche dans le zip | `LayerUtils.loadVectorLayer("/vsizip/…", nom)`, `LayerUtils.loadRasterLayer(…)` | `qflayerutils.h` L200 et L208, `.cpp` L615-627 | lu |
| Couche valide, système | `couche.isValid`, `couche.crs.authid` | QGIS `src/core/qgsmaplayer.h` L90 et L94 ; `src/core/proj/qgscoordinatereferencesystem.h` L222 | lu |
| Position du point, emprise | `couche.extent()` → `xMinimum`, `yMinimum`, `width`, `height` | QGIS `qgsmaplayer.h` L564 (`Q_INVOKABLE`) ; `src/core/geometry/qgsrectangle.h` L50-55 | lu |
| Nombre d'objets | `LayerUtils.createFeatureIterator(couche)`, `hasNext()`, `next()`, `close()` | `qflayerutils.h` L52-75 et L234 ; `featureCount()` de QGIS **n'est pas invocable** (`src/core/vector/qgsvectorlayer.h` L1701) | lu |
| Ajouter la couche à la carte (facultatif, pour la voir) | `ProjectUtils.addMapLayer(qgisProject, couche)` | `src/core/utils/qfprojectutils.h` L45 | lu |
| Module `.mjs` | `import "module-essai.mjs" as Essai` et `import "cerf-zip.mjs" as Zip` dans `main.qml` | **non lu** : la doc Qt (`doc.qt.io`) a renvoyé 403 dans cette session, et aucun QML de QField n'importe de `.mjs`. Seul point sans source lue : c'est l'objet même de la question 4 | **non prouvé** |

**Ce qui reste non prouvé, même après lecture :**

- l'import d'un `.mjs` par un plugin QField (question 4) ;
- la conversion du `QByteArray` rendu par `readFileContent` en `ArrayBuffer` côté
  JavaScript (comportement de Qt 6 attendu, non lu ; le module accepte `ArrayBuffer` et
  `Uint8Array`) ;
- l'écriture par `getFile` dans `Imported Datasets/cerf/<cerf_id>/` (le Java écrit dans le
  dossier de l'application, où QField a le droit d'écrire ; le dossier est créé par
  `mkpath`, `qfandroidplatformutilities.cpp` L537 — non essayé) ;
- l'ouverture par GDAL d'un Shapefile, d'un GeoJSON et d'un GeoTIFF de 200 Mo dans un zip
  **sur Android** ;
- **la taille en pixels d'un raster** : `QgsRasterLayer::width()` et `height()`
  (`src/core/raster/qgsrasterlayer.h` L292-298) et `xSize()` du fournisseur
  (`qgsrasterinterface.h` L261-262) **ne sont pas invocables** depuis QML. Le prototype
  affichera l'emprise en mètres (attendu 70710 m × 70710 m, soit 14142 pixels de 5 m) et
  dira que les pixels ne sont pas lisibles ; Pascal le note dans « Vu autrement » ;
- le sélecteur sous Android 11 et plus depuis Téléchargements et Documents (question 8).

## 5. Comment le prototype répond à chaque question du protocole

**Critère de réussite (décision de Pascal) : questions 1 à 4.** Les questions 5 à 9 sont
notées sans bloquer. Les noms de boutons ci-dessous sont **proposés** ; ils seront reportés
dans le protocole à la fin de la mission (exigence de la fiche).

| Bouton proposé | Ce qu'il fait |
|---|---|
| **A. Copier hors projet** | `getFile` → copie dans `<application>/Imported Datasets/cerf/<cerf_id>/<nom du zip>` ; refusé avec message si `cerf_id` est absent |
| **B. Copier dans le projet** | `getFile` → copie dans `<dossier du projet>/cerf-essai/<nom du zip>` (repli de la spec § 9, n° 1) |
| **C. Lister la copie** | lit la dernière copie faite (A ou B) avec `readFileContent` et le module ; affiche le nombre d'entrées, leurs noms, et « lu dans : copie hors projet » ou « copie dans le projet » ; si la lecture est refusée, l'écrit : « lecture refusée par QField : hors du dossier projet » |
| **D. Effacer la copie** | `deleteFiles` puis `rmFile` ; affiche le résultat de chacun ; puis « zip absent » si `fileExists` le confirme |
| **E. Module .mjs** | affiche `somme(2, 3)` et `SIGNATURE` du module embarqué, ou l'erreur de chargement |
| **F. Ouvrir les couches du zip** | `/vsizip/` sur `points_essai.geojson` et `sous-dossier/shape_essai.shp` de la copie : valide ou non, nombre d'objets, système, position |
| **G. Lire le .qml du zip** | extrait `sous-dossier/shape_essai.qml` par le module (copie dans le projet seulement) : taille, début du texte, couleur trouvée |
| **H. Ouvrir le GeoTIFF du zip** | `/vsizip/<copie de lourd.zip>/lourd.tif` : valide, système, emprise, temps d'ouverture en millisecondes |

En tête de l'écran, toujours : `cerf_id` lu (ou « cerf_id absent »), dossier du projet,
dossier de l'application, version du prototype.

- **Q1 — Lister.** Geste 1 : bouton A, sélecteur Android, choix dans Téléchargements.
  Geste 2 : bouton C sur la copie hors projet → prévision **refus**, affiché tel quel.
  Geste 3 : bouton B puis C → 9 entrées attendues. *Remarque pour Pascal :* le protocole
  parle de lister le zip « hors du dossier projet » ; sous Android 11 et plus, le plugin
  ne lit jamais l'original, seulement une copie (§ 3 n° 4). Le geste 3 du protocole
  (« copie posée dans le dossier du projet ») est fait par le bouton B, sans passer par le
  gestionnaire de fichiers.
- **Q2 — Copier.** Bouton A ; affichage du chemin complet de la copie, de `cerf_id`, de la
  taille (par `LocalFilesModel`, sans contrôle de dossier ; attendu 2108 octets), et
  « copie hors du dossier projet : oui/non » (comparaison de chemins faite par le module,
  testée sous Node). Geste 4 (lister la copie hors projet) : prévision **non**, comme Q1
  geste 2.
- **Q3 — Effacer.** Bouton D sur la copie hors projet : « deleteFiles : refusé » (prévu),
  « rmFile : fait » (prévu), puis « zip absent ». Un nouveau C affiche « zip absent ».
  L'original n'est jamais touché : le plugin ne connaît pas son chemin.
- **Q4 — Module.** Bouton E : `5` et `cerf-prototype-1`. Le fichier
  `prototype/module-essai.mjs` est une copie **octet pour octet** de
  `tests/recette/essai/module-essai.mjs` (le plugin ne peut pas aller le chercher hors de
  son dossier) ; un test Node vérifie l'identité des deux fichiers.
- **Q5 — Shapefile dans le zip.** Bouton F sur la copie (hors projet ou dans le projet) :
  nombre d'objets (attendu 1), `EPSG:2154`, et la position écrite avec l'ordre et le
  système explicites : « EPSG:2154, X (est) = 652301,56 m ; Y (nord) = 6861302,73 m ».
  Le module calcule l'écart au point attendu et affiche « à 1 m près : oui/non ».
- **Q5 bis (exigence de la fiche, pour chaque couche lue).** Même bouton F pour
  `points_essai.geojson` : système affiché (attendu `OGC:CRS84` ou `EPSG:4326`, valeur
  lue, non devinée) et position « longitude 2,35 ; latitude 48,85 ».
- **Q6 — `.qml` dans le zip.** Bouton G. Il faut les octets du zip, donc une copie dans le
  projet ; et les entrées de `essai.zip` sont compressées : le module contient un
  décompresseur « deflate » écrit pour Cerf (RFC 1951), testé sous Node contre
  `node:zlib`. Attendu : 635 octets, `<!DOCTYPE qgis>`, `255,0,0,255`. Sur la copie hors
  projet, le bouton dira « lecture refusée par QField ».
- **Q7 — GeoTIFF de 200 Mo.** Bouton A sur `lourd.zip`, puis H : système, emprise, temps
  d'ouverture mesuré par le plugin (`Date.now()` avant et après `loadRasterLayer`), à
  comparer au chronomètre de Pascal. Pixels : non lisibles (§ 4). Bouton D pour effacer.
  Le listage de `lourd.zip` (geste 2) n'est tenté que sur la copie hors projet, refusée :
  **le prototype ne lit pas 200 Mo en mémoire JavaScript** sans l'accord de Pascal
  (question n° 3 du § 9 ci-dessous).
- **Q8 — Sélecteur, Android 11 et plus.** Boutons A puis C depuis Téléchargements, puis
  depuis Documents. Le filtre est `*/*` (le type MIME d'un zip varie selon les
  gestionnaires) ; le module refuse un fichier qui ne finit pas par `.zip`, avec message.
- **Q9 — Noms CP437.** Bouton B sur `essai-cp437.zip`, puis C. Le module décode le nom en
  UTF-8 si le drapeau UTF-8 (bit 11) est posé, sinon en CP437, avec la table de
  correspondance publiée par l'Unicode Consortium (`CP437.TXT`, à lire et citer au
  moment du code). Attendu : `forêt/parcelle_é.txt`.

## 6. Structure des fichiers

```
prototype/
  PLAN.md            ce plan
  metadata.txt       name, description, author, version, icon, homepage (lu par QField :
                     src/app/qfpluginmodel.cpp L368-392)
  main.qml           bouton dans la barre des plugins + fenêtre aux gros boutons (gants)
  cerf-zip.mjs       le module de Cerf : lire le répertoire central d'un zip, décoder CP437,
                     décompresser une entrée, bâtir les chemins (copie, /vsizip/), dire si un
                     chemin est hors du dossier projet, écrire une position avec ordre et
                     système, écart au point attendu. ECMAScript pur, sans .pragma ni
                     .import (ADR 0005)
  module-essai.mjs   copie octet pour octet du module du testeur (question 4)
  icon.svg           icône dessinée pour Cerf
  empaqueter.mjs     fabrique cerf-prototype.zip (main.qml à la racine du zip, exigence de
                     src/app/qfpluginmanager.cpp L443-448) avec l'écrivain de zip du dépôt
                     (tests/recette/essai/zip-ecrire.mjs)
  essai-projet/
    cerf-essai.qgs   projet d'essai minimal, EPSG:2154, sans couche, portant la variable
                     de projet cerf_id (UUID tiré une fois, écrit en clair dans le fichier)
tests/
  prototype.test.mjs
```

**Tests (`node --test`, aucune dépendance) — écrits avant le code :**

- `module-essai.mjs` du prototype identique à celui de `tests/recette/essai/` ;
  `somme(2, 3) === 5`, `SIGNATURE === 'cerf-prototype-1'` ;
- liste de `essai.zip` : exactement les 9 noms du protocole, depuis un `ArrayBuffer` et
  depuis un `Uint8Array` ; `essai-cp437.zip` : `forêt/parcelle_é.txt` ; octets qui ne sont
  pas un zip ou zip tronqué → erreur au message clair ;
- extraction de `sous-dossier/shape_essai.qml` : 635 octets, `<!DOCTYPE qgis>`,
  `255,0,0,255` ; décompresseur comparé à `node:zlib` sur des données variées ;
- chemins : copie = `<application>/Imported Datasets/cerf/<cerf_id>/essai.zip` ;
  `/vsizip/<copie>/sous-dossier/shape_essai.shp` ; « hors du dossier projet » vrai et faux
  (dont le piège d'un dossier voisin au nom préfixe) ;
- **point du terrain au bon endroit** (règle du projet) : position du point d'essai écrite
  « EPSG:2154, X (est) puis Y (nord) » ; écart au point attendu ≤ 1 m pour
  (652301,56 ; 6861302,73) et refus pour un point décalé de 2 m ; pour le GeoJSON,
  « OGC:CRS84, longitude puis latitude » (2,35 ; 48,85) ;
- forme du plugin : `main.qml` importe bien les deux `.mjs` présents ; aucun `.pragma` ni
  `.import` dans les modules ; `metadata.txt` porte `name` et `version` ; chaque nom de
  bouton A à H figure dans `main.qml` ; le zip fabriqué a `main.qml` à sa racine.

Ce que Node ne prouve pas : tout ce qui touche l'API de QField (§ 4). Cela passe par le
protocole.

## 7. Installation par URL sur le Samsung de Pascal

1. Le zip du plugin, `cerf-prototype.zip`, est fabriqué par `node prototype/empaqueter.mjs`.
2. Il est mis en ligne à une adresse **finissant par `.zip`** (QField exige ce suffixe :
   `qfpluginmanager.cpp` L427-429). Deux options, à trancher (§ 9, question n° 1) : une
   « release » GitHub de `pobsteta/cerf`, ou le fichier versé dans la branche et servi par
   `raw.githubusercontent.com` (dépôt public seulement).
3. **Avec réseau**, dans QField : Paramètres → Plugins → « Install plugin from URL »
   (libellé lu dans `src/app/qml/QfPluginManagerSettings.qml` L187), coller l'URL.
4. QField demande « Do you grant permission to activate … ? » (`QgisMobileapp.qml`
   L5772) : accepter.
5. Importer le projet d'essai : `cerf-essai.zip` (contenant `cerf-essai.qgs`), copié sur le
   téléphone, ouvert par l'import d'archive de projet de QField ; il arrive sous
   `Imported Projects/`, donc hors de `Imported Datasets/` : la copie du bouton A sera bien
   hors du dossier projet.
6. Copier `essai.zip`, `essai-cp437.zip` et `lourd.zip` dans Téléchargements (et
   `essai.zip` aussi dans Documents), puis **mode avion** et suivre le protocole.

## 8. Risques, et ce que je ferai si une fonction manque

| Risque | Ce que je ferai |
|---|---|
| Lister hors du dossier projet est impossible (prévu par le code, § 3 n° 1) | Rien à contourner : le prototype affiche le refus ; on applique la **spec § 9, n° 1** (zip posé dans le dossier projet, pas de QFieldCloud) et l'on demande à QField d'exposer le listage d'un zip. Je n'essaie pas de ruse (voir § 9, question n° 2) |
| `rmFile` refusé sur l'appareil, ou retiré dans une version future (un commentaire du code annonce son déplacement : `qfplatformutilities.h` L129) | Le prototype affiche l'échec ; on applique la **spec § 9, n° 2** (la copie reste, son nom est affiché) |
| Le `.mjs` ne se charge pas dans QField | Le bouton E affiche l'erreur ; la pile de tests de l'ADR 0005 est à reprendre avec Pascal. Je ne passe pas en `.js` avec `.pragma library` de moi-même : c'est une décision d'ADR |
| `getFile` n'écrit pas dans `Imported Datasets/cerf/<cerf_id>/` | Affiché ; même repli que la première ligne (§ 9, n° 1) |
| Version de QField de Pascal antérieure à 4.3.7 | Les numéros de ligne changent ; les anciens noms restent valables. Le prototype affiche ce qu'il trouve ; Pascal note sa version dans le protocole |
| Lecture de 200 Mo en mémoire (si `lourd.zip` était copié dans le projet) | Non tentée sans accord (§ 9, question n° 3) |
| `cerf-essai.qgs` écrit à la main mal relu par QGIS | Pascal l'ouvre d'abord dans QGIS (onglet Variables, comme le dit le protocole) ; à défaut il crée un projet vide et ajoute la variable `cerf_id` lui-même |
| Zip de plus de 4 Go (ZIP64) | Hors du prototype : le module le refuse avec un message ; à reprendre si le vrai plugin en a besoin |

## 9. Questions qui relèvent de Pascal

1. **Où mettre le zip du plugin** pour l'installer par URL : release GitHub, ou fichier
   versé dans le dépôt et servi par `raw.githubusercontent.com` (le dépôt est-il public) ?
   La mise en ligne n'est pas dans mon périmètre (je ne pousse pas).
2. **Pas de ruse pour lister hors du dossier projet.** Une seule existe à ma connaissance :
   poser `cerf.qgz` à la racine du dossier de l'application, ce qui mettrait
   `Imported Datasets/` « dans » le dossier projet aux yeux de QField. Elle contourne une
   barrière de sécurité voulue par QField ; je ne la prends pas sans votre décision, et je
   la déconseille.
3. **Lister `lourd.zip` copié dans le projet** (200 Mo lus en mémoire JavaScript, risque
   de plantage de QField) : l'essayer, ou non ?
4. **Le protocole et Android 11** : « lister le zip hors du dossier projet » ne peut viser
   que la copie, jamais l'original. Faut-il demander au `testeur` d'ajuster la question 1
   (mission 003) ? Je ne modifie pas le protocole.
5. **Le décompresseur « deflate »** (question 6, non bloquante) coûte une centaine de
   lignes de code et leurs tests. Le garder, ou laisser la question 6 sans réponse ?

## 10 bis. Réalisation : écarts au plan (2 novembre 2026, après l'accord de Pascal)

Les décisions de Pascal sont dans `pilotage/missions/004-prototype-1.md`, rubrique
« Décisions de Pascal sur le plan ». Ce qui change par rapport aux § 5 et 6 ci-dessus :

1. **Pas de décompresseur** (décision n° 5) : le bouton G s'appelle
   **« G. Trouver le .qml du zip »** ; il trouve l'entrée et sa taille annoncée par le zip
   (635 octets), puis affiche « EN ATTENTE » pour le début du texte et la couleur. Il ne lit
   le texte que d'une entrée rangée sans compression.
2. **Essai à risque, en dernier** (décision n° 3) : bouton
   **« I. Essai à risque : lister un gros zip »**, en bas de l'écran, en rouge, à toucher
   deux fois. Le bouton C refuse de lire en mémoire une copie de plus de 10 000 000 octets
   et renvoie à I (garde du prototype, pas une valeur du produit).
3. **`main.qml` n'importe pas les `.mjs` lui-même.** Il crée `Cerf.qml` (qui importe
   `cerf-zip.mjs`) et `EssaiModule.qml` (qui importe `module-essai.mjs`) par
   `Qt.createComponent` et affiche `errorString()` en cas d'échec : un `.mjs` refusé par
   QField donne un message lisible (question 4) au lieu d'un plugin absent. `main.qml`
   garde un bouton « E. Module .mjs » de secours.
4. **`empaqueter.mjs`** écrit dans `prototype/dist/` (ignoré par `.gitignore`, décision
   n° 1) `cerf-prototype.zip` et `cerf-essai.zip`.
5. **Table CP437** : la page de l'Unicode Consortium a été refusée par le réseau (403) ;
   source : codec `cp437` de Python 3.13.18, généré depuis `CP437.TXT`, contrôlé identique
   à `iconv` de la glibc 2.39.
6. **Un défaut trouvé hors QField** (Qt 6.12 par PySide6, API de QField simulée) : un
   `QByteArray` vide arrive en `ArrayBuffer` vide, et `new Uint8Array()` sur ce tampon lève
   « Type error » dans le moteur de Qt. `octetsDe` le traite à part ; test Node ajouté.

## 10. Question de contrôle

Qui fait quoi d'ici quand, et comment saura-t-on que ça marche ? — Le `dev` écrit les tests
puis le prototype dès l'accord de Pascal sur ce plan ; l'orchestrateur met le zip en ligne ;
Pascal l'installe et remplit le protocole sur son Samsung ; on saura que ça marche quand
chacune des questions 1 à 4 aura un « oui » ou un « non » vu sur l'appareil, et la décision
de la spec § 9 qui en découle.

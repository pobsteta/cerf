# Plan du prototype n° 2 (mission 023) : styles et reprojection dans QField

> Rédigé par le `dev` le 4 novembre 2026. **Plan seul : aucun code n'est écrit avant
> l'accord de Pascal** (mission tenue, étape 1). Rien de ce qui suit n'est prouvé sur le
> Samsung : seul le protocole rempli par Pascal le prouvera.

## 1. La mission en une phrase

Écrire un plugin QField jetable qui essaie, sur le Samsung de Pascal et hors réseau, de poser
le style du manuel (couleurs et étiquettes) par un `.qml` voisin ou par la table
`layer_styles` d'un GeoPackage, et de reprojeter un point et une emprise depuis QML, pour que
l'ADR des styles et le sort de la mission 012 reposent sur ce qu'on a **vu sur l'appareil**.

## 2. Ce que j'ai lu, et comment (accès)

- **Je n'ai pas l'outil WebFetch** dans cette session. J'ai lu les sources par `curl` sur
  `raw.githubusercontent.com` (HTTP 200 à chaque fois, aucun refus d'accès). `gh` n'a pas été
  utilisé. `docs.qfield.org` n'a pas été consulté. Deux commandes ont été refusées par le
  harnais de l'agent (formulation jugée trop proche de git), pas par le site : je les ai
  réécrites plus simplement.
- **QField v4.3.7** (étiquette `v4.3.7`) : `src/core/utils/qffileutils.cpp` et `.h`,
  `qflayerutils.cpp` et `.h`, `qfgeometryutils.cpp` et `.h`,
  `qfcoordinatereferencesystemutils.h`, `qfappinterface.h`, `src/core/qfcore.cpp`,
  `src/core/qgsquick/qgsquickmapsettings.h`.
- **QGIS `master`** (pas le commit 3a92eb3 embarqué par QField 4.3.7, que je n'ai pas lu) :
  `qgsmaplayer.h`, `qgsvectorlayer.h`, `qgspoint.h`, `qgsrectangle.h`. Écart possible entre
  `master` et le QGIS embarqué ; le Samsung tranchera.
- Prototype n° 1 (`prototype/`, `prototype/PLAN.md`, `tests/recette/prototype-1.md`), plugin
  actuel `plugin/` (0.1.1), spec § 3.3 à § 5, journal du 4 novembre (acquéreur sur les styles,
  écart de la 012).

## 3. Ce que le code lu dit déjà (à confirmer sur l'appareil)

1. **Aucune pose directe de style depuis QML** (confirme l'acquéreur) : `setRenderer`,
   `setLabeling`, `featureCount()` sont des méthodes C++ non `Q_INVOKABLE`
   (`qgsvectorlayer.h` L969, L1646, L1701) ; aucune fonction de `LayerUtils` ne parle de
   style (`qflayerutils.h`). Seule voie : que **QGIS charge le style à la construction** de la
   couche. `LayerUtils.loadVectorLayer` fait `new QgsVectorLayer(uri, nom, "ogr")`
   (`qflayerutils.cpp` L615-620), et `LayerOptions::loadDefaultStyle` vaut `true` par défaut
   (`qgsvectorlayer.h` L440 et L456). Donc le style par défaut est **demandé** ; ce que le
   fournisseur OGR en fait (cherche `<fichier>.qml`, cherche `layer_styles`) est du code de
   QGIS que je n'ai pas lu : c'est l'objet des questions 1 à 3.
2. **Reprojection : l'API existe dans QField 4.3.7**, avec des **échecs silencieux** (à dire
   à la 012) :
   - `GeometryUtils.reprojectPoint(point, crsSource, crsCible)` en deux surcharges, `QgsPoint`
     et `QgsPointXY` (`qfgeometryutils.h` L95 et L98), `reprojectRectangle(rect, src, cible)`
     (L119), `point(x, y)` (L104), `createRectangleFromPoints(p1, p2)` (L122) ;
   - `CoordinateReferenceSystemUtils.fromDescription("EPSG:2154")` et `wgs84Crs()`
     (`qfcoordinatereferencesystemutils.h` L36 et L39) ;
   - **sur erreur de reprojection, QField ne lève rien** : il rend `QgsPoint()` ou
     `QgsRectangle()` vides (`qfgeometryutils.cpp` L406-408, L426-428, L450-452) ; et si
     source et cible sont **égales**, il rend l'entrée telle quelle (L396, L416, L439). Un
     contrôle qui lirait « pas d'exception = bon » se tromperait : il faut tester `isNull` /
     valeurs. Et **un système invalide** donne, d'après mon souvenir de QGIS (non lu), une
     coordonnée rendue **sans changement** : le prototype le vérifie (question 6, ligne 6).
   - Types lisibles : `QgsPoint` a `x`, `y` (`qgspoint.h` L56-57), `QgsRectangle` a `xMinimum`,
     `xMaximum`, `yMinimum`, `yMaximum`, `isNull`, `isEmpty` (`qgsrectangle.h` L50-61).
   - **Point de vigilance** : deux surcharges de `reprojectPoint` ; le moteur QML choisit selon
     le type reçu. `GeometryUtils.point(x, y)` rend un `QgsPoint`, donc la première surcharge.
     La seconde (`QgsPointXY`) n'est pas atteignable sans un objet de ce type : non essayée.
3. **`crs`, `extent`, `isValid`** : `crs` et `isValid` sont des `Q_PROPERTY` de la couche
   (`qgsmaplayer.h` L90 et L94) ; `extent()` est `Q_INVOKABLE` (L564) ; `wgs84Extent()` aussi
   (L580). `featureCount()` ne l'est pas : on compte avec `LayerUtils.createFeatureIterator`
   (déjà employé au prototype n° 1) et l'on **note** la réponse de l'appel direct.
4. **Écrire un fichier** : `FileUtils.writeFileContent(chemin, octets)` existe, prend un
   `QByteArray`, **crée les dossiers** manquants, et **refuse tout chemin hors du dossier du
   projet** (`qffileutils.cpp` L652-696 ; contrôle `isWithinProjectDirectory`). C'est
   compatible avec `<projet>/cerf-imports/` (spec § 3.3).
5. **Voir la carte** : `iface.mapCanvas()` est invocable (`qfappinterface.h` L214) ; le plan
   suppose `iface.mapCanvas().mapSettings.setCenterToLayer(couche)` (méthode invocable de
   `QgsQuickMapSettings`, `qgsquickmapsettings.h` L194) ; que `mapSettings` soit atteignable
   ainsi **n'est pas lu**. Repli : Pascal zoome à la main (la fenêtre donne l'emprise).

**Ce qui ne marchera probablement pas** (à prouver) : `/vsizip/` : QGIS cherche `.qml` et
`layer_styles` à côté d'un **fichier du disque**, pas derrière `/vsizip/` (acquéreur, journal
du 4 novembre). Attendu : question 2 = non.

## 4. Comment une couche sort du zip vers `<projet>/cerf-imports/`

Le lecteur de zip du plugin actuel (`plugin/cerf-logique.mjs`, `nomsDuZip`) **ne sait que
lister les noms** : pas de position des données, pas d'extraction, et le prototype n° 1 a dit
en toutes lettres « pas de décompresseur ». Il faut donc en écrire un petit, **dans
`prototype-2/` seulement** (je ne touche pas à `plugin/`) :

1. **Copier le zip dans le projet** : `platformUtilities.requestStoragePermission()` puis
   `platformUtilities.getFile("<projet>/cerf-imports/", "{filename}", "*/*", parent)`, signal
   `resourceReceived` : geste **déjà prouvé sur le Samsung** (squelette 0.1.1, journal du
   3 novembre). Le zip est dans le dossier du projet, donc lisible.
2. **Lire** : `FileUtils.readFileContent(copie)` (prouvé, rend un `ArrayBuffer`).
3. **Lire le répertoire central** (module `.mjs`, testé sous Node) : pour chaque entrée, nom,
   méthode, tailles, CRC32, position de l'en-tête local. **Extraire une entrée** = sauter
   l'en-tête local (30 octets + nom + champ extra), prendre `taille` octets.
4. **Écrire** : `FileUtils.writeFileContent("<projet>/cerf-imports/<dossier>/<nom>", octets)`.
   On lui passe un **`ArrayBuffer` exact** (`octets.buffer.slice(debut, fin)`), pas un
   `Uint8Array` : la conversion JavaScript vers `QByteArray` d'un tableau typé n'est pas lue,
   celle d'un `ArrayBuffer` est celle de Qt 6 (non prouvée en écriture). **Preuve
   immédiate** : le bouton relit le fichier écrit (`readFileContent`), compare la taille et le
   CRC32 à ceux du zip, et l'affiche. Un fichier écrit à moitié ou déformé se voit tout de suite.
5. **Limite assumée** : le prototype n'extrait que les entrées **stockées** (méthode 0, comme
   `zip -0`). Le zip d'essai est fabriqué ainsi. **Un zip de JFC, fait par QGIS ou 7-Zip, est
   compressé (méthode 8)** : le vrai plugin aura besoin d'un décompresseur `inflate` en
   JavaScript (écrit et testé sous Node contre `zlib`). Le prototype le dit à l'écran : « entrée
   compressée, non extraite ». Voir question 1 pour Pascal.
6. **Piste de rechange pour les données (pas pour le `.qml`)** :
   `LayerUtils.saveVectorLayerAs(couche, chemin, pilote, filtre)` (`qflayerutils.h` L254) relit
   une couche, même `/vsizip/`, et l'écrit sur disque **sans décompresser nous-mêmes** ; il
   **réécrit** les données (champs, système, encodage peuvent changer) et ne porte aucun style.
   Non essayée ici ; notée pour l'ADR si l'extraction échoue.

## 5. Le zip d'essai et le projet d'essai

Toutes les données sont **fictives** (carrés de 300 m autour de Strasbourg, sans valeur
métier), en Lambert 93 dans l'emprise de la spec § 4 (X 89 101 → 1 252 436, Y 6 036 555 →
7 120 480). Le champ de code s'appelle **`code_ug`** (les vrais noms de champs sont à lire
dans les fichiers de JFC : spec § 5). Fabriqué par un script, **octets identiques à chaque
fois**, jamais versé au dépôt (publié par la préversion, § 8).

**`essai-styles.zip`**, toutes entrées **stockées** :

| Entrée | Contenu | Sert à |
|---|---|---|
| `UG_q1.geojson` | 2 polygones, `crs` = `urn:ogc:def:crs:EPSG::2154`, champ `code_ug` | question 1 |
| `UG_q1.qml` | style du manuel UG : contour seul `#0000FF`, 0,6 mm, sans remplissage ; étiquette `code_ug`, 10 pt, `#0000FF` | questions 1 et 5 |
| `UG_q2.geojson` + `UG_q2.qml` | idem, autres polygones | question 2 (lu en `/vsizip/`, `.qml` dans le zip) |
| `UG_q4.geojson` + `UG_q4.qml` | idem, autres polygones ; le `.qml` est écrit **après** le chargement | question 4 |
| `Parcelles_q3.gpkg` | GeoPackage, table `Parcelles_q3`, 2 polygones, Lambert 93, plus **table `layer_styles`** (schéma QGIS : `f_table_name`, `f_geometry_column`, `styleName`, `styleQML`, `useAsDefault = 1`…) portant le style Parcelles : contour `#FF8C00`, 1 mm ; étiquette 15 pt `#FF8C00` | questions 3 et 5 |
| `Sans_crs.geojson` | polygones **en mètres Lambert 93 mais sans membre `crs`** (lus en WGS84 selon la RFC 7946) | questions 6 et 7 (le piège de la 012) |
| `FRT_q7.shp`, `.shx`, `.dbf`, `.prj`, `.cpg` | Shapefile complet Lambert 93, 2 polygones, `.prj` en WKT1 ESRI de EPSG:2154 (pyproj, comme au prototype n° 1) | question 7 |

Les styles **diffèrent exprès** (UG bleu `#0000FF` aux questions 1 et 2, Parcelles orange
`#FF8C00` à la question 3, FRT vert-bleu `#008B8B` à la question 4) et les emplacements aussi :
Pascal reconnaît à l'œil quelle couche a pris son style. Une couche **sans style pris**
s'affiche avec la couleur aléatoire et le remplissage par défaut de QGIS, très différents.

**Projet d'essai `cerf-essai-2.zip`** : un `.qgs` vide, en EPSG:2154, **sans `cerf_id`** et
sans fond de carte (hors ligne, un fond ne s'afficherait pas ; le blanc donne le meilleur
contraste). Je **ne touche pas** au `cerf.qgz` de Pascal (une couche ajoutée pourrait y être
enregistrée par QField).

**Limite : je n'ai ni QGIS ni GDAL dans la session** pour contrôler le `.qml` et le
`.gpkg`. Un `.qml` ou un GeoPackage mal formé donnerait un « non » faux. Parade, au protocole
(« Avant de commencer ») : **sur le poste, Pascal ouvre `UG_q1.geojson` et `Parcelles_q3.gpkg`
dans QGIS** : les couleurs et étiquettes doivent apparaître seules ; sinon le défaut est dans
les fichiers d'essai, pas dans QField. Côté dépôt : tests Node (ouverture du GeoPackage par
`node:sqlite`, déjà employé par `outils/projet-modele.mjs`), et, dans le workflow, une étape
`ogrinfo` après `apt-get install gdal-bin` si Pascal l'accepte (question 7).

## 6. L'écran et les boutons (un bouton par question)

Plugin « Cerf, prototype n° 2 », bouton dans la barre des plugins, écran plein, gros boutons
(gants, soleil, 72 px, police 18), même structure que le prototype n° 1. **En-tête permanent** :
version, projet (nom et dossier), dossier `cerf-imports`, dernier zip copié. Le résultat de
chaque bouton est un bloc de texte noir sur blanc, **chaque appel en `try/catch` et l'erreur
affichée mot pour mot** (le prototype ne cache aucun échec). Les noms des boutons sont
proposés ; ils seront repris tels quels au protocole.

**Bouton 0, « Préparer le zip »** (avant toute question). `getFile` → `cerf-imports/essai-styles.zip`
(Pascal choisit le zip dans Téléchargements) ; `readFileContent` ; liste des entrées avec
méthode, taille, CRC32 ; dit si une entrée est compressée. Capture : la liste (13 entrées
attendues, 17 avec la ligne « sans .prj » de la question 5 des questions à Pascal, toutes « stockée »).

| N° | Bouton | Ce qu'il fait exactement | Ce qu'on doit voir (oui / non) | Capture |
|---|---|---|---|---|
| **1** | « 1. Couche sortie du zip » | extrait `UG_q1.geojson` **puis** `UG_q1.qml` vers `cerf-imports/q1/` (`writeFileContent`, relecture, CRC32) ; **alors seulement** `LayerUtils.loadVectorLayer("<projet>/cerf-imports/q1/UG_q1.geojson", "UG_q1")` ; `ProjectUtils.addMapLayer(qgisProject, couche)` ; centre sur la couche ; affiche `isValid`, `crs.authid`, `extent()` | **1a couleurs** : contour bleu, 0,6 mm, **sans remplissage** = oui ; remplissage plein ou couleur au hasard = non. **1b étiquettes** : `code_ug` en bleu, 10 pt = oui ; pas d'étiquette = non. Deux réponses séparées | la carte zoomée sur la couche + l'écran du plugin |
| **2** | « 2. Couche lue dans le zip » | `loadVectorLayer("/vsizip/<projet>/cerf-imports/essai-styles.zip/UG_q2.geojson", "UG_q2")` ; le `.qml` est dans le zip, nulle part ailleurs ; ajoute à la carte ; affiche `isValid`, `crs.authid`, `extent()` | attendu : **non** (couche valide, mais style par défaut de QGIS). Si bleu sans remplissage avec étiquettes : **oui, surprise**, à dire en gros | la carte + l'écran |
| **3** | « 3. GeoPackage avec styles » | extrait `Parcelles_q3.gpkg` vers `cerf-imports/q3/` (binaire : CRC32 relu) ; `loadVectorLayer("<…>/Parcelles_q3.gpkg\|layername=Parcelles_q3", "Parcelles_q3")` ; ajoute ; affiche `isValid`, `crs`, `extent()` | **3a couleurs** : contour orange, 1 mm, sans remplissage = oui. **3b étiquettes** : `code_ug` 15 pt orange = oui | la carte + l'écran |
| **4** | « 4. .qml posé après » | extrait **seulement** `UG_q4.geojson`, charge et ajoute la couche ; l'écran dit « capture A maintenant » (style par défaut) ; Pascal touche « 4b » : le plugin écrit alors `UG_q4.qml` à côté, **ne recharge pas**, redit « capture B maintenant » ; puis « 4c » : appelle `couche.reload()` (essayé, erreur affichée si absent) ; puis « 4d » : charge une **nouvelle** couche `UG_q4_bis` depuis le même fichier | **oui** si la couche A **ne change pas** après 4b (le style n'est lu qu'à la construction) ; on note aussi si 4c change quelque chose (`reload()` relit-il le style ?) et attendu : 4d prend le style (vert-bleu `#008B8B`) | trois captures : A (avant), B (après 4b), D (après 4d) |
| **5** | « 5. Mémoriser » puis « 5. Après réouverture » | « Mémoriser » : écrit dans les réglages de QField (`settings.setValue` + `sync`, prouvé par le squelette) la liste `{chemin, nom}` des couches des questions 1 et 3, et marque ces couches (`setCustomProperty("cerf/proto2", …)`). Pascal **ferme le projet et le rouvre**. Au `loadProjectEnded`, le plugin compte d'abord les couches marquées **déjà présentes dans le projet** (dit si QField a enregistré le projet), puis **recharge** par `loadVectorLayer` celles qui manquent, **sans réécrire aucun `.qml`**, et les ajoute | **oui** si les deux couches reviennent avec leur style (bleu et orange) après réouverture. L'écran dit aussi « présentes dans le projet : n » : si n vaut 2, le style vu peut venir du projet enregistré et non du fichier voisin : on le note, la réponse « le style est relu depuis le disque » reste valable pour les couches **rechargées** | la carte après réouverture + l'écran |
| **6** | « 6. Reprojection » | `CoordinateReferenceSystemUtils.fromDescription("EPSG:2154")` et `wgs84Crs()` : `isValid`, `authid`. **Ligne 1** point : `GeometryUtils.reprojectPoint(GeometryUtils.point(7.76189, 48.56906), wgs84, l93)` → affiche `x`, `y`. **Ligne 2** emprise : `createRectangleFromPoints` de deux points WGS84 (7.7500, 48.5600) et (7.7700, 48.5800), puis `reprojectRectangle` → `xMinimum`…`yMaximum`, `isNull`. **Ligne 3** vraisemblance : l'emprise est-elle dans X 89 101 → 1 252 436, Y 6 036 555 → 7 120 480 ? **Ligne 4** : les noms qui existent (`typeof` de chaque fonction, `GeometryUtils` et `CoordinateReferenceSystemUtils`). **Ligne 5** même système des deux côtés (rend l'entrée sans changement : attendu). **Ligne 6** système invalide (`CoordinateReferenceSystemUtils.invalidCrs()`) : rend-il l'entrée sans changement, ou vide ? **Ligne 7** : lecture seule de la sortie d'un échec : valeur de `x`, `y`, `isNull` quand la reprojection est impossible | **oui** si ligne 1 ≈ **1 051 113 ; 6 840 462** à **5 m** près ; ligne 2 : rectangle non nul, tous les coins dans l'emprise ; en **mode avion** (le réseau n'entre pas dans cet appel). Une exception, `undefined` ou `0, 0` = non | l'écran entier (lignes 1 à 7), défilé si besoin |
| **7** | « 7. Métadonnées d'une couche » | pour trois sources, **toutes en `/vsizip/<projet>/cerf-imports/essai-styles.zip/<entrée>`** : `UG_q2.geojson` (avec `crs`), `Sans_crs.geojson`, `FRT_q7.shp` : `isValid`, `crs.authid`, `crs.isValid`, `crs.description`, `extent()` (4 bornes), `couche.featureCount()` **appelé en direct** (erreur ou valeur notée), comptage par `createFeatureIterator`, et pour la **Sans_crs** : l'emprise reprojetée en 2154 par la question 6 puis le verdict « refus » ou « chargée » selon la spec § 4 | `UG_q2` : `EPSG:2154`, 2 objets ; `FRT_q7` : `EPSG:2154`, 2 objets ; `Sans_crs` : `EPSG:4326` (RFC 7946) et emprise absurde (≈ 650 000 en « degrés »), reprojection **échouée ou hors emprise** = le refus de la 012 est possible ; `featureCount()` direct : réponse notée (attendue : non invocable) | l'écran, défilé |

Remarque sur la question 7 : le contrôle de la 012 compte sur `crs`, `extent` et le comptage. Si
`extent()` d'un GeoJSON vide ou illisible rend une emprise nulle, le prototype l'écrit
(c'est le cas « couche vide » du contrôle 4).

## 7. Le protocole `tests/recette/prototype-2.md` (à écrire ensuite)

Même forme que `tests/recette/prototype-1.md` : une section par question, tableau
**Geste / Résultat attendu / Vu ☐**, « Si non » (conséquence pour l'ADR des styles ou la 012),
« Vu autrement », tableau final de réponses oui/non. Je l'écrirai **à la fin de l'étape 2**
(les noms de boutons doivent être ceux de l'écran), avec test de forme `node --test` sur les
noms de boutons, comme `tests/protocole-prototype-boutons.test.mjs`. Il contient en plus :

- **Avant de commencer** : modèle du Samsung, Android, version de QField, version du
  prototype, date ; télécharger **avant** le mode avion `cerf-prototype-2.zip` (plugin,
  par URL), `cerf-essai-2.zip` (projet), `essai-styles.zip` (et `essai-q3.gpkg` en repli) ;
  **désactiver** Cerf 0.1.1 et le prototype n° 1 pendant l'essai (trois boutons de plugin sur
  la barre prêtent à confusion) ; contrôle QGIS **sur le poste** des fichiers d'essai (§ 5) ;
  mode avion.
- Pour chaque question : **une capture nommée** (`q1-carte.png`, `q1-ecran.png`, …), à joindre
  à la PR ou au journal par Pascal.
- Le **critère** : sept réponses oui/non, c'est tout ; aucun seuil de temps.

## 8. Publication (sur le modèle de `release-prototype.yml`)

- Workflow `.github/workflows/release-prototype-2.yml`, déclenché sur la branche
  `mission/023-prototype-2` (chemins : `prototype-2/**`, `outils/**`,
  `tests/recette/**`, le workflow lui-même), concurrency propre
  (`group: release-prototype-2`, `cancel-in-progress: false`, comme l'exigent les tests de la
  022).
- Étapes : Node 22, `node --test`, `node prototype-2/empaqueter.mjs dist`, puis
  `gh release create prototype-2 … --prerelease --latest=false` (ou
  `gh release upload --clobber` + `gh release edit … --latest=false` si elle existe). **Jamais
  « latest »** : seule `plugin-v<version>` l'est (tests de `tests/workflows-release.test.mjs`).
  J'y ajouterai un test sur ce point.
- Fichiers publiés : `cerf-prototype-2.zip` (plugin : le nom du zip **donne le nom du
  dossier** du plugin dans QField, ne pas le renommer), `cerf-essai-2.zip`, `essai-styles.zip`,
  `essai-q3.gpkg` ; sha256 dans les notes ; pas de zip versé au dépôt.
- URL de téléchargement prévues :
  `https://github.com/pobsteta/cerf/releases/download/prototype-2/<fichier>`.
- Étiquette créée par la release elle-même (le proxy refuse le push d'étiquettes depuis la
  session, journal du 2 novembre).

## 9. Ce que j'écrirai à l'étape 2 (aucun fichier n'est créé maintenant)

`prototype-2/main.qml`, `Essai.qml` (écran), `essai-logique.mjs` (zip, chemins, formats,
registre), `metadata.txt`, `icon.svg`, `empaqueter.mjs`, `fabriquer-essais.mjs` (zip, `.qml`,
GeoPackage, Shapefile), `essai-projet/cerf-essai-2.qgs` ; `tests/prototype-2.test.mjs`
(`node --test`, **rouges d'abord**) : lecture du répertoire central et extraction stockée
(contre `zlib`/`zip-ecrire.mjs`), refus d'une entrée compressée, CRC32, déterminisme du zip
d'essai, contenu du `.qml` (couleurs et tailles de la spec § 5), table `layer_styles`
(ouverte par `node:sqlite`), `Sans_crs.geojson` sans membre `crs`, `.prj` du Shapefile, noms
des boutons ; plus le test du workflow. **Ce que les tests ne prouvent pas** : tout appel à
QField. Écrans essayés dans le moteur QML de Qt avec une API QField simulée, comme au
prototype n° 1 (si le conteneur le permet).

## 10. Les risques (qui paie ?)

| Risque | Si je tiens (rien de caché) | Si je plie | Ce que je fais |
|---|---|---|---|
| `.qml` ou GeoPackage d'essai mal formé : faux « non » | Pascal perd un aller-retour | le style serait jugé impossible à tort, **l'ADR se fonderait sur un faux** : paie la justesse | contrôle QGIS sur le poste avant l'essai (§ 5) ; Pascal peut m'envoyer le `.qml` de QGIS pour le remplacer |
| Zip d'essai stocké, zips réels compressés | l'essai ne couvre pas l'extraction d'un zip réel | le « oui » du prototype passerait pour acquis alors que `inflate` reste à écrire | dit à l'écran et dans la PR ; décision de Pascal (question 1) |
| `writeFileContent` avec un `ArrayBuffer` : conversion non prouvée | bouton 0 « échoue » | tous les boutons 1 à 5 dépendent de lui | relecture, taille, CRC32 ; si échec, on le dit en tête de PR et on bascule sur la piste de rechange du § 4 n° 6 pour les données (pas pour le `.qml`) |
| `mapCanvas().mapSettings.setCenterToLayer` inexistant | Pascal zoome à la main | captures sans la couche | l'écran affiche l'emprise de la couche et son centre en Lambert 93 pour s'y rendre |
| Les couches ajoutées sont enregistrées par QField dans le projet | la question 5 mélange deux causes | un « oui » abusif | compteur « présentes dans le projet : n » avant rechargement (§ 6) |
| Écart `master` / QGIS embarqué | une signature diffère | erreur affichée telle quelle | tout appel en `try/catch`, message complet |
| Plafond de 3 PR | la PR part quand une place se libère | — | pas de PR ouverte par moi (consigne) |
| Faux positifs de couleur au soleil | capture floue | — | couleurs d'essai très différentes, captures en intérieur |

## 11. Hors périmètre (noté, pas fait)

Le vrai plugin ; l'`inflate` ; les branches des missions 010 et 012 ; la pose des styles par
règle sur le nom ; la police du mail de JFC ; la reprojection par densification des bords (la
012 le fait avec 21 points par bord : un rectangle reprojeté d'un coup, comme à la ligne 2
de la question 6, ne suit pas une frontière courbe : la ligne 2 le montre par un écart,
mais ne remplace pas la densification). **Amélioration repérée** : le contrôle de la 012 doit
traiter `QgsPoint()` / `QgsRectangle()` vides comme une erreur de reprojection, puisque
QField ne lève pas d'exception (§ 3, n° 2) ; à porter à la fiche 012 par l'orchestrateur.

## 12. Questions pour Pascal (réponse proposée pour chacune)

1. **Zip d'essai stocké (sans compression) : acceptable ?** Le prototype prouve les styles,
   pas l'extraction d'un zip de JFC. *Proposé :* oui ; si les questions 1 et 3 passent, une
   mission « `inflate` en JavaScript » suit, testée contre `zlib`.
2. **Projet d'essai dédié `cerf-essai-2.zip`, sans toucher `cerf.qgz` ?** *Proposé :* oui.
3. **Données fictives autour de Strasbourg, champ `code_ug`, point WGS84 de la question 6
   (7,76189 ; 48,56906) ?** Je l'ai déduit des valeurs de la fiche (1 051 113 ; 6 840 462),
   pyproj 3.8.0 (PROJ 9.8.1) donne 1 051 112,70 ; 6 840 461,54, à 0,6 m de la fiche. *Proposé :* oui ; Pascal corrige si « Strasbourg »
   désignait un autre point.
4. **Question 5 : la mémorisation passe par les réglages de QField, pas par le projet.**
   *Proposé :* oui (c'est aussi le choix du plugin 0.1.1).
5. **Ajouter à la question 7 une ligne « Shapefile sans `.prj` »** (ce que QField rend comme
   système) ? Hors lettre de la fiche, sans bouton de plus, quatre entrées de zip en plus.
   *Proposé :* oui, c'est le piège de CLAUDE.md et la spec § 4 le refuse déjà sur le nom.
6. **GeoPackage : extrait du zip, et aussi publié seul (`essai-q3.gpkg`) en repli ?**
   *Proposé :* oui.
7. **Contrôle des fichiers d'essai par QGIS sur le poste (§ 5), et `ogrinfo` dans le
   workflow ?** *Proposé :* QGIS par Pascal, oui ; `ogrinfo` en CI, oui si l'installation de
   `gdal-bin` ne dépasse pas une minute, sinon non.
8. **Plugin `cerf-prototype-2.zip` et préversion `prototype-2` ; désactiver Cerf 0.1.1
   pendant l'essai ?** *Proposé :* oui.
9. **Question 1 : deux réponses séparées (couleurs, étiquettes), de même pour la 3 ?**
   *Proposé :* oui, car l'ADR peut retenir l'un sans l'autre.
10. **Qui écrit `tests/recette/prototype-2.md` ?** La fiche l'attribue au `dev` ; au
    prototype n° 1 c'était le `testeur` (mission 003). *Proposé :* je l'écris à l'étape 2 (les
    boutons sont les miens), le `testeur` le relit.

## 13. Question de contrôle

**Qui fait quoi d'ici quand, et comment saura-t-on que ça marche ?** Pascal dit oui ou non à
ce plan ; le `dev` code l'étape 2 (tests rouges puis verts, préversion `prototype-2`) ; Pascal
passe les sept questions sur le Samsung en mode avion, une capture par réponse ; on saura que
ça marche quand sept réponses oui/non sont écrites, assez pour l'ADR des styles et pour dire
si la 012 peut reprojeter.

## 14. Proposition de ligne de journal

`2026-11-04 · dev · 023 · étape 1 : plan rendu (prototype-2/PLAN.md), aucun code ; sources QField 4.3.7 lues par curl (WebFetch absent) : GeometryUtils.reprojectPoint/reprojectRectangle et CoordinateReferenceSystemUtils.fromDescription existent, mais rendent des objets vides sans exception sur échec (à porter à la 012) ; writeFileContent limité au projet ; lecteur de zip du plugin sans extraction, zip d'essai stocké ; dix questions à Pascal.`

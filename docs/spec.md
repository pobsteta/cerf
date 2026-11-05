# Cerf — spécification, tranche 1

> Rédigée par Claude (orchestrateur) le 2 novembre 2026 à partir de `docs/brief.md`
> (arbitrages de Pascal du même jour). Critiquée par le `contradicteur` le même jour ;
> arbitrages de Pascal reportés (§ 9). **Statut : validée par Pascal le 2 novembre 2026
> (porte n° 1).** Ce qui manque s'écrit « à fournir ». Les décisions structurantes sont dans
> `docs/adr/`.

## 1. Parcours de l'agent sur le terrain

Un seul projet `cerf.qgz` par appareil, pour toutes les forêts de l'agent (§ 9, n° 3).

| # | Geste | Ce que fait Cerf | Réseau |
|---|---|---|---|
| 0 | Une fois par appareil : installer le plugin par son URL et copier `cerf.qgz`. | QField installe le plugin d'application (ADR 0001). | oui |
| 1 | Au bureau ou la veille : copier le zip sur l'appareil ; ouvrir le projet sur la zone du jour. | Les tuiles XYZ consultées sont mises en cache (ADR 0002). | oui |
| 2 | Sur le terrain : ouvrir `cerf.qgz`. | Le plugin reconnaît un projet Cerf (`cerf_id`, § 3.3) et recharge les couches de son registre. | non |
| 3 | Toucher le bouton Cerf (barre d'outils des plugins), puis « Ajouter un zip » dans le panneau Cerf qui s'ouvre. | Ouvre le sélecteur de fichiers Android. | non |
| 4 | Choisir le zip. | Copie le zip (§ 3.3), en liste le contenu (prototype n° 1). | non |
| 5 | Rien à cocher (Pascal, 4 novembre 2026) : toutes les couches du zip sont chargées ; une couche se retire ensuite dans le panneau Cerf (étape 7). | Pour chaque couche du zip : contrôles (§ 4), chargement en lecture seule, style (§ 5), inscription au registre **après chaque couche**. Un message par couche refusée. | non |
| 6 | Regarder la carte. | Couches aux couleurs du manuel, étiquettes essence/diamètre sur ProdBois. | non |
| 7 | Retirer une couche, depuis le panneau du plugin (ou le menu de la couche, si QField le permet à un plugin). | Retire la couche de la carte et du registre. La copie du zip est effacée quand plus aucune couche ne s'en sert **si QField le permet** ; sinon elle reste et son nom est affiché (§ 9, n° 2). | non |
| 8 | Fermer, rouvrir le projet, ou redémarrer l'appareil. | Étape 2 : tout revient. | non |

Contraintes de geste : gants et soleil. Boutons d'au moins 9 mm de côté, textes
contrastés, pas de geste fin (valeur à confirmer sur l'appareil par l'`afficheur`).
Le plugin n'affiche pas son bouton hors d'un projet Cerf.

## 2. Livrables

1. `cerf.qgz` : projet modèle vide de données métier, en Lambert 93 (EPSG:2154), avec
   les deux fonds XYZ (ADR 0002), la variable de projet `cerf_id` (§ 3.3) et la couche
   de saisie « Saisie terrain » (§ 3.5), avec son GeoPackage vide `saisie.gpkg`.
2. Le plugin QField d'application, en zip installable par URL (ADR 0001), sous
   GPL-3.0-or-later (ADR 0006), code entièrement écrit pour Cerf.
3. `docs/convention-zip.md` : une page, plus l'annexe des styles (§ 5).
4. `docs/notice-jfc.md` : trois pages ; préparer le zip depuis QGIS (ProdBois, Relevés,
   Canopée), le copier sur l'appareil ; récupérer `saisie.gpkg` au retour du terrain.
5. Trois zips de recette : `Serre_EA2026` (à fournir par JFC), `piege` et `lourd` (§ 6).

## 3. Données manipulées

### 3.1 Le zip d'entrée

- Le geste porte sur **un zip**, pas sur un dossier (le « ou un dossier » du brief n'est
  pas retenu en tranche 1 : le choix d'un dossier n'est pas acquis sous Android 11 et
  plus).
- Contient une ou plusieurs couches, à la racine ou dans des sous-dossiers.
- Formats, extensions sans tenir compte de la casse :
  - GeoJSON (`.geojson`, `.json`) ; un `.json` qui n'est pas du GeoJSON est ignoré en
    silence ;
  - GeoPackage (`.gpkg`, une couche par table) ;
  - Shapefile : **obligatoires** `.shp`, `.shx`, `.dbf`, `.prj` ; **conseillé** `.cpg` ;
  - GeoTIFF (`.tif`, `.tiff`), **rangé dans le zip sans compression** (`zip -0`) ou en
    SOZip, pour une lecture rapide (§ 9, n° 6).
- Les `.qml` servent aux styles (§ 5). Les `.qmd` (métadonnées QGIS, livrées par ProdBois)
  ne sont pas des styles : ignorés en silence. Les fichiers annexes (`.tfw`, `.aux.xml`, `.sbn`,
  `.sbx`, `.qix`) sont lus avec leur couche, sans message. Tout autre fichier est ignoré
  en silence.
- Les vecteurs sont ouverts dans le zip par `/vsizip/`, contrôlés, puis réécrits en
  GeoPackage dans `cerf-imports/` (§ 3.3, ADR 0003 amendée par l'ADR 0008, 4 novembre 2026) ;
  les GeoTIFF restent lus dans le zip. Une couche illisible ne fait pas échouer les autres.
  **Format affiché** : quel que soit le format d'entrée (GeoJSON, Shapefile, GeoPackage), la
  couche chargée est un **GeoPackage** en lecture seule, une table par fichier ; seul le
  GeoTIFF garde son format.
- Noms accentués dans un zip fait par l'explorateur Windows (codage CP437) : à tester au
  prototype n° 1 ; la notice conseille un zip fait par QGIS ou 7-Zip.

### 3.2 Les sources métier

| Source | Format attendu | Champs connus | État |
|---|---|---|---|
| Export ProdBois | GeoJSON 2008 **avec membre `crs` = `urn:ogc:def:crs:OGC:1.3:CRS84`** (WGS84, longitude puis latitude), points ; un fichier par tri, suffixe `_DE` (tiges désignées) ou `_Res` (réserve), accompagné d'un `.qmd` de QGIS (métadonnées, système EPSG:4326, pas de style) | `idTige`, `idFicheBois`, `idFoncFb`, `typeTige` (« Réservée »…), **`essence`** (code, ex. `ALT`), **`diametre`** (entier, cm), `color`, `typeReserve`, `chargesExploit`, `destination`, `qualiteArbre`, `qualiteBois`, `hautBois`, `nomLot`, `nbTige`, `caracBio`, `observation`, `idLR`, `nomCli`, `devolution` | **reçu** le 2 novembre 2026 : `Serre_EA2026_p5_13_30_Res.geojson` (5 points) et les `.qmd` de `_Res` et `_DE` ; le GeoJSON `_DE` reste **à fournir** |
| Relevés | à fournir | à fournir | à fournir |
| UG, Parcelles, FRT | Shapefile (cas de test) ou GeoPackage | champ du code : à fournir | à fournir |
| Canopée | Shapefile | à fournir | à fournir |

Ces référentiels sont à rassembler par l'`acquereur` (§ 8).

### 3.3 Registre et copies (ADR 0003)

- **Identifiant de projet** : une variable de projet `cerf_id` (UUID) écrite dans
  `cerf.qgz` par QGIS ; le plugin la lit, ne l'écrit jamais. Le plugin n'agit que si elle
  existe. **Un seul `cerf.qgz` par appareil** : pas de consigne de changer `cerf_id`.
- **Registre** : dans les réglages de QField (`Settings`), clé `cerf/<cerf_id>`, valeur
  JSON : liste de `{ zip, couche, chemin: "<zip sans .zip>/<couche>.gpkg", style, ajoutee_le, qml? }` pour un vecteur ; un GeoTIFF et les anciennes entrées gardent `chemin_vsi` (GeoTIFF : lu dans le zip), **chemins relatifs** au dossier des
  copies. Écrit après chaque couche chargée. Le registre s'accumule d'une forêt
  à l'autre ; l'agent retire ce qui ne sert plus.
- **Copies** : dans **`<dossier du projet>/cerf-imports/`** (repli § 9 n° 1, appliqué par
  Pascal le 3 novembre 2026 : QField 4.3.7 refuse à un plugin de lire un fichier hors du
  dossier projet, vu à l'essai du squelette). Cerf n'est pas utilisé avec QFieldCloud ;
  les copies disparaissent si le projet est supprimé de QField.
- **Nom de zip au registre** : un nom simple, sans `/` ni `..` ; une entrée qui ne
  l'est pas (registre trafiqué) est retirée du registre sans qu'aucun fichier soit effacé ;
  un `cerf_id` qui n'est pas un UUID fait refuser le projet, et rien n'est écrit ni effacé
  (Pascal, 3 novembre 2026, sur proposition des tests de la mission 007).
- **Zip réimporté sous le même nom** : la nouvelle copie remplace l'ancienne ; les couches
  vecteur sont **réécrites** (ADR 0008) ; les GeoTIFF du registre qui en viennent sont
  rechargés. Le sort du dossier `cerf-imports/<nom du zip>/` au réimport reste une question
  ouverte (mission 014, ADR 0007 amendée). **Ancien `.qml`** : effacé avant l'écriture de la
  nouvelle copie, voir § 5.
- **Zip absent à l'ouverture** (carte SD retirée, copie effacée) : ne vaut plus que pour les
  **GeoTIFF** et les anciennes entrées (`chemin_vsi`) : l'entrée **reste** au registre ; un
  message unique dit « 2 couches n'ont pas pu être rechargées : zip absent » ; l'agent peut
  les retirer. Pour un **vecteur**, le message est « copie absente (réimporter le zip) ».
- **Amendement du 4 novembre 2026 (ADR 0008, décision de Pascal)** :
  - **Vecteurs réécrits** : à l'import, chaque couche vecteur est ouverte en `/vsizip/`,
    contrôlée (§ 4), réécrite par `saveVectorLayerAs` en GeoPackage dans
    `cerf-imports/<nom du zip>/` (une table par fichier), son `.qml` écrit à côté (§ 5), puis
    chargée. **Pour l'agent** : un Shapefile (ou un GeoJSON) apparaît comme un GeoPackage, en
    lecture seule ; les couleurs et étiquettes du manuel sont posées par ce `.qml`. Un
    GeoPackage à plusieurs tables donne un fichier par table.
  - **Copie du zip gardée**, avec les fichiers réécrits : la **place prise** est celle du zip
    plus celle des couches (à peu près le double pour les vecteurs). Le zip réimporté remplace
    la couche réécrite. Les GeoTIFF restent lus dans le zip, style par défaut.
  - **Retrait** : efface aussi les `.gpkg`, `.qml` et annexes (`-wal`, `-shm`, `.aux.xml`) de
    la couche, toujours et seulement dans `cerf-imports/` (ADR 0007 amendée).
- **QField désinstallé ou appareil perdu** : registre et copies disparaissent. Accepté :
  les couches sont en lecture seule, le zip d'origine reste chez JFC.

### 3.4 Fonds de carte (ADR 0002)

| Fond | Couche Géoplateforme | Format | Clé |
|---|---|---|---|
| Plan IGN v2 | `GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2` | PNG | non |
| BD ORTHO | `ORTHOIMAGERY.ORTHOPHOTOS` | JPEG | non |
| SCAN 25 | seulement si JFC confirme licence et clé ONF | — | voir ci-dessous |

- Zoom maximal de chaque couche XYZ fixé à la limite annoncée par la Géoplateforme (à
  fournir par l'`acquereur`), pour éviter les tuiles vides.
- Attribution « © IGN » affichée, selon la licence des données (à vérifier par
  l'`acquereur`).
- SCAN 25 : la clé se placerait dans l'URL, donc dans le `.qgz`. Si le SCAN 25 entre, le
  mécanisme est à décrire dans une ADR ; **aucune clé dans le dépôt**.
- Fond embarqué de repli : **pas en tranche 1**, sauf si l'essai à J+2 (critère 5) échoue
  (§ 9, n° 5).

### 3.5 Couche de saisie (amendement du 3 novembre 2026)

- **Fichier** : `saisie.gpkg`, à côté de `cerf.qgz` (même dossier), chemin relatif dans le
  projet. Une table `saisie_terrain`, géométrie **Point**, **EPSG:2154**, vide à la
  livraison.
- **Couche** : nommée « Saisie terrain », **modifiable**, au-dessus du groupe « Fonds de
  carte ». Les couches importées restent en lecture seule (§ 3.3).
- **Champs** :

  | Champ | Type | Saisie | Remarque |
  |---|---|---|---|
  | `fid` | entier, clé | automatique | clé du GeoPackage |
  | `essence` | texte | libre | texte libre en tranche 1 (pas de liste de valeurs sans référentiel ONF ; Pascal, 3 novembre 2026) |
  | `diametre` | entier (cm) | libre, ≥ 0 | centimètres entiers (Pascal, 3 novembre 2026) |
  | `remarque` | texte | libre, facultatif | |
  | `date` | date et heure | **automatique** à la création (`now()`), modifiable | |

- **Champs facultatifs** : `essence`, `diametre` et `remarque` peuvent rester vides (pas de
  NOT NULL) : avec des gants, l'agent pose d'abord le point et remplit ensuite (Pascal,
  3 novembre 2026).
- **Contrainte** : `"diametre" IS NULL OR "diametre" >= 0`, posée comme contrainte QGIS
  **bloquante** (force forte) sur le champ dans `cerf.qgz` : QField refuse un diamètre
  négatif mais laisse poser un point sans diamètre (Pascal, 3 novembre 2026 ; dans QGIS,
  `"diametre" >= 0` seul juge un diamètre vide faux).
- **Style** : celui de la règle ProdBois / Relevés (§ 5), puisque la couche a `essence`
  et `diametre` ; enregistré dans `cerf.qgz`, pas appliqué par le plugin.
- **Retour au bureau** : copie de `saisie.gpkg` (câble USB ou partage de QField) ; pas de
  QFieldCloud, pas d'export par le plugin.
- **Mise à jour du projet modèle** : une nouvelle version de `cerf.qgz` ne doit **pas**
  écraser un `saisie.gpkg` déjà rempli sur l'appareil ; le zip du projet modèle et la
  notice le disent (à préciser par la mission qui livre la couche).
  **Décision de Pascal du 4 novembre 2026** (mission 028, `pilotage/journal.md`) : la mise à
  jour du projet se fait par **copie de `cerf.qgz` à la main** (câble USB), à partir de
  `projet-cerf-mise-a-jour.zip`, sans flashcode.

## 4. Contrôles à l'import (ADR 0004)

Dans l'ordre, pour chaque couche du zip ; le premier qui échoue arrête la couche :

1. **Shapefile incomplet** : `.prj` absent → refus « Serre EA/réf/Parcelles.shp : fichier .prj
   manquant, système de coordonnées inconnu » (le nom est le chemin complet dans le zip, voir
   plus bas). `.shx` ou `.dbf` absent → refus
   « UG.shp : fichier .shx manquant, couche non chargée » (même forme pour `.dbf` ; Pascal,
   4 novembre 2026). `.cpg` absent → chargement avec avertissement « accents peut-être mal
   lus ». Un Shapefile vide sans `.prj` est refusé (contrôle 1 avant le contrôle 4).
2. **Lecture** : la source ne s'ouvre pas → refus « illisible ».
3. **Système invalide** (GeoTIFF sans géoréférencement, `.prj` illisible) → refus
   « système de coordonnées inconnu ».
4. **Couche vide** → avertissement, chargée quand même, **sans** contrôle d'emprise.
5. **Vraisemblance** : l'emprise de la couche, reprojetée en EPSG:2154 (bords densifiés),
   doit être **contenue** dans l'emprise de la terre ferme de France métropolitaine en
   Lambert 93, élargie de 10 km : **X 89 101 → 1 252 436, Y 6 036 555 → 7 120 480** (mesuré avec
   PROJ 9.8.1 par la mission 002, `docs/referentiels/emprise-metropole.json` ; retenu par
   Pascal le 2 novembre 2026). Limite acceptée : Jersey et Genève sont dans le rectangle. Sinon refus : « Coordonnées
   incohérentes : système mal déclaré ? ». **Toute erreur de reprojection vaut refus.**
   Couvre le GeoJSON en Lambert 93 lu en WGS84 et l'inversion des axes.

**Pas de chargement forcé** : l'agent ne peut pas passer outre un refus (§ 9, n° 7).

**Nom de la couche dans les messages** : chaque refus et chaque avertissement (tous les
contrôles ci-dessus, tous les avertissements) commence par le **chemin complet de la couche,
avec son extension, tel qu'il est dans le zip** : « FRT.shp : … » à la racine,
« Serre EA/réf/Parcelles.shp : … » dans des dossiers ; pour une table de GeoPackage,
« d/Serre.gpkg/Releves : … » (chemin du `.gpkg`, puis `/table`) ; un zip peut en contenir
plusieurs et deux dossiers peuvent porter des fichiers de même nom (Pascal, 4 novembre 2026,
qui précise l'arbitrage du même jour sur le nom avec extension).

**GeoPackage sans table lisible** (Pascal, 4 novembre 2026) :
- tables illisibles → refus « `<chemin>.gpkg` : tables illisibles, couche non
  chargée » (exemple : « dossier/a.gpkg : tables illisibles, couche non chargée »). Ce message
  couvre aussi la liste des tables impossible à obtenir et le GeoPackage à **table attributaire
  seule** (sans géométrie) (Pascal, 4 novembre 2026, « oui aux trois ») ;
- aucune table vecteur → refus « `<chemin>.gpkg` : aucune table vecteur, couche non chargée ».
  Accepté tel quel (Pascal, 5 novembre 2026) mais **probablement inatteignable** : la requête de
  lecture exige la couche 0 que la sonde ouvre (QGIS `qgsogrprovider.cpp` l. 4513-4523).
- Dans les deux cas, le fichier n'est **jamais ouvert sans `layername`** (QGIS ouvrirait la
  première table en silence) et n'est **jamais ignoré en silence** ; les autres couches du zip
  sont traitées. Ce n'est pas le contrôle 1 (qui vise le Shapefile incomplet).
- **Lecture des tables, tranchée** (mission 024, plugin 0.4.0) : voie 1 du prototype n° 4, une
  requête `SELECT … FROM gpkg_contents` sur le GeoPackage, hors ligne. **Pas encore prouvée sur
  l'appareil** (Samsung) : `essai-tables-z.zip` reste à essayer ; en cas d'échec, « tables
  illisibles ».

**Zip sans aucune couche** : le message est « Aucune couche GeoJSON, Shapefile, GeoPackage ou GeoTIFF dans
`<nom du zip>`. » (Pascal, 4 novembre 2026 ; texte du code, `plugin/cerf-logique.mjs`).
Un zip déjà importé qui n'a plus aucune couche lisible n'est pas vidé : « aucune couche lisible dans
`<nom du zip>`, rien changé ».

**Deux couches de même nom dans deux dossiers du zip** (`a/UG.geojson`, `b/UG.geojson`) : elles
donneraient la même copie `cerf-imports/<zip sans .zip>/UG.gpkg` et le même `UG.qml`. C'est le refus
de la seconde (décision n° 4 du plan de la mission 008, validée par Pascal le 3 novembre 2026) qui
empêche cette collision : « `<chemin de la seconde>` : nom de couche en double dans le zip (déjà
pris par `<chemin de la première>`) ». Texte : `plugin/cerf-logique.mjs`, fonction `importerZip` ; test : `tests/controles-branchement.test.mjs`.

**Refus à la copie dans `cerf-imports/`** (après les contrôles ci-dessus, avant le `.qml`, § 5).
Textes de `plugin/cerf-logique.mjs`, fonction `copierEtStyler` (ils font foi, pas la spec) ; le nom en tête suit la règle ci-dessus :
- « `<chemin>` : nom non écrivable dans cerf-imports/, couche refusée » ;
- « `<chemin>` : copie impossible (écriture refusée par QField), couche refusée » ;
- « `<chemin>` : copie écrite hors de cerf-imports/, couche refusée » ;
- « `<chemin>` : copie illisible après réécriture, couche refusée ».

## 5. Styles (annexe de la convention du zip)

Ordre de priorité (en vigueur) : règle par nom → règle par champs → style par défaut de QGIS.

**`.qml` posé dans le zip : non pris en charge pour l'instant** (Pascal, 5 novembre 2026).
`FileUtils.readFileContent` de QField (4.3.7, `qffileutils.cpp` l. 620-636), la fonction qui lit un
fichier texte, ne lit pas dans `/vsizip/` (les couches du zip, elles, sont lues par GDAL) : le plugin tente la lecture, n'obtient rien, traite le `.qml` comme illisible, applique
la règle du manuel et avertit « UG.shp : .qml illisible, style du manuel appliqué ». Un `.qml`
valide du zip n'est donc jamais appliqué. La surcharge par `.qml` du zip est **reportée, non
abandonnée** : l'ordre visé reste `.qml` du zip → règle par nom → règle par champs → défaut.
*Texte d'origine (3 novembre 2026), devenu faux pour la lecture, gardé pour mémoire : le `.qml` du
zip est lu, contrôlé, puis écrit à côté de la copie réécrite.* Le mécanisme d'écriture à côté de la
copie (amendement ci-dessous) vaut pour le `.qml` de la règle du manuel.

**Amendement du 4 novembre 2026 (ADR 0008)** : pour un vecteur, le plugin **écrit le `.qml`
retenu** (celui de la règle du manuel ; celui du zip, contrôlé, quand sa lecture sera possible) **à côté du GeoPackage réécrit,
avant le chargement** ; QGIS l'applique alors seul, et le garde à la réouverture. Un `.qml`
écrit après le chargement serait ignoré. Une table, un `.qml` (`UG.qml` à côté de la table `UG`).
Un GeoTIFF lu dans le zip n'a pas de style du manuel.

**Ancien `.qml` voisin** (Pascal, 4 novembre 2026) : avant toute écriture, le plugin **efface
l'ancien `.qml`** à côté de la copie (un `.qml` resté d'un import précédent s'appliquerait en
silence), **puis vérifie qu'il a disparu**, qu'il y ait ou non un style à poser.
- Il ne s'efface pas → couche **refusée** : « `<chemin>` : ancien style (.qml) impossible à
  effacer, couche refusée ».
- L'écriture rate ou est interrompue → le `.qml` est effacé et la couche est **chargée avec le
  style par défaut**, avec l'avertissement « style non écrit, couche chargée avec le style par
  défaut ».
- Le `.qml` mal écrit ne s'efface pas non plus → couche **refusée** : « `<chemin>` : style (.qml)
  mal écrit et impossible à effacer, couche refusée ».
Le nom de ces messages suit la règle du § 4 (chemin complet dans le zip). Les textes sont ceux du
code de la mission 010 (`plugin/cerf-logique.mjs`, `copierEtStyler`, commit d7f9f2e).

Le motif s'applique au nom de la couche sans extension, sans tenir compte de la casse ni
des accents.

**Règles par nom réservées aux polygones** : une couche nommée UG, Parcelles ou FRT mais
ponctuelle ou linéaire, sans les champs `essence` et `diametre` (sinon elle prend le style
ProdBois, sans avertissement), garde le style par défaut, avec l'avertissement « nom reconnu mais
pas un polygone » (Pascal, 4 novembre 2026). **Champs `essence` et `diametre`** reconnus
sans tenir compte de la casse ni des accents (`diamètre`, Pascal, 4 novembre 2026) (`ESSENCE`, `Diametre`…) ; l'étiquette utilise le nom réel
du champ (Pascal, 4 novembre 2026). **GeoPackage** : le nom comparé aux motifs est celui de
la **table** (un `Serre.gpkg` avec les tables `UG` et `Parcelles` donne deux couches
stylées ; le `.qml` d'une table porte son nom, `UG.qml`). **`.qml` vide ou illisible** : il
est ignoré, la règle par nom (ou le style par défaut) s'applique, avec l'avertissement
« .qml illisible, style du manuel appliqué » (Pascal, 4 novembre 2026).

| Règle | Motif | Géométrie | Symbole | Étiquette |
|---|---|---|---|---|
| UG | `^ug([_\- ].*)?$` | polygone | contour seul `#0000FF`, 0,6 mm, opacité 100 %, sans remplissage | champ du code UG, police taille **10 pt**, couleur `#0000FF` |
| Parcelles | `^parcelles?([_\- ].*)?$` | polygone | contour seul `#FF8C00`, 1 mm, opacité 100 %, sans remplissage | champ du code parcelle, police taille **15 pt**, couleur `#FF8C00` |
| FRT | `^frt([_\- ].*)?$` | polygone | contour seul `#008B8B`, 0,6 mm, opacité 100 %, sans remplissage | champ du code FRT, police taille **10 pt**, couleur `#008B8B` |
| ProdBois / Relevés | toute couche ponctuelle ayant les champs `essence` **et** `diametre` | point | cercle noir plein, 2 mm | `"essence" \|\| '\n' \|\| "diametre"`, police taille 8 pt, noire, liseré blanc |

Source : **les couleurs et les tailles de police sont celles du mail de JFC**, à
respecter telles quelles (Pascal, 2 novembre 2026) ; il n'existe pas d'autre référence des
styles. La couleur de chaque couche vaut pour le contour **et** pour l'étiquette. Le
contour seul, les épaisseurs, le symbole et l'étiquette des points, les motifs de noms ont
été proposés par Claude et retenus par Pascal le 2 novembre 2026. **Famille de police** :
celle que nomme le mail de JFC ; le mail n'est pas dans le dépôt, à y verser
(`docs/sources/`) ; à défaut, la police par défaut de QField. Les noms des champs de code
restent à lire dans les fichiers de JFC.

**Étiquette ProdBois** : avec `||`, l'étiquette disparaît si un des deux champs est vide.
Question posée à JFC (§ 9, n° 8) : `concat("essence", '\n', "diametre")` lui convient-il ?
En attendant sa réponse, l'expression du mail est gardée.

## 6. Critères d'acceptation

Protocole retenu par Pascal (brief, arbitrage 7). Chacun est un test de recette ; ceux
marqués « (auto, logique seule) » ont aussi un test automatique sur la logique du plugin
(ADR 0005), l'appel à QField restant vérifié en recette.

1. Mode avion, `cerf.qgz` déjà ouvert, zip `Serre_EA2026` déjà copié : **du toucher sur le
   bouton du plugin** à l'affichage des 4 couches stylées, **≤ 2 min, médiane de 3
   essais**, copie du zip par Android comprise, sur **smartphone Samsung** (Pascal,
   2 novembre 2026 ; modèle et version de QField notés le jour de la recette).
2. Couleurs et étiquettes du § 5 présentes sans aucun réglage. (auto, logique seule)
3. Superposition au fond IGN **à moins de 5 m** d'un repère connu (repère à fournir par
   JFC).
4. Après **redémarrage de l'appareil**, les 4 couches reviennent. (auto, logique seule)
5. Fond IGN visible hors ligne sur une zone parcourue **la veille, puis à J+2** (le cache
   de QGIS expire par défaut au bout de 24 h). Échec à J+2 → fond embarqué de repli.
6. Zip `piege`, chaque piège donne un message clair et aucune couche n'est chargée de
   travers : GeoJSON en Lambert 93 **sans membre `crs`** ; Shapefile sans `.prj` ; GeoTIFF
   sans géoréférencement ; couche au nom non reconnu (chargée avec le style par défaut) ;
   couche vide (avertissement). (auto, logique seule)
7. Zip `lourd` : un GeoTIFF de 200 Mo rangé sans compression et un GeoPackage de deux
   couches ; temps d'affichage mesuré et noté (§ 9, n° 6).
8. Retirer une couche : elle ne revient pas à la réouverture. (auto, logique seule)
9. Projet sans `cerf_id` : le plugin n'affiche pas son bouton et ne fait rien. (auto,
   logique seule)
10. Mode avion, `cerf.qgz` ouvert : ajouter trois points dans « Saisie terrain » avec
    essence et diamètre ; ils s'affichent au style ProdBois, `date` est remplie seule ;
    après redémarrage de l'appareil ils sont toujours là ; `saisie.gpkg` copié sur un PC
    s'ouvre dans QGIS avec les trois points en Lambert 93. (§ 3.5 ; amendement du
    3 novembre 2026)

## 7. Hors périmètre (tranche 1)

Saisie dans les couches importées (la saisie se fait dans « Saisie terrain », § 3.5) ;
synchronisation QFieldCloud de ces couches ; outil
bureau pour fabriquer le zip ; import d'un dossier (seul le zip est pris) ; lien direct
avec ProdBois, Relevés ou Canopée ; outre-mer ; sorties pour la commission et les
affouagistes ; cadastre, MNH, pentes ; chargement forcé d'une couche refusée ; fond
embarqué (sauf échec à J+2).

## 8. Besoins en référentiels (pour l'`acquereur`)

1. Schéma réel de l'export ProdBois, de Relevés, de Canopée, des couches UG, Parcelles,
   FRT (noms et types de champs, système de coordonnées).
2. Le mail de JFC (couleurs, tailles, famille de police), à verser dans `docs/sources/`.
3. URL XYZ exactes des deux fonds sur `data.geopf.fr`, zoom maximal, en-têtes de cache,
   licence et attribution ; conditions d'accès au SCAN 25.
4. Emprise de la terre ferme de France métropolitaine en Lambert 93, calculée avec PROJ
   (§ 4).
5. API des plugins QField (version minimale, sélecteur de fichiers, `/vsizip/`, listage
   d'un zip, effacement d'un fichier, `Settings`, variables de projet, menu de la
   couche) : à confirmer par le prototype n° 1.

## 9. Arbitrages de Pascal sur la critique de la spec (2 novembre 2026)

1. Si le plugin ne peut pas lister le zip hors du dossier projet : le zip est posé
   **dans** le dossier projet (retour sur l'arbitrage 6 du brief ; pas de QFieldCloud avec
   Cerf), et l'on demande à QField d'exposer le listage d'un zip aux plugins.
2. Si l'effacement d'un `.zip` est impossible : la copie reste sur l'appareil, son nom
   est affiché (valeur sacrifiée : la place).
   Au retrait d'une couche, si un fichier réécrit de la couche (`.gpkg`, `.qml`, `-wal`, `-shm`,
   `.aux.xml`) ne peut pas être effacé : « Fichiers restés sur l'appareil : <noms>. » (noms des
   fichiers réellement restés ; arbitrage de Pascal, 4 novembre 2026, mission 031). Même ligne
   au réimport d'un zip, pour une couche sortie du registre dont un fichier résiste. Si le service
   `existe` est absent (retrait comme réimport), aucun fichier de couche n'est effacé et le message
   dit : « Effacement non vérifiable : fichiers peut-être restés. » (la copie du zip garde sa règle :
   effacée à la dernière couche).
3. **Un seul `cerf.qgz` par appareil** pour toutes les forêts.
4. Licence **GPL-3.0-or-later** ; aucune ligne recopiée de `qfield-layer-loader` ni de
   `qfield_addLayer` ; **le code est à Pascal**.
5. Pas de fond embarqué en tranche 1 ; essai à J+2 dans la recette ; s'il échoue, on le
   prépare.
6. Recette avec un GeoTIFF de 200 Mo et un GeoPackage ; GeoTIFF rangé dans le zip sans
   compression.
7. Pas de chargement forcé d'une couche refusée (valeur sacrifiée : l'autonomie de
   l'agent).
8. Demander à JFC si `concat("essence", '\n', "diametre")` lui convient.

## 10. Résultat du prototype n° 1 (Pascal, Samsung, 3 novembre 2026)

Essai de la mission 004 suivant `tests/recette/prototype-1.md` (branche
`mission/004-prototype-1`) : **oui aux questions 1 à 4**, et aux autres.

- **Q1 lister** : la copie faite **hors du dossier projet** (bouton A) est listée,
  9 entrées sur 9. Le code de QField 4.3.7 laissait prévoir un refus : écart noté au
  journal. → le repli de la spec § 9 n° 1 **ne s'applique pas** ; l'arbitrage 6 du brief
  tient (copies hors du dossier projet).
- **Q2 copier** : oui.
- **Q3 effacer** : `FileUtils.deleteFiles` refuse le `.zip`, `platformUtilities.rmFile`
  l'efface, « zip absent ». → le repli § 9 n° 2 **ne s'applique pas**, mais l'effacement
  dépend de `rmFile`, fonction sans contrôle que QField annonce vouloir déplacer : ADR à
  trancher par Pascal.
- **Q4 module `.mjs`** : chargé dans QField (5 et `cerf-prototype-1`). → ADR 0005
  confirmée.

### Correction du 3 novembre 2026 (essai du squelette, mission 008)

Le résultat Q1 ci-dessus est **faux** : à l'essai du squelette (Cerf 0.1.0, QField v4.3.7,
Samsung de Pascal), la lecture d'une copie hors du dossier projet est **refusée** (0 octet),
comme le prévoyait le code de QField (`readFileContent`, `qffileutils.cpp` L620-628). La
copie listée à l'essai du prototype était vraisemblablement celle du bouton B, dans le
projet. → le repli § 9 n° 1 **s'applique** (validé par Pascal le 3 novembre 2026) ; les
autres résultats (Q2 à Q4) tiennent.

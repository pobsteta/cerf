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
| 3 | Toucher le bouton « Ajouter un zip » (barre d'outils des plugins). | Ouvre le sélecteur de fichiers Android. | non |
| 4 | Choisir le zip. | Copie le zip (§ 3.3), en liste le contenu (prototype n° 1). | non |
| 5 | Cocher les couches à charger (toutes cochées par défaut). | Pour chaque couche : contrôles (§ 4), chargement en lecture seule, style (§ 5), inscription au registre **après chaque couche**. Un message par couche refusée. | non |
| 6 | Regarder la carte. | Couches aux couleurs du manuel, étiquettes essence/diamètre sur ProdBois. | non |
| 7 | Retirer une couche, depuis le panneau du plugin (ou le menu de la couche, si QField le permet à un plugin). | Retire la couche de la carte et du registre. La copie du zip est effacée quand plus aucune couche ne s'en sert **si QField le permet** ; sinon elle reste et son nom est affiché (§ 9, n° 2). | non |
| 8 | Fermer, rouvrir le projet, ou redémarrer l'appareil. | Étape 2 : tout revient. | non |

Contraintes de geste : gants et soleil. Boutons d'au moins 9 mm de côté, textes
contrastés, pas de geste fin (valeur à confirmer sur l'appareil par l'`afficheur`).
Le plugin n'affiche pas son bouton hors d'un projet Cerf.

## 2. Livrables

1. `cerf.qgz` : projet modèle vide de données métier, en Lambert 93 (EPSG:2154), avec
   les deux fonds XYZ (ADR 0002) et la variable de projet `cerf_id` (§ 3.3).
2. Le plugin QField d'application, en zip installable par URL (ADR 0001), sous
   GPL-3.0-or-later (ADR 0006), code entièrement écrit pour Cerf.
3. `docs/convention-zip.md` : une page, plus l'annexe des styles (§ 5).
4. `docs/notice-jfc.md` : trois pages ; préparer le zip depuis QGIS (ProdBois, Relevés,
   Canopée), le copier sur l'appareil.
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
- Les `.qml` servent aux styles (§ 5). Les fichiers annexes (`.tfw`, `.aux.xml`, `.sbn`,
  `.sbx`, `.qix`) sont lus avec leur couche, sans message. Tout autre fichier est ignoré
  en silence.
- Lu sans décompression, par `/vsizip/` (ADR 0003). Une couche illisible ne fait pas
  échouer les autres.
- Noms accentués dans un zip fait par l'explorateur Windows (codage CP437) : à tester au
  prototype n° 1 ; la notice conseille un zip fait par QGIS ou 7-Zip.

### 3.2 Les sources métier

| Source | Format attendu | Champs connus | État |
|---|---|---|---|
| Export ProdBois | GeoJSON, **en WGS84** (Pascal, 2 novembre 2026) | `essence`, `diametre` (supposés) | schéma des champs : **à fournir** (`Serre_EA2026_p5_13_30.geojson` brut) |
| Relevés | à fournir | à fournir | à fournir |
| UG, Parcelles, FRT | Shapefile (cas de test) ou GeoPackage | champ du code : à fournir | à fournir |
| Canopée | Shapefile | à fournir | à fournir |

Ces référentiels sont à rassembler par l'`acquereur` (§ 8).

### 3.3 Registre et copies (ADR 0003)

- **Identifiant de projet** : une variable de projet `cerf_id` (UUID) écrite dans
  `cerf.qgz` par QGIS ; le plugin la lit, ne l'écrit jamais. Le plugin n'agit que si elle
  existe. **Un seul `cerf.qgz` par appareil** : pas de consigne de changer `cerf_id`.
- **Registre** : dans les réglages de QField (`Settings`), clé `cerf/<cerf_id>`, valeur
  JSON : liste de `{ zip, couche, chemin_vsi, style, ajoutee_le }`, **chemins relatifs** au
  dossier des copies. Écrit après chaque couche chargée. Le registre s'accumule d'une forêt
  à l'autre ; l'agent retire ce qui ne sert plus.
- **Copies** : dans `<dossier de l'application>/Imported Datasets/cerf/<cerf_id>/`, hors
  du dossier projet, **si le prototype n° 1 montre que QField le permet**. Sinon, dans le
  dossier projet (§ 9, n° 1) : Cerf n'est alors pas utilisé avec QFieldCloud.
- **Zip réimporté sous le même nom** : la nouvelle copie remplace l'ancienne ; les couches
  du registre qui en viennent sont rechargées.
- **Zip absent à l'ouverture** (carte SD retirée, copie effacée) : l'entrée **reste** au
  registre ; un message unique dit « 2 couches n'ont pas pu être rechargées : zip absent » ;
  l'agent peut les retirer.
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

## 4. Contrôles à l'import (ADR 0004)

Dans l'ordre, pour chaque couche cochée ; le premier qui échoue arrête la couche :

1. **Shapefile incomplet** : `.prj` absent → refus « Parcelles.shp : fichier .prj
   manquant, système de coordonnées inconnu ». `.cpg` absent → chargement avec
   avertissement « accents peut-être mal lus ».
2. **Lecture** : la source ne s'ouvre pas → refus « illisible ».
3. **Système invalide** (GeoTIFF sans géoréférencement, `.prj` illisible) → refus
   « système de coordonnées inconnu ».
4. **Couche vide** → avertissement, chargée quand même, **sans** contrôle d'emprise.
5. **Vraisemblance** : l'emprise de la couche, reprojetée en EPSG:2154 (bords densifiés),
   doit être **contenue** dans l'emprise de la terre ferme de France métropolitaine en
   Lambert 93, élargie de 10 km (X 89 000 → 1 253 000, Y 6 039 000 → 7 121 000 ; calcul
   approché, **à vérifier par l'`acquereur` avec PROJ**). Sinon refus : « Coordonnées
   incohérentes : système mal déclaré ? ». **Toute erreur de reprojection vaut refus.**
   Couvre le GeoJSON en Lambert 93 lu en WGS84 et l'inversion des axes.

**Pas de chargement forcé** : l'agent ne peut pas passer outre un refus (§ 9, n° 7).

## 5. Styles (annexe de la convention du zip)

Ordre de priorité : `.qml` de même nom que la couche dans le zip → règle par nom → règle
par champs → style par défaut de QGIS. Le `.qml` posé dans le zip est lu par le plugin
lui-même (QGIS ne le trouve pas seul derrière `/vsizip/`).

Le motif s'applique au nom de la couche sans extension, sans tenir compte de la casse ni
des accents.

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

## 7. Hors périmètre (tranche 1)

Saisie dans les couches importées ; synchronisation QFieldCloud de ces couches ; outil
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

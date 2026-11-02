# Cerf — spécification, tranche 1

> Rédigée par Claude (orchestrateur) le 2 novembre 2026 à partir de `docs/brief.md`
> (arbitrages de Pascal du même jour). **Statut : proposée, à valider par Pascal (porte
> n° 1).** Ce qui n'est pas tranché s'écrit « à trancher par Pascal » ; ce qui manque
> s'écrit « à fournir ». Les décisions structurantes sont dans `docs/adr/`.

## 1. Parcours de l'agent sur le terrain

| # | Geste | Ce que fait Cerf | Réseau |
|---|---|---|---|
| 0 | Une fois par appareil : installer le plugin par son URL. | QField installe le plugin d'application (ADR 0001). | oui |
| 1 | Au bureau ou la veille : copier le zip sur la appareil ; ouvrir le projet modèle sur la zone du jour. | Les tuiles XYZ consultées sont mises en cache (ADR 0002). | oui |
| 2 | Sur le terrain : ouvrir le projet modèle `cerf.qgz`. | Le plugin reconnaît un projet Cerf (identifiant de projet, § 3.3) et recharge les couches de son registre. | non |
| 3 | Toucher le bouton « Ajouter un zip ». | Ouvre le sélecteur de fichiers Android. | non |
| 4 | Choisir le zip. | Copie le zip hors du dossier projet (§ 3.3), en liste le contenu. | non |
| 5 | Cocher les couches à charger (toutes cochées par défaut). | Pour chaque couche : contrôles (§ 4), chargement en lecture seule, style (§ 5), inscription au registre. Un message par couche refusée. | non |
| 6 | Regarder la carte. | Couches aux couleurs du manuel, étiquettes essence/diamètre sur ProdBois. | non |
| 7 | Retirer une couche (appui sur la couche, « Retirer »). | Retire la couche de la carte et du registre ; la copie du zip est supprimée quand plus aucune couche ne s'en sert. | non |
| 8 | Fermer, rouvrir le projet, ou redémarrer la appareil. | Étape 2 : tout revient. | non |

Contraintes de geste : gants et soleil. Boutons d'au moins 9 mm de côté, textes
contrastés, pas de geste fin (valeur à confirmer sur appareil par l'`afficheur`).

## 2. Livrables

1. `cerf.qgz` : projet modèle vide de données métier, en Lambert 93 (EPSG:2154), avec
   les deux fonds XYZ (ADR 0002) et l'identifiant de projet Cerf (§ 3.3).
2. Le plugin QField d'application, en zip installable par URL (ADR 0001).
3. `docs/convention-zip.md` : une page, plus l'annexe des styles (§ 5).
4. `docs/notice-jfc.md` : trois pages ; préparer le zip depuis QGIS (ProdBois, Relevés,
   Canopée), le copier sur la appareil.
5. Deux zips de recette : `Serre_EA2026` (à fournir par JFC) et `piege` (§ 6).

## 3. Données manipulées

### 3.1 Le zip d'entrée

- Contient une ou plusieurs couches, à la racine ou dans des sous-dossiers.
- Formats : GeoJSON (`.geojson`, `.json`), GeoPackage (`.gpkg`, une couche par table),
  Shapefile **complet** (`.shp`, `.shx`, `.dbf`, `.prj`, `.cpg`), GeoTIFF (`.tif`,
  `.tiff`). Tout autre fichier est ignoré, sauf les `.qml` (§ 5).
- Lu sans décompression, par `/vsizip/` (ADR 0003). Une seule couche introuvable ou
  illisible ne fait pas échouer les autres.

### 3.2 Les sources métier

| Source | Format attendu | Champs connus | État |
|---|---|---|---|
| Export ProdBois | GeoJSON, **en WGS84** (Pascal, 2 novembre 2026), conforme à RFC 7946 | `essence`, `diametre` (supposés) | schéma des champs : **à fournir** (`Serre_EA2026_p5_13_30.geojson` brut) |
| Relevés | à fournir | à fournir | à fournir |
| UG, Parcelles, FRT | Shapefile (cas de test) ou GeoPackage | champ du code : à fournir | à fournir |
| Canopée | Shapefile | à fournir | à fournir |

Ces référentiels sont à rassembler par l'`acquereur` (§ 8).

### 3.3 Registre et copies (ADR 0003)

- **Identifiant de projet** : une variable de projet `cerf_id` (UUID) écrite dans
  `cerf.qgz`. Le plugin n'agit que si elle existe. Un projet copié pour une autre forêt
  reçoit un nouvel identifiant (consigne de la notice).
- **Registre** : dans les réglages de QField (`Settings`), clé `cerf/<cerf_id>`, valeur
  JSON : liste de `{ zip, couche, chemin_vsi, style, ajoutee_le }`.
- **Copies** : dans `<dossier de l'application>/Imported Datasets/cerf/<cerf_id>/`, **jamais
  dans le dossier projet**.
- **Fichier disparu** : à l'ouverture, une entrée dont le zip n'existe plus est retirée
  du registre et signalée par un message unique (« 2 couches n'ont pas pu être
  rechargées : zip absent »).
- **QField désinstallé ou appareil perdue** : registre et copies disparaissent. Accepté :
  les couches sont en lecture seule, le zip d'origine reste chez JFC.

### 3.4 Fonds de carte (ADR 0002)

| Fond | Couche Géoplateforme | Format | Clé |
|---|---|---|---|
| Plan IGN v2 | `GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2` | PNG | non |
| BD ORTHO | `ORTHOIMAGERY.ORTHOPHOTOS` | JPEG | non |
| SCAN 25 | seulement si JFC confirme licence et clé ONF | — | saisie sur l'appareil, jamais dans le dépôt |

## 4. Contrôles à l'import (ADR 0004)

Dans l'ordre, pour chaque couche cochée ; le premier qui échoue arrête la couche :

1. **Shapefile incomplet** : `.prj` absent → refus « Parcelles.shp : fichier .prj
   manquant, système de coordonnées inconnu ». `.cpg` absent → chargement avec
   avertissement « accents peut-être mal lus ».
2. **Lecture** : la source ne s'ouvre pas → refus « illisible ».
3. **Vraisemblance** : l'emprise de la couche, reprojetée en EPSG:2154, doit être
   **contenue** dans l'emprise de la France métropolitaine en Lambert 93, élargie de
   10 km (X 89 000 → 1 253 000, Y 6 039 000 → 7 121 000 ; d'après le domaine de
   validité d'EPSG:2154, [epsg.io/2154](https://epsg.io/2154), à vérifier par
   l'`acquereur`). Sinon refus : « Coordonnées incohérentes : système mal déclaré ? ».
   Couvre le GeoJSON en Lambert 93 lu en WGS84 et l'inversion des axes.
4. **Couche vide** → avertissement, chargée quand même.

## 5. Styles (annexe de la convention du zip)

Ordre de priorité : `.qml` de même nom que la couche dans le zip → règle par nom → règle
par champs → style par défaut de QGIS.

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

## 6. Critères d'acceptation

Protocole retenu par Pascal (brief, arbitrage 7). Chacun est un test de recette ; ceux
marqués (auto) ont aussi un test automatique.

1. Mode avion, projet fermé, zip `Serre_EA2026` déjà copié : du bouton à l'affichage des
   4 couches stylées, **≤ 2 min, médiane de 3 essais**, sur **smartphone Samsung** (Pascal,
   2 novembre 2026 ; modèle et version de QField à noter le jour de la recette).
2. Couleurs et étiquettes du § 5 présentes sans aucun réglage. (auto, sur la règle)
3. Superposition au fond IGN **à moins de 5 m** d'un repère connu (repère à fournir par
   JFC).
4. Après **redémarrage de la appareil**, les 4 couches reviennent. (auto, sur le registre)
5. Fond IGN visible hors ligne sur une zone parcourue la veille.
6. Zip `piege` : GeoJSON en Lambert 93 sans système, Shapefile sans `.prj`, nom non
   reconnu → trois messages clairs, aucune couche chargée de travers ; la couche au
   nom non reconnu est chargée avec le style par défaut. (auto)
7. Retirer une couche : elle ne revient pas à la réouverture. (auto)
8. Projet sans `cerf_id` : le plugin ne fait rien. (auto)

## 7. Hors périmètre (tranche 1)

Saisie dans les couches importées ; synchronisation QFieldCloud de ces couches ; outil
bureau pour fabriquer le zip ; lien direct avec ProdBois, Relevés ou Canopée ; outre-mer ;
sorties pour la commission et les affouagistes ; cadastre, MNH, pentes.

## 8. Besoins en référentiels (pour l'`acquereur`)

1. Schéma réel de l'export ProdBois, de Relevés, de Canopée, des couches UG, Parcelles,
   FRT (noms et types de champs, système de coordonnées).
2. Le manuel ONF des styles (référence, unités) ; à défaut, le mail de JFC.
3. URL XYZ exactes des deux fonds sur `data.geopf.fr`, conditions d'usage, niveaux de
   zoom ; conditions d'accès au SCAN 25.
4. Domaine de validité d'EPSG:2154 (emprise du § 4).
5. Licence exacte de `qfield-layer-loader` et de `qfield_addLayer`.
6. API des plugins QField : sélecteur de fichiers, `/vsizip/`, listage d'un zip,
   `Settings`, variables de projet, version minimale.

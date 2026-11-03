# Plan de la mission 021 : couche « Saisie terrain » dans le projet modèle

> Plan rendu avant tout code (fiche 021, « Plan d'abord »), le 3 novembre 2026, par le `dev`.
> Aucun fichier de code, aucun test, ni `cerf.qgz` n'a été touché. Rien ne démarre sans l'accord de Pascal.
> Lecteur visé : Jeff Cerf, le successeur : chaque choix dit pourquoi, et ce qui reste à prouver.

## 0. La mission, redite

Faire écrire par `outils/projet-modele.mjs` un `saisie.gpkg` vide (table `saisie_terrain`, Point, EPSG:2154) et
déclarer dans `cerf.qgz` la couche modifiable « Saisie terrain » au style ProdBois, pour que l'agent ajoute des
points sans réseau sur le terrain et les rapporte au bureau en copiant le fichier ; cible : les 16 tests rouges de
`tests/couche-saisie.test.mjs` au vert **sans les modifier**, et l'essai de Pascal (QGIS, Samsung) pour le reste.

Ce que je ne fais pas : le plugin, un bouton d'export, la notice (`docs/notice-jfc.md`, voir question 4), les tests.

Contrainte lue dans les tests : ils cherchent `saisie.gpkg` et `cerf.qgz` **à la racine du dépôt** (variable
`CERF_RACINE` seulement pour leurs essais jetables). Donc `saisie.gpkg` doit être **versé au dépôt** à côté de
`cerf.qgz` : le produire seulement par la release laisserait la CI rouge.

## 1. Écrire `saisie.gpkg` de façon déterministe (`node:sqlite`)

Constaté dans le conteneur : Node 22.23, SQLite 3.53.4 embarqué ; `rtree` disponible ; **aucune fonction `ST_*`**
(`ST_IsEmpty` : « no such function ») ; ni `ogrinfo`, ni `sqlite3`, ni GDAL : je ne peux pas faire ouvrir le
fichier par GDAL ici. Seuls QGIS (Pascal) et QField le diront.

**Contenu écrit (norme OGC 12-128, GeoPackage 1.3) :**

- `PRAGMA application_id = 0x47504B47` (« GPKG »), `PRAGMA user_version = 10300`, journal `DELETE` (pas de WAL
  dans le fichier livré), `page_size` fixé à 4096.
- `gpkg_spatial_ref_sys` : les trois lignes que la norme impose (`-1` Undefined Cartesian, `0` Undefined
  geographic, `4326` WGS 84) **plus `2154`**, organisation `EPSG`, `organization_coordsys_id` 2154, avec sa
  définition en WKT1 (celle que GDAL écrit : `PROJCS["RGF93 v1 / Lambert-93",GEOGCS["RGF93 v1",…],PROJECTION["Lambert_Conformal_Conic_2SP"],…,AUTHORITY["EPSG","2154"]]`).
  Je l'écris de mémoire ; la norme demande du WKT1 dans `definition` (le WKT2 de `projet-modele.mjs` va dans le
  `.qgs`, pas ici). La définition de 4326 vient de la norme.
- `gpkg_contents` : une ligne `saisie_terrain`, `data_type = 'features'`, `identifier = 'saisie_terrain'`,
  `srs_id = 2154`, **emprise NULL** (table vide), `last_change` figé (`2026-11-03T00:00:00.000Z`, pas l'heure du jour).
- `gpkg_geometry_columns` : `saisie_terrain`, `geom`, `POINT`, `srs_id 2154`, `z = 0`, `m = 0`.
- Table `saisie_terrain` :
  `fid INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, geom POINT, essence TEXT, diametre INTEGER, remarque TEXT, date DATETIME`.
  Aucun `NOT NULL` hors `fid` (champs facultatifs, spec § 3.5). **Zéro ligne.** Pas de `DEFAULT` en base sur `date` :
  le défaut `now()` est celui du projet QGIS (spec § 3.5), un seul endroit pour l'écrire.
- Rien d'autre dans la table : le test refuse tout champ inattendu.

**Ce que je n'écris pas, et pourquoi.** `gpkg_extensions`, `gpkg_ogr_contents` (GDAL la tient si elle existe, sinon
compte les lignes lui-même) et **l'index spatial R-tree** : ses déclencheurs (`rtree_saisie_terrain_geom_insert`, etc.)
appellent `ST_IsEmpty`, `ST_MinX`… que `node:sqlite` n'a pas ; on pourrait les créer (SQLite ne vérifie les
fonctions qu'au déclenchement), mais je ne pourrais pas les essayer ici et un déclencheur faux casserait la
première saisie sur le Samsung. Sans R-tree, le GeoPackage reste valide ; pour quelques centaines de points, la
lenteur est nulle. **Point à regarder dans QGIS** : que GDAL, à la première saisie, n'ajoute pas de lui-même ce
qui manque de façon qui gêne (il sait créer l'index ; je ne peux pas l'affirmer sans l'essayer).

**Déterminisme.** Même contenu logique à chaque exécution (aucune date du jour, aucun UUID). Les **octets** peuvent
tout de même varier d'une version de Node à l'autre : l'en-tête SQLite porte le numéro de version du SQLite qui a écrit
le fichier. Je ne promets donc pas « mêmes octets partout » mais « même contenu partout » : mon test (nouveau fichier
`tests/outil-saisie-gpkg.test.mjs`) compare un **dump logique** (schéma de `sqlite_master`, lignes des tables `gpkg_*`,
pragmas) entre la sortie du script et `saisie.gpkg` du dépôt, et les octets seulement entre deux exécutions du même Node.

**Versé ou produit ?** Versé au dépôt (contrainte des tests ci-dessus), à la racine, **régénérable** :
`node outils/projet-modele.mjs` écrit `cerf.qgz` **et** `saisie.gpkg` (nouvelle option `--gpkg <chemin>`, à côté de
`--sortie`). Le script ne réécrit jamais un `saisie.gpkg` sur un appareil : il ne touche que le dépôt.

## 2. Déclarer la couche dans le `.qgs`

Ajouts à `ecrireQgs`, dans le style de la mission 006 (écrit « comme QGIS 3.x », de mémoire) :

- **`<maplayer type="vector" geometry="Point" readOnly="0" labelsEnabled="1" …>`** : `<id>` dérivé du nom (hash,
  déterministe, comme les fonds), `<datasource>./saisie.gpkg|layername=saisie_terrain</datasource>` (le `|` n'est
  pas encodé ; `./` relatif au dossier du projet ; aucun `..`, aucun chemin absolu), `<layername>Saisie terrain</layername>`,
  `<srs>` EPSG:2154 (le `SRS_2154` existant), `<provider encoding="UTF-8">ogr</provider>`, `<extent>` = l'emprise
  métropole déjà dans le script (la table est vide).
- **Arbre** : un `<layer-tree-layer … providerKey="ogr" source="./saisie.gpkg|layername=saisie_terrain">` **à la
  racine, avant** le groupe « Fonds de carte » (donc au-dessus, hors du groupe) ; `<custom-order enabled="0">` reste
  désactivé (l'ordre suit l'arbre), mais je liste la couche en tête des `<item>` et de `<layerorder>` pour que le test
  d'ordre passe aussi si QGIS le réactive. Le groupe garde ses deux fonds XYZ : non-régression de la 005.
- **Modifiable** : pas de `readOnly`, pas de `<readOnlyLayers>` au projet, `editable="1"` sur `essence`, `diametre`,
  `remarque`, `date` (et `fid` à 0, automatique). Le projet reste `<transaction mode="Disabled"/>`.
- **Champs facultatifs** : `<constraints>` : `fid` en `constraints="3"` (unique + non nul, strength 1) ; `essence`,
  `remarque`, `date` sans contrainte (`constraints="0"`).
- **Défaut** : `<default field="date" expression="now()" applyOnUpdate="0"/>` (à la création seulement, `date` reste
  modifiable). Widget d'édition `DateTime` au format `yyyy-MM-dd HH:mm:ss`.
- **Contrainte forte** sur `diametre` : `<constraint field="diametre" constraints="4" unique_strength="0"
  notnull_strength="0" exp_strength="1"/>` (bit 4 = expression, force forte) et, dans `<constraintExpressions>`,
  `exp="&quot;diametre&quot; IS NULL OR &quot;diametre&quot; &gt;= 0"` avec une description en français
  (« Le diamètre doit être positif ou nul (en cm) »). Les trois formes refusées par les tests (`>= 0` seul, force
  douce, `> 0`) ne sont pas écrites. Widget `Range` ou `TextEdit` pour `diametre`, entier, pas de décimale (à choisir
  sur ce que QField rend le mieux au doigt ; voir risque 4).
- **Style ProdBois** (spec § 5) : `<renderer-v2 type="singleSymbol">` avec un seul symbole `marker`, `SimpleMarker`
  `circle`, couleur `0,0,0,255`, `size 2`, `size_unit MM`, `style solid`, contour discret ; `<labeling type="simple">`
  avec `fieldName` = `"essence" || '\n' || "diametre"`, `isExpression="1"`, `fontSize="8"`, `fontSizeUnit="Point"`,
  `textColor` noir, `<text-buffer bufferDraw="1" bufferColor="255,255,255,255" bufferSize="1">`. J'écris l'expression
  **telle quelle** (celle du mail de JFC) : le piège de l'étiquette qui disparaît avec un champ vide (spec § 5,
  question n° 8 à JFC) reste ouvert, et le point sans diamètre que Pascal doit tester le montrera.
- Pas d'écriture de `qfieldsync` / QFieldCloud : hors périmètre.

**Ce que je sais** : les noms de balises ci-dessus (`maplayer`, `layer-tree-layer`, `constraints`,
`constraintExpressions`, `defaults`, `editable`, `renderer-v2`, `labeling`, `text-style`, `text-buffer`) sont ceux de
QGIS 3.x, et les tests les reconnaissent. **Ce qui reste incertain tant que Pascal n'a pas réenregistré le projet dans
QGIS** : l'ordre et les attributs exacts de `<fieldConfiguration>` / `editWidget` (j'écris le minimum et QGIS
complétera à l'enregistrement) ; l'écriture des couleurs (`0,0,0,255` ou `…,rgb:0,0,0,1`) ; la forme de la
`<constraints>` de QGIS 3.34 contre celle de 3.40 ; si QGIS accepte `./saisie.gpkg|layername=saisie_terrain`
sans le reformuler (il le fera sûrement, sans changer le sens). Les tests sont écrits pour accepter ces variantes ;
**comme pour la 006, la version réenregistrée par QGIS fait foi** et les tests doivent repasser dessus.

## 3. Une mise à jour ne doit pas écraser un `saisie.gpkg` rempli

Le problème : l'agent met à jour le projet en copiant le zip du projet modèle dans le dossier du projet sur
l'appareil. Si ce zip contient `saisie.gpkg` (vide), il remplace le fichier rempli : **les points du terrain sont
perdus**, sans erreur visible.

### Option A : deux zips, la mise à jour sans `saisie.gpkg`  (recommandée)

- `cerf-projet-modele.zip` (nom actuel, URL stable) = **`cerf.qgz` seul** : c'est le zip de mise à jour ; il ne
  contient physiquement pas de quoi écraser les saisies.
- `cerf-projet-modele-premiere-installation.zip` (nom nouveau) = `cerf.qgz` + `saisie.gpkg` vide.
- La notice dit : première installation, ce zip-là ; mise à jour, l'autre ; « ne jamais recopier `saisie.gpkg` sur un
  appareil qui a déjà servi ».
- Le workflow vérifie, avant publication, que le zip de mise à jour **ne contient pas** `saisie.gpkg` (échec sinon).
- **Coût** : deux fichiers à comprendre ; le workflow monte un peu ; la notice gagne trois lignes. **Risque
  résiduel** : l'agent prend le zip de première installation pour une mise à jour (perte de données) ; réduit par le nom
  explicite, la consigne, et le fait que le sens inverse (mise à jour sur un appareil neuf) est sans perte et se voit
  (couche « introuvable »). Les appareils déjà en service n'ont pas de `saisie.gpkg` : ils prennent le zip de
  première installation une fois.

### Option B : un seul zip, un `saisie.gpkg` nommé autrement, à renommer à la main

- Le zip contient `cerf.qgz` et `saisie-modele.gpkg`. Première installation : renommer en `saisie.gpkg`.
- **Coût** : aucun fichier à ne pas écraser ; mais un renommage sur Android, avec des gants, par l'agent. Oubli = couche
  cassée au premier jour (visible). Et le zip « mise à jour » et « première installation » sont le même fichier,
  donc la consigne est seulement « renomme si tu n'as pas déjà `saisie.gpkg` » : facile à mal faire dans les deux sens
  (renommer par-dessus un fichier rempli : le gestionnaire de fichiers d'Android demande souvent confirmation, pas toujours).

### Option C : un seul zip avec les deux fichiers, consigne seule dans la notice

- « En mise à jour, ne remplacer que `cerf.qgz`. » **Coût** : zéro de technique, mais tout repose sur l'attention de
  l'agent ; une extraction « tout remplacer » (le geste par défaut) efface les points. **Je la déconseille** : le
  prix d'une erreur est payé par l'agent sur le terrain, en données perdues (test du roseau et du chêne : plier ici
  fait payer l'utilisateur ; tenir, c'est ajouter un second zip, qui coûte peu).

### (Option D, hors mission) : le plugin crée `saisie.gpkg` s'il manque

Le plugin copierait un modèle embarqué quand le fichier est absent : plus aucune consigne. Mais cela touche le plugin
(« ce qui ne lui est pas demandé »), et je ne sais pas si le QML de QField peut copier un fichier dans le dossier du
projet. À noter pour une mission ultérieure ; je ne la propose pas pour la 021.

**Ma recommandation : A.** Elle supprime le risque par construction (le fichier dangereux n'est pas dans le zip
qu'on rejoue souvent) et son défaut se voit au lieu de coûter des données. **C'est à Pascal de trancher** (question 1).

Reste à régler, hors du zip : une évolution future du schéma (nouveau champ) demanderait une migration d'un
`saisie.gpkg` rempli ; elle n'est pas dans la 021, la spec ne la prévoit pas.

## 4. Changements au workflow de release du projet modèle

Le zip est fabriqué par `.github/workflows/release-plugin.yml` (étape « Zips », lignes `cp cerf.qgz dist/` puis
`zip -X cerf-projet-modele.zip cerf.qgz`) ; `release-prototype.yml` en fabrique un autre, figé sur la branche 006
(`prototype-1`) : **je n'y touche pas** (il décrit un état passé, sans couche de saisie).

Avec l'option A :

1. Étape « Zips » : `(cd dist && zip -X cerf-projet-modele.zip cerf.qgz)` inchangé ; ajouter
   `cp saisie.gpkg dist/` puis `zip -X cerf-projet-modele-premiere-installation.zip cerf.qgz saisie.gpkg`, puis
   supprimer les deux fichiers nus de `dist/` (comme aujourd'hui pour `cerf.qgz`).
2. Garde-fou : `if unzip -l dist/cerf-projet-modele.zip | grep -q saisie.gpkg; then exit 1; fi`
   (et le contraire pour le zip de première installation).
3. Les trois commandes `gh release create/upload` listent le nouveau zip ; les notes disent en une ligne lequel
   prendre ; `paths:` du déclencheur gagne `saisie.gpkg`.
4. Deux difficultés **qui ne sont pas à moi de trancher** (question 3) :
   - l'essai avant fusion (`plugin-essai`) ne se déclenche que sur la branche `mission/008-squelette-plugin` : pour
     que Pascal essaie les zips de la 021 sur le Samsung avant de fusionner, il faut ajouter
     `mission/021-couche-saisie` à `branches:` ;
   - sur `main`, `outils/decider-release.mjs` ne publie que si `plugin/` a changé : **la fusion de la 021 (qui ne
     change que `cerf.qgz`, `saisie.gpkg`, `outils/`) ne produirait aucune release**, et un lancement manuel
     échoue si l'étiquette `plugin-v<version>` existe. Je ne modifie pas `decider-release` (ses tests sont ceux de la
     008). Proposition : un petit workflow séparé `release-projet-modele.yml` (étiquette `projet-modele-v<n>`, déclenché
     par `cerf.qgz` ou `saisie.gpkg` modifiés sur `main`), où les deux zips vivent ; `release-plugin.yml` garde
     seulement le plugin.

Le test de ce que je code côté workflow : un script `outils/zips-projet-modele.mjs` (calque de `outils/zips-recette.mjs`)
fabrique les deux zips et un test vérifie leur contenu ; le workflow l'appelle. Ainsi la règle « pas de
`saisie.gpkg` dans la mise à jour » est testée par `node --test`, pas seulement par du YAML.

## 5. Risques, et ce que seuls Pascal et le Samsung prouveront

| # | Risque | Qui le lève |
|---|---|---|
| 1 | Je ne peux pas ouvrir `saisie.gpkg` ni le `.qgs` avec QGIS/GDAL ici : un GeoPackage « valide pour mes tests » peut être refusé par GDAL (définition SRS, absence de R-tree, `gpkg_ogr_contents`). | Pascal, QGIS sur PC : ouvrir le projet, la couche se charge sans erreur, SCR du projet 2154, enregistrer ; relancer les tests sur la version enregistrée. |
| 2 | Contrainte `"diametre" IS NULL OR "diametre" >= 0` : écriture XML exacte, et **comportement de QField** (bloque-t-il vraiment ? message lisible ? point sans diamètre accepté ?). | Samsung, § 6 n° 10 : **un point sans diamètre accepté, un diamètre `-5` refusé** avec un message, un diamètre `0` accepté. |
| 3 | Défaut `now()` sur `date` : rempli seul ? fuseau (GDAL écrit en UTC, QGIS en heure locale) : la date peut s'afficher décalée de 1 ou 2 h. | Samsung : créer un point, lire `date` ; PC : la relire dans QGIS. |
| 4 | Saisie au doigt avec gants : widget de `diametre` (clavier numérique ou curseur ?). | Samsung ; réglage ensuite, pas de blocage. |
| 5 | **Copie à chaud** : QGIS/GDAL peut passer un GeoPackage en mode WAL pendant l'édition (fichiers `saisie.gpkg-wal`, `-shm`) ; copier seulement `saisie.gpkg` pendant que QField est ouvert peut perdre les derniers points. Je ne le sais pas pour QField. | Samsung : saisir 3 points, **sans fermer QField**, copier `saisie.gpkg` seul sur le PC, ouvrir : les 3 points y sont-ils ? Sinon, la notice dit de fermer le projet avant la copie. |
| 6 | Étiquette `||` : disparaît si `essence` ou `diametre` est vide (spec § 5, question à JFC). | Samsung : le point sans diamètre apparaît-il sans étiquette ? Constat, décision de Pascal. |
| 7 | Perte de données par mise à jour (§ 3). | Essai : poser 1 point, appliquer le zip de mise à jour : le point est toujours là. |
| 8 | Redémarrage : la couche et ses points reviennent (§ 6 n° 10). | Samsung. |
| 9 | La couche peut être retirée du projet par l'agent (indicateur « Removable » par défaut dans QGIS). | Question 5. |

**Échantillon terrain pour la PR** (spec § 6 n° 10, complété par les décisions du 3 novembre) : mode avion, `cerf.qgz`
ouvert ; trois points avec essence et diamètre ; un point sans diamètre ; une tentative à `-5` ; style ProdBois ;
`date` remplie seule ; redémarrage ; copie sur PC (câble) ; ouverture dans QGIS en Lambert 93 avec les trois (quatre)
points ; essai du zip de mise à jour sur un appareil déjà rempli.

## 6. Questions pour Pascal, avec une réponse proposée

1. **Mise à jour sans écrasement** : option A (deux zips), B, C ? *Proposé : A.*
2. **`saisie.gpkg` versé à la racine du dépôt** (les tests l'y cherchent) et régénéré par le script ? *Proposé : oui.*
3. **Publication** : (a) ajouter `mission/021-couche-saisie` aux branches de l'essai avant fusion ; (b) un workflow
   séparé `release-projet-modele.yml` pour la release sur `main` (le décideur de la 008 ne publie pas sur un
   changement de `cerf.qgz` seul). *Proposé : oui aux deux ; sinon, après fusion, une montée de version du plugin.*
4. **La notice** (`docs/notice-jfc.md` : première installation / mise à jour / copie de `saisie.gpkg`, fermer le projet
   avant de copier) : qui l'écrit, dans cette PR ou une mission à part ? *Proposé : une mission à part ; je livre dans la PR
   les trois phrases à y reprendre.*
5. **Couche non supprimable** par l'agent (retirer l'indicateur « Removable » dans le `.qgs`) ? *Proposé : oui, une
   suppression par erreur ferait perdre le point d'accès aux données.* Compatible avec les tests (non vérifié par eux).
6. **Appareils déjà en service** : ils n'ont pas de `saisie.gpkg` ; ils prennent une fois le zip de première
   installation. Cela te convient ? *Proposé : oui.*
7. **R-tree** : l'omettre (GeoPackage valide, rien à gagner pour quelques centaines de points) ? *Proposé : oui, et
   le rajouter seulement si QGIS s'en plaint.*
8. **`remarque`, `essence`** : texte sans longueur imposée (`TEXT`) ; `diametre` sans plafond (seulement `>= 0`) ?
   *Proposé : oui (spec § 3.5).*

## 7. Ordre de travail une fois l'accord donné

1. `outils/projet-modele.mjs` : fonction `ecrireGpkg()` (node:sqlite) + option `--gpkg` ; `ecrireQgs` ajoute la couche,
   l'arbre, l'ordre. 2. Tests unitaires du script (`tests/outil-saisie-gpkg.test.mjs`) : dump logique, déterminisme,
   zéro ligne ; les 16 tests de la 020 et ceux de la 005 passent sans modification. 3. Régénérer `cerf.qgz` et
   `saisie.gpkg`. 4. `outils/zips-projet-modele.mjs` + workflow. 5. PR en français, échantillon terrain, ligne de journal.

**Question de contrôle** : *qui fait quoi d'ici quand, et comment saura-t-on que ça marche ?* Le dev code après
l'accord de Pascal sur les questions 1 à 3 ; Pascal ouvre le projet dans QGIS, enregistre, puis essaie les huit
points du § 5 sur le Samsung avant la fusion ; on saura que ça marche quand trois points saisis en mode avion
reviennent après redémarrage et s'ouvrent en Lambert 93 sur le PC, et qu'une mise à jour du projet ne les efface pas.

---

## Réalisation : écarts au plan (3 novembre 2026, par le `dev`)

Décisions de Pascal appliquées : deux zips (option A), `saisie.gpkg` versé à la racine, workflow à part, couche non
retirable, R-tree omis, `TEXT` sans longueur, notice laissée à la mission 018.

**Écarts et précisions, un par un :**

1. **Test de la 006 modifié (un seul, à relire).** `tests/outil-projet-modele.test.mjs`, test « arbre : un groupe
   Fonds de carte… », affirmait « exactement 2 `layer-tree-layer` dans l'arbre » et « `layerorder` = ids des fonds ». Ces
   deux affirmations sont incompatibles par construction avec la fiche 021 (la couche de saisie est à la racine, au-dessus
   du groupe, et dans l'ordre de dessin). Je l'ai corrigé au minimum : 3 feuilles, la première étant « Saisie terrain »,
   et l'ordre = `[saisie, ...fonds]`. Aucun test des missions 005 et 020 n'est touché. Si Pascal préfère que le testeur
   le reprenne, on revient à la version précédente de ce seul fichier.
2. **Non retirable** : écrit par `<flags><Removable>0</Removable>…</flags>` dans la `maplayer` (format QGIS ≥ 3.4). Aucun
   test de la 020 ne le vérifie : je l'ai ajouté à `tests/outil-saisie-gpkg.test.mjs`. À confirmer dans QGIS (propriétés de
   la couche) puis dans QField (la couche ne doit pas pouvoir être supprimée).
3. **Widgets** : `TextEdit` pour `essence`, `diametre`, `remarque` (multiligne) ; `DateTime` pour `date`. Pas de `Range` sur
   `diametre` : il ne sait pas porter un champ vide ; la contrainte `>= 0` suffit.
4. **`last_change`, `description` des SRS** : figés ; WKT1 de 2154 et de 4326 écrits de mémoire (celui que GDAL écrit). Seul
   QGIS le confirmera.
5. **Tests ajoutés** : `tests/outil-saisie-gpkg.test.mjs` (6) et `tests/zips-projet-modele.test.mjs` (8) ; suite entière :
   378 tests, 0 échec.
6. **Workflow** : `release-projet-modele.yml`. Étiquette d'essai `projet-modele-essai` (préversion, écrasée) ; sur `main`,
   étiquette `projet-modele-<AAAAMMJJ>-<sha7>` (pas de numéro de version à maintenir). Il rejoue `node --test` avant de publier.
   **Point à trancher par Pascal** : `release-plugin.yml` publie encore, lui aussi, un `cerf-projet-modele.zip` (cerf.qgz seul)
   dans ses releases, et la dernière release créée devient « latest » : l'URL `…/releases/latest/download/cerf-projet-modele.zip`
   pointe donc sur l'une ou l'autre selon la dernière publication. Les deux contiennent le même `cerf.qgz` seul, donc
   sans danger pour les saisies, mais le zip de première installation n'existe que dans les releases du projet modèle.
   Je n'ai pas touché `release-plugin.yml` (hors harnais) : à retirer de ce workflow, dans une mission à part.

**Ce que seuls QGIS sur PC et le Samsung prouveront :** voir le tableau des risques du § 5 (GDAL lit-il le GeoPackage sans
R-tree ; contrainte bloquante dans QField ; `now()` rempli seul et fuseau ; widgets au doigt ; copie à chaud / WAL ;
étiquette avec champ vide ; non-retirable ; redémarrage ; mise à jour sans perte avec le zip de mise à jour).

## Trois phrases pour la notice de JFC (à reprendre par la mission 018)

1. **Première installation d'un appareil** : copier le contenu de `cerf-projet-modele-premiere-installation.zip`
   (`cerf.qgz` et `saisie.gpkg`) dans le dossier du projet, une seule fois.
2. **Mise à jour** : n'utiliser que `cerf-projet-modele.zip` (`cerf.qgz` seul) ; ne jamais recopier `saisie.gpkg` sur un
   appareil qui a déjà servi, car cela efface les points saisis.
3. **Rapporter les points au bureau** : fermer le projet dans QField, puis copier `saisie.gpkg` (le fichier seul, sans
   le renommer) sur le PC ; il s'ouvre dans QGIS en Lambert 93.

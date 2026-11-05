# Cerf

Cerf est un projet QField modèle (`cerf.qgz`) pour toute unité territoriale de métropole, avec les fonds IGN en flux. Un plugin QField, écrit pour Cerf, permet à l'agent d'ajouter sur le terrain, depuis un zip, les couches dont il a besoin, affichées aux couleurs du manuel.

Ce qu'on construit, pour qui : [`docs/brief.md`](docs/brief.md). Le détail du comportement : [`docs/spec.md`](docs/spec.md).

Adresses vérifiées le 4 novembre 2026 : les quatre releases existent et portent les fichiers cités (lecture de l'API GitHub).

## 1. Installer le projet sur le téléphone (QField)

À faire **une seule fois par appareil**, avec du réseau.

1. Ouvre QField.
2. Sur l'écran d'accueil, touche « Projets et jeux de données locaux ».
3. Touche le bouton d'actions en bas à droite (« Import Actions »), puis « Import URL ».
4. Colle l'adresse suivante, ou touche l'icône QR code du champ et vise le flashcode ci-dessous (le même, `flashcode-projet.png`, est aussi joint à la release) :
   `https://github.com/pobsteta/cerf/releases/download/projet-modele/projet-cerf.zip`

   <img src="docs/flashcodes/flashcode-projet.svg" width="200" alt="Flashcode de l'adresse du projet Cerf (projet-cerf.zip)">

5. Ouvre le projet **`cerf.qgz`**.

Le zip contient `cerf.qgz` et `saisie.gpkg` (la couche « Saisie terrain », vide).

### Mettre le projet à jour

**N'importe pas le zip de mise à jour avec « Import URL »** : QField le décompresserait dans un dossier neuf, donc dans un autre projet, sans les points déjà saisis.

1. Télécharge `projet-cerf-mise-a-jour.zip` sur l'ordinateur, dans la même release `projet-modele` :
   `https://github.com/pobsteta/cerf/releases/download/projet-modele/projet-cerf-mise-a-jour.zip`
2. Décompresse-le : il ne contient que `cerf.qgz`.
3. Branche le téléphone par câble USB.
4. Copie `cerf.qgz` dans le dossier du projet du téléphone, en remplaçant l'ancien.
5. Ne recopie **jamais** un `saisie.gpkg` vide par-dessus un `saisie.gpkg` rempli.

Voir [`docs/spec.md`](docs/spec.md) § 3.5.

## 2. Installer le plugin Cerf

À faire une fois par appareil, avec du réseau.

1. Dans QField : Paramètres, Plugins, « Install plugin from URL ».
2. Colle l'adresse stable, ou touche l'icône QR code du champ et vise le flashcode ci-dessous (le même, `flashcode-plugin.png`, est aussi joint à la release du plugin) :
   `https://github.com/pobsteta/cerf/releases/latest/download/plugin-cerf.zip`

   <img src="docs/flashcodes/flashcode-plugin.svg" width="200" alt="Flashcode de l'adresse du plugin Cerf (plugin-cerf.zip)">

3. Valide, puis active le plugin si QField le demande.

À savoir :

- **Ne renomme pas le zip** : QField nomme le dossier du plugin d'après le nom du zip.
- Si tu as déjà un ancien plugin « Cerf » (dossier `cerf`), **désinstalle-le une fois** avant, pour ne pas avoir deux boutons.
- Le bouton Cerf de la barre d'outils **n'apparaît que dans un projet Cerf**, c'est-à-dire un projet qui a la variable `cerf_id` (c'est le cas de `cerf.qgz`). Dans un autre projet, il reste caché.
- Pour tester une version pas encore publiée : préversion `plugin-essai`, `https://github.com/pobsteta/cerf/releases/download/plugin-essai/plugin-cerf.zip` (adresse d'essai, jamais « latest »).

## 3. Charger un zip avec plusieurs couches

Le plugin 0.4.0 (sur `main`) fait ce qui suit. Pas plus.

### Ce que le plugin lit aujourd'hui

Extensions sans tenir compte de la casse, à la racine du zip ou dans des dossiers :

- **GeoJSON** : fichiers `.geojson`, et fichiers `.json`, tentés comme GeoJSON. *Sur l'appareil (5 novembre 2026), le plugin ne peut pas lire le contenu d'un `.json` du zip : il ne sait donc pas écarter un `.json` qui n'est pas du GeoJSON, et le tente comme couche. Si QField ne l'ouvre pas, il est refusé avec le message « `<chemin dans le zip>` : illisible » (les autres couches sont chargées) ; il n'est pas ignoré en silence. Retire du zip les `.json` qui ne sont pas des couches.*
- **Shapefile** (lecture confirmée sur l'appareil avec le plugin 0.4.0, 5 novembre 2026) : le `.shp` avec, dans le même dossier et sous le même nom, `.shx`, `.dbf`, `.prj` (obligatoires) et `.cpg` (conseillé). Un `.prj`, `.shx` ou `.dbf` absent fait refuser la couche ; un `.cpg` absent donne l'avertissement « accents peut-être mal lus ».
- **GeoPackage** (`.gpkg`) : **une couche par table vecteur**. Le plugin lit la liste des tables dans le fichier, sans réseau. Cette lecture n'est pas encore prouvée sur le téléphone (zip d'essai `essai-tables-z.zip` à essayer) : si elle échoue, ou si le GeoPackage n'a qu'une table attributaire sans géométrie, il est refusé (« tables illisibles »), il n'est jamais ignoré sans message.
- **GeoTIFF** (`.tif`, `.tiff`) : lu dans le zip, sans copie, avec le style par défaut de QGIS. Range-le dans le zip **sans compression** (`zip -0`) pour une lecture rapide.
- Un zip sans aucune couche de ces quatre formats donne le message « Aucune couche GeoJSON, Shapefile, GeoPackage ou GeoTIFF dans <nom du zip>. ».
- Shapefile, GeoJSON et GeoPackage sont copiés en GeoPackage dans `cerf-imports/` : une couche Shapefile apparaît donc comme un GeoPackage.

### Combien de couches

Un zip peut en contenir **autant qu'on veut** : chaque GeoJSON, chaque Shapefile, chaque table de GeoPackage et chaque GeoTIFF est une couche. Toutes les couches du zip sont chargées ; il n'y a pas de case à cocher dans la version actuelle (la spec § 1 en prévoit).

Les limites réelles :

- **Le zip entier doit peser 10 Mo au plus aujourd'hui** (10 000 000 octets : `PLAFOND_LISTAGE_OCTETS` dans `plugin/cerf-logique.mjs`). C'est la taille du fichier `.zip`, pas du contenu décompressé. Au-delà, le zip est refusé en bloc.
- **Deux couches de même nom** (`a/UG.geojson` et `b/UG.shp`, ou une table `UG` de GeoPackage) : la seconde est refusée, la première est chargée.
- **Ignorés sans message** : dossier `__MACOSX`, fichiers `._*` (zips faits sur Mac), `.qmd`, et tout autre fichier. Les fichiers annexes (`.tfw`, `.aux.xml`, `.qix`, `.sbn`, `.sbx`) vont avec leur couche, sans message.
- Une couche refusée n'empêche pas les autres.

### Étapes

1. Mets le zip sur le téléphone, dans n'importe quel dossier (par exemple Téléchargements). Pas besoin de réseau pour l'import.
2. Ouvre `cerf.qgz`.
3. Touche le bouton Cerf de la barre d'outils des plugins : le panneau Cerf s'ouvre. Touche « Ajouter un zip ».
4. Choisis ton zip dans le sélecteur de fichiers Android. Autorise l'accès au stockage si Android le demande.
5. Lis le message du panneau : une ligne par couche refusée ou avertie, qui commence par le **chemin complet de la couche dans le zip**, avec son extension : `FRT.shp : …` à la racine, `Serre EA/réf/Parcelles.shp : …` dans des dossiers, `d/Serre.gpkg/Releves : …` pour une table de GeoPackage.
6. Regarde la carte. Les couches sont **en lecture seule**. Le plugin copie les couches vecteur en GeoPackage dans `cerf-imports/` (dossier du projet), avec leur style ; les GeoTIFF restent lus dans la copie du zip.

### Retrouver et retirer

- **Réouverture** : ferme et rouvre le projet, ou redémarre le téléphone, les couches reviennent (sans réseau).
- **Retrait** : dans le panneau Cerf, touche « Retirer » en face de la couche. La couche quitte la carte et le registre. Le plugin essaie d'effacer ses fichiers (`.gpkg`, `.qml`), vérifie, puis dit ce qui reste : « Fichiers restés sur l'appareil : … ». La copie du zip est effacée quand plus aucune couche ne s'en sert ; sinon, ou si l'effacement échoue : « Copie conservée sur l'appareil : … ».
- **Réimporter un zip sous le même nom** : il remplace l'ancien. Les couches de l'ancien zip qui ne sont plus dans le nouveau sont retirées.

### Les styles du manuel

Le plugin choisit le style dans cet ordre : la règle par **nom de la couche** (sans extension, sans tenir compte de la casse ni des accents), puis la règle par champs, puis le style par défaut de QGIS. Un `.qml` posé dans le zip n'est **pas pris en charge pour l'instant** (voir plus bas).

| Couche | Nom reconnu (exemples) | Géométrie | Champ de l'étiquette |
|---|---|---|---|
| UG | `UG`, `ug_2026`, `UG-nord` | polygone | `CODE_UG` |
| Parcelles | `Parcelles`, `parcelle`, `Parcelles_A` | polygone | `CODE_PARC` |
| FRT | `FRT`, `frt 3` | polygone | `CODE_FRT` |
| ProdBois / Relevés | n'importe quel nom | point, avec les champs `essence` **et** `diametre` | essence puis diamètre (8 pt, liseré blanc) |

Couleurs, épaisseurs et tailles de police : [`docs/spec.md`](docs/spec.md) § 5.

- Les champs de code `CODE_UG`, `CODE_PARC` et `CODE_FRT` sont **provisoires** (casse libre). **Sans ce champ, la couleur s'applique mais aucune étiquette ne s'affiche.**
- Un nom reconnu mais en point ou en ligne (sans les champs `essence` et `diametre`) garde le style par défaut, avec un avertissement.
- **Un `.qml` posé dans le zip (`UG.qml` à côté de `UG.shp`, etc.) n'est pas pris en charge pour l'instant** : la fonction de QField qui lit un fichier texte (`FileUtils.readFileContent`) ne lit pas à l'intérieur d'un zip (les couches du zip, elles, sont bien lues par GDAL en `/vsizip/`), donc le plugin n'obtient jamais le contenu du `.qml`. La règle du manuel s'applique, avec l'avertissement « UG.shp : .qml illisible, style du manuel appliqué » (nom de la **couche**, pas du `.qml`). La surcharge par `.qml` est **reportée**, non abandonnée (décision de Pascal, 5 novembre 2026 ; détail : [`docs/spec.md`](docs/spec.md) § 5).
- Un GeoTIFF garde le style par défaut de QGIS.

### Systèmes de coordonnées

- Un GeoJSON sans membre `crs` est lu en **WGS84 (CRS84)**, comme le veut la RFC 7946. Un GeoJSON avec un membre `crs` est lu dans ce système.
- Toute couche est reprojetée en Lambert 93 (EPSG:2154), puis son emprise doit tomber en France métropolitaine.
- **Un GeoJSON en Lambert 93 sans membre `crs` est refusé** : « Coordonnées incohérentes : système mal déclaré ? ». Ajoute le membre `crs`, ou exporte en WGS84.

### Messages de refus

Le texte exact de chaque refus et avertissement est dans [`docs/spec.md`](docs/spec.md) § 4. Le plugin ne permet pas de forcer le chargement d'une couche refusée.

### Zip d'essai

Un zip de démonstration (données fictives, aux noms du manuel : UG, Parcelles, FRT, ProdBois, tout en GeoJSON) est dans la préversion `essai-manuel` :

`https://github.com/pobsteta/cerf/releases/download/essai-manuel/essai-manuel-geojson.zip`

<img src="docs/flashcodes/flashcode-essai-manuel-geojson.svg" width="200" alt="Flashcode de l'adresse de essai-manuel-geojson.zip">

`essai-manuel.zip`, de la même préversion, porte les mêmes couches avec UG, Parcelles et FRT en Shapefile :

`https://github.com/pobsteta/cerf/releases/download/essai-manuel/essai-manuel.zip`

<img src="docs/flashcodes/flashcode-essai-manuel.svg" width="200" alt="Flashcode de l'adresse de essai-manuel.zip">

## 4. Pour les développeurs

- Brief : [`docs/brief.md`](docs/brief.md). Spécification : [`docs/spec.md`](docs/spec.md). Décisions d'architecture : [`docs/adr/`](docs/adr/).
- Plan du plugin : [`plugin/PLAN.md`](plugin/PLAN.md). Code du plugin : [`plugin/`](plugin/).
- Tests : `node --test` à la racine (commande dans [`.claude/test-command`](.claude/test-command)).
- Méthode de travail, rôles, sources de vérité : [`CLAUDE.md`](CLAUDE.md). Mémoire du projet : [`pilotage/journal.md`](pilotage/journal.md) (ajout seul).
- Les workflows de release sont dans `.github/workflows/`. Aucune clé ni donnée de l'ONF dans le dépôt.
- Licence du plugin : GPL-3.0-or-later.

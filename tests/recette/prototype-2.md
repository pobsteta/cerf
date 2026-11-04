# Protocole d'essai du prototype n° 2 (styles et reprojection dans QField)

> Rédigé par le `dev` le 4 novembre 2026 (mission 023, étape 2), d'après le plan
> `prototype-2/PLAN.md` validé par Pascal avec ses dix réponses, et la fiche
> `pilotage/missions/023-prototype-2.md` ; repris le même jour (aller-retour 1/3) d'après les
> corrections C1 à C15 du `testeur` et les trois décisions de Pascal.
> **Statut : proposé, pas encore suivi.** Les gestes nomment les boutons tels qu'ils figurent
> dans `prototype-2/essai-logique.mjs` (`BOUTONS`, source de `Essai.qml`) ; un test
> (`tests/protocole-prototype-2.test.mjs`) vérifie que les noms sont les mêmes.

**But.** Dire, sur critère fixé d'avance et **avec ce qu'on voit sur l'appareil**, si QField
(sur le Samsung de Pascal, **hors réseau**) : (1) pose le style du manuel (couleurs et
étiquettes) d'un `.qml` écrit à côté d'une couche sortie du zip ; (2) le fait aussi pour une
couche lue en `/vsizip/` ; (3) le fait avec la table `layer_styles` d'un GeoPackage ; (4)
ignore un `.qml` posé après le chargement ; (5) garde le style après réouverture du projet ;
(6) reprojette un point et une emprise depuis QML ; (7) rend `crs`, `extent` et `featureCount()`
pour un GeoJSON et un Shapefile lus en `/vsizip/`. Les réponses décident de l'ADR des styles
et du sort de la mission 012 (reprojection).

**Comment remplir (une seule règle de lecture pour toutes les cases).**

- Dans chaque tableau de gestes, la dernière colonne est **« Conforme ☐ »** : on la coche (`☒`)
  si, et seulement si, **ce qui est écrit dans la colonne « Résultat attendu » est vu tel quel**
  sur l'appareil. Cela vaut pour **toutes** les cases, y compris la question 2, où le résultat
  attendu est un échec du style (carrés pleins, sans étiquette) : on coche si on voit cet
  échec. Case non cochée = on n'a pas vu cela : écrire ce qu'on a vu dans « Vu autrement ».
- Dans les tableaux de **relevés** (ceux qui n'ont pas de résultat attendu), la dernière colonne
  est **« Noté ☐ »** : on la coche quand la valeur est écrite dans le tableau. « Noté » ne dit
  rien de « conforme ».
- La **réponse oui / non** de chaque question n'est **pas** une case : elle s'écrit dans le
  tableau « Réponses » en fin de protocole, avec la règle donnée dans chaque question
  (« Réponse : … »).
- **Neuf réponses** en tout : 1a, 1b, 2, 3a, 3b, 4, 5, 6, 7 (les questions 1 et 3 en comptent
  deux). Aucun seuil de temps.
- **Captures.** Une capture nommée par réponse (noms ci-dessous), **en intérieur** (les couleurs
  d'essai sont très différentes, un reflet de soleil les brouillerait). Geste Samsung : appuyer
  **en même temps** sur le bouton latéral (marche/arrêt) et sur Volume bas, une seconde. La
  capture porte le nom que Samsung lui donne (`Screenshot_…`) ; on n'a pas à la renommer :
  **dans le tableau « Réponses », écrire le nom Samsung en face du nom attendu**. Pour les sortir
  du téléphone : application Galerie, ouvrir la capture, Partager (courriel), ou câble USB vers
  le PC (dossier `DCIM/Screenshots`). À joindre à la PR ou au journal.
- **Quand le prototype affiche une erreur** (« ERREUR », « REFUSÉ », « Écran du prototype NON
  chargé ») : ne rien recopier ; **une capture lisible de l'écran d'erreur** (défiler et en faire
  plusieurs si le bloc est long) la remplace (décision de Pascal, 4 novembre 2026).
- **Fenêtre du plugin.** Le bouton « Fermer » en haut de la fenêtre du plugin la ferme et
  montre la carte ; pour la rouvrir, toucher son bouton dans la barre des plugins. Les
  consignes « fermer la fenêtre » sont là pour que la capture montre la **carte**, pas le bloc de
  texte.

## Avant de commencer

| À noter | Valeur |
|---|---|
| Date de l'essai | |
| Appareil (modèle Samsung) | |
| Version d'Android | |
| Version de QField | |
| Prototype installé (version à l'écran, en-tête) | |

### A. Sur le PC, avant tout : contrôler les fichiers d'essai avec QGIS

Le `dev` n'a eu ni QGIS ni GDAL pour fabriquer les `.qml` et le GeoPackage : un fichier mal
formé donnerait un « non » faux, et l'ADR se fonderait sur un faux. Télécharger sur le PC
`essai-styles.zip` et `cerf-essai-2.zip` (liens plus bas, § B), les décompresser, puis ouvrir
dans QGIS **ces fichiers** et regarder (aucun réglage à faire : les styles doivent apparaître
seuls). Le GeoPackage seul `essai-q3.gpkg` ne sert **qu'à ce contrôle sur le PC** (c'est le même
fichier que `Parcelles_q3.gpkg` du zip) : **ne pas le mettre sur le Samsung**.

| Fichier à ouvrir | À voir dans QGIS | Conforme ☐ |
|---|---|---|
| `essai-styles.zip` (gestionnaire de fichiers du PC) | **17 entrées** : 13 fichiers de base + `FRT_sansprj.shp`, `.shx`, `.dbf`, `.cpg` | ☐ |
| `UG_q1.geojson` (avec `UG_q1.qml` à côté) | contour bleu, sans remplissage, étiquettes `UG1` et `UG2` en bleu ; système de la couche : EPSG:2154 | ☐ |
| `UG_q2.geojson` (avec `UG_q2.qml` à côté) | comme `UG_q1` : contour bleu, sans remplissage, étiquettes `UG3` et `UG4` en bleu ; EPSG:2154 | ☐ |
| `Parcelles_q3.gpkg` ou `essai-q3.gpkg` (table `Parcelles_q3`) | contour orange, 1 mm, sans remplissage, étiquettes `P1` et `P2` en orange (style pris dans `layer_styles`) ; Gestionnaire de styles : un style par défaut | ☐ |
| `UG_q4.geojson` (avec `UG_q4.qml` à côté) | contour vert-bleu, sans remplissage, étiquettes `UG5` et `UG6` | ☐ |
| `FRT_q7.shp` | système EPSG:2154 (lu dans le `.prj`) ; 2 polygones, champ `code_ug` | ☐ |
| `FRT_sansprj.shp` | s'ouvre ; **pas de `.prj`** : QGIS pose un système ou demande lequel ; 2 polygones | ☐ |
| `Sans_crs.geojson` | système **EPSG:4326** (ou `OGC:CRS84`) ; emprise absurde : propriétés de la couche, Information : X de **1 050 963 à 1 051 263**, Y de **6 841 112 à 6 841 762**, lus comme des « degrés » (mètres Lambert 93 pris pour des degrés) | ☐ |
| `cerf-essai-2.qgs` (dans `cerf-essai-2.zip`) | s'ouvre sans erreur ; système du projet EPSG:2154 ; aucune couche | ☐ |

Si l'une des lignes de `UG_q1`, `UG_q2`, `Parcelles_q3`, `UG_q4`, `FRT_q7` ou
`cerf-essai-2.qgs` n'est pas cochée, **le défaut est dans le fichier d'essai, pas dans QField** :
s'arrêter, donner au `dev` le `.qml` que QGIS produit (couche, Style, Enregistrer le style), il
remplace le sien. Ne pas passer à l'essai sur le Samsung. (Les lignes `FRT_sansprj` et
`Sans_crs` ne bloquent pas : ce sont des pièges, on note ce que QGIS en dit.)

### B. Sur le Samsung, AVEC le réseau (avant le mode avion)

Dans le navigateur du téléphone, depuis la préversion `prototype-2`
(https://github.com/pobsteta/cerf/releases/tag/prototype-2). **Tout se fait avant le mode avion** :
l'installation du plugin et l'import du projet ont besoin du réseau.

1. **Installer le plugin par URL** (méthode déjà éprouvée par Pascal au prototype n° 1, Cerf 0.1.1 ; si l'entrée « installer depuis une URL » n'existe pas dans le menu, le dire avant d'aller plus loin) : dans QField, menu (☰) puis Paramètres, Plugins, installer
   un plugin depuis une URL, et coller
   https://github.com/pobsteta/cerf/releases/download/prototype-2/cerf-prototype-2.zip
   (`cerf-prototype-2.zip`). **Ne pas renommer ce fichier** : QField nomme le dossier du plugin
   d'après le nom du zip. Ou viser le flashcode de la préversion (PNG joint, affiché dans ses notes : icône QR code du champ d'URL).
2. **Importer le projet** `cerf-essai-2.zip`
   (https://github.com/pobsteta/cerf/releases/download/prototype-2/cerf-essai-2.zip) : à
   l'écran d'accueil de QField, importer un projet depuis une URL (coller le lien) ; à défaut,
   le télécharger d'abord (navigateur) puis l'importer comme zip. Le projet est en Lambert 93,
   sans fond de carte, **sans `cerf_id`**. Ou viser le flashcode de la préversion (« Import URL », icône QR code du champ).
3. **Télécharger le zip d'essai** `essai-styles.zip`
   (https://github.com/pobsteta/cerf/releases/download/prototype-2/essai-styles.zip) avec le
   navigateur : **le fichier arrive dans le dossier « Téléchargements »** du téléphone (appli
   « Mes fichiers », Téléchargements). Il a **17 entrées, toutes stockées** (sans compression) :
   le **laisser tel quel** (ne pas le décompresser, ne pas le renommer ; s'il s'appelle
   `essai-styles (1).zip`, supprimer l'ancien et le retélécharger).
4. Le GeoPackage seul `essai-q3.gpkg`
   (https://github.com/pobsteta/cerf/releases/download/prototype-2/essai-q3.gpkg) n'est **pas**
   pour le Samsung : voir § A (contrôle QGIS sur le PC).
5. **Plugins** (QField, Paramètres, Plugins) : **Désactiver** « Cerf » 0.1.1 et
   « Cerf, prototype n° 1 », **activer** « Cerf, prototype n° 2 » **seul** : trois boutons de plugin sur la barre
   prêtent à confusion. Si le bouton du prototype n° 2 n'apparaît pas, quitter QField et le
   relancer.
6. **Ouvrir le projet `cerf-essai-2`**, puis passer en **mode avion** et **couper le Wi-Fi**
   (le réseau n'entre dans aucune question : c'est ce qui est essayé). Toucher le bouton du
   prototype dans la barre des plugins ; l'en-tête dit version, projet (`…/cerf-essai-2.qgs`),
   dossier du projet, dossier `cerf-imports`.

**Le prototype n'agit que dans `cerf-essai-2.qgs`.** Dans tout autre projet, un bouton répond
« REFUSÉ : le projet ouvert n'est pas cerf-essai-2.qgs » et ne fait rien : ouvrir le bon projet.

**Limite assumée (décision de Pascal, 4 novembre 2026).** Le zip d'essai est **stocké**. Un zip
de JFC, fait par QGIS ou 7-Zip, est **compressé** : le prototype ne sait pas l'extraire. Si les
questions 1 et 3 passent, une mission « inflate en JavaScript » suit. Le prototype dit
« entrée compressée, non extraite » si on lui en donne un.

**Gestes à ne faire qu'une fois chacun** (sauf la question 4, rejouable) : toucher deux fois
« 1. Couche sortie du zip » ajoute la couche deux fois ; si cela arrive, le noter dans « Vu
autrement », puis fermer et rouvrir le projet (voir question 5, premier geste de réouverture).

## Question 0 (préparation, sans réponse) : copier le zip dans le projet

| N° | Geste | Résultat attendu | Conforme ☐ |
|---|---|---|---|
| 1 | Toucher « 0. Préparer le zip », accepter la permission de stockage si Android la demande, choisir `essai-styles.zip` dans Téléchargements | l'en-tête dit « Dernier zip copié : …/cerf-imports/essai-styles.zip (présent) » ; le bloc de résultat liste **17 entrées**, toutes « stockée », avec taille et CRC32 | ☐ |

Capture : `q0-liste.png` (la liste, défilée si besoin). Si le bloc dit « 0 octet rendu » ou une
erreur : capture lisible, **tout le reste est impossible**, s'arrêter et le dire.

## Question 1 : couche sortie du zip, `.qml` écrit à côté avant le chargement

| N° | Geste | Résultat attendu | Conforme ☐ |
|---|---|---|---|
| 1 | Toucher « 1. Couche sortie du zip » | le bloc dit, pour `UG_q1.geojson` puis `UG_q1.qml`, « IDENTIQUE » (taille et CRC32 relus = ceux du zip) ; « Le .qml est écrit AVANT le chargement » ; `isValid : true`, `crs.authid : EPSG:2154`, `extent()` autour de X 1 050 163 à 1 050 463, Y 6 840 312 à 6 840 962 ; « Couche ajoutée à la carte » | ☐ |
| 2 | **Fermer la fenêtre du plugin**, regarder la carte (voir « Centrage » plus bas) ; capture | **1a, couleurs** : deux carrés au **contour bleu, fin, sans remplissage** | ☐ |
| 3 | Regarder les carrés ; capture | **1b, étiquettes** : `UG1` et `UG2` écrits en **bleu**, petit corps (10 pt) | ☐ |

**Centrage.** Le prototype centre la carte sur la couche. Si le bloc dit « Centrage : ERREUR », il
écrit une ligne **« Aller à la main vers : EPSG:2154, X (est) = … m ; Y (nord) = … m »** :
c'est le centre de la couche. Les couches d'essai sont de **petits carrés de 300 m** : il faut
zoomer fort (échelle de l'ordre du 1 : 2 000), sinon on ne voit qu'un point. Essayer la barre
de recherche de QField en tapant **deux entiers séparés par une espace**, X puis Y
(par exemple « 1051113 6840462 »), sans virgule ni « m » ; si elle ne propose rien, repli :
**appui long sur la couche dans le panneau des couches, puis « zoomer sur la couche »** ; à défaut,
zoomer à la main sur la zone en s'aidant des couches déjà posées. Noter « centrage à la main » dans « Vu
autrement ».

Captures : `q1-carte.png` (la carte zoomée sur la couche, fenêtre du plugin fermée),
`q1-ecran.png` (l'écran du plugin).

**Réponse 1a** : oui si la case 2 est cochée, sinon non. **Réponse 1b** : oui si la case 3 est
cochée, sinon non. **Exception : si la case 1 n'est pas cochée** (couche non chargée), répondre
« **essai raté** » (et non « non ») à 1a et 1b, avec la capture de l'écran d'erreur.

**Si non (1a ou 1b)** : un `.qml` posé à côté d'une couche sortie du zip n'est pas pris en
compte par `LayerUtils.loadVectorLayer` : l'ADR des styles ne peut pas compter sur lui ;
la pose par règle sur le nom devra passer par une autre voie (à chercher). Si seul 1b est non :
couleurs oui, étiquettes à poser autrement.

**Vu autrement :**

## Question 2 : couche lue dans le zip (`/vsizip/`), `.qml` dans le zip

| N° | Geste | Résultat attendu | Conforme ☐ |
|---|---|---|---|
| 1 | Toucher « 2. Couche lue dans le zip » | `isValid : true`, `crs.authid : EPSG:2154`, « Couche ajoutée » ; la source commence par `/vsizip//` | ☐ |
| 2 | **Fermer la fenêtre du plugin**, regarder la carte ; capture | **deux carrés pleins, sans étiquette** (style par défaut de QGIS : remplissage plein, couleur au hasard, ni contour bleu fin ni `UG3`/`UG4` écrits), à l'est de ceux de la question 1 | ☐ |

Captures : `q2-carte.png`, `q2-ecran.png`.

**Réponse 2** (à la question « le style est pris dans le zip ? ») : **essai raté** (et non « non ») si rien ne s'affiche ou si la couche ne charge pas (case 1 non cochée), avec la capture de l'écran d'erreur ; sinon **non** si la case 2 est
cochée (c'est le résultat attendu) ; **oui, surprise** si on voit au contraire un contour bleu
sans remplissage avec les étiquettes `UG3` et `UG4` : le dire en gros.

**Si non (attendu)** : le plugin doit lire le `.qml` lui-même (c'est la spec § 5) et le poser
par une autre voie, ou sortir la couche du zip (question 1).

**Vu autrement :**

## Question 3 : GeoPackage avec table `layer_styles`

| N° | Geste | Résultat attendu | Conforme ☐ |
|---|---|---|---|
| 1 | Toucher « 3. GeoPackage avec styles » | `Parcelles_q3.gpkg` « IDENTIQUE » (binaire : CRC32 relu) ; source `…/Parcelles_q3.gpkg\|layername=Parcelles_q3` ; `isValid : true`, `crs.authid : EPSG:2154` | ☐ |
| 2 | **Fermer la fenêtre du plugin**, regarder la carte ; capture | **3a, couleurs** (critère principal) : deux carrés au **contour orange, sans remplissage** (l'épaisseur de 1 mm se note, elle ne décide pas) | ☐ |
| 3 | Regarder les carrés | **3b, étiquettes** : `P1` et `P2` en **orange** (le gros corps, 15 pt, se note, il ne décide pas) | ☐ |

Captures : `q3-carte.png`, `q3-ecran.png`.

**Réponse 3a** : oui si la case 2 est cochée, sinon non. **Réponse 3b** : oui si la case 3 est
cochée, sinon non. **Exception : si la case 1 n'est pas cochée** (couche non chargée), répondre
« **essai raté** » (et non « non ») à 3a et 3b, avec la capture de l'écran d'erreur.

**Si non** : la table `layer_styles` n'est pas lue au chargement : pas de style porté par le
GeoPackage lui-même ; à dire à l'ADR des styles. (Si le contrôle QGIS du § A a été coché, le
défaut n'est pas dans le fichier.)

**Vu autrement :**

## Question 4 : `.qml` posé après le chargement

Rejouable : toucher de nouveau « 4. .qml posé après » retire l'ancienne couche A, efface l'ancien
`UG_q4.qml` (effacement limité au dossier `cerf-imports` du projet) et repart de zéro. Le bloc doit
alors dire « effacé par rmFile : true » ; s'il dit « Essai arrêté », capture et s'arrêter.

| N° | Geste | Résultat attendu | Conforme ☐ |
|---|---|---|---|
| 1 | Toucher « 4. .qml posé après » | `UG_q4.geojson` « IDENTIQUE » ; « UG_q4.qml absent du dossier : oui » ; couche ajoutée ; l'écran dit « CAPTURE A » | ☐ |
| 2 | **Fermer la fenêtre du plugin**, regarder la carte (carrés à l'est de ceux de la question 3) ; **capture A** (`q4-a.png`) ; rouvrir le plugin | style par défaut de QGIS : carrés pleins, sans étiquette | ☐ |
| 3 | Toucher « 4b. Écrire le .qml maintenant » | `UG_q4.qml` « IDENTIQUE » ; « La couche A n'a PAS été rechargée » ; l'écran dit « CAPTURE B » | ☐ |
| 4 | **Fermer la fenêtre du plugin**, **déplacer un peu la carte** (un doigt, pour forcer le redessin), regarder ; **capture B** (`q4-b.png`) | **la couche A n'a pas changé** (toujours carrés pleins sans étiquette) : le style n'est lu qu'à la construction de la couche | ☐ |
| 5 | Rouvrir le plugin, toucher « 4d. Nouvelle couche, même fichier » | « Couche A retirée : oui » ; le bloc charge `UG_q4_bis` | ☐ |
| 6 | **Fermer la fenêtre du plugin** ; **capture D** (`q4-d.png`) | seule la nouvelle couche `UG_q4_bis` est visible, au style **vert-bleu `#008B8B`**, sans remplissage, étiquettes `UG5` et `UG6` | ☐ |

Relevé facultatif, **sans résultat attendu** (entre les cases 4 et 5 si l'on veut) :

| Geste | Ce que dit le bloc ou la carte (à écrire) | Noté ☐ |
|---|---|---|
| Rouvrir le plugin, toucher « 4c. Recharger la couche (reload) » ; fermer la fenêtre, regarder la couche A | `typeof couche.reload` : … ; `reload()` : … (ou l'erreur) ; la couche A a-t-elle changé de style (vert-bleu avec étiquettes) ? oui / non / `reload` absent : | ☐ |

Captures : `q4-a.png`, `q4-b.png`, `q4-d.png`, `q4-ecran.png` (écran du plugin après 4d).

**Réponse 4** : **oui** (le `.qml` posé après est ignoré) si la case 4 est cochée **et** la case
6 aussi ; non si la couche A a changé à la capture B.

**Si non (la couche A change après 4b)** : QGIS surveille le fichier et relit le style : bonne
nouvelle, l'ordre « `.qml` puis couche » n'est plus une contrainte ; à dire à l'ADR.

**Vu autrement :**

## Question 5 : réouverture du projet

À faire **après** les questions 1 et 3 (les deux couches `UG_q1` et `Parcelles_q3` sont sur la
carte). Si, aux questions 1 ou 3, le style n'a **pas** été pris (réponse non), la couche
concernée est **« sans objet »** pour cette question : on ne peut pas dire qu'un style qui n'a
jamais été pris « revient ».

| N° | Geste | Résultat attendu | Conforme ☐ |
|---|---|---|---|
| 1 | **Zoomer sur les deux couches** (de sorte que les deux soient dans l'écran) ; toucher « 5. Mémoriser » | « Réglages de QField : écrit 2 couche(s) » ; la ligne « Relu : » montre les deux chemins ; **deux fois** « couche marquée (cerf/proto2) retrouvée dans le projet : oui » (un seul « oui » ou un « NON » : s'arrêter, capture, le dire) ; « Couches retrouvées par leur source (chemin) : 2 sur 2 » (si ce n'est pas 2 sur 2 par la source : s'arrêter, capture, le dire) | ☐ |
| 2 | Fermer le projet puis le rouvrir (voir le geste ci-dessous), **sans rien toucher d'autre** ; rouvrir la fenêtre du plugin | le bloc dit « Réouverture détectée (loadProjectEnded) » ; sinon toucher « 5. Après réouverture » | ☐ |
| 3 | **Zoomer de nouveau sur la zone des couches** (après réouverture, la carte peut être ailleurs), fermer la fenêtre du plugin, regarder ; capture | `UG_q1` revenue avec son style **bleu et ses étiquettes** et `Parcelles_q3` revenue avec son style **orange et ses étiquettes** | ☐ |

**Fermer et rouvrir le projet dans QField.** Les intitulés exacts dépendent de la version de
QField ; dans l'ordre : (a) menu (☰), puis « Fermer le projet » s'il existe ; (b) sinon, menu (☰)
puis « Ouvrir un projet local » et choisir de nouveau `cerf-essai-2` ; (c) sinon, quitter
QField entièrement (bouton « applis récentes » d'Android, balayer QField vers le haut) et le
relancer : il rouvre le dernier projet. Écrire dans « Vu autrement » **le geste réellement fait**.
Ne pas désactiver le plugin pendant ce temps.

Relevé, **sans résultat attendu** :

| Ligne du bloc | Valeur à écrire | Noté ☐ |
|---|---|---|
| « Présentes dans le projet à l'ouverture (par la source) : n = … sur 2 » | n = 0, 1 ou 2 : | ☐ |
| Pour chaque couche : « déjà dans le projet, non rechargée » ou « rechargée depuis le disque, sans réécrire de .qml » | `UG_q1` : … ; `Parcelles_q3` : … | ☐ |

Captures : `q5-carte.png`, `q5-ecran.png`.

**Réponse 5** (par couche, puis une seule ligne dans le tableau final) :
- **sans objet** pour une couche dont le style n'a pas été pris aux questions 1 ou 3 ;
- La règle se lit **sur la ligne de chaque couche** (« rechargée depuis le disque » ou « déjà dans le
  projet, non rechargée »), pas sur le n global.
- **oui** si la couche est « rechargée depuis le disque » **et** revenue avec
  son style : le style est relu du fichier voisin, sans réécrire de `.qml` ;
- **oui, mais par le projet** si la couche est « déjà dans le projet, non rechargée » et
  avec son style : QField a enregistré le projet avec les couches, le style peut venir du projet
  enregistré, pas du fichier voisin ;
- **non** si elle n'est pas revenue, ou revenue sans son style.

**Si non** : les couches importées ne reviennent pas seules à la réouverture (n = 0) ou
reviennent sans leur style : le plugin doit recharger les couches et reposer le style à chaque
ouverture ; à dire à l'ADR.

**Vu autrement :**

## Question 6 : reprojection depuis QML, hors ligne

**Mode avion activé** : le réseau n'entre pas dans ces appels. Un seul toucher sur « 6.
Reprojection » donne tout l'écran ; le défiler.

| N° | Geste | Résultat attendu | Conforme ☐ |
|---|---|---|---|
| 1 | Toucher « 6. Reprojection » | les deux systèmes : `fromDescription(EPSG:2154).isValid : true`, `authid : EPSG:2154` ; `wgs84Crs().isValid : true`, `authid : EPSG:4326` | ☐ |
| 2 | **Ligne 1**, point (longitude 7,76189 ; latitude 48,56906) | X (est) ≈ **1 051 113**, Y (nord) ≈ **6 840 462** à **5 m** près ; « à 5 m près : oui ». **Piège des axes** : si le bloc dit « AXES INVERSÉS » (X ≈ 6 840 462 et Y ≈ 1 051 113), c'est **non** | ☐ |
| 3 | **Ligne 2**, emprise (7,75 ; 48,56) à (7,77 ; 48,58) | rectangle dont les quatre bornes sont de l'ordre de X 1 04x xxx à 1 05x xxx et Y 6 83x xxx à 6 84x xxx, **xMinimum plus petit que xMaximum et yMinimum plus petit que yMaximum**, `isNull : false`. Un rectangle à des valeurs de l'ordre de 1,79e+308 (le « vide » de QGIS) est **non** | ☐ |
| 4 | **Ligne 3** | « OUI, vraisemblable » (tous les coins dans X 89 101 à 1 252 436, Y 6 036 555 à 7 120 480, `isNull` faux). La réponse « NON (vide, inversée, nulle ou hors emprise) » est **non** | ☐ |

Ne pas cocher une valeur à `undefined`, `0 ; 0`, `NaN`, à 1,79e+308, ou accompagnée d'une
exception (« ERREUR ») : c'est non, avec une capture lisible.

Lignes à **relever**, sans résultat attendu fixé (elles disent ce que QField fait en cas
d'erreur, pour la 012). Le bloc écrit, pour les lignes 5 à 7, la valeur rendue puis **un** des
messages suivants (liste complète) :

| Message possible | Sens |
|---|---|
| « rendue SANS changement » | QField a rendu le point d'entrée tel quel |
| « transformée » | une autre valeur numérique, finie, non nulle |
| « vide (0 ; 0) : ÉCHEC silencieux » | QField a rendu 0 ; 0 |
| « non numérique (undefined ou autre) : ÉCHEC » | pas de nombre rendu |
| « valeurs infinies ou NaN : ÉCHEC » | `Infinity` ou `NaN` rendu |
| « ERREUR … » (au lieu d'un message) | exception levée par QField |

| Ligne | Ce que dit le bloc (à recopier : le mot du message ci-dessus) | Noté ☐ |
|---|---|---|
| 4 : noms qui existent (`typeof`) | `GeometryUtils` : … ; `CoordinateReferenceSystemUtils` : … (pour chaque nom : `function`, `undefined` ou autre) | ☐ |
| 5 : même système des deux côtés (EPSG:2154 vers EPSG:2154) | attendu : « rendue SANS changement » : | ☐ |
| 6 : système source invalide (`invalidCrs`) vers EPSG:2154 | **échec attendu, en `NaN`** (« valeurs infinies ou NaN : ÉCHEC ») ; sinon un autre message de la liste : | ☐ |
| 7 : reprojection impossible (mètres Lambert 93 pris pour des degrés WGS84) | **échec attendu, en `NaN`** (« valeurs infinies ou NaN : ÉCHEC ») ; sinon un autre message de la liste : | ☐ |

Captures : `q6-ecran-haut.png` et `q6-ecran-bas.png` (l'écran entier, lignes 1 à 7, défilé).

**Réponse 6** (la reprojection point et emprise existe depuis QML, hors ligne) : **oui** si les
cases 1, 2, 3 et 4 sont cochées toutes les quatre, sinon non. Les lignes 5 à 7 ne changent pas
cette réponse : elles disent seulement comment un échec se voit.

**Si non** : la 012 ne peut pas reprojeter depuis QML avec ces fonctions ; sa décision
(contrôle de vraisemblance) reste à reprendre. **Quoi qu'il arrive, les lignes 6 et 7** disent
si un échec se voit : QField (lu dans son code) ne lève pas d'exception, il rend un objet vide ;
le contrôle de la 012 devra le traiter comme une erreur.

**Vu autrement :**

## Question 7 : `crs`, `extent` et `featureCount()` en `/vsizip/`

Un toucher sur « 7. Métadonnées d'une couche » donne quatre blocs, l'un sous l'autre ; défiler.
Termes exacts de l'écran : `isValid`, `crs.authid`, `crs.isValid`, `crs.description`,
`extent() : xMinimum … ; xMaximum … ; yMinimum … ; yMaximum …`, `featureCount() appelé en direct`,
`comptage par createFeatureIterator`, `emprise reprojetée en EPSG:2154`, `isNull`, et la ligne
« Verdict spec § 4 (couche lue en … ) : … couche chargée » ou « … refus ».

| N° | Geste | Résultat attendu | Conforme ☐ |
|---|---|---|---|
| 1 | Toucher « 7. Métadonnées d'une couche » | quatre blocs, dans cet ordre : `UG_q2.geojson`, `Sans_crs.geojson`, `FRT_q7.shp`, `FRT_sansprj.shp`, chacun commençant par « === … (en /vsizip/) » | ☐ |
| 2 | Bloc `UG_q2.geojson` | `isValid : true`, `crs.authid : EPSG:2154`, `comptage par createFeatureIterator : 2` | ☐ |
| 3 | Bloc `FRT_q7.shp` | `isValid : true`, `crs.authid : EPSG:2154`, `comptage par createFeatureIterator : 2` | ☐ |
| 4 | Bloc `Sans_crs.geojson` | `crs.authid` vaut `EPSG:4326` **ou** `OGC:CRS84` (ligne « Lu en WGS84 … : oui ») ; `extent()` absurde, X de 1 050 963 à 1 051 263 et Y de 6 841 112 à 6 841 762 « degrés » ; sous « emprise reprojetée en EPSG:2154 » : bornes vides, inversées (xMinimum > xMaximum), `isNull : true`, bornes NaN ou infinies, ou hors emprise, et la ligne « Verdict spec § 4 … refus ». (Si le bloc dit « ERREUR » à la place de la reprojection : ne pas cocher, capture lisible.) | ☐ |

À **relever** (sans résultat attendu) :

| Quoi | Ce que dit le bloc (à écrire) | Noté ☐ |
|---|---|---|
| `featureCount() appelé en direct` (les quatre blocs) | une valeur, ou une erreur (attendu : non invocable) : | ☐ |
| `FRT_sansprj.shp` : système rendu **sans `.prj`** | `crs.authid` : … ; `crs.isValid` : … ; `crs.description` : … | ☐ |
| `FRT_sansprj.shp` : emprise | `extent()` : … (attendu : X de 1 051 763 à 1 052 063, Y de 6 841 112 à 6 841 762 si le système est pris pour du Lambert 93) | ☐ |
| `crs.description` des trois autres blocs | `UG_q2` : … ; `Sans_crs` : … ; `FRT_q7` : … | ☐ |

Captures : `q7-ecran-1.png` à `q7-ecran-4.png` (un écran par bloc, défilé).

**Réponse 7** : **oui** si les cases 2, 3 et 4 sont cochées toutes les trois (le système, l'emprise
et le comptage sont lisibles en `/vsizip/` et permettent de refuser `Sans_crs`), sinon non. Les
lignes à relever (surtout le Shapefile sans `.prj`) se disent dans « Remarque ».

**Si non** : la 012 ne peut pas se fonder sur `crs` ou `extent` pour refuser une couche
sans système ; à reprendre.

**Vu autrement :**

## Prototype n° 3 (mission 027) : couche réécrite par `saveVectorLayerAs`, puis stylée

> Rédigé par le `dev` le 4 novembre 2026 (mission 027, étape 2), d'après le plan
> `prototype-2/PLAN-3.md` validé par Pascal avec ses réponses (fiche
> `pilotage/missions/027-prototype-3.md`). **Statut : proposé, pas encore suivi ; relecture par
> le `testeur` demandée.** Les noms de boutons sont ceux de `BOUTONS` dans
> `prototype-2/essai-logique.mjs` (même test de concordance que plus haut).

**But.** Dire, sur critère fixé d'avance, si, **hors réseau**, QField (sur le Samsung de Pascal)
sait : ouvrir en `/vsizip/` une couche d'un zip **compressé** (Shapefile, GeoJSON, GeoPackage à
deux tables), la **réécrire** dans `cerf-imports/q3-<N>/` par `LayerUtils.saveVectorLayerAs`
(un `.gpkg` par couche), puis poser le style du manuel par un `.qml` **écrit par le plugin** à
côté de la copie, avant son chargement. Si oui, la voie évite le décompresseur de la mission 026
(ADR 0008) ; si non, on le sait avant d'écrire du code de production.

**Même lecture que le reste du protocole.** « Conforme ☐ » : on coche (`☒`) si, et seulement si,
ce qui est écrit dans « Résultat attendu » est vu tel quel ; sinon, écrire ce qu'on a vu dans
« Vu autrement ». « Noté ☐ » : la valeur est écrite, rien de plus. La réponse oui / non s'écrit
dans le tableau « Réponses » en fin de protocole.
**« Essai raté » n'est pas « non »** : la question n'a pas été posée à QField quand **la copie
n'est pas chargée** : le zip compressé n'est pas là (le bloc dit « ÉCHEC, essai raté : le zip
compressé n'est pas là »), la source ne charge pas (« ÉCHEC, essai raté : la source ne charge
pas »), `saveVectorLayerAs` rend une chaîne vide (« ÉCHEC MUET »), ou le bloc dit « écrit : NON ».
Dans ce cas, répondre « **essai raté** » (et non « non »), avec la capture de l'écran, **pour les
questions de carte** (P3-2, P3-3, P3-4b). **Si la copie est chargée**, répondre d'après ce qu'on
voit **sur la carte**, même si une ligne du bloc dit autre chose. Pour les questions de **fichier**
(P3-1, P3-4a), une chaîne vide, « écrit : NON » ou un fichier sans octet est un **non** (la source a
chargé, le fichier n'est pas écrit) ; seule une source qui ne charge pas, ou un zip absent, est un
essai raté. Le fond du bloc de résultat devient **rouge pâle** dès qu'une ligne commence par
« ÉCHEC ».
**Bouton 0b en échec** (l'en-tête ne dit pas « présent », ou une ligne « ÉCHEC ») : **« essai
raté » partout** (P3-1 à P3-6), une capture de l'écran, **et s'arrêter** : ne pas toucher les
boutons suivants.
**Boutons 9b et 12 : l'écran se fige** pendant l'écriture. **Attendre** sans rien toucher ; si Android
propose « Attendre » ou « Fermer l'application », choisir **Attendre**. **Après chaque appui**,
**redescendre au bas de l'écran** (le résultat s'affiche sous les boutons) avant de lire.
**Une capture par réponse** (noms ci-dessous, mêmes règles que plus haut : en intérieur, nom Samsung
écrit dans le tableau « Réponses »). Quand le prototype affiche « ERREUR », « REFUSÉ » ou « ÉCHEC » :
une capture lisible de l'écran la remplace (défiler si le bloc est long).

### Avant de commencer (prototype n° 3)

1. **Avec le réseau, avant le mode avion** : télécharger le zip d'essai **compressé**
   `essai-styles-z.zip`
   (https://github.com/pobsteta/cerf/releases/download/prototype-2/essai-styles-z.zip) dans
   « Téléchargements », sans le décompresser ni le renommer (son sha256 et le sha du commit
   empaqueté sont écrits dans les notes de la préversion : les relever dans l'en-tête de ce
   protocole si l'on veut dater l'essai). Il a **8 entrées, toutes
   compressées** (méthode 8) : `FRT_q7.shp`, `.shx`, `.dbf`, `.prj`, `.cpg` (champ `nom` :
   « Étang », « Forêt »), `UG_q1.geojson`, `essai-gpkg2.gpkg` (tables `Parcelles` et `Zones`, sans
   `layer_styles`), `ProdBois_2000.geojson` (2 000 polygones).
2. **Mettre à jour le plugin** : `cerf-prototype-2.zip` de la même préversion `prototype-2`
   (version **0.2.0** à l'écran, en-tête ; si l'en-tête dit 0.1.0, le plugin n'est pas à jour :
   le dire et s'arrêter). Le projet `cerf-essai-2` est inchangé. Ne pas retoucher aux autres
   plugins désactivés.
3. **Sur le PC (facultatif, recommandé)** : ouvrir dans QGIS `FRT_q7.shp` (système EPSG:2154 ;
   champ `nom` : « Étang », « Forêt » lisibles) et `essai-gpkg2.gpkg` (deux tables, aucun style
   enregistré) tirés du zip. Si une lecture est fausse, le défaut est dans le fichier d'essai :
   s'arrêter et le dire.
4. Mode avion, Wi-Fi coupé, projet `cerf-essai-2` ouvert, fenêtre du plugin ouverte, **dérouler
   jusqu'aux boutons 0b à 12** (sous le bouton « 7. Métadonnées d'une couche »).
5. Geste unique : toucher « 0b. Préparer le zip compressé », accepter la permission de stockage si
   Android la demande, choisir `essai-styles-z.zip` dans Téléchargements. **Rien n'est extrait** :
   le plugin n'a pas de décompresseur, GDAL lit le zip en `/vsizip/`.

| N° | Geste | Résultat attendu | Conforme ☐ |
|---|---|---|---|
| 0b | Toucher « 0b. Préparer le zip compressé » et choisir le zip (en cas d'échec : « essai raté » partout, capture, s'arrêter) | l'en-tête dit « Zip compressé copié : …/cerf-imports/essai-styles-z.zip (présent) » ; le bloc liste **8 entrées**, « stockées : 0, compressées : 8 » ; « Le zip n'est pas extrait » | ☐ |

Chaque bouton 8 à 12 écrit dans un **dossier neuf** `cerf-imports/q3-<N>/` (N = 1, 2, 3…, à
chaque appui) : rien n'est écrasé. Le bouton 11 est le seul à effacer, et seulement dans ces
dossiers. **Chaque bouton (8, 9, 9b, 10, 11) ne se touche qu'une fois pour la réponse** ; on peut
rejouer, mais la réponse est celle du premier appui. **Le 12 fait exception** : il se touche trois
fois (P3-6). Le 11 se place **après** les cartes des questions P3-2 à P3-4 (voir P3-5).
**Ordre des boutons à l'écran** : 0b, 8, 9, 9b, 10, 11, 12. **Ordre conseillé de l'essai** : 8
(P3-1, P3-2), 10 (P3-3), 9 (P3-4), 11 (P3-5), puis 9b et 12 (durées).

**Une seule couche visible à la fois (faux oui).** Les couches du prototype n° 2 (`UG_q1`,
`Parcelles_q3`, `FRT_q7`…) peuvent encore être sur la carte, et les copies du prototype n° 3 ont
des couleurs voisines. Les emprises du zip compressé sont **décalées de 800 m vers le sud** de
celles du prototype n° 2, mais **avant chaque bouton 8, 9 et 10** (P3-2, P3-3, P3-4) : ouvrir la liste des couches, **décocher
(ou retirer) toutes les couches précédentes** et ne laisser visible que la couche du moment ; la
carte doit être **vide à l'endroit regardé** avant le bouton. Seulement ensuite toucher le bouton
et regarder la carte. Consigne avec des gants : décocher par la case de chaque couche, d'un
appui large, plutôt que de les retirer une à une ; à défaut, appui long sur la couche puis « masquer ».

### Question P3-1 : Shapefile compressé réécrit par `saveVectorLayerAs`

| N° | Geste | Résultat attendu | Conforme ☐ |
|---|---|---|---|
| 1 | Toucher « 8. Shapefile : réécrire, styler » | le bloc donne, dans l'ordre : source `/vsizip/…/FRT_q7.shp`, `Source isValid : true`, `Source featureCount : 2` ; `saveVectorLayerAs a rendu : …/q3-<N>/FRT_q7.gpkg` (**pas** « chaîne vide ») ; `FRT_q7.qml écrit par le plugin … IDENTIQUE` ; la copie `isValid : true`, `crs.authid : EPSG:2154` ; « Champ « nom » relu dans la copie : Étang ; Forêt » ; puis **« écrit : oui, N octets, 2 entités, EPSG:2154, accents lus : oui »** (N > 0) ; **aucune ligne « ÉCHEC »**, fond du bloc **non rouge** | ☐ |

Relevé, sans résultat attendu :

| Ligne du bloc | Valeur à écrire | Noté ☐ |
|---|---|---|
| « Durée, saveVectorLayerAs » | | ☐ |
| « Total » | | ☐ |
| La ligne « Champ « nom » relu » (accents : écrire les deux mots tels qu'ils s'affichent) | | ☐ |

Si la ligne « Lecture du champ « nom » : ERREUR … » apparaît, la lecture de l'attribut par le
plugin a échoué (pas la copie) : **ne pas cocher la case 1, réponse « non »**, mais **vérifier les
accents par la fiche de l'entité** (fermer la fenêtre, toucher un carré de la carte, lire `nom`)
et l'écrire dans « Vu autrement » (si la fiche montre « Étang » et « Forêt » exacts, le dire : le
défaut est alors dans la lecture du plugin, pas dans la copie).
Capture : `p3-q1-ecran.png` (l'écran, défilé si besoin).

**Réponse P3-1** : **oui** si la case 1 est cochée ; **non** si la source a chargé mais que le
fichier n'est pas écrit (chaîne vide, 0 octet, 0 entité, système vide ou autre que EPSG:2154,
accents déformés) ; **essai raté** si la source ne charge pas.

### Question P3-2 : la copie, stylée par le `.qml` écrit par le plugin

| N° | Geste | Résultat attendu | Conforme ☐ |
|---|---|---|---|
| 1 | **Avant le bouton 8** : décocher toutes les couches précédentes (voir « Une seule couche visible à la fois »), carte vide à l'endroit. Après le bouton 8 : **fermer la fenêtre du plugin**, regarder la carte (zoomer fort si besoin, voir « Centrage » plus haut : carrés de 300 m, **800 m au sud du centre**) ; capture | **2a, couleurs** : deux carrés au **contour vert-bleu, fin, sans remplissage** | ☐ |
| 2 | Regarder les carrés ; capture | **2b, étiquettes** : `FRT1` et `FRT2` écrits en vert-bleu, petit corps (10 pt) | ☐ |

Capture : `p3-q2-carte.png`.

**Réponse P3-2a** : oui si la case 1 est cochée, sinon non. **Réponse P3-2b** : oui si la case 2 est
cochée, sinon non. **Essai raté** (et non non) à P3-2a et P3-2b **seulement si la copie n'est pas
chargée** (source qui ne charge pas, chaîne vide, « écrit : NON » au bouton 8) ; sinon répondre
d'après la carte, même si P3-1 est « non ».

### Question P3-3 : GeoPackage à deux tables, un fichier et un style par table

| N° | Geste | Résultat attendu | Conforme ☐ |
|---|---|---|---|
| 1 | **Avant** : décocher toutes les couches précédentes, carte vide à l'endroit. Toucher « 10. GeoPackage à deux tables » | le bloc dit, pour `Parcelles` puis pour `Zones` : source valide, 2 entités, `saveVectorLayerAs` rend `…/q3-<N>/Parcelles.gpkg` puis `…/Zones.gpkg`, `.qml` « IDENTIQUE », « écrit : oui, N octets, 2 entités, EPSG:2154, accents lus : sans objet » (N > 0) ; aucune ligne « ÉCHEC », fond non rouge | ☐ |
| 2 | **Fermer la fenêtre du plugin**, regarder la carte ; capture | **3a, Parcelles** : contour **orange**, 1 mm, étiquettes `P1`, `P2` en orange (15 pt) | ☐ |
| 3 | Même carte (la zone des Zones est 800 m au sud : zoomer dessus) ; capture | **3b, Zones** : contour **bleu**, étiquettes `Z1`, `Z2` en bleu ; **aucun mélange** entre les deux couches | ☐ |

Captures : `p3-q3-ecran.png` (le bloc), et **deux captures de carte** : `p3-q3a-carte.png`
(Parcelles) et `p3-q3b-carte.png` (Zones), toutes à écrire dans la table « Réponses ».

**Réponse P3-3a** (Parcelles) et **P3-3b** (Zones), chacune : oui si sa case est cochée, sinon
non ; **essai raté** **seulement si la copie de la table n'est pas chargée** (source qui ne charge
pas, chaîne vide, « écrit : NON ») ; sinon répondre d'après la carte. Le GeoPackage ouvert en
`/vsizip/` est justement un des risques : un « essai raté » ici est une réponse utile, à écrire en
toutes lettres.

### Question P3-4 : GeoJSON compressé

| N° | Geste | Résultat attendu | Conforme ☐ |
|---|---|---|---|
| 1 | **Avant** : décocher toutes les couches précédentes, carte vide à l'endroit. Toucher « 9. GeoJSON : réécrire, styler » | comme la case 1 de P3-1 pour `UG_q1.geojson` : fichier `…/q3-<N>/UG_q1.gpkg`, « écrit : oui, N octets, 2 entités, EPSG:2154, accents lus : sans objet » (N > 0) ; aucune ligne « ÉCHEC », fond non rouge | ☐ |
| 2 | **Fermer la fenêtre du plugin**, regarder la carte ; capture | **4, style** : contour **bleu**, sans remplissage, étiquettes `UG1`, `UG2` en bleu | ☐ |

Captures : `p3-q4-ecran.png`, `p3-q4-carte.png`. Ce GeoJSON porte un membre `crs` (EPSG:2154) : le
système de la copie doit donc être EPSG:2154 ; un GeoJSON **sans** `crs` serait lu en WGS84, mais
ce n'est pas essayé ici (travail de la mission 012).

**Réponse P3-4a** (fichier écrit) : même règle que P3-1 (**oui** / **non** / **essai raté**).
**Réponse P3-4b** (style) : oui si la case 2 est cochée, non sinon ; essai raté **seulement si la
copie n'est pas chargée** (source qui ne charge pas, chaîne vide, « écrit : NON ») ; sinon répondre
d'après la carte.

### Question P3-5 : fichiers annexes, effaçables après retrait de la couche

| N° | Geste | Résultat attendu | Conforme ☐ |
|---|---|---|---|
| 1 | Toucher « 11. Fichiers annexes » **une fois par dossier** écrit (il retire de la carte les couches du dernier dossier, puis **sonde** chaque nom attendu : QField n'offre pas de listage) ; **la réponse vient du toucher sur le dossier du 9** | **« Fichiers présents » ≥ 2** (au moins un `.gpkg` et un `.qml` de taille > 0 avant effacement) et des lignes « rmFile » ; une ligne par nom : `….gpkg : N octets`, `….qml : N octets`, et `absent` ou une taille pour `….gpkg-wal`, `….gpkg-shm`, `….aux.xml`, `….gpkg.aux.xml` ; puis « Effacement par rmFile » sans « REFUSÉ » ; puis « Après effacement » | ☐ |
| 2 | Lire la dernière ligne ; capture | **« Tout effacé : oui »** | ☐ |

Relevé, sans résultat attendu :

| À relever | Valeur à écrire | Noté ☐ |
|---|---|---|
| Annexes présentes avant effacement (autres que `.gpkg` et `.qml`) : `-wal`, `-shm`, `.aux.xml` | | ☐ |

Capture : `p3-q5-ecran.png`. **Ordre fixé** : boutons 8, 10, 9 (avec leurs cartes regardées et
photographiées, P3-2 à P3-4), **puis** le 11 : il retire les couches. Il agit sur **le dernier
dossier écrit**, donc **celui du 9** : l'effacement porte sur ce seul dossier. Le toucher **une fois
par dossier** si l'on veut vider aussi ceux du 8 et du 10 (dans ce cas, après chacun) ; la réponse
reste celle du toucher sur le dossier du 9. **Ne pas toucher le 11 après le 9b ni après le 12** (le
12 écrit quatre couches d'un coup, le 9b n'ajoute rien à la carte).

**Réponse P3-5** : la liste des annexes vues (relevé) **et** « tout effacé : oui » ou « non ».
**Case 1 non cochable** si « Fichiers présents » est inférieur à 2 : l'écrire.
**Non** si une ligne « Après effacement » montre encore un fichier (le bloc devient rouge, « ÉCHEC »).
**Essai raté** si le bouton dit qu'aucune couche n'a été écrite.

### Durées : volume (9b) et coût fixe par couche (12)

> Le bouton 12 enchaîne **quatre petites couches** (2 entités chacune) : il mesure un **coût fixe
> par couche**, **pas la règle des 2 minutes du brief** (le zip `Serre_EA2026` entier, médiane de
> trois essais), qui se jugera à la mission d'import. Aucun verdict sur cette règle n'est tiré ici.

| N° | Geste | Résultat attendu | Conforme ☐ |
|---|---|---|---|
| 1 | Toucher « 9b. GeoJSON de 2 000 entités » (l'écran se fige pendant l'écriture : **attendre**, choisir « Attendre » si Android le propose ; redescendre au bas de l'écran) | le bloc dit « 2 000 entités », « écrit : oui, N octets, 2000 entités, EPSG:2154 » (N > 0) ; aucune ligne « ÉCHEC », fond non rouge ; relever la durée de `saveVectorLayerAs` et le total | ☐ |
| 2 | Toucher « 12. Tout enchaîner : coût fixe par couche » **jusqu'à voir la ligne « Médiane des trois derniers »** (au moins trois appuis ; chaque appui écrit dans un dossier neuf ; l'écran se fige : attendre, redescendre au bas) ; à chaque appui, relever le « TOTAL » | **case 2 cochée** si les trois derniers appuis sont sans aucune ligne « ÉCHEC » et la ligne « Médiane des trois derniers » est affichée avec une médiane qui est bien celle des trois totaux relevés | ☐ |

**Attendu** : la médiane dit « Médiane des trois derniers … » sans verdict ; **2 000 entités** au 9b.
**Relevé** (valeurs lues, à ne pas confondre avec l'attendu) : durée de `saveVectorLayerAs` du
9b : … ; total du 9b : … ; totaux du bouton 12, appuis 1, 2, 3 : … ; … ; … ; médiane lue : … ;
**vérifier la médiane** : c'est le total du milieu une fois les trois triés. Une « durée illisible »
ou un total à 0 ms **n'est pas une mesure** : ne pas le noter, le dire dans « Vu autrement ».
Captures : `p3-duree-9b.png`, `p3-duree-12.png` (au dernier appui).
**Réponse P3-6** : **oui** si la case 2 est cochée (la médiane des trois totaux est lue et juste, et
**aucun ÉCHEC** sur les trois appuis) ; **non** sinon ; **essai raté** si une étape ne charge pas.
(Un total qui compte une étape non conforme n'entre pas dans la médiane : le bloc le dit.) La
réponse ne dit **rien de la règle des 2 minutes** du brief (voir l'encadré ci-dessus).

**Si non (P3-1 à P3-6)** : la voie « réécrire dans `cerf-imports/` par `saveVectorLayerAs` » ne tient
pas sur le Samsung (ou pas dans le temps) : le décompresseur de la mission 026 reste nécessaire ;
c'est cette réponse qui décide de l'ADR 0008.

**Vu autrement :**

## Après l'essai

1. **Désactiver « Cerf, prototype n° 2 »** (QField, Paramètres, Plugins) : il n'agit que dans
   `cerf-essai-2.qgs`, mais un plugin d'essai n'a rien à faire sur un appareil de terrain.
2. Réactiver, si on le veut, « Cerf » 0.1.1 et « Cerf, prototype n° 1 ».
3. Remplir le tableau ci-dessous.

## Réponses (à remplir par Pascal)

| Question | Réponse (oui / non / règle de la question) | Capture jointe (nom attendu) | Nom Samsung de la capture | Remarque |
|---|---|---|---|---|
| 1a : couleurs du `.qml` pris, couche sortie du zip | | `q1-carte.png` | | |
| 1b : étiquettes prises, couche sortie du zip | | `q1-carte.png` | | |
| 2 : style pris dans le zip en `/vsizip/` (attendu : non) | | `q2-carte.png` | | |
| 3a : couleurs de `layer_styles` | | `q3-carte.png` | | |
| 3b : étiquettes de `layer_styles` | | `q3-carte.png` | | |
| 4 : `.qml` posé après ignoré (attendu : oui) ; 4d | | `q4-a.png`, `q4-b.png`, `q4-d.png` | | |
| 5 : le style revient après réouverture (oui / oui, mais par le projet / non / sans objet, par couche) ; n | | `q5-carte.png` | | |
| 6 : reprojection point et emprise, hors ligne | | `q6-ecran-haut.png`, `q6-ecran-bas.png` | | |
| 7 : `crs`, `extent`, `featureCount()` en `/vsizip/` | | `q7-ecran-1.png` à `q7-ecran-4.png` | | |
| P3-1 : Shapefile compressé réécrit, fichier écrit (oui / non / essai raté) | | `p3-q1-ecran.png` | | |
| P3-2a : couleurs du `.qml` écrit par le plugin, Shapefile | | `p3-q2-carte.png` | | |
| P3-2b : étiquettes, Shapefile | | `p3-q2-carte.png` | | |
| P3-3a : GeoPackage, table `Parcelles` (fichier, couleurs, étiquettes) | | `p3-q3-ecran.png`, `p3-q3a-carte.png` | | |
| P3-3b : GeoPackage, table `Zones` | | `p3-q3b-carte.png` | | |
| P3-4a : GeoJSON compressé réécrit, fichier écrit | | `p3-q4-ecran.png` | | |
| P3-4b : GeoJSON, style pris | | `p3-q4-carte.png` | | |
| P3-5 : annexes vues (liste) et tout effacé (oui / non) | | `p3-q5-ecran.png` | | |
| P3-6 : durées, médiane de trois (oui / non / essai raté) | | `p3-duree-9b.png`, `p3-duree-12.png` | | |

**Qui fait quoi d'ici quand, et comment saura-t-on que ça marche ?** Pascal passe les sept
questions sur le Samsung en mode avion, une capture par réponse ; on saura que ça marche
quand les neuf réponses (1a, 1b, 2, 3a, 3b, 4, 5, 6, 7) sont écrites, assez pour l'ADR des
styles et pour dire si la 012 peut reprojeter.

**Prototype n° 3 : qui fait quoi d'ici quand, et comment saura-t-on que ça marche ?** Pascal passe
les questions P3-1 à P3-6 sur le Samsung en mode avion, une capture par réponse (deux cartes pour
P3-3), et note les trois totaux du bouton 12 ; on saura que ça marche quand les réponses P3-1 à P3-6 sont écrites, « essai
raté » dit en toutes lettres quand une source ne charge pas : c'est ce qui décide si la
mission 026 (décompresseur) reste nécessaire.

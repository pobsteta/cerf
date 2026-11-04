# Protocole d'essai du prototype n° 2 (styles et reprojection dans QField)

> Rédigé par le `dev` le 4 novembre 2026 (mission 023, étape 2), d'après le plan
> `prototype-2/PLAN.md` validé par Pascal avec ses dix réponses, et la fiche
> `pilotage/missions/023-prototype-2.md`. Relecture à faire par le `testeur`.
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

**Comment remplir.** Pour chaque geste : le faire, regarder, puis cocher `☐` en `☒` si le
résultat attendu est vu tel quel. Un résultat différent se note dans « Vu autrement », jamais
dans la case. Une case non cochée veut dire non. **Une capture nommée par réponse** (noms
donnés ci-dessous), à joindre à la PR ou au journal. Captures **en intérieur** : les couleurs
d'essai sont très différentes, un reflet de soleil les brouillerait. **Critère** : sept
réponses oui/non (les questions 1, 3 et 4 en comptent deux ou trois, séparées), aucun seuil de
temps. Le prototype affiche chaque erreur mot pour mot : la recopier dans « Vu autrement ».

## Avant de commencer

| À noter | Valeur |
|---|---|
| Date de l'essai | |
| Appareil (modèle Samsung) | |
| Version d'Android | |
| Version de QField | |
| Prototype installé (version à l'écran, en-tête) | |

**1. Sur le poste, avant tout : contrôler les fichiers d'essai avec QGIS.** Je n'ai eu ni QGIS
ni GDAL pour fabriquer les `.qml` et le GeoPackage : un fichier mal formé donnerait un « non »
faux, et l'ADR se fonderait sur un faux. Télécharger `essai-styles.zip`, le décompresser, puis
ouvrir dans QGIS **ces fichiers** et regarder (aucun réglage à faire : les styles doivent
apparaître seuls) :

| Fichier à ouvrir | À voir dans QGIS | Vu ☐ |
|---|---|---|
| `UG_q1.geojson` (avec `UG_q1.qml` à côté) | contour bleu, sans remplissage, étiquettes `UG1` et `UG2` en bleu ; système de la couche : EPSG:2154 | ☐ |
| `Parcelles_q3.gpkg` (table `Parcelles_q3`) | contour orange, 1 mm, sans remplissage, étiquettes `P1` et `P2` en orange (style pris dans `layer_styles`) ; Gestionnaire de styles : un style par défaut | ☐ |
| `UG_q4.geojson` (avec `UG_q4.qml` à côté) | contour vert-bleu, sans remplissage, étiquettes `UG5` et `UG6` | ☐ |
| `FRT_q7.shp` | système EPSG:2154 (lu dans le `.prj`) | ☐ |
| `Sans_crs.geojson` | système **EPSG:4326** et emprise absurde (des milliers de « degrés ») | ☐ |

Si l'une des trois premières lignes n'est pas cochée, **le défaut est dans le fichier
d'essai, pas dans QField** : s'arrêter, me donner le `.qml` que QGIS produit (couche, Style,
Enregistrer le style), je remplace le mien. Ne pas passer à l'essai sur le Samsung.

**2. Avant le mode avion : télécharger sur le Samsung** depuis la préversion `prototype-2`
(https://github.com/pobsteta/cerf/releases/tag/prototype-2) :

- le plugin `cerf-prototype-2.zip`, à installer par URL dans QField
  (https://github.com/pobsteta/cerf/releases/download/prototype-2/cerf-prototype-2.zip) ;
  **ne pas renommer ce fichier** : QField nomme le dossier du plugin d'après le nom du zip ;
- le projet `cerf-essai-2.zip`
  (https://github.com/pobsteta/cerf/releases/download/prototype-2/cerf-essai-2.zip), à
  importer comme projet : Lambert 93, sans fond de carte, **sans `cerf_id`** ;
- le zip d'essai `essai-styles.zip`
  (https://github.com/pobsteta/cerf/releases/download/prototype-2/essai-styles.zip) :
  **17 entrées, toutes stockées** (sans compression), à laisser **tel quel** dans
  Téléchargements ;
- en repli seulement, le GeoPackage seul `essai-q3.gpkg`
  (https://github.com/pobsteta/cerf/releases/download/prototype-2/essai-q3.gpkg).

**3. Désactiver** les plugins « Cerf » 0.1.1 et « Cerf, prototype n° 1 » (Paramètres, Plugins) :
trois boutons de plugin sur la barre prêtent à confusion. Ne laisser actif que « Cerf,
prototype n° 2 ».

**4. Ouvrir le projet `cerf-essai-2`**, puis passer en **mode avion** (le réseau n'entre dans
aucune question : c'est ce qui est essayé). Écran du prototype : toucher son bouton dans la
barre des plugins ; l'en-tête dit version, projet, dossier du projet, dossier `cerf-imports`.

**Limite assumée (décision de Pascal, 4 novembre 2026).** Le zip d'essai est **stocké**. Un zip
de JFC, fait par QGIS ou 7-Zip, est **compressé** : le prototype ne sait pas l'extraire. Si les
questions 1 et 3 passent, une mission « inflate en JavaScript » suit. Le prototype dit
« entrée compressée, non extraite » si on lui en donne un.

**Gestes à ne faire qu'une fois chacun** : toucher deux fois « 1. Couche sortie du zip »
ajoute la couche deux fois ; si cela arrive, le noter dans « Vu autrement » et fermer puis
rouvrir le projet.

## Question 0 (préparation, sans réponse) : copier le zip dans le projet

| N° | Geste | Résultat attendu | Vu ☐ |
|---|---|---|---|
| 1 | Toucher « 0. Préparer le zip », accepter la permission de stockage si Android la demande, choisir `essai-styles.zip` dans Téléchargements | l'en-tête dit « Dernier zip copié : …/cerf-imports/essai-styles.zip (présent) » ; le bloc de résultat liste **17 entrées**, toutes « stockée », avec taille et CRC32 | ☐ |

Capture : `q0-liste.png` (la liste, défilée si besoin). Si le bloc dit « 0 octet rendu » ou une
erreur : le noter, **tout le reste est impossible**, s'arrêter et le dire.

## Question 1 : couche sortie du zip, `.qml` écrit à côté avant le chargement

| N° | Geste | Résultat attendu | Vu ☐ |
|---|---|---|---|
| 1 | Toucher « 1. Couche sortie du zip » | le bloc dit, pour `UG_q1.geojson` puis `UG_q1.qml`, « IDENTIQUE » (taille et CRC32 relus = ceux du zip) ; « Le .qml est écrit AVANT le chargement » ; `isValid : true`, `crs.authid : EPSG:2154`, `extent()` autour de X 1 050 000 ; Y 6 840 000 ; « Couche ajoutée à la carte » | ☐ |
| 2 | Fermer la fenêtre du plugin, regarder la carte (si « Centrage : ERREUR », zoomer à la main sur la position que donne le bloc) | **1a, couleurs** : deux carrés au **contour bleu, fin, sans remplissage** = oui ; remplissage plein ou couleur au hasard = non | ☐ |
| 3 | Regarder les carrés | **1b, étiquettes** : `UG1` et `UG2` écrits en **bleu**, petit corps (10 pt) = oui ; pas d'étiquette, ou étiquette d'une autre couleur = non | ☐ |

Captures : `q1-carte.png` (la carte zoomée sur la couche), `q1-ecran.png` (l'écran du plugin).

**Si non (1a ou 1b)** : un `.qml` posé à côté d'une couche sortie du zip n'est pas pris en
compte par `LayerUtils.loadVectorLayer` : l'ADR des styles ne peut pas compter sur lui ;
la pose par règle sur le nom devra passer par une autre voie (à chercher). Si seul 1b est non :
couleurs oui, étiquettes à poser autrement.

**Vu autrement :**

## Question 2 : couche lue dans le zip (`/vsizip/`), `.qml` dans le zip

| N° | Geste | Résultat attendu | Vu ☐ |
|---|---|---|---|
| 1 | Toucher « 2. Couche lue dans le zip » | `isValid : true`, `crs.authid : EPSG:2154`, « Couche ajoutée » ; la source commence par `/vsizip//` | ☐ |
| 2 | Regarder la carte | **attendu : non** : deux carrés au style par défaut de QGIS (remplissage plein, couleur au hasard, sans étiquette), entre ceux de la question 1 et ceux de la question 3. **Oui, surprise** si contour bleu sans remplissage avec étiquettes `UG3` et `UG4` : le dire en gros | ☐ |

Captures : `q2-carte.png`, `q2-ecran.png`. Répondre à « le style est pris dans le zip ? » : oui / non
(attendu : **non**).

**Si non (attendu)** : le plugin doit lire le `.qml` lui-même (c'est la spec § 5) et le poser
par une autre voie, ou sortir la couche du zip (question 1).

**Vu autrement :**

## Question 3 : GeoPackage avec table `layer_styles`

| N° | Geste | Résultat attendu | Vu ☐ |
|---|---|---|---|
| 1 | Toucher « 3. GeoPackage avec styles » | `Parcelles_q3.gpkg` « IDENTIQUE » (binaire : CRC32 relu) ; source `…/Parcelles_q3.gpkg\|layername=Parcelles_q3` ; `isValid : true`, `crs.authid : EPSG:2154` | ☐ |
| 2 | Regarder la carte | **3a, couleurs** : deux carrés au **contour orange, épais (1 mm), sans remplissage** = oui | ☐ |
| 3 | Regarder les carrés | **3b, étiquettes** : `P1` et `P2` en **orange**, gros corps (15 pt) = oui | ☐ |

Captures : `q3-carte.png`, `q3-ecran.png`.

**Si non** : la table `layer_styles` n'est pas lue au chargement : pas de style porté par le
GeoPackage lui-même ; à dire à l'ADR des styles. (Si la question « Avant de commencer » 1 a été
cochée, le défaut n'est pas dans le fichier.)

**Vu autrement :**

## Question 4 : `.qml` posé après le chargement

| N° | Geste | Résultat attendu | Vu ☐ |
|---|---|---|---|
| 1 | Toucher « 4. .qml posé après » | `UG_q4.geojson` « IDENTIQUE » ; « UG_q4.qml absent du dossier : oui » ; couche ajoutée ; l'écran dit « CAPTURE A MAINTENANT » | ☐ |
| 2 | Regarder la carte (carrés à l'est de ceux de la question 3), **capture A** | style par défaut de QGIS (remplissage plein, sans étiquette) | ☐ |
| 3 | Toucher « 4b. Écrire le .qml maintenant » | `UG_q4.qml` « IDENTIQUE » ; « La couche A n'a PAS été rechargée » ; l'écran dit « CAPTURE B MAINTENANT » | ☐ |
| 4 | Regarder la carte, **capture B** | **oui si la couche A n'a pas changé** : le style n'est lu qu'à la construction de la couche | ☐ |
| 5 | Toucher « 4c. Recharger la couche (reload) » ; regarder la carte | à noter : le bloc donne `typeof couche.reload`, le résultat de `reload()` (ou l'erreur) ; **la couche a-t-elle changé de style** (vert-bleu avec étiquettes) ? Réponse notée, pas de résultat attendu | ☐ |
| 6 | Toucher « 4d. Nouvelle couche, même fichier » ; **capture D** | la couche A est retirée ; la nouvelle couche `UG_q4_bis` a le style **vert-bleu `#008B8B`**, sans remplissage, étiquettes `UG5` et `UG6` | ☐ |

Captures : `q4-a.png`, `q4-b.png`, `q4-d.png`, `q4-ecran.png` (écran après 4d). Réponse de la
question : le `.qml` posé après est ignoré = oui (cases 4 et 6). Note 4c : `reload()`
relit-il le style ? oui / non / absent.

**Si non (la couche A change après 4b)** : QGIS surveille le fichier et relit le style : bonne
nouvelle, l'ordre « `.qml` puis couche » n'est plus une contrainte ; à dire à l'ADR.

**Vu autrement :**

## Question 5 : réouverture du projet

À faire **après** les questions 1 et 3 (les deux couches `UG_q1` et `Parcelles_q3` sont sur
la carte).

| N° | Geste | Résultat attendu | Vu ☐ |
|---|---|---|---|
| 1 | Toucher « 5. Mémoriser » | « Réglages de QField : écrit 2 couche(s) » ; la ligne « Relu : » montre les deux chemins | ☐ |
| 2 | **Fermer le projet, puis le rouvrir** (sans rien toucher d'autre) ; ouvrir le plugin | le bloc dit « Réouverture détectée (loadProjectEnded) » ; sinon toucher « 5. Après réouverture » | ☐ |
| 3 | Lire la ligne « Présentes dans le projet : n » | note : **n = 0, 1 ou 2** (si 2, QField a enregistré le projet avec les couches, et le style vu peut venir du projet enregistré, pas du fichier voisin) | ☐ |
| 4 | Regarder la carte | **oui** si les deux couches sont revenues avec leur style (bleu et orange, étiquettes) | ☐ |

Captures : `q5-carte.png`, `q5-ecran.png`. Pour les couches « rechargées » par le plugin (n < 2),
la réponse vaut : le style est relu depuis le disque, sans réécrire de `.qml`.

**Si non** : les couches importées ne reviennent pas seules à la réouverture (n = 0) ou
reviennent sans leur style : le plugin doit recharger les couches et reposer le style à chaque
ouverture ; à dire à l'ADR.

**Vu autrement :**

## Question 6 : reprojection depuis QML, hors ligne

**Mode avion activé** : le réseau n'entre pas dans ces appels.

| N° | Geste | Résultat attendu | Vu ☐ |
|---|---|---|---|
| 1 | Toucher « 6. Reprojection » | les deux systèmes : `fromDescription(EPSG:2154).isValid : true`, `authid : EPSG:2154` ; `wgs84Crs().isValid : true`, `authid : EPSG:4326` | ☐ |
| 2 | **Ligne 1**, point (longitude 7,76189 ; latitude 48,56906) | X (est) ≈ **1 051 113**, Y (nord) ≈ **6 840 462** à **5 m** près ; « à 5 m près : oui » | ☐ |
| 3 | **Ligne 2**, emprise (7,75 ; 48,56) à (7,77 ; 48,58) | rectangle non nul, quatre bornes de l'ordre de X 1 04x xxx à 1 05x xxx, Y 6 83x xxx à 6 84x xxx ; `isNull : false` | ☐ |
| 4 | **Ligne 3** | « OUI, vraisemblable » : tous les coins dans X 89 101 à 1 252 436, Y 6 036 555 à 7 120 480 | ☐ |

Ne pas cocher une valeur à `undefined`, `0 ; 0` ou accompagnée d'une exception : c'est non.
Lignes à **noter**, sans résultat attendu fixé (elles disent ce que QField fait en cas
d'erreur, pour la 012) :

| Ligne | Ce que dit le bloc (à recopier) |
|---|---|
| 4 : noms qui existent (`typeof`) | `GeometryUtils` : … ; `CoordinateReferenceSystemUtils` : … |
| 5 : même système des deux côtés | attendu : « rendue SANS changement » : |
| 6 : système invalide (`invalidCrs`) | « rendue SANS changement », « vide (0 ; 0) » ou autre : |
| 7 : reprojection impossible (mètres pris pour des degrés) | « vide (0 ; 0) : ÉCHEC silencieux », exception, ou autre : |

Captures : `q6-ecran-haut.png` et `q6-ecran-bas.png` (l'écran entier, lignes 1 à 7, défilé).
La question répond : la reprojection point et emprise existe depuis QML, hors ligne = oui / non.

**Si non** : la 012 ne peut pas reprojeter depuis QML avec ces fonctions ; sa décision
(contrôle de vraisemblance) reste à reprendre. **Quoi qu'il arrive, les lignes 6 et 7** disent
si un échec se voit : QField (lu dans son code) ne lève pas d'exception, il rend un objet vide ;
le contrôle de la 012 devra le traiter comme une erreur.

**Vu autrement :**

## Question 7 : `crs`, `extent` et `featureCount()` en `/vsizip/`

| N° | Geste | Résultat attendu | Vu ☐ |
|---|---|---|---|
| 1 | Toucher « 7. Métadonnées d'une couche » | quatre blocs : `UG_q2.geojson`, `Sans_crs.geojson`, `FRT_q7.shp`, `FRT_sansprj.shp`, chacun lu en `/vsizip/` | ☐ |
| 2 | Bloc `UG_q2.geojson` | `isValid : true`, `crs.authid : EPSG:2154`, comptage par `createFeatureIterator` : **2** | ☐ |
| 3 | Bloc `FRT_q7.shp` | `isValid : true`, `crs.authid : EPSG:2154`, comptage : **2** | ☐ |
| 4 | Bloc `Sans_crs.geojson` | `crs.authid : EPSG:4326` (RFC 7946) et `extent()` absurde (X de l'ordre de 1 051 000 « degrés ») ; « emprise reprojetée en EPSG:2154 » **vide ou hors emprise**, verdict « refus » : le refus de la 012 est possible | ☐ |

À **noter** (sans résultat attendu) : `featureCount()` appelé en direct (valeur ou erreur ;
attendu : non invocable) ; `FRT_sansprj.shp` : quel système QField rend-il **sans `.prj`**
(`crs.authid`, `crs.isValid`, `crs.description`), et quelle emprise ; `crs.description` des
autres couches ; une emprise nulle sur un fichier vide ou illisible.

Capture : `q7-ecran-1.png` à `q7-ecran-4.png` (un écran par bloc, défilé).

**Si non** : la 012 ne peut pas se fonder sur `crs` ou `extent` pour refuser une couche
sans système ; à reprendre.

**Vu autrement :**

## Réponses (à remplir par Pascal)

| Question | Réponse (oui / non) | Capture jointe | Remarque |
|---|---|---|---|
| 1a : couleurs du `.qml` pris, couche sortie du zip | | `q1-carte.png` | |
| 1b : étiquettes prises, couche sortie du zip | | `q1-carte.png` | |
| 2 : style pris dans le zip en `/vsizip/` (attendu : non) | | `q2-carte.png` | |
| 3a : couleurs de `layer_styles` | | `q3-carte.png` | |
| 3b : étiquettes de `layer_styles` | | `q3-carte.png` | |
| 4 : `.qml` posé après ignoré (attendu : oui) ; note 4c ; 4d | | `q4-a.png`, `q4-b.png`, `q4-d.png` | |
| 5 : le style revient après réouverture ; n présentes | | `q5-carte.png` | |
| 6 : reprojection point et emprise, hors ligne | | `q6-ecran-haut.png`, `q6-ecran-bas.png` | |
| 7 : `crs`, `extent`, `featureCount()` en `/vsizip/` | | `q7-ecran-1.png` à `q7-ecran-4.png` | |

**Qui fait quoi d'ici quand, et comment saura-t-on que ça marche ?** Pascal passe les sept
questions sur le Samsung en mode avion, une capture par réponse ; on saura que ça marche
quand sept réponses oui/non sont écrites, assez pour l'ADR des styles et pour dire si la 012
peut reprojeter.

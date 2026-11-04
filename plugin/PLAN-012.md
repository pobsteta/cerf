# Plan de la mission 012 — contrôles d'import (étape 1 : plan, aucun code)

> Rédigé par l'agent `dev` le 4 novembre 2026. Fiche : `pilotage/missions/012-controles.md`
> (en « tenir » : on rend un plan, Pascal valide avant le code). Sources lues : spec § 3.1, § 4,
> § 9 n° 7, ADR 0004, référentiel d'emprise (002), `plugin/cerf-logique.mjs`, `plugin/Cerf.qml`,
> `plugin/PLAN.md`. Les tests `tests/controles.test.mjs` n'ont pas été lus (consigne) : leur
> contrat est celui de la fiche. **Je n'ai pas le code de QField ni de QGIS sous la main pour
> ce plan** : tout appel d'API ci-dessous est étiqueté « connu » (déjà employé dans `Cerf.qml`),
> « à vérifier » (à confirmer dans les sources de QField v4.3.7 avant de coder) ou
> « Samsung seulement ».

## 1. La mission en une phrase

Écrire `plugin/cerf-controles.mjs`, qui applique dans l'ordre les contrôles du § 4 à chaque
couche du zip et rend un message clair par couche refusée (avec le nom de la couche en tête),
pour que l'agent ne voie jamais une couche mal placée, et la brancher dans l'import **avant**
l'ajout au projet.

## 2. Le contrat (fixé par la fiche)

`controlerCouche(couche, services)` : synchrone, sans réseau, ne lève pas d'exception
(toute exception interne vaut refus, § 4). `services.reprojeter` est appelé **même quand la
couche est déclarée en EPSG:2154** (pas de raccourci : un système mal déclaré ne doit pas
passer). Résultat : `{ charge, controle, message, avertissements }`.

- `charge` : vrai si la couche peut être ajoutée au projet.
- `controle` : le contrôle qui a arrêté la couche (les numéros du § 4 : 1 `.prj`, 2 lecture,
  3 système, 4 vide, 5 vraisemblance), ou rien si la couche passe. La forme exacte (nombre,
  mot) se cale sur l'en-tête des tests ; je la lis à l'étape 2 et je m'y range.
- `message` : le refus, vide si `charge` est vrai.
- `avertissements` : liste de textes (`.cpg` absent, couche vide).

Le module est du JavaScript pur, sans import de QField : testable sous Node (ADR 0005).
Les nombres de l'emprise (X 89 101 → 1 252 436, Y 6 036 555 → 7 120 480) y sont **écrits en
constante**, avec renvoi à `docs/referentiels/emprise-metropole.json` ; un test compare la
constante au JSON, pour qu'une des deux copies ne dérive pas sans que ça se voie.

### Ordre et textes (spec § 4)

| # | Contrôle | Sortie | Texte (nom de couche avec extension en tête) |
|---|---|---|---|
| 1a | Shapefile : `.prj` absent du zip (même dossier, même nom, casse ignorée) | refus | « Parcelles.shp : fichier .prj manquant, système de coordonnées inconnu » |
| 1b | Shapefile : `.cpg` absent | avertissement, on continue | « Parcelles.shp : accents peut-être mal lus » |
| 2 | La source ne s'ouvre pas (`isValid` faux, exception) | refus | « X : illisible » |
| 3 | Système invalide (GeoTIFF non géoréférencé, `.prj` illisible) | refus | « X : système de coordonnées inconnu » |
| 4 | Couche vide | avertissement, **chargée, sans contrôle 5** | « X : couche vide » |
| 5 | Emprise reprojetée non contenue dans le rectangle ; **toute erreur de reprojection** (exception, valeur non finie, système refusé) | refus | « X : Coordonnées incohérentes : système mal déclaré ? » |

Le premier refus arrête la couche ; les avertissements déjà posés sont conservés (le `.cpg`
absent n'est dit que si la couche est finalement chargée : une couche refusée n'a qu'un
message, le refus). Pour une table de GeoPackage : « fichier.gpkg/table : … ».
Les `.shx` et `.dbf` manquants : la spec § 3.1 les dit obligatoires mais § 4 ne leur donne pas
de message ; voir la question n° 3.

Détails de justesse :
- Comparaison **contenue** : toutes les bornes incluses (≥ min, ≤ max). Une emprise de
  largeur nulle (un seul point) est valable.
- Valeurs `NaN`, `Infinity`, emprise nulle ou inversée rendues par QGIS → refus 5
  (jamais « passe »).
- Sans élargissement supplémentaire : la marge de 10 km est déjà dans les constantes.

## 3. Comment une couche QGIS devient l'objet `couche`

Un petit adaptateur dans `Cerf.qml` (seul fichier qui touche QField) construit un objet JS
simple, que `cerf-controles.mjs` lit sans rien connaître de QGIS :

```
couche = {
  nom,            // « Parcelles.shp », ou « Serre.gpkg/UG » : entrée du zip, extension comprise
  format,         // 'geojson' | 'gpkg' | 'shp' | 'tif'  (d'après l'extension, casse ignorée)
  fichiers,       // liste des noms du zip dans le même dossier que la couche (pour .prj, .cpg)
  lisible,        // couche.isValid
  crs: { valide, authid },   // authid sert au message de diagnostic, pas à la décision
  nbEntites,      // vectoriel : nombre d'entités ; raster : null (jamais « vide »)
  emprise,        // { xmin, ymin, xmax, ymax } dans le système de la couche, ou null
}
```

Ce que donne chaque donnée, et ce qui reste incertain :

| Donnée | Source | Statut |
|---|---|---|
| `nom`, `format`, `fichiers` | la liste des noms du zip, déjà lue par `nomsDuZip` ; extension de l'entrée. Le `.prj` / `.cpg` se cherchent **dans cette liste**, pas par GDAL : QGIS peut attribuer un système en silence à un Shapefile sans `.prj`, donc on ne regarde pas ce que QGIS en dit. | connu (liste déjà lue) |
| `lisible` | `couche && couche.isValid` (déjà employé par `chargerSansPlanter`) | connu |
| système, validité | `couche.crs` (QgsCoordinateReferenceSystem) et son `isValid` | **à vérifier** : `crs` est une propriété de `QgsMapLayer` exposée à QML, mais l'exposition de `isValid` sur le type `QgsCoordinateReferenceSystem` en QML est à confirmer. Repli : `couche.crs.authid` vide ou `''` = invalide. |
| nombre d'entités | `couche.featureCount()` | **à vérifier** : méthode invocable depuis QML ? Repli : `couche.dataProvider.featureCount()`, ou compter via `couche.getFeatures()` (lent sur gros fichiers, à éviter). |
| emprise | `couche.extent` (QgsRectangle, propriété de `QgsMapLayer`) | **à vérifier** : c'est un rectangle, `xMinimum()` etc. ; pour une couche vide, QGIS rend une emprise nulle ou « infinie » : traitée comme « pas d'emprise », d'où le contrôle 4 **avant** le 5. |
| GeoJSON sans `crs` | QGIS le lit en EPSG:4326 (RFC 7946) : le système est donc **valide**, et c'est le contrôle 5 qui le refuse (Lambert 93 lu en degrés). Même chose pour les axes inversés. | logique ; comportement de GDAL à confirmer sur le zip `piege` |
| GeoTIFF sans géoréférencement | système invalide, ou emprise 0 → N × 0 → M en pixels : le contrôle 3 le prend si `crs` est invalide ; sinon l'emprise en pixels (0 à quelques milliers) est refusée par le 5. Dans les deux cas : refus. | **Samsung / piège** : le message dépend de ce que GDAL rend ; on accepte « système de coordonnées inconnu » ou « Coordonnées incohérentes », les deux sont des refus |
| Raster | `loadVectorLayer` ne charge pas un GeoTIFF. Il faut un chargeur raster (`LayerUtils.loadRasterLayer` ?) | **à vérifier**, et hors de cette mission si le § 3.1 des formats est la mission 010 : voir question n° 4 |

Où est construit l'objet : une fonction `decrire(couche, entree, noms)` dans `Cerf.qml`,
qui protège chaque lecture par `try` ; une lecture qui échoue donne `lisible: false` (refus
« illisible »), jamais une exception qui ferait tomber l'import des autres couches.

## 4. Comment `reprojeter` est fourni côté QML

Service passé à `controlerCouche`, qui rend le rectangle de la couche **en EPSG:2154** ou lève
une erreur (l'erreur vaut refus). Je le fixe ainsi, à caler sur l'en-tête des tests :
`reprojeter(emprise, crsSource) → { xmin, ymin, xmax, ymax }`.

Côté QML, deux voies, par ordre de préférence :

1. **Une fonction de QField qui reprojette un rectangle** (à chercher dans les sources de
   QField v4.3.7 : `GeometryUtils`, `CoordinateTransformer`…). C'est la voie la plus simple
   si elle existe ; elle densifie les bords d'elle-même si elle s'appuie sur
   `QgsCoordinateTransform::transformBoundingBox`, qui en QGIS densifie par défaut
   (100 points par bord) : **à confirmer**.
2. **Si rien n'est exposé à QML : densification en JavaScript** (déterministe, testable sous
   Node) et reprojection **point par point** : 21 points par bord (80 points), plus les
   quatre coins ; chaque point reprojeté par la fonction de QField qui reprojette un point
   (`GeometryUtils.reprojectPoint` ou équivalent, **à vérifier**) ; le rectangle rendu est
   le min/max des points reprojetés.
   La densification se fait **en degrés ou dans le système de la couche, puis on
   reprojette** (comme l'a fait la mission 002) : un rectangle de bords densifiés reprojeté
   ne peut pas sortir d'un rectangle voisin sans que ça se voie.

Dans tous les cas, `Cerf.qml` : `try` autour de l'appel ; une exception, une valeur
non finie (NaN, Infinity) ou un résultat absent = erreur = refus. `reprojeter` est appelé
**même si `crs` vaut EPSG:2154** (contrat de la fiche) : le coût est négligeable et le
chemin de refus sur erreur reste le même.

Incertitude principale (risque n° 1 ci-dessous) : **si aucune de ces voies n'existe dans
QField, le contrôle 5 ne peut pas être fait en QML** ; je le remonte à Pascal avant de
coder le branchement, sans inventer de contournement.

## 5. Où l'appel s'insère

Aujourd'hui (`Cerf.qml`, `chargeur()`) la couche est chargée **et ajoutée au projet** dans
`chargerCouche`, puis `importerZip` pose `readOnly` et inscrit au registre. Une couche refusée
serait donc déjà sur la carte : **c'est à corriger**. Le branchement :

1. `chargeur()` est séparé en deux temps : `ouvrirCouche(source, nom)` (charge par
   `LayerUtils.loadVectorLayer` **sans** `ProjectUtils.addMapLayer`) et
   `ajouterALaCarte(couche, zip, nom)` (marque `cerf/zip`, `cerf/couche`, ajoute).
2. `importerZip` (dans `cerf-logique.mjs`), pour chaque couche, dans l'ordre :
   ouvrir → **`controlerCouche`** → si refus : message, rien d'ajouté, **rien d'inscrit au
   registre**, on passe à la suivante → si accepté : `readOnly = true`, ajout à la carte,
   inscription au registre (« après chaque couche », spec § 1, geste 5), avertissements
   ajoutés au message.
3. Le contrôle 1 (`.prj` absent) se joue **avant l'ouverture** : pas la peine de lire un
   Shapefile sans système (QGIS peut lui en attribuer un en silence).
4. Une couche ouverte puis refusée n'est pas ajoutée au projet : elle n'apparaît ni sur la
   carte ni au registre. Sa libération mémoire (propriété `CppOwnership`, posée par
   `loadVectorLayer`) est **à vérifier** : une petite fuite par couche refusée est
   acceptable (quelques refus par import), à noter au journal si on ne sait pas la libérer.
5. **Rechargement à l'ouverture du projet** (`demarrerProjet`) : les couches du registre ont
   déjà passé le contrôle ; je ne les recontrôle **pas** (aucune valeur ajoutée, le registre
   ne contient que des couches acceptées). Si Pascal préfère les recontrôler, c'est une
   décision à lui : question n° 5.
6. Interface : `controlerCouche` n'est **pas** optionnel dans `importerZip` (si le service
   manque, on refuse tout, jamais « pas de contrôle = tout passe »). Conséquence : les
   tests de 008/009 qui appellent `importerZip` sans le service devront être mis à jour ;
   or je ne modifie aucun test. Question n° 1.
7. `empaqueter.mjs` : ajout de `cerf-controles.mjs` à `FICHIERS_PLUGIN` (fiche) ; un test
   vérifie qu'il est bien dans le zip du plugin (sinon QField ne trouverait pas le module
   et le plugin planterait au chargement).

## 6. Les messages affichés à l'agent

- Une ligne par couche refusée ou avertie, **commençant par le nom avec extension**
  (spec § 4 « Nom de la couche dans les messages »), jamais par un code ni par un chemin
  `/vsizip/`.
- Le message final de `importerZip` garde sa forme : « N couches chargées : … », puis une
  ligne par refus, puis une ligne par avertissement.
- Pas de bouton « charger quand même » (spec § 9 n° 7) ; le message ne le propose pas. Il
  dit quoi faire côté bureau seulement quand c'est sûr : `.prj` manquant → « refaire
  l'export avec son .prj » est une proposition de texte, **à valider par Pascal** (question
  n° 2) ; sinon les textes de la spec § 4 sont gardés tels quels.
- Textes lisibles gants et soleil : courts, une idée par ligne.

## 7. Les tests que j'écrirai (étape 2) et ceux de la 011

- Faire passer les tests de la 011 **sans les modifier** ; s'ils me paraissent faux, je le dis.
- Mes tests à moi, en plus : constante d'emprise = JSON de la 002 ; bornes incluses (un
  point sur chaque bord, un point à 1 m dehors) ; Jersey et Genève passent (limite acceptée
  ADR 0004, un test le dit pour que ça ne soit pas « corrigé » par erreur) ; `NaN` refusé ;
  `reprojeter` qui lève → refus ; `reprojeter` appelé même en 2154 ; ordre des contrôles
  (le `.prj` absent prime sur « illisible », couche vide ne passe jamais par le 5) ;
  couche refusée ni ajoutée ni inscrite (dans `importerZip`) ; la couche suivante est
  quand même traitée.
- Règle de test du projet : coordonnées avec ordre et système **explicites** (x = Est, y =
  Nord, EPSG:2154 ; lon puis lat en 4326), et un point connu (Strasbourg : 1 051 113 ;
  6 840 462, valeurs du référentiel 002) qui tombe au bon endroit.

## 8. Ce qui ne se prouve que sur le Samsung

| Quoi | Pourquoi pas sous Node |
|---|---|
| `couche.crs`, `extent`, `featureCount()` rendent bien ce qu'on croit pour un GeoJSON, un Shapefile, un GeoPackage et un GeoTIFF lus par `/vsizip/` | API QField réelle |
| La reprojection réelle (service `reprojeter`) donne Strasbourg ≈ (1 051 113 ; 6 840 462) à quelques mètres | PROJ de QField, grilles de transformation absentes hors ligne |
| Zip `piege` : GeoJSON Lambert 93 sans `crs` refusé ; Shapefile sans `.prj` refusé ; GeoTIFF sans géoréférencement refusé ; couche vide chargée avec avertissement ; couche de nom non reconnu chargée | critère 6 de la spec |
| Aucune couche refusée ne reste sur la carte ni ne revient à la réouverture du projet | ajout au projet et registre réels |
| Les messages sont lisibles au soleil, avec le nom de couche en tête | lecture à l'écran |
| Temps ajouté par les contrôles au critère n° 1 (≤ 2 min) | mesure |

**L'échantillon que Pascal vérifiera** (fiche) : le zip `piege` sur le Samsung, mode avion.

## 9. Risques

| # | Risque | Parade |
|---|---|---|
| 1 | **QField n'expose pas de reprojection à QML** : le contrôle 5 est impossible en QML. | Chercher à l'étape 2 (avant de coder le branchement) ; sinon remonter à Pascal : option de demander l'API à QField, ou de coder la projection Lambert 93 en JavaScript (long, à valider : précision et propriété du code). **Pas de contournement silencieux** : sans contrôle 5, pas d'import. |
| 2 | **Grilles de transformation absentes hors ligne** : RGF93 → WGS84 est sans grille, mais un `.prj` en NTF ou un système exotique en demanderait ; la reprojection pourrait lever ou rendre un résultat décalé de dizaines de mètres. | Une erreur vaut refus (spec § 4) ; un décalage faible passe le contrôle, accepté (ADR 0004 : le critère 3 de la spec le mesure). |
| 3 | `extent` d'une couche vide rendu comme une valeur « infinie » plutôt que nul : sans le contrôle 4 avant le 5, refus à tort. | Le contrôle 4 prime sur le 5 (spec) ; test ; valeurs non finies = « pas d'emprise ». |
| 4 | `extent` en cache obsolète sur un GeoJSON : QGIS peut rendre l'emprise de la couche avant lecture complète. | Vérifier sur le Samsung ; au besoin forcer `updateExtents()` avant lecture (à vérifier : exposé à QML ?). |
| 5 | Un **faux refus** bloque l'agent jusqu'au retour au bureau (pas de chargement forcé, valeur acceptée par Pascal le 2 novembre). | Messages précis ; zip `piege` ; un vrai zip `Serre_EA2026` en Lambert 93 doit passer (test de recette). |
| 6 | Changement d'interface de `importerZip` : les tests 008/009 existants. | Question n° 1. |
| 7 | Libération des couches refusées (voir § 5 n° 4). | Noter au journal ; fuite faible. |
| 8 | Zip réimporté sous le même nom : GDAL lit pendant que la copie est écrasée (PLAN.md § 280 n° 4) : déjà noté, **hors périmètre**. | Rien ici. |

Hors périmètre, noté pour l'orchestrateur : la reconnaissance des formats autres que
`.geojson` dans `couchesDuZip` (le `.json` triage, GeoPackage, Shapefile, GeoTIFF) est la
mission 010 ; mon module sait contrôler tous les formats du § 3.1, mais tant que 010 n'a pas
fusionné, seuls des GeoJSON arrivent jusqu'à lui en recette.

## 10. Mes questions pour Pascal (chacune avec ma réponse proposée)

1. **`importerZip` change d'interface** (service de contrôle obligatoire, séparation
   ouvrir / ajouter) et les tests de 008 qui l'appellent sans ce service échoueront : qui
   met ces tests à jour ?
   *Proposé :* l'orchestrateur confie la mise à jour de ces tests au `testeur` dans la même
   PR ; je ne les modifie pas ; et le service reste obligatoire (jamais « pas de contrôle =
   tout passe »).
2. **Faut-il ajouter une consigne aux messages de refus** (« refaire l'export avec son
   .prj », « vérifier le système de coordonnées à l'export »), ou garder exactement les
   textes de la spec § 4 ?
   *Proposé :* garder les textes de la spec tels quels en tranche 1 ; la consigne va dans la
   notice de JFC (`docs/notice-jfc.md`), pas dans le plugin.
3. **Shapefile sans `.shx` ou `.dbf`** : la spec § 3.1 les dit obligatoires, § 4 ne donne
   pas de message. Que faire ?
   *Proposé :* même famille que le `.prj` : refus « Parcelles.shp : fichier .shx manquant »
   (ou `.dbf`), avant ouverture, ordre `.shx`, `.dbf` puis `.prj`… à ton choix : ce serait
   un ajout à la spec § 4 que tu valides ; sans ta réponse, je ne le code pas et la couche
   passe à l'ouverture, où QGIS la refuse en « illisible ».
4. **GeoTIFF** : `loadVectorLayer` ne le charge pas ; le chargement raster est-il de cette
   mission ou de la 010 ?
   *Proposé :* de la 010 ; la 012 ne livre que le contrôle (le module sait traiter un raster
   décrit par l'objet `couche`), le branchement raster suit la 010.
5. **Recontrôler les couches du registre à la réouverture du projet** ?
   *Proposé :* non (elles ont déjà passé le contrôle ; le registre ne contient que des
   couches acceptées ; moins de temps au démarrage).
6. **Couche vide** : la spec dit « chargée quand même, sans contrôle d'emprise ». Pour un
   Shapefile vide **sans `.prj`**, le contrôle 1 l'emporte (refus). Confirmé ?
   *Proposé :* oui (l'ordre de la spec : 1 avant 4).
7. **Emprise gelée** : la fiche dit « gelée par 002 avant fusion », le référentiel dit
   « à geler avant la fusion de la 012 ». Je prends les valeurs du JSON (89 101 / 1 252 436 /
   6 036 555 / 7 120 480) comme gelées.
   *Proposé :* oui ; si le gel change les valeurs, le test qui compare constante et JSON
   me le dit.

## 11. Question de contrôle

Qui fait quoi d'ici quand, et comment saura-t-on que ça marche ? D'ici la fin de l'étape 2 :
moi, le module et son branchement (tests de 011 verts, `.claude/test-command`) ; le
`relecteur`, puis Pascal, la PR ; puis Pascal charge le zip `piege` sur le Samsung en mode
avion : **un message clair par piège, aucune couche hors de France sur la carte.**

## Proposition de ligne de journal

4 novembre 2026 — Mission 012 (contrôles d'import), étape 1 : plan rendu (`plugin/PLAN-012.md`) ;
risque principal : reprojection non prouvée côté QML ; sept questions à Pascal ; aucun code.

## Réalisation : écarts au plan

- **Ordre réel dans `importerZip`.** Ouverture (sans ajout à la carte), puis contrôle. Si
  l'ouverture échoue (exception, couche nulle ou invalide), `controlerCouche` est quand même
  appelé avec `lisible: false` : le contrôle 1 (Shapefile incomplet) passe avant « illisible »,
  et le message porte le nom avec extension, sans erreur technique collée. Le plan disait
  « contrôle 1 avant l'ouverture » : il est resté dans le module, mais exécuté après la
  tentative d'ouverture (qui ne coûte rien, la couche échouée n'étant pas ajoutée).
- **Réimport d'un zip du même nom.** Une couche refusée (contrôle, ouverture, ajout impossible)
  est retirée du registre : elle ne revient pas sans contrôle à la réouverture. Décision n° 8
  de Pascal : une couche qui n'est plus du tout dans le zip réimporté est aussi retirée du
  registre (le zip remplace l'ancien en entier). `importerZip` retire, avant la boucle, les
  entrées du même zip dont la couche n'est plus listée ; les entrées des autres zips et les
  fichiers de `cerf-imports/` ne sont pas touchés.
- **Système de coordonnées.** Le plan exigeait un `authid` EPSG ; écart corrigé : la validité est
  celle de QGIS (un `.prj` ESRI ou IGNF valide est accepté), `authid` ne sert qu'au diagnostic,
  et l'objet `crs` de la couche est transmis tel quel à la reprojection (pas de
  `fromDescription("EPSG:"+n)`).
- **Fuite mémoire faible.** Une couche ouverte puis refusée n'est pas ajoutée au projet ; sa
  libération (propriété `CppOwnership` posée par `loadVectorLayer`) n'est pas prouvée : quelques
  couches refusées par import, fuite faible acceptée, à noter au journal.

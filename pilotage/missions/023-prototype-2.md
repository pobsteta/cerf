# Mission 023 — Prototype n° 2 : styles et reprojection dans QField

> Fiche rédigée par Claude (orchestrateur) le 4 novembre 2026, après le blocage de la 010
> (pose des styles) et l'écart de la 012 (reprojection non prouvée). **Statut : validée par Pascal le
> 4 novembre 2026 (porte n° 2).** Une
> mission = une phrase = une branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Écrire un plugin QField jetable qui essaie, sur le Samsung de Pascal et hors réseau, de poser le style du manuel par un .qml voisin (couche sortie du zip dans cerf-imports/, couche lue dans le zip, GeoPackage avec table layer_styles, étiquettes comprises) et de reprojeter un point et une emprise depuis QML, pour que l'ADR des styles et la fusion des missions 010 et 012 reposent sur ce qu'on a vu sur l'appareil.

**Redite par l'agent :** _à remplir par l'agent avant de commencer._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? | **en partie** — rapport de l'acquéreur du 4 novembre (journal) ; sources QField lisibles par WebFetch seulement (`gh` et `raw.githubusercontent.com` partiellement refusés aux agents) | appuyer : plan d'abord |
| A-t-il les moyens ? | **en partie** — l'essai revient à Pascal sur le Samsung ; protocole sur le modèle de `tests/recette/prototype-1.md` | appuyer : plan d'abord |

**Temps de la main :** tenir — le résultat décide de l'architecture des styles (ADR) et du sort de la 012.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `dev`
- **Modèle :** opus
- **Ce qui ne lui est pas demandé :** le vrai plugin ; toucher aux branches des 010 et 012.

## Harnais

- **Peut :** écrire `prototype-2/` (plugin jetable, empaqueteur, zip d'essai avec un GeoJSON
  UG et son `.qml`, un GeoPackage avec `layer_styles`), `tests/recette/prototype-2.md`
  (protocole, une question par bouton, réponse oui/non + capture), ses tests `node --test`,
  et un workflow de préversion `prototype-2` (jamais « latest »).
- **Ne doit pas :** sortir du périmètre, toucher à `main`, au plugin `plugin/`, au brief, à
  la spec, aux ADR, effacer une ligne du journal ; contourner un accès bloqué.

## Ce que le prototype doit faire dire à l'appareil (un bouton par question)

1. Couche GeoJSON **sortie du zip** dans `<projet>/cerf-imports/`, `.qml` écrit à côté
   **avant** `loadVectorLayer` : couleurs du `.qml` affichées ? étiquettes ?
2. Même couche lue en **`/vsizip/`** avec le `.qml` dans le zip : style pris ? (attendu : non)
3. **GeoPackage** copié avec une table `layer_styles` (`useAsDefault`) : style pris ?
4. `.qml` posé **après** le chargement : ignoré ? (attendu : oui)
5. Après **réouverture du projet** : la couche des questions 1 et 3 garde-t-elle son style ?
6. **Reprojection** depuis QML : un point de Strasbourg en WGS84 vers EPSG:2154 (attendu
   ≈ 1 051 113 ; 6 840 462 à quelques mètres) et une emprise ; quelles fonctions existent
   (`GeometryUtils`, `CoordinateReferenceSystemUtils` ou autres) ; hors ligne.
7. Ce que rendent `crs`, `extent` et `featureCount()` pour un GeoJSON et un Shapefile lus
   en `/vsizip/`.

## Dépend de / rouge attendu jusqu'à

- Aucune ; CI : pas de rouge attendu. Plafond de 3 PR : la PR part quand une place se libère.

## Tests

- Tests `node --test` de ce qui est pur (fabrication du zip d'essai, `.qml`, table
  `layer_styles`) ; le reste est la recette de Pascal.

## Terrain

- **Échantillon que Pascal vérifiera :** les 7 questions sur le Samsung, en mode avion, une
  capture par réponse.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Qui tranche :** Pascal (puis ADR des styles, avec le `contradicteur`).

## Comment saura-t-on que ça marche ?

Sept réponses oui/non vues sur le Samsung, qui suffisent à écrire l'ADR des styles et à
dire si la 012 peut reprojeter.

## Décisions de Pascal sur le plan (4 novembre 2026)

Plan `prototype-2/PLAN.md` (2025707) **validé avec les dix réponses proposées** : zip d'essai
stocké (mission « inflate » si les questions 1 et 3 passent) ; projet d'essai à part
`cerf-essai-2.zip` ; données fictives autour de Strasbourg (point 7,76189 ; 48,56906) ;
question 5 par les réglages de QField ; ligne « Shapefile sans .prj » à la question 7 ;
GeoPackage aussi publié seul ; fichiers d'essai ouverts par Pascal dans QGIS avant l'essai
(`ogrinfo` dans le workflow si rapide) ; `cerf-prototype-2.zip`, préversion `prototype-2`,
Cerf 0.1.1 et prototype n° 1 désactivés pendant l'essai ; deux réponses (couleurs,
étiquettes) aux questions 1 et 3 ; protocole écrit par le dev, relu par le testeur.

## Remarques de relecture à reprendre (aller-retour 1/3, 4 novembre 2026)

**Relecteur (code) :**
1. **Bloquant** : `empriseVraisemblable` (`essai-logique.mjs`) accepte le `QgsRectangle()`
   vide de QGIS ≥ 3.34 (xMin = yMin = +DBL_MAX, xMax = yMax = −DBL_MAX) : faux « couche
   chargée » possible pour `Sans_crs` (question 7) et faux « oui » à la ligne 3 de la
   question 6. Refuser min > max et les valeurs proches de DBL_MAX, afficher `isNull` de
   l'emprise reprojetée, tester ces valeurs.
2. Rechargement de la question 5 (`onLoadProjectEnded`) sur tout projet : n'agir que si le
   projet ouvert est `cerf-essai-2.qgs` ; vérifier le projet ouvert aux autres boutons ;
   protocole : désactiver le prototype n° 2 après l'essai.
3. Question 5 : compter les couches du projet par leur source (chemin) plutôt que par la
   marque ; au protocole, exiger « couche marquée retrouvée : oui » deux fois.
4. Question 4 non rejouable : `FileUtils.deleteFiles` refuse le `.qml` ; utiliser
   `platformUtilities.rmFile` (ADR 0007, dans `cerf-imports/` seulement) ou un sous-dossier
   neuf par essai.
5. Mineurs : accepter `OGC:CRS84` pour `Sans_crs` ; protocole question 6 lignes 6-7 : échec
   attendu en NaN ; déclarer `layer_styles` dans `gpkg_contents` (`attributes`) ; ajouter
   `cerf-essai-2.qgs` au contrôle QGIS.

**Testeur (protocole `tests/recette/prototype-2.md`, corrections C1 à C15) :** même sens de
lecture pour toutes les cases (question 2 inversée) ; neuf réponses, pas sept ; cases
« noté » distinctes des cases « conforme » ; question 4 : fermer la fenêtre du plugin avant
chaque capture de carte, bouger la carte avant la capture B, vérifier « Couche A retirée » ;
question 5 : zoomer sur les couches, comment fermer et rouvrir un projet dans QField, « oui,
mais par le projet » si n = 2 ; question 6 : piège des axes inversés et tous les messages
possibles des lignes 4 à 7 ; préalables : installer le plugin par URL et importer le projet
**avant** le mode avion, où arrive le téléchargement, activer Cerf prototype n° 2 seul ;
contrôle QGIS de `UG_q2.geojson`, `FRT_sansprj.shp`, ordre de grandeur réel de `Sans_crs`
(X ≈ 1 051 000, Y ≈ 6 840 000 « degrés »), 17 entrées ; captures Samsung : geste, nom,
comment les sortir ; centrage manuel (ligne « Aller à la main vers », couche de 300 m) ;
question 2 : attendu visible (deux carrés pleins sans étiquette) ; question 3 : critère
principal la couleur et l'absence de remplissage ; question 7 : critère oui/non écrit et
termes exacts de l'écran.

**Décisions de Pascal (4 novembre 2026) :** question 5 « sans objet » pour une couche dont le
style n'a pas été pris aux questions 1 ou 3 ; une capture lisible de l'écran d'erreur remplace
la recopie ; `essai-q3.gpkg` sert seulement au contrôle QGIS sur le PC (le protocole le dit).

## Remarques à reprendre (aller-retour 2/3, 4 novembre 2026)

**Relecteur : prêt pour Pascal**, avec deux mineurs à reprendre ici :
1. Protocole, question 5, ligne 1 : « si ce n'est pas 2 sur 2 par la source : s'arrêter,
   capture » (la lecture de `layer.source` en QML n'est pas prouvée).
2. Notes de la préversion : y écrire le sha du commit empaqueté (l'étiquette `prototype-2`
   reste sur 35fce3b avec `upload --clobber`), ou déplacer l'étiquette.
3. (Pour plus tard, non à faire ici) : si le plugin doit un jour effacer des `.qml`, l'ADR
   0007 devra le dire.

**Testeur (protocole) :** cinq précisions :
1. Questions 1 et 3 : si la case 1 n'est pas cochée (couche non chargée), répondre « essai
   raté » (pas « non »), avec la capture de l'écran d'erreur.
2. Question 2 : même consigne « essai raté » si rien ne s'affiche ou si la couche ne charge pas.
3. Question 5 : la règle se lit sur la ligne de chaque couche (« rechargée depuis le disque »
   ou « déjà dans le projet, non rechargée »), pas sur n global.
4. Question 7, case 4 : ajouter « bornes NaN ou infinies » aux formes d'échec qui valent refus.
5. Zoom : repli « appui long sur la couche dans le panneau des couches, puis zoomer sur la
   couche » ; recherche par coordonnées : taper deux entiers séparés par une espace
   (« 1051113 6840462 »), sans virgule ni « m ». Installation du plugin : déjà éprouvée par
   Pascal par URL (prototype n° 1, Cerf 0.1.1) ; ajouter seulement « si l'entrée n'existe
   pas, le dire avant d'aller plus loin ».

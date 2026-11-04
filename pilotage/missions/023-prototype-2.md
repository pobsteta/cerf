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

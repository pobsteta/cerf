# ADR 0002 — Fonds IGN en XYZ, fond embarqué en repli

- **Date :** 2026-11-02
- **Statut :** proposée — XYZ choisi par Pascal (arbitrage 2) ; critique reportée ; à accepter avec la spec (porte n° 1)
- **Proposée par :** Claude (orchestrateur), d'après la critique du `contradicteur`
- **Tranchée par :** Pascal

## La décision en une phrase

Plan IGN v2 et BD ORTHO sont déclarés dans le projet modèle comme couches **XYZ** pointant
sur les requêtes GetTile de `data.geopf.fr` (matrice PM), et non comme couches WMTS ; si
le cache ne suffit pas hors ligne, un fond embarqué (MBTiles ou GeoPackage raster) pour la
zone du jour est accepté.

## Contexte

QField met les tuiles en cache mais pas la requête GetCapabilities qui initialise une
couche WMTS : hors ligne, le fond WMTS ne s'ouvre pas
([discussion QField #5159](https://github.com/opengisch/QField/discussions/5159)). Options :
WMTS ; **XYZ** ; fond embarqué systématique (700 Mo pour 10 km × 10 km selon JFC, niveau
de zoom inconnu) ; tuiles vectorielles Plan IGN (plus légères, à évaluer plus tard).

Gabarit d'URL proposé, à vérifier par l'`acquereur` :
`https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png`
(BD ORTHO : `ORTHOIMAGERY.ORTHOPHOTOS`, `image/jpeg`).

## Le crible FRANCE

| Lettre | Question | Réponse | Ce que ça coûte | Prêts à payer ? |
|---|---|---|---|---|
| **F**rugale | Plus simple ? | Une URL par fond, aucun fichier. | — | oui |
| **R**esponsable | Qui fait quoi ? | L'agent ouvre la zone la veille pour remplir le cache. | Un geste de plus, à écrire dans la notice. | à trancher par Pascal |
| **A**nticiper | Imprévu ? | Cache vidé ou zone non visitée : pas de fond. Repli : fond embarqué. Dépend de la Géoplateforme. | Changement d'URL IGN = mise à jour du projet. | à trancher par Pascal |
| **N**ovateur | Idées écoutées ? | WMTS, XYZ, embarqué, vectoriel. | — | — |
| **C**oût | Dépense inutile ? | Pas de fond embarqué par défaut. | — | oui |
| **É**cologique | Réutilisation ? | Données ouvertes IGN, sans clé. | — | oui |

## Arbitrages de Pascal après critique (2 novembre 2026)

- Pas de fond embarqué en tranche 1 ; la recette essaie le fond hors ligne la veille
  **et à J+2** ; échec à J+2 → on prépare le fond embarqué (spec § 9, n° 5).
- Coût nommé : QGIS fait expirer une tuile au bout de 24 h quand le serveur ne fixe pas
  d'expiration ; le fond peut donc manquer dès J+1. La taille du cache de QField est
  inconnue.
- Zoom maximal fixé à la limite de la Géoplateforme ; attribution « © IGN ».

## Valeurs sacrifiées

- **Netteté** : tuiles Web Mercator reprojetées en Lambert 93, à juger sur tablette.
- **Garantie hors ligne** : le cache n'est pas une garantie ; le critère n° 5 de la spec
  le mesure.

## Sources

- [discussion QField #5159](https://github.com/opengisch/QField/discussions/5159) ;
  [Géoservices IGN](https://geoservices.ign.fr/node/1394) (lu en extrait).

## Question de contrôle

Cette décision tient-elle nos six valeurs, et que sommes-nous prêts à payer pour cela ?

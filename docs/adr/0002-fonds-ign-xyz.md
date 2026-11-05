# ADR 0002 — Fonds IGN en XYZ, fond embarqué en repli

- **Date :** 2026-11-02
- **Statut :** **acceptée par Pascal le 2 novembre 2026** (porte n° 1) — XYZ choisi par Pascal (arbitrage 2) ; critique reportée
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

## Amendement du 2 novembre 2026 (mission 001, décidé par Pascal)

- **Cache** : le serveur fixe une expiration, `cache-control: private, max-age=1814400`,
  soit **21 jours** (mesure de la mission 019, `docs/referentiels/brut/`). L'hypothèse
  « expiration à 24 h, fond manquant dès J+1 » ne vaut que si QField ignore cet en-tête :
  l'essai à J+2 de la recette le dira.
- **Zoom maximal : 19** pour les deux fonds (jeu de matrices `PM_0_19` ; au-delà, le
  serveur répond 404, mesuré par le relecteur de la mission 001).
- **Jeu de matrices dans l'URL** : `PM` est gardé (gabarit ci-dessus) ; il donne au
  zoom 19 les mêmes tuiles, octet pour octet, que `PM_0_19`.
- **Attribution** : « © IGN » retenue par Pascal ; licence renvoyée par le GetCapabilities
  aux CGU de cartes.gouv.fr. Les pièces de `docs/referentiels/brut/` portent la mention
  « Source : IGN, Géoplateforme (data.geopf.fr), mesurée le 2 novembre 2026 ».

## Valeurs sacrifiées

- **Netteté** : tuiles Web Mercator reprojetées en Lambert 93, à juger sur tablette.
- **Garantie hors ligne** : le cache n'est pas une garantie ; le critère n° 5 de la spec
  le mesure.

## Sources

- [discussion QField #5159](https://github.com/opengisch/QField/discussions/5159) ;
  [Géoservices IGN](https://geoservices.ign.fr/node/1394) (lu en extrait).

## Question de contrôle

Cette décision tient-elle nos six valeurs, et que sommes-nous prêts à payer pour cela ?

## Amendement du 5 novembre 2026 (mission 045, décidé par Pascal)

> Ajout daté par l'orchestrateur ; le texte ci-dessus reste tel quel. Le titre de l'ADR
> (« fonds IGN ») est gardé : cet amendement couvre aussi les fonds non IGN.

- **Fonds non IGN.** Le projet modèle ajoute OpenStreetMap
  (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) et OpenTopoMap
  (`https://tile.opentopomap.org/{z}/{x}/{y}.png`), sans clé, décochés par défaut.
- **En ligne seulement.** La politique de l'OSMF interdit l'usage hors ligne des tuiles de
  `tile.openstreetmap.org` ; celle d'OpenTopoMap n'a pas été lue en entier. Ces deux fonds sortent
  du critère n° 5 (J+2, spec § 9), qui ne vaut que pour les fonds IGN, et n'entrent pas dans un fond
  embarqué.
- **Cadastre en surimpression.** Couche `CADASTRALPARCELS.PARCELLAIRE_EXPRESS` de la Géoplateforme,
  XYZ, PNG transparent (mesuré : 96 % de pixels transparents au zoom 15), au-dessus de tous les
  fonds, visible par défaut, attribution « © IGN ». URL en `TILEMATRIXSET=PM` (le GetCapabilities
  annonce `PM_0_19`) : 200 aux zooms 15 et 19, 404 au zoom 20 (mesuré le 5 novembre 2026).
- **Ordre de l'arbre** (premier = dessus) : Cadastre, Plan IGN v2, OpenStreetMap, OpenTopoMap,
  BD ORTHO ; Cadastre et Plan IGN v2 cochés.
- **Zoom et attribution par fond.** 0 à 19 pour les fonds IGN ; 0 à 19 pour OpenStreetMap
  (**non mesuré**) ; **0 à 13 pour OpenTopoMap** (valeur la plus prudente de sources divergentes,
  13, 15 ou 17 ; gardée par Pascal jusqu'à la mesure sur le Samsung). « © IGN » ;
  « © les contributeurs d'OpenStreetMap » ; « © les contributeurs d'OpenStreetMap, SRTM |
  © OpenTopoMap (CC-BY-SA) ».
- **Coût nommé.** URL, zooms et en-têtes `User-Agent` / `Referer` d'OpenStreetMap et
  d'OpenTopoMap non testés en HTTP (domaines refusés par l'environnement de développement) : un
  refus des serveurs est possible ; vérification par Pascal sur le Samsung. Pérennité
  d'OpenTopoMap incertaine.
- **SCAN 25** : toujours en attente de JFC ; la clé `ign_scan_ws` n'entre pas dans le dépôt
  (Pascal, 5 novembre 2026).

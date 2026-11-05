# Mission 045 — Fonds OSM, OSM topo et cadastre dans le projet modèle

> Fiche rédigée par Claude (orchestrateur) le 5 novembre 2026, à la demande de Pascal (« il faut
> ajouter comme fond de carte OSM et OSM topo et le flux carte topo 25 de l'IGN […] ainsi que le flux
> du cadastre au dessus de tous les fonds de carte »). **Statut : validée par Pascal le 5 novembre
> 2026.** SCAN 25 : **attendre JFC** (choix de Pascal, 5 novembre 2026 : la clé `ign_scan_ws` de
> l'URL fournie n'entre pas dans le dépôt ; spec § 3.4 et brief inchangés sur ce point).

## Mission

**En une phrase :** Ajouter au groupe « Fonds de carte » de `cerf.qgz` deux fonds XYZ
(**OpenStreetMap** standard et **OSM topo**, entendu comme OpenTopoMap, à confirmer par Pascal) et
une couche XYZ **cadastre** de la Géoplateforme (parcellaire, PNG transparent) placée **au-dessus
de tous les fonds**, sans clé, avec URL, zooms et attribution vérifiés.

### Étape 1 — `acquereur` : référentiel (`docs/referentiels/fonds-osm-cadastre.md`)

Pour chacun des trois flux : gabarit XYZ exact (pour le cadastre : GetTile de `data.geopf.fr/wmts`,
matrice `PM`, couche à identifier dans le GetCapabilities, vraisemblablement
`CADASTRALPARCELS.PARCELLAIRE_EXPRESS`, `STYLE`, format PNG), zoom min et max, attribution exigée
(« © les contributeurs d'OpenStreetMap », OpenTopoMap : « © OpenStreetMap, SRTM | © OpenTopoMap
(CC-BY-SA) », cadastre : « © IGN » ou DGFiP ?), et **conditions d'usage** citées (politique d'usage
des tuiles OSM, `https://operations.osmfoundation.org/policies/tiles/` ; OpenTopoMap ; CGU de la
Géoplateforme) : l'usage d'un QField avec cache hors ligne par quelques agents ONF est-il permis ?
Faut-il un en-tête `User-Agent` / `Referer` que QField n'envoie pas ? Une tuile de chaque mesurée en
HTTP 200 (en France, zoom 15 et zoom max), pièces dans `docs/referentiels/brut/` avec date.
Comparer au moins deux sources. Ne rien trancher : signaler à Pascal tout ce qui bloque.

### Étape 2 — `dev` : projet modèle (après l'étape 1)

- `outils/projet-modele.mjs` : `FONDS` étendu ; ordre de l'arbre (premier = dessus) :
  **Cadastre** (visible), Plan IGN v2 (visible), OSM, OSM topo, BD ORTHO (décochés) ; zoom et
  attribution par fond (aujourd'hui uniques : `ZMIN`, `ZMAX`, `ATTRIBUTION`) ; aucune clé.
- La couche « Saisie terrain » et les couches importées restent au-dessus du groupe.
- Tests (`tests/projet-modele.test.mjs`, `tests/outil-projet-modele.test.mjs`) : le test
  « exactement deux fonds » devient « exactement cinq », URL attendues, ordre, visibilité,
  attribution ; aucun affaiblissement.
- `cerf.qgz` et la release `projet-modele` régénérés comme le prévoient les workflows existants
  (`release-projet-modele.yml`) ; spec § 3.4 et README (fonds disponibles) à jour.
- **Ne doit pas :** toucher au plugin ; mettre une clé ; ajouter le SCAN 25.

## Amendement d'ADR

Ajout daté à l'ADR 0002 (fonds non IGN, cadastre en surimpression, attributions) : proposé par
l'orchestrateur avec le référentiel, **tranché par Pascal**.

## Terrain

Sur le Samsung, avec réseau : les cinq fonds s'affichent, le cadastre se superpose au Plan IGN et
à la BD ORTHO, attribution visible ; puis hors ligne le lendemain sur la zone visitée.

## Qui veille, qui tranche

- **Relecteur :** `relecteur` après chaque étape, puis Pascal (PR vers `main`).

**Redite par l'agent :** à remplir.

## Arbitrages de Pascal (5 novembre 2026, après l'étape 1)

1. **OSM et OpenTopoMap : en ligne seulement** (la politique de l'OSMF interdit l'usage hors ligne
   sur `tile.openstreetmap.org`) ; le README le dit ; ils sortent du critère J+2.
2. **Cadastre : attribution « © IGN ».**
3. **Cadastre visible par défaut**, au-dessus de tous les fonds.
4. Domaines OSM et OpenTopoMap refusés par la politique réseau de l'environnement : le dev
   n'en mesure pas les tuiles ; vérification sur le Samsung par Pascal.

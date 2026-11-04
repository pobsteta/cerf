# Mission 030 — Prototype n° 4 : lire hors ligne les tables d'un GeoPackage du zip

> Fiche rédigée par Claude (orchestrateur) le 4 novembre 2026. **Statut : validée par Pascal le
> 4 novembre 2026** (« oui à tout » : relire la fiche 027, puis un essai court sur le Samsung si
> elle ne répond pas). La fiche 027 ne répond pas : le prototype n° 3 avait les noms de tables
> écrits en dur (`Parcelles_q3`, `Zones`).

## Mission

**En une phrase (quoi, et pourquoi) :** Trouver, dans les sources de QField 4.3.7, une ou deux
façons qu'a un plugin QML de connaître hors ligne les tables vecteur d'un GeoPackage lu en
`/vsizip/` dans un zip compressé, et les essayer sur le Samsung par un bouton du prototype, pour
que la mission 024 sache comment le plugin obtiendra ces tables.

**Redite par l'agent :** à remplir.

## Questions à poser à l'appareil

1. La voie trouvée rend-elle la liste exacte des tables vecteur de `essai-q3.gpkg` zippé
   (compressé), hors ligne ? Combien de temps ?
2. Que rend-elle pour un GeoPackage sans table vecteur (raster seul, ou vide) ?
3. Que rend-elle pour un `.gpkg` illisible (fichier tronqué) : une erreur visible, ou une liste
   vide ? (Une erreur ne doit jamais se confondre avec « aucune table » : relecture n° 2 de la 024.)

## Harnais

- **Agent :** `dev` (opus) : lecture des sources de QField et de QGIS (version 4.3.7, citées
  avec fichier et ligne), puis prototype.
- **Peut :** ajouter au prototype (branche `mission/023-prototype-2`, dossier `prototype-2/`)
  un bouton et ses données d'essai (dont un GeoPackage raster ou vide et un tronqué), le protocole
  `tests/recette/prototype-2.md` en section « Prototype n° 4 », ses tests ; monter la version du
  prototype (2.4.0) pour que la préversion se publie.
- **Ne doit pas :** toucher à `plugin/`, au brief, à la spec, aux ADR, au journal ; effacer hors
  de `<projet>/cerf-imports/` ; contourner un accès refusé.

## Dépend de / rouge attendu jusqu'à

- 027. CI : pas de rouge attendu.

## Terrain

- Pascal installe la préversion `prototype-2` (2.4.0) sur le Samsung, en mode avion, et répond
  aux trois questions par le protocole.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal (essai sur le Samsung). 3 allers-retours.
  **Qui tranche :** Pascal.

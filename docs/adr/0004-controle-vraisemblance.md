# ADR 0004 — Contrôle de vraisemblance des coordonnées

- **Date :** 2026-11-02
- **Statut :** **acceptée par Pascal le 2 novembre 2026** (porte n° 1) — principe tranché par Pascal (arbitrage 3) ; pas de chargement forcé (spec § 9, n° 7) ; emprise à vérifier avec PROJ
- **Proposée par :** Claude (orchestrateur), d'après la critique du `contradicteur`
- **Tranchée par :** Pascal

## La décision en une phrase

Une couche n'est chargée que si son emprise, reprojetée en EPSG:2154, est contenue dans
l'emprise de la France métropolitaine en Lambert 93 élargie de 10 km ; un Shapefile sans
`.prj` est refusé avant lecture.

## Contexte

La règle initiale « sans système déclaré, refusé » est inopérante : un GeoJSON conforme à RFC 7946
n'en déclare pas (WGS84 implicite) ; un GeoJSON « 2008 », que GDAL et QGIS écrivent par
défaut, peut porter un membre `crs`, mais rien ne garantit qu'il soit présent, et QGIS peut attribuer un système en silence à un
Shapefile sans `.prj`. Options : refus sur système absent ; demander le système à l'agent
(geste fin, gants) ; deviner le système d'après les valeurs ; **contrôle d'emprise**.

## Le crible FRANCE

| Lettre | Question | Réponse | Ce que ça coûte | Prêts à payer ? |
|---|---|---|---|---|
| **F**rugale | Plus simple ? | Une comparaison de rectangles. | — | oui |
| **R**esponsable | Qui fait quoi ? | JFC fournit des fichiers bien déclarés ; le plugin refuse les autres. | JFC refait un export. | oui |
| **A**nticiper | Imprévu ? | Un décalage de quelques km reste invisible au contrôle : le critère des 5 m le mesure. Outre-mer : hors tranche 1. | — | à trancher par Pascal |
| **N**ovateur | Idées écoutées ? | Quatre options. | — | — |
| **C**oût | Dépense inutile ? | — | — | — |
| **É**cologique | Réutilisation ? | Emprise paramétrable pour d'autres territoires. | — | — |

## Arbitrages de Pascal après critique (2 novembre 2026)

- Ordre des contrôles corrigé (spec § 4) : `.prj`, lecture, système invalide, couche
  vide (sans contrôle d'emprise), emprise ; toute erreur de reprojection vaut refus.
- **Pas de chargement forcé.** Valeur sacrifiée ajoutée : l'**autonomie de l'agent**, qui
  ne peut pas passer outre un refus sur le terrain, sans réseau ; coût : un faux refus
  bloque la couche jusqu'au retour au bureau. Pascal l'accepte : la sûreté passe avant.

## Valeurs sacrifiées

- **Exhaustivité** : une erreur faible (mauvais datum, quelques dizaines de mètres) passe
  le contrôle ; acceptée, le critère n° 3 de la spec la cherche.
- **Précision géographique** : un rectangle contient forcément des terres hors de France
  (Jersey, Genève, une partie de la Belgique, de la Suisse, de l'Italie…) ; une couche
  placée là passe le contrôle. Acceptée par Pascal le 2 novembre 2026 : le contrôle vise
  les erreurs grossières (Lambert 93 lu en degrés, axes inversés), pas la frontière.

## Sources

- [RFC 7946](https://www.rfc-editor.org/rfc/rfc7946) (non lu, contenu confirmé par
  [macwright.com](https://macwright.com/2016/11/07/the-geojson-ietf-standard)) ;
  emprise de la terre ferme : mesurée par la mission 002 (`docs/referentiels/emprise-metropole.md`) ;
  [GDAL, pilote GeoJSON](https://github.com/OSGeo/gdal/blob/master/doc/source/drivers/vector/geojson.rst).

## Question de contrôle

Cette décision tient-elle nos six valeurs, et que sommes-nous prêts à payer pour cela ?

# ADR 0001 — Projet modèle QGIS et plugin QField d'application

- **Date :** 2026-11-02
- **Statut :** proposée — plugin d'application choisi par Pascal (arbitrage 1) ; critique du contradicteur reportée ; à accepter avec la spec (porte n° 1)
- **Proposée par :** Claude (orchestrateur), d'après la critique du `contradicteur`
- **Tranchée par :** Pascal

## La décision en une phrase

Cerf est un projet modèle `.qgz` préparé dans QGIS, accompagné d'un **plugin QField
d'application** (QML/JavaScript), installé une fois par tablette par URL, qui n'agit que
dans un projet portant l'identifiant `cerf_id`.

## Contexte

Le brief exige d'ajouter des couches « directement depuis QField ». Options envisagées :
1. plugin QGIS (bureau) : écarté, il contredit « depuis QField » ; gardé en secours ;
2. **plugin de projet** : fichier `cerf.qml` à côté du `.qgz`, activé à l'ouverture de ce
   projet seulement, livré avec lui ;
3. **plugin d'application** : dossier avec `main.qml`, installé par URL, actif dans tous
   les projets ([docs QField, plugins](https://docs.qfield.org/how-to/advanced-how-tos/plugins/)) ;
4. pas de plugin : JFC prépare un projet complet par forêt, importé nativement en zip par
   QField — couvre tout sauf « ajouter sur le terrain ».

Le contradicteur penchait pour l'option 2 ; Pascal a retenu l'option 3.

## Le crible FRANCE

| Lettre | Question | Réponse | Ce que ça coûte | Prêts à payer ? |
|---|---|---|---|---|
| **F**rugale | La plus simple qui tienne ? | Un plugin, un projet modèle ; idées reprises de `qfield-layer-loader` et `qfield_addLayer`, code réécrit (`qfield_addLayer` n'a aucune licence). | Deux livrables à versionner séparément. | à trancher par Pascal |
| **R**esponsable | Qui fait quoi ? | Pascal maintient ; chaque agent installe le plugin une fois. | Une installation et des mises à jour par tablette. | à trancher par Pascal |
| **A**nticiper | Si l'imprévu arrive ? | Le plugin agit partout : garde `cerf_id` obligatoire. Dépend de l'API QML de QField (3.8 ou plus). | Un projet modèle plus ancien que le plugin, ou l'inverse. | à trancher par Pascal |
| **N**ovateur | Toutes les idées écoutées ? | Les quatre options ci-dessus. | — | — |
| **C**oût | Dépense inutile ? | Pas de serveur, pas de conversion. | API QML peu documentée : temps de prototype. | à trancher par Pascal |
| **É**cologique | Réutilisation ? | Le plugin sert à toute UT et à tout projet portant `cerf_id`. | — | — |

## Arbitrages de Pascal après critique (2 novembre 2026)

- Code entièrement écrit pour Cerf, rien n'est recopié des deux plugins cités (spec § 9, n° 4).
- Le bouton n'apparaît que dans un projet portant `cerf_id`.
- Prototype n° 1 avant toute autre mission : lister un zip, copier hors du dossier projet,
  effacer un `.zip`, importer un même module `.mjs` dans QML et dans Node.

## Valeurs sacrifiées

- **Simplicité de livraison** : deux pièces au lieu d'une ; accepté par Pascal pour que le
  plugin serve tous les projets Cerf d'une tablette sans recopie.
- **Fiabilité** : API QML jeune ; les trois mécanismes critiques (lister un zip, copier
  hors du dossier projet, effacer un `.zip`) ne sont **pas** prouvés : prototype n° 1.
- **Indépendance** : un seul mainteneur pour les mises à jour sur chaque appareil.

## Sources

- [qfield-layer-loader](https://github.com/mbernasocchi/qfield-layer-loader) ;
  [qfield_addLayer](https://github.com/lukashelmke/qfield_addLayer) ;
  [docs QField, plugins](https://docs.qfield.org/reference/plugins) (lu en extrait).

## Question de contrôle

Cette décision tient-elle nos six valeurs, et que sommes-nous prêts à payer pour cela ?

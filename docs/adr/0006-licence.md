# ADR 0006 — Licence de Cerf

- **Date :** 2026-11-02
- **Statut :** proposée — à trancher par Pascal après lecture de la licence de qfield-layer-loader (arbitrage 5)
- **Proposée par :** Claude (orchestrateur), d'après la critique du `contradicteur`
- **Tranchée par :** Pascal

## La décision en une phrase

Cerf est publié sous **GPL-3.0-or-later**, comme Groma et Surculus, si les licences de
`qfield-layer-loader` (GPL-2.0, « -only » ou « -or-later » à lire) et de `qfield_addLayer`
(à lire) le permettent ; sinon le code est réécrit sans recopie (« inspiré de »).

## Contexte

GPL-2.0-only est incompatible avec GPL-3.0 : recopier du code GPL-2.0-only interdit la
GPL-3.0. Options : GPL-3.0-or-later ; GPL-2.0-or-later ; licence permissive (MIT, EUPL).

## Le crible FRANCE

| Lettre | Question | Réponse | Ce que ça coûte | Prêts à payer ? |
|---|---|---|---|---|
| **F**rugale | Plus simple ? | Même licence que les autres projets de Pascal. | — | à trancher par Pascal |
| **R**esponsable | Qui fait quoi ? | L'`acquereur` lit les deux licences. | — | — |
| **A**nticiper | Imprévu ? | Licence incompatible → réécriture. | Temps de dev. | à trancher par Pascal |
| **N**ovateur | Idées écoutées ? | Trois licences. | — | — |
| **C**oût | Dépense inutile ? | — | — | — |
| **É**cologique | Réutilisation ? | Copyleft : les dérivés restent ouverts. | — | — |

## Valeurs sacrifiées

- **Réutilisation sans contrainte** (licence permissive) au profit du copyleft.

## Question de contrôle

Cette décision tient-elle nos six valeurs, et que sommes-nous prêts à payer pour cela ?

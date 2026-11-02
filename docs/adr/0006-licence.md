# ADR 0006 — Licence de Cerf

- **Date :** 2026-11-02
- **Statut :** acceptée par Pascal le 2 novembre 2026 : GPL-3.0-or-later
- **Proposée par :** Claude (orchestrateur), d'après la critique du `contradicteur`
- **Tranchée par :** Pascal

## La décision en une phrase

Cerf est publié sous **GPL-3.0-or-later**, comme Groma et Surculus, si les licences de
`qfield-layer-loader` (GPL-2.0, « -only » ou « -or-later » à lire) et de `qfield_addLayer`
(à lire) le permettent ; sinon le code est réécrit sans recopie (« inspiré de »).

## Contexte

GPL-2.0-only est incompatible avec GPL-3.0 : recopier du code GPL-2.0-only interdit la
GPL-3.0. Options : GPL-3.0-or-later ; GPL-2.0-or-later ; licence permissive (MIT) ; EUPL-1.2 (copyleft, non permissive) ; CeCILL 2.1. Si le code
appartient à l'ONF, la licence doit figurer dans la liste du décret n° 2017-638.
`qfield_addLayer` n'a **aucune** licence : rien n'en est recopié. Le `LICENSE` de
`qfield-layer-loader` est le texte brut de la GPL v2, sans mention « only » ni
« or later » (§ 9 discutable).

## Le crible FRANCE

| Lettre | Question | Réponse | Ce que ça coûte | Prêts à payer ? |
|---|---|---|---|---|
| **F**rugale | Plus simple ? | Même licence que les autres projets de Pascal. | — | à trancher par Pascal |
| **R**esponsable | Qui fait quoi ? | L'`acquereur` lit les deux licences. | — | — |
| **A**nticiper | Imprévu ? | Licence incompatible → réécriture. | Temps de dev. | à trancher par Pascal |
| **N**ovateur | Idées écoutées ? | Trois licences. | — | — |
| **C**oût | Dépense inutile ? | — | — | — |
| **É**cologique | Réutilisation ? | Copyleft : les dérivés restent ouverts. | — | — |

## Arbitrages de Pascal après critique (2 novembre 2026)

- **GPL-3.0-or-later** ; **le code est à Pascal** (pas de contrainte du décret
  n° 2017-638) ; **aucune ligne recopiée** de `qfield-layer-loader` ni de
  `qfield_addLayer`, ce qui lève la question « -only ou -or-later ».

## Valeurs sacrifiées

- **Réutilisation sans contrainte** (licence permissive) au profit du copyleft.

## Question de contrôle

Cette décision tient-elle nos six valeurs, et que sommes-nous prêts à payer pour cela ?

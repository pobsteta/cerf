# ADR 0005 — Stack de tests

- **Date :** 2026-11-02
- **Statut :** acceptée par Pascal le 2 novembre 2026
- **Proposée par :** Claude (orchestrateur), d'après la critique du `contradicteur`
- **Tranchée par :** Pascal

## La décision en une phrase

La logique du plugin (règles de style par nom et par champs, contrôle d'emprise,
registre, lecture de la liste d'un zip) est écrite en **modules JavaScript sans QML**,
testés avec `node --test` ; l'interface QML et le chargement réel des couches sont
vérifiés par la recette sur tablette (spec § 6).

## Contexte

`.claude/test-command` doit exister avant le premier code. Options : `qmltestrunner` (Qt
Quick Test : exige Qt et l'API de QField, absente hors de QField) ; **node `--test`** sur
la logique pure (aucune dépendance) ; tests dans QGIS par PyQGIS (autre langage).

## Le crible FRANCE

| Lettre | Question | Réponse | Ce que ça coûte | Prêts à payer ? |
|---|---|---|---|---|
| **F**rugale | Plus simple ? | Node seul, sans paquet. | — | à trancher par Pascal |
| **R**esponsable | Qui fait quoi ? | `testeur` écrit les tests de logique ; JFC fait la recette. | — | — |
| **A**nticiper | Imprévu ? | Ce qui touche l'API QField n'est pas testé automatiquement. | Recette manuelle obligatoire. | à trancher par Pascal |
| **N**ovateur | Idées écoutées ? | Trois options. | — | — |
| **C**oût | Dépense inutile ? | Aucune installation. | — | — |
| **É**cologique | Réutilisation ? | Modules JS réutilisables. | — | — |

## Valeurs sacrifiées

- **Couverture** : l'interface et l'API QField ne sont couvertes que par la recette.

Commande retenue, dans `.claude/test-command` : `node --test tests/`.

## Question de contrôle

Cette décision tient-elle nos six valeurs, et que sommes-nous prêts à payer pour cela ?

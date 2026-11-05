# ADR 0009 — Cerf devient Vision

- **Date :** 2026-11-05
- **Statut :** **décidée par Pascal le 5 novembre 2026** (mission 050) ; code et outils renommés à l'étape 1 (commit f33071c), documentation à l'étape 2
- **Proposée par :** Claude (orchestrateur)
- **Tranchée par :** Pascal
- **Amende :** aucune ADR (les ADR 0001 à 0008 gardent leur texte d'origine et leur ancien nom)

## La décision en une phrase

Le projet s'appelle **Vision** : « Cerf » disparaît des noms vivants (fichiers, identifiants, adresses, textes,
documentation) et ne reste que dans l'historique daté.

## Contexte

- Pascal a changé le nom du projet le 5 novembre 2026 (« je veux changer le nom du projet "cerf" en "vision" et faire
  disparaître le nom cerf du projet ») et **renommé lui-même le dépôt GitHub** : `pobsteta/cerf` devient `pobsteta/vision`.
- Un seul appareil est équipé : le Samsung de Pascal. Aucun autre agent n'a installé le plugin.
- Nouveaux noms (étape 1) : projet `vision.qgz` ; variable de projet `vision_id` (nouvel UUID) ; dossier
  `vision-imports/` ; marques de couche `vision/zip`, `vision/couche`, `vision/fond` ; plugin `Vision.qml`,
  `vision-logique.mjs`, `vision-controles.mjs`, `vision-styles.mjs`, `plugin-vision.zip`, version **0.5.0** (rupture) ;
  zips de release `projet-vision.zip` et `projet-vision-mise-a-jour.zip`.

## Conséquences

1. **Pas de migration.** Le plugin 0.5.0 ne lit pas les anciens noms (variable de l'ancien projet, ancien dossier
   d'imports, anciennes marques). Sur le Samsung : **réinstallation propre** (désinstaller l'ancien plugin, supprimer
   l'ancien projet, installer `vision.qgz` et `plugin-vision.zip`, réimporter les zips). Les anciens imports et le
   registre de l'ancien projet ne sont pas repris.
2. **Anciennes adresses.** GitHub redirige `https://github.com/pobsteta/cerf/...` vers le dépôt renommé **tant que ce
   nom n'est pas réutilisé** ; on ne s'y fie pas : les flashcodes et les adresses de la documentation pointent vers
   `pobsteta/vision`. Ne pas créer un nouveau dépôt `pobsteta/cerf`, qui casserait la redirection.
3. **Anciennes releases et étiquettes gardées** (elles portent l'ancien nom) : ce sont des traces datées.
4. **Historique gardé tel quel** : `pilotage/journal.md` (ajout seul), fiches de mission 001 à 049, ADR 0001 à 0008,
   `docs/referentiels/brut/`, `plugin/PLAN-012.md`, `outils/PLAN-021.md`, commits. Un test de garde
   (`tests/garde-nom-050.test.mjs`) liste ces exceptions et échoue si l'ancien nom revient ailleurs.
5. **Faux ami gardé** : `effacerFichier` (appel à `RemoveFile` de QField) contient les quatre lettres par hasard de la
   langue ; il ne se renomme pas, et le test de garde l'ignore.
6. Les textes vivants qui citent une décision datée d'avant le 5 novembre 2026 la gardent : seul le nom a changé.

## Le crible FRANCE

| Lettre | Question | Réponse | Ce que ça coûte | Prêts à payer ? |
|---|---|---|---|---|
| **F**rugale | Plus simple ? | Un seul nom partout, sans table de correspondance ni migration. | Réinstallation d'un seul appareil. | oui |
| **R**esponsable | Qui fait quoi ? | Pascal décide et renomme le dépôt ; `dev` code (étape 1), `archiviste` documente (étape 2), `relecteur` puis Pascal relisent. | Une mission de plus. | oui |
| **A**nticiper | Imprévu ? | Un ancien appareil garderait l'ancien plugin : il ne verrait pas le nouveau projet. Redirections GitHub fragiles si le nom est réutilisé. | Réinstaller si un autre appareil apparaît. | oui |
| **N**ovateur | Idées écoutées ? | Garder les anciens noms en interne : refusé par Pascal (il veut que le nom disparaisse). | — | — |
| **C**oût | Dépense inutile ? | Aucune migration écrite pour un seul appareil. | Les imports de l'ancien projet sont à refaire. | oui |
| **É**cologique | Réutilisation ? | Aucun matériel neuf ; les zips d'essai sont régénérés. | — | — |

## Valeurs sacrifiées

- **Continuité des données de l'appareil** : l'ancien registre et les anciens imports ne sont pas repris ; ils se refont
  depuis les zips d'origine.
- **Lisibilité de l'historique** : un lecteur du journal ou des fiches passées y trouve l'ancien nom ; cette ADR en est
  la clé.

## Question de contrôle

Cette décision tient-elle nos six valeurs, et que sommes-nous prêts à payer pour cela ?

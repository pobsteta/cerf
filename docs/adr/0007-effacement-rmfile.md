# ADR 0007 — Effacer les copies de zip par platformUtilities.rmFile

- **Date :** 2026-11-03
- **Statut :** acceptée par Pascal le 3 novembre 2026 (sur la proposition de l'orchestrateur, après l'essai du prototype n° 1) ; critique du `contradicteur` à faire au prochain passage d'ADR
- **Proposée par :** Claude (orchestrateur)
- **Tranchée par :** Pascal

## La décision en une phrase

En tranche 1, le plugin efface la copie d'un zip qui ne sert plus par
`platformUtilities.rmFile`, et non par `FileUtils.deleteFiles`, qui refuse les `.zip`.

## Contexte

L'essai du prototype n° 1 sur le Samsung de Pascal (spec § 10, 3 novembre 2026) :
`FileUtils.deleteFiles` refuse le `.zip` (liste blanche d'extensions) ; `rmFile` l'efface
(« zip absent »). `rmFile` est un simple `QFile::remove`, sans contrôle de chemin, que QField
annonce vouloir déplacer (`qfplatformutilities.h` L129, QField 4.3.7, lu par le relecteur de la
mission 004). Options : `rmFile` ; garder les copies (repli spec § 9 n° 2) ; demander à QField
d'accepter les `.zip` dans `deleteFiles`.

## Le crible FRANCE

| Lettre | Question | Réponse | Ce que ça coûte | Prêts à payer ? |
|---|---|---|---|---|
| **F**rugale | Plus simple ? | Un appel. | — | oui |
| **R**esponsable | Qui fait quoi ? | Le plugin n'efface que dans `<dossier du projet>/cerf-imports/` (depuis le repli du 3 novembre 2026 ; à l'origine `Imported Datasets/cerf/<cerf_id>/`), vérifié avant l'appel. | Le contrôle de chemin est à notre charge. | oui |
| **A**nticiper | Imprévu ? | Si `rmFile` disparaît ou change : repli § 9 n° 2 (la copie reste, son nom est affiché). | Place sur l'appareil. | oui |
| **N**ovateur | Idées écoutées ? | Trois options. | — | — |
| **C**oût | Dépense inutile ? | Aucune. | — | — |
| **É**cologique | Réutilisation ? | Proposer en amont à QField d'accepter les `.zip` dans `deleteFiles`. | Une issue à écrire. | à trancher par Pascal |

## Valeurs sacrifiées

- **Robustesse aux versions de QField** : dépendance à une fonction sans garde et appelée à
  bouger. Acceptée en tranche 1 ; un test de recette vérifie l'effacement à chaque version.

## Question de contrôle

Cette décision tient-elle nos six valeurs, et que sommes-nous prêts à payer pour cela ?

## Amendée par l'ADR 0008 (4 novembre 2026)

Décision de Pascal après le prototype n° 3 (voir [ADR 0008](0008-couches-sorties-du-zip.md)).
La décision ci-dessus tient ; son champ s'étend. Le plugin efface par `rmFile`, en plus de la
copie du zip :

- les **`.gpkg` des couches réécrites** (une table par fichier) et leurs **`.qml`** voisins ;
- leurs **annexes** : `-wal`, `-shm`, `.aux.xml` (le prototype n° 3 les a trouvées
  effaçables) ;
- le dossier `cerf-imports/<nom du zip>/` une fois vide, si l'API le permet.

La limite ne change pas : **rien n'est effacé hors de `<dossier du projet>/cerf-imports/`**,
chemin vérifié avant chaque appel. La liste des fichiers d'une couche est tenue par le
plugin (registre, ADR 0003 amendée), faute de listage ni de renommage dans l'API des plugins.
Un réimport réussi remplace le dossier du zip en entier.

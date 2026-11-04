# Mission 009 — Tests des règles de style

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026 avec `/imperatrice:mission`.
> **Statut : validée par Pascal le 2 novembre 2026 (porte n° 2).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Écrire les tests de la reconnaissance des couches (motif de nom, champs essence et diametre, .qml du zip) et du style attendu de chacune, pour que le § 5 de la spec soit vérifié automatiquement.

**Redite par l'agent :** Écrire (amendement du 4 novembre 2026) les tests qui vérifient que reconnaître une couche et lui donner son style suit le § 5 de la spec, y compris les décisions de Pascal (règles par nom réservées aux polygones avec avertissement, champs essence et diametre sans tenir compte de la casse, étiquette au nom réel du champ), pour que la mission 010 soit jugée sur des tests écrits sans lire son code.

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | oui — spec § 5 | confier |
| A-t-il les moyens ? (outils, données d'essai, tests) | oui — noms de fichiers d'exemple ; les champs de code UG, Parcelles, FRT sont inconnus : valeur provisoire | confier |

**Temps de la main :** appuyer.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `testeur`
- **Modèle :** sonnet
- **Ce qui ne lui est pas demandé :** écrire les styles.

## Harnais

- **Peut :** écrire `tests/styles.test.mjs`.
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md` ou une ADR (il signale l'écart à
  l'orchestrateur), effacer une ligne de `pilotage/journal.md`.
- **Sources autorisées :** `docs/spec.md` § 5.

## Valeur provisoire (chiffre, réglage)

- **valeur provisoire** : noms des champs de code (`CODE_UG`, `CODE_PARC`, `CODE_FRT`) ; **mesurée par** les fichiers bruts de JFC ; **gel** avant la recette par JFC.

## Dépend de / rouge attendu jusqu'à

- précède 010 ; CI rouge attendue jusqu'à la fusion de 010.

## Tests

- **Comment saura-t-on que c'est juste :** `UG.shp`, `Parcelles_serre.gpkg`, `frt-2026.geojson`, `PARCELLE.shp`, `ugly.shp` (ne doit pas être UG) ; couche ProdBois sans un des deux champs. Commande : `.claude/test-command`.

## Terrain

- **Échantillon que Pascal vérifiera :** —.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Point de suivi :** à la remise de la PR, puis à la fin du cycle de `/boucle`.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

chaque ligne du tableau du § 5 a son test.

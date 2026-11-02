# Mission 011 — Tests des contrôles d'import

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026 avec `/imperatrice:mission`.
> **Statut : proposée, à valider par Pascal (porte n° 2).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Écrire les tests des cinq contrôles du § 4 dans leur ordre (.prj, lecture, système, couche vide, emprise) et de leurs messages, pour qu'aucune couche ne soit chargée de travers.

**Redite par l'agent :** _à compléter par l'agent avant d'agir — s'il n'y arrive pas, il s'arrête._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | oui — spec § 4, ADR 0004 | confier |
| A-t-il les moyens ? (outils, données d'essai, tests) | oui — emprise provisoire jusqu'à la mission 002 | confier |

**Temps de la main :** appuyer.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `testeur`
- **Modèle :** sonnet
- **Ce qui ne lui est pas demandé :** écrire les contrôles.

## Harnais

- **Peut :** écrire `tests/controles.test.mjs`.
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md` ou une ADR (il signale l'écart à
  l'orchestrateur), effacer une ligne de `pilotage/journal.md`.
- **Sources autorisées :** `docs/spec.md` § 4, ADR 0004, référentiel 002.

## Valeur provisoire (chiffre, réglage)

- emprise : provisoire jusqu'à la fusion de 002.

## Dépend de / rouge attendu jusqu'à

- précède 012 ; CI rouge attendue jusqu'à la fusion de 012.

## Tests

- **Comment saura-t-on que c'est juste :** un cas par contrôle, plus GeoJSON en Lambert 93 lu en WGS84 et axes inversés. Commande : `.claude/test-command`.

## Terrain

- **Échantillon que Pascal vérifiera :** —.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Point de suivi :** à la remise de la PR, puis à la fin du cycle de `/boucle`.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

chaque message du § 4 a son test.

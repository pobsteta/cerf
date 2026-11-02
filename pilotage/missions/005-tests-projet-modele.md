# Mission 005 — Tests du projet modèle

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026 avec `/imperatrice:mission`.
> **Statut : validée par Pascal le 2 novembre 2026 (porte n° 2).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Écrire les tests qui vérifient que cerf.qgz est en EPSG:2154, porte la variable cerf_id et déclare les deux fonds XYZ attendus, avant que le projet modèle soit écrit.

**Redite par l'agent :** _à compléter par l'agent avant d'agir — s'il n'y arrive pas, il s'arrête._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | oui — spec § 2 et § 3.4, ADR 0002, `docs/referentiels/fonds-ign.md` (mission 001) | confier |
| A-t-il les moyens ? (outils, données d'essai, tests) | oui — un `.qgz` est un zip contenant du XML ; Node suffit | confier |

**Temps de la main :** appuyer.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `testeur`
- **Modèle :** sonnet
- **Ce qui ne lui est pas demandé :** écrire le projet modèle.

## Harnais

- **Peut :** écrire `tests/projet-modele.test.mjs`.
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md` ou une ADR (il signale l'écart à
  l'orchestrateur), effacer une ligne de `pilotage/journal.md`.
- **Sources autorisées :** `docs/spec.md` § 2, § 3.3, § 3.4 ; ADR 0002 ; référentiel de la mission 001.

## Valeur provisoire (chiffre, réglage)

- aucune.

## Dépend de / rouge attendu jusqu'à

- 001 ; précède 006 ; **CI rouge attendue** sur ces tests jusqu'à la fusion de 006.

## Tests

- **Comment saura-t-on que c'est juste :** les tests échouent sans `cerf.qgz` et disent pourquoi. Commande : `.claude/test-command`.

## Terrain

- **Échantillon que Pascal vérifiera :** —.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Point de suivi :** à la remise de la PR, puis à la fin du cycle de `/boucle`.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

la liste des tests se lit comme la spec § 2, point 1.

# Mission 003 — Protocole d'essai du prototype n° 1

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026 avec `/imperatrice:mission`.
> **Statut : validée par Pascal le 2 novembre 2026 (porte n° 2).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Écrire, à partir de la spec et des ADR, le protocole que Pascal suivra sur son smartphone Samsung pour dire si le prototype n° 1 sait lister, copier, effacer un zip et charger un module .mjs, afin que le prototype soit jugé sur un critère fixé d'avance.

**Redite par l'agent :** _à compléter par l'agent avant d'agir — s'il n'y arrive pas, il s'arrête._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | oui — spec § 3.3 et § 9, ADR 0003 et 0005, critique du contradicteur au journal | confier |
| A-t-il les moyens ? (outils, données d'essai, tests) | oui — pas de code à lire ; le protocole est un document | confier |

**Temps de la main :** appuyer.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `testeur`
- **Modèle :** sonnet
- **Ce qui ne lui est pas demandé :** écrire le prototype, lire son code.

## Harnais

- **Peut :** écrire `tests/recette/prototype-1.md` et les petits fichiers d'essai (zips de 1 Ko, un GeoJSON, un Shapefile).
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md` ou une ADR (il signale l'écart à
  l'orchestrateur), effacer une ligne de `pilotage/journal.md`.
- **Sources autorisées :** `docs/spec.md`, ADR 0003, ADR 0005, `pilotage/journal.md` (critique du 2 novembre).

## Valeur provisoire (chiffre, réglage)

- aucune.

## Dépend de / rouge attendu jusqu'à

- aucune ; précède 004.

## Tests

- **Comment saura-t-on que c'est juste :** chaque question du prototype a un geste, un résultat attendu, et une case « vu » à remplir par Pascal. Commande : `.claude/test-command`.

## Terrain

- **Échantillon que Pascal vérifiera :** Pascal suit le protocole à blanc et dit s'il comprend chaque geste.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Point de suivi :** à la remise de la PR, puis à la fin du cycle de `/boucle`.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

Pascal peut cocher chaque ligne sans demander ce qu'elle veut dire.

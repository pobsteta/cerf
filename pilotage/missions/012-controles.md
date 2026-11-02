# Mission 012 — Contrôles d'import

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026 avec `/imperatrice:mission`.
> **Statut : proposée, à valider par Pascal (porte n° 2).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Écrire le module qui applique, dans l'ordre, les contrôles du § 4 et rend un message clair par couche refusée, pour que l'agent ne voie jamais une couche mal placée.

**Redite par l'agent :** _à compléter par l'agent avant d'agir — s'il n'y arrive pas, il s'arrête._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | oui — spec § 4, ADR 0004 | confier |
| A-t-il les moyens ? (outils, données d'essai, tests) | oui — tests 011, emprise de la mission 002 | confier |

**Temps de la main :** tenir — la justesse des données en dépend.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `dev`
- **Modèle :** opus
- **Ce qui ne lui est pas demandé :** interface.

## Harnais

- **Peut :** écrire `plugin/controles.mjs` et son appel.
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md` ou une ADR (il signale l'écart à
  l'orchestrateur), effacer une ligne de `pilotage/journal.md`.
- **Sources autorisées :** `docs/spec.md` § 4, ADR 0004, référentiel 002.

## Valeur provisoire (chiffre, réglage)

- emprise : gelée par 002 avant fusion.

## Dépend de / rouge attendu jusqu'à

- 002, 008, 011 ; ordre de fusion 002 → 011 → 012.

## Tests

- **Comment saura-t-on que c'est juste :** tests 011 au vert. Commande : `.claude/test-command`.

## Terrain

- **Échantillon que Pascal vérifiera :** Pascal charge le zip `piege` sur le Samsung.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Point de suivi :** à la remise de la PR, puis à la fin du cycle de `/boucle`.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

un message clair par piège, aucune couche hors de France.

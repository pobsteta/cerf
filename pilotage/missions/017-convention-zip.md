# Mission 017 — Convention du zip

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026 avec `/imperatrice:mission`.
> **Statut : proposée, à valider par Pascal (porte n° 2).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Rédiger la convention du zip en une page avec l'annexe des styles, pour que JFC fabrique un zip que le plugin accepte du premier coup.

**Redite par l'agent :** _à compléter par l'agent avant d'agir — s'il n'y arrive pas, il s'arrête._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | oui — spec § 3.1, § 4, § 5 | confier |
| A-t-il les moyens ? (outils, données d'essai, tests) | oui | confier |

**Temps de la main :** appuyer.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `archiviste`
- **Modèle :** sonnet
- **Ce qui ne lui est pas demandé :** la notice.

## Harnais

- **Peut :** écrire `docs/convention-zip.md`.
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md` ou une ADR (il signale l'écart à
  l'orchestrateur), effacer une ligne de `pilotage/journal.md`.
- **Sources autorisées :** `docs/spec.md` § 3.1, § 4, § 5.

## Valeur provisoire (chiffre, réglage)

- champs de code : provisoires (voir 009).

## Dépend de / rouge attendu jusqu'à

- aucune.

## Tests

- **Comment saura-t-on que c'est juste :** test de la minute : on trouve chaque règle en moins d'une minute ; une page. Commande : `.claude/test-command`.

## Terrain

- **Échantillon que Pascal vérifiera :** Pascal la lit et fabrique un zip conforme.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Point de suivi :** à la remise de la PR, puis à la fin du cycle de `/boucle`.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

un zip fait d'après la page passe tous les contrôles.

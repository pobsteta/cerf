# Mission 013 — Tests du registre complet

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026 avec `/imperatrice:mission`.
> **Statut : proposée, à valider par Pascal (porte n° 2).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Écrire les tests du registre complet (chemins relatifs, zip réimporté, zip absent, retrait d'une couche, écriture après chaque couche), pour que les couches reviennent toujours et seulement quand il faut.

**Redite par l'agent :** _à compléter par l'agent avant d'agir — s'il n'y arrive pas, il s'arrête._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | oui — spec § 3.3 et § 9, résultat du prototype 004 | confier |
| A-t-il les moyens ? (outils, données d'essai, tests) | oui | confier |

**Temps de la main :** appuyer.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `testeur`
- **Modèle :** sonnet
- **Ce qui ne lui est pas demandé :** écrire le registre.

## Harnais

- **Peut :** écrire `tests/registre.test.mjs`.
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md` ou une ADR (il signale l'écart à
  l'orchestrateur), effacer une ligne de `pilotage/journal.md`.
- **Sources autorisées :** `docs/spec.md` § 3.3, § 9 ; ADR 0003.

## Valeur provisoire (chiffre, réglage)

- aucune.

## Dépend de / rouge attendu jusqu'à

- 004, 008 ; précède 014 ; CI rouge attendue jusqu'à la fusion de 014.

## Tests

- **Comment saura-t-on que c'est juste :** un cas par règle du § 3.3. Commande : `.claude/test-command`.

## Terrain

- **Échantillon que Pascal vérifiera :** —.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Point de suivi :** à la remise de la PR, puis à la fin du cycle de `/boucle`.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

chaque règle du § 3.3 a son test.

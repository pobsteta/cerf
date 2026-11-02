# Mission 015 — Panneau du plugin pour gants et soleil

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026 avec `/imperatrice:mission`.
> **Statut : validée par Pascal le 2 novembre 2026 (porte n° 2).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Concevoir le panneau du plugin (bouton, cases des couches, messages, retrait) lisible au soleil et utilisable avec des gants, pour que l'agent comprenne en dix secondes ce qui a été chargé ou refusé.

**Redite par l'agent :** _à compléter par l'agent avant d'agir — s'il n'y arrive pas, il s'arrête._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | oui — spec § 1 (contraintes de geste), messages du § 4 | confier |
| A-t-il les moyens ? (outils, données d'essai, tests) | oui — Samsung de Pascal pour l'essai | confier |

**Temps de la main :** appuyer.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `afficheur`
- **Modèle :** sonnet
- **Ce qui ne lui est pas demandé :** logique des contrôles et du registre.

## Harnais

- **Peut :** modifier les fichiers QML du plugin.
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md` ou une ADR (il signale l'écart à
  l'orchestrateur), effacer une ligne de `pilotage/journal.md`.
- **Sources autorisées :** `docs/spec.md` § 1 et § 4.

## Valeur provisoire (chiffre, réglage)

- **valeur provisoire** : boutons d'au moins 9 mm ; **mesurée par** Pascal avec des gants sur le Samsung ; **gel** avant la recette par JFC.

## Dépend de / rouge attendu jusqu'à

- 008, 012 ; CI : pas de rouge attendu.

## Tests

- **Comment saura-t-on que c'est juste :** tests existants au vert ; essai de Pascal. Commande : `.claude/test-command`.

## Terrain

- **Échantillon que Pascal vérifiera :** Pascal, gants aux mains, au soleil.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Point de suivi :** à la remise de la PR, puis à la fin du cycle de `/boucle`.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

Pascal charge et retire une couche avec des gants sans erreur de toucher.

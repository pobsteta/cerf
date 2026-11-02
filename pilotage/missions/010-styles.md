# Mission 010 — Styles du manuel

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026 avec `/imperatrice:mission`.
> **Statut : validée par Pascal le 2 novembre 2026 (porte n° 2).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Écrire le module qui reconnaît une couche et lui donne le style du § 5 (couleurs et tailles du mail de JFC), ou celui du .qml posé dans le zip, pour que l'agent voie les couleurs du manuel sans rien régler.

**Redite par l'agent :** _à compléter par l'agent avant d'agir — s'il n'y arrive pas, il s'arrête._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | oui — spec § 5 | confier |
| A-t-il les moyens ? (outils, données d'essai, tests) | oui — tests 009 ; champs de code provisoires | confier |

**Temps de la main :** appuyer.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `dev`
- **Modèle :** sonnet
- **Ce qui ne lui est pas demandé :** contrôles d'import, interface.

## Harnais

- **Peut :** écrire `plugin/styles.mjs` et son appel dans le plugin.
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md` ou une ADR (il signale l'écart à
  l'orchestrateur), effacer une ligne de `pilotage/journal.md`.
- **Sources autorisées :** `docs/spec.md` § 5.

## Valeur provisoire (chiffre, réglage)

- champs de code : provisoires (voir 009).

## Dépend de / rouge attendu jusqu'à

- 008, 009 ; ordre de fusion 009 → 010.

## Tests

- **Comment saura-t-on que c'est juste :** tests 009 au vert. Commande : `.claude/test-command`.

## Terrain

- **Échantillon que Pascal vérifiera :** Pascal charge UG, Parcelles et FRT sur le Samsung et compare les couleurs au mail de JFC.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Point de suivi :** à la remise de la PR, puis à la fin du cycle de `/boucle`.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

couleurs et tailles conformes au mail, sans réglage.

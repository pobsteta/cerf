# Mission 008 — Squelette du plugin : un parcours complet, minimal

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026 avec `/imperatrice:mission`.
> **Statut : validée par Pascal le 2 novembre 2026 (porte n° 2).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Écrire le plugin QField d'application qui, dans un projet Cerf, ajoute un zip, charge ses couches GeoJSON en lecture seule avec le style par défaut, les inscrit au registre et les recharge à l'ouverture, pour avoir un parcours complet avant de l'enrichir.

**Redite par l'agent :** _à compléter par l'agent avant d'agir — s'il n'y arrive pas, il s'arrête._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | oui, si le prototype 004 a répondu — ADR 0001, 0003, 0005 ; spec § 1 et § 3.3 | confier |
| A-t-il les moyens ? (outils, données d'essai, tests) | oui — tests 007, Samsung de Pascal pour l'essai | confier |

**Temps de la main :** tenir — premier code du plugin, il fixe la structure.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `dev`
- **Modèle :** opus
- **Ce qui ne lui est pas demandé :** styles du manuel, contrôles d'import, interface soignée, autres formats.

## Harnais

- **Peut :** écrire `plugin/` (QML et modules `.mjs`).
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md` ou une ADR (il signale l'écart à
  l'orchestrateur), effacer une ligne de `pilotage/journal.md`.
- **Sources autorisées :** ADR 0001, 0003, 0005, 0006 ; spec § 1 et § 3.3 ; résultat du prototype 004 ; ne rien recopier.

## Valeur provisoire (chiffre, réglage)

- aucune.

## Dépend de / rouge attendu jusqu'à

- 004, 006, 007 ; ordre de fusion 007 → 008.

## Tests

- **Comment saura-t-on que c'est juste :** tests 007 au vert ; essai sur le Samsung : un zip, une couche, fermer, rouvrir, elle revient. Commande : `.claude/test-command`.

## Terrain

- **Échantillon que Pascal vérifiera :** Pascal ajoute un zip avec un GeoJSON sur son Samsung, en mode avion, puis redémarre.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Point de suivi :** à la remise de la PR, puis à la fin du cycle de `/boucle`.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

après redémarrage du Samsung, la couche est toujours là.

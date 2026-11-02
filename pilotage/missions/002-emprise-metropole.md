# Mission 002 — Emprise de la France métropolitaine en Lambert 93

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026 avec `/imperatrice:mission`.
> **Statut : proposée, à valider par Pascal (porte n° 2).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Calculer avec PROJ l'emprise de la terre ferme de France métropolitaine, Corse comprise, en Lambert 93, pour fixer le rectangle du contrôle de vraisemblance (spec § 4).

**Redite par l'agent :** _à compléter par l'agent avant d'agir — s'il n'y arrive pas, il s'arrête._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | oui — pyproj (installable), contour de la France d'une source publique nommée (ADMIN EXPRESS de l'IGN ou Natural Earth), spec § 4, ADR 0004 | confier |
| A-t-il les moyens ? (outils, données d'essai, tests) | oui — pyproj s'installe depuis PyPI ; à défaut de contour téléchargeable, les points extrêmes publiés | confier |

**Temps de la main :** appuyer — un calcul sourcé, vérifiable.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `acquereur`
- **Modèle :** sonnet
- **Ce qui ne lui est pas demandé :** changer la règle du contrôle, coder le contrôle.

## Harnais

- **Peut :** installer pyproj, télécharger un contour public, écrire `docs/referentiels/emprise-metropole.md` et le script de calcul `outils/emprise.py`.
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md` ou une ADR (il signale l'écart à
  l'orchestrateur), effacer une ligne de `pilotage/journal.md`.
- **Sources autorisées :** `docs/spec.md` § 4, ADR 0004.

## Valeur provisoire (chiffre, réglage)

- **valeur provisoire** de la spec : X 89 000 → 1 253 000, Y 6 039 000 → 7 121 000 (calcul approché) ; **mesurée par** cette mission ; **gel** avant la fusion de la mission 012 (contrôles d'import).

## Dépend de / rouge attendu jusqu'à

- aucune.

## Tests

- **Comment saura-t-on que c'est juste :** le script se relance et redonne les mêmes valeurs ; Ouessant, Dunkerque, Menton, Bonifacio et Strasbourg sont dedans ; Jersey et Genève hors du rectangle sans marge (contrôle de sens). Commande : `.claude/test-command`.

## Terrain

- **Échantillon que Pascal vérifiera :** Pascal relit les cinq villes témoins et leurs coordonnées.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Point de suivi :** à la remise de la PR, puis à la fin du cycle de `/boucle`.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

un rectangle en Lambert 93, sa source, son script, et la marge de 10 km ajoutée à part.

# Mission 006 — Projet modèle cerf.qgz

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026 avec `/imperatrice:mission`.
> **Statut : proposée, à valider par Pascal (porte n° 2).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Produire cerf.qgz, vide de données métier, en Lambert 93, avec les fonds XYZ du référentiel et la variable cerf_id, pour que l'agent ait un projet prêt à ouvrir sur son appareil.

**Redite par l'agent :** _à compléter par l'agent avant d'agir — s'il n'y arrive pas, il s'arrête._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | oui — référentiel 001, ADR 0002, spec § 2 | confier |
| A-t-il les moyens ? (outils, données d'essai, tests) | **non, en partie** — QGIS n'est pas dans le conteneur : le projet est écrit par un script reproductible (`outils/projet-modele.mjs`), puis ouvert par Pascal dans QGIS | appuyer : plan d'abord |

**Temps de la main :** tenir — le projet modèle engage la durée (tous les appareils l'ouvriront).

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `dev`
- **Modèle :** sonnet
- **Ce qui ne lui est pas demandé :** le plugin.

## Harnais

- **Peut :** écrire `outils/projet-modele.mjs` et le `cerf.qgz` qu'il produit.
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md` ou une ADR (il signale l'écart à
  l'orchestrateur), effacer une ligne de `pilotage/journal.md`.
- **Sources autorisées :** référentiel 001, ADR 0002, spec § 2 et § 3.3.

## Valeur provisoire (chiffre, réglage)

- aucune.

## Dépend de / rouge attendu jusqu'à

- 001, 005 ; ordre de fusion 005 → 006.

## Tests

- **Comment saura-t-on que c'est juste :** tests de la mission 005 au vert. Commande : `.claude/test-command`.

## Terrain

- **Échantillon que Pascal vérifiera :** Pascal ouvre `cerf.qgz` dans QGIS puis dans QField : deux fonds, EPSG:2154.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Point de suivi :** à la remise de la PR, puis à la fin du cycle de `/boucle`.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

le projet s'ouvre sans erreur dans QGIS et QField, fonds visibles avec réseau.

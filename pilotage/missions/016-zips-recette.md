# Mission 016 — Zips de recette piege et lourd

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026 avec `/imperatrice:mission`.
> **Statut : proposée, à valider par Pascal (porte n° 2).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Fabriquer par script les zips `piege` et `lourd` de la spec § 6, pour que les critères 6 et 7 se rejouent à l'identique.

**Redite par l'agent :** _à compléter par l'agent avant d'agir — s'il n'y arrive pas, il s'arrête._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | oui — spec § 6 | confier |
| A-t-il les moyens ? (outils, données d'essai, tests) | **non, en partie** — GDAL n'est pas dans le conteneur : à installer (pip `gdal` ou conda) en première tâche ; sinon fichiers écrits à la main pour le zip `piege`, et le GeoTIFF de 200 Mo généré sans GDAL | appuyer : plan d'abord |

**Temps de la main :** appuyer.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `testeur`
- **Modèle :** sonnet
- **Ce qui ne lui est pas demandé :** le code du plugin.

## Harnais

- **Peut :** écrire `outils/zips-recette.*` et `tests/recette/`.
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md` ou une ADR (il signale l'écart à
  l'orchestrateur), effacer une ligne de `pilotage/journal.md`.
- **Sources autorisées :** `docs/spec.md` § 6.

## Valeur provisoire (chiffre, réglage)

- aucune.

## Dépend de / rouge attendu jusqu'à

- aucune.

## Tests

- **Comment saura-t-on que c'est juste :** le script reproduit les mêmes zips ; contenu listé dans `tests/recette/README.md`. Commande : `.claude/test-command`.

## Terrain

- **Échantillon que Pascal vérifiera :** Pascal ouvre chaque fichier du zip `piege` dans QGIS et voit le défaut annoncé.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Point de suivi :** à la remise de la PR, puis à la fin du cycle de `/boucle`.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

chaque piège est visible dans QGIS.

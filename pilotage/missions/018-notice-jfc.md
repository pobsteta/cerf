# Mission 018 — Notice de JFC

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026 avec `/imperatrice:mission`.
> **Statut : proposée, à valider par Pascal (porte n° 2).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Rédiger la notice de trois pages qui montre à JFC comment préparer le zip depuis QGIS pour ProdBois, Relevés et Canopée, et le copier sur l'appareil, pour qu'il le fasse seul.

**Redite par l'agent :** _à compléter par l'agent avant d'agir — s'il n'y arrive pas, il s'arrête._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | **non** — les exports bruts de ProdBois, Relevés et Canopée et leurs champs sont inconnus | ne pas lâcher : moyen à fournir |
| A-t-il les moyens ? (outils, données d'essai, tests) | **non** — fichiers bruts de JFC à fournir | ne pas lâcher : moyen à fournir |

**Temps de la main :** tenir — moyens manquants.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `archiviste`
- **Modèle :** sonnet
- **Ce qui ne lui est pas demandé :** la convention du zip.

## Harnais

- **Peut :** écrire `docs/notice-jfc.md`.
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md` ou une ADR (il signale l'écart à
  l'orchestrateur), effacer une ligne de `pilotage/journal.md`.
- **Sources autorisées :** convention 017, fichiers bruts de JFC.

## Valeur provisoire (chiffre, réglage)

- aucune.

## Dépend de / rouge attendu jusqu'à

- 017 et **les fichiers bruts de JFC (moyen manquant)**.

## Tests

- **Comment saura-t-on que c'est juste :** test du successeur : une personne qui n'a pas suivi le projet fabrique un zip. Commande : `.claude/test-command`.

## Terrain

- **Échantillon que Pascal vérifiera :** JFC suit la notice.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Point de suivi :** à la remise de la PR, puis à la fin du cycle de `/boucle`.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

JFC fabrique `Serre_EA2026` seul.

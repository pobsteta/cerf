# Mission 004 — Prototype n° 1 : ce que QField permet à un plugin

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026 avec `/imperatrice:mission`.
> **Statut : validée par Pascal le 2 novembre 2026 (porte n° 2).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Écrire un plugin QField minimal qui tente de lister un zip, de le copier hors du dossier projet, d'effacer un .zip et d'importer un module .mjs testé aussi sous Node, pour trancher les points non prouvés des ADR 0003 et 0005 avant de bâtir dessus.

**Redite par l'agent :** _à compléter par l'agent avant d'agir — s'il n'y arrive pas, il s'arrête._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | **non, en partie** — l'API QML de QField est peu documentée : l'agent lit le code source de QField sur GitHub et rend d'abord un plan | appuyer : plan d'abord |
| A-t-il les moyens ? (outils, données d'essai, tests) | **non, en partie** — l'essai sur le Samsung revient à Pascal (mission 003 fournit le protocole) | appuyer : plan d'abord |

**Temps de la main :** tenir — le résultat décide de l'architecture (spec § 9, n° 1 et 2) ; plan rendu avant le code.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `dev`
- **Modèle :** opus
- **Ce qui ne lui est pas demandé :** le plugin définitif, l'interface, les styles.

## Harnais

- **Peut :** lire le code de QField sur GitHub, écrire `prototype/` (plugin QML + un module `.mjs` + son test `tests/prototype.test.mjs`).
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md` ou une ADR (il signale l'écart à
  l'orchestrateur), effacer une ligne de `pilotage/journal.md`.
- **Sources autorisées :** ADR 0001, 0003, 0005 ; `docs/spec.md` § 3.3 et § 9 ; code de QField (`qffileutils`, `qfplatformutilities`, `LayerUtils`) ; ne rien recopier de `qfield-layer-loader` ni de `qfield_addLayer` (ADR 0006).

## Valeur provisoire (chiffre, réglage)

- aucune.

## Dépend de / rouge attendu jusqu'à

- 003 (protocole) ; ordre de fusion 003 → 004.

## Tests

- **Comment saura-t-on que c'est juste :** `node --test` vert sur le module ; protocole 003 rempli par Pascal sur le Samsung. Commande : `.claude/test-command`.

## Terrain

- **Échantillon que Pascal vérifiera :** Pascal installe le prototype par URL sur son Samsung et remplit le protocole.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Point de suivi :** à la remise de la PR, puis à la fin du cycle de `/boucle`.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

pour chacune des quatre questions, un « oui » ou un « non » vu sur le Samsung, et la décision du § 9 qui en découle.

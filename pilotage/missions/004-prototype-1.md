# Mission 004 — Prototype n° 1 : ce que QField permet à un plugin

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026 avec `/imperatrice:mission`.
> **Statut : validée par Pascal le 2 novembre 2026 (porte n° 2).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Écrire un plugin QField minimal qui tente de lister un zip, de le copier hors du dossier projet, d'effacer un .zip et d'importer un module .mjs testé aussi sous Node, pour trancher les points non prouvés des ADR 0003 et 0005 avant de bâtir dessus.

**Redite par l'agent :** Construire un plugin QField jetable qui essaie, sur le Samsung de Pascal et hors réseau, de lister un zip, de le copier dans `Imported Datasets/cerf/<cerf_id>/`, de l'effacer et de charger un module `.mjs` aussi testé sous Node, pour que les « oui » ou « non » vus sur l'appareil décident des replis de la spec § 9 (n° 1 et 2) et confirment ou non l'ADR 0005 avant qu'on bâtisse le vrai plugin. _(dev, 2 novembre 2026 ; plan dans `prototype/PLAN.md`, code après accord de Pascal.)_

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

## Exigences venues du protocole 003 (relecteur, 2 novembre 2026)

Pour que Pascal puisse suivre `tests/recette/prototype-1.md`, le prototype affiche :
le chemin et la taille de la copie du zip, l'identifiant `cerf_id` lu, un message « zip
absent » après l'effacement, le résultat de `somme(2, 3)` et la valeur de `SIGNATURE` du
module `tests/recette/essai/module-essai.mjs` ; il dit s'il liste la copie ou l'original.
Les noms de ses boutons sont reportés dans le protocole à la fin de la mission.
Après l'aller-retour 1/3 de la mission 003 (questions 5 à 9 du protocole), il affiche
aussi, pour chaque couche lue dans un zip : son système de coordonnées, la position du
point d'essai, et pour le GeoTIFF sa taille en pixels et le temps d'ouverture.

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

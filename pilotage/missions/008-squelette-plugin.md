# Mission 008 — Squelette du plugin : un parcours complet, minimal

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026 avec `/imperatrice:mission`.
> **Statut : validée par Pascal le 2 novembre 2026 (porte n° 2).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Écrire le plugin QField d'application qui, dans un projet Cerf, ajoute un zip, charge ses couches GeoJSON en lecture seule avec le style par défaut, les inscrit au registre et les recharge à l'ouverture, pour avoir un parcours complet avant de l'enrichir.

**Redite par l'agent :** Écrire le plugin QField d'application `cerf` (module `plugin/cerf-logique.mjs` au contrat validé le 3 novembre 2026, branché sur l'API de QField par `plugin/main.qml` et ses écrans) qui, dans un projet portant `cerf_id`, copie un zip hors du dossier projet, en charge les couches GeoJSON par `/vsizip/` en lecture seule avec le style par défaut, les inscrit au registre après chacune, les recharge à chaque ouverture et permet de les retirer, pour que le parcours complet soit jugé (46 tests de la 007 au vert sans les modifier, couche revenue après redémarrage du Samsung) avant d'être enrichi. (`dev`, 3 novembre 2026 ; plan dans `plugin/PLAN.md`, à valider par Pascal avant tout code.)

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | oui, si le prototype 004 a répondu — ADR 0001, 0003, 0005 ; spec § 1 et § 3.3 | confier |
| A-t-il les moyens ? (outils, données d'essai, tests) | oui — tests 007, Samsung de Pascal pour l'essai | confier |

**Temps de la main :** tenir — premier code du plugin, il fixe la structure.

## Décisions de Pascal sur le plan

Plan `plugin/PLAN.md` (commit `9216ca0`) **validé par Pascal le 3 novembre 2026**, avec ces
réponses aux sept questions du § 10 du plan (transmises par l'orchestrateur) :

1. **Harnais étendu** à `tests/plugin.test.mjs` et `.github/workflows/release-plugin.yml`.
2. **Mise en ligne** : préversion `plugin-essai` sur la branche de la mission,
   `plugin-v<version>` sur `main`, URL stable `releases/latest/download/cerf.zip`.
3. **Lecture hors du dossier projet refusée** : détecter et le dire (avec la version de
   QField), sans coder le repli de la spec § 9 n° 1.
4. **Même nom de couche dans deux dossiers d'un zip** : la seconde est refusée, avec un
   message.
5. **Entrée douteuse du registre vue à l'ouverture** : retirée aussitôt, sans rien effacer,
   et annoncée dans le message.
6. **Plafond de 10 Mo** pour le listage d'un zip, avec un message clair au-delà.
7. **`__MACOSX/` et `._*`** : ignorés en silence.

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

## Changement de cap du 3 novembre 2026 (Pascal)

La décision 3 ci-dessus (« sans coder le repli de la spec § 9 n° 1 ») est **remplacée** : après
l'essai de Cerf 0.1.0 sur le Samsung (QField v4.3.7, lecture refusée hors du dossier projet),
Pascal applique le repli. Les copies vont dans `<dossier du projet>/cerf-imports/`, sans
QFieldCloud (spec § 3.3 et § 10, ADR 0003 et 0007). Réalisé en Cerf 0.1.1 (9db6c0d).

## Décisions de Pascal du 3 novembre 2026 (après l'essai de la 0.1.1)

- **Copie refusée effacée** (pas un zip, au-delà du plafond, aucune couche chargée) si
  aucune entrée du registre n'en vient : oui, confirmé (déjà fait en 0.1.1, `plugin/PLAN.md`
  § 12.2).
- **Release `plugin-v<version>` sur `main` seulement si `plugin/` a changé** dans le push :
  oui (aller-retour 2/3). Harnais étendu par l'orchestrateur pour cette décision :
  `outils/decider-release.mjs` et `tests/decider-release.test.mjs`.
- **À confirmer par Pascal** : la règle ajoutée par le dev « dans le doute (premier push,
  push forcé, diff impossible), on publie ».
- Saisie dans les couches importées : non (lecture seule maintenue) ; la saisie passe par la
  couche « Saisie terrain » du projet modèle (missions 020 et 021).

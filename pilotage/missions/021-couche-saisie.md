# Mission 021 — Couche de saisie dans le projet modèle

> Fiche rédigée par Claude (orchestrateur) le 3 novembre 2026, après l'amendement de Pascal
> (voie 1). **Statut : validée par Pascal le 3 novembre 2026 (porte n° 2).** Une mission = une
> phrase = une branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Ajouter au projet modèle, par le script outils/projet-modele.mjs, la couche ponctuelle modifiable « Saisie terrain » et son saisie.gpkg vide, au style ProdBois, pour que l'agent ajoute des points sur le terrain et les rapporte au bureau en copiant le fichier.

**Redite par l'agent :** _à remplir par l'agent avant de commencer._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | oui — spec § 3.5 et § 5, mission 006 (script du projet modèle), norme GeoPackage de l'OGC | confier |
| A-t-il les moyens ? (outils, données d'essai, tests) | **en partie** — QGIS n'est pas dans le conteneur : le `.gpkg` et le `.qgs` sont écrits par script (`node:sqlite`), puis ouverts par Pascal dans QGIS et QField | appuyer : plan d'abord |

**Temps de la main :** tenir — la couche de saisie porte des données de terrain ; une
erreur de schéma ou un écrasement fait perdre le travail de l'agent.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `dev`
- **Modèle :** opus
- **Ce qui ne lui est pas demandé :** le plugin ; un bouton d'export.

## Harnais

- **Peut :** modifier `outils/projet-modele.mjs`, produire `cerf.qgz` et `saisie.gpkg`,
  adapter le workflow qui publie `cerf-projet-modele.zip` pour y joindre `saisie.gpkg`.
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md`, une ADR ou les tests des missions 005 et 020
  (les tests de la 005 sont corrigés par le testeur de la 020, décision de Pascal du
  3 novembre 2026)
  (il signale l'écart à l'orchestrateur), effacer une ligne de `pilotage/journal.md`.
- **Sources autorisées :** spec § 2, § 3.5, § 5, § 6 n° 10 ; mission 006 ; norme
  GeoPackage (OGC 12-128).

## Plan d'abord (à rendre avant le code)

Le plan dit au moins : comment `saisie.gpkg` est écrit de façon déterministe ; comment
la couche est déclarée dans le `.qgs` (source relative, défaut `now()`, style) ; et
**comment une mise à jour du projet modèle n'écrase pas un `saisie.gpkg` déjà rempli**
sur l'appareil (zip séparé, consigne de la notice, ou autre : à proposer à Pascal).

## Valeur provisoire (chiffre, réglage)

- `essence` en texte libre, `diametre` en centimètres entiers (spec § 3.5, confirmés par Pascal le 3 novembre 2026) ; champs facultatifs ; contrainte QGIS `diametre >= 0`.

## Dépend de / rouge attendu jusqu'à

- 020 (même branche, une seule PR) ; 006.

## Tests

- **Comment saura-t-on que c'est juste :** tests des missions 005 et 020 au vert sans
  modification. Commande : `.claude/test-command`.

## Terrain

- **Échantillon que Pascal vérifiera :** spec § 6 n° 10 — mode avion, trois points saisis
  avec essence et diamètre, style ProdBois, `date` remplie seule, présents après
  redémarrage ; `saisie.gpkg` copié sur un PC s'ouvre dans QGIS en Lambert 93. **La
  vérification de Pascal dans QGIS et sur le Samsung conditionne la fusion.**

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Point de suivi :** au plan, à la remise de la PR, puis à la fin du cycle de `/boucle`.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

L'agent ajoute des points sur le terrain sans réseau, et ils arrivent au bureau.

## Décisions de Pascal sur le plan (3 novembre 2026)

Plan : `outils/PLAN-021.md` (e3bdb88).

1. **Mise à jour sans écrasement : deux zips** (option A). `cerf-projet-modele.zip` ne
   contient que `cerf.qgz` (mise à jour) ; `cerf-projet-modele-premiere-installation.zip`
   contient `cerf.qgz` et `saisie.gpkg` vide. Les appareils déjà en service prennent une
   fois le zip de première installation.
2. **`saisie.gpkg` versé** à la racine du dépôt, régénéré par `outils/projet-modele.mjs`.
3. **Publication à part** : workflow `release-projet-modele.yml` (préversion d'essai sur
   `mission/021-couche-saisie`, release sur `main`) ; le décideur de la 008 n'est pas touché.
   Harnais étendu à ce workflow et au script des zips (`outils/zips-projet-modele.mjs`) et à
   ses tests.
4. **Couche non retirable** dans QField.
5. Retenus par défaut (propositions du plan, sans objection) : R-tree omis (à rajouter si
   QGIS s'en plaint) ; `essence` et `remarque` en `TEXT` sans longueur, `diametre` sans
   plafond ; la notice reste à la mission 018 (le dev livre trois phrases à reprendre).

# Mission 020 — Tests de la couche de saisie

> Fiche rédigée par Claude (orchestrateur) le 3 novembre 2026, après l'amendement de Pascal
> (voie 1 : couche de saisie dans le projet modèle). **Statut : proposée, à valider par
> Pascal (porte n° 2).** Une mission = une phrase = une branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Écrire les tests qui vérifient que le projet modèle porte la couche ponctuelle modifiable « Saisie terrain » (saisie.gpkg, EPSG:2154, champs essence, diametre, remarque, date), avant qu'elle soit produite, pour que l'agent puisse ajouter des points sur le terrain.

**Redite par l'agent :** _à remplir par l'agent avant de commencer._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | oui — spec § 2, § 3.5, § 5 (règle ProdBois / Relevés), § 6 n° 10 ; tests existants `tests/projet-modele.test.mjs` | confier |
| A-t-il les moyens ? (outils, données d'essai, tests) | oui — un `.qgz` est un zip de XML ; un GeoPackage se lit avec `node:sqlite` (Node 22) | confier |

**Temps de la main :** appuyer.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `testeur`
- **Modèle :** sonnet
- **Ce qui ne lui est pas demandé :** produire la couche ni modifier `outils/projet-modele.mjs`.

## Harnais

- **Peut :** écrire `tests/couche-saisie.test.mjs` (sans lire le code qui l'implémentera).
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md` ou une ADR (il signale l'écart à
  l'orchestrateur), effacer une ligne de `pilotage/journal.md`, modifier les tests de la
  mission 005.
- **Sources autorisées :** `docs/spec.md` § 2, § 3.5, § 5, § 6 n° 10 ; `docs/brief.md`
  (amendement du 3 novembre 2026).

## Ce que les tests doivent couvrir (au moins)

- `saisie.gpkg` existe à côté de `cerf.qgz` ; c'est un GeoPackage valide ; une table
  `saisie_terrain`, géométrie Point, srs 2154, **zéro ligne** ;
- champs `fid` (clé), `essence` (texte), `diametre` (entier), `remarque` (texte), `date`
  (date et heure) ;
- dans `cerf.qgz` : une couche « Saisie terrain » dont la source est le GeoPackage par
  **chemin relatif**, non en lecture seule, hors du groupe « Fonds de carte » et au-dessus
  de lui ; défaut de `date` = `now()` ; symbole cercle noir plein 2 mm et étiquette
  `"essence" || '\n' || "diametre"` (8 pt, noire, liseré blanc) ;
- les tests de la mission 005 restent verts (toujours exactement deux fonds XYZ dans le
  groupe « Fonds de carte »).

## Valeur provisoire (chiffre, réglage)

- `essence` en texte libre, `diametre` en centimètres entiers (propositions de la spec
  § 3.5, à confirmer par Pascal).

## Dépend de / rouge attendu jusqu'à

- 005, 006 ; précède 021 ; **CI rouge attendue** sur ces tests jusqu'au commit de la 021
  (même branche que la 021, une seule PR).

## Tests

- **Comment saura-t-on que c'est juste :** les tests échouent sans la couche et disent
  pourquoi ; ils passent sur un module jetable qui la produit. Commande : `.claude/test-command`.

## Terrain

- **Échantillon que Pascal vérifiera :** —.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Point de suivi :** à la remise de la PR, puis à la fin du cycle de `/boucle`.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

La mission 021 a une cible mesurable et ne peut pas s'auto-évaluer.

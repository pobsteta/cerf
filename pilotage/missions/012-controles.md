# Mission 012 — Contrôles d'import

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026 avec `/imperatrice:mission`.
> **Statut : validée par Pascal le 2 novembre 2026 (porte n° 2).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Écrire le module qui applique, dans l'ordre, les contrôles du § 4 et rend un message clair par couche refusée, pour que l'agent ne voie jamais une couche mal placée.

**Redite par l'agent :** _à compléter par l'agent avant d'agir — s'il n'y arrive pas, il s'arrête._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | oui — spec § 4, ADR 0004 | confier |
| A-t-il les moyens ? (outils, données d'essai, tests) | oui — tests 011, emprise de la mission 002 | confier |

**Temps de la main :** tenir — la justesse des données en dépend.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `dev`
- **Modèle :** opus
- **Ce qui ne lui est pas demandé :** interface.

## Harnais

- **Peut :** écrire `plugin/cerf-controles.mjs` et son appel.
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md` ou une ADR (il signale l'écart à
  l'orchestrateur), effacer une ligne de `pilotage/journal.md`.
- **Sources autorisées :** `docs/spec.md` § 4, ADR 0004, référentiel 002.

## Valeur provisoire (chiffre, réglage)

- emprise : gelée par 002 avant fusion.

## Dépend de / rouge attendu jusqu'à

- 002, 008, 011 ; ordre de fusion 002 → 011 → 012.

## Tests

- **Comment saura-t-on que c'est juste :** tests 011 au vert. Commande : `.claude/test-command`.

## Terrain

- **Échantillon que Pascal vérifiera :** Pascal charge le zip `piege` sur le Samsung.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Point de suivi :** à la remise de la PR, puis à la fin du cycle de `/boucle`.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

un message clair par piège, aucune couche hors de France.

## Précisions de l'orchestrateur (4 novembre 2026, après la relecture de la 011)

- Module : **`plugin/cerf-controles.mjs`** (nom des tests de la 011, aligné sur
  `cerf-logique.mjs`), à ajouter à `FICHIERS_PLUGIN` de `plugin/empaqueter.mjs`.
- Contrat proposé par les tests de la 011 (en tête de `tests/controles.test.mjs`) :
  `controlerCouche(couche, services)`, synchrone, sans réseau ; `services.reprojeter` est
  appelé **même en EPSG:2154** ; résultat `{ charge, controle, message, avertissements }`.
- Le plan dit comment une couche QGIS devient l'objet `couche` (non testé par la 011).
- Messages : nom de la couche en tête de chaque refus et avertissement (spec § 4, Pascal,
  4 novembre 2026).

## Décisions de Pascal sur le plan (4 novembre 2026)

Plan `plugin/PLAN-012.md` (1aab609) **validé**.
1. Les tests de la 008 touchés par le changement d'interface de `importerZip` sont adaptés
   par le **testeur** dans la même PR ; le dev n'y touche pas ; le service de contrôle est
   obligatoire (absent → tout refusé).
2. Shapefile sans `.shx` ou `.dbf` → refus comme le `.prj` (spec § 4, contrôle 1).
3. Chargement des GeoTIFF : mission 010 ; la 012 ne livre que leur contrôle.
4. Messages de refus aux textes de la spec, sans consigne ; la conduite à tenir va dans la
   notice de JFC.
5. Pas de recontrôle des couches du registre à la réouverture.
6. Shapefile vide sans `.prj` : refusé (contrôle 1 avant 4).
7. Emprise : valeurs du référentiel 002 gelées.
8. (après la relecture de a2b5250) Une couche qui n'est plus dans un zip réimporté sous le
   même nom est **retirée du registre** (le zip réimporté remplace l'ancien en entier).
9. Ordre du contrôle 1 quand plusieurs fichiers manquent : `.prj`, puis `.shx`, puis `.dbf`
   (un seul message, celui du premier manquant).
10. La lecture des Shapefile, GeoPackage et GeoTIFF par `couchesDuZip` relève d'une
    **nouvelle mission (024)**, après le prototype n° 2 ; la 012 n'en livre que les contrôles.
11. Zip réimporté sans aucune couche lisible : **import avorté**, rien n'est touché au
    registre ni sur la carte, message « aucune couche lisible dans <zip>, rien changé ».
12. Messages de réouverture (« illisible (a) ») avec le nom et l'extension : hors de la 012,
    dans la mission 014 (registre complet).
13. Zip réimporté dont **tous les GeoJSON sont illisibles** : import avorté aussi (décision
    11 étendue).
14. Passage supplémentaire du dev autorisé par Pascal (au-delà des 3 allers-retours) pour le
    point 13 et pour refuser toute reprojection qui rend un point ou un rectangle **vide**
    (QField 4.3.7 ne lève pas d'exception sur échec, lecture des sources par la 023).
15. Réimport dont toutes les couches s'ouvrent mais sont refusées aux contrôles : la décision 8
    s'applique (voulu, Pascal, 4 novembre 2026).
16. Copie du zip réimporté sous un **nom provisoire**, qui ne remplace l'ancienne qu'après un
    import réussi : confiée à la mission 014 (registre complet), si QField le permet.

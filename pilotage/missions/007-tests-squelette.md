# Mission 007 — Tests du squelette du plugin

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026 avec `/imperatrice:mission`.
> **Statut : validée par Pascal le 2 novembre 2026 (porte n° 2).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Écrire les tests de la logique du squelette (projet Cerf reconnu ou non, une couche GeoJSON du zip inscrite au registre et rechargée), pour que le parcours minimal soit jugé avant d'être écrit.

**Redite par l'agent :** Écrire, sans lire le plugin, les tests `node --test` de la logique du squelette (reconnaître un projet Cerf par `cerf_id`, inscrire au registre les couches GeoJSON d'un zip copié, les recharger à la réouverture, retirer une couche et effacer la copie par `rmFile`), appels à QField simulés, rouges tant que la mission 008 n'a pas écrit `plugin/`, pour que le parcours minimal soit jugé avant d'être écrit.

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | oui — spec § 1 (gestes 2 à 8), § 3.3, § 6 (critères 4, 8, 9) | confier |
| A-t-il les moyens ? (outils, données d'essai, tests) | oui — `node --test` ; les appels à QField sont simulés | confier |

**Temps de la main :** appuyer.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `testeur`
- **Modèle :** sonnet
- **Ce qui ne lui est pas demandé :** écrire le plugin.

## Harnais

- **Peut :** écrire `tests/squelette.test.mjs`.
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md` ou une ADR (il signale l'écart à
  l'orchestrateur), effacer une ligne de `pilotage/journal.md`.
- **Sources autorisées :** `docs/spec.md` § 1, § 3.3, § 6 ; ADR 0003, 0005 ; résultat du prototype 004.

## Valeur provisoire (chiffre, réglage)

- aucune.

## Dépend de / rouge attendu jusqu'à

- 004 (résultat du prototype) ; précède 008 ; CI rouge attendue jusqu'à la fusion de 008.

## Tests

- **Comment saura-t-on que c'est juste :** tests rouges sans le code, qui disent pourquoi. Commande : `.claude/test-command`.

## Terrain

- **Échantillon que Pascal vérifiera :** —.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Point de suivi :** à la remise de la PR, puis à la fin du cycle de `/boucle`.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

chaque test renvoie à un geste ou un critère de la spec.

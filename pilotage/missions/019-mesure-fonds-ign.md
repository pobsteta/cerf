# Mission 019 — Mesure des fonds IGN

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026, scission de la mission 001
> décidée par Pascal le même jour.
> **Statut : validée par Pascal le 2 novembre 2026 (porte n° 2).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Récupérer dans le dépôt le GetCapabilities WMTS de data.geopf.fr et, pour Plan IGN v2 et BD ORTHO, une tuile réelle avec ses en-têtes HTTP, pour que l'`acquereur` (mission 001) rédige le référentiel des fonds sur des pièces mesurées.

**Redite par l'agent :** _à compléter par l'agent avant d'agir — s'il n'y arrive pas, il s'arrête._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | oui — `curl`, ADR 0002, spec § 3.4 | confier |
| A-t-il les moyens ? (outils, données d'essai, tests) | oui — Bash et `curl` ; data.geopf.fr joignable depuis Bash (vérifié le 2 novembre 2026, HTTP 200) | confier |

**Temps de la main :** appuyer — référentiel public, sans décision d'architecture.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `dev`
- **Modèle :** sonnet
- **Ce qui ne lui est pas demandé :** interpréter les pièces, rédiger le référentiel (mission 001), écrire le projet modèle.

## Harnais

- **Peut :** lancer `curl`, écrire `docs/referentiels/brut/` (GetCapabilities, une tuile par fond, en-têtes) et `outils/mesure-fonds.sh` qui refait la mesure.
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md` ou une ADR (il signale l'écart à
  l'orchestrateur), effacer une ligne de `pilotage/journal.md`.
- **Sources autorisées :** `docs/spec.md` § 3.4, ADR 0002 (gabarit d'URL), https://data.geopf.fr/wmts.

## Valeur provisoire (chiffre, réglage)

- aucune — la mission mesure le zoom maximal et la durée de cache, elle n'en fixe pas.

## Dépend de / rouge attendu jusqu'à

- aucune ; précède 001 ; ordre de fusion 019 → 001.

## Tests

- **Comment saura-t-on que c'est juste :** le script refait la mesure ; chaque pièce porte sa date et l'URL exacte ; un test vérifie que les pièces existent et que chaque tuile est une image non vide. Commande : `.claude/test-command`.

## Terrain

- **Échantillon que Pascal vérifiera :** Pascal ouvre deux URL de tuiles dans son navigateur et voit une image.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Point de suivi :** à la remise de la PR, puis à la fin du cycle de `/boucle`.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

L'`acquereur` rédige la mission 001 sans aucun accès réseau, à partir de ces seules pièces.


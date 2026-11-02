# Mission 001 — Référentiel des fonds IGN

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026 avec `/imperatrice:mission`.
> **Statut : proposée, à valider par Pascal (porte n° 2).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Établir les URL XYZ exactes de Plan IGN v2 et BD ORTHO sur data.geopf.fr (zoom maximal, en-têtes de cache, licence et attribution), pour que le projet modèle affiche un fond juste et sache combien de temps il tient hors ligne.

**Redite par l'agent :** _à compléter par l'agent avant d'agir — s'il n'y arrive pas, il s'arrête._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | oui — GetCapabilities de data.geopf.fr, ADR 0002, spec § 3.4 | confier |
| A-t-il les moyens ? (outils, données d'essai, tests) | oui — réseau vers data.geopf.fr à confirmer en première tâche ; sinon l'agent le dit et s'arrête | confier |

**Temps de la main :** appuyer — référentiel public, sans décision d'architecture.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `acquereur`
- **Modèle :** sonnet
- **Ce qui ne lui est pas demandé :** choisir les fonds, écrire le projet modèle.

## Harnais

- **Peut :** lire GetCapabilities et les en-têtes HTTP, écrire `docs/referentiels/fonds-ign.md`.
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md` ou une ADR (il signale l'écart à
  l'orchestrateur), effacer une ligne de `pilotage/journal.md`.
- **Sources autorisées :** `docs/spec.md` § 3.4, ADR 0002, https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetCapabilities.

## Valeur provisoire (chiffre, réglage)

- aucune — la mission mesure le zoom maximal et la durée de cache, elle n'en fixe pas.

## Dépend de / rouge attendu jusqu'à

- aucune.

## Tests

- **Comment saura-t-on que c'est juste :** pour chaque fond : une URL de tuile réelle testée (code HTTP 200, type d'image), zoom maximal tiré de GetCapabilities, en-têtes `Cache-Control` / `Expires` recopiés, source et date de lecture. Commande : `.claude/test-command`.

## Terrain

- **Échantillon que Pascal vérifiera :** Pascal ouvre deux URL de tuiles dans son navigateur et voit une image.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Point de suivi :** à la remise de la PR, puis à la fin du cycle de `/boucle`.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

le fichier donne, pour chaque fond, une URL que l'on colle dans QGIS en couche XYZ et qui s'affiche.

# Mission 001 — Référentiel des fonds IGN

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026 avec `/imperatrice:mission`.
> **Statut : validée par Pascal le 2 novembre 2026 (porte n° 2) ; scindée le même jour (mesure → 019).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Établir les URL XYZ exactes de Plan IGN v2 et BD ORTHO sur data.geopf.fr (zoom maximal, en-têtes de cache, licence et attribution), pour que le projet modèle affiche un fond juste et sache combien de temps il tient hors ligne.

**Redite par l'agent :** Je lis les pièces mesurées par la mission 019 (`docs/referentiels/brut/`) et j'en tire, pour Plan IGN v2 et BD ORTHO, l'URL XYZ, le zoom maximal, la durée de cache, la licence et l'attribution, afin que Pascal décide des fonds du projet modèle (URL, zoom max, « © IGN », et si le fond tient hors ligne jusqu'à J+2 ou s'il faut préparer le fond embarqué) sur des valeurs sourcées et non supposées.

## Transmis par la relecture de la mission 019 (2 novembre 2026)

- Dans le GetCapabilities, les deux couches renvoient au jeu de matrices `PM_0_19`
  (zooms 0 à 19), alors que le gabarit de l'ADR 0002 demande `TILEMATRIXSET=PM` ; le
  serveur accepte `PM` (HTTP 200). À interpréter.
- La première ligne des fichiers `*.entetes.txt` (`HTTP/1.1 200 Connection Established`)
  et l'en-tête `x-iplb-request-id` viennent du proxy de la session : la réponse de l'IGN
  commence à `HTTP/2 200`.
- `cache-control: private, max-age=1814400` (21 jours) sur les deux tuiles, pas
  d'`expires`.
- Licence et attribution : à lire dans le XML ; dire aussi si les pièces versées dans
  `brut/` demandent une mention de source et de licence.

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | oui — GetCapabilities de data.geopf.fr, ADR 0002, spec § 3.4 | confier |
| A-t-il les moyens ? (outils, données d'essai, tests) | oui, après la mission 019 — l'`acquereur` n'a ni Bash ni accès web à data.geopf.fr : il lit les pièces de `docs/referentiels/brut/` | confier après 019 |

**Temps de la main :** appuyer — référentiel public, sans décision d'architecture.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `acquereur`
- **Modèle :** sonnet
- **Ce qui ne lui est pas demandé :** choisir les fonds, écrire le projet modèle.

## Harnais

- **Peut :** lire les pièces de `docs/referentiels/brut/` (mission 019), écrire `docs/referentiels/fonds-ign.md`.
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md` ou une ADR (il signale l'écart à
  l'orchestrateur), effacer une ligne de `pilotage/journal.md`.
- **Sources autorisées :** `docs/spec.md` § 3.4, ADR 0002, https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetCapabilities.

## Valeur provisoire (chiffre, réglage)

- aucune — la mission mesure le zoom maximal et la durée de cache, elle n'en fixe pas.

## Dépend de / rouge attendu jusqu'à

- 019 (pièces mesurées) ; ordre de fusion 019 → 001.

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

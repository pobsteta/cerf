# Mission 024 — Lecture des Shapefile, GeoPackage et GeoTIFF du zip

> Fiche rédigée par Claude (orchestrateur) le 4 novembre 2026, après la relecture de la 012
> et la décision de Pascal (« nouvelle mission »). **Statut : à valider par Pascal
> (porte n° 2)**, après le prototype n° 2 (023), qui dira ce que QField lit dans un zip.

## Mission

**En une phrase (quoi, et pourquoi) :** Faire lire au plugin, dans le zip, les Shapefile complets, les tables de GeoPackage et les GeoTIFF (aujourd'hui seuls les GeoJSON sont pris), pour que le zip Serre_EA2026 (FRT en Shapefile) et le zip piège passent entiers par les contrôles et les styles.

**Redite par l'agent :** _à remplir par l'agent avant de commencer._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? | en partie — résultat du prototype n° 2 attendu (lecture par `/vsizip/`, `crs`, `extent`, `featureCount`) | après la 023 |
| A-t-il les moyens ? | oui — zips de recette de la 016 | confier |

**Temps de la main :** appuyer (testeur puis dev, une branche, une PR).

## L'Homme

- **Agents :** `testeur` (sonnet) puis `dev` (sonnet).

## Dépend de / rouge attendu jusqu'à

- 023 (prototype n° 2), 010, 012 fusionnées ; CI rouge attendue sur les tests du testeur jusqu'au commit du dev.

## Terrain

- **Échantillon que Pascal vérifiera :** le zip `piege` entier (5 pièges, un message clair par piège) et `Serre_EA2026` sur le Samsung.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal. 3 allers-retours. **Qui tranche :** Pascal.

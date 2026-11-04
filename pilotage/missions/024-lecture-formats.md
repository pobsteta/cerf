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

## Précisions après l'ADR 0008 (4 novembre 2026)

**Statut : validée par Pascal le 4 novembre 2026** (« lance les trois points »). Les couches
Shapefile et les tables de GeoPackage reconnues par `couchesDuZip` passent par la voie de l'ADR
0008 posée par la 010 (contrôle en `/vsizip/`, réécriture par `saveVectorLayerAs`, `.qml` voisin,
chargement) ; les GeoTIFF sont contrôlés et chargés en `/vsizip/` (`loadRasterLayer`), style par
défaut. Le testeur écrit les tests d'abord (branche `mission/024-lecture-formats`) ; le dev part
après la fusion de la 010.

## Décisions techniques de l'orchestrateur (4 novembre 2026, après la relecture n° 2 des tests)

- **Rouge annoncé en plus des tests du testeur :** le code du dev cassera 14 tests existants
  (3 sur la forme des entrées : `plugin-styles`, `plugin`, `squelette` « seul le GeoJSON » ;
  11 du squelette parce que `essai.zip` contient le Shapefile complet `sous-dossier/shape_essai.*`).
  **Le dev les adapte** (attendre aussi `shape_essai`, accepter les champs `format` et `nom`), sans
  en affaiblir aucun ; le relecteur compare avant et après. `essai.zip` n'est pas modifié.
- **Un seul vocabulaire de formats :** `geojson`, `shp`, `gpkg`, `tif`, celui de la 012
  (`cerf-controles`) et de `decrireEntree` (010).
- **GeoPackage aux tables inconnues (`table: null`) :** refusé avec un message qui commence par le
  nom du fichier, sans ouverture ni chargement ; jamais chargé sur sa première table.
- **En attente de Pascal :** nom affiché d'une couche rangée dans un dossier du zip ; GeoPackage
  sans aucune table vecteur (`[]`) : message ou silence ; texte du refus ; manière de lire les tables
  d'un `.gpkg` hors ligne (technique : prototype ou fiche 027).

## Arbitrages de Pascal (4 novembre 2026, « oui à tout »)

- Nom affiché d'une couche rangée dans un dossier du zip : **chemin complet dans le zip**
  (ex. `Serre EA/réf/Parcelles.shp`, `d/Serre.gpkg/Releves`).
- GeoPackage sans aucune table vecteur (`[]`) : **un message**, jamais le silence.
- Refus d'un GeoPackage aux tables illisibles : « `Serre.gpkg : tables illisibles, couche non
  chargée` » (avec le nom tel qu'il est dans le zip).
- Lecture des tables hors ligne : la fiche 027 ne répond pas ; **prototype n° 4 (mission 030)**.
  Le dev de la 024 part après la 010 et la 030.
- Note (relecture du 4 novembre) : le cas `[]` n'est pas testé dans `importerZip` tant que le
  service de lecture des tables (mission 030) n'existe pas ; il le sera avec le dev de la 024.
- Le chemin complet vaut pour **tous** les messages du § 4 (contrôles et avertissements), pas
  seulement pour le refus d'un GeoPackage : lecture de l'orchestrateur de l'arbitrage de Pascal, à
  confirmer par lui.
- **Confirmé par Pascal (4 novembre) :** chemin complet pour tous les messages du § 4 ;
  GeoPackage sans table vecteur : « `Serre.gpkg : aucune table vecteur, couche non chargée` »
  (distinct de « tables illisibles »).

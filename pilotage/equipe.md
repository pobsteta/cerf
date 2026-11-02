# Équipe de Cerf

> Produit par l'orchestrateur avec `/imperatrice:mission`, **validé par Pascal** avant
> tout démarrage. Règle de staffing : un agent par mission qui passe les trois
> questions, jamais un agent « par principe ».

- **Statut :** **validée** le 2 novembre 2026 (porte n° 2)
- **Validée par :** Pascal

## Plafond humain

- **PR ouvertes en même temps, au plus :** 3
- **Rythme de relecture de Pascal :** à fixer par Pascal

## Le vivier (catalogue, pas une équipe)

| Agent | A / plan | Modèle | Écrit du code ? |
|---|---|---|---|
| `contradicteur` | Abstraction · Polos | opus | non |
| `acquereur` | Acquisition · Ponos | sonnet | non (référentiels et données) |
| `archiviste` | Archivage · Pontos | sonnet | non (docs) |
| `analyste` | Analyse · Ponos | sonnet | non |
| `afficheur` | Affichage · Ponos | sonnet | oui (interface) |
| `dev` | réalisation · Ponos | sonnet | oui |
| `testeur` | réalisation · Ponos | sonnet | oui (tests) |
| `relecteur` | contrôle · C3 | opus | non (lecture seule) |

## Missions

| Mission | Agent | Modèle | Temps de la main | Les 3 questions | Cycle |
|---|---|---|---|---|---|
| [019 Mesure des fonds IGN](missions/019-mesure-fonds-ign.md) | `dev` | sonnet | appuyer | oui/oui/oui | 2 |
| [001 Référentiel des fonds IGN](missions/001-fonds-ign.md) | `acquereur` | sonnet | appuyer | oui/oui/oui (après 019) | 3 |
| [002 Emprise de la France métropolitaine en Lambert 93](missions/002-emprise-metropole.md) | `dev` | sonnet | appuyer | oui/oui/oui | 2 |
| [003 Protocole d'essai du prototype n° 1](missions/003-protocole-prototype.md) | `testeur` | sonnet | appuyer | oui/oui/oui | 1 |
| [004 Prototype n° 1 : ce que QField permet à un plugin](missions/004-prototype-1.md) | `dev` | opus | tenir | oui/partiel/partiel | 2 |
| [005 Tests du projet modèle](missions/005-tests-projet-modele.md) | `testeur` | sonnet | appuyer | oui/oui/oui | 2 |
| [006 Projet modèle cerf.qgz](missions/006-projet-modele.md) | `dev` | sonnet | tenir | oui/oui/partiel | 2 |
| [007 Tests du squelette du plugin](missions/007-tests-squelette.md) | `testeur` | sonnet | appuyer | oui/oui/oui | 3 |
| [008 Squelette du plugin : un parcours complet, minimal](missions/008-squelette-plugin.md) | `dev` | opus | tenir | oui/oui/oui | 3 |
| [009 Tests des règles de style](missions/009-tests-styles.md) | `testeur` | sonnet | appuyer | oui/oui/oui | 4 |
| [010 Styles du manuel](missions/010-styles.md) | `dev` | sonnet | appuyer | oui/oui/oui | 4 |
| [011 Tests des contrôles d'import](missions/011-tests-controles.md) | `testeur` | sonnet | appuyer | oui/oui/oui | 4 |
| [012 Contrôles d'import](missions/012-controles.md) | `dev` | opus | tenir | oui/oui/oui | 5 |
| [013 Tests du registre complet](missions/013-tests-registre.md) | `testeur` | sonnet | appuyer | oui/oui/oui | 5 |
| [014 Registre complet](missions/014-registre.md) | `dev` | sonnet | appuyer | oui/oui/oui | 6 |
| [015 Panneau du plugin pour gants et soleil](missions/015-panneau-plugin.md) | `afficheur` | sonnet | appuyer | oui/oui/oui | 6 |
| [016 Zips de recette piege et lourd](missions/016-zips-recette.md) | `testeur` | sonnet | appuyer | oui/oui/partiel | 3 |
| [017 Convention du zip](missions/017-convention-zip.md) | `archiviste` | sonnet | appuyer | oui/oui/oui | 5 |
| [018 Notice de JFC](missions/018-notice-jfc.md) | `archiviste` | sonnet | tenir | oui/non/non | en attente |

Cycle = cycle de `/boucle` prévu, sous le plafond de 3 PR ouvertes. Agents mobilisés : `acquereur`, `testeur`, `dev`, `afficheur`, `archiviste`, `relecteur` (chaque PR). Ni `analyste` (pas encore d'échecs à compter) ni `contradicteur` (déjà passé sur brief, spec et ADR ; rappelé pour toute nouvelle ADR).

# Mission 050 — Cerf devient Vision

> Fiche rédigée par Claude (orchestrateur) le 5 novembre 2026, à la demande de Pascal (« je veux
> changer le nom du projet "cerf" en "vision" et faire disparaître le nom cerf du projet »).
> **Statut : validée par Pascal le 5 novembre 2026.** Dépôt GitHub déjà renommé par Pascal :
> `pobsteta/cerf` → `pobsteta/vision`.

## Décisions de Pascal (5 novembre 2026)

1. **Pas de migration** : seul le Samsung de Pascal est équipé ; on **réinstalle proprement**
   (nouveau projet `vision.qgz`, nouveau plugin, zips réimportés). Le plugin ne lit pas les anciens
   noms (`cerf_id`, `cerf-imports/`, marques `cerf/…`).
2. **Tout renommer**, noms internes compris. Seul l'**historique** garde « cerf » : journal (ajout
   seul), fiches de mission passées, ADR passées dans leur texte d'origine, commits, anciennes
   releases et leurs étiquettes.
3. **Nouveaux noms** : projet `vision.qgz` ; variable de projet `vision_id` ; dossier
   `vision-imports/` ; marques `vision/zip`, `vision/couche`, `vision/fond` ; plugin `Vision.qml`,
   `vision-logique.mjs`, `vision-controles.mjs`, `vision-styles.mjs`, zip `plugin-vision.zip` ;
   panneau « Vision » ; zips de release `projet-vision.zip`, `projet-vision-mise-a-jour.zip` ;
   adresses `https://github.com/pobsteta/vision/...`.

## Mission

**En une phrase :** Remplacer partout « cerf » / « Cerf » par « vision » / « Vision » (fichiers,
identifiants, textes, adresses, flashcodes, workflows, tests, documentation, `CLAUDE.md`), sauf
l'historique, pour qu'un successeur ne trouve plus « cerf » que dans le passé daté.

### Étape 1 — `dev` : code, outils, workflows, tests, projet

- Renommer fichiers et identifiants (`git mv`), `plugin/metadata.txt` (nom « Vision »), version du
  plugin **0.5.0** (rupture) ; `outils/` (projet modèle → `vision.qgz`, `vision_id` : nouvel UUID
  figé et dit, flashcodes et adresses `pobsteta/vision`) ; workflows `.github/workflows/`
  (noms d'actifs, adresses ; nettoyer les déclencheurs des branches de mission passées) ;
  `vision.qgz` et `saisie.gpkg` régénérés ; tests adaptés **sans affaiblissement** (seuls les noms
  changent) ; dossier `prototype/` : à renommer aussi ou à marquer « historique » (proposer).
- Un test de garde : aucun « cerf » (casse ignorée) hors des chemins d'historique listés.

### Étape 2 — `archiviste` : documentation

`README.md`, `docs/brief.md`, `docs/spec.md`, `docs/referentiels/`, `CLAUDE.md`,
`pilotage/equipe.md`, `pilotage/kanban.md` (libellés courants), `plugin/PLAN.md` : « Vision » ;
**ajout daté** « Cerf devient Vision » à une ADR nouvelle `docs/adr/0009-cerf-devient-vision.md`
(décision, conséquences : réinstallation, anciennes adresses redirigées par GitHub, historique
gardé) ; ADR passées : texte d'origine gardé, une note datée en tête si utile.

## Terrain

Sur le Samsung : désinstaller le plugin Cerf, supprimer le projet `cerf` ; installer `vision.qgz`
(première installation) et `plugin-vision.zip` (0.5.0) ; réimporter `essai-manuel.zip` : 4 couches,
couleurs du manuel, panneau « Vision », dossier `vision-imports/`.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal. **Qui tranche :** Pascal.

**Redite par l'agent :** l'étape 1 renomme Cerf en Vision dans le code, les outils, les workflows, les tests et le projet modèle (nouveaux noms, nouvel identifiant, version 0.5.0, sans migration), et pose un test de garde qui interdit l'ancien nom hors historique, pour que seul le passé daté le garde.

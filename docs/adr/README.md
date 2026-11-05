# Index des décisions d'architecture (ADR)

> Index établi le 5 novembre 2026 (mission 051). Un ADR n'est jamais effacé : une décision qui change
> reçoit un amendement daté dans le fichier concerné, ou une nouvelle ADR qui le dit en tête. Chaque
> fichier reste la source ; cet index ne fait que les ranger. **À mettre à jour à chaque nouvelle ADR
> ou amendement** (propriétaire : `archiviste`).
> Les titres des ADR 0001 à 0008 portent le nom d'origine du projet quand ils le citent (ADR 0009) : ils
> ne sont pas retouchés.

| N° | Titre | Statut | Date | Amendements (avec date) |
|---|---|---|---|---|
| [0001](0001-plugin-qfield-application.md) | Projet modèle QGIS et plugin QField d'application | acceptée par Pascal (porte n° 1) | 2 novembre 2026 | aucun ; critique du `contradicteur` reportée |
| [0002](0002-fonds-ign-xyz.md) | Fonds IGN en XYZ, fond embarqué en repli | acceptée par Pascal (porte n° 1) | 2 novembre 2026 | 2 novembre 2026 (mission 001) ; 5 novembre 2026 (mission 045, fonds non IGN) |
| [0003](0003-zip-et-registre.md) | Lecture dans le zip et registre des couches | acceptée par Pascal (porte n° 1) ; amendée par l'ADR 0008 | 2 novembre 2026 | 3 novembre 2026 (résultat du prototype n° 1, puis repli appliqué) ; 4 novembre 2026 (amendée par l'ADR 0008) |
| [0004](0004-controle-vraisemblance.md) | Contrôle de vraisemblance des coordonnées | acceptée par Pascal (porte n° 1) | 2 novembre 2026 | aucun |
| [0005](0005-stack-de-tests.md) | Stack de tests | acceptée par Pascal | 2 novembre 2026 | 3 novembre 2026 (confirmation par le prototype n° 1) |
| [0006](0006-licence.md) | titre reformulé (voir le fichier) | acceptée par Pascal | 2 novembre 2026 | aucun |
| [0007](0007-effacement-rmfile.md) | Effacer les copies de zip par `platformUtilities.rmFile` | acceptée par Pascal ; amendée par l'ADR 0008 ; critique du `contradicteur` à faire | 3 novembre 2026 | 4 novembre 2026 (amendée par l'ADR 0008) |
| [0008](0008-couches-sorties-du-zip.md) | Couches sorties du zip, avec leur style écrit à côté | acceptée par Pascal (voie `saveVectorLayerAs`) ; amende l'ADR 0003 | 4 novembre 2026 | 4 novembre 2026 (critique et arbitrages, décision finale, note datée) ; 5 novembre 2026 (note) |
| 0009 (fichier `0009-…` de ce dossier) | titre reformulé (voir le fichier) | décidée par Pascal (mission 050) | 5 novembre 2026 | aucun ; n'amende aucune ADR |

## Ce que l'index ne dit pas

- Les décisions de Pascal qui ne sont pas des décisions d'architecture (périmètre, plafonds, arbitrages de
  la critique de la spec) sont dans `docs/spec.md` § 9 et dans `pilotage/journal.md`.
- Le statut « acceptée » est celui écrit dans l'en-tête de chaque ADR à la date de cet index ; en cas de
  désaccord, l'en-tête du fichier fait foi.

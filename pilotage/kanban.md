# Kanban de Cerf

> Cinq colonnes (fiche n° 8). Chaque carte porte l'Homme (qui), la Mission (quoi, quand,
> combien) et les Moyens (comment, où, avec qui), et renvoie à sa fiche dans
> `pilotage/missions/`. Elle note aussi depuis quel cycle de `/boucle` elle est dans sa
> colonne ; on change ce numéro chaque fois qu'elle change de colonne.
> **Une carte qui ne bouge pas est souvent la mauvaise nouvelle à dire tout de suite.**

**Dernier cycle :** 3 _(augmenté de 1 à la fin de chaque `/boucle`, même quand elle n'a
rien lancé. Une carte est immobile quand dernier cycle − N ≥ 2.)_

_Modèle de carte :_

```
- [NNN-titre](missions/NNN-titre.md) · depuis le cycle N
  - Homme : qui
  - Mission : quoi, quand, combien
  - Moyens : comment, où, avec qui
```

## Bac à sable

- [018-notice-jfc](missions/018-notice-jfc.md) · depuis le cycle 0 · en attente : Relevés et Canopée bruts, GeoJSON `_DE`
  - Homme : `archiviste` (sonnet)
  - Mission : Notice de JFC — cycle prévu en attente
  - Moyens : convention 017, fichiers bruts de JFC

## Validé

- [004-prototype-1](missions/004-prototype-1.md) · depuis le cycle 0
  - Homme : `dev` (opus)
  - Mission : Prototype n° 1 : ce que QField permet à un plugin — cycle prévu 2
  - Moyens : ADR 0001, 0003, 0005 
- [005-tests-projet-modele](missions/005-tests-projet-modele.md) · depuis le cycle 0
  - Homme : `testeur` (sonnet)
  - Mission : Tests du projet modèle — cycle prévu 2
  - Moyens : `docs/spec.md` § 2, § 3.3, § 3.4 
- [006-projet-modele](missions/006-projet-modele.md) · depuis le cycle 0
  - Homme : `dev` (sonnet)
  - Mission : Projet modèle cerf.qgz — cycle prévu 2
  - Moyens : référentiel 001, ADR 0002, spec § 2 et § 3.3
- [007-tests-squelette](missions/007-tests-squelette.md) · depuis le cycle 0
  - Homme : `testeur` (sonnet)
  - Mission : Tests du squelette du plugin — cycle prévu 3
  - Moyens : `docs/spec.md` § 1, § 3.3, § 6 
- [008-squelette-plugin](missions/008-squelette-plugin.md) · depuis le cycle 0
  - Homme : `dev` (opus)
  - Mission : Squelette du plugin : un parcours complet, minimal — cycle prévu 3
  - Moyens : ADR 0001, 0003, 0005, 0006 
- [009-tests-styles](missions/009-tests-styles.md) · depuis le cycle 0
  - Homme : `testeur` (sonnet)
  - Mission : Tests des règles de style — cycle prévu 4
  - Moyens : `docs/spec.md` § 5
- [010-styles](missions/010-styles.md) · depuis le cycle 0
  - Homme : `dev` (sonnet)
  - Mission : Styles du manuel — cycle prévu 4
  - Moyens : `docs/spec.md` § 5
- [011-tests-controles](missions/011-tests-controles.md) · depuis le cycle 0
  - Homme : `testeur` (sonnet)
  - Mission : Tests des contrôles d'import — cycle prévu 4
  - Moyens : `docs/spec.md` § 4, ADR 0004, référentiel 002
- [012-controles](missions/012-controles.md) · depuis le cycle 0
  - Homme : `dev` (opus)
  - Mission : Contrôles d'import — cycle prévu 5
  - Moyens : `docs/spec.md` § 4, ADR 0004, référentiel 002
- [013-tests-registre](missions/013-tests-registre.md) · depuis le cycle 0
  - Homme : `testeur` (sonnet)
  - Mission : Tests du registre complet — cycle prévu 5
  - Moyens : `docs/spec.md` § 3.3, § 9 
- [014-registre](missions/014-registre.md) · depuis le cycle 0
  - Homme : `dev` (sonnet)
  - Mission : Registre complet — cycle prévu 6
  - Moyens : `docs/spec.md` § 3.3, ADR 0003
- [015-panneau-plugin](missions/015-panneau-plugin.md) · depuis le cycle 0
  - Homme : `afficheur` (sonnet)
  - Mission : Panneau du plugin pour gants et soleil — cycle prévu 6
  - Moyens : `docs/spec.md` § 1 et § 4
- [016-zips-recette](missions/016-zips-recette.md) · depuis le cycle 0
  - Homme : `testeur` (sonnet)
  - Mission : Zips de recette piege et lourd — cycle prévu 3
  - Moyens : `docs/spec.md` § 6
- [017-convention-zip](missions/017-convention-zip.md) · depuis le cycle 0
  - Homme : `archiviste` (sonnet)
  - Mission : Convention du zip — cycle prévu 5
  - Moyens : `docs/spec.md` § 3.1, § 4, § 5

## Planifié

## Terminé

- [001-fonds-ign](missions/001-fonds-ign.md) · depuis le cycle 3 · relue « prêt » (aller-retour 1/3), PR #5
  - Homme : `acquereur` (sonnet)
  - Mission : Référentiel des fonds IGN — cycle prévu 1
  - Moyens : `docs/spec.md` § 3.4, ADR 0002, https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetCapabilities

- [003-protocole-prototype](missions/003-protocole-prototype.md) · depuis le cycle 2 · relue « prêt », PR #4 à relire par Pascal
  - Homme : `testeur` (sonnet)
  - Mission : Protocole d'essai du prototype n° 1 — cycle prévu 1
  - Moyens : `docs/spec.md`, ADR 0003, ADR 0005, `pilotage/journal.md` (critique du 2 novembre)



- [002-emprise-metropole](missions/002-emprise-metropole.md) · depuis le cycle 2 · PR #3 fusionnée
  - Homme : `dev` (sonnet)
  - Mission : Emprise de la France métropolitaine en Lambert 93 — cycle prévu 1
  - Moyens : `docs/spec.md` § 4, ADR 0004

- [019-mesure-fonds-ign](missions/019-mesure-fonds-ign.md) · depuis le cycle 2 · PR #2 fusionnée
  - Homme : `dev` (sonnet)
  - Mission : Mesure des fonds IGN — cycle prévu 2
  - Moyens : Bash, curl, data.geopf.fr ouvert

## Abandonné

_Avec la raison, en une ligne._

## Livraisons

_Une ligne par cycle, ajoutée sous la précédente à la fin de chaque `/boucle`, et une
par `/bilan` : la livraison que Pascal a retenue, pour qui, et ce qu'elle apporte de plus
que la précédente du même rythme. Un cycle sans livraison neuve livre sa mauvaise
nouvelle, car
« une mauvaise nouvelle est une livraison sur laquelle on apprend » (Pascal) : on
l'inscrit avec ce qu'elle nous apprend._

```
- cycle N · livraison · pour qui · ce qu'elle apporte de plus que la précédente
- cycle N · mauvaise nouvelle : … · pour qui · ce qu'elle nous apprend
- bilan du AAAA-MM-JJ · livraison · pour qui · ce qu'elle apporte de plus que la précédente
- bilan du AAAA-MM-JJ · mauvaise nouvelle : … · pour qui · ce qu'elle nous apprend
```

- cycle 1 · mauvaise nouvelle : deux missions sur trois (001, 002) sans moyens, faute d'avoir vérifié les outils des agents et le réseau à la porte n° 2 · pour Pascal · elle nous apprend qu'à la porte n° 2, la troisième question se vérifie par un essai (outils de l'agent, domaine joignable)
- cycle 2 · mauvaise nouvelle : trois missions prêtes (019, 002, 003) mais aucune fusionnée ; le goulet est la relecture, pas la production · pour Pascal · elle nous apprend « le rythme avant l'ambition » : réduire la voilure et faire relire avant de produire
- cycle 3 · livraison : les deux URL XYZ vérifiées des fonds IGN (Plan IGN v2, BD ORTHO, zoom maximal 19, `docs/referentiels/fonds-ign.md`), à coller à la main dans QField · pour JFC · premier élément du brief qu'un agent de terrain peut prendre en main : les fonds IGN en flux, sans les 700 Mo de fonds embarqués

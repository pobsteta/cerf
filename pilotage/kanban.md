# Kanban de Vision

> Cinq colonnes (fiche n° 8). Chaque carte porte l'Homme (qui), la Mission (quoi, quand,
> combien) et les Moyens (comment, où, avec qui), et renvoie à sa fiche dans
> `pilotage/missions/`. Elle note aussi depuis quel cycle de `/boucle` elle est dans sa
> colonne ; on change ce numéro chaque fois qu'elle change de colonne.
> **Une carte qui ne bouge pas est souvent la mauvaise nouvelle à dire tout de suite.**
>
> **Vérification du 5 novembre 2026 (mission 051, archiviste)** : les cartes 012 à 015, 017, 020 à 025 et 027 à 030
> ont été reprises une à une contre le journal et les fiches ; la source qui justifie la colonne est écrite sur
> chaque carte concernée. Les questions ouvertes sont rangées dans `docs/spec.md` § 11.

**Dernier cycle :** 6 _(augmenté de 1 à la fin de chaque `/boucle`, même quand elle n'a
rien lancé. Une carte est immobile quand dernier cycle − N ≥ 2.)_

_Modèle de carte :_

```
- [NNN-titre](missions/NNN-titre.md) · depuis le cycle N
  - Homme : qui
  - Mission : quoi, quand, combien
  - Moyens : comment, où, avec qui
```

## Bac à sable

- [018-notice-jfc](missions/018-notice-jfc.md) · depuis le cycle 0 · en attente : Relevés et Canopée bruts, GeoJSON `_DE` (journal du 2 novembre : moyens manquants ; aucune ligne depuis, vérifié le 5 novembre)
  - Homme : `archiviste` (sonnet)
  - Mission : Notice de JFC — cycle prévu en attente
  - Moyens : convention 017, fichiers bruts de JFC

## Validé

- [013-tests-registre](missions/013-tests-registre.md) · depuis le cycle 0 ; **à trancher par Pascal** (spec § 11 n° 3) ; journal du 4 novembre : « immobile depuis le cycle 0 », aucune PR
  - Homme : `testeur` (sonnet)
  - Mission : Tests du registre complet — cycle prévu 5
  - Moyens : `docs/spec.md` § 3.3, § 9 
- [014-registre](missions/014-registre.md) · depuis le cycle 0 ; **à trancher par Pascal** (spec § 11 n° 2) : dossier vide et remplacement au réimport, question ouverte de l'ADR 0007 amendée ; aucune PR
  - Homme : `dev` (sonnet)
  - Mission : Registre complet — cycle prévu 6
  - Moyens : `docs/spec.md` § 3.3, ADR 0003
- [015-panneau-plugin](missions/015-panneau-plugin.md) · depuis le cycle 0 ; **à trancher par Pascal** (spec § 11 n° 4) ; aucune PR, le panneau existe pourtant (`plugin/Panneau.qml`)
  - Homme : `afficheur` (sonnet)
  - Mission : Panneau du plugin pour gants et soleil — cycle prévu 6
  - Moyens : `docs/spec.md` § 1 et § 4
- [017-convention-zip](missions/017-convention-zip.md) · depuis le cycle 0 ; **à trancher par Pascal** (spec § 11 n° 5) ; aucune PR, contenu réparti dans spec § 3.1, § 4, § 5 et README
  - Homme : `archiviste` (sonnet)
  - Mission : Convention du zip — cycle prévu 5
  - Moyens : `docs/spec.md` § 3.1, § 4, § 5

## Planifié

## Terminé

- [030-prototype-4-tables](missions/030-prototype-4-tables.md) · depuis le cycle 6 · **close par Pascal le 6 novembre 2026** ; prototype n° 4 (cbd1f1f, branche `mission/023-prototype-2`, non fusionnée), voie reprise par la 024 ; essai propre non rapporté
  - Homme : `dev` (opus)
- [051-memoire](missions/051-memoire.md) · depuis le bilan n° 1 · fusionnée (PR #55)
  - Homme : `archiviste`
- [050-vision](missions/050-vision.md) · depuis le cycle 6 · fusionnée (PR #51)
  - Homme : `dev` puis `archiviste`
- [049-fuite-couches](missions/049-fuite-couches.md) · depuis le cycle 6 · fusionnée (PR #50)
  - Homme : `dev`
- [048-fond-embarque-plugin](missions/048-fond-embarque-plugin.md) · depuis le cycle 6 · fusionnée (PR #49)
  - Homme : `dev`
- [047-styles-gpkg](missions/047-styles-gpkg.md) · depuis le cycle 6 · fusionnée (PR #47)
- [046-fond-embarque-qfieldsync](missions/046-fond-embarque-qfieldsync.md) · depuis le cycle 6 · fusionnée (PR #48)
- [045-fonds-osm-cadastre](missions/045-fonds-osm-cadastre.md) · depuis le cycle 6 · fusionnée (PR #46)
- [044-json-ignore](missions/044-json-ignore.md) · depuis le cycle 6 · fusionnée (PR #45)
  - Homme : `dev` (sonnet)
- [043-flashcodes-readme](missions/043-flashcodes-readme.md) · depuis le cycle 6 · fusionnée (PR #44)
  - Homme : `archiviste`
- [042-qml-json-docs](missions/042-qml-json-docs.md) · depuis le cycle 6 · fusionnée (PR #43)
  - Homme : `archiviste`
- [041-spec-readme-024](missions/041-spec-readme-024.md) · depuis le cycle 6 · fusionnée (PR #42)
  - Homme : `archiviste`
- [040-publier-piege](missions/040-publier-piege.md) · depuis le cycle 6 · fusionnée (PR #39)
  - Homme : `dev` (sonnet)
  - Mission : Publier piege.zip dans la préversion essai-manuel
  - Moyens : outils/zips-recette.mjs, release-essai-manuel.yml
- [039-readme](missions/039-readme.md) · depuis le cycle 6 · fusionnée (PR #37)
  - Homme : `archiviste` (sonnet)
  - Mission : README : installer le projet, le plugin, et charger un zip
  - Moyens : spec, releases, journal
- [024-lecture-formats](missions/024-lecture-formats.md) · depuis le cycle 6 · fusionnée (PR #38), plugin 0.4.0 (journal du 4 novembre, l. 323 et 326 ; fusion demandée le 5 novembre, l. 327)
  - Homme : `testeur` puis `dev` (sonnet)
  - Mission : Lecture des Shapefile, GeoPackage et GeoTIFF du zip
  - Moyens : prototype n° 2, zips de recette

- [038-compter-entites](missions/038-compter-entites.md) · depuis le cycle 6 · fusionnée (PR #35), plugin 0.3.4
  - Homme : `dev` (sonnet)
  - Mission : Compter les entités par un itérateur (plugin 0.3.4)
  - Moyens : prototype n° 2 (createFeatureIterator), Vision.qml
- [037-reprojection](missions/037-reprojection.md) · depuis le cycle 6 · fusionnée (PR #34), plugin 0.3.3
  - Homme : `dev` (sonnet)
  - Mission : Reprojection de l'emprise depuis un système reconstruit par son nom (plugin 0.3.3)
  - Moyens : prototype n° 2 (reprojection prouvée), Vision.qml
- [036-notes-essai-manuel](missions/036-notes-essai-manuel.md) · depuis le cycle 6 · fusionnée (PR #32)
  - Homme : `dev` (sonnet)
  - Mission : Notes de la préversion essai-manuel : plugin 0.3.2 ou plus
  - Moyens : workflow release-essai-manuel.yml
- [035-essai-manuel-geojson](missions/035-essai-manuel-geojson.md) · depuis le cycle 6 · fusionnée (PR #29)
  - Homme : `dev` (sonnet)
  - Mission : Zip de démonstration tout en GeoJSON
  - Moyens : outil de la mission 033
- [034-crs-valide](missions/034-crs-valide.md) · depuis le cycle 6 · fusionnée (PR #30), plugin 0.3.2
  - Homme : `dev` (sonnet)
  - Mission : Système de coordonnées jugé valide d'après ce que QML voit (plugin 0.3.2)
  - Moyens : sources de QGIS 3a92eb3, Vision.qml
- [033-essai-manuel](missions/033-essai-manuel.md) · depuis le cycle 6 · fusionnée (PR #27)
  - Homme : `dev` (sonnet)
  - Mission : Zip de démonstration aux noms du manuel
  - Moyens : spec § 5, outils de zips de recette
- [031-nettoyage-retrait](missions/031-nettoyage-retrait.md) · depuis le cycle 6 · fusionnée (PR #26), plugin 0.3.1
  - Homme : `testeur` puis `dev` (sonnet)
  - Mission : Effacer au retrait les fichiers réécrits d'une couche
  - Moyens : ADR 0007 amendée, ADR 0008, fiche 027 (P3-5)
- [032-spec-messages](missions/032-spec-messages.md) · depuis le cycle 6 · fusionnée (PR #24)
  - Homme : `archiviste` (sonnet)
  - Mission : Spec § 4 et ADR 0008 : messages au chemin complet, GeoPackage, ancien .qml
  - Moyens : arbitrages du 4 novembre, code de la 010, tests de la 024
- [009-tests-styles](missions/009-tests-styles.md) · depuis le cycle 6 · fusionnée (PR #18)
  - Homme : `testeur` (sonnet)
  - Mission : Tests des règles de style — cycle prévu 4
  - Moyens : `docs/spec.md` § 5

- [010-styles](missions/010-styles.md) · depuis le cycle 0 · fusionnée (PR #18), plugin 0.3.0
  - Homme : `dev` (sonnet)
  - Mission : Styles du manuel — cycle prévu 4
  - Moyens : `docs/spec.md` § 5
- [029-amendements-adr-0008](missions/029-amendements-adr-0008.md) · depuis le cycle 6 · fusionnée (PR #22) (journal du 4 novembre, l. 258 : 47219ad)
  - Homme : `archiviste` (sonnet)
  - Mission : Amender ADR 0003, ADR 0007 et la spec après l'ADR 0008
  - Moyens : ADR 0008, fiche 010
- [023-prototype-2](missions/023-prototype-2.md) · depuis le cycle 6 · essai réussi sur le Samsung (prototypes n° 2 et n° 3) ; journal du 4 novembre (réponses de Pascal) ; branche `mission/023-prototype-2` non fusionnée, prototype figé (ADR 0009)
  - Homme : `dev` (opus)
  - Mission : Prototype n° 2 : styles par .qml voisin et reprojection depuis QML
  - Moyens : rapport de l'acquéreur du 4 novembre, Samsung de Pascal
- [027-prototype-3](missions/027-prototype-3.md) · depuis le cycle 6 · essai réussi sur le Samsung (journal du 4 novembre : P3-1 à P3-6, voie `saveVectorLayerAs` retenue par l'ADR 0008)
  - Homme : `dev` (opus)
  - Mission : Prototype n° 3 : saveVectorLayerAs puis .qml voisin
  - Moyens : prototype n° 2, sources QField
- [028-noms-des-fichiers](missions/028-noms-des-fichiers.md) · depuis le cycle 6 · PR #21 fusionnée, plugin 0.2.1 (journal du 4 novembre, l. 237 : 21c1a3b)
  - Homme : `dev` (sonnet)
  - Mission : Fichiers publiés nommés plugin-… et projet-…
  - Moyens : workflows de release, flashcodes
- [012-controles](missions/012-controles.md) · depuis le cycle 6 · PR #19 fusionnée, plugin 0.2.0 (journal du 4 novembre, l. 219 : fusion 4464b7f)
  - Homme : `dev` (opus)
  - Mission : Contrôles d'import — cycle prévu 5
  - Moyens : `docs/spec.md` § 4, ADR 0004, référentiel 002
- [011-tests-controles](missions/011-tests-controles.md) · depuis le cycle 6 · PR #19 fusionnée
  - Homme : `testeur` (sonnet)
  - Mission : Tests des contrôles d'import — cycle prévu 4
  - Moyens : `docs/spec.md` § 4, ADR 0004, référentiel 002
- [025-flashcodes](missions/025-flashcodes.md) · depuis le cycle 6 · PR #20 fusionnée, éprouvée sur le Samsung (journal du 4 novembre ; adresses changées par la 028 puis l'ADR 0009)
  - Homme : `dev` (sonnet)
  - Mission : Flashcodes des adresses stables dans les releases
  - Moyens : qrencode dans le workflow, sources QField
- [022-rangement-releases](missions/022-rangement-releases.md) · depuis le cycle 6 · PR #17 fusionnée (journal du 4 novembre, l. 181 : a606432)
  - Homme : `dev` (sonnet)
  - Mission : Rangement des workflows de publication
  - Moyens : workflows de release, relectures de la 021
- [016-zips-recette](missions/016-zips-recette.md) · depuis le cycle 6 · PR #11 fusionnée (zips piege et lourd)
  - Homme : `testeur` (sonnet)
  - Mission : Zips de recette piege et lourd — cycle prévu 3
  - Moyens : `docs/spec.md` § 6
- [020-tests-couche-saisie](missions/020-tests-couche-saisie.md) · depuis le cycle 5 · fusionnée (PR #15), 4 novembre 2026 (journal du 4 novembre, l. 145)
  - Homme : `testeur` (sonnet)
  - Mission : Tests de la couche de saisie du projet modèle
  - Moyens : `docs/spec.md` § 3.5, § 5, § 6 n° 10
- [021-couche-saisie](missions/021-couche-saisie.md) · depuis le cycle 5 · fusionnée (PR #15), 4 novembre 2026 (journal du 4 novembre, l. 145) ; recette § 6 n° 10 à faire
  - Homme : `dev` (opus)
  - Mission : Couche « Saisie terrain » et saisie.gpkg dans le projet modèle
  - Moyens : `outils/projet-modele.mjs`, `node:sqlite`, spec § 3.5
- [007-tests-squelette](missions/007-tests-squelette.md) · depuis le cycle 5 · fusionnée avec la 008 (PR #12, #13), 3 novembre 2026
  - Homme : `testeur` (sonnet)
  - Mission : Tests du squelette du plugin — cycle prévu 3
  - Moyens : `docs/spec.md` § 1, § 3.3, § 6 
- [008-squelette-plugin](missions/008-squelette-plugin.md) · depuis le cycle 5 · fusionnée (PR #13), plugin 0.1.1, 3 novembre 2026
  - Homme : `dev` (opus)
  - Mission : Squelette du plugin : un parcours complet, minimal — cycle prévu 3
  - Moyens : ADR 0001, 0003, 0005, 0006 
- [006-projet-modele](missions/006-projet-modele.md) · depuis le cycle 4 · PR #8 fusionnée ; ouvert dans QField
  - Homme : `dev` (sonnet)
  - Mission : Projet modèle vision.qgz — cycle prévu 2
  - Moyens : référentiel 001, ADR 0002, spec § 2 et § 3.3

- [005-tests-projet-modele](missions/005-tests-projet-modele.md) · depuis le cycle 4 · PR #7 fusionnée (avec #8)
  - Homme : `testeur` (sonnet)
  - Mission : Tests du projet modèle — cycle prévu 2
  - Moyens : `docs/spec.md` § 2, § 3.3, § 3.4 

- [004-prototype-1](missions/004-prototype-1.md) · depuis le cycle 4 · PR #9 fusionnée ; essai réussi sur le Samsung
  - Homme : `dev` (opus)
  - Mission : Prototype n° 1 : ce que QField permet à un plugin — cycle prévu 2
  - Moyens : ADR 0001, 0003, 0005 

- [001-fonds-ign](missions/001-fonds-ign.md) · depuis le cycle 3 · PR #5 fusionnée
  - Homme : `acquereur` (sonnet)
  - Mission : Référentiel des fonds IGN — cycle prévu 1
  - Moyens : `docs/spec.md` § 3.4, ADR 0002, https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetCapabilities

- [003-protocole-prototype](missions/003-protocole-prototype.md) · depuis le cycle 2 · PR #4 fusionnée
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

- [026-inflate](missions/026-inflate.md) · depuis le cycle 6 · abandonnée : saveVectorLayerAs suffit (prototype n° 3)
  - Homme : `testeur` puis `dev` (opus)
  - Mission : Décompresseur deflate en JavaScript pour les zips de JFC
  - Moyens : RFC 1951, node:zlib comme oracle
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
- cycle 4 · livraison : le projet modèle vision.qgz (fonds IGN en flux dans le groupe « Fonds de carte », Lambert 93, vision_id), importable par URL dans QField depuis la release prototype-1 · pour JFC · un projet tout prêt, vu ouvert sur le Samsung de Pascal, au lieu de deux URL à coller à la main
- cycle 5 · livraison : les zips de recette piege et lourd, rejouables par outils/zips-recette.mjs, à ouvrir dans QGIS · pour Pascal · de quoi juger le futur plugin sur les pièges et la charge, là où le cycle 4 livrait le projet
- bilan du 2026-11-05 · livraison : Vision 0.5.0 (plugin-vision.zip et projet-vision.zip par flashcode : fonds IGN, cadastre, OSM, OpenTopoMap, fond embarqué QFieldSync, import GeoJSON, Shapefile, GeoPackage, GeoTIFF aux couleurs du manuel, style enregistré d'un GeoPackage), à confier à JFC pour un premier essai dans son UT · pour les agents de terrain de l'UT de JFC · première version complète remise au terrain, là où le cycle 5 ne livrait que des zips de recette et des prototypes essayés sur le seul Samsung de Pascal

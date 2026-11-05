# Mission 051 — Remise en ordre de la mémoire (suite du bilan n° 1)

> Fiche rédigée par Claude (orchestrateur) le 5 novembre 2026, à la suite du bilan n° 1 validé
> par Pascal (« oui je valide »), puis « lance la mission de remise en ordre ». **Statut : validée
> par Pascal le 5 novembre 2026.**

## Mission

**En une phrase :** Corriger les trous de mémoire relevés par le test du successeur du bilan n° 1
(journal, ligne de l'archiviste du 5 novembre), pour qu'un successeur trouve chaque information en
moins d'une minute et ne lise rien de faux, **sans changer le comportement** du plugin.

1. `pilotage/kanban.md` : vérifier carte par carte 012, 013, 014, 015, 017, 020 à 025, 027 à 030
   contre le journal et les fiches ; mettre chaque carte dans la bonne colonne (Terminé, Validé,
   Bac à sable, Abandonné) avec la PR quand il y en a une. Ne rien décider : une carte dont le sort
   est à trancher (013, 014, 015, 017) va en « Validé » avec la mention « à trancher par Pascal ».
2. `docs/spec.md` : § 9 n° 5 et § 3.4 (« pas de fond embarqué en tranche 1 ») : ajout daté qui
   renvoie aux missions 046 et 048 (fond embarqué livré, essai J+2 toujours à passer) ; § 4
   (lecture des tables GeoPackage, style `layer_styles`) : garder « pas encore prouvé » tant que
   le détail des essais n'est pas rapporté, mais ajouter la date de l'essai global de Pascal
   (« tout est testé et ok », 5 novembre, détail non rapporté).
3. **Bandeau « périmé »** en tête de `plugin/PLAN.md`, `plugin/PLAN-012.md`, `outils/PLAN-021.md` :
   « Historique, ne plus suivre comme mode d'emploi ; la référence est la spec ». `prototype/` est
   un historique figé (ADR 0009) : ne pas y toucher.
4. `README.md` § 4 (pour les développeurs) : la **procédure de publication** en 5 lignes (lue dans
   `.github/workflows/release-*.yml` : version dans `plugin/metadata.txt` et la constante
   `VERSION`, push sur `main` → `plugin-v<version>` latest ; branches de mission → `plugin-essai` ;
   projet modèle, essai-manuel) ; les **versions de référence** (QField 4.3.7, QGIS 3a92eb3,
   QFieldSync non épinglé) avec renvoi à leur source ; les **prérequis des outils** (`qrencode`,
   `zbarimg`, PROJ, `outils/requirements.txt`) ; la **liste des services externes** (Géoplateforme,
   OSM, OpenTopoMap) avec renvoi aux référentiels.
5. **Index des ADR** `docs/adr/README.md` : numéro, titre, statut, date, amendements (avec date).
6. **Renvoi mort** : `plugin/vision-logique.mjs` l. 4 et l. 80 citent un fichier `prototype/…`
   qui n'existe pas sous ce nom : corriger le commentaire (sans écrire l'ancien nom du projet, que
   la garde interdit : « le module zip du prototype n° 1 dans `prototype/`, nom d'origine, ADR
   0009 »). Commentaires seulement.
7. **Notes de release** `.github/workflows/release-essai-manuel.yml` : retirer les mentions de
   plugins 0.3.x / 0.4.0 devenues fausses, dire « plugin Vision 0.5.0 ou plus ».
8. **Questions ouvertes** : dans `docs/brief.md`, section « à demander à JFC », ajouter les champs
   de code `CODE_UG`, `CODE_PARC`, `CODE_FRT` et la licence du fond IGN embarqué ; dans
   `docs/spec.md`, une section « Questions ouvertes (à trancher par Pascal) » : plafond de 10 Mo
   du zip, mission 014 (dossier vide, remplacement au réimport), sort de 013, 015, 017, message
   « préparer le hors ligne » (idée de l'orchestrateur, non décidée).

## Harnais

- **Agent :** `archiviste`. Branche `mission/051-memoire`, depuis `main`.
- **Ne doit pas :** changer le comportement du plugin ni un texte affiché à l'agent ; décider à la
  place de Pascal ; affaiblir un test ; toucher au journal (l'orchestrateur l'écrit), à
  `prototype/`, aux fiches 001-050, aux ADR 0001-0009 (sauf l'index nouveau).
- `node --test` vert ; adapter un test seulement s'il vérifie un texte modifié, sans l'affaiblir.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal. **Qui tranche :** Pascal.

**Redite par l'agent :** corriger, sans toucher au comportement du plugin ni à un texte vu par l'agent, les huit trous de mémoire du bilan n° 1 (kanban vérifié carte par carte, spec datée, bandeaux « périmé », README développeurs, index des ADR, renvoi mort, notes de release, questions ouvertes), en ajoutant du daté plutôt qu'en effaçant et sans trancher à la place de Pascal.

# Mission 042 — `.qml` du zip reporté et `.json` non GeoJSON : CLAUDE.md, brief, ADR 0008, spec, README

> Fiche rédigée par Claude (orchestrateur) le 5 novembre 2026, à la demande de Pascal (« oui aux
> trois », réponse aux questions de la PR #42). **Statut : validée par Pascal le 5 novembre 2026.**

## Mission

**En une phrase :** Rendre vrais les documents qui disent encore qu'un `.qml` posé dans le zip
surcharge la règle, et ceux qui disent qu'un `.json` non GeoJSON du zip est « ignoré sans
message », sans toucher au code.

1. **`.qml` du zip reporté** (Pascal, 5 novembre 2026 ; spec § 5 déjà à jour par la mission 041) :
   - `CLAUDE.md` l. 59-60, règle « Styles du manuel » : remplacer « un `.qml` posé à côté d'une
     couche dans le zip surcharge la règle » par une formule courte (non pris en charge pour
     l'instant, reporté, renvoi à la spec § 5) ;
   - `docs/brief.md` l. 80 : ne pas réécrire l'intention de Pascal ; ajouter une note datée
     (règle du sommier : on garde la trace, on marque ce qui a changé) ;
   - `docs/adr/0008-couches-sorties-du-zip.md` l. 15 et l. 84 : **ajout daté** en fin d'ADR
     (« Note du 5 novembre 2026 »), sans effacer le texte d'origine.
2. **`.json` non GeoJSON** : sur l'appareil, `lireTexte` passe par `FileUtils.readFileContent`, qui
   ne lit pas en `/vsizip/` (relecture de la 024 et de la 041). Lire dans `plugin/cerf-logique.mjs`
   et `plugin/Cerf.qml` ce que devient un `.json` dont le contenu n'a pas pu être lu (tenté comme
   couche ? refusé avec quel message ? le code fait foi), puis corriger `README.md` l. 59 et
   `docs/spec.md` § 3.1 l. 50-51 en conséquence, avec la date. **Pas de mission de code** (choix de
   Pascal) ; signaler si le comportement réel est gênant pour l'agent de terrain.

**Redite par l'agent :** à remplir.

## Moyens

- Journal des 4 et 5 novembre ; relectures 024 et 041 ; `plugin/cerf-logique.mjs`, `plugin/Cerf.qml`,
  `plugin/cerf-styles.mjs` ; QField 4.3.7 `qffileutils.cpp` l. 620-636 (déjà cité).
- Tests : `node --test` ; adapter ou ajouter un test court dans `tests/readme.test.mjs` si un test
  vérifie déjà ces textes.

## Harnais

- **Agent :** `archiviste`. Branche `mission/042-qml-json-docs`, depuis `main`.
- **Ne doit pas :** toucher au code du plugin ; effacer une décision passée (on ajoute, on date) ;
  toucher au journal ou au kanban ; mettre une clé ou une donnée de l'ONF.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal (PR vers `main`).

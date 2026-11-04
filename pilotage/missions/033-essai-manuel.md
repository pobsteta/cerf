# Mission 033 — Zip de démonstration `essai-manuel.zip` aux noms du manuel

> Fiche rédigée par Claude (orchestrateur) le 4 novembre 2026, à la demande de Pascal (« oui,
> lance essai-manuel.zip »). **Statut : validée par Pascal le 4 novembre 2026.**

## Mission

**En une phrase (quoi, et pourquoi) :** Fabriquer par un script, à l'identique à chaque fois, un
zip de démonstration aux données fictives (UG, Parcelles, FRT en Shapefile complet, export
ProdBois en GeoJSON, près de Fontainebleau, en Lambert 93) dont les noms et les champs déclenchent
les règles de style du manuel (spec § 5), et le publier avec son flashcode dans une préversion
fixe, pour que Pascal voie sur le Samsung les couleurs du plugin 0.3.0 sans attendre le zip réel
`Serre_EA2026` de JFC.

**Redite par l'agent :** à remplir.

## Harnais

- **Agent :** `dev` (sonnet). Branche `mission/033-essai-manuel`, depuis `main`.
- **Moyens :** spec § 5 (règles, noms, champs, couleurs), `outils/zips-recette.mjs` et
  `tests/recette/essai/zip-ecrire.mjs` (écriture de zip déjà testée), `outils/flashcodes.mjs`.
- **Peut :** ajouter un mode ou un outil de fabrication, ses tests, et un workflow de publication
  propre à ce zip (préversion à étiquette fixe, jamais « latest »).
- **Ne doit pas :** toucher à `plugin/` ; publier dans `plugin-essai` (utilisée par la 031) ou dans
  une release stable ; mettre des données réelles de l'ONF ; verser le zip au dépôt.

## Terrain

- Pascal télécharge `essai-manuel.zip` (flashcode), l'importe dans `cerf.qgz` avec le plugin
  0.3.0 en mode avion, et compare couleurs et étiquettes au mail de JFC.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal. **Qui tranche :** Pascal.

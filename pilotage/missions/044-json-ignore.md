# Mission 044 — Un `.json` du zip qui ne s'ouvre pas : écarté avec un message propre (plugin 0.4.1)

> Fiche rédigée par Claude (orchestrateur) le 5 novembre 2026. **Statut : validée par Pascal le
> 5 novembre 2026** (« oui, lance la mission de code pour les .json », puis choix « Message
> propre »).

## Mission

**En une phrase :** Sur l'appareil, le plugin ne peut pas lire le contenu d'un `.json` du zip
(`FileUtils.readFileContent` ne lit pas en `/vsizip/`, `plugin/Cerf.qml` l. 117-124) : il le tente
donc comme couche et, s'il ne s'ouvre pas, le refuse « `<chemin>` : illisible » (contrôle 2) ;
désormais, **un `.json` qui ne s'ouvre pas est écarté avec la ligne « `<chemin>` : pas une couche
GeoJSON, ignoré »** (texte validé par Pascal), qui n'est **pas un refus** (ni compté ni présenté
comme tel), et un `.json` qui s'ouvre reste traité comme toute couche (contrôles, réécriture,
style).

- Ne concerne que l'extension `.json` ; un `.geojson` illisible reste refusé « illisible ».
- Les autres couches du zip sont traitées comme avant.
- Un zip dont les seules « couches » sont des `.json` écartés : le résultat ne doit pas dire
  « Aucune couche chargée » comme pour un refus sans expliquer ; proposer dans le rapport la
  formulation retenue (par exemple la ligne d'écart plus le message existant « Aucune couche
  GeoJSON, Shapefile, GeoPackage ou GeoTIFF dans x.zip. »), **sans inventer de nouveau texte**
  au-delà de la ligne validée : si un autre texte paraît nécessaire, le signaler, Pascal tranche.
- Réimport : un `.json` écarté ne compte pas comme couche lisible.
- Quand le contenu est lisible (version de développement, tests), le filtre actuel par contenu
  (`estGeoJson`) reste ; si le contenu n'est pas du GeoJSON, la même ligne « pas une couche
  GeoJSON, ignoré » s'affiche (plus de silence, une seule conduite sur PC et sur l'appareil).

**Redite par l'agent :** à remplir.

## Moyens

- `plugin/cerf-logique.mjs` (`couchesDuZip` l. 381 et 438-439, filtre l. 964-977,
  `controlerSansPlanter` l. 698-710, `nomAffiche` l. 689, messages de zip l. 982-1010),
  `plugin/cerf-controles.mjs` l. 87, `plugin/Cerf.qml` l. 117-124 ; tests
  `tests/plugin-styles.test.mjs` l. 73-91 (titres « ignoré en silence » à revoir) ;
  `tests/readme.test.mjs` (test de la mission 042 qui fige la ligne de filtre : à adapter sans
  l'affaiblir) ; spec § 3.1 et README l. 59 (à mettre à jour avec le nouveau comportement).
- Relecture de la 042 (journal du 5 novembre).

## Harnais

- **Agent :** `dev` (sonnet), tests compris. Branche `mission/044-json-ignore`, depuis `main`.
- **Doit :** tests du cas appareil (lecture du contenu `null`, ouverture ratée → ligne d'écart,
  pas de refus ; ouverture réussie → couche normale), du cas PC (contenu non GeoJSON → même ligne),
  du `.geojson` illisible (toujours refusé), du zip fait seulement d'un `.json` écarté, du
  réimport ; spec § 3.1 et README alignés ; plugin **0.4.1** ; préversion `plugin-essai`.
- **Ne doit pas :** changer les autres contrôles ni leurs textes ; affaiblir un test ; toucher au
  journal ou au kanban.

## Terrain

- Zip `p.geojson` + `config.json` sur le Samsung : `p` chargé, ligne
  « config.json : pas une couche GeoJSON, ignoré ».

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal. **Qui tranche :** Pascal.

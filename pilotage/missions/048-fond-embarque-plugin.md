# Mission 048 — Le plugin ajoute le fond embarqué `basemap.mbtiles` s'il est à côté du projet

> Fiche rédigée par Claude (orchestrateur) le 5 novembre 2026, à la suite de l'arbitrage D1 de Pascal
> sur la mission 046 (« D1, zoom 13 et tuiles 256 ok »). **Statut : validée par Pascal le 5 novembre
> 2026.** Branche fondée sur la mission 047 (plugin 0.4.2, PR #47 non fusionnée), pour éviter les
> conflits de version et de déclencheurs.

## Mission

**En une phrase :** À l'ouverture de `cerf.qgz` (même moment que la recharge du registre), si un
fichier `basemap.mbtiles` est présent **à côté de `cerf.qgz`** et qu'aucune couche du projet ne le lit
déjà, le plugin le charge comme couche raster (lecture seule) **« Fond embarqué (hors ligne) »**,
placée **sous** les fonds en ligne (en bas de l'arbre, ou en bas du groupe « Fonds de carte » : à
justifier), visible ; s'il est absent, rien ne se passe et **aucun message** (pas de page
« Unable to load some layers ») ; s'il est présent mais illisible, une ligne dans le panneau Cerf
(texte à proposer à Pascal, **aucun texte inventé dans le code sans son accord** : utilise un
message existant s'il convient, sinon arrête-toi et propose).

- Pas d'ajout en double (réouverture, rechargement du plugin) ; pas d'écriture dans le registre des
  imports (ce n'est pas une couche du zip) — à confirmer par la lecture du code : si l'ajout au
  projet le rend persistant dans le `.qgs` à l'enregistrement, dire ce qui arrive si le fichier
  disparaît ensuite (page d'erreur ?) et proposer la parade (couche ajoutée sans enregistrement,
  ou retirée à la fermeture).
- QField 4.3.7 : chargement d'un MBTiles par `LayerUtils.loadRasterLayer` (comme les GeoTIFF de la
  mission 024 ; vérifier dans les sources qu'un `.mbtiles` passe par GDAL), existence du fichier par
  le service existant (`existe`), chemin du projet par ce que le plugin utilise déjà pour
  `cerf-imports/`.
- Plugin **0.4.3** ; préversion `plugin-essai` ; README (étapes 5 et 6 du mode d'emploi de la 046 :
  copier `basemap.mbtiles` à côté de `cerf.qgz`, rouvrir, vérifier en mode avion) et spec § 3.4.

## Harnais

- **Agent :** `dev`, tests compris. Branche `mission/048-fond-embarque-plugin`, depuis
  `mission/047-styles-gpkg`.
- **Doit :** tests (absent → rien ; présent → une couche, au bon endroit, une seule fois ; déjà
  présente → rien ; illisible → message ; projet sans `cerf_id` → rien) ; sources citées.
- **Ne doit pas :** toucher à `outils/projet-modele.mjs` ni à `cerf.qgz` (mission 046) ; journal,
  kanban.

## Terrain

Sur le Samsung : sans `basemap.mbtiles`, aucune page d'erreur ; avec un `basemap.mbtiles` produit par
QFieldSync pour une UT (mission 046), le fond s'affiche en mode avion sous le cadastre en ligne ;
rouvrir le projet : une seule couche.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal. **Qui tranche :** Pascal.

**Redite par l'agent :** à remplir.

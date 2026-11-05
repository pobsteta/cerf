# Mission 046 — Fond embarqué IGN d'une UT avec QFieldSync

> Fiche rédigée par Claude (orchestrateur) le 5 novembre 2026, à la demande de Pascal (« Lance la
> mission fond embarqué IGN avec QFieldSync »). **Statut : validée par Pascal le 5 novembre 2026.**
> Fond embarqué de repli accepté par l'ADR 0002 ; spec § 3.4 et § 9 n° 5 (« pas en tranche 1 sauf
> échec à J+2 ») : Pascal lance la mission sans attendre l'essai J+2.

## Mission

**En une phrase :** Permettre de préparer sur PC, avec l'extension QGIS **QFieldSync**, un fond
embarqué **IGN** (Plan IGN v2, et cadastre ; BD ORTHO à proposer) pour l'emprise d'une UT, lisible
par QField sans réseau dans `cerf.qgz`, sans casser ce qui marche (un seul `cerf.qgz` par appareil,
`cerf_id`, `cerf-imports/`, plugin, couche « Saisie terrain ») ; OSM et OpenTopoMap **exclus**
(en ligne seulement, politique de l'OSMF, arbitrage de Pascal sur la 045).

### Étape 1 — étude (`acquereur`) : `docs/referentiels/fond-embarque-qfieldsync.md`

Sources : code de QFieldSync et de `libqfieldsync` (dépôts `opengisch/qfieldsync` et
`opengisch/libqfieldsync`, lisibles par `raw.githubusercontent.com` ; `docs.qfield.org` et
`github.com` ne sont pas joignables depuis l'environnement), version citée.

1. Comment QFieldSync fabrique le fond (« base map ») : propriétés de projet lues (noms exacts des
   clés dans le `.qgs`, par exemple `createBaseMap`, `baseMapType`, `baseMapTheme`, `baseMapLayer`,
   `baseMapMupp`, `baseMapTileSize`), algorithme utilisé, format de sortie (GeoPackage raster ?),
   nom et emplacement du fichier, comment il est déclaré dans le projet empaqueté.
2. Ce que fait « Package for QField » au reste du projet : copie du `.qgs` ? variables de projet
   (`cerf_id`) gardées ? couches XYZ gardées en ligne ou retirées ? couche « Saisie terrain »
   (`saisie.gpkg`, mode « offline editing » ou « copy ») ? emprise (zone d'intérêt) ? dossier de
   sortie ?
3. Conséquences pour Cerf : le paquet remplace-t-il `cerf.qgz` sur l'appareil ? que deviennent
   `cerf-imports/` et le registre ? peut-on livrer **seulement** le fichier de fond (copié à côté de
   `cerf.qgz` et déclaré d'avance dans le projet modèle) au lieu du projet empaqueté ?
4. Taille et résolution : mètres par pixel conseillés, taille estimée pour 10 km × 10 km (JFC :
   700 Mo, zoom inconnu) ; aperçus (pyramides) ; QField lit-il un GeoPackage raster de cette taille ?
5. Licence : rasteriser Plan IGN v2 et le cadastre (Géoplateforme) pour un usage hors ligne par
   l'ONF est-il permis ? (CGU cartes.gouv.fr / Etalab ; sources citées, non lues = dit.)

Rien n'est tranché : section « À trancher par Pascal » avec 2 ou 3 voies (par ex. A : projet
empaqueté par QFieldSync copié sur l'appareil ; B : seul le fond produit par QFieldSync, déposé à
côté de `cerf.qgz` et déjà déclaré dans le projet modèle ; C : autre).

### Étape 2 — réalisation (`dev`, après le choix de Pascal)

Selon la voie : propriétés QFieldSync posées dans `cerf.qgz` par `outils/projet-modele.mjs`
(thème de carte « Fond embarqué » avec les couches IGN choisies, résolution), couche de fond
déclarée d'avance si la voie B est retenue, tests, mode d'emploi pas à pas dans le README
(installer QFieldSync, choisir l'emprise de l'UT, produire, copier sur le Samsung). Après la
mission 045 (même fichier `outils/projet-modele.mjs`).

## Terrain

Sur le Samsung, en mode avion, à J+0 et J+2 : fond embarqué de l'UT visible, couches importées
et cadastre par-dessus ; temps de préparation sur PC et taille du fichier notés.

## Qui veille, qui tranche

- **Relecteur :** `relecteur` après chaque étape, puis Pascal (PR vers `main`). **Qui tranche :** Pascal.

**Redite par l'agent :** préparer sur PC, avec QFieldSync, un fond embarqué IGN (Plan IGN v2 + cadastre, zoom 13 à 17) d'une UT sous forme d'un seul `basemap.mbtiles` copié à côté de `cerf.qgz` (voie B), sans toucher `cerf_id`, `saisie.gpkg`, `cerf-imports/` ni au plugin ; étape 2 faite pour le thème, les propriétés QFieldSync, les tests et le README ; la couche déclarée d'avance est suspendue à la décision de Pascal (risque : page d'erreur de QField à chaque ouverture sans le fichier).

## Arbitrages de Pascal (5 novembre 2026, après l'étape 1)

- **Voie B** : seul le `basemap.mbtiles` produit par QFieldSync est copié sur l'appareil, à côté
  de `cerf.qgz` ; le projet modèle le déclare d'avance (chemin relatif). Pas de projet empaqueté
  sur l'appareil.
- **Zoom maximal 17** (environ 0,8 m par pixel ; zoom minimal à proposer par le dev).
- **Contenu** : non précisé par Pascal ; l'orchestrateur propose **Plan IGN v2 + cadastre** (sans
  BD ORTHO ni OSM / OpenTopoMap), à confirmer avant fusion.
- Branche fondée sur la mission 045 (fusion de `mission/045-fonds-osm-cadastre`), même fichier
  `outils/projet-modele.mjs`.

## Arbitrages de Pascal (5 novembre 2026, après l'étape 2)

- **D1** : `cerf.qgz` ne déclare pas la couche `basemap.mbtiles` (sinon QField affiche « Unable to
  load some layers » à chaque ouverture sans fond) ; c'est le **plugin Cerf** qui l'ajoutera s'il le
  trouve à côté du projet : **mission 048** (plugin), fondée sur la 047.
- **Zoom minimal 13**, **tuiles de 256 pixels** : acceptés.
- Contenu : Plan IGN v2 + cadastre (confirmé plus tôt).

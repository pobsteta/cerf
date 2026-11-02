# [NOM À TRANCHER PAR PASCAL] — brief

> Rédigé par Claude avec `/imperatrice:brief` le 2 novembre 2026, à partir du mail de
> JFC et des réponses de Pascal (tours 1 à 3). Chaque ligne vient d'une réponse de
> Pascal ; ce qu'il n'a pas tranché est marqué « à trancher par Pascal ». Statut :
> **à relire par Pascal**, puis critique du `contradicteur`, puis arbitrages.
> Le détail technique ira dans `docs/spec.md` ; ce brief n'en recopie rien.

## Ma réponse d'abord (fiche n° 15)

> j'attends de ce projet qu'il me livre un projet vide qfield, comprenant les URLs des
> fonds de carte prévues et la possibilité d'importer des autres couches, de différents
> formats (vecteurs ou rasters) , contenues dans un zip, directement depuis qfield.
>
> — Pascal, le 2 novembre 2026, dit avant toute proposition de Claude, recopié mot pour mot.

## Le problème, et pour qui (Abstraction)

- **Problème** : aujourd'hui, chaque agent construit son projet QField à la main. Les
  fonds IGN embarqués pèsent 700 Mo pour 10 km × 10 km (constat de JFC), donc
  impossibles à l'échelle d'une UT. Les styles « du manuel » (UG, Parcelles, FRT) et
  l'étiquette ProdBois (`"essence" || '\n' || "diametre"`) sont recréés projet par
  projet. Les exports ProdBois ou Relevés ne peuvent pas être ajoutés sur le terrain.
  Constaté par JFC dans son UT ; **le problème vaut pour toute UT** (Pascal).
- **Bénéficiaires**, dans l'ordre :
  1. les agents de terrain de l'UT (TFT, ouvriers, martelage) ;
  2. les autres UT de l'agence, si le modèle est repris ;
  3. la commission et les affouagistes, qui reçoivent des sorties dérivées (tiges
     triées DE, Réserve), sans être utilisateurs de l'outil.
- **Coût complet aujourd'hui** : inconnu.

## Ce que fait [NOM]

- **En une phrase** : un projet QField modèle, prêt pour toute UT, avec les fonds IGN
  en flux, dans lequel l'agent ajoute sur le terrain, depuis un zip, les couches
  vecteur ou raster dont il a besoin, affichées aux couleurs du manuel.
- **« Vide »** veut dire : vide de données métier, mais plein de ses fonds de carte et
  de sa configuration (styles, étiquettes, plugin).
- **Les gestes sur le terrain** : l'agent ouvre le projet modèle ; il touche un bouton
  du plugin, choisit un zip (ou un dossier) sur l'appareil, coche les couches à charger ;
  elles apparaissent stylées selon leur nom (UG, Parcelles, FRT, export ProdBois) ; il
  peut en retirer une ; à la réouverture du projet, elles reviennent toutes seules.
  Les couches importées sont **en lecture seule**. L'import marche **sans réseau** ;
  seuls les fonds IGN ont besoin du réseau ou d'un cache de tuiles déjà rempli.
- **Ce qu'il produit** (livrables) :
  1. le projet modèle `.qgz` ;
  2. le plugin QField, en zip installable par URL ;
  3. une **convention du zip** d'une page : noms de couches attendus, formats acceptés
     (GeoJSON, GeoPackage, Shapefile, GeoTIFF), système de coordonnées ;
  4. une notice de trois pages pour JFC : préparer le zip depuis QGIS, ProdBois,
     Relevés et Canopée, puis le mettre sur la tablette.
  En tranche 1, **JFC fabrique le zip à la main depuis QGIS**, selon la convention.
- **Styles et étiquettes** : portés par **le plugin, par règle sur le nom de la
  couche** (couleurs du manuel, d'après le mail de JFC) :

  | Couche | Taille | Couleur | Opacité | Étiquette |
  |---|---|---|---|---|
  | UG | 10 | `#0000FF` | 100 % | CODE UG |
  | Parcelles | 15 | `#FF8C00` | 100 % | CODE Parc |
  | FRT | 10 | `#008B8B` | 100 % | CODE FRT |
  | export ProdBois / Relevés | — | noir | — | `"essence" || '\n' || "diametre"`, dès qu'une couche a ces deux champs |

  Un fichier `.qml` posé à côté d'une couche dans le zip **surcharge** la règle, pour
  les cas particuliers. Conséquence : le GeoJSON de ProdBois et les Shapefile « des
  nostalgiques » et de Canopée sont chargés tels quels, sans conversion en GeoPackage.
- **Fonds de carte, tranche 1** : deux flux WMTS de la Géoplateforme IGN, **Plan IGN v2**
  et **BD ORTHO**, ouverts et sans clé. Le **SCAN 25** (« Top 25 » du mail) est une
  donnée à accès restreint : il n'entre que si l'ONF a une licence et une clé d'accès,
  ce que **JFC doit confirmer** ; sinon Plan IGN le remplace
  ([Géoservices IGN, bascule vers la Géoplateforme](https://geoservices.ign.fr/actualites)).
- **Coordonnées** : le plugin accepte tout système déclaré dans le fichier et reprojette
  à la volée vers celui du projet (Lambert 93, EPSG:2154). Un fichier sans système
  déclaré est **refusé avec un message clair**, jamais chargé de travers.

## Ce qu'il ne fait pas (hors périmètre, tranche 1)

- pas de saisie dans les couches importées ;
- pas de synchronisation QFieldCloud de ces couches ;
- pas d'outil bureau pour fabriquer le zip ;
- pas de fonds embarqués hors ligne (le cache de tuiles de QField suffit pour
  commencer) ;
- pas de lien direct avec ProdBois, Relevés ou Canopée : on lit leurs exports, rien
  d'autre ;
- cadastre, MNH et pentes par agence : « à voir plus tard », faute d'URL ou de donnée
  connue (mail de JFC).

## Contraintes connues

- **Architecture** (décision structurante, à passer en ADR FRANCE, proposition de
  Claude retenue par Pascal) : projet modèle préparé dans QGIS + **plugin QField**
  (QML/JavaScript), dérivé ou inspiré de
  [`qfield-layer-loader`](https://community.qfield.org/t/new-plugin-to-load-read-only-layers/1266),
  qui charge déjà des couches vecteur ou raster en lecture seule depuis l'appareil.
  Un plugin QGIS (bureau) est écarté : il contredirait « directement depuis QField ».
  Il reste en secours si le plugin QField bute sur un moyen manquant.
- **Deux faits techniques à vérifier avant de coder** (question 3 de la fiche n° 1, les
  moyens) :
  1. QField n'écrit pas le fichier projet : les couches ajoutées sur le terrain
     doivent être tenues dans un registre du plugin et rechargées à chaque ouverture
     (constat d'un autre plugin, [`qfield_addLayer`](https://github.com/lukashelmke/qfield_addLayer)) ;
  2. rien ne prouve encore que QML, dans QField, expose une **décompression de zip**.
     Repli déjà identifié : QField importe nativement un zip dans son dossier, le
     plugin lit ensuite le dossier.
- **Terrain** : tablette ou téléphone Android, gants, soleil, sans réseau pour l'import.
- **Formats acceptés** : GeoJSON, GeoPackage, Shapefile, GeoTIFF. Les styles QGIS
  embarqués dans un GeoPackage ne sont pas exigés.
- **Licence et maintenance** : **licence ouverte** (laquelle : à trancher par Pascal ;
  Groma et Surculus sont sous GPL-3.0-or-later), **maintenu par Pascal sur GitHub**
  (nom du dépôt : à trancher par Pascal).
- **Successeur** : à désigner par Pascal.

## Comment saura-t-on que ça marche ?

- **Signe concret** : sur une tablette de terrain, **sans réseau**, JFC ouvre le
  projet modèle, importe son zip `Serre_EA2026` (GeoJSON ProdBois trié BF1, UG,
  Parcelles, FRT en Shapefile) en **moins de deux minutes**, voit les couleurs du
  manuel et les étiquettes essence/diamètre **sans rien régler**, ferme et rouvre le
  projet : tout est encore là.
- **Testé par JFC**, pas par Pascal.

## Qui tranche

Pascal Obstétar.

## À fournir avant la spec

- l'export brut `Serre_EA2026_p5_13_30.geojson` de ProdBois (schéma des champs,
  système de coordonnées réel) ;
- la réponse de JFC sur la licence SCAN 25 de l'ONF ;
- le nom du projet, la licence ouverte choisie, le dépôt GitHub.

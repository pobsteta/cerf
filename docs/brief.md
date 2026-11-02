# Cerf — brief

> Rédigé par Claude avec `/imperatrice:brief` le 2 novembre 2026, à partir du mail de
> JFC et des réponses de Pascal (tours 1 à 3). Chaque ligne vient d'une réponse de
> Pascal ; ce qu'il n'a pas tranché est marqué « à trancher par Pascal ». Statut :
> relu par Pascal, critiqué par le `contradicteur` le 2 novembre 2026 ; **arbitrages de Pascal
> reportés le 2 novembre 2026** (voir « Arbitrages » en fin de brief).
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
  2. les autres UT de l'agence, si le modèle est repris.

  La commission et les affouagistes (sorties dérivées : tiges triées DE, Réserve) sont
  **retirés de la tranche 1** : aucun livrable ne leur est destiné (arbitrage 8).
- **Coût complet aujourd'hui** : inconnu ; un ordre de grandeur est à demander à JFC
  (heures par projet fait à la main, nombre de projets par an).

## Ce que fait Cerf

- **En une phrase** : un projet QField modèle, prêt pour toute UT de métropole (Corse comprise), avec les fonds IGN
  en flux, dans lequel l'agent ajoute sur le terrain, depuis un zip, les couches
  vecteur ou raster dont il a besoin, affichées aux couleurs du manuel.
- **« Vide »** veut dire : vide de données métier, mais plein de ses fonds de carte et
  de sa configuration (styles, étiquettes, plugin).
- **Les gestes sur le terrain** : l'agent ouvre le projet modèle ; il touche un bouton
  du plugin, choisit un zip (ou un dossier) sur l'appareil, coche les couches à charger ;
  elles apparaissent stylées selon leur nom (UG, Parcelles, FRT, export ProdBois) ; il
  peut en retirer une ; à la réouverture du projet, elles reviennent toutes seules.
  Les couches importées sont **en lecture seule**. L'import marche **sans réseau** ;
  seuls les fonds IGN ont besoin du réseau ou de tuiles déjà en cache, ce qui reste à
  prouver sur tablette (voir « Fonds de carte »).
- **Ce qu'il produit** (livrables) :
  1. le projet modèle `.qgz` ;
  2. le plugin QField **d'application** (arbitrage 1), en zip installable par URL sur
     chaque tablette, actif dans tous les projets mais qui n'agit que dans un projet
     Cerf ;
  3. une **convention du zip** d'une page : noms de couches attendus, formats acceptés
     (GeoJSON, GeoPackage, Shapefile complet : `.shp`, `.shx`, `.dbf`, `.prj`, `.cpg`
     ; GeoTIFF), système de coordonnées, et en annexe la grammaire des styles (motif de
     nom exact, géométrie attendue, symbole avec unités, champ d'étiquette) ;
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

  À préciser dans l'annexe de la convention : l'unité de « taille », contour ou
  remplissage pour UG, Parcelles et FRT, le symbole « noir », les noms des champs
  d'étiquette, le motif de reconnaissance des noms (`PARCELLE.shp`,
  `parcelles_serre.gpkg`…). **Il n'existe pas de référence des styles** (Pascal,
  2 novembre 2026) : le mail de JFC est la seule source ; le reste est à trancher par
  Pascal.

  Un fichier `.qml` posé à côté d'une couche dans le zip **surcharge** la règle, pour
  les cas particuliers. Conséquence : le GeoJSON de ProdBois et les Shapefile « des
  nostalgiques » et de Canopée sont chargés tels quels, sans conversion en GeoPackage.
- **Fonds de carte, tranche 1** : deux fonds ouverts et sans clé de la Géoplateforme IGN,
  **Plan IGN v2** (`GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2`) et **BD ORTHO**
  (`ORTHOIMAGERY.ORTHOPHOTOS`), servis par `data.geopf.fr`, **déclarés en XYZ et non en
  WMTS** (arbitrage 2) : QField met les tuiles en cache mais pas la requête
  GetCapabilities qui initialise une couche WMTS à l'ouverture
  ([discussion QField #5159](https://github.com/opengisch/QField/discussions/5159)).
  Si le cache ne suffit pas, un **fond embarqué** (MBTiles ou GeoPackage raster) pour la
  zone du jour est accepté (arbitrage 2). Le **SCAN 25** (« Top 25 » du mail) est une
  donnée à accès restreint : il n'entre que si l'ONF a une licence et une clé d'accès,
  ce que **JFC doit confirmer** ; sinon Plan IGN le remplace
  ([Géoservices IGN, services de diffusion](https://geoservices.ign.fr/node/1394)).
  **Aucune clé dans le dépôt** : si le SCAN 25 entre, la clé est saisie sur l'appareil.
- **Coordonnées** : le plugin accepte tout système déclaré dans le fichier et reprojette
  à la volée vers celui du projet (Lambert 93, EPSG:2154). La règle « sans système
  déclaré, refusé » est **remplacée par un contrôle de vraisemblance** (arbitrage 3) :
  après reprojection, l'emprise de la couche doit tomber dans l'emprise de la France
  métropolitaine, sinon la couche est refusée avec un message clair (« coordonnées
  incohérentes : système mal déclaré ? »). Raison : un GeoJSON ne déclare jamais de
  système (RFC 7946 : WGS84 implicite), un Shapefile sans `.prj` peut recevoir un
  système en silence ; le contrôle couvre aussi l'inversion des axes. Le plugin vérifie
  en plus la présence du `.prj` d'un Shapefile dans le zip.

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
  Claude retenue par Pascal) : projet modèle préparé dans QGIS + **plugin QField
  d'application** (QML/JavaScript), inspiré de
  [`qfield-layer-loader`](https://community.qfield.org/t/new-plugin-to-load-read-only-layers/1266),
  qui charge déjà des couches vecteur ou raster en lecture seule depuis l'appareil.
  On écrit « inspiré de » et non « dérivé de » tant que sa licence (GPL-2.0 : « -only »
  ou « -or-later » ?) n'est pas lue. Un plugin QGIS (bureau) est écarté : il contredirait « directement depuis QField ».
  Il reste en secours si le plugin QField bute sur un moyen manquant.
- **Mécanismes connus, à recopier et non à inventer** (critique du contradicteur) :
  1. le **registre des couches** rechargé à chaque ouverture existe déjà dans
     [`qfield_addLayer`](https://github.com/lukashelmke/qfield_addLayer/blob/main/main.qml)
     (registre dans les réglages de QField, rechargement à la fin de l'ouverture du
     projet). Règles retenues (arbitrage 6) : la **clé** du registre est un identifiant
     propre au projet Cerf, stocké dans le projet, et non son nom de fichier ; les
     **copies** vont dans le dossier « Imported Datasets » de QField, **hors du dossier
     projet** (que QFieldCloud peut purger). Reste à écrire dans la spec : le
     comportement si un fichier a disparu ; la perte du registre si QField est
     désinstallé (acceptable pour des couches en lecture seule) ;
  2. **pas de décompression** : GDAL lit dans le zip (`/vsizip/`), comme le fait déjà
     [`qfield-layer-loader`](https://github.com/mbernasocchi/qfield-layer-loader/blob/main/main.qml).
     **À prototyper en premier** : lister le contenu du zip, lire un Shapefile dans le
     zip, trouver un `.qml` dans le zip, lire un GeoTIFF de 200 Mo, choisir un fichier
     sous Android 11 et plus (le choix d'un dossier n'est pas acquis).
- **Version de QField** : 3.8 au moins (`qfield-layer-loader`) ; version du parc de
  tablettes ONF : à demander à JFC.
- **Terrain** : tablette ou téléphone Android, gants, soleil, sans réseau pour l'import.
- **Formats acceptés** : GeoJSON, GeoPackage, Shapefile, GeoTIFF. Les styles QGIS
  embarqués dans un GeoPackage ne sont pas exigés.
- **Licence et maintenance** : **licence ouverte**, tranchée **après lecture de la licence
  exacte de `qfield-layer-loader`** (arbitrage 5) ; GPL-3.0-or-later pressentie, comme
  Groma et Surculus ; **maintenu par Pascal sur GitHub**
  (nom du dépôt : à trancher par Pascal).
- **Successeur** : à désigner par Pascal, avant la porte n° 2.

## Comment saura-t-on que ça marche ?

- **Signe concret**, protocole retenu (arbitrage 7) :
  - sur **smartphone Samsung** (Pascal, 2 novembre 2026 ; modèle et version de QField
    notés le jour de la recette), en
    mode avion, projet fermé, zip `Serre_EA2026` (GeoJSON ProdBois trié BF1, UG,
    Parcelles, FRT en Shapefile ; taille à noter) déjà copié sur la tablette ;
  - du toucher sur le bouton du plugin à l'affichage des 4 couches aux couleurs du
    manuel, étiquettes essence/diamètre comprises, **sans rien régler** : **2 minutes au
    plus, médiane de 3 essais** ;
  - les couches se superposent au fond IGN **à moins de 5 m** d'un repère connu ;
  - **après redémarrage de la tablette**, les 4 couches reviennent ;
  - le **fond IGN est visible hors ligne** sur une zone parcourue la veille ;
  - un **zip piégé** (GeoJSON en Lambert 93 sans système déclaré, Shapefile sans
    `.prj`, nom de couche non reconnu) donne pour chaque piège un message clair.
- **Testé par JFC**, pas par Pascal.

## Qui tranche

Pascal Obstétar.

## À fournir avant la spec

- l'export brut `Serre_EA2026_p5_13_30.geojson` de ProdBois, pour le schéma des champs.
  Son système est connu : **WGS84** (Pascal, 2 novembre 2026), ce qui est conforme à
  RFC 7946 et passe le contrôle de vraisemblance ;
- de JFC : un ordre de grandeur du coût actuel, la mesure des 700 Mo refaite avec
  son niveau de zoom ;
- la lecture de la licence de `qfield-layer-loader` ;
- la réponse de JFC sur la licence SCAN 25 de l'ONF ;
- ~~le nom du projet~~ (Cerf, tranché par Pascal le 2 novembre 2026), la licence ouverte choisie, le dépôt GitHub (`pobsteta/cerf` existe : à confirmer par Pascal).

## Arbitrages de Pascal (2 novembre 2026)

Sur les huit questions du `contradicteur` (critique au journal du même jour) :

1. plugin QField **d'application** (et non de projet) ;
2. fonds IGN en **XYZ** plutôt qu'en WMTS ; fond embarqué accepté pour la zone du jour
   si le cache ne suffit pas ;
3. **contrôle de vraisemblance d'emprise** (France métropolitaine) à la place de
   « sans système déclaré, refusé » ;
4. « toute UT » = **métropole, Corse comprise**, en tranche 1 ;
5. licence de Cerf tranchée **après lecture** de la licence de `qfield-layer-loader` ;
6. clé du registre = **identifiant propre au projet Cerf** ; copies **hors du dossier
   projet** ;
7. **protocole des deux minutes** retenu, avec zip piégé ;
8. commission et affouagistes **retirés** de la tranche 1.

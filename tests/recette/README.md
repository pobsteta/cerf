# Zips de recette `piege` et `lourd` (mission 016, spec § 6, critères 6 et 7)

Fabrication (rejouable à l'identique, mêmes octets à chaque fois) :

```
node --no-warnings outils/zips-recette.mjs <dossier-de-sortie>            # piege.zip et lourd.zip (200 Mo)
node --no-warnings outils/zips-recette.mjs <dossier-de-sortie> piege
node --no-warnings outils/zips-recette.mjs <dossier-de-sortie> lourd 1    # lourd à 1 Mo (tests)
```

Les zips ne sont **pas** versés au dépôt (`lourd.zip` fait 200 Mo). Données fictives, près de
Fontainebleau (X 668 000, Y 6 826 000 en Lambert 93), sans valeur métier. Sans GDAL : tous les
fichiers sont écrits à la main par le script (GDAL absent du conteneur).

## `piege.zip` (8 fichiers, 5 pièges)

| Fichier | Piège | Message attendu (spec § 4) | À voir dans QGIS |
|---|---|---|---|
| `UG_sans_crs.geojson` | Lambert 93 sans membre `crs` | refus « Coordonnées incohérentes : système mal déclaré ? » (contrôle 5) | QGIS le lit en EPSG:4326 : la couche est introuvable (X = 668 000 « degrés »), emprise absurde |
| `Parcelles_sans_prj.{shp,shx,dbf,cpg}` | Shapefile sans `.prj` | refus « Parcelles_sans_prj.shp : fichier .prj manquant, système de coordonnées inconnu » (contrôle 1) | couche sans système (« SCR inconnu ») ; l'emprise est en mètres L93 |
| `FRT_sans_georef.tif` | GeoTIFF 8 x 8 sans géoréférencement | refus « système de coordonnées inconnu » (contrôle 3) | image de 8 x 8 pixels sans SCR, posée à l'origine (0 ; 0) |
| `Zone_inconnue.geojson` | nom non reconnu | chargée avec le style par défaut (§ 5) | polygone bien placé près de Fontainebleau, style QGIS par défaut |
| `UG_vide.geojson` | couche vide | avertissement, chargée sans contrôle d'emprise (contrôle 4) | couche sans aucune entité |

## `lourd.zip` (2 entrées, toutes rangées sans compression, méthode 0)

| Fichier | Contenu |
|---|---|
| `lourd.tif` | GeoTIFF 8 bits, 1 bande, non compressé, 199 996 426 octets (14 142 x 14 142 pixels), pixel de 5 m, EPSG:2154, coin haut-gauche (600 000 ; 6 870 000) |
| `Serre_lourd.gpkg` | GeoPackage EPSG:2154, 2 couches : `Releves_lourd` (100 points, champs `essence`, `diametre`) et `Parcelles_lourd` (10 polygones, champ `code`) ; 49 152 octets |

`lourd.zip` complet : 200 045 802 octets. Le temps d'affichage est à mesurer et à noter en
recette (spec § 9, n° 6).

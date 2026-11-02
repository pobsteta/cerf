# Emprise de la terre ferme de France métropolitaine en Lambert 93

> Mission 002 (spec § 4 et § 8, point 4 ; ADR 0004). Calcul du 2 novembre 2026.
> Valeurs lisibles par machine : `emprise-metropole.json`. Script : `outils/emprise.py`.
> **Statut : valeur mesurée, à geler avant la fusion de la mission 012.**

## Résultat

Système : EPSG:2154, « RGF93 v1 / Lambert-93 » (nom rendu par PROJ). x = Est, y = Nord, en mètres,
arrondis vers l'extérieur au mètre.

| Rectangle | X min | X max | Y min | Y max |
|---|---|---|---|---|
| **Brut** (terre ferme, Corse comprise) | 99 101 | 1 242 436 | 6 046 555 | 7 110 480 |
| **Élargi de 10 km** (marge ajoutée à part) | 89 101 | 1 252 436 | 6 036 555 | 7 120 480 |

### Écart avec la valeur provisoire de la spec § 4

Spec : X 89 000 → 1 253 000, Y 6 039 000 → 7 121 000.

- X min, X max, Y max : la spec est plus large de 101 m, 564 m et 520 m (sans conséquence).
- **Y min : la spec (6 039 000) est plus étroite de 2 445 m que la valeur mesurée
  (6 036 555).** Au sud de la Corse, un point à moins de 10 km de la côte mais à plus de
  7,5 km au sud du point le plus au sud serait refusé par la valeur de la spec. Les ADR et la
  spec ne sont pas modifiées par cette mission : **décision à Pascal** (mettre à jour la spec § 4).

## Méthode

1. Contour de la terre ferme : `metropole.geojson`, dépôt `gregoiredavid/france-geojson`,
   branche `master`, tracés IGN Admin Express COG édition 2018 simplifiés (Mapshaper,
   Visvalingam pondéré à 25 %, coordonnées à 5 décimales), WGS84, ordre lon/lat. Une
   entité, MultiPolygon : 169 anneaux, 31 558 sommets (comptés par le script).
   SHA-256 : `d1f4aec3fbc274d4af3f5930302a342d3efe0ea1daf410fbeef535346167bf0c`.
   Le fichier n'est pas versionné ici ; le script le télécharge (`--telecharger`) et vérifie l'empreinte.
2. Reprojection EPSG:4326 → EPSG:2154 avec PROJ 9.8.1 (pyproj 3.8.0, `always_xy=True`),
   de chaque sommet **et** de points intermédiaires environ tous les 1 km sur chaque arête
   (densification en lon/lat, puis reprojection), pour que les bords soient pris en compte.
3. Rectangle brut = min / max des x et y reprojetés ; arrondi vers l'extérieur.
4. Rectangle élargi = brut ± 10 000 m (marge de la spec § 4), calculée à part.

Relance : `python3 -I outils/emprise.py CONTOUR.geojson` redonne le JSON à l'identique
(vérifié par comparaison `cmp` le 2 novembre 2026 et par `tests/emprise.test.mjs` avec
`CERF_CONTOUR=CONTOUR.geojson`).

## Points témoins (lon, lat WGS84 → x, y Lambert 93)

| Point | Lon, lat (source ci-dessous) | x | y | Dans le contour | Dans brut | Dans élargi |
|---|---|---|---|---|---|---|
| Ouessant | -5,08732 ; 48,45920 | 103 123 | 6 848 252 | oui | oui | oui |
| Dunkerque | 2,343125 ; 51,01842 | 653 805 | 7 102 710 | oui | oui | oui |
| Menton | 7,49911 ; 43,79584 | 1 061 953 | 6 309 962 | oui | oui | oui |
| Bonifacio | 9,18772 ; 41,421655 | 1 218 236 | 6 055 860 | oui | oui | oui |
| Strasbourg | 7,761895 ; 48,569065 | 1 051 113 | 6 840 462 | oui | oui | oui |
| Jersey | -2,125147 ; 49,219184 | 326 828 | 6 914 280 | **non** | **oui** | **oui** |
| Genève | 6,140028 ; 46,210008 | 942 025 | 6 572 608 | **non** | **oui** | **oui** |

**Constat à lire :** la fiche demandait Jersey et Genève « hors du rectangle sans marge ».
Ce n'est pas vrai, et ne peut pas l'être : Jersey (x 326 828) et Genève (y 6 572 608) tombent
dans l'intervalle X et l'intervalle Y de la France, un rectangle ne les écarte pas. Ils sont
bien hors du **contour** (lancer de rayon). Le contrôle de vraisemblance par rectangle
(ADR 0004, « une comparaison de rectangles ») laisse donc passer une couche située dans
ces zones : c'est la valeur sacrifiée déjà écrite (exhaustivité), mais ici elle concerne
des dizaines de kilomètres, pas « quelques dizaines de mètres ». **Question à Pascal :**
accepter, ou compléter le rectangle (par exemple par un contour simplifié ou plusieurs
rectangles) ? Non tranché ici.

Sources des points témoins (tous consultés le 2 novembre 2026, branche `master`, sans numéro de version) :
- Cinq communes : centre de l'emprise de la commune, d'après
  `https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements/<dép>/communes-<dép>.geojson`
  (Finistère 29, entité 29155 Ouessant, emprise lon -5,14026 → -5,03438, lat 48,43567 → 48,48273 ;
  Nord 59, 59183 Dunkerque, 2,23979 → 2,44634, 50,97583 → 51,06059 ;
  Alpes-Maritimes 06, 06083 Menton, 7,46806 → 7,53016, 43,76502 → 43,82666 ;
  Corse-du-Sud 2A, 2A041 Bonifacio, 9,08818 → 9,28726, 41,33363 → 41,50968 ;
  Bas-Rhin 67, 67482 Strasbourg, 7,68793 → 7,83592, 48,49202 → 48,64621).
  Ce sont des centres d'emprise, pas des mairies.
- Genève : `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places_simple.geojson`
  (SHA-256 `fd3fa867a320cbd5c5b6bb5bc550afeec2939fb2cef688e508007282a55ac42f`), entité « Geneva ».
- Jersey : `.../ne_10m_admin_0_map_units.geojson`, unité « Jersey », emprise lon -2,242014 → -2,00829,
  lat 49,171332 → 49,267035 ; centre de l'emprise.

## Sources et URL réellement consultées (2 novembre 2026)

- `https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/metropole.geojson` (contour).
- `https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/README.md` : origine
  (Admin Express COG 2018), simplification, licence (« Voir conditions d'utilisation
  d'Admin Express (Licence ouverte) »). Aucun fichier `LICENSE` à la racine (404).
- Natural Earth (dépôt `nvkelso/natural-earth-vector`, fichiers cités plus haut).
- PROJ 9.8.1 via pyproj 3.8.0 (PyPI).

## Limites dites

- **Contour simplifié** (25 %, `keep-shapes`) : les extrémités réelles de la côte peuvent
  différer de quelques dizaines à centaines de mètres ; non mesuré, **aucune seconde source
  n'a été comparée** (les tracés bruts de 143 Mo n'ont pas été téléchargés). La marge de
  10 km absorbe cet écart ; le rectangle brut n'est pas à utiliser seul.
- Édition 2018 des tracés : la côte bouge peu ; non vérifié sur une édition plus récente.
- Les villes de la liste sont des points d'essai, pas des positions officielles ; la
  vérification des cinq villes par Pascal reste à faire.
- Licence : « Licence ouverte » d'Admin Express, d'après le README ; le contour n'est pas
  recopié dans le dépôt, seul le résultat chiffré l'est.
- Un contour GeoJSON ne couvre pas les îles très au large non listées dans le fichier ;
  l'inclusion des Lavezzi, des Glénan, etc. n'a pas été contrôlée une à une.
- Conforme à ADR 0005 : tests en `node --test` ; le calcul lui-même est en Python (outil
  de bureau, pas du plugin) et son test de relance est ignoré sans `CERF_CONTOUR`.

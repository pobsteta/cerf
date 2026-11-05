# Sources des données versées dans `docs/referentiels/sources/`

## `metropole.geojson` : contour de la France métropolitaine (terre ferme, Corse comprise)

- **Origine des tracés :** IGN, Admin Express COG, édition 2018.
- **Intermédiaire :** dépôt `gregoiredavid/france-geojson`, fichier `metropole.geojson`,
  **commit épinglé `5d34ee6d0140c29f785fdb047d9329f1aab58833`** (tête de `master` au 2 novembre 2026).
  URL : `https://raw.githubusercontent.com/gregoiredavid/france-geojson/5d34ee6d0140c29f785fdb047d9329f1aab58833/metropole.geojson`
- **Traitement par l'intermédiaire :** simplification Mapshaper (Visvalingam pondéré, 25 %),
  coordonnées à 5 décimales, WGS84, ordre lon/lat. Aucune modification par Vision.
- **Licence :** Licence ouverte (Etalab), d'après le README du dépôt (« Voir conditions
  d'utilisation d'Admin Express (Licence ouverte) »). Le dépôt n'a pas de fichier `LICENSE`.
  Attribution : IGN, Admin Express COG 2018.
- **SHA-256 :** `d1f4aec3fbc274d4af3f5930302a342d3efe0ea1daf410fbeef535346167bf0c`
  (608 868 octets) ; vérifié à la récupération et par `outils/emprise.py` à chaque calcul
  (erreur si différent).
- **Usage :** calcul de l'emprise (`outils/emprise.py`, `docs/referentiels/emprise-metropole.md`).

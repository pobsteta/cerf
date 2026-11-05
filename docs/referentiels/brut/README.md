# Pièces brutes

Source : IGN, Géoplateforme (data.geopf.fr), mesurée le 2 novembre 2026 (mission 019,
`outils/mesure-fonds.sh`). Attribution : « © IGN ». Conditions : CGU de cartes.gouv.fr
(https://cartes.gouv.fr/cgu), auxquelles renvoie le GetCapabilities.

La première ligne des fichiers `*.entetes.txt` (`HTTP/1.1 200 Connection Established`) et
l'en-tête `x-iplb-request-id` viennent du proxy de la session de mesure, pas de l'IGN.

Mission 045 (5 novembre 2026, 13:49Z) : tuiles du cadastre `CADASTRALPARCELS.PARCELLAIRE_EXPRESS` (zoom 15, 19, 20),
même source, mêmes conditions, mesurées depuis la session du développeur. Dates et URL dans `mesure-dates-cadastre.txt`.
Aucune pièce OpenStreetMap ni OpenTopoMap : leurs domaines sont refusés par la politique réseau de la session.

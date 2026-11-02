#!/usr/bin/env bash
# Mission 019 : refait la mesure des fonds IGN (GetCapabilities WMTS + une tuile par fond
# avec ses en-têtes HTTP) dans docs/referentiels/brut/. Nécessite le réseau et curl.
# Sources : docs/spec.md § 3.4, ADR 0002. Aucune clé n'est utilisée.
set -euo pipefail
cd "$(dirname "$0")/.."
SORTIE=docs/referentiels/brut
BASE=https://data.geopf.fr/wmts
# Tuile de mesure : zoom 15, x=16629, y=11336 (matrice PM, Web Mercator),
# qui contient 48,40 N 2,70 E (Seine-et-Marne).
Z=15; X=16629; Y=11336
mkdir -p "$SORTIE"
: > "$SORTIE/mesure-dates.txt"

# Récupère une URL : corps dans $2, en-têtes dans $3, trace (date UTC, fichier, URL exacte)
# dans mesure-dates.txt.
prendre() {
  local url=$1 corps=$2 entetes=$3
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)  $corps  $url" >> "$SORTIE/mesure-dates.txt"
  curl -sS --fail -o "$SORTIE/$corps" -D "$SORTIE/$entetes" "$url"
}

prendre "$BASE?SERVICE=WMTS&REQUEST=GetCapabilities&VERSION=1.0.0" getcapabilities.xml getcapabilities.entetes.txt
prendre "$BASE?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX=$Z&TILEROW=$Y&TILECOL=$X&FORMAT=image/png" tuile-planignv2.png tuile-planignv2.entetes.txt
prendre "$BASE?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX=$Z&TILEROW=$Y&TILECOL=$X&FORMAT=image/jpeg" tuile-orthophotos.jpg tuile-orthophotos.entetes.txt
echo "Mesure refaite, pièces dans $SORTIE"

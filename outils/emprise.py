#!/usr/bin/env python3
"""Emprise de la terre ferme de France métropolitaine en Lambert 93 (EPSG:2154).

Mission 002, spec § 4. Lit un contour GeoJSON en WGS84 (EPSG:4326, ordre lon/lat,
RFC 7946), reprojette avec PROJ (pyproj) chaque sommet et des points intermédiaires
sur chaque arête (densification), et rend l'emprise brute et l'emprise élargie.

Usage : python3 -I outils/emprise.py [CONTOUR.geojson] [--marge 10000]
        (sans argument : le contour versé docs/referentiels/sources/metropole.geojson)
        python3 -I outils/emprise.py --telecharger CONTOUR.geojson   (réseau)

Le contour est versé au dépôt (docs/referentiels/sources/, avec sa source et sa licence) ;
son empreinte SHA-256 est vérifiée (EMPREINTE_ATTENDUE) : si elle diffère, le script
sort en erreur (code 2) sans rien calculer.
Dépendance : pyproj, version fixée dans outils/requirements.txt.
Licence du script : GPL-3.0-or-later (ADR 0006).
"""
import argparse
import hashlib
import json
import math
import os
import sys
import urllib.request

import pyproj

URL_CONTOUR = ("https://raw.githubusercontent.com/gregoiredavid/france-geojson/"
               "5d34ee6d0140c29f785fdb047d9329f1aab58833/metropole.geojson")  # commit épinglé
CONTOUR_PAR_DEFAUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..",
                                  "docs", "referentiels", "sources", "metropole.geojson")
EMPREINTE_ATTENDUE = "d1f4aec3fbc274d4af3f5930302a342d3efe0ea1daf410fbeef535346167bf0c"
MARGE_M = 10_000
PAS_DENSIFICATION_M = 1_000  # un point intermédiaire environ tous les 1 km sur chaque arête

# Points témoins (lon, lat en WGS84, ordre lon/lat). Cinq communes : centre de l'emprise
# de la commune dans les contours communaux de france-geojson (même source que le contour).
# Genève : Natural Earth ne_10m_populated_places_simple. Jersey : centre de l'emprise de
# l'unité ne_10m_admin_0_map_units. Détail : docs/referentiels/emprise-metropole.md.
VILLES_DEDANS = {
    "Ouessant": (-5.08732, 48.45920),
    "Dunkerque": (2.343125, 51.01842),
    "Menton": (7.49911, 43.79584),
    "Bonifacio": (9.18772, 41.421655),
    "Strasbourg": (7.761895, 48.569065),
}
VILLES_DEHORS = {
    "Jersey": (-2.125147, 49.219184),
    "Genève": (6.140028, 46.210008),
}

def sha256(chemin):
    with open(chemin, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def anneaux(geom):
    """Rend tous les anneaux (listes de [lon, lat]) d'un Polygon ou MultiPolygon."""
    if geom["type"] == "Polygon":
        polys = [geom["coordinates"]]
    elif geom["type"] == "MultiPolygon":
        polys = geom["coordinates"]
    else:
        raise ValueError("géométrie inattendue : " + geom["type"])
    for poly in polys:
        for anneau in poly:
            yield anneau


def geometries(donnees):
    if donnees["type"] == "FeatureCollection":
        for f in donnees["features"]:
            yield f["geometry"]
    elif donnees["type"] == "Feature":
        yield donnees["geometry"]
    else:
        yield donnees


def transformeur():
    # always_xy : ordre explicite (x = lon / Est, y = lat / Nord) en entrée et en sortie.
    return pyproj.Transformer.from_crs("EPSG:4326", "EPSG:2154", always_xy=True)


def emprise_brute(donnees):
    t = transformeur()
    xs, ys, nb_sommets, nb_anneaux = [], [], 0, 0
    for g in geometries(donnees):
        for anneau in anneaux(g):
            nb_anneaux += 1
            nb_sommets += len(anneau)
            for (lo0, la0), (lo1, la1) in zip(anneau, anneau[1:]):
                x0, y0 = t.transform(lo0, la0)
                x1, y1 = t.transform(lo1, la1)
                n = max(1, math.ceil(math.hypot(x1 - x0, y1 - y0) / PAS_DENSIFICATION_M))
                for i in range(n + 1):
                    f = i / n
                    x, y = t.transform(lo0 + (lo1 - lo0) * f, la0 + (la1 - la0) * f)
                    xs.append(x)
                    ys.append(y)
    return {"xmin": min(xs), "xmax": max(xs), "ymin": min(ys), "ymax": max(ys),
            "sommets": nb_sommets, "anneaux": nb_anneaux}


def arrondi(e, marge):
    """Arrondit vers l'extérieur au mètre entier (le rectangle ne rétrécit jamais)."""
    return {"xmin": math.floor(e["xmin"] - marge), "xmax": math.ceil(e["xmax"] + marge),
            "ymin": math.floor(e["ymin"] - marge), "ymax": math.ceil(e["ymax"] + marge)}


def dans(rect, x, y):
    return rect["xmin"] <= x <= rect["xmax"] and rect["ymin"] <= y <= rect["ymax"]


def dans_contour(donnees, lon, lat):
    """Point dans le contour (WGS84, ordre lon/lat), lancer de rayon ; trous exclus."""
    def dans_anneau(anneau):
        dedans = False
        for (x0, y0), (x1, y1) in zip(anneau, anneau[1:]):
            if (y0 > lat) != (y1 > lat) and lon < (x1 - x0) * (lat - y0) / (y1 - y0) + x0:
                dedans = not dedans
        return dedans
    for g in geometries(donnees):
        polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        for poly in polys:
            if dans_anneau(poly[0]) and not any(dans_anneau(t) for t in poly[1:]):
                return True
    return False


def calculer(chemin, marge=MARGE_M):
    with open(chemin, encoding="utf-8") as f:
        donnees = json.load(f)
    e = emprise_brute(donnees)
    return {"brute": arrondi(e, 0), "elargie": arrondi(e, marge), "marge_m": marge,
            "sommets": e["sommets"], "anneaux": e["anneaux"]}


def point_l93(lon, lat):
    return transformeur().transform(lon, lat)


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("contour", nargs="?", default=CONTOUR_PAR_DEFAUT)
    p.add_argument("--marge", type=int, default=MARGE_M)
    p.add_argument("--telecharger", action="store_true")
    a = p.parse_args(argv)
    if a.telecharger:
        urllib.request.urlretrieve(URL_CONTOUR, a.contour)
    h = sha256(a.contour)
    if h != EMPREINTE_ATTENDUE:
        print("ERREUR : empreinte du contour différente de celle attendue (" +
              EMPREINTE_ATTENDUE + ") : " + h, file=sys.stderr)
        return 2
    r = calculer(a.contour, a.marge)
    with open(a.contour, encoding="utf-8") as f:
        donnees = json.load(f)
    r["crs"] = pyproj.CRS.from_epsg(2154).name
    r["sha256_contour"] = h
    r["pyproj"] = pyproj.__version__
    r["proj"] = pyproj.proj_version_str
    r["villes"] = {}
    for nom, (lon, lat) in {**VILLES_DEDANS, **VILLES_DEHORS}.items():
        x, y = point_l93(lon, lat)
        r["villes"][nom] = {"x": round(x), "y": round(y),
                            "dans_brute": dans(r["brute"], x, y),
                            "dans_elargie": dans(r["elargie"], x, y),
                            "dans_contour": dans_contour(donnees, lon, lat)}
    print(json.dumps(r, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())

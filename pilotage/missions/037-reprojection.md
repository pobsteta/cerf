# Mission 037 — Reprojection de l'emprise depuis un système reconstruit par son nom (plugin 0.3.3)

> Fiche rédigée par Claude (orchestrateur) le 4 novembre 2026. **Statut : validée par Pascal le
> 4 novembre 2026** (« oui, lance la 037 »).

## Mission

**En une phrase :** Sur le Samsung, le plugin 0.3.2 refuse les quatre GeoJSON CRS84 de
`essai-manuel-geojson.zip` au contrôle 5 (« Coordonnées incohérentes : système mal déclaré ? »),
alors qu'ils sont à Fontainebleau ; le prototype n° 2 avait réussi en passant à
`GeometryUtils.reprojectPoint` un système construit par QField (`wgs84Crs()`), le plugin passe
l'objet `couche.crs` ; donner au refus un détail de diagnostic (authid, emprise d'origine, emprise
reprojetée ou erreur) et reprojeter depuis `CoordinateReferenceSystemUtils.fromDescription(authid)`
(repli : l'objet de la couche), sans affaiblir le contrôle 5.

**Redite par l'agent :** à remplir.

## Harnais

- **Agent :** `dev` (sonnet), tests compris. Branche `mission/037-reprojection`, depuis `main`.
- **Doit :** test qui fige le chemin (fromDescription d'abord, repli ensuite) ; test que le GeoJSON
  Lambert 93 sans `crs` reste refusé au contrôle 5 ; détail de diagnostic court, sur une ligne à
  part, sans changer le texte du message de la spec § 4 ; plugin 0.3.3 ; préversion `plugin-essai`.
- **Ne doit pas :** élargir le rectangle de vraisemblance ; changer les autres contrôles.

## Terrain

- Pascal importe `essai-manuel-geojson.zip` avec la préversion 0.3.3 : les quatre couches chargées ;
  sinon la ligne de diagnostic dit pourquoi.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal. **Qui tranche :** Pascal.

# Mission 034 — Système de coordonnées jugé valide d'après ce que QML voit (plugin 0.3.2)

> Fiche rédigée par Claude (orchestrateur) le 4 novembre 2026. **Statut : validée par Pascal le
> 4 novembre 2026** (« oui aux deux »).

## Mission

**En une phrase :** Corriger `decrireCouche` (`plugin/Cerf.qml`), qui lit `crs.isValid`, propriété
que QGIS n'expose pas à QML (QGIS 3a92eb3, `qgscoordinatereferencesystem.h` l. 218-223 et 588 :
seuls `mapUnits`, `isGeographic`, `authid`, `description`), si bien que toute couche est refusée
« système de coordonnées inconnu » sur le Samsung ; juger le système valide quand `authid` ou
`description` n'est pas vide, sans affaiblir les contrôles 1 et 3 (spec § 4).

**Redite par l'agent :** à remplir.

## Harnais

- **Agent :** `dev` (sonnet), tests compris. Branche `mission/034-crs-valide`, depuis `main`.
- **Doit :** test qui fige la règle de validité ; test de forme qui interdit dans `Cerf.qml` toute
  lecture d'une propriété du système de coordonnées absente de la liste exposée à QML ; mocks des
  tests existants qui fournissent `isValid` revus pour ne fournir que ce que QML voit (sans
  affaiblir) ; plugin 0.3.2 ; préversion `plugin-essai` depuis la branche.
- **Ne doit pas :** changer les textes des messages ; toucher d'autres contrôles.

## Terrain

- Pascal importe `essai-manuel.zip` (ou sa version GeoJSON, mission 035) avec la préversion 0.3.2 :
  le GeoJSON ProdBois doit être chargé ; `piege.zip` : le GeoJSON en Lambert 93 sans `crs` reste
  refusé (contrôle 5, emprise).

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal. **Qui tranche :** Pascal.

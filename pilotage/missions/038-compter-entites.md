# Mission 038 — Compter les entités par un itérateur (contrôle 4 sur l'appareil, plugin 0.3.4)

> Fiche rédigée par Claude (orchestrateur) le 4 novembre 2026. **Statut : validée par Pascal le
> 4 novembre 2026** (« oui, lance la 038 »).

## Mission

**En une phrase :** `decrireCouche` (`plugin/Cerf.qml`) appelle `couche.featureCount()`, qui n'est ni
Q_PROPERTY ni Q_INVOKABLE (QGIS 3a92eb3, `qgsvectorlayer.h` l. 1701 ; déjà noté dans
`prototype/PLAN.md` l. 89) : sur l'appareil l'appel lève, `nbEntites` vaut -1, le contrôle 4 ne se
déclenche jamais et une couche vide est refusée au contrôle 5 ; compter les entités par
`LayerUtils.createFeatureIterator` comme le prototype n° 2, pour que la couche vide soit chargée avec
l'avertissement « couche vide » (spec § 4).

**Redite par l'agent :** à remplir.

## Harnais

- **Agent :** `dev` (sonnet), tests compris. Branche `mission/038-compter-entites`, **depuis
  `mission/037-reprojection`** (même fonction `decrireCouche`) : la PR #34 doit être fusionnée avant.
- **Doit :** test du comptage (couche vide, couche non vide, itérateur qui lève = illisible, pas
  « vide ») ; test de forme qui interdit `featureCount` dans `Cerf.qml` ; plugin 0.3.4 ; préversion.
- **Ne doit pas :** changer les autres contrôles ni leurs textes.

## Terrain

- Zip piégé : `UG_vide.geojson` chargé avec l'avertissement « couche vide ».

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal. **Qui tranche :** Pascal.

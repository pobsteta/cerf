# Mission 049 — Libérer les couches invalides ouvertes par le chargeur des zips

> Fiche rédigée par Claude (orchestrateur) le 5 novembre 2026, à la demande de Pascal (« oui, lance
> la mission pour la fuite »). **Statut : validée par Pascal le 5 novembre 2026.** Défaut signalé par
> le relecteur et le dev de la mission 048.

## Mission

**En une phrase :** Dans `plugin/Cerf.qml`, le chargeur des couches d'un zip (vecteur par
`LayerUtils.loadVectorLayer`, GeoTIFF par `LayerUtils.loadRasterLayer`) ne fait pas `deleteLater()`
d'une couche invalide ou refusée par un contrôle, alors que QField les crée en `CppOwnership`
(QField v4.3.7 `qflayerutils.cpp`) : libérer toute couche ouverte qui n'est pas ajoutée à la carte
(invalide, refusée, `.json` écarté de la mission 044, doublon), sans rien changer à ce que voit
l'agent (messages, refus, registre identiques).

- Relever chaque chemin où une couche est ouverte puis abandonnée (`cerf-logique.mjs` :
  `ouvertes`, `ouvertesJson`, contrôles, réécriture `saveVectorLayerAs` puis rechargement depuis
  `cerf-imports/`, réimport) et la libérer une seule fois, jamais une couche ajoutée au projet.
- Plugin **0.4.4** ; préversion `plugin-essai`.

## Harnais

- **Agent :** `dev`, tests compris. Branche `mission/049-fuite-couches`, depuis `main`.
- **Doit :** tests (une couche refusée, invalide, écartée ou en double est libérée exactement une
  fois ; une couche chargée ne l'est jamais) ; sources citées ; aucun texte nouveau ; aucun test
  affaibli.
- **Ne doit pas :** changer un message, un contrôle ou le registre ; journal, kanban.

## Terrain

Rien de visible attendu : réimporter `essai-manuel.zip` et `piege.zip` sur le Samsung donne les
mêmes couches et les mêmes messages qu'en 0.4.3.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal. **Qui tranche :** Pascal.

**Redite par l'agent :** à remplir.

# Mission 027 — Prototype n° 3 : couche réécrite par saveVectorLayerAs, puis stylée

> Fiche rédigée par Claude (orchestrateur) le 4 novembre 2026, après la critique de l'ADR
> 0008 et la décision de Pascal (« essai court d'abord »). **Statut : décidée par Pascal le
> 4 novembre 2026.**

## Mission

**En une phrase (quoi, et pourquoi) :** Ajouter au prototype n° 2 quelques boutons qui ouvrent en /vsizip/ une couche d'un zip compressé (Shapefile, GeoJSON, GeoPackage à deux tables), la réécrivent dans cerf-imports/ par LayerUtils.saveVectorLayerAs, écrivent son .qml à côté et la chargent, avec la mesure du temps, pour que Pascal voie sur le Samsung si cette voie évite le décompresseur de la mission 026.

**Redite par l'agent :** _à remplir par l'agent avant de commencer._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase ? | oui | confier |
| Sait-il comment faire ? | oui — prototype n° 2, sources QField 4.3.7 (`qflayerutils.h/.cpp`), critique du contradicteur (ADR 0008) | confier |
| A-t-il les moyens ? | oui — l'essai revient à Pascal sur le Samsung | appuyer : plan court d'abord |

**Temps de la main :** tenir — le résultat décide de l'ADR 0008 et du sort de la 026.

## L'Homme

- **Agent :** `dev` (opus).

## Harnais

- **Peut :** compléter `prototype-2/` (boutons, logique, zip d'essai **compressé** fabriqué
  par `node:zlib` dans l'outil de fabrication, protocole `tests/recette/prototype-2.md` en
  section « Prototype n° 3 »), ses tests, le workflow de la préversion (flashcodes compris).
- **Ne doit pas :** toucher à `plugin/`, au brief, à la spec, aux ADR, au journal ; effacer hors
  de `<projet>/cerf-imports/`.

## Questions à poser à l'appareil

1. `saveVectorLayerAs` d'un Shapefile lu en `/vsizip/` dans un zip **compressé** vers
   `cerf-imports/…/UG.gpkg` : le fichier est-il écrit, avec ses entités, son système (2154)
   et ses accents (`.cpg`) ? Combien de temps ?
2. `.qml` écrit à côté puis chargement : couleurs et étiquettes du manuel ?
3. GeoPackage à deux tables : chaque table réécrite dans son fichier, chacune stylée ?
4. GeoJSON compressé : même chose.
5. Quels fichiers annexes apparaissent (`-wal`, `-shm`) ? Peut-on les effacer par `rmFile`
   après retrait de la couche ?

## Dépend de / rouge attendu jusqu'à

- 023. CI : pas de rouge attendu.

## Terrain

- **Échantillon que Pascal vérifiera :** les cinq questions sur le Samsung, en mode avion.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal. **Qui tranche :** Pascal.

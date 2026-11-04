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

## Décisions de Pascal sur le plan (4 novembre 2026)

Plan `prototype-2/PLAN-3.md` (bc92fdf) **validé avec ses sept réponses** : jeu de 2 000
entités (bouton 9b) ; nouveau zip `essai-styles-z.zip`, l'ancien inchangé ; même projet
`cerf-essai-2` et même préversion `prototype-2` (sha dans les notes) ; « Étang » et « Forêt »
dans le `.dbf` ; dossier neuf `q3-<N>` par appui ; pas d'essai de chemin non inscriptible ;
protocole en section « Prototype n° 3 » de `tests/recette/prototype-2.md`, relu par le testeur.

## Remarques à reprendre (aller-retour 1/3, 4 novembre 2026)

**Relecteur :** code conforme (588/588, gardes, `isValid` avant, `.qml` avant chargement, zip
en méthode 8, ancien zip inchangé). À reprendre :
1. **Préversion** : notes périmées (bc92fdf) ; le prochain push doit la republier ; vérifier
   notes (sha du commit, sha256 de `essai-styles-z.zip`, ligne `/vsizip/`).
2. **Faux oui** : les couches du prototype n° 2 (`UG_q1` bleue à `carres(-800,0)`,
   `Parcelles_q3` orange à `carres(0,0)`) sont aux mêmes endroits et couleurs que les copies du
   prototype n° 3. **Décaler les emprises** du zip compressé (fabrication), et consigne au
   protocole : décocher ou retirer les couches précédentes, vérifier la carte vide à l'endroit.
3. Bouton 12 : il mesure un **coût fixe** sur quatre petites couches, pas la règle des
   2 minutes du brief (Serre_EA2026) : changer le libellé (« coût fixe par couche »), sans
   verdict « limite du brief tenue ».
4. Mineur : harmoniser la place du bouton 11 dans le texte.

**Testeur (protocole P3, lignes 372 à 538), onze corrections :**
1. P3-1 case 1 : ordre des lignes comme à l'écran (« Champ nom relu » avant « écrit : oui »).
2. « N > 0 » aussi pour 9 et 10 ; « aucune ligne ÉCHEC, fond non rouge » pour cocher.
3. « Lecture du champ nom : ERREUR » : ne pas cocher, réponse « non », vérifier par la fiche de
   l'entité (« Vu autrement »).
4. Faux oui (voir relecteur 2) : ne laisser visible que la couche du moment avant P3-2 et
   P3-4 ; consigne faisable avec des gants.
5. « Essai raté » seulement si la copie n'est pas chargée (source qui ne charge pas, chaîne
   vide, « écrit : NON ») ; sinon répondre d'après la carte ; même règle à P3-3 et P3-4b.
6. P3-3 : deux captures `p3-q3a-carte.png` (Parcelles) et `p3-q3b-carte.png` (Zones), dans la
   table Réponses.
7. P3-5 : cocher seulement si « Fichiers présents » ≥ 2 (un `.gpkg` et un `.qml` de taille
   > 0 avant effacement) et des lignes « rmFile » ; toucher le 11 une fois par dossier ; ordre
   fixé (8, 10, 9, puis 11 sur le dossier du 9) ; l'effacement porte sur le dernier dossier ;
   ne pas toucher le 11 après 9b ni 12.
8. « Chaque bouton une fois » : excepter le 12.
9. P3-6 : rappuyer jusqu'à voir « Médiane des trois derniers » ; relever les trois totaux et
   vérifier la médiane ; « durée illisible » ou 0 ms n'est pas une mesure ; « oui » = case 2 et
   aucun ÉCHEC sur les trois appuis ; séparer l'attendu (« 2000 entités ») du relevé.
10. Redescendre au bas de l'écran après chaque appui ; 9b et 12 figent l'écran : attendre, et
    choisir « Attendre » si Android le propose.
11. Bouton 0b en échec : « essai raté » partout, capture, s'arrêter ; couvrir « le zip compressé
    n'est pas là » dans la définition d'« essai raté ».

## Résultat de l'essai (Pascal, Samsung, QField 4.3.7, prototype 2.3.0, 4 novembre 2026)

Essai fait pas à pas, en mode avion, avec `essai-styles-z.zip` (8 entrées compressées).

| Réponse | Question | Résultat |
|---|---|---|
| 0b | zip compressé copié, non extrait | **oui** (8 entrées compressées) |
| P3-1 | Shapefile compressé réécrit par `saveVectorLayerAs` | **oui** (« Étang », « Forêt » lus) |
| P3-2a | copie stylée par le `.qml` écrit par le plugin : couleurs | **oui** (contour vert-bleu) |
| P3-3a / P3-3b | GeoPackage à deux tables, un fichier et un style par table | **oui / oui** (Parcelles orange, Zones bleues) |
| P3-4a / P3-4b | GeoJSON compressé réécrit et stylé | **oui / oui** (UG bleu, étiquettes) |
| P3-5 | annexes effacées après retrait | **oui** (« tout effacé ») |
| P3-6 | durées : médiane du bouton 12 affichée | **oui** (valeurs à relever) |

À compléter par Pascal : étiquettes de P3-2b et P3-3 ; nombre de fichiers présents et annexes vues
(P3-5) ; durées du 9b et totaux du 12.

**Conséquence, à trancher par Pascal :** la voie « ouvrir en `/vsizip/`, réécrire par
`saveVectorLayerAs` dans `cerf-imports/`, écrire le `.qml`, charger » tient sur le Samsung pour
les Shapefile, GeoPackage et GeoJSON compressés : le décompresseur de la mission 026 n'est plus
nécessaire pour les vecteurs.

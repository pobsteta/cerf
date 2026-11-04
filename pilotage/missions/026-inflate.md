# Mission 026 — Décompresseur (inflate) en JavaScript pour les zips de JFC

> Fiche rédigée par Claude (orchestrateur) le 4 novembre 2026, après l'essai du prototype
> n° 2 et la décision de Pascal (« oui, mission à part »). **Statut : décidée par Pascal le
> 4 novembre 2026 ; fiche à valider (porte n° 2).**

## Mission

**En une phrase (quoi, et pourquoi) :** Écrire pour Cerf, en JavaScript sans dépendance, un décompresseur des entrées « deflate » d'un zip (RFC 1951), lisible par QML et par Node, pour que le plugin sorte du zip compressé de JFC les couches à styler (ADR 0008).

**Redite par l'agent :** _à remplir par l'agent avant de commencer._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase ? | oui | confier |
| Sait-il comment faire ? | oui — RFC 1951 (deflate), APPNOTE de PKWARE (zip), lecteur de zip du prototype n° 2 | confier |
| A-t-il les moyens ? | oui — `node:zlib` sert d'oracle dans les tests (jamais dans le plugin) ; zips de recette de la 016 | confier |

**Temps de la main :** appuyer (testeur puis dev, une branche, une PR).

## L'Homme

- **Agents :** `testeur` (sonnet) puis `dev` (opus).

## Harnais

- **Peut :** écrire `plugin/cerf-zip.mjs` (ou équivalent, sans import), ses tests ; code écrit
  pour Cerf, rien de recopié (GPL-3.0-or-later).
- **Ne doit pas :** ajouter une dépendance ; brancher l'extraction dans l'import (c'est la
  mission suivante, après l'acceptation de l'ADR 0008) ; toucher à `main`.

## Ce qui est attendu

- `inflate(octets)` : blocs stockés, Huffman fixes et dynamiques ; refus clair d'une entrée
  corrompue (CRC32 vérifié), d'une méthode autre que 0 ou 8, d'un zip chiffré, d'une taille
  qui dépasse un plafond (zip bombe).
- Extraction d'une entrée d'un zip lu par `FileUtils.readFileContent` (comme le prototype).
- Mesure : temps d'extraction d'un GeoJSON de 10 Mo et du GeoTIFF du zip `lourd` sous Node
  (le Samsung sera plus lent : à mesurer en recette).

## Dépend de / rouge attendu jusqu'à

- 023 (prototype n° 2) ; CI rouge attendue sur les tests du testeur jusqu'au commit du dev.

## Terrain

- **Échantillon que Pascal vérifiera :** le zip `Serre_EA2026` compressé, extrait sur le
  Samsung (avec la mission de branchement).

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal. 3 allers-retours. **Qui tranche :** Pascal.

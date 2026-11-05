# Mission 041 — Spec et README : décisions du 5 novembre après la mission 024

> Fiche rédigée par Claude (orchestrateur) le 5 novembre 2026, à la demande de Pascal (« lance
> l'archiviste »). **Statut : validée par Pascal le 5 novembre 2026** (décisions du journal,
> lignes du 4 et du 5 novembre sur la mission 024).

## Mission

**En une phrase :** Porter dans `docs/spec.md` (§ 4 et § 5) et dans `README.md` les trois
décisions de Pascal du 5 novembre 2026, sans toucher au code :

1. **`.qml` posé dans le zip : non pris en charge pour l'instant.** `FileUtils.readFileContent`
   ne lit pas dans `/vsizip/` (QField 4.3.7, `qffileutils.cpp` l. 620-636) : le `.qml` du zip
   n'est jamais lu ; la règle du manuel s'applique, avec l'avertissement que donne le code
   aujourd'hui (texte à lire dans `plugin/cerf-logique.mjs`, il fait foi). L'ordre de priorité
   du § 5 et le README (« un `.qml` du même nom… remplace la règle ») sont à corriger ; garder
   une trace datée que la surcharge par `.qml` est **reportée**, pas abandonnée (CLAUDE.md la
   cite encore : le signaler à l'orchestrateur, ne pas modifier CLAUDE.md).
2. **Nouveau message validé** : « Aucune couche GeoJSON, Shapefile, GeoPackage ou GeoTIFF dans
   x.zip. » (texte exact du code à vérifier), à porter au § 4 et dans le README.
3. **« aucune table vecteur »** : accepté tel quel, **probablement inatteignable** (la requête
   exige la couche 0 que la sonde ouvre, `qgsogrprovider.cpp` l. 4513-4523) ; un GeoPackage à
   table attributaire seule donne « tables illisibles ». Mettre à jour le passage « GeoPackage
   sans table lisible » du § 4 : la lecture des tables est tranchée (voie 1 du prototype n° 4,
   mission 024, `SELECT … FROM gpkg_contents`), **non encore prouvée sur le Samsung**
   (`essai-tables-z.zip` à essayer) ; retirer « À l'étude, non tranché ici » et la note
   « tables inconnues » en attente si le code les a rangées.

Mettre aussi le README à jour sur ce que l'essai du 5 novembre a confirmé : Shapefile lu sur
l'appareil avec le plugin 0.4.0 (journal du 5 novembre).

**Redite par l'agent :** à remplir.

## Moyens

- `docs/spec.md` § 4, § 5 ; `README.md` ; `plugin/cerf-logique.mjs` (textes des messages, qui font
  foi) ; ADR 0008 ; fiche 024 ; journal des 4 et 5 novembre (lignes 323 à 328).
- Tests : `node --test` (les tests du README existants doivent rester verts ; en ajouter si un
  test vérifie déjà le texte du README).

## Harnais

- **Agent :** `archiviste`. Branche `mission/041-spec-readme`, depuis `main`.
- **Ne doit pas :** toucher au code du plugin ; inventer un message (copier ceux du code) ;
  copier la spec dans le README (un lien plutôt qu'une copie) ; modifier CLAUDE.md ou le journal
  (l'orchestrateur s'en charge) ; mettre une clé ou une donnée de l'ONF.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal (PR vers `main`).

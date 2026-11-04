# Mission 031 — Effacer au retrait les fichiers réécrits d'une couche

> Fiche rédigée par Claude (orchestrateur) le 4 novembre 2026. **Statut : validée par Pascal le
> 4 novembre 2026** (« oui à tout » : la mission de nettoyage s'ouvre maintenant). Elle part
> après la fusion de la 010 (PR #18).

## Mission

**En une phrase (quoi, et pourquoi) :** Quand l'agent retire une couche, ou qu'une couche sort
du registre au réimport, effacer ses fichiers réécrits dans `cerf-imports/<nom du zip sans .zip>/`
(`.gpkg`, `.qml`, `-wal`, `-shm`, `.aux.xml`) comme le dit l'ADR 0007 amendée, pour que
l'appareil ne garde pas de fichiers orphelins.

**Redite par l'agent :** à remplir.

## Moyens

- ADR 0007 amendée (029), ADR 0008, spec § 3.3 ; fiche 027, résultat P3-5 (annexes effaçables
  par `rmFile` après retrait) ; relecture de la 010 (point 2 : `retirerCouche` n'efface que la
  copie du zip).
- Hors champ : le dossier vide et le remplacement du dossier entier au réimport restent une
  question ouverte de la 014.

## Harnais

- **Agents :** `testeur` (tests d'abord, sans lire le code), puis `dev` (sonnet).
- **Ne doit pas :** effacer hors de `<projet>/cerf-imports/` ; effacer un fichier qu'une autre
  couche du registre utilise encore.

## Dépend de / rouge attendu jusqu'à

- 010 fusionnée. Rouge attendu : les tests du testeur, jusqu'au dev.

## Terrain

- Sur le Samsung : importer `Serre_EA2026`, retirer FRT, vérifier dans le gestionnaire de
  fichiers que `FRT.gpkg` et `FRT.qml` ont disparu et que les autres couches restent.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal. 3 allers-retours. **Qui tranche :** Pascal.

## Arbitrages de Pascal (4 novembre 2026)

- Effacement raté au retrait : « `Fichiers restés sur l'appareil : a.gpkg, a.qml.` » (noms
  réellement restés). À porter dans la spec § 9 n° 2 avec la PR de la mission.
- Annexes : `<couche>.gpkg-wal`, `<couche>.gpkg-shm`, `<couche>.gpkg.aux.xml` (relevé P3-5 non noté).

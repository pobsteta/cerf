# Mission 029 — Amender l'ADR 0003, l'ADR 0007 et la spec après l'ADR 0008

> Fiche écrite après coup par Claude (orchestrateur) le 4 novembre 2026, pour la trace : la
> mission a été confiée sur la consigne de Pascal (« lance les trois points »).
> **Statut : terminée, fusionnée avec la PR #22 le 4 novembre 2026.**

## Mission

**En une phrase :** Amender l'ADR 0003, l'ADR 0007 et la spec (§ 3.1, 3.3, 3.5, 5) pour qu'elles
disent la voie de l'ADR 0008 (couche contrôlée en `/vsizip/`, réécrite en GeoPackage dans
`cerf-imports/<nom du zip sans .zip>/`, `.qml` voisin, GeoTIFF lus dans le zip), afin que le dev
de la 010 et de la 024 n'ait qu'une source.

## Harnais

- **Agent :** `archiviste` (sonnet). Branche `mission/029-amendements-adr-0008` (499613b).
- **Relecteur :** `relecteur` (1 aller-retour), puis Pascal. Détail au journal du 4 novembre.

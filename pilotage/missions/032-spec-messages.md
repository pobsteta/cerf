# Mission 032 — Spec § 4 et ADR 0008 : messages au chemin complet, GeoPackage, ancien .qml

> Fiche rédigée par Claude (orchestrateur) le 4 novembre 2026, d'après les arbitrages de Pascal
> du jour (journal). **Statut : validée par Pascal le 4 novembre 2026** (« oui aux trois »).

## Mission

**En une phrase :** Porter dans la spec (§ 4, § 3.3, § 5 au besoin) et dans l'ADR 0008 (section
datée, rien effacé) les arbitrages de Pascal du 4 novembre (nom des messages = chemin complet dans
le zip ; refus « tables illisibles » et « aucune table vecteur » d'un GeoPackage ; ancien `.qml`
effacé avant l'écriture, couche refusée s'il ne s'efface pas, style par défaut dit si l'écriture
échoue), pour que la spec redevienne la source unique avant le dev de la 024.

**Redite par l'agent :** à remplir.

## Harnais

- **Agent :** `archiviste` (sonnet). Branche `mission/032-spec-messages`, depuis `main`.
- **Moyens :** journal du 4 novembre, fiches 010 et 024 (sections « Arbitrages de Pascal »),
  messages exacts du code de la 010 (`origin/mission/010-styles`) et des tests de la 024
  (`origin/mission/024-lecture-formats`).
- **Ne doit pas :** changer le code ou les tests ; trancher une question nouvelle (la poser).

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal. 3 allers-retours. **Qui tranche :** Pascal.

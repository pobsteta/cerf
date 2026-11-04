# Mission 039 — README : installer le projet, le plugin, et charger un zip

> Fiche rédigée par Claude (orchestrateur) le 4 novembre 2026, à la demande de Pascal (« ajoute dans
> le readme comment installer le projet, le plugin et charger un zip contenant autant de fichiers
> qu'on veut »). **Statut : validée par Pascal le 4 novembre 2026.**

## Mission

**En une phrase :** Écrire à la racine un `README.md` en français, lisible par un agent de terrain et
par un successeur, qui dit comment installer le projet `cerf.qgz` (release `projet-modele`,
flashcode), installer le plugin Cerf (release stable « latest », flashcode, « Install plugin from
URL »), et charger un zip qui contient plusieurs couches (formats lus aujourd'hui, règles de
nommage pour les styles, annexes ignorées, limites : plafond de listage, noms en double, lecture
seule, retrait), sans rien promettre que le plugin ne fasse pas encore (Shapefile, GeoPackage et
GeoTIFF : mission 024).

**Redite par l'agent :** à remplir.

## Moyens

- `docs/spec.md` (§ 1, § 3, § 4, § 5, § 9), `docs/brief.md`, ADR 0002, 0003, 0007, 0008 ;
  `plugin/PLAN.md` ; workflows de release (adresses et flashcodes) ; journal du 4 novembre (essais
  réussis sur le Samsung, plugin 0.3.4).
- Mise à jour du projet par copie de `cerf.qgz` à la main (mission 028).

## Harnais

- **Agent :** `archiviste` (sonnet). Branche `mission/039-readme`, depuis `main`.
- **Ne doit pas :** copier la spec (un lien plutôt qu'une copie) ; inventer une capacité ; mettre une
  clé ou une donnée de l'ONF.

## Qui veille, qui tranche

- **Relecteur :** `relecteur` (test de la minute et du successeur), puis Pascal.

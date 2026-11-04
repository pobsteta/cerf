# Mission 028 — Noms des fichiers publiés : « plugin-… » et « projet-… »

> Fiche rédigée par Claude (orchestrateur) le 4 novembre 2026, à la demande de Pascal (« nommer
> les fichiers en commençant par projet quand c'est un projet et plugin quand c'est le
> plugin »). **Statut : décidée par Pascal le 4 novembre 2026.**

## Mission

**En une phrase (quoi, et pourquoi) :** Renommer les fichiers publiés pour que leur nom dise ce qu'ils sont (plugin-cerf.zip, projet-cerf.zip, projet-cerf-mise-a-jour.zip ; et pour le prototype plugin-cerf-prototype-2.zip, projet-cerf-essai-2.zip), avec adresses, flashcodes, notes et tests à jour, pour que Pascal et JFC ne confondent plus un plugin et un projet.

**Redite par l'agent :** renommer les fichiers publiés en plugin-cerf.zip, projet-cerf.zip et projet-cerf-mise-a-jour.zip (adresses, flashcodes, notes, tests à jour, plus de flashcode de mise à jour), pour qu'on ne confonde plus plugin et projet.

## Décisions de Pascal (4 novembre 2026)

- Noms : `plugin-cerf.zip` (adresse stable `…/releases/latest/download/plugin-cerf.zip`),
  `projet-cerf.zip` (première installation, `cerf.qgz` + `saisie.gpkg` vide),
  `projet-cerf-mise-a-jour.zip` (`cerf.qgz` seul) ; prototype : `plugin-cerf-prototype-2.zip`,
  `projet-cerf-essai-2.zip`.
- QField nomme le dossier d'un plugin d'après le nom du zip sans version
  (`qfpluginmanager.cpp`, v4.3.7) : `plugin-cerf.zip` s'installe à côté de l'ancien « Cerf »
  (dossier `cerf`), que Pascal désinstalle une fois ; la notice le dira.
- **Mise à jour du projet : copie de `cerf.qgz` à la main** (câble USB) dans le dossier du
  projet. QField importe un projet zippé toujours dans un **dossier neuf**
  (`Imported Projects/<nom>_1`…, `qfappinterface.cpp`, `importUrl`, v4.3.7) : importer le zip
  de mise à jour créerait un autre projet sans les points saisis. Pas de flashcode pour la
  mise à jour ; les notes de la release le disent.

## Harnais

- **Agent :** `dev` (sonnet).
- **Peut :** modifier les deux workflows de release, `outils/flashcodes.mjs`,
  `outils/zips-projet-modele.mjs`, `plugin/empaqueter.mjs` (nom du zip), leurs tests, et les
  adresses citées dans `docs/spec.md` ou `README` si elles existent (signale chaque fichier
  touché).
- **Ne doit pas :** changer le contenu des zips, le décideur, ce qui devient « latest » ;
  toucher à `main` sans PR ; toucher la branche du prototype (l'orchestrateur la mettra à jour
  ensuite).

## Terrain

- Pascal désinstalle l'ancien « Cerf », installe `plugin-cerf.zip` par son flashcode, et
  importe `projet-cerf.zip` par le sien.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal. **Qui tranche :** Pascal.

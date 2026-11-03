# Plan du squelette du plugin (mission 008)

> **Mise à jour du 3 novembre 2026 (version 0.1.1)** : les copies ne vont plus dans
> `Imported Datasets/cerf/<cerf_id>/` mais dans `<dossier du projet>/cerf-imports/` (repli de
> la spec § 9 n° 1, appliqué par Pascal). Ce qui suit les §§ 1 à 11 sur ce point est remplacé
> par le § 12, n° 9.

> Rédigé par le `dev` le 3 novembre 2026. **Plan seul : aucun code n'est écrit avant
> l'accord de Pascal** (mission tenue). Sources : `docs/spec.md` § 1, § 3.1, § 3.3, § 6,
> § 10 ; ADR 0001, 0003, 0005, 0006, 0007 ; `prototype/PLAN.md` et le code du prototype
> (`prototype/`, code de Cerf, réutilisable) ; tests de la mission 007
> (`tests/squelette.test.mjs`, branche `origin/mission/007-tests-squelette`) ; code de QField.
> Rien n'est lu ni recopié de `qfield-layer-loader` ni de `qfield_addLayer` (ADR 0006).

## 1. La mission en une phrase

Écrire le plugin QField d'application `cerf` qui, dans un projet portant `cerf_id`,
copie un zip choisi par l'agent dans `Imported Datasets/cerf/<cerf_id>/`, y charge ses
couches GeoJSON par `/vsizip/` en lecture seule avec le style par défaut, les inscrit au
registre après chacune, les recharge à chaque ouverture du projet et permet de les retirer,
pour avoir un parcours complet, jugé par les 46 tests de la 007 et par un essai sur le
Samsung, avant de l'enrichir (styles, contrôles, registre complet, panneau).

## 2. Version de référence et ce qui est déjà prouvé

- **Code de QField lu : v4.3.7**, commit `3fb12810b42654c6c45b39d669227d82a25f1fc8`
  (même référence que le prototype). Lien d'une ligne :
  `https://github.com/opengisch/QField/blob/3fb12810b42654c6c45b39d669227d82a25f1fc8/<fichier>#L<n>`.
  **QGIS embarqué** : commit `3a92eb30c83d7d52751a330628d72b8eb9e64876`
  (`vcpkg/ports/qgis/portfile.cmake` L1 de QField). Les deux dépôts ont été lus par
  `git clone` en lecture seule le 3 novembre 2026.
- **Prouvé sur le Samsung de Pascal par le prototype n° 1** (spec § 10 ; journal du
  3 novembre) et réutilisé tel quel :
  1. bouton dans la barre des plugins (`iface.addItemToPluginsToolbar`) et fenêtre posée
     sur `iface.mainWindow().contentItem` ;
  2. lecture de `cerf_id` par `ExpressionContextUtils.projectVariables(qgisProject)` ;
  3. `platformUtilities.applicationDirectory()`, `requestStoragePermission()`, puis
     `getFile(préfixe, "{filename}", "*/*", parent)` qui copie le zip choisi dans
     `<application>/Imported Datasets/cerf/<cerf_id>/` ; fin annoncée par
     `resourceReceived(path)` ;
  4. **lecture des octets de cette copie hors du dossier projet** par
     `FileUtils.readFileContent` puis listage du répertoire central par le module (9 entrées
     sur 9) ; décodage CP437 ; garde du `ArrayBuffer` vide (prototype, § 10 bis n° 6) ;
  5. `FileUtils.fileExists` ; effacement par `platformUtilities.rmFile` (ADR 0007),
     `FileUtils.deleteFiles` refusant les `.zip` ;
  6. `LayerUtils.loadVectorLayer("/vsizip/<copie>/<entrée>", nom)` sur un GeoJSON et un
     Shapefile du zip (question 5) ;
  7. module `.mjs` sans `.pragma` ni `.import` chargé par QML (ADR 0005), écran créé par
     `Qt.createComponent` pour qu'un échec de chargement s'affiche.
- **Écart encore ouvert** (journal, 3 novembre, décision « creuser ») : d'après le code
  v4.3.7, `readFileContent` refuse tout chemin hors du dossier projet
  (`src/core/utils/qffileutils.cpp` L620-628, contrôle `isWithinProjectDirectory`
  L541-618, relu aujourd'hui : inchangé). Le Samsung a pourtant lu la copie. Le squelette
  **bâtit dessus** (c'est le geste 4) : voir le risque n° 1 du § 8. J'ai voulu lire
  l'historique de ce fichier pour savoir depuis quelle version le contrôle existe :
  **accès refusé** (`gh api` sur `opengisch/QField` : « GitHub access to this repository is
  not enabled for this session », HTTP 403). Je ne l'ai pas contourné.

## 3. Structure des fichiers

```
plugin/
  PLAN.md            ce plan
  metadata.txt       name=Cerf, description, author=Pascal Obstétar, version=0.1.0,
                     icon=icon.svg, homepage=https://github.com/pobsteta/cerf
                     (clés lues par QField : src/app/qfpluginmodel.cpp L368-392)
  main.qml           point d'entrée : bouton de la barre des plugins (caché hors projet
                     Cerf), écoute de iface.loadProjectEnded, fenêtre. N'importe aucun .mjs :
                     crée Cerf.qml par Qt.createComponent (motif du prototype, prouvé) et
                     affiche errorString() si le module ne se charge pas
  Cerf.qml           QtObject non visuel : importe cerf-logique.mjs ; seul fichier qui
                     branche la logique sur l'API de QField (adaptateurs du § 5)
  Panneau.qml        contenu de la fenêtre, minimal (la mission 015 le soignera) :
                     « Ajouter un zip », liste des couches du registre avec « Retirer »,
                     zone de messages, version du plugin et de QField en pied
  cerf-logique.mjs   la logique : 15 fonctions du contrat validé le 3 novembre 2026, et
                     leurs aides internes. ECMAScript pur, aucun import (ni ES, ni .import,
                     ni .pragma) : un .mjs qui en importe un autre n'est pas prouvé dans QML
  icon.svg           l'icône du prototype (dessinée pour Cerf), reprise
  empaqueter.mjs     fabrique <sortie>/cerf.zip, main.qml à la racine
                     (src/app/qfpluginmanager.cpp L441-448), avec l'écrivain de zip du dépôt
                     (tests/recette/essai/zip-ecrire.mjs). Dossier de sortie obligatoire en
                     argument : rien n'est écrit dans le dépôt, .gitignore n'est pas touché
tests/
  plugin.test.mjs    mes tests unitaires (voir § 7) — hors du harnais « plugin/ » de la
                     fiche : question n° 1 du § 10
.github/workflows/
  release-plugin.yml pendant de release-prototype.yml (§ 6) — hors du harnais aussi :
                     question n° 2 du § 10
```

Le nom du zip, `cerf.zip`, donne le dossier du plugin `cerf` : QField retire `.zip` et un
éventuel suffixe de version (`qfpluginmanager.cpp` L452). Une réinstallation par la même
URL remplace la version en place (`disableAppPlugin`, L457, puis mise à jour).

## 4. Réalisation de chaque fonction du contrat

Contrat validé par Pascal le 3 novembre 2026 (tête de `tests/squelette.test.mjs`), avec
`listerZip` renommé **`nomsDuZip`** (décision de Pascal, retouche de la 007 en cours). Toutes
les fonctions sont **synchrones** (le contrat admet « Promise|valeur ») : pas de promesse à
gérer dans QML. Prudence de syntaxe reprise du prototype : ni `?.`, ni `??`, ni
`TextDecoder`, ni séparateur de chiffres.

Aides internes (non exportées, ou exportées sans faire partie du contrat) :
`estUuid(t)` (8-4-4-4-12 hexadécimal, casse indifférente, aucun espace ; la valeur est
gardée telle quelle, jamais normalisée, car elle forme la clé) ; `estNomSimple(nom)`
(non vide, ni `/`, ni `\`, ni `..` comme nom entier, ni caractère de contrôle) ;
`estNomDeZip(nom)` (nom simple finissant par `.zip`, casse indifférente) ;
`octetsDe(valeur)` (Buffer, `Uint8Array`, `ArrayBuffer`, dont le `ArrayBuffer` vide de Qt
qui fait lever `new Uint8Array()` : prototype § 10 bis n° 6) ; `entreeDuRegistreSaine(e)`.

| Fonction | Réalisation |
|---|---|
| `estProjetCerf(variables)` | `lireCerfId(variables) !== null`. |
| `lireCerfId(variables)` | `variables` nul ou non objet → `null` ; `cerf_id` absent, nul, vide → `null` ; `String(v)` qui n'est pas un UUID → `null` (il sert de nom de dossier : spec § 3.3, règle du 3 novembre). Sinon la valeur telle quelle. |
| `cleRegistre(cerfId)` | `'cerf/' + cerfId`. |
| `dossierCopies(dossierApp, cerfId)` | `<dossierApp sans / final>/Imported Datasets/cerf/<cerfId>`. |
| `cheminCopie(dossierApp, cerfId, nomZip)` | `dossierCopies(…) + '/' + nomZip`. |
| `nomsDuZip(octets)` | Reprise du lecteur du prototype (`prototype/cerf-zip.mjs`, `listerZip`, code de Cerf) : fin de répertoire `0x06054b50` cherchée depuis la fin, répertoire central `0x02014b50`, bit 11 → UTF-8, sinon CP437 (table du prototype). Rend **la liste des noms**, dans l'ordre du zip. Erreur au message clair si ce n'est pas un zip, s'il est tronqué (répertoire hors des octets, signature absente), ou ZIP64. |
| `couchesDuZip(noms)` | Garde les noms finissant par `.geojson` (casse indifférente), hors dossiers ; `couche` = nom de fichier sans dossier ni extension. Le `.json` est reporté à la mission 010 (décision de Pascal). |
| `lireRegistre(reglages, cerfId)` | `reglages.value(cle, '')` ; vide → `[]` ; `JSON.parse` ; ce qui n'est pas un tableau → `[]` (registre illisible : le plugin ne l'écrase pas sans le dire, voir § 8 n° 6). |
| `inscrire(reglages, cerfId, entree)` | Lit, retire l'entrée de même `(zip, couche)`, ajoute la nouvelle **à sa place** (l'ordre d'affichage reste stable), écrit `JSON.stringify(liste)` par `setValue`. |
| `retirer(reglages, cerfId, {zip, couche})` | Absente → `{ retiree: false, zipInutile: false }`, rien écrit. Sinon retire, écrit, `zipInutile` = plus aucune entrée du même `zip`. |
| `importerZip(ctx)` | `ctx` : `cerfId, dossierApp, nomZip, octets, reglages, chargerCouche, maintenant`. 1) `cerfId` non UUID ou `nomZip` qui n'est pas un nom de zip simple → résultat vide et message, rien chargé ni écrit. 2) `nomsDuZip(octets)` ; erreur → résultat vide et message. 3) Pour chaque couche de `couchesDuZip` : source `'/vsizip/' + cheminCopie + '/' + entree` ; `chargerCouche(source, couche)` dans un `try` ; couche absente, invalide (`isValid` faux) ou exception → refusée `{ couche, raison }`, **les autres continuent** ; sinon `couche.readOnly = true`, puis **`inscrire` aussitôt** `{ zip, couche, chemin_vsi: nomZip + '/' + entree, style: 'defaut', ajoutee_le: maintenant().toISOString() }`. Rend `{ chargees, refusees, message }`. |
| `demarrerProjet(ctx)` | `ctx` : `variables, reglages, dossierApp, existe, chargerCouche`. Pas de `cerf_id` valide → `{ actif: false, boutonVisible: false, rechargees: [], absentes: [], message: '' }`, rien lu ni écrit. Sinon, pour chaque entrée du registre : `existe(cheminCopie(zip))` (un appel par zip, mis en cache) ; absent → `absentes`, entrée gardée ; présent → `chargerCouche('/vsizip/' + dossierCopies + '/' + chemin_vsi, couche)`, `readOnly = true`, ou échec → message « n'a pas pu être rechargée », entrée gardée. **Aucune écriture.** Message unique « N couches n'ont pas pu être rechargées : zip absent » (singulier pour 1), suivi d'une ligne pour les couches illisibles. |
| `retirerCouche(ctx)` | `ctx` : `cerfId, dossierApp, zip, couche, reglages, retirerDeLaCarte, platformUtilities`. `cerfId` non UUID → `{ efface: false, message }`, rien écrit, rien effacé. Sinon `retirerDeLaCarte(couche)`, `retirer(…)` ; si `zipInutile` et `zip` est un nom de zip simple → `effacerCopie(platformUtilities, cheminCopie, dossierCopies)` ; nom douteux → entrée retirée, **aucun fichier touché** (spec § 3.3, règle du 3 novembre). |
| `peutEffacer(chemin, dossierCopies)` | Ne se fie à aucun argument : `dossierCopies` doit être absolu, sans segment vide, `.` ou `..`, et finir exactement par `/Imported Datasets/cerf/<UUID>` ; `chemin` doit commencer par `dossierCopies + '/'`, et le reste être non vide, sans segment vide, `.` ou `..`. |
| `effacerCopie(platformUtilities, chemin, dossierCopies)` | `peutEffacer` faux → `{ efface: false, message }`, `rmFile` jamais appelé. `rmFile` absent (QField l'a déplacé) ou rendant faux → `{ efface: false, message: 'Copie conservée sur l\'appareil : <nom>' }` (repli spec § 9 n° 2). Vrai → `{ efface: true, message: 'Copie effacée : <nom>' }`. |

Deux points que la spec ne tranche pas, à faire trancher (§ 10, questions n° 4 et 5) : deux
GeoJSON de même nom dans deux dossiers du zip (même clé `(zip, couche)`) ; une entrée de
registre douteuse rencontrée **à l'ouverture**.

## 5. Branchement sur l'API de QField

Le plugin importe `org.qfield` (alias de `org.qfield.core`, `.gui`, `.app` :
`src/app/qfapp.cpp` L43-47) et emploie les anciens noms (`src/core/qfcore.cpp` L270).
Fichiers de QField v4.3.7 sauf mention QGIS (commit `3a92eb3`).

| Usage | Appel | Source | Prouvé ? |
|---|---|---|---|
| Bouton | `iface.addItemToPluginsToolbar(bouton)` ; `iface` en contexte | `src/core/qfappinterface.h` L181 ; `src/app/qgismobileapp.cpp` L423 | **prouvé** (prototype) |
| Cacher le bouton hors projet Cerf (critère 9) | `bouton.visible = false` (QField n'offre pas de retrait de la barre) | `qfappinterface.h` L176-203 : aucune fonction de retrait | **non prouvé** : que la barre se range bien sans lui |
| Fenêtre | `Popup` posé sur `iface.mainWindow().contentItem` | `qfappinterface.h` L208 | **prouvé** |
| Message court | `iface.mainWindow().displayToast(texte)` | `src/app/qml/QgisMobileapp.qml` L4790 | **non prouvé** ; repli : la zone de messages du panneau |
| Ouverture du projet | `Connections { target: iface; function onLoadProjectEnded(path, name) }` | signal `qfappinterface.h` L268, relayé `qgismobileapp.cpp` L314, émis L1009 à la fin de `readProjectFile` (L581) | **non prouvé** |
| Plugin chargé avant le projet au lancement | ordre `restoreAppPlugins()` puis chargement du dernier projet | `qgismobileapp.cpp` L471 puis L476-497 | lu ; et au `Component.onCompleted`, si `qgisProject.fileName` n'est pas vide, `demarrerProjet` est appelé une fois (plugin installé projet ouvert) — garde contre le double chargement : § 8 n° 7 |
| `cerf_id` | `ExpressionContextUtils.projectVariables(qgisProject)` → `customVariables()` | `src/core/utils/qfexpressioncontextutils.h` L92, `.cpp` L180-188 | **prouvé** |
| Registre | `settings.value(cle, defaut)`, `settings.setValue(cle, valeur)`, puis **`settings.sync()`** après chaque écriture (un redémarrage brutal ne doit rien perdre) ; `settings` en contexte | `src/core/qfsettings.h` L33, L35, L59 ; `.cpp` L26-35 (simple `QSettings`) ; `qgismobileapp.cpp` L425 | **non prouvé** : lecture depuis un plugin, retour d'une chaîne JSON contenant des virgules et des accents par `QSettings` sous Android, persistance après redémarrage |
| Dossier de l'application | `platformUtilities.applicationDirectory()` | `src/core/platforms/qfplatformutilities.h` L138 | **prouvé** |
| Choisir et copier | `requestStoragePermission()` puis `getFile(dossierCopies + '/', '{filename}', '*/*', parent)`, `onResourceReceived` | `qfplatformutilities.h` L224 ; Android `src/core/platforms/android/qfandroidplatformutilities.cpp` L533-557 ; `platform/android/src/ch/opengis/qfield/QFieldActivity.java` L1411-1430 | **prouvé** |
| Présence de la copie | `FileUtils.fileExists(chemin)` | `src/core/utils/qffileutils.cpp` L90-94 | **prouvé** |
| Octets de la copie | `FileUtils.readFileContent(chemin)` | `qffileutils.cpp` L620-650 | **prouvé sur le Samsung, contredit par le code** (§ 2, § 8 n° 1) |
| Charger une couche | `LayerUtils.loadVectorLayer(source, nom)` (propriété C++ posée : `CppOwnership`) | `src/core/utils/qflayerutils.h` L200, `.cpp` L615-620 | **prouvé** (sans ajout à la carte) |
| Lecture seule | `couche.readOnly = true` | QGIS `src/core/vector/qgsvectorlayer.h` L420 (`Q_PROPERTY readOnly … WRITE setReadOnly`), L1709 ; QField en tient compte : `src/core/qfmultifeaturelistmodelbase.cpp` L535-597 | **non prouvé** (décision de Pascal : posé par la logique, vérifié sur le Samsung) |
| Marquer la couche | `couche.setCustomProperty('cerf/zip', zip)` et `'cerf/couche'` | QGIS `src/core/qgsmaplayer.h` L727, L733 | **non prouvé** |
| Ajouter à la carte | `ProjectUtils.addMapLayer(qgisProject, couche)`, seulement si `couche.isValid` | `src/core/utils/qfprojectutils.h` L45, `.cpp` L54-60 ; `isValid` : QGIS `qgsmaplayer.h` L94 | **non prouvé** (le prototype ne l'appelait pas) |
| Retirer de la carte | `ProjectUtils.mapLayers(qgisProject)` puis `ProjectUtils.removeMapLayer(qgisProject, id)` pour la couche marquée `(zip, couche)` | `qfprojectutils.h` L40, L57 ; `.cpp` L70-76 ; `id` : QGIS `qgsmaplayer.h` L86 | **non prouvé** |
| Effacer la copie | `platformUtilities.rmFile(chemin)` | `qfplatformutilities.h` L131, `.cpp` L208-212 (ADR 0007) | **prouvé** |
| Version de QField affichée | `Qfield.version` | singleton `src/core/qfcore.cpp` L215 ; employé par `src/app/qml/QfAbout.qml` L83 | **non prouvé** (sert la recette : la version manquait à l'essai du prototype) |

Adaptateurs écrits dans `Cerf.qml` (le seul lien entre logique et QField) :
`reglages = { value: (c, d) => settings.value(c, d), setValue: (c, v) => { settings.setValue(c, v); settings.sync(); } }` ;
`chargerCouche(source, nom)` = charger, et si valide marquer et ajouter à la carte, puis
rendre la couche (la logique pose `readOnly` ensuite) ;
`existe = FileUtils.fileExists` ; `retirerDeLaCarte(nom)` = retrait de la couche marquée
du `zip` en cours ; `platformUtilities` passé tel quel.

**Parcours dans QML.**
1. *Ouverture* (`onLoadProjectEnded`) : `demarrerProjet` ; `bouton.visible = boutonVisible` ;
   message éventuel en toast.
2. *Ajouter un zip* : `getFile` ; à `resourceReceived` : nom reçu ; si ce n'est pas un nom de
   zip, la copie arrivée est effacée par `effacerCopie` (garde de l'ADR 0007) et un message
   le dit ; sinon `fileExists`, puis `readFileContent` ; **0 octet sur une copie présente →
   message « lecture refusée par QField (version X) »**, rien d'autre ; sinon, retrait de la
   carte des couches déjà chargées depuis un zip de même nom (§ 8 n° 4), puis `importerZip`,
   puis un message : « N couches chargées », et une ligne par couche refusée.
3. *Retirer* : bouton de la ligne → `retirerCouche` → message (copie effacée, ou conservée
   et nommée).

## 6. Empaquetage et mise en ligne

`node plugin/empaqueter.mjs <sortie>` écrit `<sortie>/cerf.zip` : `main.qml`, `Cerf.qml`,
`Panneau.qml`, `cerf-logique.mjs`, `metadata.txt`, `icon.svg` (ni `PLAN.md` ni
`empaqueter.mjs`).

Pendant proposé de `.github/workflows/release-prototype.yml` :
`.github/workflows/release-plugin.yml`.

```yaml
# Publie le plugin Cerf (mission 008 et suivantes) en release GitHub.
#  - push sur la branche d'une mission du plugin : préversion « plugin-essai » (écrasée à
#    chaque push), pour l'essai de Pascal sur le Samsung avant fusion ;
#  - push sur main : release « plugin-v<version> » (version lue dans plugin/metadata.txt),
#    refusée si l'étiquette existe déjà (oblige à monter la version).
name: Release du plugin
on:
  push:
    branches: ['main', 'mission/008-squelette-plugin']
    paths: ['plugin/**', 'tests/**', 'cerf.qgz', '.github/workflows/release-plugin.yml']
  workflow_dispatch:
permissions:
  contents: write
jobs:
  publier:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r outils/requirements.txt   # tests de l'emprise (mission 002)
      - name: Tests
        run: node --test
      - name: Zips
        run: |
          node plugin/empaqueter.mjs dist
          cp tests/recette/essai/essai.zip dist/
          (cp cerf.qgz dist/ && cd dist && zip -X cerf-projet-modele.zip cerf.qgz && rm cerf.qgz)
      - name: Release
        env: { GH_TOKEN: '${{ github.token }}' }
        run: |
          version=$(sed -n 's/^version=//p' plugin/metadata.txt)
          { echo "Plugin QField Cerf $version, à installer par URL (Paramètres, Plugins, Install plugin from URL)."
            echo "Ne pas renommer cerf.zip : QField nomme le dossier du plugin d'après le nom du zip."
            echo; echo '```'; sha256sum dist/*.zip; echo '```'; } > notes.md
          if [ "$GITHUB_REF_NAME" = "main" ]; then
            gh release create "plugin-v$version" dist/cerf.zip dist/cerf-projet-modele.zip \
              --target "$GITHUB_SHA" --title "Cerf $version" --notes-file notes.md
          else
            if gh release view plugin-essai >/dev/null 2>&1; then
              gh release upload plugin-essai dist/*.zip --clobber
              gh release edit plugin-essai --notes-file notes.md
            else
              gh release create plugin-essai dist/*.zip --target "$GITHUB_SHA" \
                --title "Cerf, essai avant fusion" --notes-file notes.md --prerelease
            fi
          fi
```

URL à coller dans QField : pour l'essai,
`https://github.com/pobsteta/cerf/releases/download/plugin-essai/cerf.zip` ; après fusion,
`https://github.com/pobsteta/cerf/releases/latest/download/cerf.zip` (stable d'une version à
l'autre). L'étiquette est créée par la release elle-même (le proxy de la session a refusé la
poussée d'étiquette au cycle 4). `cerf.qgz` est pris dans le même commit (il est sur `main`
depuis la 006). Tant que la 007 n'est pas fusionnée, le passage « Tests » n'est vert que si
la branche de la 008 contient la 007 (ordre de fusion 007 → 008, § 9).

## 7. Tests

- **Cible** : les 46 tests de `tests/squelette.test.mjs`, **sans les modifier**, dans leur
  version retouchée (`nomsDuZip`). Je pars de la branche de la 007 une fois la retouche
  poussée (ou je la fusionne dans ma branche) ; je ne commence pas sur l'ancienne version.
  Rouge d'abord : je lance la suite sans `plugin/cerf-logique.mjs` et je note les
  46 rouges, puis vert ; toute la suite (`node --test`) reste verte.
- **Mes tests** (`tests/plugin.test.mjs`, sous réserve de la question n° 1) :
  - forme : `metadata.txt` porte `name`, `version`, `icon` présent ; `cerf.zip` fabriqué a
    `main.qml` à sa racine et exactement les six fichiers ; chaque QML ne crée ou n'importe
    que des fichiers présents ; `main.qml` n'importe aucun `.mjs` ; aucun `.pragma`, aucun
    `.import`, aucune instruction `import` dans `cerf-logique.mjs` ; étiquette SPDX dans
    chaque fichier ; aucune syntaxe `?.`, `??`, `TextDecoder` dans le module (moteur QML) ;
  - logique au-delà de la 007 : nom UTF-8 avec bit 11 ; ZIP64 refusé ; `ArrayBuffer` vide ;
    `Uint8Array` ; `.GEOJSON` dans un sous-sous-dossier ; registre illisible (texte non
    JSON) rendu `[]` sans écriture ; `inscrire` garde l'ordre ; message singulier et pluriel
    des couches illisibles au démarrage ; `importerZip` sans `maintenant` ;
  - **règle du projet, point du terrain au bon endroit** : le squelette ne reprojette rien
    et Node n'a pas GDAL ; aucun test Node ne peut le prouver ici. Je le dis plutôt que de
    l'imiter : la preuve est l'essai du § 9 (point de `essai.zip`, CRS84, longitude 2,35
    puis latitude 48,85, soit EPSG:2154 X (est) 652 301,56 m, Y (nord) 6 861 302,73 m,
    valeurs de `tests/recette/essai/fabriquer-essais.mjs` L10-13).
- **Essai hors QField** (comme au prototype) : charger `main.qml`, `Cerf.qml`,
  `Panneau.qml` dans le moteur QML de Qt 6 avec une API de QField simulée, pour attraper les
  erreurs de syntaxe QML avant le Samsung. Ne prouve rien sur QField.

## 8. Risques et replis

| # | Risque | Repli |
|---|---|---|
| 1 | **Lecture hors du dossier projet** refusée par une autre version de QField (le code v4.3.7 la refuse ; le Samsung l'a permise ; cause inconnue, version non notée) | Le plugin le **détecte** (0 octet sur une copie présente) et l'écrit avec la version de QField ; il ne ruse pas. Le repli arbitré existe (spec § 9 n° 1 : zip dans le dossier projet, pas de QFieldCloud) mais n'est **pas codé** dans le squelette : à décider par Pascal (question n° 3). Piste non prouvée, à ne pas suivre sans accord : faire lister le zip par GDAL (`/vsizip/<copie>`), sans lire les octets. |
| 2 | `settings` illisible depuis un plugin, ou chaîne JSON relue autrement (liste au lieu de texte) | `lireRegistre` rend `[]` et le panneau dit « registre illisible » au lieu de l'écraser ; sans registre fiable, pas de critère 4 : on s'arrête et l'on remonte. Repli possible, à décider : un fichier JSON écrit par `FileUtils.writeFileContent` (lui aussi limité au dossier projet, `qffileutils.cpp` L652-658). |
| 3 | `readOnly` sans effet visible (couche encore modifiable) | Le dire à Pascal ; la couche reste sur un zip en lecture par GDAL, qui n'écrit pas dans `/vsizip/` : pas de perte de données, mais un agent pourrait croire avoir saisi. |
| 4 | Zip réimporté sous le même nom : `getFile` écrase la copie **pendant** que GDAL la lit (`FileOutputStream` réécrit le fichier : `QFieldUtils.java` L390-392), et le cache de `/vsizip/` peut garder l'ancienne liste | Retirer de la carte les couches de ce zip avant `importerZip` (elles sont rechargées par lui) ; essai n° 6 du § 9. Si l'essai montre des couches fausses : arrivée dans un sous-dossier puis `renameFile` (`qfplatformutilities.h` L132, non prouvé), à décider. |
| 5 | `getFile` annonce `resourceReceived` même si la copie a échoué (exception avalée : `QFieldActivity.java` L1421-1428) | `fileExists` puis lecture : copie absente ou vide → message, rien chargé. |
| 6 | Gros zip (le `lourd` de 200 Mo) lu entier en mémoire JavaScript pour le lister | Le squelette ne charge que du GeoJSON ; pas de plafond inventé (la fiche dit « aucune valeur provisoire »). Le prototype avait un garde-fou de 10 Mo ; à reprendre ou non par Pascal (question n° 6). |
| 7 | Double chargement : `onLoadProjectEnded` et `Component.onCompleted` pour le même projet, ou retour au projet | Avant de recharger, le plugin ignore une couche déjà présente dans le projet avec le même marquage `(zip, couche)`. |
| 8 | Bouton caché mal rangé dans la barre (critère 9) | Repli : bouton présent mais inerte, avec « projet non Cerf » : contraire à la spec § 1, donc remonté à Pascal, pas fait en silence. |
| 9 | `rmFile` disparu dans une version future | Déjà couvert : copie conservée et nommée (ADR 0007, spec § 9 n° 2), testé par la 007. |
| 10 | Deux plugins à boutons sur l'appareil (prototype et Cerf) | Désinstaller le prototype avant l'essai (§ 9). |

## 9. Essai sur le Samsung (critères 4, 8, 9 de la spec § 6)

Préalables, **avec réseau** : désinstaller le plugin du prototype ; installer `cerf.zip` par
l'URL de la préversion ; avoir `cerf.qgz` (release, ou celui déjà installé) ; copier
`essai.zip` (release) dans Téléchargements ; noter le modèle et la **version de QField**
(affichée au pied du panneau). Puis **mode avion** pour tout le reste.

1. **Critère 9** : ouvrir un projet sans `cerf_id` (un projet d'exemple de QField, ou le
   GeoJSON ouvert seul) → aucun bouton Cerf dans la barre des plugins.
2. Ouvrir `cerf.qgz` → le bouton Cerf apparaît.
3. Bouton → « Ajouter un zip » → `essai.zip` → message « 1 couche chargée : points_essai »
   (le Shapefile du zip est ignoré par le squelette, c'est attendu).
   **Point au bon endroit** : le point apparaît à Paris, rive gauche, face à l'île de la
   Cité ; recherche de QField sur les coordonnées `2.35 48.85` (longitude puis latitude,
   WGS84) : le repère tombe sur le point, à vue (le contrôle à 5 m est le critère 3, pas
   celui du squelette).
4. **Lecture seule** : passer en mode édition sur `points_essai` → impossible.
5. **Critère 4** : fermer QField (le retirer des applications récentes), **redémarrer le
   téléphone**, rouvrir QField → `cerf.qgz` → `points_essai` est là, toujours en lecture
   seule, sans message.
6. Réimport : ajouter `essai.zip` de nouveau → une seule couche `points_essai` sur la carte
   et dans la liste.
7. **Critère 8** : panneau → « Retirer » sur `points_essai` → la couche disparaît, message
   « Copie effacée : essai.zip » ; fermer et rouvrir le projet → elle ne revient pas.

Réussite de la mission (fiche) : étape 5. Ce que Pascal note pour chaque étape : oui ou non,
et ce qu'il a vu autrement.

## 10. Questions qui relèvent de Pascal

1. **Harnais** : la fiche me permet d'écrire `plugin/`. Mes tests unitaires
   (`tests/plugin.test.mjs`) et le workflow (`.github/workflows/release-plugin.yml`) sont
   hors de ce dossier. Les écris-je dans cette mission, ou l'orchestrateur les confie-t-il ?
2. **Mise en ligne** : la préversion « plugin-essai » sur la branche de la 008, puis
   « plugin-v<version> » à chaque fusion sur `main` (§ 6) vous conviennent-elles ?
3. **Lecture refusée** (risque n° 1) : tant que l'écart n'est pas compris, le squelette
   se contente de détecter et de dire ; coder dès maintenant le repli « zip dans le dossier
   projet » (spec § 9 n° 1) serait un second chemin à maintenir. D'accord pour attendre ?
4. **Même nom de couche** dans deux dossiers du même zip (`a/UG.geojson`, `b/UG.geojson`) :
   la clé du registre `(zip, couche)` les confond. Je propose de refuser la seconde avec le
   message « nom de couche en double dans le zip ». D'accord, ou une autre règle ?
5. **Entrée douteuse vue à l'ouverture** (nom de zip non simple, `chemin_vsi` hors du zip) :
   la spec § 3.3 dit qu'elle « est retirée du registre sans qu'aucun fichier soit effacé ».
   Je lis : retirée **dès l'ouverture**, avec un message, sans rien charger. Ou bien : non
   chargée, laissée, que l'agent retire lui-même ?
6. **Gros zip** : garder, pour le listage, un plafond de taille (le prototype avait 10 Mo),
   ou aucun en tranche 1 (la fiche ne prévoit aucune valeur provisoire) ?
7. **Fichiers `__MACOSX/._*.geojson`** (zips faits sur Mac) : la spec § 3.1 ne les nomme
   pas ; sans règle, ils seraient pris pour des couches et refusés « illisibles ». Les
   ignorer en silence ? (C'est un ajout à la spec, je ne le fais pas sans vous.)

## 11. Question de contrôle

Qui fait quoi d'ici quand, et comment saura-t-on que ça marche ? — Le `dev` écrit les
tests puis le squelette dès l'accord de Pascal sur ce plan et la retouche de la 007
poussée ; l'orchestrateur fait publier la préversion `cerf.zip` ; Pascal suit le § 9 sur
son Samsung en mode avion ; on saura que ça marche quand les 46 tests de la 007 seront
verts sans modification et que `points_essai` sera revenue, en lecture seule, après le
redémarrage du téléphone.

## 12. Réalisation : écarts au plan (3 novembre 2026, après l'accord de Pascal)

Les décisions de Pascal sont dans `pilotage/missions/008-squelette-plugin.md`, rubrique
« Décisions de Pascal sur le plan ». Ce qui change ou se précise par rapport aux § 3 à 5 :

1. **Taille avant lecture (décision n° 6)** : la taille de la copie est lue par
   `LocalFilesModel` (motif du prototype, `src/gui/qflocalfilesmodel.cpp` L338-340). Une
   taille **inconnue** est refusée comme une taille au-delà de 10 Mo (« taille de la copie
   inconnue, zip non lu ») : tenir plutôt que lire en aveugle un zip qui peut faire 200 Mo.
   Si l'essai montre ce message sur `essai.zip`, c'est `LocalFilesModel` qui ne trouve pas la
   copie : on s'arrête et l'on remonte.
2. **Copie inutile effacée** : une copie refusée (pas un `.zip`, au-delà du plafond, aucune
   couche chargée) est effacée par `effacerCopie` (garde de l'ADR 0007) si aucune entrée du
   registre ne vient d'un zip de ce nom ; sinon elle reste.
3. **Pas de double chargement** : `chargerCouche` (dans `Cerf.qml`) rend la couche déjà
   présente dans le projet sous la même marque `(zip, couche)` au lieu d'en charger une
   seconde (risque n° 7).
4. **Exports en plus du contrat** (aides du pont, testées) : `VERSION`,
   `PLAFOND_LISTAGE_OCTETS`, `STYLE_DEFAUT`, `listageSur`, `messageListageRefuse`,
   `messageLectureRefusee`, `octetsDe`, `estUuid`, `estNomDeZip`, `nomDeFichier`,
   `dossierDe`, `zipDeLaSource`, `zipUtilise`. `demarrerProjet` rend aussi `illisibles`,
   `douteuses` et `cerfId` ; `importerZip` rend aussi `message`.
5. **`Cerf.qml` est un `Item` invisible** (et non un `QtObject`) : il porte un
   `LocalFilesModel` et un `Connections`.
6. **`metadata.txt` sans virgule** : QField le lit avec `QSettings` en format INI
   (`qfpluginmodel.cpp` L377), où une virgule hors guillemets fait d'une valeur une liste.
7. **Essai hors QField** : `main.qml`, `Cerf.qml`, `Panneau.qml` et le module chargés dans le
   moteur QML de Qt 6.12 (PySide6 6.12.0, plateforme `offscreen`), API de QField simulée
   (`org.qfield` factice, `iface`, `settings`, `platformUtilities`, `qgisProject`) : projet
   Cerf, ajout de `essai.zip`, panneau, « redémarrage » (nouveau moteur, mêmes réglages),
   second signal d'ouverture, retrait, projet sans `cerf_id` : 19 contrôles sur 19, aucun
   avertissement QML venant du plugin. Le harnais est resté hors du dépôt (scratchpad de la
   session). **Il ne prouve rien sur QField.**
8. Ce que la mission ne règle pas, laissé à la mission 014 (registre complet) : quand un zip
   est réimporté sous le même nom **sans** une couche qu'il contenait, l'entrée de cette
   couche reste au registre et sera signalée « illisible » à l'ouverture suivante.
9. **Repli de la spec § 9 n° 1 (aller-retour 1/3, version 0.1.1).** À l'essai de la 0.1.0 sur
   le Samsung (QField v4.3.7), le plugin a affiché « essai (1).zip : lecture refusée par QField
   (0 octet rendu ; version de QField v4.3.7) » : le risque n° 1 du § 8 s'est réalisé, comme le
   prévoyait le code (`qffileutils.cpp` L620-628). Pascal a appliqué le repli arbitré (spec
   § 3.3 et § 10, ADR 0003 et 0007) : les copies vont dans **`<dossier du projet>/cerf-imports/`**
   (comme le bouton B du prototype), Cerf n'est pas utilisé avec QFieldCloud. Ce qui change :
   - `dossierCopies(dossierProjet)` et `cheminCopie(dossierProjet, nomZip)` ; les contextes
     portent `dossierProjet` au lieu de `dossierApp` ; un dossier de projet vide, `/`, relatif
     ou à segment douteux ne donne aucun dossier de copies (rien chargé, écrit ni effacé) ;
   - `peutEffacer` n'admet que le contenu d'un dossier finissant exactement par
     `/cerf-imports` sous un dossier de projet autre que la racine (ADR 0007) ;
   - `Cerf.qml` prend le dossier du projet dans `qgisProject.homePath` (QGIS `qgsproject.h`
     L119 ; dans `cerf.qgz`, `<homePath path=""/>`, donc le dossier du fichier projet), à défaut
     le dossier de `qgisProject.fileName` ; **avant** d'ouvrir le sélecteur, il vérifie
     `FileUtils.isWithinProjectDirectory(<cerf-imports>/essai.zip)` (`qffileutils.h` L76) et
     refuse de copier si QField ne dit pas « oui » ; `platformUtilities.applicationDirectory`
     n'est plus appelé ;
   - le message de lecture refusée ne présume plus du lieu : il rapporte l'avis de QField
     (`isWithinProjectDirectory`) sur la copie ;
   - le registre garde sa clé `cerf/<cerf_id>` et ses chemins relatifs : il est inchangé.
   L'essai hors QField simule désormais la règle de QField (`readFileContent` vide hors du
   dossier projet) : il aurait attrapé l'échec de la 0.1.0. 19 contrôles sur 19 avec la 0.1.1.
   **Non prouvé** : que `homePath` vaut bien le dossier où QField a importé `cerf.qgz`, et que
   `getFile` écrit dans `<dossier du projet>/cerf-imports/` (le bouton B du prototype l'a fait,
   d'après le résultat de la question 1 à reprendre : journal du 3 novembre).

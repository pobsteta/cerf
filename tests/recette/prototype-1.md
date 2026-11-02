# Protocole d'essai du prototype n° 1

> Rédigé par le `testeur` le 2 novembre 2026, à partir de `docs/spec.md` (§ 3.3, § 6, § 8 n° 5,
> § 9), de l'ADR 0003 et de l'ADR 0005. Mission 003. **Statut : proposé, pas encore suivi.**
> Le prototype (mission 004) n'existe pas encore : les noms de ses boutons ne sont pas connus
> et ne sont pas inventés ici ; un geste dit « bouton du prototype » désigne celui que la
> mission 004 aura nommé.

**But.** Dire, sur critère fixé d'avance, si un plugin QField sait : (1) lister le contenu
d'un zip, (2) le copier hors du dossier projet, (3) effacer un `.zip`, (4) charger un module
`.mjs`. Les réponses décident de l'architecture (spec § 9, n° 1 et 2 ; ADR 0003 et 0005).

**Comment remplir.** Pour chaque geste : le faire, regarder, puis cocher `☐` en `☒` si le
résultat attendu est vu tel quel. Un résultat différent se note dans « Vu autrement », jamais
dans la case. Une case non cochée veut dire non.

## Avant de commencer

| À noter | Valeur |
|---|---|
| Date de l'essai | |
| Appareil (modèle Samsung) | |
| Version d'Android | |
| Version de QField | |
| Prototype installé (version ou commit) | |

- Fichiers d'essai : `tests/recette/essai/essai.zip` (1503 octets, **8 entrées**) et
  `tests/recette/essai/module-essai.mjs`. Les copier sur le téléphone, par câble ou par le
  moyen habituel de Pascal, **avant** de passer en mode avion.
- Contenu attendu de `essai.zip` (8 entrées, noms exacts) :
  `points_essai.geojson`, `sous-dossier/notes.txt`, `sous-dossier/shape_essai.cpg`,
  `sous-dossier/shape_essai.dbf`, `sous-dossier/shape_essai.prj`,
  `sous-dossier/shape_essai.qmd`, `sous-dossier/shape_essai.shp`,
  `sous-dossier/shape_essai.shx`.
- Les données d'essai sont fictives (un point près de Paris, sans valeur métier) ; le
  Shapefile est un point en degrés WGS84.
- Passer le téléphone en **mode avion** : tout le protocole se fait sans réseau.
- Ouvrir `cerf.qgz` (ou le projet d'essai que la mission 004 aura prévu).

## Question 1 — Le plugin peut-il lister le contenu d'un zip ?

| N° | Geste | Résultat attendu | Vu |
|---|---|---|---|
| 1 | Toucher le bouton du prototype, choisir `essai.zip` dans le sélecteur de fichiers d'Android, le zip étant **hors du dossier projet** (par exemple Téléchargements). | Le sélecteur s'ouvre et le choix est accepté, sans message d'erreur. | ☐ |
| 2 | Lire la liste affichée. | Exactement 8 entrées, avec les noms de la liste ci-dessus, sous-dossier compris. | ☐ |
| 3 | Refaire le geste 1 avec une copie de `essai.zip` posée **dans** le dossier du projet. | La même liste de 8 entrées s'affiche. | ☐ |

**Si non** au geste 2 (zip hors du dossier projet non listé) : le zip sera posé dans le
dossier projet, sans QFieldCloud, et l'on demandera à QField d'exposer le listage d'un zip
aux plugins (spec § 9, n° 1). Le geste 3 dit si ce repli marche.

**Vu autrement :**

## Question 2 — Le plugin peut-il copier le zip hors du dossier projet ?

| N° | Geste | Résultat attendu | Vu |
|---|---|---|---|
| 1 | Toucher le bouton de copie du prototype pour `essai.zip` (celui du geste 1 de la question 1). | Le prototype annonce la copie faite, sans message d'erreur. | ☐ |
| 2 | Lire le chemin de la copie affiché par le prototype. | Le chemin est `Imported Datasets/cerf/<cerf_id>/essai.zip`, sous le dossier de l'application, et **hors du dossier projet**. | ☐ |
| 3 | Lire la taille de la copie affichée par le prototype. | 1503 octets, la même que `essai.zip` d'origine. | ☐ |
| 4 | Relister la copie avec le bouton de listage. | Les mêmes 8 entrées s'affichent, lues depuis la copie. | ☐ |

**Si non** : la copie hors du dossier projet est impossible ; le zip est posé dans le dossier
projet, sans QFieldCloud (spec § 9, n° 1, ADR 0003).

**Vu autrement :**

## Question 3 — Le plugin peut-il effacer un .zip ?

| N° | Geste | Résultat attendu | Vu |
|---|---|---|---|
| 1 | Avec le bouton d'effacement du prototype, effacer la **copie** de `essai.zip` faite à la question 2 (jamais l'original). | Le prototype annonce l'effacement fait, sans message d'erreur. | ☐ |
| 2 | Relister la copie. | Le prototype dit « zip absent » ou ne trouve plus le fichier ; aucune entrée n'est listée. | ☐ |
| 3 | Dans le gestionnaire de fichiers d'Android, regarder l'original de `essai.zip`. | L'original est toujours là, intact. | ☐ |

**Si non** au geste 1 ou 2 (effacement d'un `.zip` refusé, comme le fait `FileUtils.deleteFiles`
d'après l'ADR 0003) : la copie reste sur l'appareil et son nom est affiché (spec § 9, n° 2) ;
valeur sacrifiée : la place.

**Vu autrement :**

## Question 4 — Un module .mjs se charge-t-il dans QField ?

| N° | Geste | Résultat attendu | Vu |
|---|---|---|---|
| 1 | Le prototype embarque `module-essai.mjs`. Toucher le bouton du prototype qui l'appelle. | Aucune erreur de chargement n'est affichée. | ☐ |
| 2 | Lire le résultat de `somme(2, 3)` affiché par le prototype. | `5`. | ☐ |
| 3 | Lire la valeur de `SIGNATURE` affichée par le prototype. | `cerf-prototype-1`. | ☐ |
| 4 | Sur le poste de développement, lancer `node --test`. | Le même module est importé par Node 20 ou plus et les tests de `tests/protocole-prototype.test.mjs` passent. | ☐ |

**Si non** aux gestes 1 à 3 : la logique du plugin ne peut pas être partagée avec Node sous
cette forme, et la pile de tests de l'ADR 0005 est à reprendre avec Pascal.

**Vu autrement :**

## Réponse de Pascal

| Question | Oui, toutes les cases cochées | Non ou en partie |
|---|---|---|
| 1. Lister un zip hors du dossier projet | ☐ | ☐ |
| 2. Copier hors du dossier projet | ☐ | ☐ |
| 3. Effacer un .zip | ☐ | ☐ |
| 4. Module .mjs dans QField | ☐ | ☐ |

Le prototype est jugé réussi si les quatre lignes sont « oui ». Sinon, chaque « non »
applique la ligne « Si non » de sa question ; la décision reste à Pascal.

## Hors de ce protocole (à décider par Pascal)

L'ADR 0003 (« À prototyper ») et la spec § 3.1 citent d'autres points non prouvés que la fiche
de la mission 003 ne demande pas : Shapefile lu dans un zip, `.qml` trouvé dans le zip,
GeoTIFF de 200 Mo, sélecteur de fichiers sous Android 11 et plus, noms accentués d'un zip
Windows (CP437). `essai.zip` contient déjà un Shapefile et un GeoJSON ; ces gestes
ne sont pas écrits. Faut-il les ajouter ?

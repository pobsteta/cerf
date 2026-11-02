# Référentiel des fonds IGN (Plan IGN v2, BD ORTHO)

- **Propriétaire :** Pascal Obstétar. Rédigé par l'`acquereur` (mission 001).
- **Décision éclairée :** quelles URL XYZ, quel zoom maximal et quelle attribution mettre
  dans le projet modèle, et le fond tient-il hors ligne assez longtemps (ADR 0002, spec § 3.4, § 9 n° 5).
- **Sources (uniques, dans le dépôt) :** pièces de `docs/referentiels/brut/`, mesurées par la
  mission 019 le **2 novembre 2026** (`mesure-dates.txt` : GetCapabilities à 15:13:54Z, tuiles à 15:13:55Z).
  Date de lecture par l'acquéreur : 2 novembre 2026. Aucun accès réseau de ma part.
- **Limites :** les en-têtes viennent d'une seule mesure, via le proxy de la session. La
  ligne `HTTP/1.1 200 Connection Established` et `x-iplb-request-id` sont du proxy, pas de
  l'IGN ; la réponse IGN commence à `HTTP/2 200`. Non mesuré : une tuile au zoom 19, une
  tuile hors de France, le comportement de QField face à `Cache-Control`, les CGU elles-mêmes.

## 1. URL XYZ (état du jour : mesurées en HTTP 200, zoom 15, le 2 novembre 2026)

| Fond | Couche | Gabarit XYZ | Format |
|---|---|---|---|
| Plan IGN v2 | `GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2` | `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png` | `image/png` |
| BD ORTHO | `ORTHOIMAGERY.ORTHOPHOTOS` | `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg` | `image/jpeg` |

Preuve : `brut/mesure-dates.txt` lignes 2 et 3 (URL réellement appelées, avec `TILEMATRIX=15&TILEROW=11336&TILECOL=16629`) ;
`brut/tuile-planignv2.entetes.txt` (`HTTP/2 200`, `content-type: image/png`, 41112 octets) ;
`brut/tuile-orthophotos.entetes.txt` (`HTTP/2 200`, `content-type: image/jpeg`, 16006 octets).
Les deux images (`tuile-planignv2.png`, `tuile-orthophotos.jpg`) ont été ouvertes : même lieu sur les deux (deux sources concordantes), pas de tuile vide.
Le gabarit est identique à celui de l'ADR 0002 (aucun écart). `{x}` = colonne, `{y}` = ligne, `{z}` = niveau.

## 2. Zoom maximal

| Fond | Jeu de matrices du GetCapabilities | Zoom min | Zoom max | Source |
|---|---|---|---|---|
| Plan IGN v2 | `PM_0_19` | 0 | **19** | `getcapabilities.xml` ligne 10, couche `GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2` : `<TileMatrixSetLink><TileMatrixSet>PM_0_19</TileMatrixSet>`, limites commençant à `<TileMatrix>0</TileMatrix>` |
| BD ORTHO | `PM_0_19` | 0 | **19** | `getcapabilities.xml` ligne 14, couche `ORTHOIMAGERY.ORTHOPHOTOS` : idem |

Réserve : « 19 » est tiré du nom du jeu `PM_0_19` ; je n'ai pas pu isoler à l'outil la dernière
entrée `TileMatrixLimits` de chacune des deux couches (lignes de 3 Mo). À recontrôler en ouvrant
une tuile au zoom 19 (voir « trois points au sol »).

**Interprétation de l'écart `PM` / `PM_0_19`** (remarque de la relecture 019) :
le GetCapabilities déclare un jeu `PM` (ligne 14, `<TileMatrixSet><ows:Identifier>PM</ows:Identifier>`)
et de nombreux jeux tronqués `PM_a_b` (dont `PM_0_19`, `PM_0_21`). Chaque couche renvoie à `PM_0_19`,
qui borne les zooms de 0 à 19. Le serveur accepte aussi `TILEMATRIXSET=PM` (HTTP 200 au zoom 15,
`mesure-dates.txt`). Conséquence : l'URL de l'ADR est valable, mais **seul le zoom maximal du
`PM_0_19` est garanti par la couche** ; avec `PM`, rien n'empêche de demander un zoom 20 et plus
qui n'est pas annoncé. D'où : fixer le zoom max du projet à 19 (spec § 3.4). Non vérifié : que les
matrices de `PM` et de `PM_0_19` aient la même géométrie (je n'ai comparé que leurs noms). Alternative
à proposer à Pascal : utiliser `TILEMATRIXSET=PM_0_19` dans l'URL (nom exact du GetCapabilities), non testé en HTTP.

## 3. Cache (en-têtes recopiés)

| Fond | `cache-control` | `expires` | Source |
|---|---|---|---|
| Plan IGN v2 | `private, max-age=1814400` (= 21 jours) | absent | `brut/tuile-planignv2.entetes.txt` ligne 8 |
| BD ORTHO | `private, max-age=1814400` (= 21 jours) | absent | `brut/tuile-orthophotos.entetes.txt` ligne 8 |
| GetCapabilities (pour mémoire) | absent | absent | `brut/getcapabilities.entetes.txt` (ni `cache-control`, ni `expires`) |

Aussi présents sur les tuiles : `access-control-allow-origin: *`, `www-authenticate: Key realm="kong"`
(mais la tuile est servie en 200 sans clé : aucune clé n'a été envoyée, `mesure-dates.txt`). Ni `etag` ni `last-modified` dans les pièces.
**Écart avec l'ADR 0002** : l'ADR suppose que le serveur ne fixe pas d'expiration (QGIS expirerait la tuile à 24 h,
fond manquant dès J+1). Mesuré : le serveur fixe 21 jours. Cela reste à confirmer côté client
(QField / QGIS honorent-ils `max-age` ?) : c'est le rôle de l'essai à J+2 (critère 5), non de cette mission.
`private` : réponse destinée au cache d'un client, pas à un cache partagé ; sans incidence sur QField, à ma connaissance non vérifiée.
Je n'ai pas modifié l'ADR : écart signalé à l'orchestrateur.

## 4. Licence et attribution

| Élément | Valeur | Source |
|---|---|---|
| Fournisseur | `IGN` | `getcapabilities.xml` ligne 2, `<ows:ProviderName>IGN` |
| Frais | `none` | ligne 2, `<ows:Fees>none` |
| Contraintes d'accès | « Conditions Générales d'Utilisation disponibles ici : https://cartes.gouv.fr/cgu » | ligne 2, `<ows:AccessConstraints>` |
| Licence nommée (Etalab, Licence ouverte…) | **aucune dans le XML** | recherche de « licence », « attribution », « Etalab », « © » : 1 seule ligne touchée, celle des contraintes d'accès (CGU) |
| Attribution « © IGN » | **non fournie par le XML** ; vient de l'ADR 0002 et de la spec § 3.4 | — |

Donc : la licence des deux fonds est renvoyée aux **CGU de cartes.gouv.fr/cgu, que je n'ai pas lues**
(hors de mes sources autorisées, hors ligne). Je n'écris pas « Licence ouverte » : rien dans les pièces ne le dit.
Le texte « © IGN » reste une décision de l'ADR, pas une valeur mesurée.

**Les pièces versées dans `brut/` demandent-elles une mention ?** Les en-têtes et les deux tuiles ne portent
aucune mention (pas de filigrane visible sur les images, pas d'en-tête de licence). Le GetCapabilities
ne contient pas de clause de mention autre que le renvoi aux CGU. Les verser dans le dépôt est donc couvert
**ou non** selon ces CGU : à faire lire par Pascal. Par prudence, la mention de source proposée pour
`brut/` : « Source : IGN, Géoplateforme (data.geopf.fr), mesurée le 2 novembre 2026 ».

## 5. Autres couches vues au passage (non retenues, non évaluées)

Le GetCapabilities déclare aussi : `GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2.L93` (« Plan IGN v2 Lambert93 »,
ligne 10), `HR.ORTHOIMAGERY.ORTHOPHOTOS`, `THR.ORTHOIMAGERY.ORTHOPHOTOS` (lignes 10 et 14), « Plan IGN J+1 »
et « Plan IGN HD » (ligne 10). Hors périmètre ; la 019 et l'ADR ne les demandent pas. Je ne les ai pas mesurées.

## 6. Questions pour Pascal (posées, non tranchées)

1. **Licence/attribution.** Les CGU (cartes.gouv.fr/cgu) valent pour ces fonds : acceptez-vous « © IGN » après lecture, et la
   mention proposée pour `brut/` ?
2. **Zoom 19 ou plus ?** Les couches annoncent 19. Le contradicteur de l'ADR parle de « limite de la Géoplateforme » : 19 convient-il ?
3. **`PM` ou `PM_0_19` dans l'URL ?** `PM` marche (mesuré), `PM_0_19` est le nom exact annoncé (non mesuré).
4. **Hypothèse de l'ADR** (« expiration à 24 h ») contredite par le serveur (21 jours) : l'ADR est-il à amender, par vous ?

## 7. Trois points au sol (à vérifier sur le terrain)

1. **Zoom 19** : ouvrir, dans un navigateur, la même position (colonne et ligne doublées à chaque zoom depuis 15) à z=19 pour les deux fonds ; vérifier une image réelle, non vide ; puis z=20 pour voir ce que `PM` répond.
2. **Fond à J+2** : ouvrir la zone la veille puis à J+2 hors ligne ; comparer avec le `max-age` de 21 jours annoncé (cache du client réel).
3. **Zone sans orthophoto fraîche ou en bordure (Corse, forêt de l'UT)** : l'URL de tuile n'est mesurée qu'en un seul point ; ouvrir une tuile sur l'UT de Pascal (Plan IGN et BD ORTHO), et regarder les dates de prise de vue (PDF cité dans l'abstract, ligne 14).

## 8. Liste de contrôle

1. Sources et emplacements : **passée** (fichier, ligne, élément XML, date), sauf le « 19 » tiré du nom de jeu (réserve dite § 2).
2. Décomptes complets : **passée** (2 fonds, 2 tuiles, 3 pièces d'en-têtes, 1 GetCapabilities ; pas de total de couches annoncé).
3. Bornes recopiées de la pièce ; limites dites (proxy, zoom 19 non mesuré, CGU non lues) : **passée**.
4. État du jour sur chaque élément : **passée** (2 novembre 2026).
5. Questions de Pascal posées : **passée**.
- Non cochés : `.claude/test-command` **non lancé** (l'acquéreur n'a pas d'outil d'exécution) ; test « coller dans QGIS » à faire par Pascal.

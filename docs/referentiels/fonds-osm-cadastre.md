# Référentiel des fonds OpenStreetMap, OSM topo (OpenTopoMap) et cadastre (Géoplateforme)

- **Propriétaire :** Pascal Obstétar. Rédigé par l'`acquereur` (mission 045, étape 1).
- **Date de lecture :** 5 novembre 2026.
- **Décision éclairée :** quels fonds XYZ (URL, zoom, attribution) mettre dans `cerf.qgz` en plus du
  Plan IGN v2 et de la BD ORTHO, et l'usage prévu (quelques agents ONF, QField, cache de tuiles hors
  ligne) est-il permis par chaque fournisseur (ADR 0002, spec § 3.4, mission 045).
- **Aucune clé, aucune donnée de l'ONF dans ce fichier.**

## 0. Limites de cette lecture (à lire d'abord)

- **Blocage réseau.** Depuis la session, `operations.osmfoundation.org`, `opentopomap.org` et `data.geopf.fr`
  ne se résolvent pas (« ENOTFOUND », hors des domaines autorisés). **Je n'ai lu ni la politique OSMF, ni la page
  OpenTopoMap, ni les CGU, ni mesuré aucune tuile.** Pour que cela change, il faut autoriser ces trois domaines
  (et `cartes.gouv.fr`, `tile.openstreetmap.org`, `tile.opentopomap.org`).
- **Ce qui est lu de première main :** le GetCapabilities de la Géoplateforme, déjà versé au dépôt par la
  mission 019 (`docs/referentiels/brut/getcapabilities.xml`, ligne 2, mesuré le **2 novembre 2026** ; pas
  de lecture du 5 novembre).
- **Ce qui vient de moteurs de recherche** (extraits de pages, non lus en entier) : politique OSMF, wiki OSM,
  pages IGN de limite d'usage. Les citations ci-dessous entre guillemets sont des extraits rendus par la
  recherche, pas des copies de la page ; **à relire sur la page officielle avant de trancher**.
- **Ce qui vient de ma connaissance générale, non vérifié ce jour :** repérés « (mémoire) ».

## 1. Gabarits XYZ pour QGIS

| Fond | Gabarit XYZ (champ « URL » de QGIS, type XYZ) | Source |
|---|---|---|
| OpenStreetMap standard | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | politique OSMF : « The policy specifies the URL pattern https://tile.openstreetmap.org/{z}/{x}/{y}.png » (extrait de recherche) ; concorde avec la mémoire |
| OSM topo = OpenTopoMap | `https://tile.opentopomap.org/{z}/{x}/{y}.png` | wiki OSM « OpenTopoMap » (tuiles `tile.opentopomap.org/{z}/{x}/{y}.png`, extrait de recherche) ; **les anciens `a|b|c.tile.opentopomap.org` sont à ne pas utiliser sans vérification** (le wiki signale un nouveau serveur en janvier 2026) |
| Cadastre (Parcellaire Express, PCI) | `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png` | `getcapabilities.xml` ligne 2, voir § 1.1 |

`{x}` = colonne, `{y}` = ligne, `{z}` = niveau (même convention que `fonds-ign.md`, gabarit IGN).
Pour OSM et OpenTopoMap, `{y}` est le schéma « XYZ/slippy » (origine en haut) : pas d'inversion à faire.

### 1.1 Cadastre : lecture du GetCapabilities (pièce du 2 novembre 2026)

Couche `CADASTRALPARCELS.PARCELLAIRE_EXPRESS` (ligne 2 de `brut/getcapabilities.xml`) :

| Élément | Valeur lue |
|---|---|
| Titre | « Parcelles cadastrales » |
| Abstract | « Parcellaire Express (PCI) édition : 2026-06-01 » |
| Identifiant exact | `CADASTRALPARCELS.PARCELLAIRE_EXPRESS` |
| Styles | `normal` (`isDefault="true"`, légende `CADASTRALPARCELS.PARCELLAIRE_EXPRESS-legend.png`) et `PCI vecteur` (`isDefault="false"`) |
| Format | **un seul** `<Format>` : `image/png` |
| InfoFormat | `text/plain`, `text/xml`, `text/html`, `application/json` |
| Jeu de matrices lié | **`PM_0_19`** ; 20 limites (comptées : motif à exactement 20 `TileMatrixLimits` consécutives, la première à `<TileMatrix>0`) soit niveaux **0 à 19** |
| Jeu `PM` | accepté par le serveur pour les autres couches (mesure 019 et relecteur, voir `fonds-ign.md` § 2) ; **non mesuré pour le cadastre** |
| Métadonnées | `https://cartes.gouv.fr/rechercher-une-donnee/dataset/IGNF_PARCELLAIRE-EXPRESS-PCI` |
| Boîte WGS84 | -63.3725 -21.4756 / 55.9259 51.3121 (France entière et outre-mer) |

Une seconde couche `CADASTRALPARCELS.PARCELLAIRE_EXPRESS.L93` (jeu `2154_10cm_12_20`) existe : hors sujet (Lambert 93, non Web Mercator).
Autres couches cadastre vues, non retenues : `CADASTRALPARCELS.PARCELS` (et `.L93`), `CADASTRALPARCELS.HEATMAP`,
`CADASTRALPARCELS.HISTO.2008-2013.PARCELS`, `CADASTRALPARCELS.QUALREFBDP`.

**Écart avec l'hypothèse de la fiche :** aucun pour le nom de la couche (`PARCELLAIRE_EXPRESS`), le format (PNG) et la matrice (`PM`
comme pour les autres fonds). Une nuance : le style `normal` n'est pas le seul, `PCI vecteur` existe aussi (nom avec espace) ; `normal` est le défaut.

**Transparence : non vérifiée.** Le XML ne dit pas si le PNG a un canal alpha. Un parcellaire vectorisé servi en PNG est
normalement transparent (sinon il masquerait les fonds), mais je ne l'ai pas vu. Mesure demandée au § 7.

## 2. Zoom min et max

| Fond | Zoom min | Zoom max | Source | Fiabilité |
|---|---|---|---|---|
| OSM standard | 0 | **19** | (mémoire) ; le texte de la politique sur les zooms n'a pas été retrouvé dans les extraits | **non vérifiée** |
| OpenTopoMap | 0 | **17** | wiki OSM « OpenTopoMap » : « worldwide, zoom to 17 » ; **mais** le même wiki note que le site lui-même est limité au zoom 15, et un ticket GitHub de 2025 (`der-stefan/OpenTopoMap` #382) évoquait de ne plus servir au-delà de 13 sur l'ancien serveur | **divergence entre sources** ; à mesurer |
| Cadastre | 0 | **19** | `getcapabilities.xml` ligne 2 : `PM_0_19`, 20 limites (0 à 19) | lue (pièce du 2 novembre) |

Les limites par niveau (`MinTileRow`, `MaxTileRow`, `MinTileCol`, `MaxTileCol`) du cadastre sont dans la pièce versée ; je n'en ai pas recopié.
Le cadastre ne couvre pas que la métropole : la couche reste valable (boîte large) ; la légende `normal` annonce `minScaleDenominator="1000"`, `maxScaleDenominator="100000000"` (échelles de la légende, pas des tuiles).

## 3. Attribution exigée

| Fond | Texte | Source | Écart / réserve |
|---|---|---|---|
| OSM | « © les contributeurs d'OpenStreetMap » (forme de la fiche) = « © OpenStreetMap contributors », avec lien vers la page de droit d'auteur | extrait de politique OSMF : l'attribution est « typically "© OpenStreetMap contributors" with a link to the attribution guidelines » ; OSMF Licence FAQ (`osmfoundation.org/wiki/Licence/Licence_and_Legal_FAQ`, titre vu) | mot pour mot **non vérifié** sur la page ; traduction française à faire valider |
| OpenTopoMap | « Map data: (C) OpenStreetMap contributors, SRTM \| Map style: (C) OpenTopoMap (CC-BY-SA) » ; forme allemande probable : « Kartendaten: © OpenStreetMap-Mitwirkende, SRTM \| Kartendarstellung: © OpenTopoMap (CC-BY-SA) » | catalogue `xyzservices` (`providers.json`, vu dans la recherche) ; wiki OSM : « stick to the licence CC-BY-SA and always name opentopomap.org » | **diffère** de la forme de la fiche (« © OpenStreetMap, SRTM \| © OpenTopoMap (CC-BY-SA) ») ; la page `opentopomap.org/about` n'est pas lue ; le wiki demande aussi de nommer `opentopomap.org` |
| Cadastre | « © IGN » (même forme que les autres fonds IGN, ADR 0002) | le GetCapabilities ne donne **aucune** attribution (`fonds-ign.md` § 4) ; fournisseur `IGN`, frais `none`, contraintes : CGU `https://cartes.gouv.fr/cgu` (ligne 2) | la donnée est le Plan Cadastral Informatisé de la **DGFiP**, diffusé par l'IGN sous « Parcellaire Express (PCI) ». Un document IGN de 2019 (fiche « DC Parcellaire Express (PCI) 1-0 », vu dans la recherche) la dirait sous **Licence Ouverte / Etalab** ; **à confirmer sur la fiche cartes.gouv.fr** (`IGNF_PARCELLAIRE-EXPRESS-PCI`). Je ne conclus pas : « © IGN », « © DGFiP » ou « © IGN, DGFiP » |

## 4. Conditions d'usage

### 4.1 OpenStreetMap (politique OSMF, `https://operations.osmfoundation.org/policies/tiles/`)

Extraits restitués par la recherche (deux recherches, versions de la politique qui divergent légèrement) :

- **Hors ligne :** « Bulk downloading is any pre-emptive fetching of tiles other than those a user is actively viewing. » ; « offline use isn't permitted on tile.openstreetmap.org » ; « Features such as "Download city/country for offline use" or "Save area for later" rely on prefetch/bulk downloading and are therefore prohibited. » Pour les besoins hors ligne, la politique renvoie vers des tuiles auto-hébergées ou des fournisseurs qui autorisent expressément le préchargement.
- **Cache passif :** je n'ai pas retrouvé la phrase exacte. Le cache qu'un client constitue **en regardant** les tuiles n'est pas du « bulk » d'après la définition ci-dessus (seul le *pre-emptive fetching* l'est) ; mais l'ADR 0002 prévoit que l'**agent ouvre la zone la veille pour remplir le cache** : c'est une consultation volontaire de l'écran, pas un téléchargement automatique, mais la frontière est une question d'interprétation de l'OSMF.
- **En-têtes :** un `User-Agent` qui identifie l'application, avec éventuellement un contact (« generic defaults, referer-stripping, and spoofed identities may be blocked without notice »). Un `Referer` valide est exigé pour le web. Des fils de la communauté OSM (n° 142447, 84301) confirment le refus 403 pour `User-Agent` générique ou `Referer` absent. **QField : je n'ai trouvé aucune source** sur ce qu'il envoie (pile réseau Qt sur Android, `User-Agent` par défaut probable) ; **à mesurer** (§ 7).
- **Gros usage :** la politique ancienne (miroir japonais du wiki) interdit sans accord préalable la distribution d'une application qui utilise ces tuiles (« heavy use »). Une ancienne version plafonnait à 250 tuiles au zoom 13 ou plus pour usage hors ligne.
- **Garanties :** l'OSMF peut bloquer sans préavis, ne garantit pas le service, la politique peut changer. Clé : aucune.
- **Attribution :** voir § 3. Politique distincte pour les tuiles vectorielles (`/policies/vector/`) : hors sujet.

**Lecture, sans trancher :** quelques agents, dans QField, **qui regardent la carte** : plausiblement dans l'esprit de la politique. Un **remplissage du cache la veille** et un **cache hors ligne** : à la limite, voire interdit (« offline use isn't permitted »). Le but même du projet est le terrain sans réseau : la tension est réelle.

### 4.2 OpenTopoMap

- **Source consultée :** wiki OSM « OpenTopoMap » (extrait de recherche) : la politique d'usage est renvoyée à `opentopomap.org/about#verwendung` ; licence **CC-BY-SA** ; « contact us » pour les projets plus importants (contacts : derstefan, mogstar). Nouveau serveur « Top-O-Map » depuis janvier 2026.
- **Charge :** un ticket GitHub (`der-stefan/OpenTopoMap` #382) rappelle que « full openness has caused load problems » et que le service a été au bord de l'arrêt ; **pérennité incertaine**.
- **Hors ligne / préchargement :** **non lu**. Pas de texte retrouvé. À lire sur `opentopomap.org/about`.
- **`User-Agent`, `Referer`, clé :** non lus. Pas de clé à ma connaissance (mémoire).

### 4.3 Cadastre (Géoplateforme)

- **Clé :** aucune dans l'URL ; la réponse des tuiles IGN porte `www-authenticate: Key realm="kong"` mais est servie en 200 sans clé (`fonds-ign.md` § 3, mesure 019 sur le Plan IGN et la BD ORTHO). **Non mesuré pour le cadastre.**
- **Limites d'usage :** page IGN « Limite d'usage » (`https://geoservices.ign.fr/node/1551`, doublée par `https://ignf.github.io/cartes.gouv.fr-documentation/fr/guides-utilisateur/acceder-aux-geodonnees/limites-d-usage`) : le mécanisme de plafond par IP (40 req/s WMS-Raster, 50 WMS-Vector, 30 WFS, réponse 429) **exclut** le service de diffusion d'images tuilées WMTS et son pendant TMS vecteur. Source recoupée avec une notice geOrchestra de 2023 (« No limitations on public access », tierce, ancienne).
- **CGU :** `https://cartes.gouv.fr/cgu` (renvoi du GetCapabilities). **Non lues** (domaine inaccessible).
- **Hors ligne / préchargement :** aucune interdiction retrouvée ; **non lu** dans les CGU.
- **Licence du parcellaire :** voir § 3 (Etalab, 2019, à confirmer). Fréquence de mise à jour : environ trimestrielle (data.gouv.fr, extrait) ; édition annoncée dans le XML : 2026-06-01.

## 5. Comparaison des sources (deux au moins par point)

| Point | Source 1 | Source 2 | Concordance |
|---|---|---|---|
| URL OSM | politique OSMF (extrait) | mémoire | oui, non revérifié |
| URL OpenTopoMap | wiki OSM | catalogue xyzservices (ancienne forme à sous-domaines probable) | **écart possible** (changement de serveur 2026) |
| Zoom max OpenTopoMap | wiki : 17 | wiki lui-même : site limité à 15 ; ticket GitHub : 13 sur l'ancien serveur | **écart noté**, à mesurer |
| Zoom max cadastre | GetCapabilities : 19 | aucune mesure HTTP de ce jour | une seule source |
| Format et couche cadastre | GetCapabilities : `image/png`, `PARCELLAIRE_EXPRESS` | fiche de mission (même hypothèse) | oui (la fiche n'est pas indépendante) |
| Hors ligne OSM | politique OSMF (deux versions) | fils de la communauté OSM | oui sur l'interdiction du préchargement ; le cache passif reste à interpréter |
| Absence de limite WMTS IGN | page IGN « Limite d'usage » | notice geOrchestra | oui |
| Attribution OSM | politique OSMF | FAQ OSMF | oui |
| Attribution OpenTopoMap | xyzservices | wiki OSM | partiel (le wiki ne donne pas la phrase) |
| Attribution cadastre | ADR 0002 (« © IGN ») | GetCapabilities : silencieux ; fiche IGN 2019 : Etalab | **non résolue** |

## 6. À trancher par Pascal

1. **OSM : l'usage prévu est-il compatible ?** Si la politique est lue comme je la restitue, le cache hors ligne et le remplissage la veille sont à la limite, voire interdits sur `tile.openstreetmap.org`. Options à poser : accepter le risque (blocage possible), ne mettre OSM qu'en fond « en ligne », demander l'accord à l'OSMF, ou utiliser un fournisseur qui autorise le préchargement. À arbitrer après lecture directe de la page.
2. **OSM topo = OpenTopoMap ?** Confirmer l'entendu. Si oui : accepter un service de pérennité incertaine, de zoom max incertain (17, 15 ou 13) et dont le texte hors ligne n'est pas lu.
3. **Attribution du cadastre :** « © IGN », « © DGFiP » ou les deux, après lecture de la fiche cartes.gouv.fr et des CGU.
4. **Attribution OSM et OpenTopoMap :** la formule exacte (français ou anglais) et si elle est affichée dans QField pour chaque fond.
5. **Cadastre visible par défaut ?** La fiche le prévoit visible, au-dessus de tous les fonds ; un parcellaire France entière charge beaucoup de tuiles PNG.
6. **Zoom max par fond** (OSM 19 ?, OpenTopoMap, cadastre 19) une fois mesuré.
7. **Hors ligne :** acceptez-vous que le critère n° 5 (J+2) ne vaille que pour les fonds IGN, et que OSM et OpenTopoMap soient « fonds de confort » en ligne ?

## 7. Mesures que le dev devra faire en HTTP (rien n'a été mesuré ici)

Pour chaque fond : une tuile à zoom 15 en France et une au zoom max, avec colonne et ligne du même lieu que `brut/mesure-dates.txt` (`TILEMATRIX=15&TILEROW=11336&TILECOL=16629`, doublées à chaque niveau). Relever : code HTTP, `content-type`, taille, `cache-control`, `expires`, `etag`/`last-modified`, et ouvrir l'image.

| Fond | Tuile zoom 15 | Tuile zoom max | Contrôles propres au fond |
|---|---|---|---|
| OSM | `https://tile.openstreetmap.org/15/16629/11336.png` | zoom 19 : `https://tile.openstreetmap.org/19/266064/181376.png` ; zoom 20 pour vérifier le 404 | refaire la requête avec le `User-Agent` par défaut de QField (à capturer) et avec un `User-Agent` identifiant ; avec et sans `Referer` ; noter 200/403/429 |
| OSM topo | `https://tile.opentopomap.org/15/16629/11336.png` | zoom 17 : `https://tile.opentopomap.org/17/66516/45344.png` ; zoom 18 pour vérifier le plafond | idem `User-Agent` / `Referer` ; essayer aussi les anciens sous-domaines `a.tile.` ; vérifier si 15 est le plafond réel |
| Cadastre | gabarit § 1 avec `TILEMATRIX=15&TILEROW=11336&TILECOL=16629` | `TILEMATRIX=19&TILEROW=181376&TILECOL=266064` ; puis 20 (404 attendu) | PNG avec canal alpha (transparent) ? à ouvrir sur fond coloré ; tuile hors zone (mer) : 200 vide ou 404 ? ; avec `TILEMATRIXSET=PM` et `PM_0_19` : tuiles identiques ? ; absence de clé |

Ajouter : capturer, par un proxy ou un journal serveur, l'en-tête `User-Agent` et `Referer` réellement envoyés par QField (Android) sur une couche XYZ. Les calculs de colonne et de ligne aux zooms 17 et 19 (×4 et ×16 depuis le zoom 15) sont de ma main : à contrôler. Verser les pièces dans `docs/referentiels/brut/` avec la mention de source et la date.

## 8. Trois points au sol

1. **OSM hors ligne au Samsung :** ouvrir la zone la veille avec réseau, couper le réseau, rouvrir le lendemain : le fond OSM revient-il, ou est-il bloqué (403) ? C'est le cas où la politique OSMF et l'usage terrain divergent le plus.
2. **Cadastre sur Plan IGN et sur BD ORTHO :** sur une UT connue de Pascal, les parcelles se superposent-elles sans voile, lisibles au soleil et en gants, aux zooms 15 à 19 ? Une transparence absente ou des traits trop fins invalident le choix.
3. **OpenTopoMap en forêt :** zoomer jusqu'à ce que la tuile devienne vide ou grise : à quel niveau ? (17, 15 ou moins) : c'est le seul moyen de trancher l'écart entre sources.

## 9. Liste de contrôle

Aucune liste de contrôle n'a été jointe à la consigne : je ne l'ai pas cherchée. Autocontrôle :

1. Sources et emplacements : **cadastre passé** (ligne 2 du XML) ; **OSM et OpenTopoMap non passés** (pages officielles non lues).
2. Décomptes : 20 limites de zoom du cadastre vérifiées par motif ; 2 couches cadastre PM / L93 ; 7 identifiants `CADASTRALPARCELS.*` dans le XML, tous cités au § 1.1.
3. Termes exacts : **non cochés** pour l'attribution OSM et OpenTopoMap, les CGU et la licence du parcellaire.
4. Aucune tuile mesurée : **non coché**.
5. Écarts relevés et notés : passé (§ 5).

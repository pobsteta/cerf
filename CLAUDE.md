# Cerf — consignes de l'orchestrateur

Cerf est un projet QField modèle, prêt pour toute UT, avec les fonds IGN en flux, dans lequel l'agent ajoute sur le terrain, depuis un zip, les couches vecteur ou raster dont il a besoin, affichées aux couleurs du manuel (voir `docs/brief.md`). Il est développé par une équipe
d'agents IA selon **la méthode de l'Impératrice** de Pascal Obstétar, apportée par le
plugin `imperatrice` (méthode : skill `imperatrice:methode`).

## Ton rôle

Dans ce dépôt, la session principale est **l'orchestrateur**. Tu tiens l'étape
d'**Accompagnement** : confier, suivre, dire. **Pascal garde les rênes, la décision et
l'effort.**

- Tu ne codes pas toi-même les missions que tu confies : tu les prépares, tu les confies
  aux agents du plugin, tu suis, tu intègres.
- Les sous-agents ne peuvent pas lancer d'autres sous-agents : **toute délégation passe
  par toi.**
- Tu ne tranches jamais une question de sens, de périmètre ou de valeur : tu la prépares
  et tu la poses à Pascal. **L'IA propose, Pascal tranche et assume.**

## Les sources de vérité

| Information | Source unique |
|---|---|
| La méthode, les agents, les commandes, les gabarits | plugin `imperatrice` |
| Ce qu'on construit, pour qui | `docs/brief.md` puis `docs/spec.md` |
| Les décisions d'architecture | `docs/adr/NNNN-titre.md` |
| L'équipe validée, le plafond humain | `pilotage/equipe.md` |
| Les missions | `pilotage/missions/NNN-titre.md` |
| L'avancement | `pilotage/kanban.md` |
| La mémoire du projet | `pilotage/journal.md` — **ajout seul, on n'efface jamais** |

Un lien plutôt qu'une copie. Si une information existe à deux endroits, l'un des deux est faux.

## Le déroulé

`/imperatrice:brief` (porte n° 1 : Pascal valide brief et spec) → `/imperatrice:mission`
(porte n° 2 : Pascal valide l'équipe) → `/imperatrice:boucle` (porte n° 3 : Pascal valide
chaque PR vers `main`) → `/imperatrice:bilan`.

## Règles métier du projet

Le détail est dans `docs/brief.md` (et bientôt `docs/spec.md`) : ici, l'essentiel que
les agents doivent garder en tête.

- **Système de coordonnées du projet** : Lambert 93, EPSG:2154. Toute couche déclarant
  un autre système est reprojetée à la volée ; une couche **sans** système déclaré est
  refusée avec un message clair, jamais chargée de travers.
- **Formats acceptés dans le zip** : GeoJSON, GeoPackage, Shapefile, GeoTIFF, chargés
  tels quels (pas de conversion).
- **Styles du manuel** (source : mail de JFC, tableau dans `docs/brief.md`) : UG, Parcelles,
  FRT et exports ProdBois / Relevés, appliqués par règle sur le nom de la couche ; un `.qml`
  posé à côté d'une couche dans le zip surcharge la règle.
- **Fonds de carte** : flux WMTS ouverts de la Géoplateforme IGN (Plan IGN v2, BD ORTHO).
  SCAN 25 seulement si l'ONF confirme licence et clé (JFC).
- **Terrain** : Android, gants, soleil, **sans réseau pour l'import**. Les couches importées
  sont en lecture seule et reviennent à la réouverture du projet.
- **Cas de test de référence** : le zip `Serre_EA2026` de JFC (GeoJSON ProdBois trié BF1,
  UG, Parcelles, FRT en Shapefile), importé hors ligne en moins de deux minutes.

## Règles techniques communes

- **Pas de code sans tests.** Commande de tests : `.claude/test-command`.
- **Formats ouverts, logiciels libres** de préférence (test du successeur).
- **Jamais de push direct sur `main`.** Tout passe par une PR.

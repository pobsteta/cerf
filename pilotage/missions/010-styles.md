# Mission 010 — Styles du manuel

> Fiche rédigée par Claude (orchestrateur) le 2 novembre 2026 avec `/imperatrice:mission`.
> **Statut : validée par Pascal le 2 novembre 2026 (porte n° 2).** Une mission = une phrase = une
> branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Écrire le module qui reconnaît une couche et lui donne le style du § 5 (couleurs et tailles du mail de JFC), ou celui du .qml posé dans le zip, pour que l'agent voie les couleurs du manuel sans rien régler.

**Redite par l'agent :** _à compléter par l'agent avant d'agir — s'il n'y arrive pas, il s'arrête._

## Ajout décidé par Pascal le 3 novembre 2026

Reconnaître aussi comme couche un `.json` qui est du GeoJSON (spec § 3.1) ; un `.json` qui
n'en est pas est ignoré en silence. Reporté ici depuis la mission 007, dont les tests ne
retiennent que les `.geojson`.

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? (sources, conventions nommées ci-dessous) | oui — spec § 5 | confier |
| A-t-il les moyens ? (outils, données d'essai, tests) | oui — tests 009 ; champs de code provisoires | confier |

**Temps de la main :** appuyer.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `dev`
- **Modèle :** sonnet
- **Ce qui ne lui est pas demandé :** contrôles d'import, interface.

## Harnais

- **Peut :** écrire `plugin/cerf-styles.mjs` et son appel dans le plugin.
- **Ne doit pas :** sortir du périmètre, inventer une donnée ou un code, toucher à `main`,
  modifier `docs/brief.md`, `docs/spec.md` ou une ADR (il signale l'écart à
  l'orchestrateur), effacer une ligne de `pilotage/journal.md`.
- **Sources autorisées :** `docs/spec.md` § 5.

## Valeur provisoire (chiffre, réglage)

- champs de code : provisoires (voir 009).

## Dépend de / rouge attendu jusqu'à

- 008, 009 ; ordre de fusion 009 → 010.

## Tests

- **Comment saura-t-on que c'est juste :** tests 009 au vert. Commande : `.claude/test-command`.

## Terrain

- **Échantillon que Pascal vérifiera :** Pascal charge UG, Parcelles et FRT sur le Samsung et compare les couleurs au mail de JFC.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Point de suivi :** à la remise de la PR, puis à la fin du cycle de `/boucle`.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

couleurs et tailles conformes au mail, sans réglage.

## Précisions de l'orchestrateur (4 novembre 2026, après la relecture de la 009)

- _(Contrat initial, **remplacé par le « Contrat mis à jour » ci-dessous**.)_ Module **`plugin/cerf-styles.mjs`**, à ajouter à `FICHIERS_PLUGIN` de
  `plugin/empaqueter.mjs`, fonctions pures :
  - `reconnaitre({ nom, geometrie: 'polygone'|'point'|'ligne', champs, qml })` →
    `{ regle: 'UG'|'Parcelles'|'FRT'|'ProdBois'|null, source: 'qml'|'nom'|'champs'|'defaut' }` ;
    `nom` sans extension (retirée par l'appelant) ; avec un `.qml`, `{ regle: null, source: 'qml' }` ;
  - `styleDe(regle, { champCode })` → `{ symbole, etiquette }` ou `null`, avec
    `symbole = { type: 'contour'|'cercle', couleur, epaisseur_mm | taille_mm, opacite_pct, remplissage }`
    et `etiquette = { champ | expression, taille_pt, couleur, lisere: { couleur } }` ;
    **aucune autre clé** (les tests comparent l'objet entier) : l'épaisseur du liseré et la
    famille de police restent hors de l'objet ;
  - `trouverQml(cheminCouche, cheminsDuZip)` → chemin du `.qml` de même dossier et même nom,
    ou `null`.
- Décisions de Pascal du 4 novembre 2026 (spec § 5) : règles par nom réservées aux
  polygones, avec l'avertissement « nom reconnu mais pas un polygone » ; `essence` et
  `diametre` sans tenir compte de la casse. Les tests de la 009 seront amendés en ce sens.
- Restent ouverts : `.qml` vide ou illisible ; nom d'une couche GeoPackage (fichier ou
  table) ; champs de code provisoires `CODE_UG`, `CODE_PARC`, `CODE_FRT`.

### Contrat mis à jour (amendement de la 009, 24c8530, 4 novembre 2026)

```
reconnaitre({ nom, geometrie, champs, qml }) -> { regle, source, avertissement }
  nom : sans extension ; geometrie : 'polygone'|'point'|'ligne' ;
  champs : noms réels (absent ou vide possible) ; essence et diametre sans tenir compte de la casse ;
  qml : contenu du .qml ou null/absent.
  avertissement : toujours présent ; « nom reconnu mais pas un polygone » quand le nom est
  UG, Parcelles ou FRT, la couche ponctuelle ou linéaire, et qu'elle garde le style par
  défaut ({ regle: null, source: 'defaut', avertissement }) ; null sinon (un point nommé UG
  avec essence et diametre devient ProdBois sans avertissement).
  Avec un .qml : { regle: null, source: 'qml', avertissement: null }.
styleDe(regle, { champCode, champEssence, champDiametre }) -> { symbole, etiquette } | null
  ProdBois : expression "<champEssence>" || '\n' || "<champDiametre>" (noms réels trouvés
  par l'appelant ; à défaut 'essence' et 'diametre').
trouverQml : inchangé.
```

### Précisions après la relecture de l'amendement (4 novembre 2026)

- `reconnaitre` rend la **phrase seule** de l'avertissement ; c'est l'appelant qui ajoute
  le préfixe « <nom de la couche avec extension> : » (spec § 4).
- L'avertissement « nom reconnu mais pas un polygone » vaut dès que le nom **correspond à un
  motif** UG, Parcelles ou FRT du § 5 (casse et accents ignorés : `ug_serre`, `frt-2026`,
  `Parcellés`), pas seulement pour une égalité stricte.
- Décisions de Pascal du 4 novembre 2026 (spec § 5) : nom de **table** pour un GeoPackage ;
  `.qml` vide ou illisible ignoré, règle par nom appliquée avec l'avertissement « .qml
  illisible, style du manuel appliqué ».
- Décisions de Pascal du 4 novembre 2026 (suite) : un point nommé selon un motif UG avec
  `essence` et `diametre` prend le style **ProdBois** sans avertissement ; `essence` et
  `diametre` reconnus sans tenir compte de la casse **ni des accents** (`diamètre`).

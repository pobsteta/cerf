# Mission 022 — Rangement des publications

> Fiche rédigée par Claude (orchestrateur) le 4 novembre 2026, sur les remarques des
> relectures de la 021. **Statut : validée par Pascal le 4 novembre 2026 (accord au
> lancement du cycle 6, porte n° 2).** Une mission = une phrase = une branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Ranger les deux workflows de publication (retirer le déclencheur de branche de la 021, retirer le doublon cerf-projet-modele.zip de la release du plugin, fermer l'étiquette orpheline et les publications croisées), pour que chaque zip n'ait qu'une adresse stable et qu'une publication ne puisse pas en casser une autre.

**Redite par l'agent :** _à remplir par l'agent avant de commencer._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase, avec son but ? | oui | confier |
| Sait-il comment faire ? | oui — `.github/workflows/release-plugin.yml`, `release-projet-modele.yml`, `outils/PLAN-021.md` § 6, relectures de la 021 au journal du 3 novembre | confier |
| A-t-il les moyens ? | oui — `gh` dans le workflow ; le chemin `main` ne se prouve qu'après fusion | confier |

**Temps de la main :** appuyer.

## Ma réponse d'abord

_Rempli par Pascal seul, avant de lire le travail de l'agent._

## L'Homme

- **Agent :** `dev`
- **Modèle :** sonnet
- **Ce qui ne lui est pas demandé :** changer le contenu des zips, la version du plugin, ou le décideur `outils/decider-release.mjs`.

## Harnais

- **Peut :** modifier `.github/workflows/release-plugin.yml` et
  `.github/workflows/release-projet-modele.yml`, `outils/PLAN-021.md` (note de suivi),
  et ajouter des tests si de la logique sort des workflows.
- **Ne doit pas :** sortir du périmètre, toucher à `main`, modifier brief, spec, ADR,
  tests des autres missions, effacer une ligne du journal.

## Ce qui est attendu

1. `release-projet-modele.yml` : retirer `mission/021-couche-saisie` des déclencheurs ;
   garder un moyen d'essai avant fusion (préversion `projet-modele-essai` sur une branche
   de mission nommée, ou `workflow_dispatch`) ; groupe `concurrency` ; si l'étiquette
   `projet-modele` existe sans release, la supprimer avant de recréer.
2. `release-plugin.yml` : ne plus publier `cerf-projet-modele.zip` (l'adresse du projet
   modèle est `…/releases/download/projet-modele/…`) ; groupe `concurrency`.
3. Rien ne devient « latest » sauf `plugin-v<version>`.

## Dépend de / rouge attendu jusqu'à

- 021 (fusionnée). CI : pas de rouge attendu.

## Tests

- `.claude/test-command` vert ; après fusion, l'orchestrateur vérifie que
  `releases/latest/download/cerf.zip` donne le plugin et que l'adresse `projet-modele`
  répond.

## Terrain

- **Échantillon que Pascal vérifiera :** les deux adresses stables se téléchargent depuis le Samsung.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal.
- **Critère d'arrêt de la relecture :** 3 allers-retours ; au-delà, la décision remonte à Pascal.
- **Qui tranche :** Pascal.

## Comment saura-t-on que ça marche ?

Une seule adresse stable par zip, et le plugin reste « latest ».

# Mission 025 — Flashcodes des releases (projet modèle et plugin)

> Fiche rédigée par Claude (orchestrateur) le 4 novembre 2026, à la demande de Pascal :
> « Il est possible dans QField d'ouvrir un projet à partir d'une URL qui se présente sous
> flashcode, peut-on ajouter dans les releases ce flashcode pour le projet et le plugin ? »
> **Statut : demandée et validée par Pascal le 4 novembre 2026 (trois flashcodes confirmés).** Une mission = une phrase = une branche = une PR.

## Mission

**En une phrase (quoi, et pourquoi) :** Joindre à chaque release du projet modèle et du plugin le flashcode (QR code) de son adresse stable, en image et dans les notes, pour que l'agent installe le projet et le plugin dans QField en visant l'écran, sans recopier d'URL avec des gants.

**Redite par l'agent :** _à remplir par l'agent avant de commencer._

## Les trois questions (règle de staffing)

| Question | Réponse | Conséquence |
|---|---|---|
| Peut-il redire la mission en une phrase ? | oui | confier |
| Sait-il comment faire ? | en partie — le format d'URL que QField accepte dans un flashcode (URL directe du zip, ou lien `qfield://…`) est à lire dans les sources de QField 4.3.7 | appuyer |
| A-t-il les moyens ? | oui — générateur libre (par ex. `qrencode`, paquet Ubuntu, dans le workflow) ; vérification par décodage dans les tests | confier |

**Temps de la main :** appuyer.

## L'Homme

- **Agent :** `dev` (sonnet).

## Harnais

- **Peut :** modifier `.github/workflows/release-plugin.yml` et `release-projet-modele.yml`
  (ajout des images et des notes seulement), ajouter un petit script dans `outils/` et ses
  tests.
- **Ne doit pas :** changer les adresses stables, le contenu des zips, ce qui devient
  « latest », le décideur `outils/decider-release.mjs` ; ajouter une dépendance fermée ;
  toucher à `main`.

## Ce qui est attendu (confirmé par Pascal le 4 novembre 2026)

- Trois flashcodes, en PNG (assez grands pour un écran de PC) et en SVG :
  - plugin : `https://github.com/pobsteta/cerf/releases/latest/download/cerf.zip` ;
  - projet modèle, première installation :
    `https://github.com/pobsteta/cerf/releases/download/projet-modele/cerf-projet-modele-premiere-installation.zip` ;
  - projet modèle, mise à jour :
    `https://github.com/pobsteta/cerf/releases/download/projet-modele/cerf-projet-modele.zip`.
- Chaque image est jointe à sa release et affichée dans ses notes, avec l'URL en clair
  dessous et une phrase : ce que le flashcode installe, et dans quel écran de QField le viser.
- Un test qui décode chaque flashcode et vérifie qu'il donne exactement l'URL attendue.

## Dépend de / rouge attendu jusqu'à

- 022 (fusionnée). CI : pas de rouge attendu. Plafond de 3 PR : la PR part quand une place
  se libère.

## Terrain

- **Échantillon que Pascal vérifiera :** viser chaque flashcode avec QField sur le Samsung :
  le projet de première installation s'ouvre, le plugin s'installe.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal. 3 allers-retours. **Qui tranche :** Pascal.

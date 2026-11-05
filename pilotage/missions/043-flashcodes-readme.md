# Mission 043 — Flashcodes dans le README

> Fiche rédigée par Claude (orchestrateur) le 5 novembre 2026, à la demande de Pascal (« peux-tu
> mettre le QR code directement dans le readme »). **Statut : validée par Pascal le 5 novembre 2026.**

## Mission

**En une phrase :** Afficher dans `README.md`, à côté de chaque adresse de téléchargement stable
qu'il cite, le flashcode de cette adresse, sous forme d'image versionnée dans le dépôt, générée par
`outils/flashcodes.mjs` (mode `stable`) et contrôlée par un test qui la décode.

- Flashcodes : projet (`projet-modele/projet-cerf.zip`), plugin (`latest/download/plugin-cerf.zip`),
  et les zips d'essai que le README cite (`essai-manuel.zip`, `essai-manuel-geojson.zip`,
  `piege.zip`, si le README les cite ou les annonce). **Pas** de flashcode pour les adresses
  d'essai (`plugin-essai`, `projet-modele-essai`) ni pour la mise à jour du projet (choix de la 028).
- Images : SVG (léger, net à l'écran) dans `docs/flashcodes/`, générées par l'outil existant, pas
  recopiées à la main ; taille d'affichage lisible depuis un écran de PC (vers 200 px).
- Le texte du README garde l'adresse en clair et la façon de viser (icône QR code du champ).

**Redite par l'agent :** le README montre, à côté de chaque adresse stable (projet, plugin, essai-manuel-geojson, essai-manuel), le flashcode en SVG (200 px) versionné dans `docs/flashcodes/`, généré par `outils/flashcodes.mjs` ; l'adresse reste en clair. Un test décode chaque SVG et vérifie qu'il est collé à son adresse dans le README. Pas de PNG versionné (ils restent joints aux releases). `piege.zip` n'est pas cité par le README : pas de flashcode. L'adresse complète d'`essai-manuel.zip` a été ajoutée au README (il n'était cité que par son nom).

## Moyens

- `outils/flashcodes.mjs` (`flashcodes`, `generer`, `svgVersPbm`, `verifier`) ; `qrencode` et
  `zbarimg` installés ; `README.md` ; `tests/readme.test.mjs`.

## Harnais

- **Agent :** `archiviste`. Branche `mission/043-flashcodes-readme`, depuis `main`.
- **Tests :** chaque SVG du dossier décode (zbarimg, via `svgVersPbm`) l'adresse stable que donne
  `flashcodes(type, 'stable')`, et le README pointe chaque image à côté de cette même adresse.
- **Ne doit pas :** changer les adresses ni les workflows de release ; toucher au code du plugin ;
  toucher aux lignes du README sur les `.json` et les `.qml` (mission 042 en cours) ; journal, kanban.

## Qui veille, qui tranche

- **Relecteur :** `relecteur`, puis Pascal (PR vers `main`).

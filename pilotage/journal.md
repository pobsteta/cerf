# Journal de Cerf

> **Règle du sommier : on n'efface pas, on ajoute.**
> Chaque inscription est datée et signée (agent ou personne). Une correction est une
> nouvelle ligne qui renvoie à l'ancienne. Un hook refuse toute modification qui
> supprimerait ou réécrirait une inscription existante.
>
> Format : `AAAA-MM-JJ · auteur · mission · ce qui a été fait / décidé / bloqué`
>
> **Le carnet des écarts** (fiche n° 3), en une ligne marquée `écart` :
> `AAAA-MM-JJ · auteur · mission · écart · attendu : … · vu : … · vérifié : comment (ou « non ») · décision : …`
> La décision est l'une des trois : **garder** (vérifié : on adopte), **creuser** (prochain
> essai, daté), **abandonner** (vrai hasard : on le note).
> Règle : on ne sanctionne pas un écart signalé ; on regarde d'abord, on corrige ensuite,
> s'il le faut.
>
> **Les changements de cap** (fiche n° 13), en une ligne marquée `cap`, signée par qui l'a
> décidé : `AAAA-MM-JJ · auteur · mission · cap · ancien → nouveau · pourquoi : … · fait : …`

2026-11-02 · Claude (orchestrateur) · — · méthode installée (/imperatrice:demarrer) : CLAUDE.md, pilotage/ (equipe, kanban, journal, missions/), docs/adr/ créés ; docs/brief.md existant gardé, seul le nom « Cerf », tranché par Pascal, y est reporté. Reste à remplir : critique du contradicteur et arbitrages du brief, export brut ProdBois, réponse de JFC sur la licence SCAN 25, licence ouverte, successeur, docs/spec.md, ADR de l’architecture, .claude/test-command (dès la stack tranchée), équipe (/imperatrice:mission).
2026-11-02 · contradicteur · brief · critique du brief : 4 bloquants (fonds WMTS non initialisés hors ligne car GetCapabilities non mis en cache ; GeoJSON toujours lu en WGS84 donc règle « sans système » inopérante ; Shapefile sans .prj possiblement assigné en silence ; choix plugin de projet / d’application non fait), 6 importants (registre faisable comme qfield_addLayer ; zip lisible par /vsizip/ comme qfield-layer-loader ; licence GPL-2.0 de qfield-layer-loader à lire ; « toute UT » contre Lambert 93 ; styles sous-spécifiés ; critère des 2 min non mesurable), 5 mineurs, 8 questions à Pascal. Domaines docs.qfield.org, gdal.org, rfc-editor.org bloqués par le réseau de la session : sources de première main non lues.

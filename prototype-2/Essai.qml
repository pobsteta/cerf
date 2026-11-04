// SPDX-License-Identifier: GPL-3.0-or-later
// Cerf, prototype n° 2 (mission 023) : l'écran aux gros boutons (gants, soleil), un bouton
// par question du protocole tests/recette/prototype-2.md. Écrit pour Cerf (ADR 0006).
// La logique pure est dans essai-logique.mjs (testée sous Node) ; ce fichier n'appelle que
// l'API de QField lue dans son code (prototype-2/PLAN.md § 3). Il ne prouve rien par
// lui-même : seul le protocole, rempli par Pascal sur le Samsung, dit ce que QField permet.
// Chaque appel à QField est en try/catch et l'erreur est affichée mot pour mot : le
// prototype ne cache aucun échec.
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import org.qfield
import "essai-logique.mjs" as Zip

Item {
  id: essai
  anchors.fill: parent

  readonly property int taillePolice: 18

  // État de l'essai.
  property string copie: ""            // chemin du zip copié dans cerf-imports
  property string prefixeEnCours: ""
  property var source: null            // QfResourceSource rendu par getFile
  property var entreesZip: []          // répertoire central du zip copié
  property var octetsZip: null         // contenu du zip copié (petit : quelques Ko)
  property var coucheQ4: null          // couche « A » de la question 4
  property var suivies: []             // couches des questions 1 et 3 : { chemin, nom }

  component GrosBouton: Button {
    Layout.fillWidth: true
    Layout.preferredHeight: 72
    font.pointSize: 18
  }

  // -------------------------------------------------------------- contexte

  function dossierProjet() {
    if (!qgisProject) return "";
    const home = String(qgisProject.homePath || "");
    if (home !== "") return home;
    return Zip.dossierDe(String(qgisProject.fileName || ""));
  }

  function nomProjet() {
    return qgisProject ? String(qgisProject.fileName || "") : "";
  }

  // Garde (relecture 2) : le prototype n'agit que dans le projet d'essai cerf-essai-2.qgs. Dans
  // tout autre projet, il refuse et n'écrit ni ne charge rien.
  function projetOk(titre) {
    if (Zip.estProjetEssai(nomProjet())) return true;
    afficher(titre, ["REFUSÉ : le projet ouvert n'est pas « " + Zip.PROJET_ESSAI + " ».",
      "Projet ouvert : " + (nomProjet() || "aucun"),
      "Ouvrir le projet cerf-essai-2, puis recommencer. Rien n'a été écrit ni chargé."]);
    return false;
  }

  function existe(chemin) {
    try {
      return FileUtils.fileExists(chemin);
    } catch (e) {
      return false;
    }
  }

  function entete() {
    let imports = "(aucun projet)";
    try {
      imports = Zip.dossierImports(dossierProjet());
    } catch (e) {
      imports = "ERREUR : " + e.message;
    }
    return "Cerf, prototype n° 2, version " + Zip.VERSION + "\n"
      + "Projet : " + (nomProjet() || "aucun projet ouvert") + "\n"
      + "Dossier du projet : " + (dossierProjet() || "inconnu") + "\n"
      + "Dossier cerf-imports : " + imports + "\n"
      + "Dernier zip copié : " + (copie || "aucun") + (copie ? (existe(copie) ? " (présent)" : " (ABSENT)") : "");
  }

  function afficher(titre, lignes) {
    zoneEntete.text = entete();
    zoneResultat.text = titre + "\n" + lignes.join("\n");
    defilement.contentY = 0;
  }

  // Essaie fn() ; ajoute « libellé : valeur » (ou l'erreur mot pour mot) aux lignes.
  function tenter(lignes, libelle, fn) {
    try {
      const v = fn();
      lignes.push(libelle + " : " + (v === undefined ? "undefined" : (v === null ? "null" : String(v))));
      return v;
    } catch (e) {
      lignes.push(libelle + " : ERREUR " + e);
      return undefined;
    }
  }

  // Lit une propriété, ou la rend si c'est une méthode invocable.
  function lire(objet, nom) {
    const v = objet[nom];
    return typeof v === "function" ? v.call(objet) : v;
  }

  // isNull d'un rectangle (propriété ou méthode) ; undefined si illisible : jamais d'exception.
  function estNul(rect) {
    try {
      return lire(rect, "isNull");
    } catch (e) {
      return undefined;
    }
  }

  // -------------------------------------------------------------- zip (bouton 0)

  function preparerZip() {
    const titre = Zip.BOUTONS.B0;
    if (!projetOk(titre)) return;
    let dossier = "";
    try {
      dossier = Zip.dossierImports(dossierProjet());
    } catch (e) {
      afficher(titre, ["REFUSÉ : " + e.message]);
      return;
    }
    prefixeEnCours = dossier;
    afficher(titre, ["Sélecteur de fichiers ouvert : choisir « " + Zip.NOM_ZIP + " » (Téléchargements).",
      "La copie ira dans : " + dossier]);
    try {
      platformUtilities.requestStoragePermission();
      source = platformUtilities.getFile(dossier, "{filename}", "*/*", essai);
    } catch (e) {
      afficher(titre, ["ERREUR du sélecteur : " + e]);
    }
  }

  function zipRecu(recu) {
    const titre = Zip.BOUTONS.B0;
    if (!recu) {
      afficher(titre, ["Copie annulée ou échouée : aucun chemin reçu de QField."]);
      return;
    }
    copie = Zip.cheminRecu(prefixeEnCours, String(recu));
    const lignes = ["Chemin reçu de QField : " + String(recu), "Copie : " + copie];
    if (Zip.nomDeFichier(copie) !== Zip.NOM_ZIP) lignes.push("ATTENTION : le fichier choisi ne s'appelle pas « " + Zip.NOM_ZIP + " ».");
    chargerZip(lignes, true);
    afficher(titre, lignes);
  }

  // Lit le zip copié et son répertoire central. Rend vrai si prêt.
  function chargerZip(lignes, detail) {
    try {
      if (copie === "") {
        let defaut = "";
        try {
          defaut = Zip.cheminZipCopie(dossierProjet());
        } catch (e) {
          lignes.push("Zip : " + e.message);
          return false;
        }
        if (!existe(defaut)) {
          lignes.push("Aucun zip : toucher d'abord « " + Zip.BOUTONS.B0 + " ».");
          return false;
        }
        copie = defaut;
      }
      if (octetsZip !== null && entreesZip.length > 0 && !detail) return true;
      const octets = Zip.octetsDe(FileUtils.readFileContent(copie));
      if (octets.length === 0) {
        lignes.push("Lecture du zip : 0 octet rendu par QField (copie absente ou hors du projet ?).");
        return false;
      }
      const liste = Zip.listerZip(octets);
      octetsZip = octets;
      entreesZip = liste.entrees;
      if (detail) {
        let stockees = 0;
        for (let i = 0; i < liste.entrees.length; i++) if (liste.entrees[i].methode === 0) stockees++;
        lignes.push("Octets lus : " + octets.length + " ; entrées : " + liste.entrees.length
          + " (stockées : " + stockees + ", compressées : " + (liste.entrees.length - stockees) + ")");
        for (let i = 0; i < liste.entrees.length; i++) lignes.push("  " + Zip.ligneEntree(liste.entrees[i]));
      }
      return true;
    } catch (e) {
      lignes.push("ERREUR de lecture du zip : " + e.message);
      return false;
    }
  }

  // Extrait une entrée vers cerf-imports/<sous>/<nom>, relit le fichier écrit, compare taille
  // et CRC32 à ceux du zip. Lève une erreur si le fichier relu diffère.
  function extraire(sous, nom, lignes) {
    const entree = Zip.trouverEntree(entreesZip, nom);
    if (!entree) throw new Error("« " + nom + " » absente du zip");
    const octets = Zip.extraireEntree(octetsZip, entree);
    const chemin = Zip.cheminSortie(dossierProjet(), sous, nom);
    const retour = FileUtils.writeFileContent(chemin, Zip.arrayBufferExact(octets));
    const relu = Zip.octetsDe(FileUtils.readFileContent(chemin));
    const crc = Zip.crc32(relu);
    const pareil = relu.length === entree.taille && crc === entree.crc32;
    lignes.push(nom + " : écrit (retour de writeFileContent : " + retour + "), relu " + relu.length + " octets pour "
      + entree.taille + " attendus, CRC32 relu " + Zip.hex32(crc) + " pour " + Zip.hex32(entree.crc32)
      + " : " + (pareil ? "IDENTIQUE" : "DIFFÉRENT"));
    if (!pareil) throw new Error("fichier écrit différent du zip : " + nom);
    return chemin;
  }

  // -------------------------------------------------------------- couches

  function compterObjets(couche) {
    let n = 0;
    const it = LayerUtils.createFeatureIterator(couche);
    while (it.hasNext()) {
      it.next();
      n++;
    }
    it.close();
    return n;
  }

  function emprise(couche) {
    const e = couche.extent();
    return { xMinimum: lire(e, "xMinimum"), xMaximum: lire(e, "xMaximum"), yMinimum: lire(e, "yMinimum"), yMaximum: lire(e, "yMaximum") };
  }

  function texteEmprise(e) {
    return "xMinimum " + e.xMinimum + " ; xMaximum " + e.xMaximum + " ; yMinimum " + e.yMinimum + " ; yMaximum " + e.yMaximum;
  }

  // Charge la couche, la décrit, l'ajoute à la carte (ajouter) et la centre.
  function charger(uri, nom, lignes, ajouter) {
    lignes.push("Source : " + uri);
    let couche = null;
    try {
      couche = LayerUtils.loadVectorLayer(uri, nom);
    } catch (e) {
      lignes.push("loadVectorLayer : ERREUR " + e);
      return null;
    }
    if (!couche) {
      lignes.push("loadVectorLayer a rendu null");
      return null;
    }
    const valide = tenter(lignes, "isValid", function () { return couche.isValid; });
    const authid = String(tenter(lignes, "crs.authid", function () { return couche.crs.authid; }));
    let e = null;
    try {
      e = emprise(couche);
      lignes.push("extent() : " + texteEmprise(e));
    } catch (err) {
      lignes.push("extent() : ERREUR " + err);
    }
    if (!valide) return couche;
    if (ajouter) {
      try {
        ProjectUtils.addMapLayer(qgisProject, couche);
        lignes.push("Couche ajoutée à la carte.");
      } catch (err) {
        lignes.push("addMapLayer : ERREUR " + err);
      }
      try {
        iface.mapCanvas().mapSettings.setCenterToLayer(couche, true);
        lignes.push("Carte centrée sur la couche.");
      } catch (err) {
        lignes.push("Centrage : ERREUR " + err);
        if (e) lignes.push("Aller à la main vers : " + Zip.ecrirePosition((e.xMinimum + e.xMaximum) / 2, (e.yMinimum + e.yMaximum) / 2, authid));
      }
    }
    return couche;
  }

  function retirerDeLaCarte(couche) {
    try {
      ProjectUtils.removeMapLayer(qgisProject, String(couche.id));
      return "retirée de la carte";
    } catch (e) {
      return "retrait : ERREUR " + e;
    }
  }

  // Marque la couche du projet (cerf/proto2) pour la retrouver après la réouverture.
  function marquer(couche, nom, lignes) {
    try {
      couche.setCustomProperty("cerf/proto2", nom);
    } catch (e) {
      lignes.push("marquage (setCustomProperty) : ERREUR " + e);
    }
  }

  function suivre(chemin, nom) {
    const liste = [];
    for (let i = 0; i < suivies.length; i++) if (suivies[i].nom !== nom) liste.push(suivies[i]);
    liste.push({ chemin: chemin, nom: nom });
    suivies = liste;
  }

  // -------------------------------------------------------------- questions 1 à 3

  function question1() {
    const titre = Zip.BOUTONS.B1;
    const lignes = [];
    if (!projetOk(titre)) return;
    if (!chargerZip(lignes, false)) { afficher(titre, lignes); return; }
    let chemin = "";
    try {
      extraire("q1", "UG_q1.geojson", lignes);
      extraire("q1", "UG_q1.qml", lignes);
      chemin = Zip.cheminSortie(dossierProjet(), "q1", "UG_q1.geojson");
    } catch (e) {
      lignes.push("ERREUR : " + e.message);
      afficher(titre, lignes);
      return;
    }
    lignes.push("Le .qml est écrit AVANT le chargement de la couche.");
    const couche = charger(chemin, "UG_q1", lignes, true);
    if (couche && couche.isValid) { marquer(couche, "UG_q1", lignes); suivre(chemin, "UG_q1"); }
    lignes.push("À répondre : 1a couleurs (contour bleu 0,6 mm sans remplissage) ; 1b étiquettes (code_ug en bleu, 10 pt).");
    afficher(titre, lignes);
  }

  function question2() {
    const titre = Zip.BOUTONS.B2;
    const lignes = [];
    if (!projetOk(titre)) return;
    if (!chargerZip(lignes, false)) { afficher(titre, lignes); return; }
    lignes.push("Le .qml est dans le zip, nulle part ailleurs.");
    charger(Zip.cheminVsizip(copie, "UG_q2.geojson"), "UG_q2", lignes, true);
    lignes.push("Attendu : valide, mais style par défaut de QGIS (remplissage plein). Bleu sans remplissage avec étiquettes = SURPRISE, à dire en gros.");
    afficher(titre, lignes);
  }

  function question3() {
    const titre = Zip.BOUTONS.B3;
    const lignes = [];
    if (!projetOk(titre)) return;
    if (!chargerZip(lignes, false)) { afficher(titre, lignes); return; }
    let uri = "";
    let chemin = "";
    try {
      chemin = extraire("q3", "Parcelles_q3.gpkg", lignes);
      uri = Zip.uriGpkg(chemin, "Parcelles_q3");
    } catch (e) {
      lignes.push("ERREUR : " + e.message);
      afficher(titre, lignes);
      return;
    }
    const couche = charger(uri, "Parcelles_q3", lignes, true);
    if (couche && couche.isValid) { marquer(couche, "Parcelles_q3", lignes); suivre(uri, "Parcelles_q3"); }
    lignes.push("À répondre : 3a couleurs (contour orange 1 mm sans remplissage) ; 3b étiquettes (code_ug en orange, 15 pt).");
    afficher(titre, lignes);
  }

  // -------------------------------------------------------------- question 4

  function question4() {
    const titre = Zip.BOUTONS.B4;
    const lignes = [];
    if (!projetOk(titre)) return;
    if (!chargerZip(lignes, false)) { afficher(titre, lignes); return; }
    const qml = Zip.cheminSortie(dossierProjet(), "q4", "UG_q4.qml");
    // Rejouable : l'ancienne couche A est retirée, l'ancien .qml effacé par rmFile (ADR 0007,
    // seulement dans <projet>/cerf-imports/ : l'effacement de FileUtils refuse les .qml).
    if (coucheQ4) {
      lignes.push("Ancienne couche A " + retirerDeLaCarte(coucheQ4) + " (essai rejoué).");
      coucheQ4 = null;
    }
    if (existe(qml)) {
      if (!Zip.peutEffacerQml(qml, dossierProjet())) {
        lignes.push("REFUSÉ d'effacer " + qml + " : hors de cerf-imports/ du projet. Essai arrêté.");
        afficher(titre, lignes);
        return;
      }
      tenter(lignes, "UG_q4.qml déjà présent d'un essai précédent, effacé par rmFile", function () { return platformUtilities.rmFile(qml); });
      if (existe(qml)) {
        lignes.push("ATTENTION : UG_q4.qml est TOUJOURS là, l'essai serait faussé. Essai arrêté (voir le protocole, question 4).");
        afficher(titre, lignes);
        return;
      }
    }
    let chemin = "";
    try {
      chemin = extraire("q4", "UG_q4.geojson", lignes);
    } catch (e) {
      lignes.push("ERREUR : " + e.message);
      afficher(titre, lignes);
      return;
    }
    lignes.push("UG_q4.qml absent du dossier : " + (existe(qml) ? "NON, il est présent" : "oui"));
    coucheQ4 = charger(chemin, "UG_q4", lignes, true);
    lignes.push("FERMER la fenêtre du plugin, CAPTURE A (style par défaut attendu : remplissage plein, sans étiquette), rouvrir le plugin. Puis toucher « " + Zip.BOUTONS.B4B + " ».");
    afficher(titre, lignes);
  }

  function question4b() {
    const titre = Zip.BOUTONS.B4B;
    if (!projetOk(titre)) return;
    const lignes = [];
    if (!coucheQ4) { afficher(titre, ["Aucune couche A : toucher d'abord « " + Zip.BOUTONS.B4 + " »."]); return; }
    if (!chargerZip(lignes, false)) { afficher(titre, lignes); return; }
    try {
      extraire("q4", "UG_q4.qml", lignes);
    } catch (e) {
      lignes.push("ERREUR : " + e.message);
      afficher(titre, lignes);
      return;
    }
    lignes.push("La couche A n'a PAS été rechargée. FERMER la fenêtre du plugin, DÉPLACER un peu la carte (pour forcer le redessin), CAPTURE B : la couche A a-t-elle changé ?");
    lignes.push("Puis, si l'on veut : « " + Zip.BOUTONS.B4C + " », puis « " + Zip.BOUTONS.B4D + " ».");
    afficher(titre, lignes);
  }

  function question4c() {
    const titre = Zip.BOUTONS.B4C;
    if (!projetOk(titre)) return;
    const lignes = [];
    if (!coucheQ4) { afficher(titre, ["Aucune couche A : toucher d'abord « " + Zip.BOUTONS.B4 + " »."]); return; }
    tenter(lignes, "typeof couche.reload", function () { return typeof coucheQ4.reload; });
    tenter(lignes, "couche.reload()", function () { return coucheQ4.reload(); });
    tenter(lignes, "couche.isValid après reload", function () { return coucheQ4.isValid; });
    try {
      coucheQ4.triggerRepaint();
      lignes.push("couche.triggerRepaint() : appelé");
    } catch (e) {
      lignes.push("couche.triggerRepaint() : ERREUR " + e);
    }
    lignes.push("La couche A a-t-elle changé de style (vert-bleu avec étiquettes) ? Dire oui ou non au protocole (note 4c) ; fermer la fenêtre du plugin pour regarder la carte.");
    afficher(titre, lignes);
  }

  function question4d() {
    const titre = Zip.BOUTONS.B4D;
    if (!projetOk(titre)) return;
    const lignes = [];
    if (!coucheQ4) { afficher(titre, ["Aucune couche A : toucher d'abord « " + Zip.BOUTONS.B4 + " »."]); return; }
    const chemin = Zip.cheminSortie(dossierProjet(), "q4", "UG_q4.geojson");
    const idA = String(coucheQ4.id);
    lignes.push("Couche A " + retirerDeLaCarte(coucheQ4) + " (pour ne voir que la nouvelle).");
    let encore = true;
    try {
      encore = false;
      const couches = ProjectUtils.mapLayers(qgisProject);
      for (const id in couches) if (String(id) === idA) encore = true;
    } catch (e) {
      lignes.push("Vérification du retrait : ERREUR " + e);
      encore = true;
    }
    lignes.push("Couche A retirée : " + (encore ? "NON (toujours dans le projet)" : "oui"));
    coucheQ4 = null;
    charger(chemin, "UG_q4_bis", lignes, true);
    lignes.push("FERMER la fenêtre du plugin, puis CAPTURE D : attendu, contour vert-bleu (008B8B) sans remplissage, étiquettes code_ug.");
    afficher(titre, lignes);
  }

  // -------------------------------------------------------------- question 5

  function coucheMarquee(nom) {
    if (!qgisProject) return null;
    const couches = ProjectUtils.mapLayers(qgisProject);
    for (const id in couches) {
      const l = couches[id];
      if (!l || typeof l.customProperty !== "function") continue;
      if (String(l.customProperty("cerf/proto2", "")) === nom) return l;
    }
    return null;
  }

  // Sources (chemins) de toutes les couches du projet ouvert.
  function sourcesDuProjet(lignes) {
    const sources = [];
    if (!qgisProject) return sources;
    const couches = ProjectUtils.mapLayers(qgisProject);
    for (const id in couches) {
      const l = couches[id];
      if (!l) continue;
      try {
        let src = l.source;
        if (src === undefined || src === null || typeof src === "function") src = lire(l, "publicSource");
        sources.push(String(src));
      } catch (e) {
        lignes.push("source d'une couche du projet : ERREUR " + e);
      }
    }
    return sources;
  }

  function memoriser() {
    const titre = Zip.BOUTONS.B5M;
    const lignes = [];
    if (!projetOk(titre)) return;
    if (suivies.length === 0) {
      afficher(titre, ["Aucune couche des questions 1 et 3 chargée : faire d'abord « " + Zip.BOUTONS.B1 + " » et « " + Zip.BOUTONS.B3 + " »."]);
      return;
    }
    try {
      settings.setValue(Zip.CLE_REGISTRE, Zip.ecrireRegistre(suivies));
      settings.sync();
      lignes.push("Réglages de QField : écrit " + suivies.length + " couche(s).");
      lignes.push("Relu : " + String(settings.value(Zip.CLE_REGISTRE, "")));
    } catch (e) {
      lignes.push("Réglages : ERREUR " + e);
    }
    for (let i = 0; i < suivies.length; i++) {
      const nom = suivies[i].nom;
      try {
        const l = coucheMarquee(nom) || null;
        lignes.push(nom + " : couche marquée (cerf/proto2) retrouvée dans le projet : " + (l ? "oui" : "NON"));
      } catch (e) {
        lignes.push(nom + " : recherche de la couche : ERREUR " + e);
      }
    }
    const trouvees = Zip.compterParSource(suivies, sourcesDuProjet(lignes));
    lignes.push("Couches retrouvées par leur source (chemin) : " + trouvees.nombre + " sur " + suivies.length);
    lignes.push("MAINTENANT : fermer le projet puis le rouvrir (sans rien d'autre). Le plugin recharge les couches tout seul ; sinon toucher « " + Zip.BOUTONS.B5R + " ».");
    afficher(titre, lignes);
  }

  // Appelé à la réouverture du projet (automatique) ou par le bouton « 5. Après réouverture ».
  function reouverture(automatique) {
    const titre = Zip.BOUTONS.B5R;
    // Relecture 2 : rien dans un autre projet que cerf-essai-2.qgs.
    if (!Zip.estProjetEssai(nomProjet())) {
      if (!automatique) projetOk(titre);
      return;
    }
    const lignes = [automatique ? "Réouverture détectée (loadProjectEnded)." : "Bouton touché."];
    let liste = [];
    try {
      liste = Zip.lireRegistre(String(settings.value(Zip.CLE_REGISTRE, "")));
    } catch (e) {
      lignes.push("Réglages : ERREUR " + e);
    }
    lignes.push("Couches mémorisées : " + liste.length);
    // Compté par la source (chemin), avant tout rechargement.
    const avant = Zip.compterParSource(liste, sourcesDuProjet(lignes));
    lignes.push("Présentes dans le projet à l'ouverture (par la source) : n = " + avant.nombre + " sur " + liste.length
      + (avant.nombre > 0 ? " (le style vu peut venir du projet enregistré)" : ""));
    for (let i = 0; i < liste.length; i++) {
      let dedans = false;
      for (let k = 0; k < avant.noms.length; k++) if (avant.noms[k] === liste[i].nom) dedans = true;
      if (dedans) {
        lignes.push(liste[i].nom + " : déjà dans le projet, non rechargée");
        continue;
      }
      lignes.push("--- " + liste[i].nom + " : rechargée depuis le disque, sans réécrire de .qml");
      const couche = charger(liste[i].chemin, liste[i].nom, lignes, true);
      if (couche && couche.isValid) marquer(couche, liste[i].nom, lignes);
    }
    lignes.push("À répondre, couche par couche : UG_q1 (bleu, étiquettes) et Parcelles_q3 (orange, étiquettes) sont-elles revenues avec leur style ?");
    afficher(titre, lignes);
  }

  Connections {
    target: iface
    ignoreUnknownSignals: true
    function onLoadProjectEnded(path, name) {
      essai.reouverture(true);
    }
  }

  // -------------------------------------------------------------- question 6

  function listeNoms(objet, noms) {
    const sortie = [];
    for (let i = 0; i < noms.length; i++) sortie.push(noms[i] + " : " + typeof objet[noms[i]]);
    return sortie.join(" ; ");
  }

  function reprojection() {
    const titre = Zip.BOUTONS.B6;
    const lignes = [];
    if (!projetOk(titre)) return;
    let l93 = null;
    let wgs = null;
    tenter(lignes, "fromDescription(EPSG:2154).isValid", function () { l93 = CoordinateReferenceSystemUtils.fromDescription("EPSG:2154"); return l93.isValid; });
    tenter(lignes, "  authid", function () { return l93.authid; });
    tenter(lignes, "wgs84Crs().isValid", function () { wgs = CoordinateReferenceSystemUtils.wgs84Crs(); return wgs.isValid; });
    tenter(lignes, "  authid", function () { return wgs.authid; });

    lignes.push("--- Ligne 1 : point WGS84 longitude " + Zip.POINT_WGS84.lon + ", latitude " + Zip.POINT_WGS84.lat + " vers EPSG:2154");
    tenter(lignes, "Ligne 1", function () {
      const p = GeometryUtils.point(Zip.POINT_WGS84.lon, Zip.POINT_WGS84.lat);
      lignes.push("  point d'entrée lu : x " + p.x + " ; y " + p.y);
      const r = GeometryUtils.reprojectPoint(p, wgs, l93);
      const j = Zip.jugerPoint(r.x, r.y);
      lignes.push("  x = " + r.x + " ; y = " + r.y);
      if (typeof r.x === "number" && typeof r.y === "number") lignes.push("  " + Zip.ecrirePosition(r.x, r.y, "EPSG:2154"));
      lignes.push("  " + j.texte);
      return j.conforme ? "OUI" : "NON";
    });

    lignes.push("--- Ligne 2 : emprise WGS84 (" + Zip.RECT_WGS84.lon1 + " ; " + Zip.RECT_WGS84.lat1 + ") à (" + Zip.RECT_WGS84.lon2 + " ; " + Zip.RECT_WGS84.lat2 + ")");
    let rr = null;
    tenter(lignes, "Ligne 2", function () {
      const a = GeometryUtils.point(Zip.RECT_WGS84.lon1, Zip.RECT_WGS84.lat1);
      const b = GeometryUtils.point(Zip.RECT_WGS84.lon2, Zip.RECT_WGS84.lat2);
      const rect = GeometryUtils.createRectangleFromPoints(a, b);
      rr = GeometryUtils.reprojectRectangle(rect, wgs, l93);
      const e = { xMinimum: lire(rr, "xMinimum"), xMaximum: lire(rr, "xMaximum"), yMinimum: lire(rr, "yMinimum"), yMaximum: lire(rr, "yMaximum") };
      lignes.push("  " + texteEmprise(e));
      tenter(lignes, "  isNull", function () { return lire(rr, "isNull"); });
      return "emprise rendue";
    });

    lignes.push("--- Ligne 3 : l'emprise est-elle dans X " + Zip.EMPRISE_L93.xmin + " à " + Zip.EMPRISE_L93.xmax + ", Y " + Zip.EMPRISE_L93.ymin + " à " + Zip.EMPRISE_L93.ymax + " ?");
    tenter(lignes, "Ligne 3", function () {
      if (!rr) return "pas d'emprise (ligne 2 en échec) : NON";
      const e = { xMinimum: lire(rr, "xMinimum"), xMaximum: lire(rr, "xMaximum"), yMinimum: lire(rr, "yMinimum"), yMaximum: lire(rr, "yMaximum"), isNull: estNul(rr) };
      lignes.push("  " + texteEmprise(e) + " ; isNull " + e.isNull);
      return Zip.empriseVraisemblable(e) ? "OUI, vraisemblable" : "NON (vide, inversée, nulle ou hors emprise)";
    });

    lignes.push("--- Ligne 4 : noms qui existent (typeof)");
    tenter(lignes, "GeometryUtils", function () {
      return listeNoms(GeometryUtils, ["reprojectPoint", "reprojectRectangle", "point", "createRectangleFromPoints", "polygonFromRectangle", "transformGeometry"]);
    });
    tenter(lignes, "CoordinateReferenceSystemUtils", function () {
      return listeNoms(CoordinateReferenceSystemUtils, ["fromDescription", "wgs84Crs", "invalidCrs", "fromEpsgId", "fromWkt", "fromProj"]);
    });

    lignes.push("--- Ligne 5 : même système des deux côtés (EPSG:2154 vers EPSG:2154)");
    tenter(lignes, "Ligne 5", function () {
      const entree = GeometryUtils.point(Zip.POINT_ATTENDU_L93.x, Zip.POINT_ATTENDU_L93.y);
      const r = GeometryUtils.reprojectPoint(entree, l93, l93);
      return "x = " + r.x + " ; y = " + r.y + " : " + Zip.classerSortie({ x: entree.x, y: entree.y }, r) + " (attendu : sans changement)";
    });

    lignes.push("--- Ligne 6 : système source invalide (invalidCrs) vers EPSG:2154");
    tenter(lignes, "Ligne 6", function () {
      const inv = CoordinateReferenceSystemUtils.invalidCrs();
      const entree = GeometryUtils.point(Zip.POINT_WGS84.lon, Zip.POINT_WGS84.lat);
      const r = GeometryUtils.reprojectPoint(entree, inv, l93);
      return "x = " + r.x + " ; y = " + r.y + " : " + Zip.classerSortie({ x: entree.x, y: entree.y }, r);
    });

    lignes.push("--- Ligne 7 : reprojection impossible (mètres Lambert 93 pris pour des degrés WGS84)");
    tenter(lignes, "Ligne 7", function () {
      const entree = GeometryUtils.point(Zip.POINT_ATTENDU_L93.x, Zip.POINT_ATTENDU_L93.y);
      const r = GeometryUtils.reprojectPoint(entree, wgs, l93);
      lignes.push("  isNull du point : " + tenter([], "isNull", function () { return lire(r, "isNull"); }));
      return "x = " + r.x + " ; y = " + r.y + " : " + Zip.classerSortie({ x: entree.x, y: entree.y }, r);
    });
    afficher(titre, lignes);
  }

  // -------------------------------------------------------------- question 7

  function metadonnees() {
    const titre = Zip.BOUTONS.B7;
    const lignes = [];
    if (!projetOk(titre)) return;
    if (!chargerZip(lignes, false)) { afficher(titre, lignes); return; }
    let l93 = null;
    tenter(lignes, "fromDescription(EPSG:2154)", function () { l93 = CoordinateReferenceSystemUtils.fromDescription("EPSG:2154"); return l93.isValid; });
    const entrees = ["UG_q2.geojson", "Sans_crs.geojson", "FRT_q7.shp", "FRT_sansprj.shp"];
    for (let i = 0; i < entrees.length; i++) {
      const nom = entrees[i];
      lignes.push("=== " + nom + " (en /vsizip/)");
      let couche = null;
      try {
        couche = LayerUtils.loadVectorLayer(Zip.cheminVsizip(copie, nom), nom);
      } catch (e) {
        lignes.push("loadVectorLayer : ERREUR " + e);
        continue;
      }
      if (!couche) { lignes.push("loadVectorLayer a rendu null"); continue; }
      tenter(lignes, "isValid", function () { return couche.isValid; });
      const authid = String(tenter(lignes, "crs.authid", function () { return couche.crs.authid; }));
      tenter(lignes, "crs.isValid", function () { return couche.crs.isValid; });
      if (nom === "Sans_crs.geojson") lignes.push("Lu en WGS84 (EPSG:4326 ou OGC:CRS84 admis) : " + (Zip.estWgs84(authid) ? "oui" : "NON"));
      tenter(lignes, "crs.description", function () { return couche.crs.description; });
      let e = null;
      try {
        e = emprise(couche);
        lignes.push("extent() : " + texteEmprise(e));
        lignes.push("  " + Zip.ecrirePosition(e.xMinimum, e.yMinimum, authid) + " (coin xMinimum, yMinimum)");
      } catch (err) {
        lignes.push("extent() : ERREUR " + err);
      }
      tenter(lignes, "featureCount() appelé en direct", function () { return couche.featureCount(); });
      tenter(lignes, "comptage par createFeatureIterator", function () { return compterObjets(couche); });
      if (e) {
        tenter(lignes, "emprise reprojetée en EPSG:2154", function () {
          const rect = couche.extent();
          const rr = GeometryUtils.reprojectRectangle(rect, couche.crs, l93);
          const er = { xMinimum: lire(rr, "xMinimum"), xMaximum: lire(rr, "xMaximum"), yMinimum: lire(rr, "yMinimum"), yMaximum: lire(rr, "yMaximum"), isNull: estNul(rr) };
          lignes.push("  " + texteEmprise(er) + " ; isNull " + er.isNull);
          lignes.push("  " + Zip.verdictSansCrs(authid, er));
          return "fait";
        });
      }
    }
    afficher(titre, lignes);
  }

  // -------------------------------------------------------------- écran

  Connections {
    target: essai.source
    ignoreUnknownSignals: true
    function onResourceReceived(path) {
      essai.zipRecu(path);
    }
  }

  Flickable {
    id: defilement
    anchors.fill: parent
    contentWidth: width
    contentHeight: colonne.implicitHeight
    clip: true

    ColumnLayout {
      id: colonne
      width: defilement.width
      spacing: 8

      Label {
        id: zoneEntete
        Layout.fillWidth: true
        wrapMode: Text.WrapAnywhere
        color: "black"
        font.pointSize: essai.taillePolice - 4
      }

      Rectangle {
        Layout.fillWidth: true
        Layout.preferredHeight: zoneResultat.implicitHeight + 16
        color: "#fff8e1"
        border.color: "black"
        border.width: 2

        Label {
          id: zoneResultat
          x: 8
          y: 8
          width: parent.width - 16
          wrapMode: Text.WrapAnywhere
          color: "black"
          font.pointSize: essai.taillePolice - 2
          font.bold: true
          text: "Prêt. Mode avion, puis suivre le protocole."
        }
      }

      GrosBouton { text: Zip.BOUTONS.B0; onClicked: essai.preparerZip() }
      GrosBouton { text: Zip.BOUTONS.B1; onClicked: essai.question1() }
      GrosBouton { text: Zip.BOUTONS.B2; onClicked: essai.question2() }
      GrosBouton { text: Zip.BOUTONS.B3; onClicked: essai.question3() }
      GrosBouton { text: Zip.BOUTONS.B4; onClicked: essai.question4() }
      GrosBouton { text: Zip.BOUTONS.B4B; onClicked: essai.question4b() }
      GrosBouton { text: Zip.BOUTONS.B4C; onClicked: essai.question4c() }
      GrosBouton { text: Zip.BOUTONS.B4D; onClicked: essai.question4d() }
      GrosBouton { text: Zip.BOUTONS.B5M; onClicked: essai.memoriser() }
      GrosBouton { text: Zip.BOUTONS.B5R; onClicked: essai.reouverture(false) }
      GrosBouton { text: Zip.BOUTONS.B6; onClicked: essai.reprojection() }
      GrosBouton { text: Zip.BOUTONS.B7; onClicked: essai.metadonnees() }

      Item { Layout.preferredHeight: 48 }
    }
  }

  Component.onCompleted: zoneEntete.text = entete()
}

// SPDX-License-Identifier: GPL-3.0-or-later
// Cerf, plugin QField d'application (mission 008) : le pont entre la logique
// (cerf-logique.mjs, testée sous Node) et l'API de QField. Seul fichier qui importe le module.
// Écrit pour Cerf (ADR 0006). Appels de QField lus dans QField v4.3.7 (commit 3fb1281) : voir
// plugin/PLAN.md § 5, qui dit pour chacun s'il est prouvé sur le Samsung ou non.
import QtQuick
import org.qfield
import "cerf-logique.mjs" as Logique

Item {
  id: cerf
  visible: false

  // Un message à montrer à l'agent (toast et zone de messages du panneau).
  signal message(string texte)
  // Le registre a changé : le panneau relit la liste.
  signal registreChange()

  readonly property string versionPlugin: Logique.VERSION
  property var source: null          // QfResourceSource rendu par getFile
  property string prefixeEnCours: ""

  // -------------------------------------------------------------- contexte QField

  function versionQField() {
    try {
      return String(Qfield.version);
    } catch (e) {
      return "";
    }
  }

  function variables() {
    if (!qgisProject) return null;
    return ExpressionContextUtils.projectVariables(qgisProject);
  }

  function cerfId() {
    return Logique.lireCerfId(variables());
  }

  // Dossier du projet : qgisProject.homePath (QGIS qgsproject.h L119) ; à défaut (chaîne
  // vide), le dossier du fichier projet, celui que FileUtils.isWithinProjectDirectory prend
  // pour référence (qffileutils.cpp L541-556). Les copies vont dans <ce dossier>/cerf-imports
  // (repli de la spec § 9 n° 1, appliqué par Pascal le 3 novembre 2026).
  function dossierProjet() {
    if (!qgisProject) return "";
    const home = String(qgisProject.homePath || "");
    if (home !== "") return home;
    return Logique.dossierDe(String(qgisProject.fileName || ""));
  }

  // Registre dans les réglages de QField (QfSettings, contexte « settings ») ; sync après
  // chaque écriture pour qu'un redémarrage brutal ne perde rien.
  readonly property var reglages: ({
    value: function (cle, defaut) { return settings.value(cle, defaut); },
    setValue: function (cle, valeur) { settings.setValue(cle, valeur); settings.sync(); }
  })

  // -------------------------------------------------------------- couches sur la carte

  // Couche du projet marquée (zip, couche) par Cerf, ou null.
  function coucheMarquee(zip, nom) {
    if (!qgisProject) return null;
    const couches = ProjectUtils.mapLayers(qgisProject);
    for (const id in couches) {
      const l = couches[id];
      if (!l || typeof l.customProperty !== "function") continue;
      if (String(l.customProperty("cerf/zip", "")) === zip && String(l.customProperty("cerf/couche", "")) === nom) return l;
    }
    return null;
  }

  // chargerCouche(source, nom) du contrat : charge la couche par GDAL, la marque et l'ajoute
  // à la carte si elle est valide ; une couche déjà présente (même marque) est rendue telle
  // quelle (pas de double chargement). La logique pose readOnly ensuite.
  function chargeur() {
    const dossier = Logique.dossierCopies(dossierProjet());
    return function (source, nom) {
      const zip = Logique.zipDeLaSource(source, dossier);
      const deja = coucheMarquee(zip, nom);
      if (deja) return deja;
      const couche = LayerUtils.loadVectorLayer(source, nom);
      if (couche && couche.isValid) {
        couche.setCustomProperty("cerf/zip", zip);
        couche.setCustomProperty("cerf/couche", nom);
        ProjectUtils.addMapLayer(qgisProject, couche);
      }
      return couche;
    };
  }

  function retirerDeLaCarte(zip, nom) {
    const l = coucheMarquee(zip, nom);
    if (l) ProjectUtils.removeMapLayer(qgisProject, String(l.id));
  }

  function retirerLeZipDeLaCarte(zip) {
    if (!qgisProject) return;
    const couches = ProjectUtils.mapLayers(qgisProject);
    const ids = [];
    for (const id in couches) {
      const l = couches[id];
      if (l && typeof l.customProperty === "function" && String(l.customProperty("cerf/zip", "")) === zip) ids.push(String(l.id));
    }
    for (let i = 0; i < ids.length; i++) ProjectUtils.removeMapLayer(qgisProject, ids[i]);
  }

  // -------------------------------------------------------------- taille d'une copie

  // Par LocalFilesModel (sans contrôle de dossier ; motif du prototype). -1 si inconnue.
  function tailleFichier(chemin) {
    try {
      fichiers.currentPath = Logique.dossierDe(chemin);
      const nom = Logique.nomDeFichier(chemin);
      const n = fichiers.rowCount();
      for (let i = 0; i < n; i++) {
        const element = fichiers.get(i);
        if (Logique.nomDeFichier(String(element.path)) === nom) return Number(element.size);
      }
    } catch (e) {
      return -1;
    }
    return -1;
  }

  LocalFilesModel {
    id: fichiers
  }

  // -------------------------------------------------------------- gestes

  // Geste 2 : ouverture du projet. Rend le résultat de demarrerProjet.
  function demarrer() {
    const id = cerfId();
    const r = Logique.demarrerProjet({
      variables: variables(),
      reglages: reglages,
      dossierProjet: dossierProjet(),
      existe: function (chemin) { return FileUtils.fileExists(chemin); },
      chargerCouche: id ? chargeur() : function () { return null; }
    });
    registreChange();
    return r;
  }

  // Gestes 3 et 4 : sélecteur Android, copie dans <dossier du projet>/cerf-imports/.
  function ajouterZip() {
    const id = cerfId();
    if (!id) {
      message("Projet non Cerf (cerf_id absent ou invalide) : rien n'est importé.");
      return;
    }
    const dossier = Logique.dossierCopies(dossierProjet());
    if (dossier === "") {
      message("Dossier du projet inconnu : rien n'est importé.");
      return;
    }
    // Garde : la copie doit être lisible par le plugin, donc dans le dossier du projet aux
    // yeux de QField (readFileContent, qffileutils.cpp L620-628), avant même de copier.
    if (!FileUtils.isWithinProjectDirectory(dossier + "/essai.zip")) {
      message("QField ne tient pas " + dossier + " pour le dossier du projet : rien n'est copié (version de QField "
        + (versionQField() || "inconnue") + ").");
      return;
    }
    prefixeEnCours = dossier + "/";
    platformUtilities.requestStoragePermission();
    source = platformUtilities.getFile(prefixeEnCours, "{filename}", "*/*", cerf);
  }

  // Geste 5 : la copie est arrivée (QField l'annonce même si elle a échoué : on vérifie).
  function zipRecu(recu) {
    const id = cerfId();
    if (!id) return;
    // Le dossier où la copie a été demandée (et non celui d'un projet ouvert entre-temps).
    const dossier = Logique.dossierDe(prefixeEnCours + "x");
    if (dossier !== Logique.dossierCopies(dossierProjet())) {
      message("Le projet a changé pendant le choix du zip : rien n'est importé.");
      return;
    }
    if (!recu) {
      message("Aucun zip choisi.");
      return;
    }
    const nom = String(recu);
    const chemin = dossier + "/" + nom;
    if (!Logique.estNomDeZip(nom)) {
      const e = Logique.effacerCopie(platformUtilities, chemin, dossier);
      message("« " + nom + " » n'est pas un zip : rien n'est importé. " + e.message);
      return;
    }
    if (!FileUtils.fileExists(chemin)) {
      message(nom + " : la copie a échoué (fichier absent après le choix) ; rien n'est importé.");
      return;
    }
    const taille = tailleFichier(chemin);
    if (!Logique.listageSur(taille)) {
      let texte = Logique.messageListageRefuse(nom, taille);
      if (!Logique.zipUtilise(reglages, id, nom)) texte += "\n" + Logique.effacerCopie(platformUtilities, chemin, dossier).message;
      message(texte);
      return;
    }
    const octets = Logique.octetsDe(FileUtils.readFileContent(chemin));
    if (octets.length === 0 && taille > 0) {
      message(Logique.messageLectureRefusee(nom, versionQField(), FileUtils.isWithinProjectDirectory(chemin)));
      return;
    }
    // Zip réimporté sous le même nom : ses couches sont retirées de la carte puis rechargées.
    retirerLeZipDeLaCarte(nom);
    const r = Logique.importerZip({
      cerfId: id,
      dossierProjet: dossierProjet(),
      nomZip: nom,
      octets: octets,
      reglages: reglages,
      chargerCouche: chargeur(),
      maintenant: function () { return new Date(); }
    });
    let texte = r.message;
    if (r.chargees.length === 0 && !Logique.zipUtilise(reglages, id, nom)) {
      texte += "\n" + Logique.effacerCopie(platformUtilities, chemin, dossier).message;
    }
    message(texte);
    registreChange();
  }

  Connections {
    target: cerf.source
    ignoreUnknownSignals: true
    function onResourceReceived(path) {
      cerf.zipRecu(path);
    }
  }

  // Geste 7 : retirer une couche (carte, registre, copie si plus aucune couche ne s'en sert).
  function retirer(zip, couche) {
    const r = Logique.retirerCouche({
      cerfId: cerfId(),
      dossierProjet: dossierProjet(),
      zip: zip,
      couche: couche,
      reglages: reglages,
      retirerDeLaCarte: function (nom) { cerf.retirerDeLaCarte(zip, nom); },
      platformUtilities: platformUtilities
    });
    message(r.message);
    registreChange();
  }

  // Couches du registre, pour le panneau.
  function couchesInscrites() {
    const id = cerfId();
    return id ? Logique.lireRegistre(reglages, id) : [];
  }
}

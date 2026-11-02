// SPDX-License-Identifier: GPL-3.0-or-later
// Cerf, prototype n° 1 (mission 004) : l'écran aux gros boutons (gants, soleil).
// Écrit pour Cerf (ADR 0006). La logique est dans cerf-zip.mjs (testé sous Node) ; ce
// fichier n'appelle que l'API de QField lue dans son code (prototype/PLAN.md § 4).
// Il ne prouve rien par lui-même : seul le protocole tests/recette/prototype-1.md, rempli
// par Pascal sur le Samsung, dit ce que QField permet.
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import org.qfield
import "cerf-zip.mjs" as Zip

Item {
  id: cerf
  anchors.fill: parent

  // Fourni par main.qml : essayerModule().
  property var hote: null

  readonly property int taillePolice: 18
  readonly property int hauteurBouton: 72

  // État de l'essai.
  property string copie: ""            // chemin de la dernière copie (A ou B)
  property string prefixeEnCours: ""
  property string lettreEnCours: ""
  property var source: null            // QfResourceSource rendu par getFile
  property var derniereListe: null     // entrées lues par C ou I
  property string derniereListeDe: ""
  property var derniersOctets: null
  property bool risqueArme: false

  // Composant en ligne : il ne voit pas les id du fichier, d'où les valeurs écrites ici
  // (les mêmes que hauteurBouton et taillePolice).
  component GrosBouton: Button {
    Layout.fillWidth: true
    Layout.preferredHeight: 72
    font.pointSize: 18
  }

  // -------------------------------------------------------------- lecture du contexte

  function dossierProjet() {
    return qgisProject ? String(qgisProject.homePath) : "";
  }

  function dossierApplication() {
    return String(platformUtilities.applicationDirectory());
  }

  function lireCerfId() {
    if (!qgisProject) return "";
    const variables = ExpressionContextUtils.projectVariables(qgisProject);
    if (!variables || variables["cerf_id"] === undefined || variables["cerf_id"] === null) return "";
    return String(variables["cerf_id"]);
  }

  function entete() {
    const id = lireCerfId();
    return "Cerf, prototype n° 1, version " + Zip.VERSION + "\n"
      + "cerf_id lu : " + (id !== "" ? id : "cerf_id absent") + "\n"
      + "Dossier du projet : " + (dossierProjet() || "aucun projet ouvert") + "\n"
      + "Dossier de l'application : " + dossierApplication() + "\n"
      + "Copie en cours : " + (copie || "aucune");
  }

  function afficher(titre, lignes) {
    zoneEntete.text = entete();
    zoneResultat.text = titre + "\n" + lignes.join("\n");
    defilement.contentY = 0;
  }

  // Taille d'un fichier par LocalFilesModel (sans contrôle de dossier) ; -1 si inconnue.
  function tailleFichier(chemin) {
    try {
      fichiers.currentPath = Zip.dossierDe(chemin);
      const nom = Zip.nomDeFichier(chemin);
      const n = fichiers.rowCount();
      for (let i = 0; i < n; i++) {
        const element = fichiers.get(i);
        if (Zip.nomDeFichier(String(element.path)) === nom) return Number(element.size);
      }
    } catch (e) {
      return -1;
    }
    return -1;
  }

  function texteTaille(taille) {
    return taille >= 0 ? taille + " octets" : "inconnue (fichier non trouvé par LocalFilesModel)";
  }

  // -------------------------------------------------------------- A et B : copier

  function copier(lettre) {
    const titre = lettre === "A" ? Zip.BOUTONS.A : Zip.BOUTONS.B;
    let prefixe = "";
    try {
      prefixe = lettre === "A"
        ? Zip.prefixeHorsProjet(dossierApplication(), lireCerfId())
        : Zip.prefixeDansProjet(dossierProjet());
    } catch (e) {
      afficher(titre, ["REFUSÉ : " + e.message]);
      return;
    }
    prefixeEnCours = prefixe;
    lettreEnCours = lettre;
    afficher(titre, ["Sélecteur de fichiers ouvert : choisir un .zip.", "La copie ira dans : " + prefixe]);
    platformUtilities.requestStoragePermission();
    source = platformUtilities.getFile(prefixe, "{filename}", "*/*", cerf);
  }

  function copieRecue(recu) {
    const titre = lettreEnCours === "A" ? Zip.BOUTONS.A : Zip.BOUTONS.B;
    if (!recu) {
      afficher(titre, ["Copie annulée ou échouée : aucun chemin reçu de QField."]);
      return;
    }
    const chemin = Zip.cheminRecu(prefixeEnCours, String(recu));
    copie = chemin;
    derniereListe = null;
    derniereListeDe = "";
    derniersOctets = null;
    const presente = FileUtils.fileExists(chemin);
    const lignes = [
      presente ? "Copie faite." : "Copie NON trouvée après le choix.",
      "Chemin de la copie : " + chemin,
      "cerf_id lu : " + (lireCerfId() || "cerf_id absent"),
      "Taille de la copie : " + texteTaille(tailleFichier(chemin)),
      "Copie hors du dossier projet (calcul du module) : " + (Zip.estHorsDossier(chemin, dossierProjet()) ? "oui" : "non"),
      "Dans le dossier projet selon QField (isWithinProjectDirectory) : " + (FileUtils.isWithinProjectDirectory(chemin) ? "oui" : "non"),
    ];
    const nom = Zip.nomDeFichier(chemin);
    if (!Zip.estNomDeZip(nom)) lignes.push(Zip.messageNomRefuse(nom));
    afficher(titre, lignes);
  }

  Connections {
    target: cerf.source
    ignoreUnknownSignals: true
    function onResourceReceived(path) {
      cerf.copieRecue(path);
    }
  }

  // -------------------------------------------------------------- C et I : lister

  function lister(force) {
    const titre = force ? Zip.BOUTONS.I : Zip.BOUTONS.C;
    if (!copie) {
      afficher(titre, ["Aucune copie : toucher d'abord A ou B."]);
      return;
    }
    if (!FileUtils.fileExists(copie)) {
      afficher(titre, ["zip absent", "Chemin : " + copie, "Aucune entrée listée."]);
      return;
    }
    const taille = tailleFichier(copie);
    if (!force && !Zip.lectureSure(taille)) {
      afficher(titre, ["Lecture NON tentée : la copie fait " + taille + " octets, au-delà de "
        + Zip.SEUIL_LECTURE_OCTETS + " octets.",
        "Pour la lire en mémoire, utiliser « " + Zip.BOUTONS.I + " », en dernier."]);
      return;
    }
    const lieu = Zip.lieuDeLecture(copie, dossierProjet());
    const debut = Date.now();
    let octets = null;
    try {
      octets = Zip.octetsDe(FileUtils.readFileContent(copie));
    } catch (e) {
      afficher(titre, ["ERREUR de lecture : " + e.message, "Lu dans : " + lieu, "Chemin : " + copie]);
      return;
    }
    if (octets.length === 0) {
      afficher(titre, ["Lecture refusée par QField : 0 octet rendu"
        + (lieu === "copie hors du dossier projet" ? " (hors du dossier projet)." : "."),
        "Lu dans : " + lieu, "Chemin : " + copie, "Aucune entrée listée."]);
      return;
    }
    let liste = null;
    try {
      liste = Zip.listerZip(octets);
    } catch (e) {
      afficher(titre, ["ERREUR : " + e.message, "Lu dans : " + lieu, "Chemin : " + copie]);
      return;
    }
    const duree = Date.now() - debut;
    derniereListe = liste.entrees;
    derniereListeDe = copie;
    derniersOctets = force ? null : octets;
    const lignes = ["Lu dans : " + lieu, "Chemin : " + copie, "Octets lus : " + octets.length,
      "Nombre d'entrées : " + liste.entrees.length];
    for (let i = 0; i < liste.entrees.length; i++) {
      const e = liste.entrees[i];
      lignes.push("  " + e.nom + " (" + e.taille + " octets" + (e.methode === 0 ? ", sans compression" : "") + ")");
    }
    if (force) lignes.push("Temps de lecture et de listage : " + duree + " ms");
    afficher(titre, lignes);
  }

  function essaiARisque() {
    if (!risqueArme) {
      risqueArme = true;
      afficher(Zip.BOUTONS.I, ["ESSAI À RISQUE, à faire EN DERNIER.",
        "Le zip entier est lu en mémoire : QField peut se fermer avec un gros fichier (200 Mo).",
        "Copie visée : " + (copie || "aucune"),
        "Toucher de nouveau « " + Zip.BOUTONS.I + " » pour lancer ; tout autre bouton annule."]);
      return;
    }
    risqueArme = false;
    lister(true);
  }

  // -------------------------------------------------------------- D : effacer

  function effacer() {
    const titre = Zip.BOUTONS.D;
    if (!copie) {
      afficher(titre, ["Aucune copie : toucher d'abord A ou B."]);
      return;
    }
    if (!FileUtils.fileExists(copie)) {
      afficher(titre, ["zip absent (déjà effacé)", "Chemin : " + copie]);
      return;
    }
    const parDelete = FileUtils.deleteFiles([copie]);
    const faitParDelete = parDelete && parDelete[copie] === true;
    let parRm = "non tenté (déjà effacé par deleteFiles)";
    if (FileUtils.fileExists(copie)) parRm = platformUtilities.rmFile(copie) ? "fait" : "refusé";
    const reste = FileUtils.fileExists(copie);
    afficher(titre, [
      "FileUtils.deleteFiles : " + (faitParDelete ? "fait" : "refusé") + " (" + JSON.stringify(parDelete) + ")",
      "platformUtilities.rmFile : " + parRm,
      reste ? "zip TOUJOURS PRÉSENT : " + copie : "zip absent",
      "Chemin : " + copie,
    ]);
  }

  // -------------------------------------------------------------- F et H : couches

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

  function ouvrirCouches() {
    const titre = Zip.BOUTONS.F;
    if (!copie) {
      afficher(titre, ["Aucune copie : toucher d'abord A ou B."]);
      return;
    }
    const lignes = ["Copie : " + copie + " (" + Zip.lieuDeLecture(copie, dossierProjet()) + ")"];
    for (let i = 0; i < Zip.ENTREES_VECTEUR.length; i++) {
      const entree = Zip.ENTREES_VECTEUR[i];
      const uri = Zip.cheminVsizip(copie, entree);
      const couche = LayerUtils.loadVectorLayer(uri, entree);
      if (!couche || !couche.isValid) {
        lignes.push(entree + " : NON ouverte (" + uri + ")");
        continue;
      }
      const authid = String(couche.crs.authid);
      const emprise = couche.extent();
      lignes.push(entree + " : ouverte");
      lignes.push("  Nombre d'objets : " + compterObjets(couche));
      lignes.push("  Système : " + (authid || "inconnu"));
      lignes.push("  Position : " + Zip.ecrirePosition(emprise.xMinimum, emprise.yMinimum, authid));
      lignes.push("  " + Zip.verifierPointEssai(emprise.xMinimum, emprise.yMinimum, authid).texte);
    }
    afficher(titre, lignes);
  }

  function ouvrirGeotiff() {
    const titre = Zip.BOUTONS.H;
    if (!copie) {
      afficher(titre, ["Aucune copie : toucher d'abord A ou B (avec lourd.zip)."]);
      return;
    }
    const uri = Zip.cheminVsizip(copie, Zip.ENTREE_GEOTIFF);
    const debut = Date.now();
    const couche = LayerUtils.loadRasterLayer(uri, Zip.ENTREE_GEOTIFF);
    const duree = Date.now() - debut;
    if (!couche || !couche.isValid) {
      afficher(titre, [Zip.ENTREE_GEOTIFF + " : NON ouvert (" + uri + ")", "Temps : " + duree + " ms"]);
      return;
    }
    const emprise = couche.extent();
    afficher(titre, [
      Zip.ENTREE_GEOTIFF + " : ouvert",
      "Temps d'ouverture mesuré par le plugin : " + duree + " ms",
      "Système : " + (String(couche.crs.authid) || "inconnu"),
      "Emprise : " + Math.round(emprise.width) + " m × " + Math.round(emprise.height) + " m",
      "Coin bas-gauche : " + Zip.ecrirePosition(emprise.xMinimum, emprise.yMinimum, String(couche.crs.authid)),
      "Taille en pixels : non lisible depuis QML (largeur et hauteur du raster non invocables).",
    ]);
  }

  // -------------------------------------------------------------- G : .qml du zip

  function trouverQml() {
    const titre = Zip.BOUTONS.G;
    if (!copie || derniereListeDe !== copie || !derniereListe) {
      afficher(titre, ["Lister d'abord la copie avec « " + Zip.BOUTONS.C + " ».",
        "Si la lecture est refusée par QField, le .qml ne peut pas être trouvé."]);
      return;
    }
    const entree = Zip.trouverQmlVoisin(derniereListe, "sous-dossier/shape_essai.shp");
    if (!entree) {
      afficher(titre, ["Aucun .qml voisin de sous-dossier/shape_essai.shp dans la copie."]);
      return;
    }
    const lignes = ["Trouvé : " + entree.nom, "Taille annoncée par le zip : " + entree.taille + " octets"];
    if (entree.methode === 0 && derniersOctets) {
      try {
        const texte = Zip.decoderUtf8(Zip.lireEntreeStockee(derniersOctets, entree));
        lignes.push("Lu : " + texte.length + " caractères");
        lignes.push("Début du texte : " + texte.substring(0, 40));
        lignes.push("Couleur du symbole : " + (Zip.chercherCouleur(texte) || "non trouvée"));
      } catch (e) {
        lignes.push("ERREUR : " + e.message);
      }
    } else {
      lignes.push("Entrée compressée (méthode " + entree.methode + ").");
      lignes.push("Début du texte et couleur : EN ATTENTE (pas de décompresseur dans le prototype, décision de Pascal du 2 novembre 2026).");
    }
    afficher(titre, lignes);
  }

  // -------------------------------------------------------------- écran

  LocalFilesModel {
    id: fichiers
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
        font.pointSize: cerf.taillePolice - 4
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
          font.pointSize: cerf.taillePolice
          font.bold: true
          text: "Prêt. Mode avion, puis suivre le protocole."
        }
      }

      GrosBouton { text: Zip.BOUTONS.A; onClicked: { cerf.risqueArme = false; cerf.copier("A"); } }
      GrosBouton { text: Zip.BOUTONS.B; onClicked: { cerf.risqueArme = false; cerf.copier("B"); } }
      GrosBouton { text: Zip.BOUTONS.C; onClicked: { cerf.risqueArme = false; cerf.lister(false); } }
      GrosBouton { text: Zip.BOUTONS.D; onClicked: { cerf.risqueArme = false; cerf.effacer(); } }
      GrosBouton {
        text: Zip.BOUTONS.E
        onClicked: {
          cerf.risqueArme = false;
          cerf.afficher(Zip.BOUTONS.E, [cerf.hote ? cerf.hote.essayerModule() : "hôte absent"]);
        }
      }
      GrosBouton { text: Zip.BOUTONS.F; onClicked: { cerf.risqueArme = false; cerf.ouvrirCouches(); } }
      GrosBouton { text: Zip.BOUTONS.G; onClicked: { cerf.risqueArme = false; cerf.trouverQml(); } }
      GrosBouton { text: Zip.BOUTONS.H; onClicked: { cerf.risqueArme = false; cerf.ouvrirGeotiff(); } }

      Label {
        Layout.fillWidth: true
        Layout.topMargin: 24
        wrapMode: Text.WordWrap
        color: "#b71c1c"
        font.pointSize: cerf.taillePolice
        font.bold: true
        text: "En dernier, essai à risque (QField peut se fermer) :"
      }

      GrosBouton {
        text: Zip.BOUTONS.I
        palette.button: "#b71c1c"
        palette.buttonText: "white"
        onClicked: cerf.essaiARisque()
      }

      Item { Layout.preferredHeight: 48 }
    }
  }

  Component.onCompleted: zoneEntete.text = entete()
}

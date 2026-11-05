// SPDX-License-Identifier: GPL-3.0-or-later
// Cerf, plugin QField d'application (mission 008) : le pont entre la logique
// (cerf-logique.mjs, testée sous Node) et l'API de QField. Seul fichier qui importe le module.
// Écrit pour Cerf (ADR 0006). Appels de QField lus dans QField v4.3.7 (commit 3fb1281) : voir
// plugin/PLAN.md § 5, qui dit pour chacun s'il est prouvé sur le Samsung ou non.
import QtQuick
import org.qfield
import "cerf-logique.mjs" as Logique
import "cerf-controles.mjs" as Controles
import "cerf-styles.mjs" as Styles

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
    return function (source, nom, zipDeLaCopie) {
      // Mission 048 : le fond embarqué n'est pas une couche du zip (ni zip ni registre) ; marque propre, lecture seule par nature.
      if (Logique.estSourceFondEmbarque(source)) {
        const fond = LayerUtils.loadRasterLayer(source, nom);
        if (fond && fond.isValid) {
          fond.setCustomProperty("cerf/fond", "embarque");
          ProjectUtils.addMapLayer(qgisProject, fond);
          return fond;
        }
        // Couche invalide : loadRasterLayer la rend en CppOwnership (QField v4.3.7 qflayerutils.cpp l. 624), personne ne la libérera.
        if (fond) fond.deleteLater();
        return null;
      }
      // Copie GeoPackage (ADR 0008) : le zip est donné ; couche en /vsizip/ : il se lit dans la source.
      const zip = zipDeLaCopie ? String(zipDeLaCopie) : Logique.zipDeLaSource(source, dossier);
      const deja = coucheMarquee(zip, nom);
      if (deja) return deja;
      // Mission 024 : un GeoTIFF (chemin_vsi en .tif ou .tiff) se recharge en raster.
      const couche = Logique.estSourceRaster(source) ? LayerUtils.loadRasterLayer(source, nom) : LayerUtils.loadVectorLayer(source, nom);
      if (couche && couche.isValid) {
        couche.setCustomProperty("cerf/zip", zip);
        couche.setCustomProperty("cerf/couche", nom);
        ProjectUtils.addMapLayer(qgisProject, couche);
      }
      return couche;
    };
  }

  // Mission 048 : une couche du projet porte déjà la marque cerf/fond=embarque. Seule la marque compte sur l'appareil :
  // source() n'est ni Q_PROPERTY ni Q_INVOKABLE (QGIS 3a92eb3 qgsmaplayer.h l. 606), « l.source » vaut undefined en QML.
  function fondDejaPresent() {
    if (!qgisProject) return false;
    const couches = ProjectUtils.mapLayers(qgisProject);
    for (const id in couches) {
      const l = couches[id];
      if (!l) continue;
      try {
        if (typeof l.customProperty === "function" && String(l.customProperty("cerf/fond", "")) === "embarque") return true;
      } catch (e) { /* couche sans source lisible */ }
    }
    return false;
  }

  // Styles du manuel (mission 010). Ce que Cerf.qml sait dire à la logique : la géométrie et les
  // champs d'une couche (QgsVectorLayer.geometryType() est Q_INVOKABLE, QgsFields expose « names »)
  // et la lecture d'un fichier du zip (null si impossible). La POSE du style passe par un .qml écrit
  // à côté de la copie, avant son chargement (ADR 0008) : voir reecrireCouche et ecrireFichier.
  function infosCouche(couche) {
    let noms = [];
    try {
      noms = couche.fields.names;
    } catch (e) {
      noms = [];
    }
    let geometrie = null;
    try {
      geometrie = Styles.geometrieDe(couche.geometryType());
    } catch (e) {
      geometrie = null;
    }
    return { geometrie: geometrie, champs: noms };
  }

  function lireTexte(zip, chemin) {
    try {
      const octets = Logique.octetsDe(FileUtils.readFileContent("/vsizip/" + Logique.cheminCopie(dossierProjet(), zip) + "/" + chemin));
      return octets.length === 0 ? null : Logique.texteDe(octets);
    } catch (e) {
      return null;
    }
  }

  // ---- ADR 0008, prouvé sur le Samsung par le prototype n° 3 (fiche 027).
  // Réécrit la couche ouverte (/vsizip/) en GeoPackage ; rend le chemin écrit, ou "" si QField a
  // refusé (échec muet : la raison n'est que dans le journal de QField). saveVectorLayerAs crée les
  // dossiers et écrase sans contrôle de chemin : la garde est dans la logique (peutEcrireCopie).
  function reecrireCouche(couche, cible) {
    return String(LayerUtils.saveVectorLayerAs(couche, cible, "GPKG") || "");
  }

  // Écrit un texte en UTF-8 (le .qml), le relit pour comparer la taille. true si écrit.
  function ecrireFichier(chemin, texte) {
    const octets = Logique.octetsUtf8(texte);
    FileUtils.writeFileContent(chemin, Logique.arrayBufferExact(octets));
    return Logique.octetsDe(FileUtils.readFileContent(chemin)).length === octets.length;
  }

  function effacerFichier(chemin) {
    return !!platformUtilities.rmFile(chemin);
  }

  // ---- Mission 012 : ouvrir, contrôler, puis seulement ajouter (spec § 4).
  // NON PROUVÉ (aucun accès aux sources de QField pour la mission 012) : chaque appel marqué
  // « à vérifier » ci-dessous est à confirmer sur le Samsung ; un appel absent ou en erreur
  // donne un REFUS de la couche (jamais « contrôle sauté »).

  // Ouvre la couche sans l'ajouter au projet. Mission 024 : un GeoTIFF (format « tif ») s'ouvre par
  // LayerUtils.loadRasterLayer (QField v4.3.7, src/core/utils/qflayerutils.h l. 208 ; qflayerutils.cpp l. 622-627 :
  // new QgsRasterLayer(uri, name, "gdal")), en /vsizip/ (ADR 0008) ; le reste par loadVectorLayer (l. 200).
  function ouvrirCouche(source, nom, format) {
    if (format === "tif") return LayerUtils.loadRasterLayer(source, nom);
    return LayerUtils.loadVectorLayer(source, nom);
  }

  // Mission 049 : libère une couche ouverte par LayerUtils.loadVectorLayer / loadRasterLayer et non ajoutée à la carte.
  // QField v4.3.7 (qflayerutils.cpp l. 618 et 624) la rend en CppOwnership : sans deleteLater, personne ne la détruit.
  // La logique ne l'appelle jamais sur une couche ajoutée au projet, ni deux fois sur la même.
  function libererCouche(couche) {
    couche.deleteLater();
  }

  // Mission 024 : tables vecteur d'un GeoPackage du zip (voie 1 du prototype n° 4, NON PROUVÉE sur le Samsung).
  // Rend la liste des tables, [] si aucune, null si illisibles (la logique refuse alors « tables illisibles »).
  // Appels lus dans les sources : LayerUtils.loadVectorLayer (qflayerutils.h l. 200), createFeatureIterator (l. 234),
  // hasNext, next, close (l. 52-75) ; QgsFeature::attribute(QString) Q_INVOKABLE (QGIS 3a92eb3,
  // src/core/qgsfeature.h l. 1080) ; isValid Q_PROPERTY de QgsMapLayer (qgsmaplayer.h l. 94) ; deleteLater, slot de
  // QObject (la couche est en CppOwnership, qflayerutils.cpp l. 618 : sans cela elle resterait en mémoire).
  function tablesGpkg(source) {
    const r = Logique.tablesDuGpkg(source, {
      ouvrir: function (uri, nom) { return LayerUtils.loadVectorLayer(uri, nom); },
      creerIterateur: function (l) { return LayerUtils.createFeatureIterator(l); },
      liberer: function (l) { l.deleteLater(); }
    });
    if (r.etat === "liste") return r.tables;
    if (r.etat === "aucune") return [];
    return null;
  }

  // Mission 047 : style enregistré dans la table layer_styles d'un GeoPackage du zip, pour une table (voie 1 du
  // prototype n° 4 : même mécanique que tablesGpkg, NON PROUVÉE sur le Samsung). Rend { etat, texte } de
  // Logique.styleDuGpkg : « lu », « illisible » ou « absent » (la règle du manuel s'applique alors). Mêmes appels que
  // tablesGpkg ; le champ styleQML est une chaîne sans limite de largeur (QGIS 3a92eb3, src/core/qgsogrutils.cpp
  // l. 3141-3143 : OFTString sans OGR_Fld_SetWidth) lue par QgsFeature::attribute(QString).
  function styleGpkg(source, table) {
    return Logique.styleDuGpkg(source, table, {
      ouvrir: function (uri, nom) { return LayerUtils.loadVectorLayer(uri, nom); },
      creerIterateur: function (l) { return LayerUtils.createFeatureIterator(l); },
      liberer: function (l) { l.deleteLater(); }
    });
  }

  // Ajoute à la carte une couche acceptée, marquée (zip, couche). `zipDonne` : le zip de la copie
  // GeoPackage (ADR 0008) ; à défaut il se lit dans une source /vsizip/.
  function ajouterALaCarte(couche, nom, source, zipDonne) {
    const zip = zipDonne ? String(zipDonne) : Logique.zipDeLaSource(source, Logique.dossierCopies(dossierProjet()));
    couche.setCustomProperty("cerf/zip", zip);
    couche.setCustomProperty("cerf/couche", nom);
    ProjectUtils.addMapLayer(qgisProject, couche);
  }

  // Lectures de la couche pour les contrôles ; chaque lecture est protégée (échec = valeur
  // « mauvaise », donc refus). Comptage par itérateur (mission 038) : featureCount() n'est pas invocable.
  function decrireCouche(couche, format) {
    let lisible = false;
    let systeme = { valide: false, epsg: 0 };
    let nbEntites = -1;
    let emprise = null;
    try { lisible = !!(couche && couche.isValid); } catch (e) { lisible = false; }
    try {
      // QML ne voit de crs que mapUnits, isGeographic, authid, description (mission 034) : la règle est dans
      // Logique.decrireSysteme. L'objet crs est passé tel quel à la reprojection.
      systeme = Logique.decrireSysteme(couche.crs);
    } catch (e) { /* système inconnu */ }
    if (format !== "tif") {
      // Un raster n'a pas d'entités (jamais « vide ») ; pour un vecteur, un itérateur qui échoue = illisible (contrôle 2).
      const c = Logique.compterEntites(couche, function (l) { return LayerUtils.createFeatureIterator(l); });
      nbEntites = c.nbEntites;
      if (!c.lisible) lisible = false;
    }
    try {
      emprise = Logique.lireEmprise(couche);
    } catch (e) { emprise = null; }
    return { lisible: lisible, systeme: systeme, nbEntites: nbEntites, emprise: emprise };
  }

  // Reprojette un point (x, y) du système source `crs` (construit par construireSource) vers EPSG:2154. À vérifier dans QField v4.3.7 :
  // GeometryUtils.reprojectPoint et CoordinateReferenceSystemUtils.fromDescription. Si l'API
  // manque, on lève : toute erreur de reprojection vaut refus (spec § 4), aucun contournement.
  function reprojeterPoint(x, y, epsg, crs) {
    const source = crs;
    const but = CoordinateReferenceSystemUtils.fromDescription("EPSG:2154");
    const p = GeometryUtils.reprojectPoint(GeometryUtils.point(x, y), source, but);
    // QField 4.3.7 ne lève rien sur échec : il rend un QgsPoint() vide, dont x et y valent NaN (QGIS 3a92eb3,
    // src/core/geometry/qgspoint.h l. 89-91). isEmpty() n'est pas exposé à QML (qgspoint.h l. 633 : ni Q_INVOKABLE ni
    // Q_PROPERTY ; seuls x, y, z, m le sont, l. 56-59) : c'est le test de finitude qui refuse le point vide.
    // Source déjà en 2154 : l'entrée est rendue telle quelle (finie), donc acceptée.
    const px = p ? Number(p.x) : NaN;
    const py = p ? Number(p.y) : NaN;
    if (!isFinite(px) || !isFinite(py)) throw new Error("reprojection : point vide");
    return { x: px, y: py };
  }

  function controlerCouche(description) {
    return Controles.controlerAvecDetail(description, {
      reprojeter: function (emprise, epsg, crs, authid) {
        // Système source reconstruit par son nom (fromDescription), repli : l'objet de la couche (mission 037).
        const s = Controles.construireSource(authid, crs, function (d) { return CoordinateReferenceSystemUtils.fromDescription(d); });
        return Controles.reprojeterEmprise(emprise, epsg, reprojeterPoint, s.source);
      }
    });
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
      fondDejaPresent: fondDejaPresent,
      libererCouche: libererCouche,
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
    // Zip réimporté sous le même nom : ses couches sont retirées de la carte (par importerZip,
    // une fois sûr qu'au moins une couche est lisible) puis rechargées.
    const r = Logique.importerZip({
      cerfId: id,
      dossierProjet: dossierProjet(),
      nomZip: nom,
      octets: octets,
      reglages: reglages,
      styles: Styles,
      infosCouche: infosCouche,
      lireTexte: lireTexte,
      reecrireCouche: reecrireCouche,
      ecrireFichier: ecrireFichier,
      effacerFichier: effacerFichier,
      existe: function (chemin) { return FileUtils.fileExists(chemin); },
      ouvrirCouche: ouvrirCouche,
      libererCouche: libererCouche,
      tablesGpkg: tablesGpkg,
      styleGpkg: styleGpkg,
      retirerLeZipDeLaCarte: function (zip) { cerf.retirerLeZipDeLaCarte(zip); },
      decrireCouche: decrireCouche,
      controlerCouche: controlerCouche,
      ajouterALaCarte: ajouterALaCarte,
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
      existe: function (chemin) { return FileUtils.fileExists(chemin); },
      effacerFichier: effacerFichier,
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

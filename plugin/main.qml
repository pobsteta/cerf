// SPDX-License-Identifier: GPL-3.0-or-later
// Vision, plugin QField d'application (mission 008) : point d'entrée.
// Écrit pour Vision (ADR 0006). Ce fichier n'importe aucun .mjs : il crée Vision.qml (qui importe
// vision-logique.mjs) et Panneau.qml par Qt.createComponent, pour qu'un échec de chargement
// s'affiche au lieu d'empêcher le plugin de démarrer (motif du prototype n° 1, prouvé).
// API de QField lue dans le code de QField v4.3.7 : plugin/PLAN.md § 5.
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import org.qfield

Item {
  id: plugin

  property var vision: null              // objet de Vision.qml
  property string erreurModule: ""     // erreur de chargement de Vision.qml ou du module
  property string dernierMessage: ""

  // Montre un message : toast de QField (non prouvé) et zone de messages du panneau.
  function afficher(texte) {
    if (!texte) return;
    dernierMessage = texte;
    try {
      iface.mainWindow().displayToast(texte);
    } catch (e) {
      // Pas de toast : le message reste dans le panneau.
    }
  }

  // vision_id lu sans le module, pour le seul cas où le module ne se charge pas.
  function visionIdPresent() {
    if (!qgisProject) return false;
    const v = ExpressionContextUtils.projectVariables(qgisProject);
    return !!v && v["vision_id"] !== undefined && v["vision_id"] !== null && String(v["vision_id"]) !== "";
  }

  // Geste 2 : à chaque ouverture de projet. Le bouton n'apparaît que dans un projet Vision
  // (critère 9).
  function demarrer() {
    if (!vision) {
      boutonVision.visible = visionIdPresent();
      if (boutonVision.visible) afficher("Vision : module non chargé\n" + erreurModule);
      return;
    }
    const r = vision.demarrer();
    boutonVision.visible = r.boutonVisible;
    if (!r.boutonVisible) fenetre.close();
    if (r.message) afficher(r.message);
  }

  Component.onCompleted: {
    iface.addItemToPluginsToolbar(boutonVision);
    const composant = Qt.createComponent("Vision.qml");
    if (composant.status === Component.Ready) {
      vision = composant.createObject(plugin);
      if (!vision) erreurModule = composant.errorString();
    } else {
      erreurModule = composant.errorString();
    }
    // Plugin installé ou activé alors qu'un projet est déjà ouvert.
    if (qgisProject && String(qgisProject.fileName) !== "") demarrer();
  }

  Connections {
    target: plugin.vision
    ignoreUnknownSignals: true
    function onMessage(texte) {
      plugin.afficher(texte);
    }
  }

  Connections {
    target: iface
    function onLoadProjectEnded(path, name) {
      plugin.demarrer();
    }
  }

  RoundButton {
    id: boutonVision
    visible: false
    width: 48
    height: 48
    icon.source: Qt.resolvedUrl("icon.svg")
    icon.color: "transparent"
    onClicked: fenetre.open()
  }

  Popup {
    id: fenetre
    parent: iface.mainWindow().contentItem
    x: 0
    y: 0
    width: parent ? parent.width : 400
    height: parent ? parent.height : 800
    modal: true
    focus: true
    closePolicy: Popup.CloseOnEscape
    padding: 12

    background: Rectangle { color: "white" }

    property var panneau: null
    property string erreurPanneau: ""

    onOpened: {
      if (panneau === null && erreurPanneau === "" && plugin.vision) {
        const composant = Qt.createComponent("Panneau.qml");
        if (composant.status === Component.Ready) {
          panneau = composant.createObject(zonePanneau, { vision: plugin.vision, hote: plugin });
          if (!panneau) erreurPanneau = composant.errorString();
        } else {
          erreurPanneau = composant.errorString();
        }
      }
    }

    ColumnLayout {
      anchors.fill: parent
      spacing: 8

      Button {
        Layout.fillWidth: true
        Layout.preferredHeight: 72
        text: "Fermer"
        font.pointSize: 18
        onClicked: fenetre.close()
      }

      Label {
        visible: plugin.erreurModule !== "" || fenetre.erreurPanneau !== ""
        Layout.fillWidth: true
        wrapMode: Text.WrapAnywhere
        color: "black"
        font.pointSize: 16
        text: "Vision : écran non chargé\n" + plugin.erreurModule + fenetre.erreurPanneau
      }

      Item {
        id: zonePanneau
        Layout.fillWidth: true
        Layout.fillHeight: true
      }
    }
  }
}

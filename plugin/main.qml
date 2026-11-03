// SPDX-License-Identifier: GPL-3.0-or-later
// Cerf, plugin QField d'application (mission 008) : point d'entrée.
// Écrit pour Cerf (ADR 0006). Ce fichier n'importe aucun .mjs : il crée Cerf.qml (qui importe
// cerf-logique.mjs) et Panneau.qml par Qt.createComponent, pour qu'un échec de chargement
// s'affiche au lieu d'empêcher le plugin de démarrer (motif du prototype n° 1, prouvé).
// API de QField lue dans le code de QField v4.3.7 : plugin/PLAN.md § 5.
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import org.qfield

Item {
  id: plugin

  property var cerf: null              // objet de Cerf.qml
  property string erreurModule: ""     // erreur de chargement de Cerf.qml ou du module
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

  // cerf_id lu sans le module, pour le seul cas où le module ne se charge pas.
  function cerfIdPresent() {
    if (!qgisProject) return false;
    const v = ExpressionContextUtils.projectVariables(qgisProject);
    return !!v && v["cerf_id"] !== undefined && v["cerf_id"] !== null && String(v["cerf_id"]) !== "";
  }

  // Geste 2 : à chaque ouverture de projet. Le bouton n'apparaît que dans un projet Cerf
  // (critère 9).
  function demarrer() {
    if (!cerf) {
      boutonCerf.visible = cerfIdPresent();
      if (boutonCerf.visible) afficher("Cerf : module non chargé\n" + erreurModule);
      return;
    }
    const r = cerf.demarrer();
    boutonCerf.visible = r.boutonVisible;
    if (!r.boutonVisible) fenetre.close();
    if (r.message) afficher(r.message);
  }

  Component.onCompleted: {
    iface.addItemToPluginsToolbar(boutonCerf);
    const composant = Qt.createComponent("Cerf.qml");
    if (composant.status === Component.Ready) {
      cerf = composant.createObject(plugin);
      if (!cerf) erreurModule = composant.errorString();
    } else {
      erreurModule = composant.errorString();
    }
    // Plugin installé ou activé alors qu'un projet est déjà ouvert.
    if (qgisProject && String(qgisProject.fileName) !== "") demarrer();
  }

  Connections {
    target: plugin.cerf
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
    id: boutonCerf
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
      if (panneau === null && erreurPanneau === "" && plugin.cerf) {
        const composant = Qt.createComponent("Panneau.qml");
        if (composant.status === Component.Ready) {
          panneau = composant.createObject(zonePanneau, { cerf: plugin.cerf, hote: plugin });
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
        text: "Cerf : écran non chargé\n" + plugin.erreurModule + fenetre.erreurPanneau
      }

      Item {
        id: zonePanneau
        Layout.fillWidth: true
        Layout.fillHeight: true
      }
    }
  }
}

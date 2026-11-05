// SPDX-License-Identifier: GPL-3.0-or-later
// Cerf, prototype n° 1 (mission 004) : point d'entrée du plugin QField.
// Écrit pour Cerf (ADR 0006). Ce fichier n'importe aucun .mjs : il crée les écrans qui en
// importent (Cerf.qml, EssaiModule.qml) par Qt.createComponent, pour que l'échec du
// chargement d'un module s'affiche au lieu d'empêcher le plugin de démarrer
// (question 4 du protocole tests/recette/prototype-1.md).
// API de QField lue dans le code de QField v4.3.7 : voir prototype/PLAN.md § 4.
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import org.qfield

Item {
  id: plugin

  readonly property int taillePolice: 18
  readonly property int hauteurBouton: 64

  // Essai du module embarqué (question 4) : rend le texte à afficher.
  function essayerModule() {
    const composant = Qt.createComponent("EssaiModule.qml");
    if (composant.status !== Component.Ready) {
      return "Module .mjs : ERREUR de chargement\n" + composant.errorString();
    }
    const essai = composant.createObject(plugin);
    if (!essai) {
      return "Module .mjs : ERREUR, objet non créé\n" + composant.errorString();
    }
    const texte = "Module .mjs : chargé, sans erreur\n"
      + "somme(2, 3) = " + essai.resultat + "\n"
      + "SIGNATURE = " + essai.signature;
    essai.destroy();
    return texte;
  }

  Component.onCompleted: {
    iface.addItemToPluginsToolbar(boutonCerf);
  }

  RoundButton {
    id: boutonCerf
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

    property var ecran: null
    property string erreurEcran: ""

    onOpened: {
      if (ecran === null && erreurEcran === "") {
        const composant = Qt.createComponent("Cerf.qml");
        if (composant.status === Component.Ready) {
          ecran = composant.createObject(zoneEcran, { hote: plugin });
          if (!ecran) erreurEcran = composant.errorString();
        } else {
          erreurEcran = composant.errorString();
        }
      }
    }

    ColumnLayout {
      anchors.fill: parent
      spacing: 8

      Button {
        Layout.fillWidth: true
        Layout.preferredHeight: plugin.hauteurBouton
        text: "Fermer"
        font.pointSize: plugin.taillePolice
        onClicked: fenetre.close()
      }

      // Écran de secours : cerf-zip.mjs n'a pas pu être chargé.
      ColumnLayout {
        visible: fenetre.erreurEcran !== ""
        Layout.fillWidth: true
        spacing: 8

        Label {
          Layout.fillWidth: true
          wrapMode: Text.WrapAnywhere
          color: "black"
          font.pointSize: plugin.taillePolice
          text: "Écran du prototype NON chargé (cerf-zip.mjs ou Cerf.qml) :\n" + fenetre.erreurEcran
        }

        Button {
          Layout.fillWidth: true
          Layout.preferredHeight: plugin.hauteurBouton
          font.pointSize: plugin.taillePolice
          text: "E. Module .mjs"
          onClicked: secours.text = plugin.essayerModule()
        }

        Label {
          id: secours
          Layout.fillWidth: true
          wrapMode: Text.WrapAnywhere
          color: "black"
          font.pointSize: plugin.taillePolice
        }
      }

      Item {
        id: zoneEcran
        Layout.fillWidth: true
        Layout.fillHeight: true
        visible: fenetre.erreurEcran === ""
      }
    }
  }
}

// SPDX-License-Identifier: GPL-3.0-or-later
// Cerf, plugin QField d'application (mission 008) : le panneau, minimal. Gros boutons et
// textes noirs sur blanc ; l'interface soignée pour gants et soleil est la mission 015.
// Écrit pour Cerf (ADR 0006). Aucun appel à QField ici : tout passe par Cerf.qml.
// (Aucun composant n'est créé par Qt.createComponent depuis ce fichier.)
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
  id: panneau
  anchors.fill: parent

  property var cerf: null      // objet de Cerf.qml
  property var hote: null      // main.qml (dernierMessage)
  property var couches: []

  function relire() {
    couches = cerf ? cerf.couchesInscrites() : [];
  }

  Component.onCompleted: relire()

  Connections {
    target: panneau.cerf
    function onRegistreChange() {
      panneau.relire();
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

      Button {
        Layout.fillWidth: true
        Layout.preferredHeight: 72
        font.pointSize: 18
        text: "Ajouter un zip"
        onClicked: panneau.cerf.ajouterZip()
      }

      Rectangle {
        Layout.fillWidth: true
        Layout.preferredHeight: zoneMessage.implicitHeight + 16
        visible: panneau.hote && panneau.hote.dernierMessage !== ""
        color: "#fff8e1"
        border.color: "black"
        border.width: 2

        Label {
          id: zoneMessage
          x: 8
          y: 8
          width: parent.width - 16
          wrapMode: Text.WordWrap
          color: "black"
          font.pointSize: 16
          font.bold: true
          text: panneau.hote ? panneau.hote.dernierMessage : ""
        }
      }

      Label {
        Layout.fillWidth: true
        Layout.topMargin: 8
        wrapMode: Text.WordWrap
        color: "black"
        font.pointSize: 18
        font.bold: true
        text: panneau.couches.length === 0 ? "Aucune couche ajoutée." : "Couches ajoutées (" + panneau.couches.length + ")"
      }

      Repeater {
        model: panneau.couches

        RowLayout {
          required property var modelData
          Layout.fillWidth: true
          spacing: 8

          Label {
            Layout.fillWidth: true
            wrapMode: Text.WrapAnywhere
            color: "black"
            font.pointSize: 16
            text: modelData.couche + "\n(" + modelData.zip + ")"
          }

          Button {
            Layout.preferredHeight: 72
            Layout.preferredWidth: 160
            font.pointSize: 16
            text: "Retirer"
            onClicked: panneau.cerf.retirer(modelData.zip, modelData.couche)
          }
        }
      }

      Label {
        Layout.fillWidth: true
        Layout.topMargin: 24
        wrapMode: Text.WordWrap
        color: "#333333"
        font.pointSize: 12
        text: "Cerf " + (panneau.cerf ? panneau.cerf.versionPlugin : "?")
          + " — QField " + ((panneau.cerf && panneau.cerf.versionQField()) || "version inconnue")
      }

      Item { Layout.preferredHeight: 48 }
    }
  }
}

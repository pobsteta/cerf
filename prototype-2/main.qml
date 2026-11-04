// SPDX-License-Identifier: GPL-3.0-or-later
// Cerf, prototype n° 2 (mission 023) : point d'entrée du plugin QField jetable.
// Écrit pour Cerf (ADR 0006). Ce fichier n'importe aucun .mjs : il crée l'écran (Essai.qml,
// qui importe essai-logique.mjs) par Qt.createComponent, pour que l'échec du chargement du
// module s'affiche au lieu d'empêcher le plugin de démarrer. L'écran est créé dès le
// démarrage (et non à l'ouverture de la fenêtre) : la question 5 a besoin qu'il écoute la
// réouverture du projet.
// API de QField lue dans le code de QField v4.3.7 : voir prototype-2/PLAN.md § 3.
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import org.qfield

Item {
  id: plugin

  readonly property int taillePolice: 18
  readonly property int hauteurBouton: 64

  property var ecran: null
  property string erreurEcran: ""

  Component.onCompleted: {
    iface.addItemToPluginsToolbar(boutonProto);
    const composant = Qt.createComponent("Essai.qml");
    if (composant.status === Component.Ready) {
      ecran = composant.createObject(zoneEcran);
      if (!ecran) erreurEcran = composant.errorString();
    } else {
      erreurEcran = composant.errorString();
    }
  }

  RoundButton {
    id: boutonProto
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

      Label {
        visible: plugin.erreurEcran !== ""
        Layout.fillWidth: true
        wrapMode: Text.WrapAnywhere
        color: "black"
        font.pointSize: plugin.taillePolice
        text: "Écran du prototype NON chargé (essai-logique.mjs ou Essai.qml) :\n" + plugin.erreurEcran
      }

      Item {
        id: zoneEcran
        Layout.fillWidth: true
        Layout.fillHeight: true
        visible: plugin.erreurEcran === ""
      }
    }
  }
}

// SPDX-License-Identifier: GPL-3.0-or-later
// Vision, prototype n° 1 : charge le module d'essai du testeur (question 4 du protocole).
// module-essai.mjs est la copie exacte de tests/recette/essai/module-essai.mjs.
import QtQml
import "module-essai.mjs" as Essai

QtObject {
  readonly property var resultat: Essai.somme(2, 3)
  readonly property var signature: Essai.SIGNATURE
}

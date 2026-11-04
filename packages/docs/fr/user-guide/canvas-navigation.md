---
title: Navigation dans la zone de travail
description: Déplacer la vue, zoomer et utiliser l’outil Main.
---

# Navigation dans la zone de travail

La zone de travail est illimitée. Le déplacement et le zoom permettent d’atteindre n’importe quelle partie du document.

## Déplacer la vue

- Maintenez <kbd>Space</kbd> et faites glisser la zone de travail.
- Faites glisser avec le bouton central de la souris.
- Faites glisser deux doigts sur le pavé tactile.

## Outil Main

Appuyez sur <kbd>H</kbd>. Tant qu’il est actif, tout glissement déplace la vue sans maintenir <kbd>Space</kbd>. Appuyez sur <kbd>V</kbd> pour revenir à Sélection.

## Zoom

Le zoom est centré sur le pointeur. Utilisez <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + molette, le pincement ou les raccourcis.

Avec **Zoomer avec la molette** dans **Paramètres → Éditeur**, la molette zoome sans touche ; <kbd>Shift</kbd> + molette fait toujours défiler horizontalement. **Inverser le sens du zoom** inverse le sens de la molette ; le pincement sur le trackpad garde le sien.

| Action | macOS | Windows / Linux |
|--------|-------|-----------------|
| 100 % | <kbd>⌘</kbd><kbd>0</kbd> | <kbd>Ctrl</kbd><kbd>0</kbd> |
| Ajuster le document | <kbd>⌘</kbd><kbd>1</kbd> | <kbd>Ctrl</kbd><kbd>1</kbd> |
| Zoomer sur la sélection | <kbd>⌘</kbd><kbd>2</kbd> | <kbd>Ctrl</kbd><kbd>2</kbd> |

## Outil Zoom

Maintenez <kbd>Z</kbd> et cliquez pour zoomer sur le pointeur, ou cliquez avec <kbd>Option</kbd>/<kbd>Alt</kbd> pour dézoomer ; faites glisser pour zoomer sur la zone tracée. Relâcher <kbd>Z</kbd> rend l'outil précédent. Un appui bref sur <kbd>Z</kbd> garde l'outil Zoom actif ; il figure aussi dans le menu de l'outil Main de la barre d'outils.

Zoomer pour tout afficher, sur la sélection et à 100 %, les niveaux du menu de zoom et le cadre suivant ou précédent glissent jusqu'à leur vue au lieu de sauter. Ils sautent lorsque les animations sont désactivées, que le mode Ultralight est actif ou que le système demande de réduire les animations.

## Règles

Les règles sont masquées jusqu’à ce que vous les affichiez avec **Affichage → Règles** ou <kbd>Shift</kbd> + <kbd>R</kbd>.

## Magnétisme

Dans **Affichage → Préférences**, activez **Aligner sur la géométrie**, **Aligner sur les objets** et **Aligner sur la grille de pixels** indépendamment. Les préférences sont conservées entre les sessions.

L’alignement sur la géométrie et sur les objets aide à aligner les points vectoriels, les calques déplacés et les bords redimensionnés avec la géométrie, les objets, les repères et les bords de cadres voisins. Des lignes d’alignement apparaissent pour ces cibles ; l’arrondi à la grille de pixels ne dessine pas une ligne d’alignement pour chaque pixel.

Avec **Aligner sur les objets** activé, un calque déplacé s’aligne aussi sur l’espacement égal : il se centre entre ses deux voisins, ou se place à la même distance d’un voisin que celle qui sépare deux autres voisins de la même rangée ou colonne. Chaque écart de cette taille montre un indicateur rose avec sa taille. La mise à l’échelle ne s’aligne pas sur l’espacement.

Avec **Aligner sur la grille de pixels** activé, les calques déplacés, les bords redimensionnés et les calques dessinés tombent sur des pixels entiers à n’importe quel zoom, même s’ils ont commencé entre les pixels. Un alignement sur un objet ou un repère l’emporte sur la grille. Les déplacements aux flèches et les valeurs tapées dans le panneau des propriétés gardent leurs fractions.

Activez **Aligner sur les demi-pixels** dans **Paramètres → Éditeur** pour que l’alignement à la grille de pixels puisse aussi tomber sur des demi-pixels, pour qu’un trait de 1 px puisse rester centré sur un bord de pixel. Un tableau garde sa grille de 16 unités.

Maintenez <kbd>Control</kbd> pendant le glissement d’un calque pour ignorer temporairement l’alignement sur les objets et les pixels — y compris sous macOS, où c’est Control, et non Command.

## Palette de commandes

Appuyez sur <kbd>⌘</kbd><kbd>K</kbd> sous macOS ou <kbd>Ctrl</kbd><kbd>K</kbd> sous Windows/Linux pour rechercher des actions de l’éditeur et de l’application. Sélectionnez un résultat pour l’exécuter ; les actions indisponibles restent soumises à la sélection et à l’état du document.

La palette permet aussi de changer de page. Avant que vous ne tapiez, elle liste les pages visitées récemment dans cet onglet, de la plus récente à la plus ancienne, et **Aller à la page…** ouvre la liste de toutes les pages. Saisir le nom d’une page permet aussi de la trouver. Les pages où des collaborateurs ou des agents AI travaillent affichent leurs noms ; le panneau Pages marque les mêmes pages avec leurs couleurs.

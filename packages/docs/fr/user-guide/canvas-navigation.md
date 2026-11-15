---
title: Navigation dans la zone de travail
description: Déplacer la vue, zoomer, utiliser les repères des règles, le magnétisme et les mesures de distance dans Pairdraw.
---

# Navigation dans la zone de travail

La zone de travail est un espace illimité. Le déplacement et le zoom permettent d’atteindre librement n’importe quelle partie du design.

## Déplacer la vue

Déplacez la partie visible de la zone de travail sans toucher aux objets.

- <kbd>Space</kbd> + glisser : maintenez Espace et faites glisser n’importe où sur la zone de travail.
- **Bouton central de la souris :** appuyez sur le bouton central et faites glisser.
- **Deux doigts sur le pavé tactile :** balayez avec deux doigts.
- <kbd>Shift</kbd> + molette : défilement horizontal.

## Outil Main

Appuyez sur <kbd>H</kbd> pour activer l’outil Main et déplacer la vue en continu. Tout glissement sur la zone de travail déplace la vue sans maintenir <kbd>Space</kbd>. Passez à un autre outil (par exemple <kbd>V</kbd> pour Déplacer) pour le désactiver.

## Zoom

Le zoom avant et arrière est centré sur la position du pointeur.

- <kbd>Ctrl</kbd> + molette (ou <kbd>⌘</kbd> + molette sur Mac) : vers le haut pour zoomer, vers le bas pour dézoomer.
- **Pincement :** pincez sur le pavé tactile pour zoomer ou dézoomer.
- **Raccourcis clavier :** voir le tableau ci-dessous.

Avec une souris, activez **Zoomer avec la molette** dans **Paramètres → Éditeur → Navigation** pour zoomer avec la molette seule ; <kbd>Shift</kbd> + molette fait toujours défiler horizontalement. **Inverser le sens du zoom** inverse le sens de la molette ; le pincement sur le pavé tactile garde le sien.

Le pincement sur les panneaux de l’interface (calques, propriétés) est bloqué pour ne pas changer par accident le zoom du navigateur.

## Outil Zoom

Maintenez <kbd>Z</kbd> et cliquez pour zoomer sur le pointeur, ou cliquez avec <kbd>Option</kbd>/<kbd>Alt</kbd> pour dézoomer ; faites glisser pour zoomer sur la zone tracée. Relâcher <kbd>Z</kbd> rend l’outil précédent. Un appui bref sur <kbd>Z</kbd> garde l’outil Zoom actif ; il figure aussi dans le menu de l’outil Main de la barre d’outils.

Zoomer pour tout afficher, sur la sélection et à 100 %, les niveaux du menu de zoom et le cadre suivant ou précédent glissent jusqu’à leur vue au lieu de sauter. Ils sautent lorsque les animations sont désactivées, que le mode ultraléger est actif ou que le système demande de réduire les animations.

## Raccourcis clavier

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Déplacer la vue | <kbd>Space</kbd> + glisser | <kbd>Space</kbd> + glisser |
| Outil Main | <kbd>H</kbd> | <kbd>H</kbd> |
| Outil Zoom | <kbd>Z</kbd> | <kbd>Z</kbd> |
| Zoom avant | <kbd>⌘</kbd><kbd>+</kbd> | <kbd>Ctrl</kbd> + <kbd>+</kbd> |
| Zoom arrière | <kbd>⌘</kbd><kbd>−</kbd> | <kbd>Ctrl</kbd> + <kbd>−</kbd> |
| Zoom avant / arrière | <kbd>+</kbd> / <kbd>−</kbd> | <kbd>+</kbd> / <kbd>−</kbd> |
| Zoom à 100 % | <kbd>⇧</kbd><kbd>0</kbd> ou <kbd>⌘</kbd><kbd>0</kbd> | <kbd>Shift</kbd> + <kbd>0</kbd> ou <kbd>Ctrl</kbd> + <kbd>0</kbd> |
| Tout afficher | <kbd>⇧</kbd><kbd>1</kbd> | <kbd>Shift</kbd> + <kbd>1</kbd> |
| Zoomer sur la sélection | <kbd>⇧</kbd><kbd>2</kbd> | <kbd>Shift</kbd> + <kbd>2</kbd> |
| Cadre suivant / précédent | <kbd>N</kbd> / <kbd>⇧</kbd><kbd>N</kbd> | <kbd>N</kbd> / <kbd>Shift</kbd> + <kbd>N</kbd> |
| Page suivante / précédente | <kbd>Page Down</kbd> / <kbd>Page Up</kbd> | <kbd>Page Down</kbd> / <kbd>Page Up</kbd> |
| Grille de pixels | <kbd>⇧</kbd><kbd>'</kbd> | <kbd>Shift</kbd> + <kbd>'</kbd> |
| Aligner sur la grille de pixels | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>'</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>'</kbd> |
| Règles | <kbd>⇧</kbd><kbd>R</kbd> | <kbd>Shift</kbd> + <kbd>R</kbd> |
| Curseurs multijoueurs | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>\\</kbd> | <kbd>Alt</kbd> + <kbd>Ctrl</kbd> + <kbd>\\</kbd> |

## Cadres et pages

<kbd>N</kbd> sélectionne le cadre de premier niveau suivant de la page et zoome dessus ; <kbd>Shift</kbd> + <kbd>N</kbd> revient en arrière. Les cadres placés dans des sections comptent, les cadres masqués non, et l’ordre va de gauche à droite puis de haut en bas, en recommençant aux extrémités. Si un calque situé dans un cadre est sélectionné, le parcours part de ce cadre.

<kbd>Page Down</kbd> et <kbd>Page Up</kbd> ouvrent la page suivante et la page précédente dans l’ordre du panneau des pages.

## Grille de pixels

Lorsque le zoom est assez fort pour que chaque pixel du document couvre huit pixels de l’écran (800 % sur un écran standard, 400 % sur un écran Retina), la zone de travail affiche une ligne à chaque pixel, comme dans Figma. Masquez-la ou affichez-la avec **Affichage → Grille de pixels**, <kbd>Shift</kbd> + <kbd>'</kbd> ou **Afficher la grille de pixels** dans **Paramètres → Éditeur** ; le choix s’applique à tous les documents ouverts et est conservé entre les sessions.

## Panneaux latéraux {#side-panels}

Le bouton du panneau des calques se trouve au-dessus des outils, à gauche de la zone de travail, et celui du panneau des propriétés dans la barre supérieure. Le panneau des propriétés apparaît quand vous sélectionnez un calque et disparaît avec la sélection ; un panneau ouvert depuis son bouton reste ouvert jusqu’à ce que vous le fermiez, y compris d’une session à l’autre. La zone de travail occupe la place d’un panneau fermé, qui se rouvre à sa largeur précédente. **Affichage → Panneau des calques** et **Affichage → Panneau des propriétés** font de même. <kbd>⌘</kbd><kbd>\\</kbd> (<kbd>Ctrl</kbd> + <kbd>\\</kbd>) masque toujours tous les panneaux d’un coup. La liste des commentaires et l’historique des versions s’affichent dans le panneau des propriétés : l’outil Commentaire et l’historique des versions l’ouvrent pendant que vous les utilisez, puis le referment.

## Mode ultraléger

Sur un ordinateur lent ou sur batterie, activez **Mode ultraléger** dans **Paramètres → Éditeur → Rendu**. Il coupe immédiatement les animations de l’interface et, après un rechargement, rend la zone de travail par tuiles à un pixel de l’appareil par pixel d’écran, omet les flous d’arrière-plan et le bruit, et dessine les ombres à une résolution réduite quand le zoom est fort. Le rendu progressif reste actif tant que le mode ultraléger l’est. Les images exportées conservent tous les effets.

## Repères des règles

Les règles sont masquées jusqu’à ce que vous les affichiez avec **Affichage → Règles** ou <kbd>Shift</kbd> + <kbd>R</kbd>. Faites ensuite glisser depuis la règle du haut pour un repère horizontal, ou depuis la règle de gauche pour un repère vertical. Déposez-le sur la page pour un repère de la zone de travail, ou sur un cadre pour un repère dans les coordonnées de ce cadre.

- Cliquez sur un repère pour le sélectionner ; faites-le glisser pour le repositionner ou le transférer entre la page et un cadre.
- Maintenez <kbd>Option</kbd> / <kbd>Alt</kbd> en faisant glisser un repère existant pour le dupliquer.
- Ramenez un repère sur une règle pour le supprimer, ou utilisez **Supprimer le repère** dans son menu contextuel.
- Les modifications de repères peuvent être annulées et rétablies, et sont conservées dans les fichiers `.fig`.

## Magnétisme

Dans **Affichage → Préférences**, activez **Aligner sur la géométrie**, **Aligner sur les objets** et **Aligner sur la grille de pixels** indépendamment. Les préférences sont conservées entre les sessions.

L’alignement sur la géométrie et sur les objets aide à aligner les points vectoriels, les calques déplacés et les bords redimensionnés avec la géométrie, les objets, les repères et les bords de cadres voisins. Des lignes d’alignement apparaissent pour ces cibles ; l’arrondi à la grille de pixels ne dessine pas une ligne d’alignement pour chaque pixel.

Avec **Aligner sur les objets** activé, un calque déplacé s’aligne aussi sur l’espacement égal : il se centre entre ses deux voisins, ou se place à la même distance d’un voisin que celle qui sépare deux autres voisins de la même rangée ou colonne. Chaque écart de cette taille montre un indicateur rose avec sa taille. Le redimensionnement ne s’aligne pas sur l’espacement.

Avec **Aligner sur la grille de pixels** activé, les calques déplacés, les bords redimensionnés et les calques dessinés tombent sur des pixels entiers à n’importe quel zoom, même s’ils ont commencé entre les pixels. Un alignement sur un objet ou un repère l’emporte sur la grille. Les déplacements aux flèches et les valeurs tapées dans le panneau des propriétés gardent leurs fractions.

Activez **Aligner sur les demi-pixels** dans **Paramètres → Éditeur** pour que l’alignement à la grille de pixels puisse aussi tomber sur des demi-pixels, afin qu’un trait de 1 px reste centré sur un bord de pixel. Un tableau garde sa grille de 16 unités.

Maintenez <kbd>Control</kbd> pendant le glissement d’un calque pour ignorer temporairement l’alignement sur les objets et les pixels, y compris sous macOS, où c’est Control, et non Command.

## Mesures de distance

Sélectionnez un calque, maintenez <kbd>Option</kbd> sous macOS ou <kbd>Alt</kbd> sous Windows/Linux, et survolez un autre calque pour voir des mesures de distance temporaires. Relâcher la touche efface l’affichage ; cela n’ajoute pas de repère et ne modifie pas le document.

## Palette de commandes

Appuyez sur <kbd>⌘</kbd><kbd>K</kbd> sous macOS ou <kbd>Ctrl</kbd> + <kbd>K</kbd> sous Windows/Linux pour rechercher des actions de l’éditeur et de l’application. Sélectionnez un résultat pour l’exécuter ; les actions indisponibles restent soumises à la sélection et à l’état du document.

La palette permet aussi de changer de page. Avant que vous ne tapiez, elle liste les pages visitées récemment dans cet onglet, de la plus récente à la plus ancienne, et **Aller à la page…** ouvre la liste de toutes les pages. Saisir le nom d’une page permet aussi de la trouver. Les pages où des collaborateurs ou des agents IA travaillent affichent leurs noms ; le panneau des pages marque les mêmes pages avec leurs couleurs.

## Conseils

- Le zoom vise toujours la position du pointeur : pointez ce que vous voulez voir de plus près.
- L’outil Main est utile quand vous devez déplacer souvent la vue : il reste actif jusqu’à ce que vous changiez d’outil.
- Voir [Sélection et transformation](./selection-and-manipulation) pour travailler avec les objets sur la zone de travail.

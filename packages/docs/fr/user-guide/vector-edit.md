---
title: Édition vectorielle
description: Modifier les points, poignées de Bézier et segments d’un tracé.
---

# Édition vectorielle

## Entrer et sortir

1. Sélectionnez un objet vectoriel avec l’outil Sélection.
2. Double-cliquez sur sa courbe ou appuyez sur <kbd>Enter</kbd>.
3. Appuyez sur <kbd>Escape</kbd> pour revenir à la sélection normale.

Dans ce mode, le contour et les points sont directement modifiables. Les angles du cadre de sélection ne redimensionnent ni ne font pivoter l’objet.

## Points

Cliquez sur un point pour le sélectionner ; utilisez <kbd>Shift</kbd> pour l’ajouter ou le retirer de la sélection. Faites glisser les points pour les déplacer. Les segments reliés sont actualisés pendant le mouvement.

Appuyez sur <kbd>Delete</kbd> ou <kbd>Backspace</kbd> pour supprimer les points sélectionnés.

## Poignées de Bézier

| Comportement | macOS | Windows / Linux |
|--------------|-------|-----------------|
| Courbe continue | <kbd>⌘</kbd> + glisser | <kbd>Ctrl</kbd> + glisser |
| Angle, poignées indépendantes | <kbd>Option</kbd> + glisser | <kbd>Alt</kbd> + glisser |
| Conserver la direction, modifier la longueur | <kbd>Shift</kbd> + glisser | <kbd>Shift</kbd> + glisser |

## Segments

Cliquez sur un segment pour le sélectionner. Faites-le glisser pour le courber ; OpenPencil crée les poignées nécessaires. Double-cliquez pour ajouter un point.

## Couper, joindre et remodeler

- <kbd>X</kbd> active l’outil Couper. Cliquez sur un segment pour le couper à cet endroit, ou sur un point pour séparer les segments qui s’y rejoignent. <kbd>X</kbd>, <kbd>Escape</kbd> ou une autre touche d’outil le désactive.
- Double-cliquez sur un point pour basculer entre point lisse et angle.
- <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + double-clic sur un segment retire ses poignées et le rend droit.
- <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>J</kbd> joint deux extrémités sélectionnées : au même endroit, elles deviennent un seul point ; sinon, un segment droit les relie. Joindre les deux extrémités d’un tracé le ferme et le remplit. Pendant l’édition d’un tracé, ce raccourci n’ouvre pas le chat.
- <kbd>Option</kbd>/<kbd>Alt</kbd> + glisser fait glisser une copie des points ou segments sélectionnés. La copie d’un point isolé reste reliée à lui.
- Les flèches déplacent les points sélectionnés de la distance définie dans Réglages → Éditeur, et avec <kbd>Shift</kbd> de la grande distance.

## Continuer un tracé ouvert

Sélectionnez une extrémité et utilisez Plume pour prolonger le tracé. Cliquez sur l’extrémité opposée pour fermer la forme.

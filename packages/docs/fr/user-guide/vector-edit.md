---
title: Édition vectorielle
description: 'Modifier la géométrie d’un tracé vectoriel : points d’ancrage, poignées de Bézier, touches de modification et actions de l’outil Plume en mode édition.'
---

# Édition vectorielle

Le mode d’édition vectorielle permet de modifier la **géométrie** d’une courbe : position des points d’ancrage, forme des segments et poignées de Bézier.
Dans ce mode, vous modifiez le tracé lui-même, et non les transformations habituelles de l’objet.

## Entrer dans le mode {#entering-the-mode}

- Sélectionnez un objet vectoriel avec l’outil Déplacer.
- **Double-cliquez sur la courbe**, ou appuyez sur <kbd>Enter</kbd>.

L’édition de la géométrie du vecteur sélectionné est alors active.

## Quitter le mode {#exiting-the-mode}

- Appuyez sur <kbd>Escape</kbd>.
- Cliquez sur une zone vide de la zone de travail.
- Ou passez à un autre contexte d’édition.

## Ce qui change dans ce mode {#what-changes-in-this-mode}

- Le cadre de transformation habituel de l’objet est désactivé.
- La modification des points d’ancrage, des segments et des poignées devient possible.
- Le curseur ne passe pas en redimensionnement ou en rotation aux coins du cadre du calque ; il le fait sur le cadre de transformation des points sélectionnés (voir [Transformer les points sélectionnés](#transform-selected-points)).

## Actions de base {#basic-actions}

### Déplacer un point d’ancrage {#move-an-anchor}

- Faites glisser un point d’ancrage.
- Les segments reliés et la forme du tracé sont actualisés en direct dans l’aperçu.

### Modifier une poignée de Bézier {#edit-a-bezier-handle}

- Faites glisser une poignée du point d’ancrage.
- Par défaut, le comportement suit la composition actuelle des poignées de ce point.

### Sélectionner et déplacer un segment {#select-and-move-a-segment}

- Cliquez sur un segment pour le sélectionner. Le segment devient bleu et affiche un bouton en son milieu ; ses points d’ancrage restent désélectionnés.
- <kbd>Shift</kbd> + clic ajoute un segment à la sélection, ou retire un segment sélectionné.
- Faites glisser un segment pour déplacer les deux points d’ancrage qu’il relie, avec le reste de la sélection.

### Sélection rectangulaire {#select-with-a-marquee}

- Faites glisser sur une zone vide pour sélectionner les points d’ancrage situés dans le rectangle et les segments qui les relient.
- <kbd>Shift</kbd> + glissement les ajoute à la sélection.

### Sélectionner une région {#select-a-region}

- Placez le pointeur dans une zone remplie : la région située dessous est hachurée de lignes diagonales.
- Cliquez à l’intérieur pour sélectionner la région et tous ses points ; faites glisser pour la déplacer.
- <kbd>Shift</kbd> + clic ajoute la région à la sélection.

### Supprimer des points d’ancrage et des segments {#delete-anchors-and-segments}

- Appuyez sur <kbd>Delete</kbd> ou <kbd>Backspace</kbd> pour supprimer la sélection.
- Un point d’ancrage supprimé emporte ses segments.
- Un segment supprimé n’emporte que les points d’ancrage qu’il laisse sans connexion : supprimer le segment central d’un tracé le coupe donc en deux.
- Tout supprimer supprime le calque.

## Couper, joindre et remodeler {#cut-join-and-reshape}

| Action                         | Mac                                       | Windows / Linux                         |
| ------------------------------ | ----------------------------------------- | --------------------------------------- |
| Outil de découpe               | <kbd>X</kbd>                              | <kbd>X</kbd>                            |
| Point lisse ou angle           | Double-clic sur un point                  | Double-clic sur un point                |
| Redresser un segment           | <kbd>Cmd</kbd> + double-clic              | <kbd>Ctrl</kbd> + double-clic           |
| Courber un segment             | <kbd>Cmd</kbd> + glisser un segment       | <kbd>Ctrl</kbd> + glisser un segment    |
| Courber sans toucher aux voisins | <kbd>Cmd</kbd> + <kbd>Option</kbd> + glisser | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + glisser |
| Joindre deux extrémités        | <kbd>Cmd</kbd> + <kbd>J</kbd>             | <kbd>Ctrl</kbd> + <kbd>J</kbd>          |
| Dupliquer des points           | <kbd>Option</kbd> + glisser               | <kbd>Alt</kbd> + glisser                |
| Déplacer des points            | Flèches                                   | Flèches                                 |

- **Outil de découpe :** appuyez sur <kbd>X</kbd>, puis cliquez sur un segment pour le couper à cet endroit, ou sur un point pour séparer les segments qui s’y rejoignent. Les courbes gardent leur forme, et une forme fermée que l’on coupe cesse d’être remplie. <kbd>X</kbd> de nouveau, <kbd>Escape</kbd> ou une autre touche d’outil le désactive.
- **Lisse ou angle :** double-cliquez sur un point d’angle pour lui donner des poignées dans l’axe de ses voisins, et double-cliquez sur un point lisse pour retirer ses poignées.
- **Redresser :** <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + double-clic sur un segment courbe retire ses deux poignées.
- **Joindre :** sélectionnez deux extrémités et appuyez sur <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>J</kbd>. Au même endroit, elles deviennent un seul point ; sinon, un segment droit les relie. Joindre les deux extrémités d’un même tracé le ferme et le remplit. Pendant l’édition d’un tracé, ce raccourci joint les points au lieu d’ouvrir le chat.
- **Dupliquer :** maintenez <kbd>Option</kbd>/<kbd>Alt</kbd> et faites glisser des points ou segments sélectionnés pour en faire glisser une copie. La copie d’un point isolé reste reliée à lui : le glissement prolonge donc le tracé.
- **Décaler :** les flèches déplacent les points sélectionnés de la distance de décalage définie dans **Paramètres → Éditeur**, et <kbd>Shift</kbd> + flèche de la grande distance.
- **Courber :** <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + glisser sur un segment le courbe pour que l’endroit saisi suive le pointeur. Une extrémité lisse reste lisse et son autre poignée tourne avec elle. Ajoutez <kbd>Option</kbd>/<kbd>Alt</kbd> pour laisser en place les poignées des segments voisins ; les extrémités deviennent alors des angles.

## Transformer les points sélectionnés {#transform-selected-points}

Quand deux points ou segments sont sélectionnés, un cadre de transformation les entoure.

- Faites glisser un coin ou un bord pour mettre les points sélectionnés à l’échelle depuis le côté opposé. Maintenez <kbd>Shift</kbd> pour conserver les proportions et <kbd>Option</kbd>/<kbd>Alt</kbd> pour partir du centre.
- Faites glisser juste à l’extérieur d’un coin pour les faire pivoter autour du centre du cadre. Maintenez <kbd>Shift</kbd> pour pivoter par pas de 15°.
- Les points et segments situés sous le pointeur restent déplaçables par-dessus le cadre, et chaque transformation s’annule en une seule étape.

## Touches de modification des poignées {#handle-drag-modifiers}

| Action                                   | Mac                         | Windows / Linux            |
| ---------------------------------------- | --------------------------- | -------------------------- |
| Continue (lisse / continue)              | <kbd>Cmd</kbd> + glisser    | <kbd>Ctrl</kbd> + glisser  |
| Angle (poignées indépendantes)           | <kbd>Option</kbd> + glisser | <kbd>Alt</kbd> + glisser   |
| Direction verrouillée (longueur seule)   | <kbd>Shift</kbd> + glisser  | <kbd>Shift</kbd> + glisser |

### Continue : <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + glisser {#continuous-cmd-ctrl-drag}

- La poignée active est contrainte à rester sur la même ligne que la poignée sœur.
- Seule la longueur de la poignée active change.
- Utilisez-la pour des transitions lisses, sans cassure d’angle.

### Angle : <kbd>Option</kbd>/<kbd>Alt</kbd> + glisser {#corner-option-alt-drag}

- La poignée active est modifiée indépendamment.
- La poignée sœur reste en place.
- Utilisez-la pour créer une transition en angle vif.

### Direction verrouillée : <kbd>Shift</kbd> + glisser {#direction-lock-shift-drag}

Pour les points d’ancrage en composition **Continue** ou **Symétrique** :

- la direction de la poignée est verrouillée sur sa valeur **d’avant le début du glissement en cours** ;
- le glissement ne change que la longueur de la poignée (ou des poignées, selon la composition).

## Choisir la poignée en faisant glisser un point d’ancrage {#bend-override-by-dragging-an-anchor}

Quand vous faites glisser un point d’ancrage en maintenant <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>, l’éditeur choisit la poignée cible selon la **direction de rattachement du segment** à ce point (et non selon la distance au point voisin le plus proche).
Cela fonctionne aussi sur les points d’ancrage à plusieurs branches d’un réseau vectoriel : une fois déterminée, la poignée cible reste verrouillée pendant tout le glissement.

## Utiliser l’outil Plume en mode édition {#using-the-pen-tool-in-edit-mode}

Quand l’outil Plume est actif :

- **Cliquez sur un segment** pour insérer un nouveau point d’ancrage (le segment est coupé en deux).
- **Cliquez sur l’extrémité d’un tracé ouvert** pour reprendre le dessin depuis ce point ; cliquez ensuite sur l’extrémité opposée pour fermer la forme.
- **Option/Alt + clic sur un point d’ancrage** le supprime (si la topologie le permet).

Pour la création et la fermeture des tracés, voir [Outil Plume](./pen-tool).

## Exemple de travail {#practical-workflow}

1. Dessinez une forme avec l’outil Plume.
2. Double-cliquez sur la courbe pour passer en mode d’édition vectorielle.
3. Déplacez les points d’ancrage pour affiner la silhouette.
4. Faites glisser les poignées :
   - avec <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> pour des transitions lisses et continues,
   - avec <kbd>Option</kbd>/<kbd>Alt</kbd> pour des modifications indépendantes,
   - avec <kbd>Shift</kbd> pour ne modifier que la longueur.
5. Appuyez sur <kbd>Escape</kbd> pour quitter.

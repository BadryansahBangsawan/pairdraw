---
title: Sélectionner et transformer
description: Sélectionner, déplacer, redimensionner, faire pivoter, dupliquer et organiser des objets dans Pairdraw.
---

# Sélectionner et transformer

Sélectionnez des objets pour les déplacer, les redimensionner, les faire pivoter, les dupliquer et les organiser sur la zone de travail.

## Sélection

- **Cliquez** sur un objet pour le sélectionner (cela désélectionne tout le reste). Comme dans Figma, un clic dans un cadre de premier niveau sélectionne un enfant direct de ce cadre, comme un cadre imbriqué ou un groupe, plutôt que le calque le plus profond ; cliquez sur un cadre de premier niveau par son titre, n’importe où quand il est vide, ou dans ses espacements et marges internes quand il a une disposition automatique.
- **Survolez** un cadre en disposition automatique pour voir ses enfants directs entourés de pointillés ; quand un seul calque est sélectionné, le contour de son parent en disposition automatique est en pointillés.
- **Double-cliquez** pour descendre d’un niveau, ou cliquez de nouveau dans un cadre, un composant ou une instance sélectionnés ; une fois un calque sélectionné, les clics atteignent directement ses frères et ses cousins.
- <kbd>⌘</kbd> + clic (<kbd>Ctrl</kbd> + clic sous Windows et Linux) sélectionne le calque le plus profond sous le pointeur ; maintenir <kbd>⌘</kbd> met ce calque en surbrillance avant le clic.
- <kbd>Shift</kbd> + clic ajoute un objet à la sélection actuelle ou l’en retire. Un calque et son propre parent ou enfant ne sont jamais sélectionnés ensemble : un <kbd>Shift</kbd> + clic sur l’un remplace l’autre.
- **Double-cliquez sur le nom d’un cadre ou d’un composant**, au-dessus de lui sur la zone de travail, pour le renommer sur place.
- **Sélection rectangulaire :** faites glisser sur une zone vide de la zone de travail pour tracer un rectangle de sélection ; les objets qu’il traverse sont sélectionnés au relâchement. Commencée dans un cadre de premier niveau sans disposition automatique ou dans une section, elle sélectionne les calques de ce conteneur ; depuis la page, un cadre ou une section qui contient des calques n’est sélectionné que s’il est entièrement entouré.
- <kbd>⌘</kbd> + glissement (<kbd>Ctrl</kbd> + glissement sous Windows et Linux) crée une sélection rectangulaire qui sélectionne les calques imbriqués les plus profonds qu’elle touche. Elle démarre là où démarre une sélection rectangulaire normale : sur la zone de travail vide ou sur le fond vide d’un cadre de premier niveau ou d’une section. Sur un calque ou sur le fond d’un cadre, d’un composant ou d’une instance imbriqués, <kbd>⌘</kbd> + glissement sélectionne ce calque et le déplace. Appuyez sur <kbd>⌘</kbd> ou relâchez-la pendant le glissement pour passer de la sélection profonde à la sélection normale.
- <kbd>⌘</kbd><kbd>A</kbd> sélectionne tous les objets de la page actuelle.
- <kbd>Enter</kbd> sélectionne les enfants des calques sélectionnés ; sur un vecteur, il modifie le tracé, et sur un texte, il modifie le texte.
- <kbd>Shift</kbd> + <kbd>Enter</kbd> ou <kbd>\\</kbd> sélectionne le parent des calques sélectionnés.
- <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> sélectionne le frère suivant ou précédent, en descendant ou en remontant dans le panneau des calques et en recommençant aux extrémités.
- **Un clic sur une zone vide** annule la sélection.

## Déplacer

- **Faites glisser** un objet sélectionné pour le déplacer (tous les objets sélectionnés se déplacent ensemble).
- **Les touches fléchées** déplacent les objets sélectionnés du petit décalage, 1 px par défaut.
- <kbd>Shift</kbd> + flèches déplacent du grand décalage, 10 px par défaut.

Réglez les deux distances dans **Paramètres → Éditeur → Décalage aux flèches**.

## Redimensionner

La sélection affiche huit poignées de redimensionnement : quatre aux coins et quatre au milieu des côtés. Faites glisser l’une d’elles pour redimensionner.

- <kbd>Shift</kbd> + glissement d’une poignée d’angle conserve les proportions.

## Outil Mise à l’échelle

Appuyez sur <kbd>K</kbd>, ou choisissez **Mettre à l’échelle** dans le menu de l’outil Déplacer de la barre d’outils, pour mettre des calques à l’échelle avec tout leur contenu : tailles de texte, contours, effets, rayons d’angle et espacements de la disposition automatique grandissent et rétrécissent avec le calque, comme avec l’outil Scale de Figma. Faites glisser une poignée de la sélection pour partir du côté opposé, ou maintenez <kbd>Option</kbd>/<kbd>Alt</kbd> pour partir du centre ; plusieurs calques sélectionnés se mettent à l’échelle ensemble autour de leurs limites communes.

Tant que l’outil est actif, le panneau Design affiche la largeur et la hauteur de la sélection, un facteur d’échelle et une grille d’ancrage. Saisir une largeur ou une hauteur met la sélection à l’échelle proportionnellement ; le facteur accepte `2`, `2x` ou `200%`. La grille d’ancrage choisit le point qui reste en place. Chaque mise à l’échelle est une seule étape d’annulation.

## Entrer dans les cadres et en sortir

Un objet que vous faites glisser arrive dans le cadre situé sous le pointeur au relâchement, même s’il n’en recouvre qu’une petite partie, et quitte son cadre dès que le pointeur en sort. Les groupes et les cadres verrouillés n’accueillent jamais d’objets déposés, et un ensemble de composants ne reprend que ses propres variantes ; un objet situé dans un groupe y reste, sauf si vous le déposez sur un autre cadre, et le groupe se redimensionne selon son contenu. Un groupe dont le dernier objet sort est supprimé. Appuyer dans un cadre, un groupe ou un ensemble de composants sélectionné fait glisser celui-ci plutôt que l’objet situé sous le pointeur.

- <kbd>Shift</kbd> + glissement : limite le déplacement à un axe.
- Maintenir <kbd>Space</kbd> pendant le glissement : garde les objets dans leurs parents actuels.
- <kbd>⌃</kbd> + glissement (<kbd>Ctrl</kbd> + glissement sous Windows et Linux) : désactive le magnétisme ; déposé dans un cadre en disposition automatique, l’objet est positionné en absolu.

Les objets verrouillés d’une sélection restent en place quand le reste de la sélection se déplace.

## Faire pivoter

Placez le pointeur juste à l’extérieur d’une poignée d’angle pour voir le curseur de rotation, puis faites glisser.

- <kbd>Shift</kbd> + glissement aligne la rotation par pas de 15°.

## Dupliquer

- <kbd>Alt</kbd> + glissement (<kbd>⌥</kbd> + glissement sur Mac) duplique l’objet sélectionné et déplace la copie.
- <kbd>⌘</kbd><kbd>D</kbd> duplique au même emplacement ; la copie d’un cadre de premier niveau seul, sur la page ou dans une section, va dans le premier espace libre à sa droite.

Les doublons conservent leur nom. Dupliquer ainsi un composant principal crée une instance de celui-ci.

## Coller

<kbd>⌘</kbd><kbd>V</kbd> conserve la position copiée. Collés dans un cadre sélectionné, les objets gardent leur décalage par rapport au cadre d’où ils ont été copiés, et sont centrés sur tout axe où ils ne tiennent pas ; les objets qui arriveraient hors de la vue y sont centrés. Utilisez **Coller ici** dans le [menu contextuel](./context-menu) pour coller à l’emplacement du pointeur.

## Supprimer

Appuyez sur <kbd>Retour arrière</kbd> ou <kbd>Suppr</kbd> pour supprimer tous les objets sélectionnés.

## Ordre d’empilement

Changez l’ordre d’empilement des objets dans leur parent :

- **]** met au premier plan (en haut de la liste des frères).
- **[** met en arrière-plan (en bas de la liste des frères).
- <kbd>⌘</kbd><kbd>]</kbd> ou <kbd>Ctrl</kbd><kbd>]</kbd> avance la sélection d’un niveau, <kbd>⌘</kbd><kbd>[</kbd> ou <kbd>Ctrl</kbd><kbd>[</kbd> la recule d’un niveau.

## Visibilité et verrouillage

- <kbd>⇧</kbd><kbd>⌘</kbd><kbd>H</kbd> change la visibilité. Les objets masqués ne sont pas rendus mais restent dans le panneau des calques.
- <kbd>⇧</kbd><kbd>⌘</kbd><kbd>L</kbd> change le verrouillage. Les objets verrouillés ne peuvent être ni sélectionnés ni déplacés sur la zone de travail.

## Déplacer vers une page

Déplacez les objets sélectionnés vers une autre page avec **Déplacer vers la page** dans le [menu contextuel](./context-menu). Les objets sont rattachés à la zone de travail de la page cible.

## Modifier plusieurs calques

Quand plusieurs calques sont sélectionnés, le panneau des propriétés affiche ce qu’ils ont en commun et indique **Mixte** là où ils diffèrent ; une modification les change tous en une seule étape d’annulation.

- **Disposition** affiche leurs tailles, le redimensionnement du texte quand du texte est sélectionné, le flux quand tous les calques sont des cadres, et **Rogner le contenu** pour les cadres parmi eux. Quand les calques forment une seule rangée ou colonne, **Espacement** affiche l’écart entre eux ; saisir une valeur les espace uniformément à partir du premier calque.
- **Typographie** apparaît dès que du texte est sélectionné et ne modifie que le texte.
- **Contour** affiche le contour des calques qui en ont un ; le modifier ajoute ce contour à tous les calques sélectionnés.
- **Couleurs de la sélection** liste toutes les couleurs de remplissage et de contour de la sélection, y compris dans les cadres et les groupes, des plus utilisées aux moins utilisées. En changer une la recolore partout où elle est utilisée.

## Sections

Une section intègre les objets frères qu’elle recouvre entièrement quand vous la dessinez, la déplacez ou la redimensionnez par-dessus.

## Raccourcis clavier

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Tout sélectionner | <kbd>⌘</kbd><kbd>A</kbd> | <kbd>Ctrl</kbd> + <kbd>A</kbd> |
| Dupliquer | <kbd>⌘</kbd><kbd>D</kbd> | <kbd>Ctrl</kbd> + <kbd>D</kbd> |
| Dupliquer et déplacer | <kbd>⌥</kbd> + glissement | <kbd>Alt</kbd> + glissement |
| Outil Mise à l’échelle | <kbd>K</kbd> | <kbd>K</kbd> |
| Déplacer sur un axe | <kbd>⇧</kbd> + glissement | <kbd>Shift</kbd> + glissement |
| Garder le parent actuel | <kbd>Space</kbd> pendant le glissement | <kbd>Space</kbd> pendant le glissement |
| Déplacer sans magnétisme | <kbd>⌃</kbd> + glissement | <kbd>Ctrl</kbd> + glissement |
| Supprimer | <kbd>⌫</kbd> / <kbd>Suppr</kbd> | <kbd>Retour arrière</kbd> / <kbd>Suppr</kbd> |
| Déplacer de 1 px | Flèches | Flèches |
| Déplacer de 10 px | <kbd>⇧</kbd> + flèches | <kbd>Shift</kbd> + flèches |
| Mettre au premier plan | ] | ] |
| Avancer | <kbd>⌘</kbd><kbd>]</kbd> | <kbd>Ctrl</kbd> + <kbd>]</kbd> |
| Mettre en arrière-plan | [ | [ |
| Reculer | <kbd>⌘</kbd><kbd>[</kbd> | <kbd>Ctrl</kbd> + <kbd>[</kbd> |
| Visibilité | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>H</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>H</kbd> |
| Verrouillage | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>L</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>L</kbd> |

## Conseils

- Utilisez le panneau [Calques et pages](./layers-and-pages) pour voir et réordonner les objets qui se chevauchent.
- Voir [Menu contextuel](./context-menu) pour d’autres actions, comme le groupement et la création de composants.

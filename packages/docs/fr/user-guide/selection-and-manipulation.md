---
title: Sélectionner et transformer
description: Sélectionner, déplacer, redimensionner, faire pivoter, dupliquer et ordonner des objets.
---

# Sélectionner et transformer

Les objets sélectionnés peuvent être déplacés, redimensionnés, tournés, dupliqués et réorganisés dans l’ordre des calques.

## Sélection

- Un clic sur un objet remplace la sélection actuelle.
- <kbd>Shift</kbd> + clic ajoute ou retire un objet.
- Un glissement sur une zone libre de la zone de travail crée une sélection rectangulaire et sélectionne les objets qu’elle traverse.
- <kbd>⌘</kbd> + glissement (<kbd>Ctrl</kbd> + glissement sous Windows et Linux) crée une sélection rectangulaire qui sélectionne les calques imbriqués les plus profonds qu’elle touche. Elle démarre là où démarre une sélection rectangulaire normale : sur le canevas vide ou sur le fond vide d’un cadre de premier niveau ou d’une section. Sur un calque ou sur le fond d’un cadre, d’un composant ou d’une instance imbriqués, <kbd>⌘</kbd> + glissement sélectionne ce calque et le déplace. Appuyez sur <kbd>⌘</kbd> ou relâchez-la pendant le glissement pour passer de la sélection profonde à la sélection normale.
- <kbd>⌘</kbd><kbd>A</kbd> sélectionne tous les objets de la page actuelle.
- Un clic sur une zone libre annule la sélection.

## Déplacer

- Faites glisser un objet sélectionné.
- Les touches fléchées déplacent du petit décalage, 1 px par défaut.
- <kbd>Shift</kbd> + flèches déplacent du grand décalage, 10 px par défaut.
- Réglez les deux distances dans **Paramètres → Éditeur → Décalage aux flèches**.

## Redimensionner

La sélection affiche huit poignées : quatre aux coins et quatre au milieu des côtés. Faites glisser l’une d’elles pour modifier la largeur et la hauteur.

Maintenez <kbd>Shift</kbd> sur une poignée d’angle pour conserver les proportions.

## Outil Mise à l'échelle

Appuyez sur <kbd>K</kbd>, ou choisissez **Mettre à l'échelle** dans le menu de l'outil Déplacer, pour mettre des calques à l'échelle avec tout leur contenu : tailles de texte, contours, effets, rayons d'angle et espacements de la mise en page automatique suivent le calque. Faites glisser une poignée de la sélection pour partir du côté opposé, ou maintenez <kbd>Option</kbd>/<kbd>Alt</kbd> pour partir du centre ; plusieurs calques sélectionnés se mettent à l'échelle ensemble autour de leur cadre commun.

Tant que l'outil est actif, le panneau Design affiche la largeur et la hauteur de la sélection, un facteur d'échelle et une grille d'ancrage. Saisir une largeur ou une hauteur met la sélection à l'échelle proportionnellement ; le facteur accepte `2`, `2x` ou `200%`. La grille d'ancrage choisit le point qui reste en place. Chaque mise à l'échelle est une seule étape d'annulation.

## Faire pivoter

Placez le pointeur juste à l’extérieur d’une poignée d’angle jusqu’à l’apparition du curseur de rotation, puis faites glisser. <kbd>Shift</kbd> aligne la rotation par pas de 15°.

## Dupliquer

- <kbd>⌥</kbd> ou <kbd>Alt</kbd> pendant le glissement crée et déplace une copie.
- <kbd>⌘</kbd><kbd>D</kbd> ou <kbd>Ctrl</kbd><kbd>D</kbd> duplique au même emplacement.

## Supprimer

Appuyez sur <kbd>Retour arrière</kbd> ou <kbd>Suppr</kbd> pour supprimer tous les objets sélectionnés.

## Ordre

- **]** avance la sélection d’un niveau.
- <kbd>⌘</kbd><kbd>]</kbd> ou <kbd>Ctrl</kbd><kbd>]</kbd> la place au premier plan.
- **[** recule la sélection d’un niveau.
- <kbd>⌘</kbd><kbd>[</kbd> ou <kbd>Ctrl</kbd><kbd>[</kbd> l’envoie à l’arrière-plan.

## Visibilité et verrouillage

- <kbd>⇧</kbd><kbd>⌘</kbd><kbd>H</kbd> change la visibilité.
- <kbd>⇧</kbd><kbd>⌘</kbd><kbd>L</kbd> change le verrouillage.

## Raccourcis

| Action | macOS | Windows / Linux |
|--------|-------|-----------------|
| Tout sélectionner | <kbd>⌘</kbd><kbd>A</kbd> | <kbd>Ctrl</kbd><kbd>A</kbd> |
| Dupliquer | <kbd>⌘</kbd><kbd>D</kbd> | <kbd>Ctrl</kbd><kbd>D</kbd> |
| Dupliquer et déplacer | <kbd>⌥</kbd> + glissement | <kbd>Alt</kbd> + glissement |
| Supprimer | <kbd>⌫</kbd>/<kbd>Suppr</kbd> | Retour arrière/<kbd>Suppr</kbd> |
| Déplacer de 1 px | Flèches | Flèches |
| Déplacer de 10 px | <kbd>⇧</kbd> + flèches | <kbd>Shift</kbd> + flèches |
| Avancer d’un niveau | ] | ] |
| Premier plan | <kbd>⌘</kbd><kbd>]</kbd> | <kbd>Ctrl</kbd><kbd>]</kbd> |
| Reculer d’un niveau | [ | [ |
| Arrière-plan | <kbd>⌘</kbd><kbd>[</kbd> | <kbd>Ctrl</kbd><kbd>[</kbd> |
| Visibilité | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>H</kbd> | <kbd>Shift</kbd><kbd>Ctrl</kbd><kbd>H</kbd> |
| Verrouillage | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>L</kbd> | <kbd>Shift</kbd><kbd>Ctrl</kbd><kbd>L</kbd> |

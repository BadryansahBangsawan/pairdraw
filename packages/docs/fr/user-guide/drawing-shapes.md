---
title: Dessiner des formes
description: Créer des rectangles, ellipses, lignes, cadres, sections, polygones et étoiles.
---

# Dessiner des formes

La barre inférieure contient les outils de création de formes, cadres et sections. Sélectionnez-en un, puis faites glisser la zone de travail.

## Outils

| Outil | Touche | Résultat |
|-------|--------|----------|
| Rectangle | <kbd>R</kbd> | Rectangle |
| Ellipse | <kbd>O</kbd> | Ellipse |
| Ligne | <kbd>L</kbd> | Ligne |
| Cadre | <kbd>F</kbd> | Conteneur d’autres objets |
| Section | <kbd>Shift</kbd> + <kbd>S</kbd> | Conteneur de premier niveau |

Polygone et Étoile sont disponibles dans le menu des formes.

## Placer des images

Choisissez **Fichier › Placer une image…** (<kbd>⇧</kbd><kbd>⌘</kbd><kbd>K</kbd>, ou <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>K</kbd> sous Windows et Linux) ou cliquez sur le bouton image de la barre d’outils, puis sélectionnez des fichiers PNG, JPEG, WebP, GIF, AVIF ou SVG. Ils apparaissent sélectionnés au centre de la vue, en une seule étape annulable ; un SVG devient des calques modifiables.

L’outil **Note autocollante** suit Texte dans la barre d’outils. Il n’a pas de touche : <kbd>N</kbd> zoome toujours sur le cadre suivant.

## Conserver les proportions

Avec <kbd>Shift</kbd>, un rectangle devient carré, une ellipse devient cercle et une ligne s’aligne sur 0°, 45° ou 90°.

## Propriétés

### Remplissage

Couleur unie, dégradé linéaire, radial, angulaire ou diamant, image et shader : un shader GLSL animé ; partez de la galerie du sélecteur de remplissage de shader, ajoutez-lui des effets, ou collez un préréglage copié depuis shaders.com.

Un dégradé de **maille** mélange une grille de points sur le calque : dans l’onglet de maille, choisissez un point pour changer sa couleur ou modifiez **Colonnes** et **Lignes** pour rééchantillonner la grille.
Pour recadrer une image sur le canevas, double-cliquez sur le calque, appuyez sur <kbd>Entrée</kbd> quand il est sélectionné ou choisissez **Recadrer l'image** dans son menu contextuel ou son remplissage d’image. L’image apparaît en entier, estompée hors du calque. Faites glisser les équerres d’angle ou les barres des bords du calque pour le recadrer sur l’image immobile, faites glisser l’image pour la déplacer derrière le calque et ses points d’angle pour la mettre à l’échelle. <kbd>Maj</kbd> garde les proportions ou un axe et <kbd>Alt</kbd> part du centre. Chaque glissement est une étape annulable ; <kbd>Entrée</kbd>, <kbd>Échap</kbd>, un double-clic ou un clic hors de l’image termine. Les vecteurs, les calques avec enfants et les calques placés par l’auto-layout gardent leurs bords : sur eux, vous pouvez seulement déplacer et redimensionner l’image.

### Mode shader

Le mode shader montre un remplissage de shader seul et en grand, avec lecture et pause, un curseur de phase et les réglages du shader à côté. Ouvrez-le avec **Ouvrir en mode shader** dans le sélecteur de remplissage de shader, ou avec **Affichage → Mode shader** quand la sélection a un remplissage de shader.

### Contour

Épaisseur commune ou par côté, couleur, alignement intérieur/centré/extérieur, extrémités, jointures et tirets.

### Rayon des angles

Commun ou indépendant pour rectangles, cadres, composants et instances.

### Effets

Ombres extérieure et intérieure, flou du calque, d’arrière-plan ou de premier plan.

## Cadres et sections

Un cadre est un conteneur. Les objets déposés à l’intérieur deviennent ses enfants. Le découpage est désactivé par défaut. Les cadres prennent en charge la [disposition automatique](./auto-layout).

Une section est un conteneur de premier niveau qui adopte automatiquement les objets qu’elle recouvre lors de sa création.

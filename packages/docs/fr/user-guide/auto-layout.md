---
title: Disposition automatique
description: Disposition flex et en grille dans Pairdraw — direction, espacement, marges intérieures, alignement, dimensionnement des enfants et pistes CSS Grid.
---

# Disposition automatique

La disposition automatique place les objets enfants automatiquement dans un cadre. Elle propose deux modes : **flex** (flux horizontal ou vertical) et **grille** (lignes et colonnes avec dimensionnement des pistes).

## Activer la disposition automatique

- Sélectionnez un cadre et appuyez sur <kbd>⇧</kbd><kbd>A</kbd> (<kbd>Shift</kbd> + <kbd>A</kbd>) pour activer ou désactiver la disposition automatique.
- Sélectionnez des objets libres (sans cadre parent) et appuyez sur <kbd>⇧</kbd><kbd>A</kbd> pour les envelopper dans un nouveau cadre en disposition automatique.

Lors de l’enveloppement d’une sélection, les objets sont triés selon leur position visuelle : de gauche à droite pour une disposition horizontale, de haut en bas pour une disposition verticale.

## Direction

Choisissez comment les enfants s’enchaînent :

- **Horizontale :** les enfants s’enchaînent de gauche à droite.
- **Verticale :** les enfants s’enchaînent de haut en bas.
- **Retour à la ligne :** les enfants passent à la ligne ou à la colonne suivante quand la place manque.

## Espacement

### Espacement entre les enfants

L’espace entre deux enfants voisins. Une seule valeur s’applique entre tous les enfants.

### Marges intérieures

L’espace entre le bord du cadre et ses enfants. Réglez une valeur commune à tous les côtés, ou dépliez le réglage pour définir chaque côté séparément (haut, droite, bas, gauche).

## Alignement

### Distribution (axe principal)

Détermine la répartition des enfants dans le sens de la disposition :

- **Début :** les enfants se regroupent au début.
- **Centre :** les enfants sont centrés.
- **Fin :** les enfants se regroupent à la fin.
- **Espace entre :** les enfants se répartissent avec un espace égal entre eux.
- **Espace autour :** chaque enfant reçoit une part égale de l’espace libre, moitié de chaque côté, en plus de l’espacement ; choisissez-le dans le menu du champ d’espacement.

### Alignement (axe transversal)

Détermine la position des enfants perpendiculairement au sens de la disposition :

- **Début :** les enfants s’alignent au début.
- **Centre :** les enfants sont centrés.
- **Fin :** les enfants s’alignent à la fin.
- **Étirer :** les enfants s’étirent pour remplir l’axe transversal.

## Dimensionnement des enfants

Chaque enfant d’un cadre en disposition automatique peut avoir son propre mode de dimensionnement :

- **Fixe :** utilise la largeur ou la hauteur explicite de l’enfant.
- **Remplir :** s’étire pour occuper l’espace disponible dans le parent.
- **Ajuster au contenu :** se réduit à la taille du contenu de l’enfant.

La première modification réelle d’une dimension ne rend fixe que cet axe. Donner le focus au champ ne change pas le mode.

## Inclure les contours dans la disposition

Par défaut, un cadre en disposition automatique dispose son contenu comme si aucun calque n’avait de contour, comme le fait Figma. Activez **Inclure les contours dans la mise en page** dans la section Disposition pour faire de la place aux contours : le contour du cadre lui-même repousse son contenu vers l’intérieur, et les contours extérieurs de ses enfants occupent de l’espace entre eux.

## Réordonner par glisser-déposer

Dans un cadre en disposition automatique, faites glisser un enfant pour le réordonner parmi ses frères. Un indicateur d’insertion montre où l’enfant sera déposé. Un objet amené depuis ailleurs dans un cadre en disposition automatique est inséré de la même façon ; dans un cadre avec retour à la ligne, il va dans la ligne située sous le pointeur. Dessiner dans un cadre en disposition automatique ajoute le nouvel objet à la fin de son flux.

Maintenez <kbd>⌃</kbd> (<kbd>Ctrl</kbd> sous Windows et Linux) pendant le glissement pour ignorer la disposition automatique : l’objet est déposé là où vous le relâchez, comme enfant positionné en absolu.

## Panneau des propriétés

Quand un cadre en disposition automatique est sélectionné, la section Disposition du panneau des propriétés affiche tous les réglages : direction, espacement, marges intérieures, distribution et alignement.

## Raccourcis clavier

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Activer ou désactiver la disposition automatique | <kbd>⇧</kbd><kbd>A</kbd> | <kbd>Shift</kbd> + <kbd>A</kbd> |

## CSS Grid

La disposition en grille répartit les enfants en lignes et en colonnes avec un dimensionnement explicite des pistes.

### Activer la grille

Sélectionnez un cadre dont la disposition automatique est activée et cliquez sur l’icône de grille dans la barre de disposition pour passer de flex à grille.

### Dimensionnement des pistes

Définissez les pistes de colonnes et de lignes avec trois modes de dimensionnement :

- **fr :** unité fractionnaire, répartit l’espace disponible proportionnellement ;
- **px :** taille fixe en pixels ;
- **auto :** s’adapte au contenu.

Exemple : trois colonnes `1fr 200px 1fr` créent une mise en page avec une colonne centrale fixe et des côtés flexibles.

### Espacements de la grille

Réglez séparément l’espacement horizontal (entre colonnes) et vertical (entre lignes) des cellules.

### Placement des enfants

Les enfants sont placés automatiquement dans les cellules, ligne par ligne. Vous pouvez modifier ce placement avec les valeurs de début et d’étendue de colonne et de ligne dans les propriétés de disposition de l’enfant.

### Export JSX et Tailwind

Les dispositions en grille s’exportent en JSX avec des classes Tailwind : `grid grid-cols-3`, `gap-x-4 gap-y-2`, `col-start-2 row-span-2`.

## Conseils

- La disposition automatique est recalculée dès sa création : les limites de la sélection se mettent à jour immédiatement.
- Imbriquez des cadres en disposition automatique pour des mises en page adaptatives complexes (par exemple un cadre vertical contenant des rangées horizontales).
- Utilisez le dimensionnement « Remplir » pour qu’un enfant occupe l’espace restant, comme `flex-grow: 1` en CSS.
- Utilisez la grille pour les tableaux de bord, les galeries et les formulaires, tout ce qui a une structure à deux dimensions.
- Voir [Dessiner des formes](./drawing-shapes) pour créer les cadres auxquels s’applique la disposition automatique.
- Voir [Composants](./components) pour utiliser la disposition automatique dans des composants réutilisables.

---
title: Menu contextuel
description: Actions du menu contextuel de Pairdraw — presse-papiers, ordre d’empilement, groupes, composants et autres.
---

# Menu contextuel

Faites un clic droit sur la zone de travail pour ouvrir le menu contextuel. Si vous faites un clic droit sur un objet, il est d’abord sélectionné. Un clic droit sur une zone vide annule la sélection.

## Copier/Coller en tant que

Le sous-menu **Copier/Coller en tant que** propose d’autres formats de presse-papiers pour le ou les objets sélectionnés :

| Action | Raccourci (Mac) | Raccourci (Win/Linux) |
|--------|-----------------|-----------------------|
| Copier en texte | — | — |
| Copier en SVG | — | — |
| Copier en PNG | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Copier en JSX | — | — |
| Copier en HTML | — | — |

- **Copier en texte** copie le contenu textuel visible de la sélection.
- **Copier en SVG** copie l’arbre des objets sous forme de balisage SVG.
- **Copier en PNG** effectue un rendu à 2× et le place dans le presse-papiers du système (à coller dans Slack, Notion, etc.).
- **Copier en JSX** copie la représentation Pairdraw JSX, à utiliser avec `renderJsx()`.
- **Copier en HTML** copie un fragment HTML avec styles en ligne et images intégrées, prêt à coller dans une page ou un courriel ; cela fonctionne aussi dans les documents en lecture seule.

## Exécuter la note comme consigne

Quand seules des notes autocollantes sont sélectionnées et qu’au moins l’une contient du texte, **Exécuter la note comme consigne** envoie leur texte au [chat avec l’IA](/fr/programmable/ai-chat) du document, avec une référence à chaque note pour que l’assistant sache de quelles notes il provient. L’action n’apparaît que dans les documents que vous pouvez modifier. Si aucun modèle n’est encore configuré, Pairdraw cherche d’abord un agent de code sur votre ordinateur et ouvre la configuration guidée s’il n’en trouve aucun, puis envoie la consigne.

## Actions du presse-papiers

| Action | Raccourci (Mac) | Raccourci (Win/Linux) |
|--------|-----------------|-----------------------|
| Copier | <kbd>⌘</kbd><kbd>C</kbd> | <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Couper | <kbd>⌘</kbd><kbd>X</kbd> | <kbd>Ctrl</kbd> + <kbd>X</kbd> |
| Coller ici | <kbd>⌘</kbd><kbd>V</kbd> | <kbd>Ctrl</kbd> + <kbd>V</kbd> |
| Dupliquer | <kbd>⌘</kbd><kbd>D</kbd> | <kbd>Ctrl</kbd> + <kbd>D</kbd> |
| Supprimer | ⌫ | <kbd>Backspace</kbd> / Suppr |

Les actions du presse-papiers sont désactivées quand rien n’est sélectionné (sauf Coller, disponible quand le presse-papiers contient quelque chose).

## Copier et coller les propriétés

| Action | Raccourci (Mac) | Raccourci (Win/Linux) |
|--------|-----------------|-----------------------|
| Copier les propriétés | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Alt</kbd> + <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Coller les propriétés | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>V</kbd> | <kbd>Alt</kbd> + <kbd>Ctrl</kbd> + <kbd>V</kbd> |

Les deux se trouvent dans le sous-menu **Copier/Coller en tant que**.

- **Copier les propriétés** place le calque sélectionné dans le presse-papiers du système comme le fait Figma, avec une marque pour qu’un Coller ordinaire l’ignore.
- **Coller les propriétés** applique l’apparence du calque unique du presse-papiers à chaque calque sélectionné, verrouillés compris, en une seule étape d’annulation. Il lit une copie faite avec Copier les propriétés ou avec un Copier ordinaire, ici ou dans Figma.
- L’apparence comprend les remplissages, contours, effets, opacité, mode de fusion, rayon des coins, ainsi que les styles et variables liés. Entre cadres, elle inclut la disposition automatique et les grilles de disposition, et entre calques de texte, le style de texte. La position, la taille, la rotation, le nom et le contenu ne changent jamais, et les propriétés qu’un calque de texte fait varier d’un caractère à l’autre restent intactes.

## Ordre d’empilement

| Action | Raccourci |
|--------|-----------|
| Mettre au premier plan | ] |
| Mettre en arrière-plan | [ |

Place l’objet sélectionné en haut ou en bas de la liste des enfants de son parent. Le menu propose aussi **Avancer** et **Reculer** d’un niveau.

## Groupes

| Action | Raccourci (Mac) | Raccourci (Win/Linux) |
|--------|-----------------|-----------------------|
| Grouper | <kbd>⌘</kbd><kbd>G</kbd> | <kbd>Ctrl</kbd> + <kbd>G</kbd> |
| Dégrouper | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>G</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>G</kbd> |
| Ajouter un auto-layout | <kbd>⇧</kbd><kbd>A</kbd> | <kbd>Shift</kbd> + <kbd>A</kbd> |

- **Grouper** nécessite au moins 2 objets sélectionnés.
- **Dégrouper** apparaît quand un groupe est sélectionné : les enfants sont rattachés au parent du groupe.
- **Ajouter un auto-layout** enveloppe la sélection dans un nouveau cadre en [disposition automatique](./auto-layout).

## Actions de composant

Les actions de composant s’affichent en violet, la couleur des composants.

| Action | Raccourci (Mac) | Raccourci (Win/Linux) | Disponible sur |
|--------|-----------------|-----------------------|----------------|
| Créer un composant | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd> | Toute sélection |
| Créer un jeu de composants | — | — | 2 composants sélectionnés ou plus |
| Créer une instance | — | — | Composants (sans raccourci) |
| Aller au composant principal | — | — | Instances |
| Détacher l’instance | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>B</kbd> | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>B</kbd> | Instances |

Voir [Composants](./components) pour le détail du travail avec les composants.

## Visibilité et verrouillage

| Action | Raccourci (Mac) | Raccourci (Win/Linux) |
|--------|-----------------|-----------------------|
| Masquer / Afficher | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>H</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>H</kbd> |
| Verrouiller / Déverrouiller | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>L</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>L</kbd> |

Le libellé change selon l’état actuel de l’objet (par exemple « Masquer » pour un objet visible, « Afficher » pour un objet masqué).

## Déplacer vers une page

Le sous-menu **Déplacer vers la page** liste toutes les pages sauf la page actuelle. Choisissez une page pour rattacher les objets sélectionnés à la zone de travail de cette page, en conservant leur géométrie.

## Conseils

- Un clic droit sur une zone vide donne accès à Coller, pratique pour placer du contenu à un endroit précis.
- Les actions de composant n’apparaissent que lorsqu’elles sont pertinentes (par exemple « Créer une instance » uniquement pour les composants).
- Le menu contextuel reprend les raccourcis clavier : c’est un bon moyen de découvrir ceux que vous ne connaissez pas encore.

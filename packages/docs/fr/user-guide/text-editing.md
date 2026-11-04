---
title: Modifier du texte
description: Créer du texte, sélectionner des caractères et appliquer une mise en forme typographique.
---

# Modifier du texte

## Créer du texte

Appuyez sur <kbd>T</kbd> et cliquez dans la zone de travail. Un objet vide apparaît avec le point d’insertion prêt pour la saisie.

## Modifier

Double-cliquez sur un objet texte. Un contour bleu indique le mode d’édition. Cliquez à l’extérieur pour enregistrer et quitter.

Le texte est dessiné directement dans la zone de travail ; aucun champ superposé indépendant n’apparaît.

## Sélection

- Un clic place le point d’insertion.
- Un glissement sélectionne une plage.
- Un double clic sélectionne un mot.
- Un triple clic sélectionne tout le texte.
- <kbd>Shift</kbd> étend la sélection.

Les flèches déplacent le point d’insertion. <kbd>Option</kbd>/<kbd>Ctrl</kbd> avance par mot ; <kbd>Shift</kbd> conserve et étend la sélection.

## Mise en forme

Le panneau des propriétés modifie famille, style, taille, interligne, approche et alignement. Gras, italique, souligné et barré peuvent s’appliquer à une plage sans changer le reste.

Les mises en forme partielles sont conservées sous forme de plages et participent à l’annulation et au rétablissement.

## Liens

Le texte peut pointer vers une page web ou une adresse de courriel, sur tout le texte ou sur les caractères sélectionnés. Le calque étant sélectionné, choisissez **Ajouter un lien** dans la section Typographie du panneau des propriétés, dans **Texte → Ajouter un lien** dans la barre des menus ou dans le menu contextuel du canevas. L’éditeur de liens s’ouvre sous le texte : tapez une adresse — un domaine seul ou `nom@hôte` reçoit son `https://` ou `mailto:` — et appuyez sur <kbd>Entrée</kbd> pour l’appliquer, ou <kbd>Échap</kbd> pour fermer sans changer. L’éditeur sert aussi à modifier le lien plus tard et à le retirer.

⌘-clic (Ctrl-clic sous Windows et Linux) sur un lien du canevas l’ouvre, tout comme un clic dans l’aperçu.

## Polices

OpenPencil détecte les polices du système lorsque l’environnement le permet. Si une police manque, son état est signalé et une police de remplacement est utilisée jusqu’à sa disponibilité.

Quand la police est variable, comme Inter, la section Typographie affiche ses axes (graisse, taille optique, chasse et autres) avec la valeur à laquelle chacun est dessiné ; choisir une graisse, une inclinaison ou une famille les ramène à ceux du style. La taille optique affiche **Auto** tant qu’elle suit la taille de police ; une valeur ou **Fixe** dans son menu la fige, et **Auto** la fait suivre à nouveau.

## Polices du document

Déposez un fichier TTF, OTF, WOFF ou WOFF2 sur le canevas pour ajouter sa famille au document lui-même : elle apparaît dans le sélecteur de polices, voyage dans le fichier `.fig` et accompagne les exports web et Storybook. Les polices portées par le document n’exigent ni installation ni fournisseur.

---
title: Outil Plume
description: Dessiner des tracés vectoriels et des courbes de Bézier avec l’outil Plume dans Pairdraw.
---

# Outil Plume

L’outil Plume crée des tracés vectoriels à l’aide du modèle de réseau vectoriel, compatible avec le format `.fig` de Figma.

## Activer l’outil

Appuyez sur <kbd>P</kbd> pour activer l’outil Plume.

## Placer des points

- **Un clic** place un point d’angle (segment droit).
- **Un clic suivi d’un glissement** place un point de courbe avec des poignées tangentes de Bézier : la direction et la longueur du glissement déterminent la forme de la courbe.
  - **Maintenez <kbd>Space</kbd>** pendant le glissement (sans relâcher le bouton de la souris) pour déplacer le point lui-même.

Cliquez plusieurs points pour construire le tracé segment par segment. Une ligne d’aperçu part du dernier point placé et suit le pointeur pendant que vous le déplacez.

## Fermer un tracé

Cliquez sur le **premier point** du tracé pour le fermer en boucle. Les tracés fermés peuvent être remplis.

## Tracés ouverts

Appuyez sur <kbd>Escape</kbd> (ou <kbd>Enter</kbd>) pour valider le tracé actuel comme tracé ouvert. Les tracés ouverts ne s’affichent qu’avec leur contour : ils ne sont pas remplis.

## Continuer un tracé

Sélectionnez un tracé ouvert et activez Plume. Cliquez sur l’une de ses extrémités pour poursuivre depuis celle-ci (voir [Édition vectorielle](./vector-edit#using-the-pen-tool-in-edit-mode)).

## Réseaux vectoriels

Les tracés de Pairdraw utilisent des réseaux vectoriels, un modèle plus souple que de simples listes de points, qui accepte les tracés ramifiés et les topologies complexes. C’est le même modèle que celui de Figma : les tracés font l’aller-retour sans perte dans les fichiers `.fig`.

## Crayon

Appuyez sur <kbd>⇧</kbd><kbd>P</kbd>, ou choisissez Crayon dans le menu de l’outil Plume de la barre d’outils, pour dessiner à main levée. Chaque trait devient son propre calque vectoriel, lissé en courbes que vous pouvez modifier comme n’importe quel autre tracé, et le Crayon reste actif pour le trait suivant.

- Zoomez pour conserver plus de détails : la courbe suit votre trait à quelques pixels d’écran près.
- Maintenez <kbd>Shift</kbd> pour tracer droit, horizontalement ou verticalement, à partir de l’endroit où vous l’avez enfoncée.
- Terminez un trait là où il a commencé pour le fermer en boucle.
- Un trait va dans le cadre qui le contient entièrement, sinon sur la page.
- Les nouveaux traits contrastent avec ce sur quoi ils sont dessinés. Changez le contour du dernier trait dessiné, et le Crayon garde ce style.

## Raccourcis clavier

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Outil Plume | <kbd>P</kbd> | <kbd>P</kbd> |
| Crayon | <kbd>⇧</kbd><kbd>P</kbd> | <kbd>Shift</kbd>+<kbd>P</kbd> |
| Valider un tracé ouvert | <kbd>Escape</kbd> | <kbd>Escape</kbd> |

## Conseils

- La ligne d’aperçu part toujours du dernier point placé : elle ne saute jamais en (0,0).
- Faites un glissement plus long en plaçant un point de courbe pour élargir la courbe.
- Après avoir créé un tracé, réglez son remplissage, son contour et ses effets dans le panneau des propriétés. En [édition vectorielle](./vector-edit), les poignées peuvent être déplacées ensemble ou séparément.

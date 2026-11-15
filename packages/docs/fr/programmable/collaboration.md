---
title: Collaboration
description: Suivre les agents IA sur la zone de travail et modifier ensemble les documents Cloud.
---

# Collaboration

Les salles en direct ne font pas partie de Pairdraw : pour les documents locaux, il n’y a ni fenêtre de partage, ni accès par lien ou identifiant de salle, ni appel vocal, ni nom de collaboration dans les réglages. Pour modifier un document à plusieurs, utilisez [Pairdraw Cloud](/user-guide/pairdraw-cloud#edit-together) sur le serveur Cloud de votre équipe. La couche de présence reste en place, car les agents IA y affichent leur curseur.

## Agents sur la zone de travail

Le chat AI intégré, les chats ACP et Pi harness et chaque client MCP connecté apparaissent sous la forme de curseurs sur les calques qu’ils lisent ou modifient, leur étiquette cerclée affichant une étincelle et un nom de code tel que *Fern*. Pendant que le chat diffuse du JSX, son curseur parcourt les éléments à mesure qu’ils apparaissent et les entoure. Les agents tracent leur curseur et leur contour en violet.

**Affichage → Curseurs multijoueurs** masque et réaffiche les curseurs des agents et des autres personnes sur la zone de travail.

## Suivre les agents

Vos propres agents, le chat IA et les clients MCP comme Claude Code ou Cursor, sont suivis automatiquement pendant qu’ils travaillent, pour garder en vue ce qu’ils modifient. Désactivez-le avec le bouton **Suivre les agents pendant qu’ils travaillent** (en forme de viseur) dans l’en-tête du chat. Si vous arrêtez de suivre un agent pendant qu’il travaille, il n’est plus suivi jusqu’à la fin de son travail, puis l’est de nouveau à sa prochaine exécution.

Votre propre avatar n’apparaît dans la barre supérieure que tant qu’il énumère vos agents. Survolez-le pour voir chaque agent, ce qu’il fait et sur quelle page, puis cliquez sur **Suivre** à côté d’un agent pour garder à l’écran la page et les calques qu’il modifie ; le suivi se poursuit entre ses réponses et s’arrête quand il s’en va. Cliquez sur l’un de vos agents pour le renommer.

## Dans les documents Cloud

Les personnes qui ont ouvert un document Cloud voient les curseurs, les sélections et les agents des autres. Un avatar compte les agents que cette personne utilise, et la barre « Vous suivez … » nomme la personne qui utilise chacun d’eux, ce qui permet de savoir à qui il appartient.

Cliquez sur l’avatar d’une personne dans la barre supérieure pour suivre sa vue. Votre zone de travail se déplace et zoome comme la sienne, et un cadre de sa couleur avec une barre « Vous suivez … » indique qui vous suivez. Cliquez de nouveau sur l’avatar, appuyez sur <kbd>Esc</kbd>, ou cliquez, faites défiler, zoomez ou changez de page vous-même pour arrêter.

## Architecture

Un document Cloud synchronise son état avec Yjs, sous forme de CRDT, via le serveur Cloud, qui fusionne automatiquement les modifications simultanées.

Le déplacement et le réordonnancement des calques fusionnent aussi. Chaque calque retient chaque parent dans lequel il a été déplacé et sa position parmi ses frères, et chaque participant en déduit le même arbre de calques ([le CRDT d’arbre d’Evan Wallace](https://madebyevan.com/algos/crdt-mutable-tree-hierarchy/)). Les déplacements, réordonnancements et nouveaux calques de différentes personnes s’appliquent tous ; si deux personnes déplacent le même calque en même temps, le même déplacement l’emporte chez tous. Lorsque des déplacements simultanés placeraient deux calques l’un dans l’autre, le plus récent est annulé, et un calque dont le nouveau parent a été supprimé entre-temps revient à sa place précédente.

Toutes les personnes qui modifient un document ensemble ont besoin d’une version de Pairdraw qui enregistre l’arbre de calques de la même façon.

## Confidentialité

Pour un agent, seuls son nom, son type, son modèle, son état, sa page, sa position et les calques modifiés sont partagés, jamais les instructions ni les réponses.

---
title: Collaboration
description: Curseurs et mode suivi des agents IA, et modification en direct des documents Cloud via un serveur Pairdraw Cloud auto-hébergé. Les salles pair-à-pair sont désactivées dans les builds Pairdraw.
---

# Collaboration

::: info Les salles pair-à-pair sont désactivées dans Pairdraw
Les builds Pairdraw désactivent les salles pair-à-pair en direct (`COLLABORATION_INCLUDED` dans `src/constants.ts`). Pour les documents locaux, il n’y a ni fenêtre de partage, ni accès par lien ou identifiant de salle, ni appel vocal dans la salle, ni nom de collaboration dans les réglages.

Ce qui reste : les agents IA affichent leur curseur sur la zone de travail et peuvent être suivis, et les documents Cloud sont modifiés en direct par toutes les personnes qui les ouvrent via leur propre [serveur Pairdraw Cloud](/reference/self-hosting-cloud).
:::

## Agents sur la zone de travail

Le chat IA intégré, les chats ACP et Pi harness et chaque client MCP connecté apparaissent sous la forme de curseurs sur les calques qu’ils lisent ou modifient, leur étiquette cerclée affichant une étincelle et un nom de code tel que *Fern*. Pendant que le chat diffuse du JSX, son curseur parcourt les éléments à mesure qu’ils apparaissent et les entoure. Les agents tracent leur curseur et leur contour en violet.

Votre propre avatar n’apparaît dans la barre supérieure que tant qu’il énumère vos agents, ou qu’une autre personne a ouvert le même document Cloud. Un avatar compte les agents que cette personne utilise ; survolez-le pour voir chaque agent, ce qu’il fait et sur quelle page. Cliquez sur l’un de vos propres agents pour le renommer.

**Affichage → Curseurs multijoueurs** (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>\\</kbd>) masque et réaffiche les curseurs des agents et des personnes.

## Mode suivi

Vos propres agents, le chat IA et les clients MCP comme Claude Code ou Cursor, sont suivis automatiquement pendant qu’ils travaillent, pour garder en vue ce qu’ils modifient. Désactivez-le avec le bouton de localisation (en forme de viseur) dans l’en-tête du chat. Si vous arrêtez de suivre un agent pendant qu’il travaille, il n’est plus suivi jusqu’à la fin de son travail, puis l’est de nouveau à sa prochaine exécution.

Cliquez sur **Suivre** à côté d’un agent dans la liste de son avatar pour garder à l’écran la page et les calques qu’il modifie ; le suivi se poursuit entre ses réponses et s’arrête quand il s’en va. Dans un document Cloud, cliquez sur l’avatar d’une personne pour suivre sa vue : votre zone de travail se déplace et zoome comme la sienne, et un cadre de sa couleur avec une barre « Vous suivez … » indique qui vous suivez ; pour un agent, la barre nomme aussi la personne qui l’utilise. Cliquez de nouveau sur l’avatar, appuyez sur <kbd>Esc</kbd>, ou cliquez, faites défiler, zoomez ou changez de page vous-même pour arrêter.

Dans un document Cloud, seuls le nom, le type, le modèle, l’état, la page, la position et les calques modifiés d’un agent sont partagés avec les autres, jamais les instructions ni les réponses.

## Documents Cloud

Ouvrir un document Cloud rejoint sa salle sur le relais de son serveur : toutes les personnes qui l’ont ouvert voient les modifications, curseurs, sélections et commentaires des autres au moment où ils se produisent. **Partager**, sur un document Cloud, ouvre sa boîte de dialogue de partage, où le serveur décide qui peut l’ouvrir : liens de lecture, de commentaire ou de modification, invitations, et liens d’instantané vers une version enregistrée. Consultez [Pairdraw Cloud](/user-guide/pairdraw-cloud) pour le déroulement et [Cloud Architecture](/development/cloud#live-collaboration) pour le relais.

## Fonctionnement de la synchronisation

L’état du document utilise un CRDT (type de données répliqué sans conflit) : les modifications simultanées fusionnent automatiquement, sans conflit.

Le déplacement et le réordonnancement des calques fusionnent aussi. Chaque calque retient chaque parent dans lequel il a été déplacé et sa position parmi ses frères, et chaque participant en déduit le même arbre de calques à partir de cet historique ([le CRDT d’arbre d’Evan Wallace](https://madebyevan.com/algos/crdt-mutable-tree-hierarchy/)). Les déplacements, réordonnancements et nouveaux calques de différentes personnes s’appliquent tous ; si deux personnes déplacent le même calque en même temps, le même déplacement l’emporte chez tous. Lorsque des déplacements simultanés placeraient deux calques l’un dans l’autre, le plus récent est annulé, et un calque dont le nouveau parent a été supprimé entre-temps revient à sa place précédente.

Toutes les personnes qui modifient un document ensemble ont besoin d’une version de Pairdraw qui enregistre l’arbre de calques de la même façon ; des versions qui l’enregistrent différemment ne voient pas les modifications des autres.

## Salles pair-à-pair (absentes des builds Pairdraw)

Le code des salles reste dans `src/app/collab/**`, car les documents Cloud et la présence des agents en dépendent. Un build où `COLLABORATION_INCLUDED` vaut `true` rétablit les salles pair-à-pair : Partager place un document local dans une salle dont le lien (`/rooms/<room-id>` dans le navigateur, `pairdraw://join?room=<room-id>` dans l’application de bureau) peut être ouvert par n’importe qui, les participants se connectent directement en WebRTC via Trystero, et chaque appareil garde sa propre copie de la salle. Pairdraw ne distribue ni ne prend en charge de tels builds.

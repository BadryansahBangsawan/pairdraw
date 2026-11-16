---
title: Colaboración
description: Cursores y modo de seguimiento de los agentes de IA, y edición en directo de documentos de Cloud a través de un servidor Pairdraw Cloud autoalojado. Las salas peer-to-peer están desactivadas en las compilaciones de Pairdraw.
---

# Colaboración

::: info Las salas peer-to-peer están desactivadas en Pairdraw
Las compilaciones de Pairdraw desactivan las salas peer-to-peer en directo (`COLLABORATION_INCLUDED` en `src/constants.ts`). Para los documentos locales no hay menú emergente para compartir, no se puede unir a una sala mediante enlace o identificador, no hay llamada de voz en la sala ni nombre de colaboración en los ajustes.

Lo que se mantiene: los agentes de IA muestran sus cursores en el lienzo y se pueden seguir, y los documentos de Cloud los edita en directo todo el que los abre a través de su propio [servidor Pairdraw Cloud](/reference/self-hosting-cloud).
:::

## Agentes en el lienzo

El chat con AI integrado, los chats de ACP y Pi harness y cada cliente MCP conectado aparecen como cursores sobre las capas que leen o editan, con una etiqueta con contorno que muestra una chispa y un nombre en clave como _Fern_. Mientras el chat transmite JSX, su cursor recorre los elementos a medida que aparecen y los contornea. Los agentes dibujan su cursor y su contorno en violeta.

Tu propio avatar aparece en la barra superior solo mientras enumera tus agentes o mientras otra persona tiene abierto el mismo documento de Cloud. Un avatar cuenta los agentes que ejecuta esa persona; pasa el cursor por encima para ver cada agente, qué hace y en qué página. Haz clic en uno de tus propios agentes para cambiarle el nombre.

**Ver → Cursores multijugador** (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>\\</kbd>) oculta y muestra los cursores de los agentes y de las personas.

## Modo de seguimiento

Tus propios agentes, el chat con AI y clientes MCP como Claude Code o Cursor, se siguen automáticamente mientras trabajan, para mantener a la vista lo que editan. Desactívalo con el botón de localizar en la cabecera del chat. Si dejas de seguir a un agente mientras trabaja, no se vuelve a seguir hasta que termine; en su siguiente ejecución se sigue de nuevo.

Haz clic en **Seguir** junto a un agente en la lista de su avatar para mantener a la vista la página y las capas que edita; el seguimiento continúa entre sus respuestas y termina cuando se va. En un documento de Cloud, haz clic en el avatar de una persona para seguir su vista: tu lienzo se desplaza y amplía para coincidir con la suya, y un marco de su color con una barra «Siguiendo a …» indica a quién sigues. Para dejar de seguir, vuelve a hacer clic en el avatar, pulsa <kbd>Esc</kbd>, o haz clic, desplázate, haz zoom o cambia de página por tu cuenta.

En un documento de Cloud, de un agente solo se comparten con las demás personas su nombre, tipo, modelo, estado, página, posición y capas editadas, nunca los prompts ni las respuestas.

## Documentos de Cloud

Abrir un documento de Cloud lo une a su sala en el relé de su servidor, de modo que todos los que lo tienen abierto ven al momento las ediciones, los cursores, las selecciones y los comentarios de los demás. **Compartir** en un documento de Cloud abre su diálogo para compartir, donde el servidor decide quién puede abrirlo: enlaces para ver, comentar o editar, invitaciones y enlaces de instantánea a una versión guardada. Consulta [Pairdraw Cloud](/user-guide/pairdraw-cloud) para el flujo de trabajo y [Arquitectura de Cloud](/development/cloud#live-collaboration) para el relé.

## Cómo funciona la sincronización

El estado del documento usa un CRDT (tipo de datos replicado sin conflictos), así que las ediciones simultáneas se fusionan automáticamente sin conflictos.

Mover y reordenar capas también se fusiona. Cada capa recuerda cada elemento padre al que se ha movido y su posición entre sus hermanas, y cada participante deduce de ese historial el mismo árbol de capas ([el CRDT de árbol de Evan Wallace](https://madebyevan.com/algos/crdt-mutable-tree-hierarchy/)). Se aplican todos los movimientos, reordenaciones y capas nuevas de distintas personas; si dos personas mueven la misma capa a la vez, gana el mismo movimiento para todos. Cuando movimientos simultáneos meterían dos capas una dentro de la otra, se deshace el posterior, y una capa cuyo nuevo padre se eliminó entretanto vuelve a donde estaba.

Todas las personas que editan un documento juntas necesitan una versión de Pairdraw que registre el árbol de capas de la misma manera; las versiones que lo registran de forma distinta no ven las ediciones de las otras.

## Salas peer-to-peer (no incluidas en las compilaciones de Pairdraw)

El código de las salas se mantiene en `src/app/collab/**`, porque los documentos de Cloud y la presencia de los agentes funcionan sobre él. Una compilación con `COLLABORATION_INCLUDED` fijado en `true` recupera las salas peer-to-peer: Compartir pone un documento local en una sala cuyo enlace (`/rooms/<room-id>` en el navegador, `pairdraw://join?room=<room-id>` en la aplicación de escritorio) puede abrir cualquiera, los participantes se conectan directamente por WebRTC mediante Trystero y cada dispositivo guarda su propia copia de la sala. Pairdraw no distribuye ni da soporte a esas compilaciones.

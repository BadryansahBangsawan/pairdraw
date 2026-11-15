---
title: Colaboración
description: Sigue a los agentes de IA en el lienzo y edita documentos de Cloud entre varias personas.
---

# Colaboración

Las salas en directo no forman parte de Pairdraw: para los documentos locales no hay menú para compartir, no se puede unir a una sala mediante enlace o identificador, no hay llamada de voz en la sala ni nombre de colaboración en los ajustes. Para editar un documento entre varias personas, usa [Pairdraw Cloud](/user-guide/pairdraw-cloud#edit-together) en el servidor de Cloud de tu equipo. La capa de presencia se mantiene, porque los agentes de IA muestran sus cursores a través de ella.

## Agentes en el lienzo

El chat con AI integrado, los chats de ACP y Pi harness y cada cliente MCP conectado aparecen como cursores sobre las capas que leen o editan, con una etiqueta con contorno que muestra una chispa y un nombre en clave como *Fern*. Mientras el chat transmite JSX, su cursor recorre los elementos a medida que aparecen y los contornea. Los agentes dibujan su cursor y su contorno en violeta.

**Ver → Cursores multijugador** oculta y muestra en el lienzo los cursores de los agentes y de otras personas.

## Modo seguimiento

Tus propios agentes, el chat de IA y clientes MCP como Claude Code o Cursor, se siguen automáticamente mientras trabajan, para mantener a la vista lo que editan. Desactívalo con el botón **Seguir a los agentes mientras trabajan** (la mira) en la cabecera del chat. Si dejas de seguir a un agente mientras trabaja, no se vuelve a seguir hasta que termine; en su siguiente ejecución se sigue de nuevo.

Tu propio avatar aparece en la barra superior solo mientras enumera tus agentes. Pasa el cursor por encima para ver cada agente, qué hace y en qué página, y haz clic en **Seguir** junto a un agente para mantener a la vista la página y las capas que edita; el seguimiento continúa entre sus respuestas y termina cuando se va. Haz clic en uno de tus agentes para cambiarle el nombre.

## En documentos de Cloud

Quien tiene abierto un documento de Cloud ve los cursores, las selecciones y los agentes de las demás personas. Un avatar cuenta los agentes que ejecuta esa persona, y la barra «Siguiendo a …» nombra a quien ejecuta cada uno, para que se sepa de quién es. De un agente solo se comparten su nombre, tipo, modelo, estado, página, posición y capas editadas, nunca los prompts ni las respuestas.

Haz clic en el avatar de una persona en la barra superior para seguir su vista. Tu lienzo se desplaza y amplía para coincidir con la suya, y un marco de su color con una barra «Siguiendo a …» indica a quién sigues. Para dejar de seguir, vuelve a hacer clic en el avatar, pulsa <kbd>Esc</kbd>, o haz clic, desplázate, haz zoom o cambia de página por tu cuenta.

## Arquitectura

Un documento de Cloud sincroniza su estado con Yjs, un CRDT, a través del servidor de Cloud, que fusiona automáticamente los cambios simultáneos.

Mover y reordenar capas también se fusiona. Cada capa recuerda cada elemento padre al que se ha movido y su posición entre sus hermanas, y cada participante deduce de ese historial el mismo árbol de capas ([el CRDT de árbol de Evan Wallace](https://madebyevan.com/algos/crdt-mutable-tree-hierarchy/)). Se aplican todos los movimientos, reordenaciones y capas nuevas de distintas personas; si dos personas mueven la misma capa a la vez, gana el mismo movimiento para todos. Cuando movimientos simultáneos meterían dos capas una dentro de la otra, se deshace el posterior, y una capa cuyo nuevo padre se eliminó entretanto vuelve a donde estaba.

Todas las personas que editan un documento juntas necesitan una versión de Pairdraw que registre el árbol de capas de la misma manera.

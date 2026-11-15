---
title: Edición de objetos vectoriales
description: 'Cómo editar la geometría de una ruta vectorial: puntos de anclaje, tiradores de Bézier, modificadores y acciones de la Pluma en el modo de edición.'
---

# Edición de objetos vectoriales

El modo de edición de objetos vectoriales permite cambiar la **geometría** de una curva: la posición de los puntos de anclaje, la forma de los segmentos y los tiradores de Bézier.
En este modo editas la propia ruta, no las transformaciones normales del objeto.

## Entrar en el modo

- Selecciona un objeto vectorial con la herramienta Selección.
- **Haz doble clic en la curva** o pulsa <kbd>Enter</kbd>.

Así se activa la edición de la geometría del vector seleccionado.

## Salir del modo

- Pulsa <kbd>Escape</kbd>.
- Haz clic en una zona libre del lienzo.
- O cambia a otro contexto de edición.

## Qué cambia en este modo

- El cuadro de transformación normal del objeto se desactiva.
- Se puede editar los puntos de anclaje, los segmentos y los tiradores.
- El cursor no cambia a redimensionar o girar en las esquinas del cuadro delimitador de la capa; sí lo hace sobre el cuadro de transformación de los puntos seleccionados (consulta [Transformar los puntos seleccionados](#transform-selected-points)).

## Acciones básicas

### Mover un punto de anclaje

- Arrastra un punto de anclaje.
- Los segmentos conectados y la forma de la ruta se actualizan en vivo en la vista previa.
- Haz clic en un punto para seleccionarlo; usa <kbd>Shift</kbd> para añadir o quitar puntos de la selección.

### Editar un tirador de Bézier

- Arrastra un tirador del punto de anclaje.
- Por defecto, el comportamiento sigue la composición actual de los tiradores del punto.

### Seleccionar y mover un segmento

- Haz clic en un segmento para seleccionarlo. El segmento se vuelve azul y muestra un control en su punto medio; sus puntos de anclaje quedan sin seleccionar.
- <kbd>Shift</kbd> + clic añade un segmento a la selección, o quita uno ya seleccionado.
- Arrastra un segmento para mover los dos puntos de anclaje que une, junto con el resto de la selección.

### Seleccionar con un rectángulo

- Arrastra sobre una zona libre para seleccionar los puntos de anclaje que queden dentro del rectángulo y los segmentos entre ellos.
- <kbd>Shift</kbd> + arrastrar los añade a la selección.

### Seleccionar una región

- Mueve el puntero dentro de una zona rellena: la región bajo él se marca con líneas diagonales.
- Haz clic dentro para seleccionar la región y todos sus puntos; arrastra para moverla.
- <kbd>Shift</kbd> + clic añade la región a la selección.

### Eliminar puntos de anclaje y segmentos

- Pulsa <kbd>Delete</kbd> o <kbd>Backspace</kbd> para eliminar la selección.
- Un punto de anclaje eliminado se lleva sus segmentos.
- Un segmento eliminado solo se lleva los puntos de anclaje que deja sin conexión, así que eliminar el segmento central de una ruta la divide en dos.
- Si eliminas todo, se elimina la capa.

## Cortar, unir y remodelar

| Acción                     | Mac                                       | Windows / Linux                         |
| -------------------------- | ----------------------------------------- | --------------------------------------- |
| Herramienta Cortar         | <kbd>X</kbd>                              | <kbd>X</kbd>                            |
| Punto suave o esquina      | Doble clic en un punto                    | Doble clic en un punto                  |
| Enderezar un segmento      | <kbd>Cmd</kbd> + doble clic               | <kbd>Ctrl</kbd> + doble clic            |
| Curvar un segmento         | <kbd>Cmd</kbd> + arrastrar un segmento    | <kbd>Ctrl</kbd> + arrastrar un segmento |
| Curvar sin mover vecinos   | <kbd>Cmd</kbd> + <kbd>Option</kbd> + arrastrar | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + arrastrar |
| Unir dos extremos          | <kbd>Cmd</kbd> + <kbd>J</kbd>             | <kbd>Ctrl</kbd> + <kbd>J</kbd>          |
| Duplicar puntos            | <kbd>Option</kbd> + arrastrar             | <kbd>Alt</kbd> + arrastrar              |
| Mover puntos               | Flechas                                   | Flechas                                 |

- **Herramienta Cortar:** pulsa <kbd>X</kbd> y haz clic en un segmento para cortarlo en ese lugar, o en un punto para separar los segmentos que se unen en él. Las curvas conservan su forma, y una forma cerrada que se corta deja de rellenarse. <kbd>X</kbd> otra vez, <kbd>Escape</kbd> u otra tecla de herramienta la desactivan.
- **Suave o esquina:** haz doble clic en un punto de esquina para darle tiradores a lo largo de la línea entre sus vecinos, y doble clic en un punto suave para quitarle los tiradores.
- **Enderezar:** <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + doble clic en un segmento curvo quita sus dos tiradores.
- **Unir:** selecciona dos extremos y pulsa <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>J</kbd>. Los puntos en el mismo lugar se convierten en uno; los puntos separados se unen con un segmento recto. Unir los dos extremos de una ruta la cierra y la rellena. Mientras editas una ruta, este atajo une puntos en lugar de abrir el chat.
- **Duplicar:** mantén <kbd>Option</kbd>/<kbd>Alt</kbd> y arrastra puntos o segmentos seleccionados para arrastrar una copia. La copia de un punto aislado queda unida a él, así que el arrastre prolonga la ruta.
- **Desplazar:** las teclas de flecha mueven los puntos seleccionados la distancia de desplazamiento de **Ajustes → Editor**, y <kbd>Shift</kbd> + flecha la distancia grande.
- **Curvar:** <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + arrastrar un segmento lo curva para que el lugar que agarraste siga al puntero. Un extremo suave sigue siendo suave y su otro tirador gira con él. Añade <kbd>Option</kbd>/<kbd>Alt</kbd> para dejar donde están los tiradores de los segmentos vecinos; los extremos pasan entonces a ser esquinas.

## Transformar los puntos seleccionados {#transform-selected-points}

Con dos puntos o segmentos seleccionados, un cuadro de transformación los rodea.

- Arrastra una esquina o un borde para escalar los puntos seleccionados desde el lado opuesto. Mantén <kbd>Shift</kbd> para conservar las proporciones y <kbd>Option</kbd>/<kbd>Alt</kbd> para escalar desde el centro.
- Arrastra justo fuera de una esquina para girarlos alrededor del centro del cuadro. Mantén <kbd>Shift</kbd> para girar en pasos de 15°.
- Los puntos y segmentos bajo el puntero se pueden seguir arrastrando por encima del cuadro, y cada transformación se deshace en un solo paso.

## Modificadores al arrastrar tiradores

| Acción                                 | Mac                           | Windows / Linux              |
| -------------------------------------- | ----------------------------- | ---------------------------- |
| Continuo (suave / continuo)            | <kbd>Cmd</kbd> + arrastrar    | <kbd>Ctrl</kbd> + arrastrar  |
| Esquina (tiradores independientes)     | <kbd>Option</kbd> + arrastrar | <kbd>Alt</kbd> + arrastrar   |
| Bloqueo de dirección (solo longitud)   | <kbd>Shift</kbd> + arrastrar  | <kbd>Shift</kbd> + arrastrar |

### Continuo: <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + arrastrar

- El tirador activo queda limitado a la misma línea que su tirador hermano.
- Solo cambia la longitud del tirador activo.
- Úsalo para transiciones suaves sin romper la esquina.

### Esquina: <kbd>Option</kbd>/<kbd>Alt</kbd> + arrastrar

- El tirador activo se edita de forma independiente.
- El tirador hermano se queda en su sitio.
- Úsalo para crear una transición en esquina marcada.

### Bloqueo de dirección: <kbd>Shift</kbd> + arrastrar

En los puntos de anclaje con composición **continua** o **simétrica**:

- la dirección del tirador queda fijada al valor que tenía **antes de empezar el arrastre actual**;
- el arrastre solo cambia la longitud del tirador (o de los tiradores, según la composición).

## Elegir el tirador al arrastrar un punto de anclaje

Cuando arrastras un punto de anclaje manteniendo <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>, el editor elige el tirador de destino según la **dirección en que el segmento se une** a ese punto (no según la distancia al punto vecino más cercano).
También funciona en puntos de anclaje de redes vectoriales con varias ramas: una vez resuelto, el tirador de destino queda fijo durante el arrastre actual.

## Usar la Pluma en el modo de edición

Con la herramienta Pluma activa:

- **Haz clic en un segmento** para insertar un nuevo punto de anclaje (divide el segmento).
- **Haz clic en un extremo de una ruta abierta** para seguir dibujando desde ese punto; puedes cerrar la forma haciendo clic en el extremo opuesto.
- **<kbd>Option</kbd>/<kbd>Alt</kbd> + clic en un punto de anclaje** lo elimina (cuando la topología lo permite).

Para crear y cerrar rutas, consulta [Pluma](./pen-tool).

## Flujo de trabajo práctico

1. Dibuja una forma con la herramienta Pluma.
2. Haz doble clic en la curva para entrar en el modo de edición de objetos vectoriales.
3. Mueve los puntos de anclaje para afinar la silueta.
4. Arrastra los tiradores:
   - con <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> para transiciones suaves y continuas,
   - con <kbd>Option</kbd>/<kbd>Alt</kbd> para ediciones independientes,
   - con <kbd>Shift</kbd> para cambiar solo la longitud.
5. Pulsa <kbd>Escape</kbd> para salir.

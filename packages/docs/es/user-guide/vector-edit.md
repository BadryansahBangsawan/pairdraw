---
title: Edición vectorial
description: Modificar puntos, tiradores de Bézier y segmentos de una ruta.
---

# Edición vectorial

## Entrar y salir

1. Selecciona un objeto vectorial con la herramienta Selección.
2. Haz doble clic en su curva o pulsa <kbd>Enter</kbd>.
3. Pulsa <kbd>Escape</kbd> para volver a la selección normal.

En este modo, el contorno y los puntos se pueden editar directamente. Las esquinas del cuadro delimitador no redimensionan ni giran el objeto.

## Puntos

Haz clic en un punto para seleccionarlo; usa <kbd>Shift</kbd> para añadir o quitar puntos de la selección. Arrastra para moverlos. Los segmentos conectados se actualizan durante el movimiento.

Pulsa <kbd>Delete</kbd> o <kbd>Backspace</kbd> para eliminar los puntos seleccionados.

## Tiradores de Bézier

| Comportamiento | macOS | Windows / Linux |
|----------------|-------|-----------------|
| Curva continua | <kbd>⌘</kbd> + arrastrar | <kbd>Ctrl</kbd> + arrastrar |
| Esquina, tiradores independientes | <kbd>Option</kbd> + arrastrar | <kbd>Alt</kbd> + arrastrar |
| Mantener dirección y cambiar longitud | <kbd>Shift</kbd> + arrastrar | <kbd>Shift</kbd> + arrastrar |

## Segmentos

Haz clic en un segmento para seleccionarlo. Arrástralo para curvarlo; OpenPencil crea los tiradores necesarios. Haz doble clic para añadir un punto.

## Cortar, unir y remodelar

- <kbd>X</kbd> activa la herramienta Cortar. Haz clic en un segmento para cortarlo en ese lugar, o en un punto para separar los segmentos que se unen en él. <kbd>X</kbd>, <kbd>Escape</kbd> u otra tecla de herramienta la desactivan.
- Haz doble clic en un punto para alternar entre punto suave y esquina.
- <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + doble clic en un segmento quita sus tiradores y lo endereza.
- <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>J</kbd> une dos extremos seleccionados: si están en el mismo lugar se convierten en un punto; si no, se unen con un segmento recto. Unir los dos extremos de una ruta la cierra y la rellena. Mientras editas una ruta, este atajo no abre el chat.
- <kbd>Option</kbd>/<kbd>Alt</kbd> + arrastrar arrastra una copia de los puntos o segmentos seleccionados. La copia de un punto aislado queda unida a él.
- Las teclas de flecha mueven los puntos seleccionados la distancia de Ajustes → Editor, y con <kbd>Shift</kbd> la distancia grande.
- <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + arrastrar un segmento lo curva para que el lugar que agarraste siga al puntero. Un extremo suave sigue siendo suave y su otro tirador gira con él. Con <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Option</kbd>/<kbd>Alt</kbd>, los tiradores de los segmentos vecinos no se mueven y los extremos pasan a ser esquinas.
- Con dos puntos o segmentos seleccionados aparece un cuadro de transformación a su alrededor. Arrastra una esquina o un borde para escalar los puntos desde el lado opuesto; con <kbd>Shift</kbd> se mantienen las proporciones y con <kbd>Option</kbd>/<kbd>Alt</kbd> se escala desde el centro. Arrastra justo fuera de una esquina para girarlos alrededor del centro del cuadro, con <kbd>Shift</kbd> en pasos de 15°. Cada transformación se deshace en un solo paso.

## Continuar rutas abiertas

Selecciona un extremo y usa Pluma para prolongar la ruta. Puedes cerrar la forma haciendo clic en el extremo opuesto.

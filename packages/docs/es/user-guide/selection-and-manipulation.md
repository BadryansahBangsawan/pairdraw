---
title: Seleccionar y transformar
description: Seleccionar, mover, redimensionar, rotar, duplicar y ordenar objetos en OpenPencil.
---

# Seleccionar y transformar

Los objetos seleccionados se pueden mover, redimensionar, rotar, duplicar y cambiar de posición entre las capas.

## Selección

- Un clic en un objeto sustituye la selección actual.
- <kbd>Shift</kbd> + clic añade o elimina un objeto.
- Arrastrar sobre una zona libre del lienzo crea una selección rectangular e incluye los objetos que intersecta.
- <kbd>⌘</kbd> + arrastrar (<kbd>Ctrl</kbd> + arrastrar en Windows y Linux) crea una selección rectangular que elige las capas anidadas más profundas que toca. Empieza donde empieza una selección rectangular normal: en el lienzo vacío o en el fondo vacío de un marco de nivel superior o de una sección. Sobre una capa o el fondo de un marco, componente o instancia anidados, <kbd>⌘</kbd> + arrastrar selecciona esa capa y la mueve. Pulsa o suelta <kbd>⌘</kbd> mientras arrastras para cambiar entre la selección profunda y la normal.
- <kbd>⌘</kbd><kbd>A</kbd> selecciona todos los objetos de la página actual.
- Un clic en una zona libre cancela la selección.

## Mover

- Arrastra un objeto seleccionado.
- Las teclas de flecha desplazan el desplazamiento pequeño, 1 px por defecto.
- <kbd>Shift</kbd> + flechas desplazan el desplazamiento grande, 10 px por defecto.
- Ambas distancias se ajustan en **Ajustes → Editor → Desplazamiento con flechas**.

## Redimensionar

La selección muestra ocho tiradores: cuatro en las esquinas y cuatro en el centro de los lados. Arrastra uno para cambiar la anchura y la altura.

Mantén <kbd>Shift</kbd> al arrastrar un tirador de esquina para conservar las proporciones.

## Herramienta Escalar

Pulsa <kbd>K</kbd>, o elige **Escalar** en el menú de la herramienta Mover, para escalar capas con todo su contenido: tamaños de texto, trazos, efectos, radios de esquina y espaciado de la disposición automática crecen y se reducen con la capa. Arrastra un tirador de la selección para escalar desde el lado opuesto, o mantén pulsada <kbd>Option</kbd>/<kbd>Alt</kbd> para escalar desde el centro; varias capas seleccionadas se escalan juntas alrededor de su contorno común.

Mientras la herramienta Escalar está activa, el panel Diseño muestra el ancho y el alto de la selección, un factor de escala y una cuadrícula de anclaje. Escribir un ancho o un alto escala la selección proporcionalmente; el factor acepta `2`, `2x` o `200%`. La cuadrícula de anclaje elige el punto que se queda en su sitio. Cada escalado es un solo paso de deshacer.

## Rotar

Sitúa el puntero justo fuera de un tirador de esquina hasta que aparezca el cursor de rotación y arrastra. Con <kbd>Shift</kbd>, la rotación se ajusta en pasos de 15°.

## Duplicar

- <kbd>⌥</kbd> o <kbd>Alt</kbd> durante el arrastre crea una copia y la desplaza.
- <kbd>⌘</kbd><kbd>D</kbd> o <kbd>Ctrl</kbd><kbd>D</kbd> duplica en la misma posición.

## Eliminar

Pulsa <kbd>Backspace</kbd> o <kbd>Supr</kbd> para eliminar todos los objetos seleccionados.

## Orden

- **]** adelanta la selección un nivel.
- <kbd>⌘</kbd><kbd>]</kbd> o <kbd>Ctrl</kbd><kbd>]</kbd> la lleva al frente.
- **[** retrasa la selección un nivel.
- <kbd>⌘</kbd><kbd>[</kbd> o <kbd>Ctrl</kbd><kbd>[</kbd> la envía al fondo.

## Visibilidad y bloqueo

- <kbd>⇧</kbd><kbd>⌘</kbd><kbd>H</kbd> cambia la visibilidad.
- <kbd>⇧</kbd><kbd>⌘</kbd><kbd>L</kbd> cambia el bloqueo.

## Atajos

| Acción | macOS | Windows / Linux |
|--------|-------|-----------------|
| Seleccionar todo | <kbd>⌘</kbd><kbd>A</kbd> | <kbd>Ctrl</kbd><kbd>A</kbd> |
| Duplicar | <kbd>⌘</kbd><kbd>D</kbd> | <kbd>Ctrl</kbd><kbd>D</kbd> |
| Duplicar y mover | <kbd>⌥</kbd> + arrastre | <kbd>Alt</kbd> + arrastre |
| Eliminar | <kbd>⌫</kbd>/<kbd>Supr</kbd> | Backspace/<kbd>Supr</kbd> |
| Mover 1 px | Flechas | Flechas |
| Mover 10 px | <kbd>⇧</kbd> + flechas | <kbd>Shift</kbd> + flechas |
| Adelantar un nivel | ] | ] |
| Llevar al frente | <kbd>⌘</kbd><kbd>]</kbd> | <kbd>Ctrl</kbd><kbd>]</kbd> |
| Retrasar un nivel | [ | [ |
| Enviar al fondo | <kbd>⌘</kbd><kbd>[</kbd> | <kbd>Ctrl</kbd><kbd>[</kbd> |
| Visibilidad | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>H</kbd> | <kbd>Shift</kbd><kbd>Ctrl</kbd><kbd>H</kbd> |
| Bloqueo | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>L</kbd> | <kbd>Shift</kbd><kbd>Ctrl</kbd><kbd>L</kbd> |

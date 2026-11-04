---
title: Dibujar formas
description: Crear rectángulos, elipses, líneas, marcos, secciones, polígonos y estrellas.
---

# Dibujar formas

La barra inferior contiene herramientas para crear formas, marcos y secciones. Selecciona una y arrastra sobre el lienzo.

## Herramientas

| Herramienta | Tecla | Resultado |
|-------------|-------|-----------|
| Rectángulo | <kbd>R</kbd> | Rectángulo |
| Elipse | <kbd>O</kbd> | Elipse |
| Línea | <kbd>L</kbd> | Línea |
| Marco | <kbd>F</kbd> | Contenedor de otros objetos |
| Sección | <kbd>Shift</kbd> + <kbd>S</kbd> | Contenedor de nivel superior |

Polígono y Estrella están disponibles en el menú de formas.

## Colocar imágenes

Elige **Archivo › Colocar imagen…** (<kbd>⇧</kbd><kbd>⌘</kbd><kbd>K</kbd>, o <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>K</kbd> en Windows y Linux) o pulsa el botón de imagen de la barra de herramientas y escoge archivos PNG, JPEG, WebP, GIF, AVIF o SVG. Aparecen seleccionados en el centro de la vista, en un solo paso que se puede deshacer; un SVG se convierte en capas editables.

La herramienta **Nota adhesiva** sigue a Texto en la barra de herramientas. No tiene tecla, así que <kbd>N</kbd> sigue haciendo zoom al siguiente marco.

## Mantener proporciones

Con <kbd>Shift</kbd>, el rectángulo se convierte en cuadrado, la elipse en círculo y la línea se ajusta a 0°, 45° y 90°.

## Propiedades

### Relleno

Color sólido, degradado lineal, radial, angular o diamante, imagen y shader: un shader GLSL animado; empieza con la galería del selector de relleno de shader, añade efectos o pega un preajuste copiado de shaders.com.

Para recortar o reencuadrar una imagen en el lienzo, haz doble clic en la capa, pulsa <kbd>Enter</kbd> con ella seleccionada o elige **Recortar imagen** en su menú contextual o en su relleno de imagen. La imagen aparece entera, atenuada fuera de la capa. Arrastra las esquinas o las barras de los bordes de la capa para recortarla sobre la imagen quieta, arrastra la imagen para moverla detrás de la capa y arrastra sus puntos de esquina para escalarla. <kbd>Shift</kbd> mantiene las proporciones o un eje y <kbd>Alt</kbd> trabaja desde el centro. Cada arrastre es un paso que se puede deshacer; <kbd>Enter</kbd>, <kbd>Esc</kbd>, un doble clic o un clic fuera de la imagen termina. Los vectores, las capas con hijos y las capas que coloca el auto layout conservan sus bordes; en ellas solo puedes mover y escalar la imagen.

### Modo shader

El modo shader muestra un relleno de shader solo y en grande, con reproducción y pausa, un deslizador de fase y los ajustes del shader al lado. Ábrelo con **Abrir en modo shader** en el selector de relleno de shader, o con **Ver → Modo shader** mientras la selección tenga un relleno de shader.

### Contorno

Grosor común o por lado, color, alineación interior/central/exterior, extremos, uniones y guiones.

### Radio de esquina

Puede ser común o independiente para rectángulos, marcos, componentes e instancias.

### Efectos

Sombra exterior e interior y desenfoque de capa, fondo o primer plano.

## Marcos y secciones

Un marco es un contenedor. Los objetos arrastrados dentro pasan a ser secundarios. El recorte está desactivado de forma predeterminada. Los marcos admiten [disposición automática](./auto-layout).

Una sección es un contenedor de nivel superior que adopta los objetos superpuestos al dibujarla.

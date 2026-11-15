---
title: Navegación por el lienzo
description: Mover la vista, aplicar zoom, guías de regla, ajuste magnético y medición de distancias en Pairdraw.
---

# Navegación por el lienzo

El lienzo es tu espacio de trabajo infinito. Puedes desplazar la vista y hacer zoom libremente para recorrer tu diseño.

## Desplazar la vista

Mueve la zona visible del lienzo sin modificar ningún objeto.

- <kbd>Space</kbd> + arrastrar: mantén <kbd>Space</kbd> y arrastra en cualquier punto del lienzo.
- **Arrastre con el botón central:** pulsa y arrastra con el botón central del ratón.
- **Dos dedos en el trackpad:** desliza dos dedos sobre el trackpad.
- <kbd>Shift</kbd> + rueda del ratón: desplaza en horizontal.

## Herramienta Mano

Pulsa <kbd>H</kbd> para activar la herramienta Mano y desplazar la vista de forma continua. Mientras esté activa, cualquier arrastre sobre el lienzo desplaza la vista sin mantener <kbd>Space</kbd>. Cambia a otra herramienta (por ejemplo, <kbd>V</kbd> para Selección) para desactivarla.

## Zoom

El zoom acerca y aleja centrado en la posición del puntero.

- <kbd>Ctrl</kbd> + desplazamiento (o <kbd>⌘</kbd> + desplazamiento en Mac): hacia arriba acerca y hacia abajo aleja.
- **Gesto de pellizco:** pellizca en el trackpad para acercar o alejar.
- **Atajos de teclado:** consulta la tabla de abajo.

Con un ratón, activa **Hacer zoom con la rueda** en **Ajustes → Editor → Navegación** para hacer zoom solo con la rueda; <kbd>Shift</kbd> + rueda sigue desplazando en horizontal. **Invertir la dirección del zoom** cambia el sentido de la rueda; el pellizco del trackpad mantiene el suyo.

El pellizco sobre los paneles de la interfaz (capas, propiedades) está bloqueado para que no cambie por accidente el zoom del navegador.

## Herramienta Zoom

Mantén pulsada <kbd>Z</kbd> y haz clic para acercar en el puntero, o haz clic con <kbd>Option</kbd>/<kbd>Alt</kbd> para alejar; arrastra para acercar al área que enmarques. Al soltar <kbd>Z</kbd> vuelves a la herramienta anterior. Una pulsación breve de <kbd>Z</kbd> deja activa la herramienta Zoom, que también aparece en el menú de la herramienta Mano de la barra de herramientas.

Ajustar a la vista, a la selección y al 100 %, los niveles del menú de zoom y el marco siguiente o anterior se deslizan hasta su vista en lugar de saltar. Saltan cuando las animaciones están desactivadas, el modo ultraligero está activo o el sistema pide reducir el movimiento.

## Atajos de teclado

| Acción | Mac | Windows / Linux |
|--------|-----|-----------------|
| Desplazar la vista | <kbd>Space</kbd> + arrastrar | <kbd>Space</kbd> + arrastrar |
| Herramienta Mano | <kbd>H</kbd> | <kbd>H</kbd> |
| Herramienta Zoom | <kbd>Z</kbd> | <kbd>Z</kbd> |
| Acercar | <kbd>⌘</kbd><kbd>+</kbd> | <kbd>Ctrl</kbd> + <kbd>+</kbd> |
| Alejar | <kbd>⌘</kbd><kbd>−</kbd> | <kbd>Ctrl</kbd> + <kbd>−</kbd> |
| Acercar / alejar | <kbd>+</kbd> / <kbd>−</kbd> | <kbd>+</kbd> / <kbd>−</kbd> |
| Zoom al 100 % | <kbd>⇧</kbd><kbd>0</kbd> o <kbd>⌘</kbd><kbd>0</kbd> | <kbd>Shift</kbd> + <kbd>0</kbd> o <kbd>Ctrl</kbd> + <kbd>0</kbd> |
| Ajustar a la vista | <kbd>⇧</kbd><kbd>1</kbd> | <kbd>Shift</kbd> + <kbd>1</kbd> |
| Ajustar a la selección | <kbd>⇧</kbd><kbd>2</kbd> | <kbd>Shift</kbd> + <kbd>2</kbd> |
| Zoom al marco siguiente / anterior | <kbd>N</kbd> / <kbd>⇧</kbd><kbd>N</kbd> | <kbd>N</kbd> / <kbd>Shift</kbd> + <kbd>N</kbd> |
| Página siguiente / anterior | <kbd>Page Down</kbd> / <kbd>Page Up</kbd> | <kbd>Page Down</kbd> / <kbd>Page Up</kbd> |
| Cuadrícula de píxeles | <kbd>⇧</kbd><kbd>'</kbd> | <kbd>Shift</kbd> + <kbd>'</kbd> |
| Ajustar a la cuadrícula de píxeles | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>'</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>'</kbd> |
| Reglas | <kbd>⇧</kbd><kbd>R</kbd> | <kbd>Shift</kbd> + <kbd>R</kbd> |
| Cursores multijugador | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>\\</kbd> | <kbd>Alt</kbd> + <kbd>Ctrl</kbd> + <kbd>\\</kbd> |

## Marcos y páginas

<kbd>N</kbd> selecciona el siguiente marco de primer nivel de la página y hace zoom a él; <kbd>Shift</kbd> + <kbd>N</kbd> vuelve atrás. Cuentan los marcos dentro de secciones, no los ocultos, y el orden va de izquierda a derecha y luego de arriba abajo, y vuelve a empezar al llegar a un extremo. Si hay seleccionada una capa dentro de un marco, el paso empieza desde ese marco.

<kbd>Page Down</kbd> y <kbd>Page Up</kbd> abren la página siguiente y la anterior en el orden del panel de páginas.

## Cuadrícula de píxeles

Con un zoom suficiente para que cada píxel del documento ocupe ocho píxeles de pantalla (800 % en una pantalla estándar, 400 % en una Retina), el lienzo muestra una línea en cada píxel, como en Figma. Actívala o desactívala con **Ver → Cuadrícula de píxeles**, <kbd>Shift</kbd> + <kbd>'</kbd> o **Mostrar cuadrícula de píxeles** en **Ajustes → Editor**; la elección se aplica a todos los documentos abiertos y se conserva entre sesiones.

## Paneles laterales {#side-panels}

El botón del panel de capas está encima de las herramientas, a la izquierda del lienzo, y el del panel de propiedades está en la barra superior. El panel de propiedades aparece al seleccionar una capa y se va con la selección; un panel que abres con su botón se queda abierto hasta que lo cierras, también entre sesiones. El lienzo ocupa el sitio de un panel cerrado, que se vuelve a abrir con el ancho que tenía. **Ver → Panel de capas** y **Ver → Panel de propiedades** hacen lo mismo. <kbd>⌘</kbd><kbd>\\</kbd> (<kbd>Ctrl</kbd> + <kbd>\\</kbd>) sigue ocultando todos los paneles a la vez. La lista de comentarios y el historial de versiones se muestran en el panel de propiedades, así que la herramienta de comentarios y el historial de versiones lo abren mientras los usas y lo vuelven a cerrar después.

## Modo ultraligero

En un ordenador lento o con batería, activa **Modo ultraligero** en **Ajustes → Editor → Renderizado**. Desactiva al momento las animaciones de la interfaz y, tras recargar, renderiza el lienzo en teselas a un píxel de dispositivo por píxel de pantalla, omite los desenfoques de fondo y el ruido, y dibuja las sombras a menor resolución con zoom. El renderizado progresivo sigue activado mientras el modo ultraligero lo esté. Las imágenes exportadas conservan todos los efectos.

## Guías de regla

Las reglas están ocultas hasta que las activas con **Ver → Reglas** o <kbd>Shift</kbd> + <kbd>R</kbd>. Después, arrastra desde la regla superior para crear una guía horizontal o desde la izquierda para una vertical. Suéltala sobre la página para una guía del lienzo, o sobre un marco para una guía en las coordenadas de ese marco.

- Haz clic en una guía para seleccionarla; arrástrala para cambiarla de sitio o pasarla entre la página y un marco.
- Mantén <kbd>Option</kbd> / <kbd>Alt</kbd> mientras arrastras una guía existente para duplicarla.
- Arrastra una guía de vuelta a una regla para eliminarla, o usa la acción **Eliminar guía** de su menú contextual.
- Los cambios en las guías se pueden deshacer y rehacer, y se conservan en los archivos `.fig`.

## Ajuste magnético

En **Ver → Preferencias**, activa **Ajustar a la geometría**, **Ajustar a objetos** y **Ajustar a la cuadrícula de píxeles** de forma independiente. Las preferencias se conservan entre sesiones.

El ajuste a la geometría y a objetos ayuda a alinear los puntos vectoriales, las capas movidas y los bordes redimensionados con la geometría, los objetos, las guías y los bordes de los marcos cercanos. Para esos objetivos aparecen líneas de alineación; el redondeo a la cuadrícula de píxeles no dibuja una línea de alineación por cada píxel.

Con **Ajustar a objetos** activado, una capa movida también se ajusta al espaciado igual: se centra entre sus dos vecinos, o queda a la misma distancia de un vecino que la que hay entre otros dos vecinos de la misma fila o columna. Cada hueco de ese tamaño muestra un indicador rosa con su tamaño. Al redimensionar no se ajusta al espaciado.

Con **Ajustar a la cuadrícula de píxeles** activado, las capas movidas, los bordes redimensionados y las capas dibujadas caen en píxeles enteros a cualquier zoom, aunque empezaran entre píxeles. Un ajuste a un objeto o una guía gana a la cuadrícula. Los movimientos con las flechas y los valores escritos en el panel de propiedades conservan sus fracciones.

Activa **Ajustar a medios píxeles** en **Ajustes → Editor** para que el ajuste a la cuadrícula también caiga en medios píxeles, de modo que un trazo de 1 px pueda quedar centrado en el borde de un píxel. Un tablero conserva su cuadrícula de 16 unidades.

Mantén pulsada <kbd>Control</kbd> durante el arrastre de una capa para omitir temporalmente el ajuste a objetos y píxeles, también en macOS, donde es Control y no Command.

## Medición de distancias

Selecciona una capa, mantén <kbd>Option</kbd> en macOS o <kbd>Alt</kbd> en Windows/Linux y pasa el puntero por otra capa para ver mediciones de distancia temporales. Al soltar la tecla desaparecen; no añaden guías ni cambian el documento.

## Paleta de comandos y páginas

Pulsa <kbd>⌘</kbd><kbd>K</kbd> en macOS o <kbd>Ctrl</kbd> + <kbd>K</kbd> en Windows/Linux para buscar acciones del editor y de la aplicación. Elige un resultado para ejecutarlo; las acciones no disponibles siguen dependiendo de la selección y del estado del documento.

La paleta también permite cambiar de página. Antes de escribir, muestra las páginas que has visitado recientemente en esta pestaña, las más recientes primero, y **Ir a la página…** abre una lista de todas las páginas. Si escribes el nombre de una página, también la encuentra. Las páginas donde trabajan colaboradores o agentes de AI muestran sus nombres; el panel de páginas marca esas mismas páginas con sus colores.

## Consejos

- El zoom siempre apunta a la posición del puntero, así que señala lo que quieras ver más de cerca.
- La herramienta Mano es útil cuando necesitas desplazar la vista a menudo: sigue activa hasta que cambias de herramienta.
- Consulta [Seleccionar y transformar](./selection-and-manipulation) para trabajar con los objetos del lienzo.

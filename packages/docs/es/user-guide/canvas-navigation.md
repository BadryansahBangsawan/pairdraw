---
title: Navegación por el lienzo
description: Mover la vista, aplicar zoom y usar la herramienta Mano.
---

# Navegación por el lienzo

El lienzo no tiene límites. El desplazamiento y el zoom permiten llegar a cualquier zona del documento.

## Desplazar la vista

- Mantén <kbd>Space</kbd> y arrastra sobre el lienzo.
- Arrastra con el botón central del ratón.
- Desliza dos dedos sobre el panel táctil.

## Paleta de comandos y páginas

Pulsa <kbd>⌘</kbd><kbd>K</kbd> en macOS o <kbd>Ctrl</kbd><kbd>K</kbd> en Windows/Linux para buscar acciones del editor y de la aplicación. La paleta también permite cambiar de página. Antes de escribir, muestra las páginas que has visitado recientemente en esta pestaña, las más recientes primero, y **Ir a la página…** abre una lista de todas las páginas. Si escribes el nombre de una página, también la encuentra. Las páginas donde trabajan colaboradores o agentes de AI muestran sus nombres; el panel de páginas marca esas mismas páginas con sus colores.

## Herramienta Mano

Pulsa <kbd>H</kbd>. Mientras esté activa, cualquier arrastre desplaza la vista sin mantener <kbd>Space</kbd>. Pulsa <kbd>V</kbd> para volver a Selección.

## Zoom

El zoom se centra en la posición del puntero. Se puede controlar con <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + desplazamiento, el gesto de pellizco o los atajos.

Con **Hacer zoom con la rueda** en **Ajustes → Editor**, la rueda del ratón amplía sin pulsar ninguna tecla; <kbd>Shift</kbd> + rueda sigue desplazando en horizontal. **Invertir la dirección del zoom** cambia el sentido de la rueda; el pellizco del trackpad mantiene el suyo.

| Acción | macOS | Windows / Linux |
|--------|-------|-----------------|
| 100 % | <kbd>⌘</kbd><kbd>0</kbd> | <kbd>Ctrl</kbd><kbd>0</kbd> |
| Encajar documento | <kbd>⌘</kbd><kbd>1</kbd> | <kbd>Ctrl</kbd><kbd>1</kbd> |
| Ampliar selección | <kbd>⌘</kbd><kbd>2</kbd> | <kbd>Ctrl</kbd><kbd>2</kbd> |

## Herramienta Zoom

Mantén pulsada <kbd>Z</kbd> y haz clic para acercar en el puntero, o haz clic con <kbd>Option</kbd>/<kbd>Alt</kbd> para alejar; arrastra para acercar al área que enmarques. Al soltar <kbd>Z</kbd> vuelves a la herramienta anterior. Una pulsación breve de <kbd>Z</kbd> deja activa la herramienta Zoom, que también aparece en el menú de la herramienta Mano de la barra de herramientas.

Ajustar a la vista, a la selección y al 100 %, los niveles del menú de zoom y el marco siguiente o anterior se deslizan hasta su vista en lugar de saltar. Saltan cuando las animaciones están desactivadas, el modo Ultralight está activo o el sistema pide reducir el movimiento.

## Reglas

Las reglas están ocultas hasta que las activas con **Ver → Reglas** o <kbd>Shift</kbd> + <kbd>R</kbd>.

## Ajuste magnético

En **Ver → Preferencias**, activa **Ajustar a la geometría**, **Ajustar a objetos** y **Ajustar a la cuadrícula de píxeles** de forma independiente. Las preferencias se conservan entre sesiones.

El ajuste a la geometría y a objetos ayuda a alinear los puntos vectoriales, las capas movidas y los bordes redimensionados con la geometría, los objetos, las guías y los bordes de los marcos cercanos. Para esos objetivos aparecen líneas de alineación; el redondeo a la cuadrícula de píxeles no dibuja una línea de alineación por cada píxel.

Con **Ajustar a objetos** activado, una capa movida también se ajusta al espaciado igual: se centra entre sus dos vecinos, o queda a la misma distancia de un vecino que la que hay entre otros dos vecinos de la misma fila o columna. Cada hueco de ese tamaño muestra un indicador rosa con su tamaño. Al redimensionar no se ajusta al espaciado.

Con **Ajustar a la cuadrícula de píxeles** activado, las capas movidas, los bordes redimensionados y las capas dibujadas caen en píxeles enteros a cualquier zoom, aunque empezaran entre píxeles. Un ajuste a un objeto o una guía gana a la cuadrícula. Los movimientos con las flechas y los valores escritos en el panel de propiedades conservan sus fracciones.

Activa **Ajustar a medios píxeles** en **Ajustes → Editor** para que el ajuste a la cuadrícula también caiga en medios píxeles, de modo que un trazo de 1 px pueda quedar centrado en el borde de un píxel. Un tablero conserva su cuadrícula de 16 unidades.

Mantén pulsada <kbd>Control</kbd> durante el arrastre de una capa para omitir temporalmente el ajuste a objetos y píxeles, también en macOS, donde es Control y no Command.

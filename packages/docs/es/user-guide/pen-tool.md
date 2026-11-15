---
title: Pluma
description: Dibujar rutas vectoriales con curvas de Bézier mediante la herramienta Pluma en Pairdraw.
---

# Pluma

La herramienta Pluma crea rutas vectoriales mediante el modelo de datos de red vectorial, compatible con el formato `.fig` de Figma.

## Activar

Pulsa <kbd>P</kbd> para activar la herramienta Pluma.

## Colocar puntos

- **Un clic** crea un punto de esquina (segmento recto).
- **Clic y arrastrar** crea un punto de curva con tiradores tangentes de Bézier: la dirección y la longitud del arrastre controlan la forma de la curva.
  - **Mantén <kbd>Space</kbd>** durante el arrastre (sin soltar el botón del ratón) para mover el propio punto.

Haz clic en varios puntos para construir la ruta segmento a segmento. Mientras mueves el puntero, una línea de vista previa lo conecta con el último punto colocado.

## Cerrar una ruta

Haz clic en el **primer punto** de la ruta para cerrarla en un bucle. Las rutas cerradas se pueden rellenar.

## Rutas abiertas

Pulsa <kbd>Escape</kbd> (o <kbd>Enter</kbd>) para terminar la ruta actual como ruta abierta. Las rutas abiertas solo se dibujan como trazo; no se rellenan.

## Continuar una ruta

Selecciona una ruta abierta y activa Pluma. Haz clic en uno de sus extremos para seguir dibujando desde él.

## Redes vectoriales

Las rutas de Pairdraw usan redes vectoriales, un modelo más flexible que las simples listas de puntos que admite rutas ramificadas y topologías complejas. Es el mismo modelo que usa Figma, así que las rutas se conservan intactas en los archivos `.fig`.

Al arrastrar un punto aparecen dos tiradores opuestos que generan una curva suave. Durante la [edición vectorial](./vector-edit) puedes moverlos juntos o separarlos.

## Lápiz

Pulsa <kbd>⇧</kbd><kbd>P</kbd>, o elige **Lápiz** en el menú de la herramienta Pluma de la barra de herramientas, para dibujar a mano alzada. Cada trazo se convierte en su propia capa vectorial, suavizada en curvas que puedes editar como cualquier otra ruta, y el lápiz sigue activo para el siguiente trazo.

- Acerca el zoom para conservar más detalle: la curva sigue tu trazo con un margen de pocos píxeles de pantalla.
- Mantén <kbd>Shift</kbd> para dibujar en línea recta, horizontal o vertical, desde donde la pulsaste.
- Termina un trazo donde empezó para cerrarlo en un bucle.
- Un trazo entra en el marco que lo contiene por completo; si no, va a la página.
- Los trazos nuevos contrastan con lo que hay debajo. Si cambias el trazo del último que dibujaste, el lápiz conserva ese estilo.

## Atajos de teclado

| Acción | Mac | Windows / Linux |
|--------|-----|-----------------|
| Herramienta Pluma | <kbd>P</kbd> | <kbd>P</kbd> |
| Lápiz | <kbd>⇧</kbd><kbd>P</kbd> | <kbd>Shift</kbd>+<kbd>P</kbd> |
| Terminar la ruta abierta | <kbd>Escape</kbd> | <kbd>Escape</kbd> |

## Consejos

- La línea de vista previa siempre empieza en el último punto colocado; no salta a (0,0).
- Arrastra más al colocar un punto de curva para que la curva sea más amplia.
- Después de crear una ruta, ajusta su relleno, trazo y efectos en el panel de propiedades.

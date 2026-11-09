---
title: Edición de texto
description: Crear texto, seleccionar caracteres y aplicar formato tipográfico.
---

# Edición de texto

## Crear texto

Pulsa <kbd>T</kbd> y haz clic en el lienzo. Aparece un objeto vacío con el cursor de inserción listo para escribir.

## Editar

Haz doble clic en un objeto de texto. Un contorno azul indica el modo de edición. Haz clic fuera para guardar y salir.

El texto se dibuja directamente en el lienzo; no aparece un campo superpuesto independiente.

## Selección

- Un clic sitúa el cursor de inserción.
- Arrastrar selecciona un intervalo.
- Doble clic selecciona una palabra.
- Triple clic selecciona todo el texto.
- <kbd>Shift</kbd> amplía la selección.

Las flechas mueven el cursor. <kbd>Option</kbd>/<kbd>Ctrl</kbd> salta por palabras; <kbd>Shift</kbd> conserva y amplía la selección.

## Formato

El panel de propiedades permite cambiar familia, estilo, tamaño, interlineado, espaciado entre letras y alineación. Negrita, cursiva, subrayado y tachado pueden aplicarse a un intervalo sin alterar el resto.

Los estilos parciales se guardan como intervalos y participan en deshacer y rehacer.

## Enlaces

El texto puede enlazar a una página web o a una dirección de correo, en el texto entero o en los caracteres seleccionados. Con la capa seleccionada, elige **Añadir enlace** en la sección Tipografía del panel de propiedades, en **Texto → Añadir enlace** en la barra de menús o en el menú contextual del lienzo. El editor de enlaces se abre bajo el texto: escribe una dirección — un dominio sin más o `nombre@host` gana su `https://` o `mailto:` — y pulsa <kbd>Enter</kbd> para aplicarlo, o <kbd>Escape</kbd> para cerrar sin cambios. El editor también edita el enlace más adelante y lo elimina.

⌘-clic (Ctrl-clic en Windows y Linux) sobre un enlace en el lienzo lo abre, igual que hacer clic en él en la vista previa.

## Fuentes

Pairdraw detecta fuentes del sistema cuando el entorno lo permite. Si falta una fuente, muestra su estado y usa una alternativa hasta que esté disponible.

Cuando la fuente es variable, como Inter, la sección Tipografía muestra sus ejes (grosor, tamaño óptico, anchura y otros) con el valor con que se dibuja cada uno; elegir un grosor, una inclinación o una familia los devuelve a los del estilo. El tamaño óptico muestra **Auto** mientras sigue al tamaño de fuente; un valor o **Fijo** en su menú lo fija, y **Auto** hace que vuelva a seguirlo.

## Fuentes del documento

Suelta un archivo TTF, OTF, WOFF o WOFF2 sobre el lienzo para añadir su familia al propio documento: aparece en el selector de fuentes, viaja dentro del archivo `.fig` y se incluye en las exportaciones web y de Storybook. Las fuentes que lleva el documento no necesitan instalación ni proveedor.

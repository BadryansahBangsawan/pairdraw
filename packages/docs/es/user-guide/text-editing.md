---
title: Edición de texto
description: Crear y editar texto con formato enriquecido, fuentes y edición directa en Pairdraw.
---

# Edición de texto

Crea objetos de texto y edítalos directamente en el lienzo con soporte completo de texto enriquecido.

## Crear texto

Pulsa <kbd>T</kbd> para activar la herramienta Texto y haz clic en el lienzo. Aparece un objeto de texto vacío con el cursor parpadeando: empieza a escribir enseguida.

## Edición directa

Haz doble clic en un objeto de texto existente para entrar en el modo de edición. Un contorno azul alrededor del texto indica el modo de edición. Haz clic fuera del objeto de texto para guardar y salir.

El texto se dibuja directamente en el lienzo; no aparece un campo superpuesto independiente.

## Mover el cursor

| Acción | Mac | Windows / Linux |
|--------|-----|-----------------|
| Izquierda/derecha | <kbd>←</kbd> / <kbd>→</kbd> | <kbd>←</kbd> / <kbd>→</kbd> |
| Arriba/abajo | <kbd>↑</kbd> / <kbd>↓</kbd> | <kbd>↑</kbd> / <kbd>↓</kbd> |
| Por palabras | <kbd>⌥</kbd><kbd>←</kbd> / <kbd>⌥</kbd><kbd>→</kbd> | <kbd>Ctrl</kbd> + <kbd>←</kbd> / <kbd>Ctrl</kbd> + <kbd>→</kbd> |
| Inicio/final de línea | <kbd>⌘</kbd><kbd>←</kbd> / <kbd>⌘</kbd><kbd>→</kbd> | <kbd>Home</kbd> / <kbd>End</kbd> |

Mantén <kbd>Shift</kbd> con cualquier tecla de movimiento para ampliar la selección.

## Seleccionar texto

- **Un clic** dentro de un objeto de texto sitúa el cursor.
- **Clic y arrastrar** selecciona un intervalo de texto.
- **Doble clic** en una palabra la selecciona.
- **Triple clic** selecciona todo el texto del objeto.

## Formato de texto enriquecido

Aplica formato al texto seleccionado o, si no hay nada seleccionado, cambia el estilo de todo el objeto.

| Acción | Mac | Windows / Linux |
|--------|-----|-----------------|
| Negrita | <kbd>⌘</kbd><kbd>B</kbd> | <kbd>Ctrl</kbd> + <kbd>B</kbd> |
| Cursiva | <kbd>⌘</kbd><kbd>I</kbd> | <kbd>Ctrl</kbd> + <kbd>I</kbd> |
| Subrayado | <kbd>⌘</kbd><kbd>U</kbd> | <kbd>Ctrl</kbd> + <kbd>U</kbd> |

El tachado se aplica con el botón **S** de la sección **Tipografía** del panel de propiedades (no tiene atajo de teclado: <kbd>⌘</kbd><kbd>S</kbd> es Guardar).

El formato se aplica por carácter. Si escribes entre un tramo en negrita y otro normal, el texto nuevo hereda el estilo del tramo anterior.

Los botones **B / I / U / S** de la sección **Tipografía** del panel de propiedades también aplican formato. Los estilos parciales se guardan como intervalos y participan en deshacer y rehacer.

## Enlaces

El texto puede enlazar a una página web o a una dirección de correo, en el texto entero o en los caracteres seleccionados. Con la capa seleccionada, elige **Añadir enlace** en la sección **Tipografía** del panel de propiedades, en **Texto → Añadir enlace** en la barra de menús o en el menú contextual del lienzo. El editor de enlaces se abre bajo el texto: escribe una dirección — un dominio sin más o `nombre@host` gana su `https://` o `mailto:` — y pulsa <kbd>Enter</kbd> para aplicarlo, o <kbd>Escape</kbd> para cerrar sin cambios. El editor también edita el enlace más adelante y lo elimina.

⌘-clic (Ctrl-clic en Windows y Linux) sobre un enlace en el lienzo lo abre, igual que hacer clic en él en la **Vista previa**.

## Operaciones de edición

| Acción | Mac | Windows / Linux |
|--------|-----|-----------------|
| Borrar la palabra anterior al cursor | <kbd>⌥</kbd><kbd>⌫</kbd> | <kbd>Ctrl</kbd> + <kbd>Backspace</kbd> |
| Borrar hasta el inicio de la línea | <kbd>⌘</kbd><kbd>⌫</kbd> | — |
| Cortar | <kbd>⌘</kbd><kbd>X</kbd> | <kbd>Ctrl</kbd> + <kbd>X</kbd> |
| Copiar | <kbd>⌘</kbd><kbd>C</kbd> | <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Pegar | <kbd>⌘</kbd><kbd>V</kbd> | <kbd>Ctrl</kbd> + <kbd>V</kbd> |

## Selector de fuentes

Abre el selector de fuentes en la sección **Tipografía** del panel de propiedades para cambiar la familia tipográfica. El selector ofrece:

- **Filtro de búsqueda:** escribe para acotar la lista de fuentes.
- **Vista previa:** cada nombre de fuente se dibuja con su propia tipografía.
- **Desplazamiento virtual:** maneja con eficiencia listas de fuentes grandes.
- **Desplazamiento a la actual:** la fuente actual aparece resaltada al abrir el selector.

## Variables de familia tipográfica

Una familia tipográfica puede venir de una variable de texto. En la sección **Tipografía**, elige **Aplicar variable a la familia tipográfica** junto a la familia y escoge una variable cuyo valor sea el nombre de una familia. El texto sigue entonces a la variable: cambiar el modo de la variable o su valor cambia la familia, y el editor carga las fuentes de la nueva familia. Elegir una fuente en el selector desvincula la variable y aplica esa fuente directamente.

## Texto sobre una ruta

Las capas de texto sobre ruta importadas de Figma conservan la disposición curva de sus glifos. Puedes editar su texto y su tipografía, redimensionarlas y seleccionarlas, y guardar o exportar el resultado conservando la disposición sobre la ruta. Se trata de soporte para capas de texto sobre ruta ya importadas, no de una herramienta de dibujo para colocar cualquier texto sobre una ruta nueva.

## Peso de la fuente

Cambia el peso de la fuente en la sección **Tipografía** del panel de propiedades. Los pesos disponibles dependen de la familia elegida (por ejemplo, Regular, Medium, Bold, Black).

## Fuentes variables

Cuando la fuente del texto es variable, como Inter, la sección **Tipografía** muestra sus ejes (peso, tamaño óptico, anchura y otros que tenga la fuente) con el valor con que se dibuja cada uno. Escribe o arrastra un valor para fijarlo; elegir un peso, una inclinación o una familia devuelve los ejes a los del estilo. El tamaño óptico muestra **Auto** mientras sigue al tamaño de fuente; escribe un valor o elige **Fijo** en su menú para fijarlo, y **Auto** para que vuelva a seguir el tamaño.

## Origen de las fuentes

- **Fuente predeterminada:** Inter se carga automáticamente.
- **Aplicación de escritorio:** fuentes del sistema más los catálogos activados de Google Fonts, Fontsource, Bunny Fonts y Fontshare.
- **Navegador:** las fuentes del sistema están disponibles en Chrome y Edge con el permiso de fuentes locales. Los proveedores activados de Fontsource, Bunny Fonts y Fontshare pueden cargar fuentes en línea, sujetos al acceso a la red y a las reglas CORS del navegador; Google Fonts está desactivado en la aplicación web de Pairdraw.
- **Fuentes descargadas:** la aplicación de escritorio guarda en caché las fuentes descargadas para reutilizarlas en el mismo equipo.

Permite el acceso a las fuentes del sistema y elige los proveedores en línea en **Ajustes › Fuentes**, que se abre con el engranaje junto a la familia tipográfica; en la aplicación de escritorio también gestiona las fuentes descargadas y los paquetes de respaldo.

## Fuentes del documento

Suelta un archivo TTF, OTF, WOFF o WOFF2 sobre el lienzo para añadir su familia al propio documento: aparece en el selector de fuentes, viaja dentro del archivo `.fig` y se incluye en las exportaciones web y de Storybook. Las fuentes que lleva el documento no necesitan instalación ni proveedor.

## Fuentes que faltan y sustituciones

Cuando una familia o un estilo solicitado no se puede cargar, Pairdraw muestra un aviso encima del editor en lugar de tratar en silencio el renderizado alternativo como si fuera la tipografía fiel.

Despliega el aviso para ver cada fuente afectada y su sustituta activa. Usa **Seleccionar capas** para localizar todos los objetos de texto afectados, o **Reintentar fuentes** después de cambiar el acceso a la red, el permiso de fuentes locales o los ajustes de los proveedores. Un estilo puede sintetizarse a partir de otra fuente cargada de la misma familia; una familia que falta recurre a Inter cuando está disponible.

## Consejos

- La lista de fuentes se precarga al arrancar para que el selector se abra sin espera.
- La entrada por IME (chino, japonés, coreano) está totalmente admitida.
- El formato de texto enriquecido se conserva al abrir y guardar archivos `.fig`.
- Consulta [Componentes](./components) para ver cómo funcionan las sustituciones de texto en las instancias.

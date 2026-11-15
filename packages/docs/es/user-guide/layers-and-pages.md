---
title: Capas y páginas
description: Gestionar las capas, las páginas y el panel de propiedades en Pairdraw.
---

# Capas y páginas

El editor se abre solo con el lienzo. Las herramientas están a la izquierda del lienzo, con el botón del panel de capas encima, y el zoom en la esquina inferior derecha. El panel de capas se abre a la izquierda, el de propiedades a la derecha y el chat con AI en una columna a su lado; todos se redimensionan arrastrando sus bordes. Consulta [Paneles laterales](./canvas-navigation#side-panels) para saber cuándo aparece cada panel.

Mientras el chat con AI está cerrado, una instrucción en la parte inferior del lienzo envía lo que escribes al chat; desactívala con **Instrucción en el lienzo** en **Ajustes → Modelos → Chat**. <kbd>Escape</kbd> en la instrucción vuelve al lienzo.

## Panel de capas

El panel de capas, a la izquierda, muestra la jerarquía del documento como un árbol.

### Vista de árbol

Los objetos aparecen en un árbol plegable. Haz clic en la flecha junto a un marco, grupo o componente para desplegar o plegar sus hijos.

### Reordenar arrastrando

Arrastra las capas para cambiar su orden o su contenedor. Los objetos más arriba en la lista se dibujan encima.

### Visibilidad y bloqueo

Haz clic en el icono del ojo junto a una capa para ocultarla o mostrarla en el lienzo. Los objetos ocultos siguen en el árbol. Usa el candado para impedir cambios accidentales.

### Renombrar

Haz doble clic en el nombre de una capa para renombrarla en el sitio. Pulsa <kbd>Enter</kbd> o haz clic fuera para confirmar, o <kbd>Escape</kbd> para cancelar.

### Selección sincronizada

Al hacer clic en una capa del panel se selecciona el objeto correspondiente en el lienzo, y viceversa. <kbd>Shift</kbd> permite seleccionar varias capas.

### Buscar capas {#find-layers}

Pulsa <kbd>⌘</kbd><kbd>F</kbd> (<kbd>Ctrl</kbd> + <kbd>F</kbd>), elige **Editar → Buscar capas…** o ejecútalo desde la paleta de comandos para buscar por nombre entre las capas de la página mostrada. Al elegir un resultado se selecciona esa capa y se lleva a la vista.

## Panel de páginas

El panel de páginas muestra todas las páginas del documento.

- **Cambiar de página:** haz clic en una página para activarla. El lienzo cambia a esa página y restaura la posición de su vista.
- **Añadir página:** pulsa el botón de añadir para crear una página nueva.
- **Eliminar página:** elimina la página actual.
- **Renombrar página:** haz doble clic en el nombre de la página para editarlo en el sitio. Pulsar <kbd>Enter</kbd> o <kbd>Escape</kbd>, o hacer clic fuera, confirma el cambio de nombre.

Cada página tiene su propio lienzo y estado de vista. El menú contextual mueve la selección a otra página.

## Panel de diapositivas

El panel de diapositivas lista los marcos del nivel superior de la página como miniaturas numeradas, en orden de capas. Haz clic en una diapositiva para mostrar su marco en el lienzo y arrastra una diapositiva — o pulsa <kbd>Alt</kbd> con una flecha arriba o abajo — para reordenarla. **Exportar diapositivas a PDF** escribe todas las diapositivas, en orden, en un único archivo PDF.

## Modo presentación

**Presentar** muestra las diapositivas de la página a pantalla completa, de una en una. Inícialo con <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Enter</kbd>, **Ver → Presentar** o el botón **Presentar** de la barra superior. Las flechas, <kbd>Space</kbd>, <kbd>Enter</kbd>, <kbd>Page Up</kbd>/<kbd>Page Down</kbd> y la rueda del ratón avanzan por las diapositivas; <kbd>Escape</kbd> sale y devuelve el lienzo y el foco del teclado a donde estaban. Una diapositiva más alta que la pantalla se muestra al 100 % y puede desplazarse.

## Documentos y recuperación

**Inicio** empieza con una instrucción: elige encima qué crear (página de destino, app móvil, app web, diapositivas, panel u otra cosa), descríbelo y Pairdraw abre un nuevo diseño y envía la instrucción a su chat con AI junto con una guía para ese tipo; las instrucciones de ejemplo de debajo la rellenan con una idea que puedes editar. Debajo de la instrucción puedes empezar desde un archivo de Figma, desde una página del navegador integrado (aplicación de escritorio) o desde una captura que el agente recrea. Las pestañas cambian entre **Recientes**, **Borradores** y **Sistemas de diseño**, y el menú junto a ellas lista los lugares que añaden tu servidor de Cloud y tu bucket de almacenamiento. Un campo de búsqueda filtra la lista, **Abrir…** abre un archivo y **Diseño** empieza un diseño vacío.

**Recientes** lista los documentos locales recientes. Usa la vista de cuadrícula o de lista y ordena los archivos recientes por **Nombre**, **Último uso** o **Creación**. <kbd>⌘</kbd>/<kbd>Ctrl</kbd>-clic añade un archivo a la selección, <kbd>Shift</kbd>-clic selecciona un intervalo y <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>A</kbd> selecciona todos los archivos de la lista; la barra de selección los abre después en pestañas del editor separadas, los quita de Recientes o borra los documentos almacenados. El menú <kbd>⋯</kbd> de un archivo o su menú contextual ofrece **Quitar de Recientes**, que olvida el archivo sin borrarlo, y **Guardar como…**, que guarda una copia en otro lugar. **Sistemas de diseño** lista Pairdraw Basics, incluida en la aplicación, y las bibliotecas de componentes que has publicado, igual que **Extras**; elegir una abre un nuevo diseño con esa biblioteca activada en el panel **Recursos**.

Un diseño nuevo se conserva como borrador en este dispositivo mientras trabajas en él: cada cambio se escribe poco después de hacerlo, así que cerrar su pestaña no pregunta nada. **Borradores** en Inicio los lista con una vista previa; abre uno para continuar, o elige **Eliminar borrador** en su menú <kbd>⋯</kbd> o contextual para eliminarlo para siempre. Guardar un borrador en un archivo o en un almacenamiento, en el editor o con **Guardar como…** en Inicio, lo saca de Borradores. Los borradores viven solo en este perfil de navegador o instalación de escritorio y necesitan tener **Conservar automáticamente el trabajo no guardado** activado y un navegador que conserve los datos del sitio.

En **Ajustes → General → Recuperación**, **Conservar automáticamente el trabajo no guardado** controla los borradores y las copias de recuperación locales. Con la recuperación activada, los documentos sin guardar sin ruta de archivo siguen siendo recuperables incluso después de cerrar sus pestañas. Cuando Pairdraw ofrece **Recuperar trabajo no guardado**, elige **Restaurar** para volver a abrir un documento o **Descartar** para eliminar su copia de recuperación.

Un archivo que abriste también guarda una copia de seguridad de los cambios que aún no se han guardado con él, escrita mientras el autoguardado está desactivado o cuando la ventana se cierra antes de que el autoguardado los escriba. La próxima vez que ese archivo se abra, **Cambios recuperados** ofrece **Guardar** para escribirlos en el archivo, **Guardar como…** para abrirlos aparte y guardarlos como un archivo nuevo, o **No guardar** para dejar el archivo como está y descartar la copia. Cerrar el diálogo conserva la copia para la próxima vez. Guardar el archivo descarta sus copias más antiguas, y en el navegador no se ofrece una copia más antigua que el último cambio del archivo. Una copia cuyo archivo no se ha abierto durante una semana, por ejemplo porque el archivo se movió, también aparece en **Recuperar trabajo no guardado**.

Desactivar la recuperación detiene la conservación automática y elimina las copias de recuperación de los documentos actualmente abiertos. No borra en bloque las instantáneas de documentos cerrados anteriormente. La recuperación es local de esta instalación o perfil de navegador; no sustituye a guardar un archivo, a la sincronización en la nube ni a una copia de seguridad.

## Extras {#goodies}

El botón del regalo de la barra superior, **Objeto → Extras…** o la paleta de comandos abren **Extras**, una colección de puntos de partida: estilos para fijar en el chat con AI, los sistemas de diseño que puedes activar, scripts que llegan al lienzo como [capas de script](/user-guide/script-layers) y los shaders de la galería, que rellenan las capas seleccionadas o un rectángulo nuevo.

## Panel de propiedades

El panel de propiedades, a la derecha, cambia entre **Diseño** y **Código**, con [Revisar](/user-guide/checking-designs) como pestaña de icono a su lado. El chat con AI se abre en su propia columna junto a él.

### Pestaña Diseño

Muestra las propiedades de los objetos seleccionados, organizadas en secciones:

- **Apariencia:** opacidad, radio de esquina (con el botón de esquinas independientes) y visibilidad.
- **Relleno:** color sólido, degradados (lineal, radial, angular, diamante), rellenos de imagen y enlaces a variables.
- **Trazo:** color, grosor, extremos, uniones y guiones.
- **Efectos:** sombra exterior, sombra interior, desenfoque de capa, desenfoque de fondo y desenfoque de primer plano.
- **Tipografía:** familia, tamaño, peso y botones de formato B/I/U/S (visible en objetos de texto).
- **Diseño:** controles de [disposición automática](./auto-layout) (visible en marcos con disposición automática).
- **Exportar:** escala, formato y botón de exportación (consulta [Exportar](./exporting)).

Sin ningún objeto seleccionado, la pestaña Diseño muestra las propiedades de la página, incluido el color de fondo del lienzo, y sus variables.

### Pestaña Código

Muestra la selección como código con resaltado de sintaxis, números de línea y un botón de copiar. Elige la salida:

- **Design JSX**: el árbol de componentes de Pairdraw, que `renderJSX()` vuelve a leer; edítalo en vivo y las capas lo siguen.
- **HTML**: marcado con CSS simple o clases de Tailwind.
- **Vue** y **React**: componentes para la selección, con CSS o Tailwind.

Mientras la pestaña Código está abierta, también subraya los errores y avisos de la revisión de diseño en el código de sus capas ([Revisar diseños](/user-guide/checking-designs#in-the-code-panel)).

## Columna del chat con AI

El [chat con AI](/es/programmable/ai-chat) crea y cambia elementos de diseño a partir de peticiones en lenguaje natural. Se abre en una columna propia a la derecha del panel de propiedades, de modo que la pestaña Diseño sigue a la vista mientras trabaja un agente. Ábrelo y ciérralo con el botón de destellos entre las acciones del documento de la barra superior o con <kbd>⌘</kbd><kbd>J</kbd>; arrastra su borde para redimensionarlo. La columna se queda abierta o cerrada, con el ancho que le dejaste, entre recargas. Configura modelos reutilizables y conexiones con proveedores en Ajustes, y consulta las conversaciones guardadas localmente en el menú de historial del chat.

## Atajos de teclado

| Acción | Mac | Windows / Linux |
|--------|-----|-----------------|
| Abrir o cerrar la columna del chat con AI | <kbd>⌘</kbd><kbd>J</kbd> | <kbd>Ctrl</kbd> + <kbd>J</kbd> |
| Buscar capas | <kbd>⌘</kbd><kbd>F</kbd> | <kbd>Ctrl</kbd> + <kbd>F</kbd> |

## Disposición en móviles

En móviles y pantallas pequeñas, los paneles laterales se sustituyen por un cajón inferior que se desliza. Las pestañas de la parte superior del cajón cambian entre las vistas Capas, Propiedades, Diseño, Código y AI. La barra de herramientas se reduce a una tira horizontal compacta con cambio de categoría.

## Consejos

- El ancho de los paneles, incluido el de la columna del chat con AI, se guarda automáticamente y se conserva entre recargas.
- Usa el panel de capas para encontrar objetos solapados difíciles de seleccionar en el lienzo.
- El [menú contextual](./context-menu) ofrece acciones adicionales para los objetos seleccionados.
- Consulta [Seleccionar y transformar](./selection-and-manipulation) para los atajos de orden (]/[) y los de visibilidad y bloqueo.

---
title: Componentes
description: Crear componentes reutilizables, instancias, conjuntos de componentes, sustituciones y sincronización en vivo en Pairdraw.
---

# Componentes

Los componentes son elementos de diseño reutilizables. Edita el componente principal y todas sus instancias se actualizan automáticamente.

## Explorar componentes

Abre la pestaña **Recursos** del panel izquierdo para explorar los componentes locales y las bibliotecas habilitadas. Usa la vista de cuadrícula o de lista, busca por nombre de componente y selecciona un componente para ver sus detalles. Inserta un recurso con un clic, pulsando <kbd>Enter</kbd> o arrastrándolo al lienzo.

Los recursos locales se agrupan por la página de origen. Los recursos de bibliotecas publicadas siguen disponibles cuando su revisión se ha descargado, también cuando el proveedor remoto está temporalmente sin conexión.

## Crear un componente

Selecciona un marco o grupo y pulsa <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd>). La selección se convierte en un componente reutilizable.

Cualquier otra capa, o varias capas, se envuelve en un nuevo componente blanco del tamaño de su contorno común, en el lugar de la capa superior dentro de la lista de capas; si se envuelve una sola capa, esta da su nombre al componente.

Los componentes muestran encima una etiqueta morada con un icono de rombo.

## Conjuntos de componentes y variantes

Selecciona dos o más componentes y elige **Crear conjunto de componentes** en el menú contextual para combinarlos en un conjunto de componentes: un contenedor con borde morado discontinuo y 20 px de relleno alrededor de sus hijos, como en Figma. Los conjuntos creados por scripts con `figma.combineAsVariants()` envuelven sus componentes exactamente, como hace la API de plugins de Figma.

Cada componente de un conjunto puede definir valores en varias dimensiones de variante, como `Size=Small`, `State=Hover` y `Theme=Dark`. Pairdraw admite combinaciones dispersas, así que un conjunto no necesita todas las combinaciones posibles. La variante de arriba a la izquierda es la predeterminada y se usa como alternativa cuando una actualización ya no contiene una combinación exacta.

Selecciona un componente y pulsa **Agregar variante** en la cabecera del panel para convertirlo en un conjunto de componentes, como hace Figma: el componente pasa a ser `Property 1=Default` y debajo aparece una copia llamada `Property 1=Variant2`. En un conjunto, **Agregar variante** copia su última variante con el valor siguiente. Las propiedades de variante del conjunto son filas de su lista **Propiedades**; haz clic en una para renombrarla o para añadir, renombrar, reordenar arrastrando o eliminar sus valores. Al eliminar un valor que usan algunas variantes, estas pasan primero a otro valor, y las variantes que comparten todos sus valores se nombran en un aviso que las selecciona.

## Propiedades de componente

Los componentes y conjuntos de componentes admiten propiedades reutilizables de texto, visibilidad booleana, intercambio de instancia y slot. Selecciona una instancia para editar sus valores sin separarla. Las propiedades y sus valores se conservan al guardar y volver a abrir archivos `.fig`.

Para vincular una capa de un componente principal a una propiedad, usa el botón de vínculo junto a su campo: **Tipografía** para el contenido de texto, **Apariencia** para la visibilidad y la cabecera de la instancia para el componente intercambiado. Crea una propiedad a partir del valor actual de la capa o elige una existente; el campo muestra entonces la propiedad en lugar de su valor. Escribir en un texto vinculado fija la propiedad: su valor predeterminado en el componente principal, o el valor de la instancia en una instancia.

Selecciona el componente principal para ver sus **Propiedades**. Haz clic en una propiedad para renombrarla, cambiar su valor predeterminado, ver y desvincular las capas que controla o eliminarla, y arrastra las propiedades para reordenarlas. **+** añade una propiedad de texto, booleana o de intercambio de instancia.

Para mostrar las propiedades de una instancia anidada en las instancias del componente, elige **+ → Instancias anidadas** y márcala, como hace **Expose properties from nested instances** en Figma. Las instancias del componente listan entonces sus propiedades bajo su nombre. Solo se puede exponer una instancia cuyo componente tenga propiedades.

## Slots

Un slot es un marco de un componente principal cuyo contenido puede cambiar cada instancia. Selecciona un marco dentro de un componente principal y elige **Crear slot** en el menú contextual o en la sección **Slots**, o selecciona otras capas para envolverlas en un nuevo marco de slot. Los ajustes del slot fijan una descripción, los componentes que prefiere y cuántos elementos admite; una instancia fuera de esos límites muestra un aviso. En una instancia, añade, reordena y elimina los elementos de un slot, o restablece el contenido del componente.

## Comportamientos y vista previa {#behaviours-and-preview}

Un comportamiento hace que un componente principal o un conjunto de componentes funcione como un control real, según las primitivas de [Reka UI](https://reka-ui.com): Botón, Campo de texto, Área de texto, Campo numérico, Interruptor de alternancia, Interruptor, Casilla, Opción, Grupo de opciones, Grupo de alternancia, Control deslizante, Progreso, Pestañas, Plegable o Acordeón. Selecciona el componente y usa **+** en la sección **Comportamiento** para elegir uno.

La sección lista lo que necesita el control:

- **Valores:** la propiedad que guarda cada valor: una propiedad de variante o booleana para activado, marcado, pulsado, abierto, lleno o desactivado (con los valores de variante que significan activado y desactivado), una propiedad de texto para el texto de un campo, o el mínimo, el máximo, el paso y el valor predeterminado propios de un control deslizante.
- **Partes:** el slot que dibuja cada parte, como el pulgar de un interruptor, la pista, el rango y el pulgar de un control deslizante, o una lista de pestañas. El slot de elementos de un grupo contiene instancias de sus opciones, interruptores o plegables.
- **Estados:** una propiedad de variante cuyos valores dibujan los estados predeterminado, hover, pulsado, foco y desactivado. Los valores con nombres como esos estados se asocian automáticamente.

Las filas que el control requiere van primero; el resto está en **Más opciones**. Cuando un componente aún no tiene nada que vincular, una fila ofrece crearlo: una capa y una propiedad de texto, variantes Off y On, o un slot, y **Estados** ofrece **Añadir variantes de estado**, que añade variantes Default, Hover, Pressed, Focus y Disabled del componente. Un componente principal suelto que recibe variantes de esta forma se convierte en un conjunto de componentes, y un slot añadido a un conjunto aparece en todas las variantes. Mientras el control no funcione, una línea bajo su nombre indica lo que falta; al hacer clic en ella vas allí.

Pulsa <kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd> (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Enter</kbd>), elige **Ver → Vista previa** o usa el botón ▶ **Vista previa** de la barra superior para previsualizar el lienzo. Cada capa de primer nivel que contiene controles funciona como componentes vivos de Reka UI sobre el lienzo, dibujados con las variantes del componente: los interruptores cambian, los controles deslizantes se arrastran, las pestañas y los acordeones se abren, y los campos de texto son entradas reales con el cursor, la selección y el pegado del navegador. La vista previa nunca cambia el documento ni su historial. **Restablecer** devuelve todos los controles a su diseño original, y <kbd>Esc</kbd> o el botón de cerrar de la etiqueta vuelven a la edición. En la vista dividida, cada lienzo se previsualiza por separado.

Los comportamientos se guardan en los archivos `.fig` y se publican con los componentes de biblioteca.

## Bibliotecas de componentes {#component-libraries}

Una biblioteca de componentes publica componentes reutilizables como una revisión inmutable. Cada recurso publicado tiene una identidad estable de biblioteca, recurso y revisión, así que distintas instancias pueden quedarse en revisiones distintas hasta que las actualices de forma explícita.

**Pairdraw Basics** es el conjunto original incluido: componentes de botón, entrada, insignia, tarjeta y avatar, publicado como `pairdraw-basics`. Está en el panel **Recursos** sin catálogo: actívalo ahí para insertar sus componentes, también sin conexión, y sigue ahí después de recargar. `pairdraw libraries seed --root ./catalog` sigue publicando ese mismo conjunto en un catálogo de archivos.

### Publicar una biblioteca

1. Crea los componentes y conjuntos de componentes que quieras compartir.
2. Abre **Recursos** y elige **Gestionar bibliotecas**.
3. Elige **Publicar biblioteca**.
4. Escribe un ID de biblioteca estable y un nombre visible. El ID de biblioteca queda fijado tras la primera publicación.
5. Si quieres, busca en la lista de cambios y escribe una descripción de la revisión.
6. Selecciona los recursos añadidos, modificados, renombrados o eliminados que quieras incluir.
7. Confirma el destino y elige **Publicar biblioteca**.

En publicaciones posteriores, los cambios sin marcar quedan pendientes. Los recursos sin cambios conservan sus definiciones publicadas anteriores, y las definiciones eliminadas siguen disponibles mientras algún documento haga referencia a su revisión histórica.

### Habilitar e insertar recursos de biblioteca

Abre **Recursos → Gestionar bibliotecas** para habilitar una biblioteca publicada. Sus componentes aparecen en el panel **Recursos** junto a los componentes locales. Inserta uno con un clic, con el teclado o arrastrándolo al lienzo.

Las definiciones publicadas son de solo lectura en los documentos que las usan. Edita el documento de origen y publica otra revisión para cambiar una definición. Las instancias vinculadas a esas definiciones siguen siendo editables mediante sus propiedades de componente y sus sustituciones.

### Revisar y aceptar actualizaciones

Abre **Gestionar bibliotecas → Actualizaciones** para descubrir revisiones más recientes. Descubrirlas no modifica el documento. Puedes revisar la instancia actual y la actualizada lado a lado, recorrer las instancias afectadas y después actualizar:

- la instancia seleccionada;
- todas las instancias de un recurso;
- las instancias de la página actual;
- las instancias de todas las páginas.

Pairdraw conserva las asignaciones compatibles de texto, visibilidad e intercambio de instancia. Si una variante exacta ya no existe, la revisión indica la alternativa de arriba a la izquierda antes de que la aceptes. Aplicar una actualización crea una entrada de deshacer.

### Uso local, con almacenamiento y sin conexión

Las bibliotecas pueden usar el catálogo local del navegador o un proveedor de almacenamiento configurado. La publicación remota usa objetos de revisión inmutables y un puntero condicional a la última versión, lo que impide que dos personas que publican se sobrescriban sin darse cuenta.

Las revisiones descargadas se guardan en caché localmente. Un documento puede seguir renderizando e insertando definiciones descargadas sin conexión. Los fallos de integridad se informan en lugar de ocultarse tras los datos en caché.

### Guardar documentos que usan bibliotecas

Los vínculos a bibliotecas habilitadas y las definiciones materializadas se guardan con los documentos `.fig`. Al volver a abrir un archivo se conservan sus instancias vinculadas y las identidades de revisión, aunque su biblioteca remota no esté disponible.

## Crear instancias

Haz clic derecho en un componente y elige **Crear instancia** en el menú contextual, o insértalo desde **Recursos**. La instancia aparece 40 px a la derecha del componente de origen, con el mismo aspecto, y conserva un vínculo con el componente principal.

En el lienzo, crear una instancia solo está disponible desde el menú contextual: no hay botón en la barra de herramientas.

## Separar una instancia

Selecciona una instancia y pulsa <kbd>⌥</kbd><kbd>⌘</kbd><kbd>B</kbd> (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>B</kbd>) para separarla. La instancia se convierte en un marco normal sin vínculo con el componente original. Todas las sustituciones quedan incorporadas.

## Convertir en marco

Selecciona un componente principal y pulsa <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd>), las mismas teclas que Crear componente, o elige **Convertir en marco** en su menú contextual, en el menú de tipo de capa o en **Objeto › Convertir en marco**, para volver a convertirlo en un marco. Si el componente tiene instancias, una confirmación indica cuántas; al convertirlo, cada instancia se separa en un marco que conserva su aspecto, incluidas las copias anidadas en instancias de otros componentes. Todo el cambio es un solo paso de deshacer.

## Ir al componente principal

Haz clic derecho en una instancia y elige **Ir al componente principal**. El editor va al componente principal y lo selecciona, cambiando de página si hace falta.

## Sincronización en vivo

Cuando editas un componente, todas sus instancias se actualizan automáticamente, como en Figma: cada propiedad que una instancia no sustituye sigue al componente. Eso incluye el tamaño, los rellenos, los trazos y su grosor, alineación, extremos, uniones y guiones, los efectos, la opacidad, el modo de fusión, los radios de esquina y su suavizado, los ajustes y cuadrículas de disposición, el recorte, los estilos compartidos y el texto, desde la fuente y el tamaño hasta el espaciado entre letras, el interlineado, las mayúsculas, la decoración, la alineación y los intervalos con estilo.

Una capa dentro de una instancia también toma del componente su posición, rotación, volteos, restricciones y máscara. Mueve o gira una capa en el componente y se moverá en todas las instancias. Cuando una instancia tiene un tamaño distinto al de su componente, la capa se coloca según sus restricciones, así que una capa fijada a la derecha conserva su distancia al borde derecho. Dentro de una disposición automática, es la disposición la que la coloca.

La sincronización se lanza automáticamente tras actualizar, mover o redimensionar objetos dentro de un componente.

## Sustituciones

Las instancias pueden sustituir propiedades concretas sin romper el vínculo de sincronización. Cuando una propiedad está sustituida en una instancia, la sincronización la omite; las demás propiedades siguen actualizándose desde el componente principal.

### Propiedades que se pueden sustituir

Una capa dentro de una instancia puede sustituir su nombre, su texto, sus intervalos con estilo y su fuente, todas las propiedades visuales y de texto mencionadas arriba, su tamaño y si está visible o bloqueada. Su posición, rotación, volteos, restricciones y máscara no se pueden sustituir: siempre vienen del componente. Los scripts que fijan su posición, rotación, restricciones o máscara reciben el error de Figma. El contenido de los slots es propio de la instancia y sigue siendo editable.

Las sustituciones de un archivo `.fig` vuelven como sustituciones al abrirlo, y se guardan como las escribe Figma.

### Hijos nuevos

Cuando añades un hijo a un componente, todas las instancias existentes reciben automáticamente una copia. El orden de los hijos en las instancias siempre coincide con el del componente.

### Modos de variables

Una instancia, o una capa dentro de una, que fija el modo de una colección de variables conserva ese modo y sigue tomando los modos del componente para todas las demás colecciones. Cambia el modo de densidad del componente principal y una instancia que solo cambió su tema seguirá la nueva densidad.

### Intercambiar una instancia

Selecciona una instancia, también una anidada, y pulsa el botón de intercambio de su cabecera para mostrar otro componente en su lugar. La lista contiene todos los componentes del documento; uno que se contendría a sí mismo está desactivado. Una instancia anidada intercambiada sigue intercambiada cuando cambia el componente que la contiene. Cuando el intercambio está vinculado a una propiedad de intercambio de instancia, la cabecera muestra la propiedad.

### Reemplazar una capa dentro de una instancia

Copia una capa, selecciona una capa dentro de una instancia y pulsa <kbd>⌥</kbd><kbd>⇧</kbd><kbd>R</kbd> (<kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd>) o elige **Reemplazar dentro de la instancia** en el menú Editar o en el menú contextual. La capa copiada ocupa el lugar y la posición de la seleccionada como sustitución de la instancia, sin separarla: el resto de la instancia sigue a su componente, y el reemplazo se mantiene cuando cambia el componente, hasta que el componente elimina la capa reemplazada. Con varias capas seleccionadas, cada una recibe su propia copia. Si no hay nada seleccionado dentro de una instancia, las teclas pegan para reemplazar.

Selecciona el reemplazo y pulsa **Restaurar capa del componente** en su cabecera para recuperar la capa del componente. Los reemplazos se guardan en los archivos `.fig` como datos de plugin de Pairdraw en la instancia; Figma muestra en su lugar la capa del componente.

## Selección con clic

Los componentes y las instancias son contenedores opacos: un clic en un hijo selecciona el propio componente, no el hijo. **Haz doble clic** para entrar en el componente y seleccionar hijos dentro de él.

## Aspecto visual

| Elemento | Aspecto |
|----------|---------|
| Etiqueta de componente | Morada con icono de rombo, siempre visible |
| Etiqueta de instancia | Morada con icono de rombo, siempre visible |
| Borde de conjunto de componentes | Contorno morado discontinuo |

## Atajos de teclado

| Acción | Mac | Windows / Linux |
|--------|-----|-----------------|
| Crear componente | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd> |
| Separar instancia | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>B</kbd> | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>B</kbd> |
| Vista previa | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd> | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Enter</kbd> |

## Consejos

- Editar texto dentro de una instancia crea una sustitución: el texto no se sobrescribe cuando cambia el componente.
- Usa conjuntos de componentes para organizar variantes multidimensionales como tamaño, estado y tema.
- Publica los recursos reutilizables desde su documento de origen; las definiciones publicadas son de solo lectura a propósito en los documentos que las usan.
- Revisa las actualizaciones antes de aceptarlas cuando una revisión elimina una combinación exacta de variantes.
- Consulta el [Menú contextual](./context-menu) para ver todas las acciones relacionadas con componentes.

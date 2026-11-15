---
title: Dibujar formas
description: Crear rectángulos, elipses, líneas, marcos, secciones, polígonos y estrellas en Pairdraw.
---

# Dibujar formas

La barra de herramientas a la izquierda del lienzo contiene herramientas para crear formas, marcos y secciones. Selecciona una herramienta y haz clic y arrastra sobre el lienzo para dibujar.

## Herramientas

| Herramienta | Tecla | Resultado |
|-------------|-------|-----------|
| Rectángulo | <kbd>R</kbd> | Dibuja un rectángulo |
| Elipse | <kbd>O</kbd> | Dibuja una elipse |
| Línea | <kbd>L</kbd> | Dibuja una línea |
| Marco | <kbd>F</kbd> o <kbd>A</kbd> | Dibuja un marco (contenedor de otros objetos) |
| Sección | <kbd>Shift</kbd> + <kbd>S</kbd> | Dibuja una sección (incorpora las capas hermanas que cubre por completo) |

## Colocar imágenes

Elige **Archivo › Colocar imagen…** (<kbd>⇧</kbd><kbd>⌘</kbd><kbd>K</kbd>, o <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>K</kbd> en Windows y Linux) o pulsa el botón de imagen de la barra de herramientas y escoge archivos PNG, JPEG, WebP, GIF, AVIF o SVG. Aparecen seleccionados en el centro de la vista, en un solo paso que se puede deshacer; un SVG se convierte en capas editables.

La herramienta **Nota adhesiva** sigue a Texto en la barra de herramientas. No tiene tecla, así que <kbd>N</kbd> sigue haciendo zoom al siguiente marco.

## Menú de formas

El menú de formas (desde la barra de herramientas) incluye formas adicionales:

- **Polígono:** crea un polígono de 3 lados por defecto (un triángulo).
- **Estrella:** crea una estrella de 5 puntas con un radio interior de 0,38.

Polígono y Estrella no tienen atajo de teclado; se eligen en el menú de formas de la barra de herramientas.

## Personalizar la barra de herramientas

Haz clic derecho en la barra de herramientas y elige **Personalizar barra de herramientas…**, o abre **Ajustes → Editor**, para cambiarla:

- Desactiva el interruptor de una herramienta para ocultarla. Las herramientas ocultas conservan sus atajos de teclado. **Mover** siempre se muestra.
- Arrastra una herramienta para reordenarla. Si la sueltas dentro de un cuadro, se une a ese menú; si la sueltas en el hueco entre cuadros, pasa a ser un botón propio; si la sueltas sobre otra herramienta, las dos comparten un menú.
- El menú **⋯** de una herramienta la sube o la baja, la agrupa con la herramienta de arriba o la saca de su menú. Su asa también la mueve con <kbd>↑</kbd> y <kbd>↓</kbd>.
- **Insertar icono** ejecuta un comando en lugar de elegir una herramienta, así que se puede mover y ocultar, pero no unirse a un menú.

**Restablecer valores predeterminados** recupera la disposición original. Las herramientas añadidas en versiones posteriores se unen a su menú predeterminado, así que una barra personalizada también las recibe.

## Dibujo con restricciones

Mantén <kbd>Shift</kbd> mientras arrastras para restringir la forma:

- Rectángulo → cuadrado (mismo ancho y alto).
- Elipse → círculo.
- Línea → se ajusta a ángulos de 0°, 45° y 90°.

## Propiedades de las formas

Después de dibujar una forma, selecciónala para editar sus propiedades en la pestaña Diseño del panel de propiedades.

### Relleno

Cualquier forma puede tener relleno. La sección de relleno admite:

- **Color sólido:** elígelo en el selector de color HSV o escribe un valor hexadecimal.
- **Degradado:** lineal, radial, angular o diamante, con paradas editables. Mientras el selector del degradado está abierto, el lienzo muestra sus tiradores: arrastra un extremo o un punto de radio para moverlo, mantén <kbd>Shift</kbd> para girarlo en pasos de 15° y arrastra el cuadrado de una parada para deslizarla por la línea.
- **Malla:** una cuadrícula de puntos de color que se mezcla sobre la capa. La pestaña **Malla** muestra cada punto: elige uno para cambiar su color, o cambia **Columnas** y **Filas** para remuestrear la cuadrícula (hasta 4 en cada sentido). La malla pinta rellenos y trazos; los archivos `.fig` conservan la cuadrícula y muestran su propio color en otros programas, y los rellenos `mesh_gradient` de `.pen` se importan.
- **Imagen:** elige un archivo de imagen como relleno, o pega una dirección en **URL de la imagen** y pulsa **Cargar** para descargar de la web una imagen PNG, JPEG, GIF o WebP (o una URL `data:`) de hasta 64 MB.
- **Shader:** un shader GLSL animado; empieza con la galería del selector de relleno de shader, añádele efectos o pega un preajuste copiado de shaders.com.

Un relleno de imagen se coloca en uno de cinco modos: **Rellenar** cubre la capa y recorta la imagen, **Ajustar** muestra la imagen entera dentro de la capa, **Estirar** estira la imagen entera a las proporciones de la capa, **Recortar** te deja elegir la parte de la imagen que se muestra y **Mosaico** repite la imagen. Estirar se guarda como un recorte de la imagen entera, tal como lo guardan los archivos `.pen` y lo lee Figma.

Para recortar o reencuadrar una imagen en el lienzo, haz doble clic en la capa, pulsa <kbd>Enter</kbd> con ella seleccionada o elige **Recortar imagen** en su menú contextual o en su relleno de imagen. La imagen aparece entera, atenuada fuera de la capa. Arrastra las esquinas o las barras de los bordes de la capa para recortarla sobre la imagen quieta, arrastra la imagen para moverla detrás de la capa y arrastra sus puntos de esquina para escalarla. <kbd>Shift</kbd> mantiene las proporciones o un eje y <kbd>Alt</kbd> trabaja desde el centro. Cada arrastre es un paso que se puede deshacer y guarda el relleno como recorte; <kbd>Enter</kbd>, <kbd>Esc</kbd>, un doble clic o un clic fuera de la imagen termina. Los vectores, las capas con hijos y las capas que coloca la disposición automática conservan sus bordes; en ellas solo puedes mover y escalar la imagen.

### Modo shader

El modo shader muestra un relleno de shader solo y en grande, con reproducción y pausa, un deslizador de fase y los ajustes del shader al lado. Ábrelo con **Abrir en modo shader** en el selector de relleno de shader, o con **Ver → Modo shader** mientras la selección tenga un relleno de shader.

### Contorno

Añade un contorno a cualquier forma. Sus propiedades son:

- **Grosor:** común o por lado (arriba, derecha, abajo, izquierda) con el desplegable de lados.
- **Color:** color sólido con opacidad.
- **Alineación:** **Interior**, **Centro** o **Exterior** respecto al borde de la forma (el renderizado basado en recortes coincide con Figma).
- **Extremos:** ninguno, redondo, cuadrado, flecha de líneas o flecha equilátera (para rutas abiertas).
- **Uniones:** en ángulo, biselada o redonda.
- **Guiones:** longitud del trazo y del hueco.

### Radio de esquina

Disponible para rectángulos, marcos, componentes, instancias, polígonos y estrellas. Pulsa el botón de esquinas independientes para ajustar cada esquina (superior izquierda, superior derecha, inferior izquierda, inferior derecha) por separado; las esquinas de un polígono o una estrella comparten un radio, que también redondea sus esquinas interiores.

En el lienzo, pasa el puntero por un rectángulo seleccionado para ver un tirador dentro de cada esquina y arrastra uno para redondear las esquinas. Las esquinas iguales cambian juntas y las distintas de una en una; mantén <kbd>⌥</kbd> para intercambiar ambos comportamientos y <kbd>⇧</kbd> para redondear a decenas. Un polígono o una estrella tiene un solo tirador de radio, debajo de su punta superior, que redondea todas sus esquinas; arrastra el tirador de su siguiente punta alrededor del centro para cambiar el número de puntas, y el tirador de la primera punta interior de una estrella hacia el centro o alejándolo para cambiar su proporción. Los tiradores se ocultan mientras la forma mide menos de 108 píxeles en pantalla; acerca el zoom para alcanzarlos.

### Arcos de elipse

Selecciona una elipse para ver su arco en la sección **Apariencia**: **Inicio** es el ángulo en el que empieza el arco, en grados; **Barrido** es la parte de la vuelta completa que cubre, en porcentaje; y **Proporción** es el tamaño del hueco central, como porcentaje de la elipse, para anillos y gráficos de rosquilla. Escribe un valor o arrastra el campo; los tiradores de la elipse en el lienzo cambian esos mismos tres valores.

### Efectos

Añade efectos visuales desde la sección **Efectos**:

- **Sombra exterior:** desplazamiento, radio de desenfoque, extensión y color.
- **Sombra interior:** los mismos controles, renderizada dentro de la forma.
- **Desenfoque de capa:** desenfoca el objeto entero.
- **Desenfoque de fondo:** desenfoca el contenido que hay detrás del objeto.
- **Desenfoque** (de primer plano): desenfoca el contenido que hay delante.

Pulsa **+** para añadir un efecto. Cada fila de efecto se puede plegar y tiene controles en línea. Pulsa el icono del ojo para activar o desactivar un efecto.

## Marcos y secciones

Los **marcos** son contenedores. Arrastra formas a un marco para convertirlas en hijos, o empieza a dibujar dentro de uno: una forma nueva entra en el marco que hay bajo el punto donde empiezas, salvo en los marcos bloqueados, y se une al final de un flujo de disposición automática. Dibujar un marco sobre objetos existentes mete dentro los no bloqueados que cubre por completo. Los marcos nuevos recortan su contenido, como en Figma (desactiva **Recortar contenido** para que los hijos se vean fuera), y admiten [disposición automática](./auto-layout).

Elige la herramienta Marco para ver en el panel Diseño preajustes plegables para teléfonos, tabletas, escritorios, presentaciones, relojes, papel, redes sociales, recursos de Figma Community y dispositivos archivados. Al elegir un preajuste se crea un marco con nombre centrado en la vista y se vuelve a la herramienta Selección. Con un marco existente seleccionado, usa su desplegable **Preajuste de marco** para redimensionarlo sin cambiar su nombre.

Las **secciones** son contenedores de primer nivel que incorporan las capas hermanas que cubren por completo al dibujarlas, moverlas o redimensionarlas. Sirven para organizar lienzos grandes en zonas lógicas. Las secciones muestran su título en una etiqueta que puedes arrastrar.

## Atajos de teclado

| Acción | Mac | Windows / Linux |
|--------|-----|-----------------|
| Herramienta Rectángulo | <kbd>R</kbd> | <kbd>R</kbd> |
| Herramienta Elipse | <kbd>O</kbd> | <kbd>O</kbd> |
| Herramienta Línea | <kbd>L</kbd> | <kbd>L</kbd> |
| Herramienta Marco | <kbd>F</kbd> o <kbd>A</kbd> | <kbd>F</kbd> o <kbd>A</kbd> |
| Herramienta Sección | <kbd>⇧</kbd><kbd>S</kbd> | <kbd>Shift</kbd> + <kbd>S</kbd> |
| Restringir a cuadrado/círculo | <kbd>Shift</kbd> + arrastrar | <kbd>Shift</kbd> + arrastrar |

## Consejos

- Las secciones solo pueden estar en el primer nivel: no se pueden anidar dentro de marcos.
- Usa marcos con [disposición automática](./auto-layout) para crear diseños adaptables.
- [Exporta](./exporting) formas o grupos sueltos como imágenes desde el panel de propiedades o el menú contextual.

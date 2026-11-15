---
title: Seleccionar y transformar
description: Seleccionar, mover, redimensionar, rotar, duplicar y ordenar objetos en Pairdraw.
---

# Seleccionar y transformar

Los objetos seleccionados se pueden mover, redimensionar, rotar, duplicar y organizar en el lienzo.

## Selección

- **Un clic** en un objeto lo selecciona y sustituye la selección actual. Como en Figma, un clic dentro de un marco de primer nivel selecciona un hijo directo de ese marco, como un marco anidado o un grupo, y no la capa más profunda; para seleccionar un marco de primer nivel, haz clic en su título, en cualquier punto si está vacío, o en sus huecos y su relleno si tiene disposición automática.
- **Al pasar el puntero** sobre un marco con disposición automática, sus hijos directos se marcan con líneas de puntos; mientras hay una sola capa seleccionada, el borde de su padre con disposición automática se muestra punteado.
- **Doble clic** baja un nivel, igual que otro clic dentro de un marco, componente o instancia seleccionados; con una capa seleccionada, los clics llegan directamente a sus hermanas y primas.
- <kbd>⌘</kbd> + clic (<kbd>Ctrl</kbd> + clic en Windows y Linux) selecciona la capa más profunda bajo el puntero; al mantener <kbd>⌘</kbd>, esa capa se resalta antes de hacer clic.
- <kbd>Shift</kbd> + clic añade o elimina un objeto de la selección. Una capa y su propio padre o hijo nunca se seleccionan juntos, así que <kbd>Shift</kbd> + clic en uno sustituye al otro.
- **Doble clic en el nombre de un marco o componente** sobre el lienzo para renombrarlo en el sitio.
- **Selección rectangular:** arrastra sobre una zona libre del lienzo para dibujar un rectángulo de selección; al soltar se seleccionan los objetos que intersecta. Si empieza dentro de un marco de primer nivel sin disposición automática o de una sección, selecciona las capas de ese contenedor; desde la página, un marco o una sección que contiene capas solo se selecciona si queda totalmente dentro.
- <kbd>⌘</kbd> + arrastrar (<kbd>Ctrl</kbd> + arrastrar en Windows y Linux) crea una selección rectangular que elige las capas anidadas más profundas que toca. Empieza donde empieza una selección rectangular normal: en el lienzo vacío o en el fondo vacío de un marco de nivel superior o de una sección. Sobre una capa o el fondo de un marco, componente o instancia anidados, <kbd>⌘</kbd> + arrastrar selecciona esa capa y la mueve. Pulsa o suelta <kbd>⌘</kbd> mientras arrastras para cambiar entre la selección profunda y la normal.
- <kbd>⌘</kbd><kbd>A</kbd> selecciona todos los objetos de la página actual.
- <kbd>Enter</kbd> selecciona los hijos de las capas seleccionadas; en un vector edita la ruta y en un texto edita el texto.
- <kbd>Shift</kbd> + <kbd>Enter</kbd> o <kbd>\\</kbd> selecciona el padre de las capas seleccionadas.
- <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> selecciona la hermana siguiente o anterior, bajando o subiendo por el panel de capas y volviendo a empezar en los extremos.
- **Un clic en una zona libre** cancela la selección.

## Mover

- **Arrastra** un objeto seleccionado para moverlo (todos los objetos seleccionados se mueven juntos).
- Las **teclas de flecha** desplazan la selección el desplazamiento pequeño, 1 px si no lo cambias.
- <kbd>Shift</kbd> + flechas desplazan el desplazamiento grande, 10 px si no lo cambias.

Ambas distancias se ajustan en **Ajustes → Editor → Desplazamiento con flechas**.

## Redimensionar

La selección muestra ocho tiradores: cuatro en las esquinas y cuatro en el centro de los lados. Arrastra uno para redimensionar.

- Mantén <kbd>Shift</kbd> al arrastrar un tirador de esquina para conservar las proporciones.

## Herramienta Escalar

Pulsa <kbd>K</kbd>, o elige **Escalar** en el menú de la herramienta Mover, para escalar capas con todo su contenido: tamaños de texto, trazos, efectos, radios de esquina y espaciado de la disposición automática crecen y se reducen con la capa, como con la herramienta Escala de Figma. Arrastra un tirador de la selección para escalar desde el lado opuesto, o mantén pulsada <kbd>Option</kbd>/<kbd>Alt</kbd> para escalar desde el centro; varias capas seleccionadas se escalan juntas alrededor de su contorno común.

Mientras la herramienta Escalar está activa, el panel Diseño muestra el ancho y el alto de la selección, un factor de escala y una cuadrícula de anclaje. Escribir un ancho o un alto escala la selección proporcionalmente; el factor acepta `2`, `2x` o `200%`. La cuadrícula de anclaje elige el punto que se queda en su sitio. Cada escalado es un solo paso de deshacer.

## Meter y sacar de marcos

Un objeto arrastrado entra en el marco que hay bajo el puntero al soltarlo, aunque solo una parte mínima quede dentro, y sale de su marco en cuanto sale el puntero. Los grupos y los marcos bloqueados nunca aceptan objetos soltados, y un conjunto de componentes solo vuelve a aceptar sus propias variantes; un objeto dentro de un grupo se queda en él salvo que lo sueltes en otro marco, y el grupo cambia de tamaño para ajustarse a lo que contiene. Un grupo del que sale su último objeto se elimina. Si pulsas dentro de un marco, grupo o conjunto de componentes seleccionado, se arrastra ese contenedor y no el objeto bajo el puntero.

- <kbd>Shift</kbd> + arrastrar: limita el movimiento a un eje.
- Mantén <kbd>Space</kbd> mientras arrastras: los objetos se quedan en sus padres actuales.
- <kbd>⌃</kbd> + arrastrar (<kbd>Ctrl</kbd> + arrastrar en Windows y Linux): desactiva el ajuste magnético; si lo sueltas en un marco con disposición automática, el objeto se posiciona de forma absoluta.

Los objetos bloqueados de una selección se quedan en su sitio cuando se mueve el resto.

## Rotar

Sitúa el puntero justo fuera de un tirador de esquina hasta que aparezca el cursor de rotación y arrastra.

- Con <kbd>Shift</kbd> + arrastrar, la rotación se ajusta en pasos de 15°.

## Duplicar

- <kbd>Alt</kbd> + arrastrar (<kbd>⌥</kbd> + arrastrar en Mac) duplica el objeto seleccionado y mueve la copia.
- <kbd>⌘</kbd><kbd>D</kbd> duplica en la misma posición; la copia de un marco de primer nivel solo, en la página o en una sección, va al primer espacio libre a su derecha.

Los duplicados conservan su nombre. Duplicar así un componente principal crea una instancia de él.

## Pegar

<kbd>⌘</kbd><kbd>V</kbd> conserva la posición copiada. Al pegar en un marco seleccionado, los objetos conservan su desplazamiento respecto al marco del que se copiaron y se centran en cualquier eje en el que no quepan; los objetos que quedarían fuera de la vista se centran en ella. Usa **Pegar aquí** del [menú contextual](./context-menu) para pegar en la posición del puntero.

## Eliminar

Pulsa <kbd>Backspace</kbd> o <kbd>Supr</kbd> para eliminar todos los objetos seleccionados.

## Orden

Cambia el orden de apilamiento de los objetos dentro de su padre:

- **]** lleva la selección al frente (arriba de la lista de hermanos).
- **[** la envía al fondo (abajo de la lista de hermanos).
- <kbd>⌘</kbd><kbd>]</kbd> / <kbd>⌘</kbd><kbd>[</kbd> (<kbd>Ctrl</kbd> en Windows y Linux) la adelantan o la atrasan un nivel.

## Visibilidad y bloqueo

- <kbd>⇧</kbd><kbd>⌘</kbd><kbd>H</kbd> cambia la visibilidad. Los objetos ocultos no se renderizan, pero siguen en el panel de capas.
- <kbd>⇧</kbd><kbd>⌘</kbd><kbd>L</kbd> cambia el bloqueo. Los objetos bloqueados no se pueden seleccionar ni mover en el lienzo.

## Mover a otra página

Mueve los objetos seleccionados a otra página con **Mover a página** del [menú contextual](./context-menu). Los objetos pasan al lienzo de la página de destino.

## Editar varias capas

Con varias capas seleccionadas, el panel de propiedades muestra lo que tienen en común e indica **Mixto** donde difieren; una edición las cambia todas en un solo paso de deshacer.

- **Diseño** muestra sus tamaños, el redimensionado del texto cuando hay texto seleccionado, el flujo cuando todas las capas son marcos y **Recortar contenido** para los marcos que haya entre ellas. Cuando las capas forman una fila o una columna, **Espaciado** muestra el hueco entre ellas; al escribir un valor se reparten de forma uniforme a partir de la primera capa.
- **Tipografía** aparece siempre que hay texto seleccionado y solo cambia el texto.
- **Trazo** muestra el trazo de las capas que lo tienen; al editarlo se aplica un trazo a todas las capas seleccionadas.
- **Colores de la selección** lista todos los colores de relleno y trazo de la selección, también dentro de marcos y grupos, de más a menos usado. Cambiar uno lo recolorea en todos los sitios donde se usa.

## Secciones

Una sección incorpora las capas hermanas que cubre por completo cuando la dibujas, la mueves o la redimensionas sobre ellas.

## Atajos

| Acción | macOS | Windows / Linux |
|--------|-------|-----------------|
| Seleccionar todo | <kbd>⌘</kbd><kbd>A</kbd> | <kbd>Ctrl</kbd> + <kbd>A</kbd> |
| Duplicar | <kbd>⌘</kbd><kbd>D</kbd> | <kbd>Ctrl</kbd> + <kbd>D</kbd> |
| Duplicar y mover | <kbd>⌥</kbd> + arrastrar | <kbd>Alt</kbd> + arrastrar |
| Herramienta Escalar | <kbd>K</kbd> | <kbd>K</kbd> |
| Mover en un solo eje | <kbd>⇧</kbd> + arrastrar | <kbd>Shift</kbd> + arrastrar |
| Conservar el padre actual | <kbd>Space</kbd> al arrastrar | <kbd>Space</kbd> al arrastrar |
| Mover sin ajuste magnético | <kbd>⌃</kbd> + arrastrar | <kbd>Ctrl</kbd> + arrastrar |
| Eliminar | <kbd>⌫</kbd> / <kbd>Supr</kbd> | <kbd>Backspace</kbd> / <kbd>Supr</kbd> |
| Mover 1 px | Flechas | Flechas |
| Mover 10 px | <kbd>⇧</kbd> + flechas | <kbd>Shift</kbd> + flechas |
| Llevar al frente | ] | ] |
| Enviar al fondo | [ | [ |
| Visibilidad | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>H</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>H</kbd> |
| Bloqueo | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>L</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>L</kbd> |

## Consejos

- Usa el panel de [Capas y páginas](./layers-and-pages) para ver y reordenar objetos que se solapan.
- Consulta el [Menú contextual](./context-menu) para acciones adicionales como agrupar o crear componentes.

---
title: Disposición automática
description: Disposición flex y de cuadrícula en Pairdraw — dirección, separación, relleno, alineación, tamaño de los hijos y pistas de CSS Grid.
---

# Disposición automática

La disposición automática coloca los hijos de un marco de forma automática. Admite dos modos: **flex** (flujo horizontal o vertical) y **cuadrícula** (filas y columnas con tamaños de pista).

## Activar la disposición automática

- Selecciona un marco y pulsa <kbd>⇧</kbd><kbd>A</kbd> (<kbd>Shift</kbd> + <kbd>A</kbd>) para activar o desactivar la disposición automática.
- Selecciona objetos sueltos (sin marco padre) y pulsa <kbd>⇧</kbd><kbd>A</kbd> para envolverlos en un marco nuevo con disposición automática.

Al envolver una selección, los objetos se ordenan por su posición visual: de izquierda a derecha en la disposición horizontal y de arriba abajo en la vertical.

## Dirección

Elige cómo se colocan los hijos:

- **Horizontal:** los hijos fluyen de izquierda a derecha.
- **Vertical:** los hijos fluyen de arriba abajo.
- **Salto de línea:** los hijos pasan a la fila o columna siguiente cuando se quedan sin espacio.

## Espaciado

### Separación

El espacio entre hijos contiguos. Se fija un único valor que se aplica entre todos los hijos.

### Relleno

El espacio entre el borde del marco y sus hijos. Fija un valor uniforme para todos los lados, o despliégalo para ajustar cada lado por separado (arriba, derecha, abajo, izquierda).

## Alineación

### Distribución (eje principal)

Controla cómo se reparten los hijos a lo largo de la dirección de la disposición:

- **Inicio:** los hijos se agrupan al principio.
- **Centro:** los hijos se centran.
- **Final:** los hijos se agrupan al final.
- **Espacio entre elementos:** los hijos se reparten con el mismo espacio entre ellos.
- **Espacio alrededor:** cada hijo recibe una parte igual del espacio libre, la mitad a cada lado, además de la separación; se elige en el menú del campo de separación.

### Alineación (eje transversal)

Controla cómo se colocan los hijos en perpendicular a la dirección de la disposición:

- **Inicio:** los hijos se alinean al principio.
- **Centro:** los hijos se centran.
- **Final:** los hijos se alinean al final.
- **Estirar:** los hijos se estiran para ocupar el eje transversal.

## Tamaño de los hijos

Cada hijo de un marco con disposición automática puede tener su propio modo de tamaño:

- **Fijo:** usa la anchura o altura explícitas del hijo.
- **Rellenar:** se estira para ocupar el espacio disponible en el padre.
- **Ajustar al contenido:** se reduce para ajustarse al contenido del hijo.

El primer cambio real de anchura o altura convierte solo ese eje a fijo. El foco del campo no cambia el modo.

## Incluir los trazos en la disposición

Por defecto, un marco con disposición automática coloca su contenido como si ninguna capa tuviera trazo, igual que Figma. Activa **Incluir trazos en el diseño** en la sección **Diseño** para dejar sitio a los trazos: el trazo del propio marco empuja su contenido hacia dentro, y los trazos exteriores de sus hijos ocupan espacio entre ellos.

Un marco con disposición automática fija nunca es más pequeño que el espacio que ocupa su relleno, más los trazos interiores que cuenta cuando **Incluir trazos en el diseño** está activado. Si se fija más pequeño, crece hasta ese espacio, como en Figma. Un marco guardado más pequeño que su relleno antes de este cambio conserva su tamaño guardado al abrir el archivo, y crece hasta su relleno en la siguiente edición.

## Reordenar arrastrando

Dentro de un marco con disposición automática, arrastra un hijo para cambiar su orden entre sus hermanos. Un indicador de inserción muestra dónde se soltará. Arrastrar un objeto desde otro lugar a un marco con disposición automática lo inserta de la misma manera; en un marco con salto de línea, entra en la línea que hay bajo el puntero. Dibujar dentro de un marco con disposición automática añade el objeto nuevo al final de su flujo.

Mantén <kbd>⌃</kbd> (<kbd>Ctrl</kbd> en Windows y Linux) mientras arrastras para ignorar la disposición automática: el objeto se suelta donde lo dejas, como hijo con posición absoluta.

## Panel de propiedades

Con un marco con disposición automática seleccionado, la sección **Diseño** del panel de propiedades muestra todos los controles de la disposición automática: dirección, separación, relleno, distribución y alineación.

## Atajos de teclado

| Acción | Mac | Windows / Linux |
|--------|-----|-----------------|
| Activar o desactivar la disposición automática | <kbd>⇧</kbd><kbd>A</kbd> | <kbd>Shift</kbd> + <kbd>A</kbd> |

## CSS Grid

La disposición en cuadrícula coloca los hijos en filas y columnas con tamaños de pista explícitos.

### Activar la cuadrícula

Selecciona un marco con disposición automática y pulsa el icono de cuadrícula de la barra de disposición para pasar de flex a cuadrícula.

### Tamaño de las pistas

Define las pistas de columnas y filas con tres modos de tamaño:

- **fr:** unidad fraccionaria; reparte el espacio disponible de forma proporcional.
- **px:** tamaño fijo en píxeles.
- **auto:** se ajusta al contenido.

Ejemplo: tres columnas `1fr 200px 1fr` crean una disposición con una columna central fija y laterales flexibles.

Pon un marco de cuadrícula en **Ajustar al contenido** para dimensionarlo según sus pistas y espacios. En un eje ajustado, una pista fraccionaria (`fr`) toma el tamaño de su contenido en lugar de repartir espacio, y el mínimo y el máximo del marco siguen aplicándose.

### Separaciones de la cuadrícula

Fija por separado la separación horizontal (entre columnas) y la vertical (entre filas).

### Posición de los hijos

Los hijos se colocan automáticamente en las celdas por orden de filas. Puedes cambiar su colocación con los valores de inicio y extensión de columna y fila en las propiedades de disposición del hijo.

### Exportación a JSX y Tailwind

Las disposiciones en cuadrícula se exportan a JSX con clases de Tailwind: `grid grid-cols-3`, `gap-x-4 gap-y-2`, `col-start-2 row-span-2`.

## Consejos

- La disposición automática se recalcula justo después de crearla, así que los límites de la selección se actualizan al momento.
- Anida marcos con disposición automática para disposiciones adaptables complejas (por ejemplo, un marco vertical que contiene filas horizontales).
- Usa el tamaño «Rellenar» para que un hijo ocupe el espacio restante, como `flex-grow: 1` en CSS.
- Usa la cuadrícula para paneles, galerías y formularios: cualquier cosa con estructura bidimensional.
- Consulta [Dibujar formas](./drawing-shapes) para crear los marcos a los que se aplica la disposición automática.
- Consulta [Componentes](./components) para usar la disposición automática dentro de componentes reutilizables.

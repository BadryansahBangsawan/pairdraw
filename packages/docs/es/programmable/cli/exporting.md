---
title: Exportar desde la CLI
description: Exportar el contenido de un documento a imágenes, PDF, PowerPoint, draw.io, `.fig`, JSX, HTML o historias de Storybook, con políticas de sustitución de fuentes para la salida raster y PDF.
---

# Exportar desde la CLI

Exporta diseños desde el terminal: imágenes raster, vectores, PDF, PowerPoint editable, diagramas de draw.io, subconjuntos `.fig`, código JSX, HTML o historias de Storybook.

La aplicación de las compilaciones de Pairdraw ya no ofrece la exportación a PowerPoint ni a draw.io; la CLI sigue escribiendo ambos formatos.

## Exportar imágenes

```sh
pairdraw export design.fig                           # PNG (default)
pairdraw export design.fig -f jpg -s 2 -q 90        # JPG at 2×, quality 90
pairdraw export design.fig -f webp -s 3             # WEBP at 3×
pairdraw export design.fig -f svg                   # SVG vector
pairdraw export design.fig -f pdf                   # PDF
pairdraw export design.fig -f pptx                  # editable PowerPoint
pairdraw export design.fig -f drawio                # draw.io diagram
pairdraw export design.fig -f fig --page "Page 1"   # export one page as .fig
pairdraw export design.fig -f fig --node 1:23        # export one node as .fig
pairdraw export design.fig -f html --css tailwind    # export an HTML fragment with Tailwind classes
```

Opciones:

- `-f`: formato: `png`, `jpg`, `webp`, `svg`, `pdf`, `pptx`, `drawio`, `jsx`, `tailwind-jsx`, `html`, `fig`, `storybook`
- `-s`: escala de exportación (predeterminada: `1`)
- `-q`: calidad, de `0` a `100` (solo JPG/WEBP)
- `-o`: ruta de salida
- `--page`: nombre de la página
- `--node`: ID de un objeto concreto

SVG conserva la geometría vectorial y resulta útil para iconos, revisión y edición posterior.

## Política de sustitución de fuentes {#font-substitution-policy}

En las exportaciones PNG, JPG, WEBP y PDF a partir de un archivo, y en `pairdraw convert`, elige cómo se tratan las fuentes que faltan o se sustituyen:

```sh
pairdraw export design.fig -f pdf --font-policy strict
pairdraw export design.fig -f png --font-policy warn
pairdraw export design.fig -f webp --font-policy allow
pairdraw convert design.pen --font-policy strict
```

- `warn` (predeterminada): informa de las sustituciones y sigue exportando.
- `strict`: se detiene con un código de salida distinto de cero si la preparación de fuentes no puede resolver fielmente las variantes solicitadas.
- `allow`: exporta sin la comprobación adicional de fidelidad tipográfica.

Ejecuta antes [`pairdraw fonts`](./inspecting#font-diagnostics) para inspeccionar las variantes afectadas. La preparación de la exportación puede usar los proveedores de fuentes configurados, así que su resultado puede diferir del diagnóstico sin conexión del archivo.

`convert` carga las fuentes de los archivos `.pen`, draw.io y Mermaid, que guardan la intención de la disposición en lugar de los tamaños: los vuelve a maquetar con su texto medido en sus propias fuentes antes de escribir, así que `strict` lo detiene antes de que se escriba nada. Un diagrama de flujo de Mermaid (`.mmd` o `.mermaid`) se maqueta al leerlo, con su texto medido en las fuentes con que se dibuja.

Esta política no se aplica a las exportaciones desde la aplicación en ejecución ni a las exportaciones SVG, PowerPoint, JSX, HTML y `.fig`. Comprueba la resolución de las fuentes, no la equivalencia visual completa con Figma.

## Exportar JSX

Exporta JSX con clases de utilidad de Tailwind:

```sh
pairdraw export design.fig -f tailwind-jsx    # or: -f jsx --style tailwind
```

Salida:

```html
<div className="flex flex-col gap-4 p-6 bg-white rounded-xl">
  <p className="text-2xl font-bold text-[#1D1B20]">Card Title</p>
  <p className="text-sm text-[#49454F]">Description text</p>
</div>
```

También admite `--style pairdraw` para el formato JSX nativo (consulta [Renderizador JSX](../jsx-renderer)).

## Exportar HTML

Exporta un fragmento HTML con estilos en línea, de forma predeterminada, o con clases de utilidad de Tailwind:

```sh
pairdraw export design.fig -f html
pairdraw export design.fig -f html --css tailwind
```

Usa `--html standalone` para obtener un documento HTML que se abre en el navegador, con estilos de restablecimiento y un contenedor de página. El HTML independiente está pensado como entrega visual y de código útil, no como sustituto exacto del renderizador:

```sh
pairdraw export design.fig -f html --html standalone --css inline
pairdraw export design.fig -f html --html standalone --css tailwind
pairdraw export design.fig -f html --html standalone --css tailwind --assets external
```

La salida independiente con Tailwind se compila durante la exportación; no depende del runtime de Tailwind en el navegador. Usa `--assets external` para escribir el CSS y las imágenes extraídas junto al archivo HTML. Usa `--fonts assets` con recursos externos para resolver las fuentes de texto detectadas en SceneGraph a través de los proveedores de fuentes web configurados en Pairdraw y emitir archivos `@font-face` locales.

La exportación HTML escribe el nombre de cada capa en el atributo `data-name`. `--no-layer-names` omite los nombres y `--layer-ids` añade el ID de cada capa como `data-pairdraw-node-id` para las herramientas que vinculan el marcado con el documento.

Un tamaño de fuente que Tailwind no nombra como paso (como 40px o 28px) se exporta como valor arbitrario, `text-[40px]`, en lugar de una utilidad como `text-10` que ninguna hoja de estilos genera. Los pasos con nombre y los tamaños vinculados a tokens conservan su clase.

La exportación HTML está disponible en el modo archivo.

### Tokens en el código exportado

HTML y Tailwind JSX escriben las propiedades vinculadas a variables como los tokens de diseño de los que proceden: un relleno vinculado a `Primary` es `background-color: var(--color-primary)` y, en Tailwind, `bg-primary`, o `bg-(--name)` para un token fuera de los espacios de nombres de Tailwind. Una capa fijada en otro modo recibe el atributo de ese modo, como `data-theme="dark"`, para que los tokens se resuelvan como los dibuja el lienzo.

Un valor queda literal cuando CSS no lo reproduciría: la capa ya no dibuja el valor de la variable, el token no tiene unidad donde hace falta una longitud, o la capa está en un modo que solo su propia condición, como una consulta `@media`, puede seleccionar. El HTML independiente incluye la hoja de estilos de los tokens que usa; para fragmentos y JSX, genérala con `pairdraw tokens` (más abajo).

## Tokens de diseño

Escribe las variables del documento como propiedades personalizadas de CSS:

```sh
pairdraw tokens design.fig > tokens.css
pairdraw tokens design.fig --format tailwind > theme.css
pairdraw tokens design.fig --collection Theme --type COLOR
```

El modo predeterminado de cada colección va en `:root`. Cada uno de los demás modos sobrescribe los valores que difieren bajo su condición: `[data-theme="dark"]` para el modo Dark de una colección Theme, o el selector o la consulta `@media` que indique el modo. Los alias siguen siendo referencias `var()` y se vuelven a declarar en cada modo que cambia aquello a lo que apuntan, así que cambiar `data-theme` en cualquier elemento cambia el estilo de todo lo construido sobre él.

```css
:root {
  --color-blue-500: #3b82f5;
  --color-primary: var(--color-blue-500);
}

/* Theme: Dark */
[data-theme='dark'] {
  --color-primary: var(--color-blue-300);
}
```

`--format tailwind` coloca en `@theme` los tokens con un espacio de nombres de Tailwind v4 (`--color-*`, `--spacing-*`, `--radius-*`, `--text-*`, …), para que funcionen `bg-primary` y `rounded-card`, y añade un `@custom-variant` por modo, para que `dark:bg-surface` siga la misma condición. Importa el archivo después de `@import "tailwindcss";`. Los nombres salen de la sintaxis de código de la variable cuando nombra una propiedad personalizada (`--x` o `var(--x)`); si no, de su nombre y su tipo: `Blue/500` como color es `--color-blue-500`.

Los tokens que no se pueden escribir, como las variables booleanas o una condición que no es un selector ni una consulta, se enumeran en stderr y se omiten. El comando funciona en el modo archivo y con la aplicación en ejecución.

### Tokens de diseño del W3C

`--format dtcg` escribe las variables y los estilos como [tokens de diseño del W3C](https://www.designtokens.org/tr/2025.10/format/) en una carpeta:

```sh
pairdraw tokens design.fig --format dtcg --out tokens
```

Cada modo de colección es un archivo, `Theme/Light.tokens.json` y `Theme/Dark.tokens.json`, con la forma que Figma importa como modo: longitudes en `px`, tiempos en `s`, booleanos como números marcados con `com.figma.type` y alias a otra colección que la nombran en `com.figma.aliasData`. Los estilos de texto y de efecto se convierten en tokens de tipografía y de sombra en `styles.tokens.json`, separados porque la importación de Figma rechaza los tokens compuestos. `tokens.resolver.json` es un resolver DTCG que cambia los modos de cada colección y superpone el resto, para herramientas como Style Dictionary. Los campos propios de Pairdraw, como la unidad `rem` de un token, su nombre CSS, sus ámbitos o su expresión `clamp()`, y la condición de cada modo, viajan en `$extensions["dev.pairdraw"]`, de modo que la exportación se vuelve a leer exactamente.

Importa archivos de tokens en un documento con la herramienta `import_design_tokens`, pasando la ruta y el texto de cada archivo:

```sh
jq -Rs --arg p tokens/Tokens/Default.tokens.json '{files:[{path:$p,text:.}]}' \
  tokens/Tokens/Default.tokens.json > args.json
pairdraw tool call import_design_tokens design.fig --args-file args.json --write
```

Lee un archivo por modo agrupado por carpetas, un resolver con los archivos a los que remite o un archivo de Tokens Studio con `$themes`. Las colecciones y los modos con nombres existentes, y las variables y los estilos por nombre, se actualizan; el resto se añade y no se elimina nada. El resultado enumera lo que se añadió, actualizó y omitió, con el motivo de cada omisión.

## Exportar a Storybook

Genera un archivo CSF3 `.stories.ts` por cada conjunto de componentes o componente:

```sh
pairdraw export design.fig -f storybook                      # React stories in ./design-stories/
pairdraw export design.fig -f storybook --framework vue -o src/stories
pairdraw export design.fig -f storybook --css tailwind     # components styled with Tailwind
pairdraw export design.fig -f storybook --framework html --page "Components"
pairdraw export design.pen -f storybook -o src/stories --watch  # re-export on every save
pairdraw export 'src/**/*.pen' -f storybook --beside --watch    # stories next to each design
pairdraw export design.fig -f storybook --rules stories.json    # stories and titles by rule
```

### Menos historias en la barra lateral

Cada archivo de historias empieza con una historia `Default`, la variante que el diseño muestra en reposo, con todos los controles. Cada otra historia de variante o de estado lleva la etiqueta `variant`, y cada archivo lleva las etiquetas `pairdraw` y `page:<page>`, como `page:icons`. El filtro de la barra lateral de Storybook selecciona por estas etiquetas, y `.storybook/main.ts` puede fijar lo que muestra de forma predeterminada, como una historia por componente y ninguna página de iconos:

```ts
const config: StorybookConfig = {
  // …
  tags: {
    variant: { defaultFilterSelection: 'exclude' },
    'page:icons': { excludeFromSidebar: true }
  }
}
```

### Historias y títulos por regla

Lo que las etiquetas no pueden hacer, como omitir componentes o mostrar un conjunto de iconos como galería, lo decide un archivo de reglas. La exportación lee `pairdraw.stories.json` del directorio de trabajo cuando existe, o el archivo que indique `--rules`, y lo vuelve a leer en cada exportación durante la vigilancia:

```json
{
  "rules": [
    { "match": "**", "title": "Design system/{page}/{name}" },
    { "match": "Icons/**", "stories": "gallery" },
    { "match": "**/_*", "stories": "none" }
  ]
}
```

Una regla se aplica a cada archivo de historias cuya ruta `<page>/<name>` coincide con su glob, según los nombres del documento: el de la página y el del conjunto de componentes o del componente, o el prefijo de los componentes con nombres separados por barras, como `Icons/icon`. Todas las reglas que coinciden se aplican en orden, así que una regla posterior sobrescribe a una anterior, cada campo por separado. `generate: false` mantiene historias estáticas en una exportación de Vue o React donde se generaría un componente, por ejemplo para un conjunto de iconos. `stories` es `variants`, una historia por variante o estado, como sin reglas; `single`, solo la historia `Default`; `gallery`, `Default` y una historia `Gallery` que muestra cada variante con su nombre, para historias estáticas; o `none`, que omite el archivo. `title` es el título del archivo, con `{document}`, `{page}`, `{name}` y `{path}` (el título que tendría) sustituidos; los títulos que acaban coincidiendo se mantienen separados como siempre. Las reglas coinciden con los nombres del documento, nunca con un título renombrado, así que renombrar un archivo nunca cambia qué reglas se le aplican.

### Diseños junto a sus historias

Guarda el archivo de diseño de cada componente en la carpeta del componente y exporta con `--beside`: las historias, las imágenes de diseño y el manifiesto `.pairdraw-stories.json` de cada documento van a la carpeta de ese documento, junto al código del componente. Un glob de `stories` de Storybook como `../src/**/*.stories.ts` en `.storybook/main.ts` las recoge sin más configuración.

Pasa varios documentos, o un glob entre comillas como `'src/**/*.pen'` que Pairdraw expande por sí mismo (Node.js 22 o posterior). Varios documentos requieren `--beside` o `--output`; `--page` solo funciona con un documento. Los documentos se exportan uno tras otro y, si uno falla, el resto se exporta igualmente antes de que el comando termine con un error. `--watch` vigila todos los documentos coincidentes; un documento creado después de iniciar la vigilancia requiere ejecutar el comando de nuevo.

Las historias se titulan con el nombre de archivo del documento y, después, con la página cuando más de una página tiene componentes: `pricing.fig` da `pricing/Plan picker`, de modo que los documentos exportados juntos mantienen sus historias separadas. Cada variante de un conjunto de componentes se convierte en una historia y sus propiedades de variante pasan a ser controles `select`, de modo que al cambiar un control se muestra la variante correspondiente. Un conjunto con comportamiento recibe en su lugar las props propias del control: un Switch o un Checkbox un booleano `checked`, un Toggle `pressed`, un Collapsible `open` y `disabled` cuando el conjunto dibuja un estado deshabilitado; hover, pressed y foco siguen siendo historias propias. Los componentes independientes con nombres separados por barras, como `Button/Primary` y `Button/Secondary`, se agrupan en un único archivo `Button` con un control `Variant`. Una combinación para la que el diseño no tiene variante lanza en Storybook un error con nombre en lugar de mostrar otra variante.

Las historias muestran el componente como HTML con estilos en línea, igual que `-f html`, así que no necesitan el runtime de Pairdraw; `--framework` (`react`, `vue` o `html`) solo cambia el contenedor y la importación de `Meta`/`StoryObj` desde `@storybook/react-vite`, `@storybook/vue3-vite` o `@storybook/html-vite`. El texto usa las familias tipográficas del documento: la exportación descarga sus archivos de los proveedores de fuentes web que usa el editor en `pairdraw/<document>/`, con un `fonts.css` que importa cada archivo de historias, de modo que las historias se dibujan con esas fuentes y nunca primero con una alternativa. Las variables de diseño del documento también van allí, como propiedades personalizadas en un `tokens.css` que importa cada archivo de historias, para que los estilos vinculados a variables se resuelvan como los dibuja el diseño. Una familia que no tiene ningún proveedor, como Menlo, recurre a las fuentes del navegador, y la exportación avisa de ello; `--fonts none` no incluye archivos de fuentes. Las historias estáticas aún no exportan las propiedades de texto, booleanas ni de intercambio de instancia.

Con `--framework vue` o `--framework react`, cada conjunto de componentes y cada componente independiente se convierte en un componente real, `<Name>.vue` o `<Name>.tsx` con un `<Name>.module.css` (con `--css tailwind`, utilidades de Tailwind en su marcado y sus estados como variantes del tipo `data-[state=checked]:`, para un proyecto que compile Tailwind v4), salvo los componentes con nombres separados por barras agrupados en un archivo y aquellos para los que una regla fija `"generate": false`, que conservan historias estáticas. Un componente sin comportamiento está formado por los propios elementos del diseño: su raíz es el elemento que dibuja el diseño, un `div` para un marco, y acepta las props propias del elemento raíz, como `onClick` y `class`. Sus propiedades de variante son props que fija como atributos `data-*`, así que una variante `State=hover` es una prop como cualquier otra; sus propiedades booleanas son props booleanas que muestran u ocultan las capas vinculadas a ellas; y sus propiedades de ranura son contenido que muestra en lugar del del diseño, un `<slot>` con nombre en Vue y una prop `ReactNode` en React, que recurre al contenido del diseño. Un componente cuyo comportamiento es un Button, Switch, Checkbox, Toggle, Collapsible, Tabs, Radio group, Toggle group, Accordion, Slider, Progress, Number field, Text field o Textarea se construye sobre Reka UI o sobre el paquete `radix-ui` de Radix UI, y sus estados de interacción, como hover y deshabilitado, se convierten en estilos reales `:hover` y `data-disabled`. Sus variantes se compilan en una hoja de estilos que responde a los estados que fijan Reka y Radix (`data-state`, `data-disabled`, hover y foco), y cada otra propiedad de variante es una prop que el componente fija como atributo `data-*`. En Vue su valor es un `v-model` como `checked` u `open`; en React el componente acepta las props de la raíz de Radix, como `checked`, `defaultChecked` y `onCheckedChange`. Sus propiedades de texto son props de cadena, con las palabras del diseño como valor predeterminado, que dibujan las capas vinculadas a ellas, con un control de texto en sus historias.

Las pestañas (Tabs) toman la pestaña abierta como `value` (`v-model:value`, o `defaultValue` y `onValueChange` en React), nombrada por las palabras de cada disparador convertidas en slug, como `account` o `password`, y empiezan en la primera; cada disparador y su panel son las partes `Tabs` de Reka o Radix alrededor de las capas del diseño, cada disparador se dibuja como los demás disparadores del diseño y adopta el aspecto del primero mientras su pestaña está activa, y las historias reciben un control `select` y una historia por pestaña. Un Radio group, Toggle group o Accordion escribe dos componentes: el grupo, que elige un elemento del mismo modo, empezando por el elemento que el diseño muestra activado, y `<Group>Item`, a partir del conjunto de componentes de sus elementos, construido como la primitiva de elemento del grupo (`RadioGroupItem`, `ToggleGroupItem` o `AccordionItem` con su disparador en una cabecera) y que acepta el `value` que representa. El grupo lo usa una vez por elemento en su ranura de elementos, con el valor de cada elemento, nombrado por su propiedad de etiqueta o, si no, por sus palabras, y sus valores de texto. Un Slider, Progress o Number field vincula su número como `value` (`v-model:value`, o `defaultValue` en React, una lista para el slider de Radix), dentro del rango que fija su comportamiento, empezando donde empieza el diseño; el rango y el tirador del slider y el indicador de progreso descartan la posición en que los dibuja el diseño, porque la fija el valor, y las historias reciben un control de rango y una historia en cada extremo. Un Text field o Textarea dibuja su capa de texto como un `input` o `textarea` nativo que vincula `value`, que en React acepta las props del componente; cuando el diseño dibuja el campo lleno y vacío, las palabras del campo vacío son el placeholder y su aspecto el del placeholder, y el aspecto de lleno se muestra mientras el campo tiene texto. El number field de Reka UI dibuja el campo y los botones de incremento en Vue; Radix no tiene ninguno, así que el de React es un campo numérico nativo cuyos botones lo cambian en un paso y que se ajusta a su rango al salir. El foco en el tirador de un slider o en el campo de entrada de un field dibuja el estado de foco del control. Un Radio solo se genera como elemento de un grupo; un Toggle o un Collapsible usado por sí solo sigue convirtiéndose en su propio componente.

Dentro de un componente generado, una instancia de otro componente generado en la misma exportación usa ese componente en lugar de dibujar sus capas: `<Switch>` importado desde `./Switch.vue` o `./Switch`, fijado a los valores de variante, texto y `disabled` que muestra la instancia. Un control que el diseño dibuja activado, como un interruptor marcado, empieza activado y sigue siendo operable: un `ref` local vinculado con `v-model` en Vue, `defaultChecked` en React. El padre solo lo coloca, así que el control conserva su propio aspecto y sus estilos de estado. Solo usa el componente una instancia que se dibuja exactamente como su variante, salvo por sus valores de propiedades y por dónde la coloca su padre; una con texto editado que ninguna propiedad fija, un relleno propio u otros cambios dibuja sus propias capas, para que la historia conserve lo que muestra el diseño. Las instancias de componentes no exportados, o exportados solo como historias estáticas, se dibujan como antes. Una propiedad de variante cuyo valor predeterminado el documento deja vacío empieza en la variante predeterminada, la de la esquina superior izquierda del conjunto, que abre sus historias. Un icono colocado desde un conjunto, salvo que se hayan editado sus trazados, es el componente de Iconify, `<Icon icon="lucide:bell">` de `@iconify/vue` o `@iconify/react`, que carga el icono al mostrarse.

Una capa rellena con un shader lo reproduce detrás de su contenido con el `<Shader>` de la biblioteca `shaders`, desde `shaders/vue` o `shaders/react`, con cada efecto como hijo con las props del preajuste y la telemetría desactivada (`disableTelemetry`); los navegadores sin WebGPU no muestran nada en su lugar.

Sus historias renderizan el componente, y una función play hace clic en el control y comprueba su estado, así que el proyecto de Storybook necesita tener instalado `reka-ui` o `radix-ui`, además de `@iconify/vue` o `@iconify/react` cuando los componentes contienen iconos, y `shaders` cuando hay capas rellenas con shaders.

Las historias incluyen entradas `parameters.design` para [`@storybook/addon-designs`](https://github.com/storybookjs/addon-designs):

- **Pairdraw**: cuando la ruta del documento está dentro del directorio actual, un [enlace `pairdraw://`](../index#url-scheme) que abre el documento en la aplicación de escritorio y selecciona la variante, o su conjunto de componentes cuando otra capa comparte el nombre de la variante. El esquema direcciona las capas por nombre, así que una historia cuyos nombres de variante y de componente comparten otras capas no recibe enlace.
- **Design**: un PNG a 2× de la variante, escrito en `<Name>.design/` junto a la historia y referenciado con `new URL(…, import.meta.url)`, de modo que Vite lo empaqueta. Copia el parámetro a la historia de tu propio componente para comparar la implementación con el diseño. `--no-design-images` omite el renderizado; la sustitución de fuentes sigue `--font-policy`, como en la exportación raster.

`-o` indica el directorio de salida. Allí, un manifiesto `.pairdraw-stories.json` registra qué documento, como ruta relativa al directorio de salida, y qué página generó cada historia e imagen de diseño; súbelo al repositorio junto con las historias. Una exportación reemplaza los archivos que generó antes una exportación del mismo documento, incluidos los de componentes eliminados o renombrados desde entonces; con `--page`, solo los de esa página. Antes de cambiar nada, se niega a sobrescribir cualquier otro archivo: una historia escrita a mano, la de otro documento o una imagen suelta. Una exportación de una sola página cuyos nombres de archivo han pasado a historias de otra página pide una exportación completa. Sin el manifiesto, las historias existentes se consideran ajenas, así que elimínalas antes de volver a exportar. `--watch` mantiene el comando en ejecución y reexporta cada vez que se guarda el documento, de modo que la recarga en caliente de Storybook sigue al diseño; un guardado que no se puede leer se notifica y la vigilancia continúa. Un `--page` inexistente o una sustitución con `--font-policy strict` sí terminan el comando.

## Modo con la aplicación en ejecución

Omite el archivo para exportar desde la aplicación en ejecución:

```sh
pairdraw export -f png                       # export the selection in the active document
pairdraw export --page "Components" -f png   # export every layer of a page
pairdraw export --node 1:23 -f png           # export one layer, on any page
```

`--page` toma el nombre de una página y `--page-id` el ID de una página de `pairdraw documents list`; ambas exportan esa página sin cambiar la aplicación a ella. Añade `--document-id` para exportar desde un documento distinto del activo.

Este modo admite PNG, JPG, WEBP, SVG y PDF. Las exportaciones a PowerPoint, JSX, HTML, Storybook y `.fig` requieren un archivo como argumento. La exportación de miniaturas en modo archivo aún no es compatible.

Consulta `pairdraw export --help` para ver los formatos y opciones disponibles en la versión instalada.

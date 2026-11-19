---
title: Scripting
description: Ejecutar JavaScript con una API compatible con la Plugin API de Figma para consultar, modificar por lotes y generar diseños.
---

# Scripting

`pairdraw eval` ejecuta JavaScript sobre un documento de Pairdraw con un objeto global `figma` compatible con Figma. Úsalo para ediciones por lotes sin interfaz, inspección, preparación de datos de prueba y automatización sin abrir la interfaz del editor.

## Uso básico

```sh
pairdraw eval design.fig -c "return figma.currentPage.children.length"
```

La opción `-c` acepta JavaScript. Su última expresión es el resultado, así que `return` es opcional; `await` funciona en el nivel superior. Un script cuya última sentencia no es una expresión, como una declaración, no tiene resultado y no imprime nada.

```sh
pairdraw eval design.fig -c "
  const frame = figma.createFrame()
  frame.name = 'Card'
  frame.resize(300, 200)
  frame.layoutMode = 'VERTICAL'
  frame.itemSpacing = 12
  return { id: frame.id, name: frame.name }
"
```

## Fórmulas de variables

Usa `pairdraw.setVariableFormula(collectionName, variableName, source, modeName?)` para sustituir la definición de una variable por una fórmula. Valida la fórmula antes de cambiar el documento y devuelve el valor resuelto. Si omites el nombre del modo, se edita el modo predeterminado de la colección.

```js
pairdraw.setVariableFormula('Spacing', 'large', '{base} * 2')
pairdraw.setVariableFormula('State', 'visible', '{viewport} > 1024 and not {loading}')
pairdraw.setVariableFormula('Copy', 'greeting', 'if({compact}, "Hi", "Hello, " + {name})')
```

Las referencias usan nombres de variables o `{Collection::variable}` y se guardan como identificadores estables. Las fórmulas usan las unidades almacenadas, así que las longitudes están en píxeles. Consulta [Variables](/es/user-guide/variables) para ver los operadores y las limitaciones de exportación.

## Vínculos de variables

`node.setBoundVariable(field, variable)` de Figma vincula con los nombres de campo y las reglas de tipos de Figma. Usa `pairdraw.bindVariable(node, field, variable)` para vincular un campo de una capa a una variable de `figma.variables` como lo hace el panel de capas, y `pairdraw.unbindVariable(node, field)` para soltarlo; el campo conserva el último valor que le dio la variable. Los campos usan los nombres de Pairdraw, como `text`, `visible`, `opacity`, `paddingLeft` o `fills/0/color`. Los vínculos siguen al panel de capas, que acepta más que `setBoundVariable` de Figma: el contenido de texto acepta una variable de texto o de número, mostrando el número como texto, y la visibilidad acepta una variable booleana o una de texto que muestra la capa salvo que esté vacía o diga `false`, `no` u `off`.

```js
const [price] = figma.variables.getLocalVariables('FLOAT')
const label = figma.currentPage.findOne((node) => node.name === 'Price')
pairdraw.bindVariable(label, 'text', price)
```

## Consultar objetos

```sh
pairdraw eval design.fig -c "
  return figma.currentPage
    .findAll((node) => node.type === 'FRAME' && node.name.includes('Button'))
    .map((button) => ({
      id: button.id,
      name: button.name,
      width: button.width,
      height: button.height
    }))
"
```

## Modificar y guardar

Usa `--write` / `-w` para escribir los cambios en el archivo de entrada:

```sh
pairdraw eval design.fig -c "
  figma.currentPage.children.forEach((node) => {
    node.opacity = 0.5
  })
" --write
```

Usa `--output` / `-o` para escribir en un archivo nuevo:

```sh
pairdraw eval design.fig -c "figma.currentPage.name = 'Updated'" -o updated.fig
```

Usa `--preview-output` para escribir, después de ejecutar el script, un PNG de la página que deja como actual:

```sh
pairdraw eval design.fig --stdin --write --preview-output preview.png < transform.js
```

## Leer scripts de stdin

```sh
cat transform.js | pairdraw eval design.fig --stdin --write
```

## Modo con la app en ejecución

Omite la ruta del archivo para ejecutar el script sobre el documento abierto en la aplicación de escritorio:

```sh
pairdraw eval -c "return figma.currentPage.name"
```

La aplicación de escritorio debe estar en ejecución con un documento abierto.

## Salida

De forma predeterminada, la salida que no va a un terminal (TTY) es JSON. Usa `--json` para forzar la salida JSON:

```sh
pairdraw eval design.fig -c "return figma.currentPage.children.map((n) => n.name)" --json
```

Usa `--quiet` / `-q` para suprimir la salida cuando solo escribes un archivo.

## La API `pairdraw`

Junto a `figma`, los scripts reciben `pairdraw`: lo que Pairdraw añade a la Plugin API de Figma, con el mismo estilo. El mismo objeto global está disponible en la herramienta `eval` y en la automatización de la app en ejecución.

Un componente principal o un conjunto de componentes puede [comportarse como un control de Reka UI](/es/user-guide/components#behaviours-and-preview). Vincúlalo mediante los nombres de sus propias propiedades y ranuras:

```sh
pairdraw eval design.fig -w -c '
  const set = figma.currentPage.findOne((n) => n.type === "COMPONENT_SET" && n.name === "Switch")
  const behaviour = pairdraw.setBehaviour(set, "switch")
    .bindValue("value", "State")                          // On and Off guessed from the variants
    .bindPart("thumb", set.findOne((n) => n.name === "Thumb")) // the frame becomes a slot
  behaviour.states = "Interaction"
  behaviour.missing
'
```

- `pairdraw.setBehaviour(node, kindOrSpec)` sustituye el comportamiento de un componente: solo un tipo, o una especificación como `{ kind: "slider", parts: { track: "Track", thumb: "Thumb" }, numbers: { value: { min: 0, max: 10 } } }`. Devuelve el comportamiento.
- `pairdraw.getBehaviour(node)` lee uno, o `null`; una variante lee el de su conjunto.
- Un comportamiento tiene `kind`, `spec` (por nombre), `missing` (valores y partes obligatorios que aún no están vinculados) y `states`, además de `bindValue(valueId, property, { on, off })`, `bindPart(partId, slotNameOrFrame)`, `setNumber(valueId, { min, max, step, default })` y `remove()`.
- `pairdraw.behaviourKinds` enumera todos los tipos con los valores y las partes que vinculan.
- `pairdraw.createSlot(frame)` convierte un marco de un componente principal en una ranura y devuelve su nombre.

Los nombres que el componente no tiene fallan con un error que enumera los que sí tiene.

Los comentarios que la gente deja con la herramienta Comentario forman parte del documento, así que los scripts y los agentes pueden leer las observaciones sobre un archivo, actuar en consecuencia y responder:

```sh
pairdraw eval design.fig -w -c '
  for (const comment of pairdraw.getComments({ resolved: false })) {
    console.log(comment.author, comment.node?.name, comment.text)
    comment.reply("Bumped the title to 24px", { author: "Claude" }).resolve()
  }
'
```

- `pairdraw.getComments(filter)` enumera los hilos del más antiguo al más reciente: todos, o `{ resolved: false }` para los abiertos, `{ page }` para los de una página y `{ author }` para los que una persona empezó o respondió.
- `pairdraw.addComment(text, { node, page, x, y, author })` fija un comentario en una capa, a la que sigue, o en un punto de una página; por defecto, la página actual. `author` es `"Agent"` si se omite.
- Un comentario tiene `id`, `text` (Markdown), `author`, `createdAt`, `resolved`, `page`, `node` (la capa de nivel superior a la que está fijado), `position` y `replies`, además de `reply(text, { author })`, `resolve()`, `reopen()` y `remove()`. `pairdraw.getComment(id)` busca uno.

Los estados indican en qué punto está una sección, un marco, un componente o una instancia, según la lista propia del documento, como Draft, In review o Ready for dev:

```sh
pairdraw eval design.fig -w -c '
  const checkout = figma.currentPage.findOne(n => n.name === "Checkout")
  pairdraw.setStatus(checkout, "Ready for dev")
  pairdraw.statuses.map(status => status.name)
'
```

- `pairdraw.statuses` enumera en orden los estados del documento, cada uno con `name`, `color` (`#RRGGBB`) y `figma`, el estado que Figma muestra para él (`READY_FOR_DEV`, `COMPLETED` o `null`).
- `pairdraw.getStatus(node)` lee el nombre del estado que muestra una capa, o `null`, también mientras una sección que la rodea muestra el suyo.
- `pairdraw.setStatus(node, name)` fija uno por nombre, y `null` lo quita. Solo admiten estado las secciones, los marcos, los componentes, los conjuntos de componentes y las instancias que están directamente en una página o en una sección; cualquier otra cosa falla con un error que explica el motivo, y un nombre desconocido enumera los estados existentes.

Funciones de las capas para las que la API de Figma no tiene miembro:

- `pairdraw.getLayoutDirection(node)` / `setLayoutDirection(node, direction)` y `getTextDirection(node)` / `setTextDirection(node, direction)` leen y fijan el sentido de un auto layout o de un texto: `AUTO`, `LTR` o `RTL`.
- `pairdraw.getFillOkHCL(node, index?)` / `setFillOkHCL(node, color, index?)` y la pareja equivalente para `Stroke` leen y fijan el color de una pintura en OkHCL, `{ h, c, l, a? }`; su RGB lo sigue en el espacio de color del documento.
- `pairdraw.exposeInstanceSwap(instances, candidates, name?)` expone el intercambio de esas instancias como una única propiedad de intercambio de instancia que ofrece los componentes candidatos, y devuelve la capa que la contiene.
- `pairdraw.getFontStatus()` indica si las fuentes de la página actual están disponibles: las variantes solicitadas, de dónde se cargó cada una, las sustituciones y las capas afectadas.

## API admitida

La API se parece a propósito a la Plugin API de Figma, pero se traduce al grafo de escena y al formato de archivo de Pairdraw.

### Documento y páginas

- `figma.root`
- `figma.currentPage`
- `figma.currentPage.selection`
- `figma.getNodeById(id)`
- `figma.createPage()`

### Crear objetos

- `figma.createFrame()`
- `figma.createRectangle()`
- `figma.createEllipse()`
- `figma.createText()`
- `figma.createLine()`
- `figma.createPolygon()`
- `figma.createStar()`
- `figma.createVector()`
- `figma.createNodeFromSvg(svg)`
- `figma.createComponent()`
- `figma.createSection()`

### Operaciones de árbol

- `node.children`
- `node.parent`
- `node.appendChild(child)`
- `node.insertChild(index, child)`
- `node.clone()`
- `node.remove()`
- `node.findAll(callback?)`
- `node.findOne(callback)`
- `node.findChild(callback)`
- `node.findChildren(callback?)`
- `figma.group(nodes, parent)`
- `figma.ungroup(node)`

### Componentes

- `figma.createComponentFromNode(node)`
- `figma.combineAsVariants(components, parent)`: las propiedades salen de nombres como `State=On, Size=Large`
- En un conjunto de componentes, `addComponentProperty(name, 'VARIANT', value)` añade el valor al nombre de cada variante y `editComponentProperty(name, { name })` renombra la propiedad en ellas, y las instancias lo siguen; renombrar una variante actualiza los valores del conjunto, y `variantProperties` lee los valores de una variante o de una instancia
- `component.createInstance()`
- `instance.mainComponent`

### Variables

- `figma.variables.getLocalVariables(type?)`, `getVariableById(id)`, `getLocalVariableCollections()`, `getVariableCollectionById(id)` y sus formas `…Async`
- `figma.variables.createVariableCollection(name)` y `createVariable(name, collection, resolvedType)`, que inicia cada modo con el valor predeterminado de Figma
- `figma.variables.createVariableAlias(variable)` y `setBoundVariableForPaint(paint, 'color', variable)`
- `variable.setValueForMode(modeId, value)`, `valuesByMode`, `resolveForConsumer(node)`, `name`, `description`, `scopes`, `codeSyntax` y `remove()`
- `collection.addMode(name)`, `renameMode(modeId, name)`, `removeMode(modeId)`, `modes`, `defaultModeId`, `variableIds` y `remove()`
- `node.boundVariables`, `node.setBoundVariable(field, variable)`, `node.setExplicitVariableModeForCollection(collection, modeId)` y `node.clearExplicitVariableModeForCollection(collection)`

### Propiedades

Las propiedades habituales de los objetos se pueden leer y escribir a través del proxy, entre ellas:

- Geometría: `x`, `y`, `width`, `height`, `rotation`, `resize(width, height)`
- Apariencia: `fills`, `strokes`, `effects`, `opacity`, `visible`, `locked`, `blendMode`, `clipsContent`. Aquí, en los `backgrounds` de las páginas, en los rangos de texto y en las regiones vectoriales, las pinturas usan la forma de Figma: un `color` sólido es RGB con su alfa en `opacity`, y una imagen indica `scaleMode`, `rotation` y `scalingFactor`; una pintura que Figma rechaza lanza el mensaje de Figma
- Radio: `cornerRadius`, `topLeftRadius`, `topRightRadius`, `bottomRightRadius`, `bottomLeftRadius`
- Texto: `characters`, `fontSize`, `fontName` (con `variationSettings`, cada eje de una fuente variable), `fontWeight` (el eje `wght` de una fuente variable), `fills`, `letterSpacing`, `lineHeight` y `textDecoration`, que leen `figma.mixed` mientras los caracteres difieren y, al fijarlos, cambian el estilo de cada carácter, y la alineación
- Rangos de texto: `getStyledTextSegments(fields, start?, end?)`, y `getRange…` / `setRange…` para `FontSize`, `FontName`, `Fills`, `LetterSpacing`, `LineHeight`, `TextDecoration` con su `Style`, `Offset`, `Thickness`, `Color` y `SkipInk`, `TextCase`, `Hyperlink` (un enlace `{ type: 'URL' | 'NODE', value }`, o `null`), `TextStyleId` y `FillStyleId` (se fijan con `setRangeTextStyleIdAsync` y `setRangeFillStyleIdAsync`, que dan al rango los campos del estilo), y `getRangeBoundVariable` / `setRangeBoundVariable` para los campos de texto que Figma vincula, además de `getRangeFontWeight`, `getRangeAllFontNames` y `getRangeOpenTypeFeatures`. La altura de línea y el espaciado entre letras conservan la unidad en que se fijan, píxeles o un porcentaje del tamaño de fuente que sigue al tamaño, como en Figma; las demás longitudes se leen en píxeles, y un porcentaje pasado a sus setters es relativo al tamaño de fuente
- Listas y párrafos de texto: `getRangeListOptions` / `setRangeListOptions` para elementos con viñetas (`UNORDERED`) y numerados (`ORDERED`), `getRangeIndentation` / `setRangeIndentation` para el anidamiento (de 1 a 5 en los elementos de lista), `listSpacing`, `paragraphSpacing` y `paragraphIndent` para todo el texto (`figma.mixed` cuando los párrafos difieren) o por párrafo con `getRangeListSpacing` / `setRangeListSpacing`, `getRangeParagraphSpacing` / `setRangeParagraphSpacing` y `getRangeParagraphIndent` / `setRangeParagraphIndent`, y `hangingList`
- Auto layout: `layoutMode`, `primaryAxisAlignItems`, `counterAxisAlignItems`, `itemSpacing`, márgenes internos, tamaño y campos de posicionamiento en la disposición
- Trazos: `strokeWeight`, `strokeAlign`, `dashPattern`
- Estado: `devStatus` en secciones, marcos, componentes, conjuntos de componentes e instancias que están directamente en una página o en una sección, como `{ type: 'READY_FOR_DEV' | 'COMPLETED' }` o `null` (no se conserva una descripción); lee `null` mientras la capa está en un lugar donde no puede mostrar uno

### Utilidades

- `figma.mixed`
- `figma.util.rgb(color)`, `figma.util.rgba(color, alphaOverride?)` y `figma.util.solidPaint(color, overrides?)` leen una cadena de color hexadecimal o CSS (`rgb()`, `hsl()`, `lab()`, `oklab()`, `oklch()`, `color(display-p3 …)` o un nombre), recortada a sRGB, o un objeto `{ r, g, b, a? }` con canales de 0 a 1; `solidPaint` toma su color y su opacidad de `color` y sus demás propiedades de `overrides`, como una pintura existente
- `figma.createImage(data)` acepta un PNG, JPEG o GIF de hasta 4096 píxeles por lado y devuelve el `Image` de Figma: su `hash`, `getBytesAsync()` y `getSizeAsync()`; `figma.getImageByHash(hash)` devuelve una imagen almacenada
- `figma.createImageAsync(url)` carga una URL `http(s)://` o un URI de datos. La aplicación de escritorio la descarga a través de su proxy nativo, igual que Figma lo hace a través de sus servidores; en el navegador, el host de la imagen debe permitir solicitudes de origen cruzado
- `figma.loadFontAsync(fontName)` carga la fuente para que el texto se mida y se dibuje con ella; una familia nombrada sin estilo carga todos sus estilos, y una familia variable también sus estilos con nombre. Una fuente que no se puede cargar rechaza la promesa con el mensaje de Figma `The font "Family Style" could not be loaded`
- Como en Figma, una edición que vuelve a maquetar el texto lanza `Cannot write to node with unloaded font` hasta que se cargan todas las fuentes que usa el texto: `characters`, `insertCharacters`, `deleteCharacters`, `fontSize`, espaciados, mayúsculas, decoración, alineación, `textAutoResize`, truncado y los métodos `setRange…` correspondientes. Un `fontName` nuevo también debe estar cargado, pero sustituye al del texto, así que un texto con una fuente que falta puede adoptar una cargada. Las pinturas, los enlaces, el tamaño y las transformaciones no necesitan fuente
- `figma.getFontFamilyVariationAxes(family)` enumera las etiquetas de los ejes de una familia variable, o `null` para una estática; a diferencia de Figma, la familia debe cargarse antes
- Una fuente fijada con `variationSettings` y sin estilo, mediante `fontName` o `setRangeFontName`, toma el estilo con nombre más cercano, y un eje que la familia no tiene lanza el error de Figma
- `figma.listAvailableFontsAsync()` devuelve las fuentes que proporciona el entorno cuando están disponibles
- `figma.getNodeByIdAsync(id)` e `instance.getMainComponentAsync()` se resuelven en los mismos objetos que `figma.getNodeById(id)` e `instance.mainComponent`, para scripts escritos para el modo de páginas dinámicas de Figma
- `figma.setCurrentPageAsync(page)` cambia de página igual que fijar `figma.currentPage`, y `page.loadAsync()` se resuelve de inmediato porque todas las páginas ya están cargadas, para scripts escritos para el modo de páginas dinámicas de Figma
- `figma.notify(message)` registra un aviso en el modo sin interfaz
- `figma.closePlugin(message?)` y `figma.loadAllPagesAsync()` permiten que se ejecute un script escrito como plugin de Figma: no hay nada que cerrar ni cargar, y `closePlugin` pasa su mensaje a `figma.notify`. Figma rechaza cualquier llamada después de `closePlugin`, mientras que aquí el script sigue ejecutándose, así que pon `return` a continuación, como indica la documentación de Figma
- `instance.swapComponent(component)` hace que una instancia apunte a otro componente
- Una capa dentro de una instancia rechaza `x`, `y`, `rotation`, `relativeTransform`, `constraints`, `isMask` y `maskType` con el error de Figma, como `in set_x: This property cannot be overridden in an instance: relative-transform`; esas propiedades siempre siguen al componente. El contenido de las ranuras las conserva, y fijar una en el contenido predeterminado de una ranura hace que la instancia pase a poseer la ranura
- `component.createSlot()` añade un marco de ranura y su propiedad `SLOT`; los marcos de ranura leen `type: 'SLOT'`, `resetSlot()` recupera el contenido del componente en la ranura de una instancia, y `limitViolations` enumera los límites que incumple la ranura de una instancia. `addComponentProperty` y `editComponentProperty` aceptan una `description` y, para las ranuras, `slotSettings`
- `figma.viewport`

## Aún no compatible con Figma

Estas API de Figma todavía no se exponen como funciones compatibles:

- `node.exportAsync()`
- `figma.util.normalizeMarkdown()`, que falla porque Pairdraw no tiene descripciones de texto enriquecido ni anotaciones que normalizar
- Variables de bibliotecas, colecciones extendidas y vínculos de variables en efectos y cuadrículas de diseño
- API de estilos de Figma como `figma.createPaintStyle()` / `figma.createTextStyle()`
- Paridad completa de las operaciones booleanas vectoriales

Cuando estén disponibles, usa los comandos de exportación de la CLI de Pairdraw, las herramientas del núcleo o las funciones directas del grafo de escena.

---
title: Examinar archivos con la CLI
description: Recorrer árboles de objetos, buscar por nombre o tipo y examinar propiedades desde el terminal.
---

# Examinar archivos con la CLI

La CLI permite explorar documentos de diseño sin abrir el editor. Todos los comandos funcionan también con la aplicación en ejecución: basta con omitir el argumento del archivo.

::: tip Instalación

```sh
npm install -g @pairdraw/cli
# or
bun add -g @pairdraw/cli
```

:::

## Información del documento

Obtén un resumen rápido: número de páginas, total de objetos, fuentes usadas y tamaño del archivo:

```sh
pairdraw info design.fig
```

## Diagnóstico de fuentes {#font-diagnostics}

Informa de las variantes tipográficas solicitadas, las fuentes disponibles, las sustituciones y las capas afectadas:

```sh
pairdraw fonts design.fig
pairdraw fonts design.fig --json
pairdraw fonts --document-id tab-123 --page-id 0:1
```

El modo archivo comprueba todas las páginas del documento con las fuentes disponibles en el equipo donde se ejecuta la CLI, sin descargar fuentes en línea. El modo con la aplicación en ejecución informa sobre el documento y la página de la aplicación indicados, cuyas fuentes cargadas pueden diferir de las del equipo de la CLI. Las variantes se notifican como `available`, `substituted` o `unresolved`; la salida JSON incluye `faithful`, `faces` e `issues`.

Usa las [políticas de fuentes de la exportación](./exporting#font-substitution-policy) para avisar de las sustituciones o rechazarlas en las exportaciones raster y PDF a partir de un archivo.

## Árbol de objetos

Imprime la jerarquía completa de objetos:

```sh
pairdraw tree design.fig
```

```
[0] [page] "Getting started" (0:46566)
  [0] [section] "" (0:46567)
    [0] [frame] "Body" (0:46568)
      [0] [frame] "Introduction" (0:46569)
        [0] [frame] "Introduction Card" (0:46570)
          [0] [frame] "Guidance" (0:46571)
```

`--page` elige la página y `--depth` limita la profundidad.

## Buscar objetos

Busca por tipo:

```sh
pairdraw find design.fig --type TEXT
```

Busca por nombre:

```sh
pairdraw find design.fig --name "Button"
```

Ambas opciones se pueden combinar para acotar aún más los resultados.

## Consultar con XPath

Usa selectores XPath para encontrar objetos por tipo, atributos y estructura del árbol:

```sh
pairdraw query design.fig "//FRAME"
```

### Patrones útiles

**Por tipo:**

```sh
pairdraw query design.fig "//TEXT"                    # All text nodes
pairdraw query design.fig "//COMPONENT"               # All components
pairdraw query design.fig "//INSTANCE"                # All instances
```

**Por atributos:**

```sh
pairdraw query design.fig "//FRAME[@width < 300]"                # Frames under 300px wide
pairdraw query design.fig "//*[@cornerRadius > 0]"               # Rounded corners
pairdraw query design.fig "//*[@visible = false]"                # Hidden nodes
pairdraw query design.fig "//TEXT[@fontSize >= 24]"              # Large text
pairdraw query design.fig "//*[@opacity < 1]"                    # Semi-transparent nodes
```

**Por nombre y contenido de texto:**

```sh
pairdraw query design.fig "//TEXT[contains(@name, 'Button')]"    # Name contains 'Button'
pairdraw query design.fig "//TEXT[contains(@text, 'Hello')]"     # Text content contains 'Hello'
```

**Por jerarquía:**

```sh
pairdraw query design.fig "//SECTION//TEXT"            # Text inside sections
pairdraw query design.fig "//FRAME/TEXT"               # Direct text children of frames
pairdraw query design.fig "//COMPONENT_SET//INSTANCE"  # Instances inside component sets
```

### Atributos consultables

`name`, `width`, `height`, `x`, `y`, `visible`, `opacity`, `cornerRadius`, `fontSize`, `fontFamily`, `fontWeight`, `layoutMode`, `itemSpacing`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`, `strokeWeight`, `rotation`, `locked`, `blendMode`, `text`, `lineHeight`, `letterSpacing`

### Ejemplo de salida

```
  Found 5 nodes

[0] [frame] "Logo  92×32" (0:9)
[1] [frame] "logo-short-6  31×32" (0:10)
[2] [frame] "wrapper  128×73" (0:20)
[3] [frame] "pen-drawing  148×52" (0:21)
[4] [frame] "surprised-emoji  32×32" (0:26)
```

## Detalles de un objeto

Examina todas las propiedades de un objeto concreto por su ID:

```sh
pairdraw node design.fig --id 1:23
```

## Páginas

Enumera todas las páginas del documento:

```sh
pairdraw pages design.fig
```

## Variables

Enumera las variables de diseño y sus colecciones:

```sh
pairdraw variables design.fig
```

## Formatos

`pairdraw formats` enumera los formatos de documento y de exportación admitidos.

## Modo con la aplicación en ejecución

Cuando la aplicación de escritorio está abierta, omite el argumento del archivo: la CLI se conecta por RPC y opera sobre el lienzo en vivo:

```sh
pairdraw documents list    # list open document/page IDs
pairdraw tree              # inspect the active live document
pairdraw tree --document-id tab-123 --page-id 0:1
pairdraw eval --document-id tab-123 --page-id 0:1 -c "..."
```

En flujos con agentes, usa `pairdraw documents list --json` y luego pasa `--document-id` y `--page-id` de forma explícita en lugar de depender de la pestaña o página activa visible. Para abrir, guardar, cambiar y cerrar documentos, deshacer, modificar ajustes o llamar a cualquier herramienta del editor, consulta [Controlar la aplicación](/programmable/cli/app-control).

## Revisar diseños con lint

Comprueba los documentos en busca de problemas de nombres, disposición, estructura y accesibilidad:

```sh
pairdraw lint design.fig
pairdraw lint design.pen --preset strict
pairdraw lint design.fig --rule color-contrast
pairdraw lint design.fig --list-rules
pairdraw lint design.fig --fix -o fixed.fig
```

Usa `--json` para una salida legible por máquinas; cada mensaje incluye su `fix` y sus `suggestions` como datos. `--fix` aplica las correcciones seguras (vincular los colores a la variable de color con la que coinciden y redondear la geometría a píxeles enteros) y escribe el resultado en el archivo `.fig` indicado con `-o`.

## Salida JSON

Todos los comandos admiten `--json` para obtener una salida legible por máquinas: pásala a `jq`, a scripts de CI o a otras herramientas:

```sh
pairdraw tree design.fig --json | jq '.[] | .name'
```

Usa `pairdraw --help` o añade `--help` a un subcomando para ver todas las opciones.

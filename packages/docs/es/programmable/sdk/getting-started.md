---
title: Primeros pasos con el SDK
description: Configurar @pairdraw/vue con createEditor, provideEditor y un lienzo.
---

# Primeros pasos con el SDK

## Instalación

```bash
bun add @pairdraw/core @pairdraw/scene-graph @pairdraw/vue canvaskit-wasm
```

El SDK se encuentra en el monorepo y se publica como `@pairdraw/vue`. La versión de desarrollo actual requiere Vue `^3.5.41` y, si usas su dependencia par opcional CanvasKit, `canvaskit-wasm >=0.41.1`. Comprueba los requisitos de dependencias pares del paquete instalado si usas una versión anterior.

```ts
import { createEditor } from '@pairdraw/core'
import { provideEditor } from '@pairdraw/vue'
import { useCanvas } from '@pairdraw/vue/canvas/surface'
```

## Capas de la aplicación

Una aplicación basada en el SDK consta de tres capas:

1. `@pairdraw/core` — el motor del editor, independiente del framework;
2. `@pairdraw/vue` — composables y componentes sin estilos para Vue;
3. la aplicación — estilos, routing, gestión de archivos e interfaz específica del producto.

## Configuración mínima

### 1. Crea un editor

```ts twoslash
// @module: esnext
// @moduleResolution: bundler
// ---cut---
import { reactive } from 'vue'
import { createDefaultEditorState, createEditor } from '@pairdraw/core'
import { SceneGraph } from '@pairdraw/scene-graph'

const graph = new SceneGraph()
const page = graph.getPages()[0]
if (!page) throw new Error('Expected an initial page')

const editor = createEditor({
  graph,
  state: reactive(createDefaultEditorState(page.id)),
  getViewportSize: () => ({ width: 1200, height: 800 }),
})
```

El estado del núcleo es independiente del framework; pasar un estado reactivo permite que los controles de Vue observen los cambios del editor. Para un editor redimensionable, haz que `getViewportSize` devuelva las dimensiones actuales del contenedor del lienzo. `width` y `height` no son propiedades de `EditorOptions`.

Los iconos proceden de Iconify de forma predeterminada. Para servirlos desde otro sitio, como un conjunto empaquetado o autoalojado, pasa un `IconProvider` de `@pairdraw/core/icons` como `icons`; los comandos del editor, su selector de iconos y sus herramientas de IA lo usan.

### 2. Proporciona el editor a los componentes descendientes

```vue
<script setup lang="ts">
import { provideEditor } from '@pairdraw/vue'

import type { Editor } from '@pairdraw/core'

const props = defineProps<{
  editor: Editor
}>()

provideEditor(props.editor)
</script>

<template>
  <slot />
</template>
```

`provideEditor()` permite que todos los componentes situados por debajo accedan a la instancia del editor: puedes verlo como la capa proveedora del árbol del editor. La documentación prefiere llamar directamente a `provideEditor()` porque es la API real actual.

### 3. Conecta el lienzo

```vue
<script setup lang="ts">
import { ref } from 'vue'

import { useCanvas } from '@pairdraw/vue/canvas/surface'
import { useEditor } from '@pairdraw/vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const editor = useEditor()

useCanvas(canvasRef, editor)
</script>

<template>
  <canvas ref="canvasRef" class="size-full" />
</template>
```

## Uso de composables

Después de llamar a `provideEditor()`, los componentes descendientes pueden consultar la selección y ejecutar comandos del editor:

```ts
import { useEditorCommands } from '@pairdraw/vue/editor/commands'
import { useSelectionState } from '@pairdraw/vue/editor/selection-state'

const selection = useSelectionState()
const commands = useEditorCommands()
```

## Ejemplo sencillo

```vue
<script setup lang="ts">
import { ref } from 'vue'

import { useCanvas } from '@pairdraw/vue/canvas/surface'
import { useEditor } from '@pairdraw/vue'
import { useSelectionState } from '@pairdraw/vue/editor/selection-state'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const editor = useEditor()
const { selectedCount } = useSelectionState()

useCanvas(canvasRef, editor, {
  onReady: () => {
    console.log('Canvas ready')
  },
})
</script>

<template>
  <div class="grid h-full grid-rows-[1fr_auto]">
    <canvas ref="canvasRef" class="size-full" />
    <div class="border-t px-3 py-2 text-xs text-muted">
      Selected: {{ selectedCount }}
    </div>
  </div>
</template>
```

## Migrar desde v0.14.0

Estos cambios describen la versión de desarrollo actual; tenlos en cuenta al actualizar a una versión posterior a v0.14.0.

- **Sustituciones del grafo de escena:** sustituye los registros `SceneNode.overrides` por `instanceOverrides`, cuyos mapas `self` y `descendants` distinguen las sustituciones de la instancia y las de sus descendientes. Usa las funciones públicas de sustituciones de `@pairdraw/scene-graph` en lugar de tratarlo como un simple cambio de nombre de campo.
- **Geometría derivada:** renombra `figmaDerivedLayout` a `derivedLayout`, `figmaDerivedTextGlyphs` a `derivedTextGlyphs` y el tipo exportado `FigmaDerivedTextGlyph` a `DerivedTextGlyph`.
- **Proveedores de vínculos:** implementa `getBindingId()` y gestiona `unresolved`. Para `edit-variable`, sustituye `setValue()` por `prepareEdit()`, que captura la clave de edición, el valor, el setter y la función de restauración. Consulta [BindableValue](/programmable/sdk/api/components/bindable-value).
- **Traducciones:** sustituye `useDialogMessages()` y `dialogMessages` por los composables y catálogos del dominio de producto correspondiente, como `useSettingsMessages()` o `useRenameMessages()`. Las claves de los catálogos también se han movido; no basta con renombrar la importación. Consulta [useI18n](./api/composables/use-i18n).
- **CanvasKit:** usa `PathBuilder` para la construcción mutable y conserva los trazados que devuelven las operaciones inmutables de `Path` en lugar de esperar una modificación en el sitio.
- **Herramientas propias:** usa esquemas `input` nativos de Valibot y metadatos de ejecución en lugar de `params`, `ParamDef` o `paramToZod()`. Las integraciones programáticas de MCP usan los tipos de servidor y cliente del MCP SDK v2; consulta [MCP](/programmable/mcp-server).

## Siguientes pasos

- [Arquitectura](./architecture)
- [Referencia de la API](./api/)
- [useEditor](./api/composables/use-editor)
- [useCanvas](./api/composables/use-canvas)
- [useI18n](./api/composables/use-i18n)

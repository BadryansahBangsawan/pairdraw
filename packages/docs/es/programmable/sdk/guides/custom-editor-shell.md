---
title: Interfaz de edición propia
description: Crear una carcasa de editor propia con provideEditor, CanvasRoot, menús, paneles y barras de herramientas.
---

# Interfaz de edición propia

Una aplicación de Pairdraw basada en Vue suele tener tres capas:

1. `@pairdraw/core` crea el editor;
2. `@pairdraw/vue` lo adapta a composables y primitivas sin estilos de Vue;
3. la aplicación representa la carcasa, los estilos y la experiencia propia del producto.

## Por qué importa

La aplicación integrada de Pairdraw es solo una carcasa posible.

Puede crear una muy distinta para un flujo de trabajo concreto: un editor integrado en otro producto, una herramienta interna de recursos, un editor de plantillas, una interfaz de anotación o una superficie de edición asistida por IA con controles propios.

Esa es la razón principal por la que existe el SDK.

## Composición recomendada

Una carcasa práctica suele tener este aspecto:

- el proveedor en la parte superior con `provideEditor()`;
- el lienzo en el centro;
- la navegación por páginas y capas en un lado;
- las propiedades en el otro lado;
- menús y barras de herramientas controlados por composables.

## Ejemplo

```vue
<script setup lang="ts">
import { reactive } from 'vue'
import { createDefaultEditorState, createEditor } from '@pairdraw/core'
import { SceneGraph } from '@pairdraw/scene-graph'
import { provideEditor } from '@pairdraw/vue'
import { CanvasRoot, CanvasSurface } from '@pairdraw/vue/canvas'
import { ToolbarRoot } from '@pairdraw/vue/primitives/Toolbar'
import { PageListRoot } from '@pairdraw/vue/primitives/PageList'

const graph = new SceneGraph()
const page = graph.getPages()[0]
if (!page) throw new Error('Expected an initial page')

const editor = createEditor({
  graph,
  state: reactive(createDefaultEditorState(page.id)),
  getViewportSize: () => ({ width: 1440, height: 900 }),
})
provideEditor(editor)
</script>

<template>
  <div class="grid h-screen grid-cols-[240px_1fr_320px] grid-rows-[48px_1fr]">
    <ToolbarRoot v-slot="{ tools, activeTool, actions }">
      <header class="col-span-3 flex items-center gap-2 border-b px-3">
        <button
          v-for="tool in tools"
          :key="tool.key"
          :data-active="activeTool === tool.key"
          @click="actions.setTool(tool.key)"
        >
          {{ tool.label }}
        </button>
      </header>
    </ToolbarRoot>

    <aside class="border-r">
      <PageListRoot v-slot="{ pages, currentPageId, actions }">
        <nav>
          <button
            v-for="page in pages"
            :key="page.id"
            :data-active="page.id === currentPageId"
            @click="actions.switch(page.id)"
          >
            {{ page.name }}
          </button>
        </nav>
      </PageListRoot>
    </aside>

    <main>
      <CanvasRoot>
        <CanvasSurface class="size-full" />
      </CanvasRoot>
    </main>

    <aside class="border-l">
      Properties panel here
    </aside>
  </div>
</template>
```

Las dimensiones fijas de la vista del ejemplo anterior lo mantienen breve. En una carcasa redimensionable, devuelva desde `getViewportSize` el tamaño real del contenedor del lienzo, sin incluir las barras laterales ni la barra de herramientas que lo rodean. Consulte [Primeros pasos con el SDK](../getting-started) para ver los requisitos de instalación y las notas de migración.

## Por qué funciona esta división

- El SDK se ocupa de la integración con el editor y de la lógica reutilizable sin estilos.
- La aplicación se ocupa de la disposición, los estilos y las acciones propias del producto.
- Los composables pueden alimentar menús y paneles sin componentes envolventes adicionales.

## Véase también

- [provideEditor](../api/composables/provide-editor)
- [useCanvas](../api/composables/use-canvas)
- [ToolbarRoot](../api/components/toolbar-root)
- [PageListRoot](../api/components/page-list-root)
- [LayerTreeRoot](../api/components/layer-tree-root)

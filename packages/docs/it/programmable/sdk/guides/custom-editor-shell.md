---
title: Interfaccia di editing personalizzata
description: Crea una tua interfaccia dell'editor con provideEditor, CanvasRoot, menu, pannelli e barre degli strumenti.
---

# Interfaccia di editing personalizzata

Un'applicazione Vue tipica basata su Pairdraw ha tre livelli:

1. `@pairdraw/core` crea l'editor
2. `@pairdraw/vue` lo adatta in composable Vue e componenti senza stile
3. la tua applicazione disegna il contenitore, gli stili e l'esperienza specifica del prodotto

## Perché è importante

L'applicazione Pairdraw integrata è solo una delle interfacce possibili.

Puoi costruirne una molto diversa per un flusso di lavoro mirato: un editor incorporato in un altro prodotto, uno strumento interno per le risorse, un editor di template, un'interfaccia di annotazione o una superficie di editing assistita dall'AI con controlli personalizzati.

È il motivo principale per cui esiste l'SDK.

## Composizione consigliata

In pratica un'interfaccia ha spesso questa forma:

- il provider in cima, con `provideEditor()`
- l'area di lavoro al centro
- la navigazione tra pagine e livelli su un lato
- le proprietà sull'altro lato
- menu e barre degli strumenti guidati da composable

## Esempio

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

Le dimensioni fisse del viewport nell'esempio servono solo a tenerlo breve. In un'interfaccia ridimensionabile, fai restituire a `getViewportSize` la dimensione reale del contenitore dell'area di lavoro, senza includere le barre laterali o la barra degli strumenti. Per i requisiti di installazione e le note di migrazione vedi [Primi passi con l'SDK](../getting-started).

## Perché questa divisione funziona

- l'SDK si occupa dell'integrazione con l'editor e della logica riutilizzabile senza stile
- la tua applicazione si occupa di disposizione, stili e azioni specifiche del prodotto
- i composable possono alimentare menu e pannelli senza componenti contenitore aggiuntivi

## Vedi anche

- [provideEditor](../api/composables/provide-editor)
- [useCanvas](../api/composables/use-canvas)
- [ToolbarRoot](../api/components/toolbar-root)
- [PageListRoot](../api/components/page-list-root)
- [LayerTreeRoot](../api/components/layer-tree-root)

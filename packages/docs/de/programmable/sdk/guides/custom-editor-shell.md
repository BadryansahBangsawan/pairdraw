---
title: Eigene Editor-Oberfläche
description: Eine eigene Oberfläche mit provideEditor, CanvasRoot, Menüs, Panels und Toolbars entwickeln.
---

# Eigene Editor-Oberfläche

Eine Pairdraw-Anwendung mit Vue besteht typischerweise aus drei Schichten:

1. `@pairdraw/core` erstellt den Editor;
2. `@pairdraw/vue` verbindet ihn mit Vue Composables und Komponenten ohne vorgegebenes Erscheinungsbild;
3. die Anwendung bestimmt Anordnung, Gestaltung und produktspezifisches Verhalten.

## Mögliche Anwendungen

Die fertige Pairdraw-App ist nur eine mögliche Oberfläche.

Für einen bestimmten Arbeitsablauf können Sie eine ganz andere entwickeln: einen in ein anderes Produkt eingebetteten Editor, ein internes Werkzeug für Assets, einen Vorlageneditor, eine Oberfläche für Anmerkungen oder eine KI-gestützte Bearbeitungsoberfläche mit eigenen Steuerelementen.

Genau dafür gibt es das SDK.

## Empfohlene Struktur

Eine typische Oberfläche:

- ruft `provideEditor()` weit oben im Komponentenbaum auf;
- platziert die Arbeitsfläche in der Mitte;
- zeigt die Navigation für Seiten und Ebenen auf einer Seite;
- zeigt Eigenschaften auf der gegenüberliegenden Seite;
- steuert Menüs und Werkzeugleisten über Composables.

## Beispiel

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

Die festen Abmessungen des Viewports oben halten das Beispiel kurz. Geben Sie in einer Oberfläche mit veränderlicher Größe über `getViewportSize` die tatsächliche Größe des Canvas-Containers zurück, ohne umgebende Seitenleisten oder Werkzeugleiste. Installationsvoraussetzungen und Hinweise zur Migration finden Sie unter [Erste Schritte mit dem SDK](../getting-started).

## Warum diese Aufteilung funktioniert

- Das SDK übernimmt die Integration mit dem Editor und wiederverwendbare, gestaltungsunabhängige Logik.
- Die Anwendung übernimmt Anordnung, Gestaltung und eigene Aktionen.
- Composables stellen Menüs und Panels die benötigten Daten bereit, ohne zusätzliche Hüllkomponenten zu erzwingen.

## Siehe auch

- [provideEditor](../api/composables/provide-editor)
- [useCanvas](../api/composables/use-canvas)
- [ToolbarRoot](../api/components/toolbar-root)
- [PageListRoot](../api/components/page-list-root)
- [LayerTreeRoot](../api/components/layer-tree-root)

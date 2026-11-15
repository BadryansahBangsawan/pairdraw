---
title: Własny interfejs edytora
description: Tworzenie własnego interfejsu edytora za pomocą provideEditor, CanvasRoot, menu, paneli i pasków narzędzi.
---

# Własny interfejs edytora

Typowa aplikacja Pairdraw oparta na Vue składa się z trzech warstw:

1. `@pairdraw/core` tworzy edytor;
2. `@pairdraw/vue` łączy go z composables i komponentami Vue bez narzuconego wyglądu;
3. aplikacja określa układ, wygląd i zachowanie właściwe dla produktu.

## Dlaczego warto rozdzielić te warstwy

Gotowa aplikacja Pairdraw jest tylko jednym z możliwych interfejsów.

Na podstawie SDK można utworzyć edytor osadzony w innym produkcie, wewnętrzne narzędzie do pracy z zasobami, edytor szablonów, interfejs do adnotacji albo wspomagany przez AI interfejs edycji z własnymi kontrolkami.

To główny powód, dla którego istnieje SDK.

## Zalecana struktura

Wygodny interfejs zwykle:

- wywołuje `provideEditor()` wysoko w drzewie komponentów;
- umieszcza obszar roboczy pośrodku;
- pokazuje strony i warstwy na jednym panelu bocznym;
- pokazuje właściwości na drugim panelu;
- steruje menu i paskami narzędzi za pomocą composables.

## Przykład

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

Stałe wymiary widoku w przykładzie skracają kod. W interfejsie o zmiennym rozmiarze `getViewportSize` powinno zwracać rzeczywisty rozmiar kontenera obszaru roboczego, bez otaczających paneli bocznych i paska narzędzi. Wymagania instalacyjne i uwagi o migracji opisuje strona [Pierwsze kroki z SDK](../getting-started).

## Dlaczego ten podział działa

- SDK odpowiada za integrację z edytorem i logikę niezależną od wyglądu, przeznaczoną do ponownego użycia.
- Aplikacja odpowiada za układ, wygląd i operacje właściwe dla konkretnego produktu.
- Composables pozwalają podłączać menu i panele bez zbędnych komponentów opakowujących.

## Zobacz też

- [provideEditor](../api/composables/provide-editor)
- [useCanvas](../api/composables/use-canvas)
- [ToolbarRoot](../api/components/toolbar-root)
- [PageListRoot](../api/components/page-list-root)
- [LayerTreeRoot](../api/components/layer-tree-root)

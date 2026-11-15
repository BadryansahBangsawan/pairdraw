---
title: Собственный интерфейс редактора
description: Создание собственного интерфейса редактора с provideEditor, CanvasRoot, меню, панелями и панелями инструментов.
---

# Собственный интерфейс редактора

Типичное приложение Pairdraw на Vue состоит из трёх уровней:

1. `@pairdraw/core` создаёт редактор;
2. `@pairdraw/vue` связывает его с composables и компонентами Vue без встроенного оформления;
3. приложение определяет компоновку, оформление и характерное для продукта поведение.

## Зачем разделять эти уровни

Готовое приложение Pairdraw — лишь один из возможных интерфейсов.

Для узкой задачи можно создать совсем другой: встроенный редактор внутри другого продукта, внутренний инструмент для работы с ресурсами, редактор шаблонов, интерфейс аннотирования или поверхность для редактирования с ИИ и собственными элементами управления.

Именно для этого SDK и существует.

## Рекомендуемая структура

Удобно строить интерфейс следующим образом:

- вызвать `provideEditor()` в верхней части дерева компонентов;
- разместить холст в центре;
- вывести страницы и слои на одной боковой панели;
- вывести свойства на другой боковой панели;
- управлять меню и панелями инструментов с помощью composables.

## Пример

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

Фиксированные размеры области просмотра выше сокращают пример. В интерфейсе с изменяемым размером возвращайте из `getViewportSize` фактический размер контейнера холста, без окружающих боковых панелей и панели инструментов. Требования к установке и заметки о переходе приведены в разделе [Начало работы с SDK](../getting-started).

## Почему такое разделение работает

- SDK отвечает за интеграцию с редактором и переиспользуемую логику без привязки к оформлению;
- приложение отвечает за компоновку, оформление и действия, характерные для конкретного продукта;
- composables позволяют подключать меню и панели без лишних компонентов-обёрток.

## См. также

- [provideEditor](../api/composables/provide-editor)
- [useCanvas](../api/composables/use-canvas)
- [ToolbarRoot](../api/components/toolbar-root)
- [PageListRoot](../api/components/page-list-root)
- [LayerTreeRoot](../api/components/layer-tree-root)

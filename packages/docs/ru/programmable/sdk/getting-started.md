---
title: Начало работы с SDK
description: Подключение @pairdraw/vue через createEditor, provideEditor и холст.
---

# Начало работы с SDK

## Установка

```bash
bun add @pairdraw/core @pairdraw/scene-graph @pairdraw/vue canvaskit-wasm
```

SDK находится в монорепозитории и опубликован как пакет `@pairdraw/vue`. Текущая версия для разработки требует Vue `^3.5.41`, а при использовании необязательной зависимости CanvasKit — `canvaskit-wasm >=0.41.1`. Для более старого выпуска проверьте требования к peer-зависимостям установленного пакета.

```ts
import { createEditor } from '@pairdraw/core'
import { provideEditor } from '@pairdraw/vue'
import { useCanvas } from '@pairdraw/vue/canvas/surface'
```

## Из чего состоит приложение

В приложении на базе SDK три уровня:

1. `@pairdraw/core` — движок редактора, не зависящий от фреймворка;
2. `@pairdraw/vue` — composables и компоненты без предустановленных стилей для Vue;
3. ваше приложение — оформление, маршрутизация, работа с файлами и интерфейс продукта.

## Минимальная настройка

### 1. Создайте редактор

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

Состояние ядра не зависит от фреймворка; если передать реактивное состояние, элементы управления Vue смогут отслеживать изменения редактора. Для редактора с изменяемым размером пусть `getViewportSize` возвращает текущие размеры контейнера холста. `width` и `height` не являются свойствами `EditorOptions`.

По умолчанию иконки берутся из Iconify. Чтобы загружать их из другого места, например из встроенного в сборку или размещённого у себя набора, передайте `IconProvider` из `@pairdraw/core/icons` в параметре `icons`: его используют команды редактора, выбор иконок и инструменты ИИ.

### 2. Передайте редактор дочерним компонентам Vue

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

`provideEditor()` можно считать уровнем провайдера для дерева редактора: он делает экземпляр редактора доступным во всём расположенном ниже дереве компонентов. В документации используется прямой вызов этой функции, поскольку именно он входит в актуальный публичный API.

### 3. Подключите холст

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

## Использование composables

После вызова `provideEditor()` дочерние компоненты могут получать сведения о выделении и выполнять команды редактора:

```ts
import { useEditorCommands } from '@pairdraw/vue/editor/commands'
import { useSelectionState } from '@pairdraw/vue/editor/selection-state'

const selection = useSelectionState()
const commands = useEditorCommands()
```

## Простой пример

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

## Переход с v0.14.0

Эти изменения относятся к текущей версии для разработки; учитывайте их при обновлении с v0.14.0 на более новую версию.

- **Переопределения в графе сцены:** замените записи `SceneNode.overrides` на `instanceOverrides`, где карты `self` и `descendants` разделяют переопределения уровня экземпляра и вложенных объектов. Используйте публичные вспомогательные функции для переопределений из `@pairdraw/scene-graph`, а не считайте это простым переименованием поля.
- **Производная геометрия:** переименуйте `figmaDerivedLayout` в `derivedLayout`, `figmaDerivedTextGlyphs` в `derivedTextGlyphs`, а экспортируемый тип `FigmaDerivedTextGlyph` — в `DerivedTextGlyph`.
- **Поставщики привязок:** реализуйте `getBindingId()` и обрабатывайте `unresolved`. Для `edit-variable` замените `setValue()` на `prepareEdit()`, который фиксирует ключ правки, значение, сеттер и функцию восстановления. См. [BindableValue](/programmable/sdk/api/components/bindable-value).
- **Переводы:** замените `useDialogMessages()` и `dialogMessages` на composables и каталоги соответствующих продуктовых областей, например `useSettingsMessages()` или `useRenameMessages()`. Ключи каталогов тоже переместились, поэтому одного переименования импорта недостаточно. См. [useI18n](./api/composables/use-i18n).
- **CanvasKit:** используйте `PathBuilder` для изменяемого построения и сохраняйте контуры, которые возвращают неизменяемые операции `Path`, вместо того чтобы ожидать изменения на месте.
- **Собственные инструменты:** используйте собственные схемы Valibot `input` и метаданные выполнения вместо `params`, `ParamDef` или `paramToZod()`. Программные интеграции MCP используют типы сервера и клиента MCP SDK v2; см. [MCP](/programmable/mcp-server).

## Что читать дальше

- [Архитектура](./architecture)
- [Справочник API](./api/)
- [useEditor](./api/composables/use-editor)
- [useCanvas](./api/composables/use-canvas)
- [useI18n](./api/composables/use-i18n)

---
title: Pierwsze kroki z SDK
description: Podłącz @pairdraw/vue, utwórz edytor i skonfiguruj obszar roboczy.
---

# Pierwsze kroki z SDK

## Instalacja

```bash
bun add @pairdraw/core @pairdraw/vue canvaskit-wasm
```

SDK znajduje się w monorepo Pairdraw i jest publikowany jako pakiet `@pairdraw/vue`.

```ts
import { createEditor } from '@pairdraw/core'
import { provideEditor } from '@pairdraw/vue'
import { useCanvas } from '@pairdraw/vue/canvas/surface'
```

## Warstwy aplikacji

Aplikacja oparta na SDK składa się z trzech warstw:

1. `@pairdraw/core` — silnik edytora niezależny od frameworka;
2. `@pairdraw/vue` — composables i komponenty bez narzuconego wyglądu dla Vue;
3. aplikacja — wygląd, routing, obsługa plików i interfejs produktu.

## Minimalna konfiguracja

### 1. Utwórz edytor

```ts
import { createEditor } from '@pairdraw/core'

const editor = createEditor({
  width: 1200,
  height: 800,
})
```

### 2. Udostępnij edytor komponentom potomnym

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

`provideEditor()` udostępnia instancję edytora wszystkim komponentom znajdującym się niżej w drzewie. Dokumentacja wywołuje tę funkcję bezpośrednio, ponieważ należy ona do aktualnego publicznego API.

### 3. Podłącz obszar roboczy

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

## Korzystanie z composables

Po wywołaniu `provideEditor()` komponenty potomne mogą odczytywać zaznaczenie i wykonywać polecenia edytora:

```ts
import { useEditorCommands } from '@pairdraw/vue/editor/commands'
import { useSelectionState } from '@pairdraw/vue/editor/selection-state'

const selection = useSelectionState()
const commands = useEditorCommands()
```

## Prosty przykład

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
      Zaznaczono: {{ selectedCount }}
    </div>
  </div>
</template>
```

## Co dalej

- [Architektura](./architecture)
- [Dokumentacja API](./api/)
- [useEditor](./api/composables/use-editor)
- [useCanvas](./api/composables/use-canvas)
- [useI18n](./api/composables/use-i18n)

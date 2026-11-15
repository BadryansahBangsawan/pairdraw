---
title: Pierwsze kroki z SDK
description: Podłącz @pairdraw/vue, utwórz edytor i skonfiguruj obszar roboczy.
---

# Pierwsze kroki z SDK

## Instalacja

```bash
bun add @pairdraw/core @pairdraw/scene-graph @pairdraw/vue canvaskit-wasm
```

SDK znajduje się w monorepo Pairdraw i jest publikowany jako pakiet `@pairdraw/vue`. Bieżąca wersja rozwojowa wymaga Vue `^3.5.41`, a przy użyciu opcjonalnej zależności równorzędnej CanvasKit także `canvaskit-wasm >=0.41.1`. Przy starszym wydaniu sprawdź wymagania zależności równorzędnych zainstalowanego pakietu.

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

Stan rdzenia jest niezależny od frameworka; przekazanie reaktywnego stanu pozwala kontrolkom Vue obserwować zmiany w edytorze. W edytorze o zmiennym rozmiarze `getViewportSize` powinno zwracać bieżące wymiary kontenera obszaru roboczego. `width` i `height` nie są właściwościami `EditorOptions`.

Ikony domyślnie pochodzą z Iconify. Aby serwować je z innego źródła, na przykład z zestawu dołączonego do aplikacji lub hostowanego samodzielnie, przekaż jako `icons` obiekt `IconProvider` z `@pairdraw/core/icons`; korzystają z niego polecenia edytora, wybór ikon i narzędzia AI.

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

Można to traktować jako warstwę dostawcy dla drzewa edytora: `provideEditor()` udostępnia instancję wszystkim komponentom znajdującym się niżej. Dokumentacja wywołuje tę funkcję bezpośrednio, ponieważ to ona stanowi obecne, rzeczywiste API.

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

## Podstawowy przykład

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

## Migracja z v0.14.0

Poniższe zmiany dotyczą bieżącej wersji rozwojowej; uwzględnij je przy aktualizacji powyżej v0.14.0.

- **Nadpisania w grafie sceny:** zastąp rekordy `SceneNode.overrides` polem `instanceOverrides`, którego mapy `self` i `descendants` rozróżniają nadpisania na poziomie instancji i elementów potomnych. Korzystaj z publicznych funkcji nadpisań z `@pairdraw/scene-graph`, zamiast traktować to jako zwykłą zmianę nazwy pola.
- **Geometria pochodna:** zmień nazwę `figmaDerivedLayout` na `derivedLayout`, `figmaDerivedTextGlyphs` na `derivedTextGlyphs`, a eksportowanego typu `FigmaDerivedTextGlyph` na `DerivedTextGlyph`.
- **Dostawcy powiązań:** zaimplementuj `getBindingId()` i obsłuż `unresolved`. W przypadku `edit-variable` zastąp `setValue()` funkcją `prepareEdit()`, która przechwytuje klucz edycji, wartość, funkcję ustawiającą i wywołanie przywracające. Zobacz [BindableValue](/programmable/sdk/api/components/bindable-value).
- **Tłumaczenia:** zastąp `useDialogMessages()` i `dialogMessages` odpowiednimi composables i katalogami dziedzin produktu, takimi jak `useSettingsMessages()` lub `useRenameMessages()`. Klucze katalogów również zostały przeniesione, więc nie wystarczy zmienić importu. Zobacz [useI18n](./api/composables/use-i18n).
- **CanvasKit:** do budowy modyfikowalnych ścieżek używaj `PathBuilder` i zachowuj ścieżki zwracane przez niezmienne operacje `Path`, zamiast oczekiwać zmian w miejscu.
- **Własne narzędzia:** zamiast `params`, `ParamDef` czy `paramToZod()` używaj natywnych schematów Valibot `input` i metadanych wykonania. Programowe integracje MCP korzystają z typów serwera i klienta MCP SDK v2; zobacz [MCP](/programmable/mcp-server).

## Co dalej

- [Architektura](./architecture)
- [Dokumentacja API](./api/)
- [useEditor](./api/composables/use-editor)
- [useCanvas](./api/composables/use-canvas)
- [useI18n](./api/composables/use-i18n)

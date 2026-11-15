---
title: Primi passi con l'SDK
description: Configura @pairdraw/vue con createEditor, provideEditor e un'area di lavoro.
---

# Primi passi con l'SDK

## Installazione

```bash
bun add @pairdraw/core @pairdraw/scene-graph @pairdraw/vue canvaskit-wasm
```

L'SDK si trova nel monorepo ed è pubblicato come `@pairdraw/vue`. La versione di sviluppo attuale richiede Vue `^3.5.41` e, se usi la dipendenza peer facoltativa CanvasKit, `canvaskit-wasm >=0.41.1`. Con una release precedente controlla i requisiti peer del pacchetto installato.

```ts
import { createEditor } from '@pairdraw/core'
import { provideEditor } from '@pairdraw/vue'
import { useCanvas } from '@pairdraw/vue/canvas/surface'
```

## Modello mentale

Ci sono tre livelli:

1. `@pairdraw/core` — il motore dell'editor, indipendente dal framework
2. `@pairdraw/vue` — composable Vue e componenti senza stile
3. la tua applicazione — stili, routing, gestione dei file e interfaccia specifica del prodotto

## Configurazione minima

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

Lo stato del nucleo è indipendente dal framework; passare uno stato reattivo permette ai controlli Vue di osservare le modifiche dell'editor. Per un editor ridimensionabile, fai restituire a `getViewportSize` le dimensioni attuali del contenitore dell'area di lavoro. `width` e `height` non sono proprietà di `EditorOptions`.

Per impostazione predefinita le icone arrivano da Iconify. Per servirle da un'altra fonte, come un set incluso nel bundle o ospitato da te, passa come `icons` un `IconProvider` di `@pairdraw/core/icons`; lo usano i comandi dell'editor, il suo selettore di icone e i suoi strumenti di AI.

### 2. Rendilo disponibile a Vue

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

Puoi considerarlo il livello provider dell'albero dell'editor. La documentazione preferisce chiamare direttamente `provideEditor()` perché è la vera API attuale.

### 3. Collega un'area di lavoro

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

## Usare i composable

Una volta fornito l'editor, i componenti figli possono leggere la selezione ed eseguire comandi:

```ts
import { useEditorCommands } from '@pairdraw/vue/editor/commands'
import { useSelectionState } from '@pairdraw/vue/editor/selection-state'

const selection = useSelectionState()
const commands = useEditorCommands()
```

## Esempio di base

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

## Migrare dalla v0.14.0

Queste modifiche descrivono la versione di sviluppo attuale; applicale quando aggiorni oltre la v0.14.0.

- **Override nel grafo della scena:** sostituisci i record `SceneNode.overrides` con `instanceOverrides`, le cui mappe `self` e `descendants` distinguono gli override a livello di istanza da quelli dei discendenti. Usa le funzioni pubbliche per gli override di `@pairdraw/scene-graph` invece di trattarlo come una semplice ridenominazione di un campo.
- **Geometria derivata:** rinomina `figmaDerivedLayout` in `derivedLayout`, `figmaDerivedTextGlyphs` in `derivedTextGlyphs` e il tipo esportato `FigmaDerivedTextGlyph` in `DerivedTextGlyph`.
- **Provider dei collegamenti:** implementa `getBindingId()` e gestisci `unresolved`. Per `edit-variable`, sostituisci `setValue()` con `prepareEdit()`, che cattura chiave della modifica, valore, setter e callback di ripristino. Vedi [BindableValue](/programmable/sdk/api/components/bindable-value).
- **Traduzioni:** sostituisci `useDialogMessages()` e `dialogMessages` con i composable e i cataloghi del dominio di prodotto pertinente, come `useSettingsMessages()` o `useRenameMessages()`. Anche le chiavi dei cataloghi sono state spostate: non basta rinominare l'import. Vedi [useI18n](./api/composables/use-i18n).
- **CanvasKit:** usa `PathBuilder` per la costruzione modificabile e conserva i percorsi restituiti dalle operazioni immutabili di `Path`, invece di aspettarti una modifica sul posto.
- **Strumenti personalizzati:** usa schemi `input` nativi di Valibot e i metadati di esecuzione al posto di `params`, `ParamDef` o `paramToZod()`. Le integrazioni MCP programmatiche usano i tipi server/client dell'SDK MCP v2; vedi [MCP](/programmable/mcp-server).

## Passaggi successivi

- [Architettura](./architecture)
- [Riferimento API](./api/)
- [useEditor](./api/composables/use-editor)
- [useCanvas](./api/composables/use-canvas)
- [useI18n](./api/composables/use-i18n)

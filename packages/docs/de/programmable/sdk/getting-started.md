---
title: Erste Schritte mit dem SDK
description: Binden Sie @pairdraw/vue ein, erstellen Sie einen Editor und richten Sie die Arbeitsfläche ein.
---

# Erste Schritte mit dem SDK

## Installation

```bash
bun add @pairdraw/core @pairdraw/scene-graph @pairdraw/vue canvaskit-wasm
```

Das SDK befindet sich im Pairdraw-Monorepo und wird als Paket `@pairdraw/vue` veröffentlicht. Die aktuelle Entwicklungsversion benötigt Vue `^3.5.41` und, wenn Sie den optionalen Peer CanvasKit verwenden, `canvaskit-wasm >=0.41.1`. Prüfen Sie bei einer älteren Version die Peer-Anforderungen des installierten Pakets.

```ts
import { createEditor } from '@pairdraw/core'
import { provideEditor } from '@pairdraw/vue'
import { useCanvas } from '@pairdraw/vue/canvas/surface'
```

## Anwendungsebenen

Eine Anwendung auf Grundlage des SDK besteht aus drei Ebenen:

1. `@pairdraw/core` — die vom Framework unabhängige Editor-Engine;
2. `@pairdraw/vue` — Composables und Komponenten ohne vorgegebenes Erscheinungsbild für Vue;
3. die Anwendung — Gestaltung, Routing, Dateiverwaltung und produktspezifische Oberfläche.

## Minimale Einrichtung

### 1. Editor erstellen

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

Der Zustand im Core ist vom Framework unabhängig; wenn Sie einen reaktiven Zustand übergeben, können Vue-Steuerelemente Änderungen am Editor beobachten. Bei einem Editor mit veränderlicher Größe sollte `getViewportSize` die aktuellen Abmessungen des Canvas-Containers zurückgeben. `width` und `height` sind keine Eigenschaften von `EditorOptions`.

Symbole stammen standardmäßig von Iconify. Um sie aus einer anderen Quelle bereitzustellen, etwa aus einem gebündelten oder selbst gehosteten Satz, übergeben Sie einen `IconProvider` aus `@pairdraw/core/icons` als `icons`; die Befehle des Editors, seine Symbolauswahl und seine KI-Werkzeuge verwenden ihn gleichermaßen.

### 2. Editor für untergeordnete Komponenten bereitstellen

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

`provideEditor()` stellt die Editor-Instanz allen darunterliegenden Komponenten zur Verfügung; Sie können es sich als Provider-Ebene des Editor-Baums vorstellen. Die Dokumentation ruft diese Funktion direkt auf, da sie zur aktuellen öffentlichen API gehört.

### 3. Arbeitsfläche anbinden

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

## Composables verwenden

Nach dem Aufruf von `provideEditor()` können untergeordnete Komponenten die Auswahl auslesen und Editor-Befehle ausführen:

```ts
import { useEditorCommands } from '@pairdraw/vue/editor/commands'
import { useSelectionState } from '@pairdraw/vue/editor/selection-state'

const selection = useSelectionState()
const commands = useEditorCommands()
```

## Einfaches Beispiel

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

## Migration von v0.14.0

Diese Änderungen beschreiben die aktuelle Entwicklungsversion; berücksichtigen Sie sie beim Upgrade über v0.14.0 hinaus.

- **Überschreibungen im SceneGraph:** Ersetzen Sie `SceneNode.overrides`-Einträge durch `instanceOverrides`, dessen Maps `self` und `descendants` Überschreibungen auf Instanzebene und an untergeordneten Objekten unterscheiden. Verwenden Sie die öffentlichen Hilfsfunktionen für Überschreibungen aus `@pairdraw/scene-graph`, statt dies als einfache Umbenennung eines Felds zu behandeln.
- **Abgeleitete Geometrie:** Benennen Sie `figmaDerivedLayout` in `derivedLayout`, `figmaDerivedTextGlyphs` in `derivedTextGlyphs` und den exportierten Typ `FigmaDerivedTextGlyph` in `DerivedTextGlyph` um.
- **Binding-Provider:** Implementieren Sie `getBindingId()` und behandeln Sie `unresolved`. Ersetzen Sie bei `edit-variable` `setValue()` durch `prepareEdit()`, das Bearbeitungsschlüssel, Wert, Setter und Wiederherstellungs-Callback erfasst. Siehe [BindableValue](/programmable/sdk/api/components/bindable-value).
- **Übersetzungen:** Ersetzen Sie `useDialogMessages()` und `dialogMessages` durch die passenden Composables und Kataloge des jeweiligen Produktbereichs, etwa `useSettingsMessages()` oder `useRenameMessages()`. Auch die Katalogschlüssel wurden verschoben; benennen Sie also nicht nur den Import um. Siehe [useI18n](./api/composables/use-i18n).
- **CanvasKit:** Verwenden Sie `PathBuilder` für veränderliche Konstruktion und übernehmen Sie die zurückgegebenen Pfade unveränderlicher `Path`-Operationen, statt eine Änderung an Ort und Stelle zu erwarten.
- **Eigene Werkzeuge:** Verwenden Sie native Valibot-Schemas für `input` und Ausführungsmetadaten statt `params`, `ParamDef` oder `paramToZod()`. Programmatische MCP-Integrationen verwenden die Server- und Client-Typen des MCP SDK v2; siehe [MCP](/programmable/mcp-server).

## Nächste Schritte

- [Architektur](./architecture)
- [API-Referenz](./api/)
- [useEditor](./api/composables/use-editor)
- [useCanvas](./api/composables/use-canvas)
- [useI18n](./api/composables/use-i18n)

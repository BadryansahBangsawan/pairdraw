---
title: GradientEditorStop
description: Barrierefreie Komponente für einen ausgewählten oder ziehbaren Verlaufspunkt.
---

<script setup lang="ts">
import { data } from '#docs-api/components/gradient-editor-stop.data'
</script>

# GradientEditorStop

`GradientEditorStop` rendert einen polymorphen Verlaufspunkt mit dokumentiertem Auswahl- und Ziehzustand. Interaktive Punkte verwenden die Rolle `slider` und geben ihre Position in Prozent über ARIA an.

Interaktive Punkte gehören auf die Verlaufsleiste. Pfeiltasten verschieben den Punkt um `positionStep`; mit gedrückter Umschalttaste ist der Schritt zehnmal so groß. Pos1 und Ende bewegen ihn an eine der beiden Grenzen, Entf und Rücktaste geben `remove` aus, wenn sich der Punkt entfernen lässt. Behandelte Tasten stoppen die Weitergabe des Ereignisses, damit die Tastenkürzel des Editors zum Löschen und Verschieben nicht ausgelöst werden. Die normale Tab-Reihenfolge wechselt zwischen den Punkten.

Mit `interactive="false"` lässt sich die Komponente um eine zusammengesetzte Zeile für einen Verlaufspunkt legen. Die Zeile stellt weiterhin Slot-Aktionen sowie `data-selected` und `data-dragging` bereit, wird aber nicht in die Tab-Reihenfolge der Schieberegler aufgenommen.

```vue twoslash
<script setup lang="ts">
import type { GradientStop } from '@pairdraw/scene-graph'
import { GradientEditorStop } from '@pairdraw/vue/primitives/GradientEditor'

const stop: GradientStop = {
  color: { r: 0.4, g: 0.2, b: 0.9, a: 1 },
  position: 0.5
}
</script>

<template>
  <GradientEditorStop
    :stop="stop"
    :index="0"
    active
    label="Middle gradient stop"
    @update-position="(_index, position) => console.log(position)"
  />
</template>
```

## Generierte API-Referenz

<SdkComponentAPI :components="data.components" />

## Siehe auch

- [GradientEditorRoot](./gradient-editor-root)
- [GradientEditorBar](./gradient-editor-bar)
- [useColorModel](/programmable/sdk/api/composables/use-color-model)

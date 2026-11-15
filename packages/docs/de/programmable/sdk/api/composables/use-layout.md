---
title: useLayout
description: Automatische Anordnung, Größenmodi, Innenabstand, Ausrichtung und Rasterspuren bearbeiten.
---

# useLayout

`useLayout()` ist das zentrale Composable für Layout-Panels.

Es stellt Zustand und Aktionen bereit für:

- Flex- oder Grid-Modus
- Größenmodus von Breite und Höhe sowie bearbeitbare abgeleitete Maße
- minimale und maximale Größe
- Innenabstand
- Ausrichtung
- Bearbeitung der Spuren einer Rastervorlage

## Verwendung

```ts
import { useLayout } from '@pairdraw/vue/controls/layout'

const layout = useLayout()
```

## Größenmodus je Achse

```ts
const {
  widthSizing,
  heightSizing,
  setAxisSizing,
  updateAxisSize,
  commitAxisSize,
} = useLayout()

setAxisSizing('width', 'HUG')
setAxisSizing('height', 'FILL')
```

Verbinden Sie `updateAxisSize()` und `commitAxisSize()` mit einem Zahlenfeld. Wird ein Wert im Modus Hug oder Fill bearbeitet, wechselt nur diese Achse bei der ersten tatsächlichen Änderung zu Fixed:

```vue
<NumberFieldRoot
  :model-value="layout.node.value?.width ?? 0"
  @update:model-value="layout.updateAxisSize('width', $event)"
  @commit="(value, previous) => layout.commitAxisSize('width', value, previous)"
/>
```

Sollen Wechsel des Größenmodus, Lösen einer Variablenbindung und der Zahlenwert in einem Schritt gespeichert und mit Escape gemeinsam zurückgenommen werden, kombinieren Sie das NumberField mit `BindableValue` und einem Provider, der Interaktionsbatches implementiert. Das bloße Fokussieren des Felds ändert den Größenmodus nicht.

## Seitenverhältnis sperren

```ts
const { aspectRatioLocked, aspectRatioLockable, toggleAspectRatioLock } = useLayout()
```

`toggleAspectRatioLock()` sperrt die ausgewählte Ebene auf ihre aktuellen Proportionen oder hebt die Sperre auf. Solange sie gesperrt ist, ändert `updateAxisSize()` beide Seiten. `aspectRatioLockable` ist für eine Ebene innerhalb einer Instanz `false`; sie behält die Sperre ihrer Komponente.

## Größengrenzen

```ts
layout.addSizeLimit('minWidth')
layout.setSizeLimitToCurrent('minWidth')
layout.removeSizeLimit('minWidth')
```

## Praktische Beispiele

### Zwischen einheitlichem und einzelnem Innenabstand umschalten

```ts
layout.toggleIndividualPadding()
```

### Rasterspuren ändern

```ts
layout.updateGridTrack('gridTemplateColumns', 0, { sizing: 'FIXED', value: 240 })
layout.addTrack('gridTemplateRows')
```

### Ausrichtung ändern

```ts
layout.setAlignment('CENTER', 'MAX')
```

## Siehe auch

- [LayoutControlsRoot](../components/layout-controls-root)
- [BindableValue](/programmable/sdk/api/components/bindable-value)
- [usePosition](./use-position)
- [useEditor](./use-editor)

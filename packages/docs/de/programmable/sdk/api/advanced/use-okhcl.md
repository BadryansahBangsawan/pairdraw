---
title: useOkHCL
description: OkHCL-Farbabsicht für Füllungen und Konturen ausgewählter Objekte speichern.
---

# useOkHCL

`useOkHCL()` ist der editorbezogene Adapter für die OkHCL-Metadaten von Füllungen und Konturen. Er liest
die gespeicherte Farbabsicht, ändert Objekte mit Rückgängig-Unterstützung, meldet Informationen zum Farbraum
der Vorschau und merkt sich das gewählte Feldformat jeder Füllung und Kontur.

Verwenden Sie [`useColorModel()`](/programmable/sdk/api/composables/use-color-model) für die
frameworkunabhängige Umrechnung, das Bearbeiten einzelner Kanäle und die Darstellung von Schiebereglern.
Verwenden Sie `useOkHCL()` nur dort, wo diese Änderungen in einem Pairdraw-Editor gespeichert werden sollen.

## Verwendung

```ts
import { useOkHCL } from '@pairdraw/vue/controls/okhcl'

const okhcl = useOkHCL()

const color = okhcl.getFillOkHCLColor(node, 0)
okhcl.updateFillOkHCL(node, 0, { c: 0.2 })
```

## Formatzustand

```ts
const format = okhcl.getFieldFormat(node, 0, 'fill')
okhcl.setFillFieldFormat(node, 0, 'okhcl')
```

Die Auswahl von `okhcl` initialisiert die Farbabsicht aus der aktuellen RGBA-Farbe der Füllung oder Kontur.
Mit den zurückgegebenen `fieldOptions` lässt sich eine Formatauswahl aufbauen.

## Informationen zur Vorschau

```ts
const preview = okhcl.getFillPreviewInfo(node, 0)
// { previewColorSpace, clipped }
```

Die Vorschauinformationen geben den Render-Farbraum des Dokuments an und ob die gespeicherte OkHCL-Farbabsicht
auf den darstellbaren Farbumfang abgebildet werden musste.

## Rückgabewerte

- `getFillOkHCLColor()` / `getStrokeOkHCLColor()`
- `getFillPreviewInfo()` / `getStrokePreviewInfo()`
- `getFieldFormat()`
- `setFillFieldFormat()` / `setStrokeFieldFormat()`
- `updateFillOkHCL()` / `updateStrokeOkHCL()`
- `fieldOptions`

## Siehe auch

- [useColorModel](/programmable/sdk/api/composables/use-color-model)
- [useFillControls](../composables/use-fill-controls)
- [useStrokeControls](../composables/use-stroke-controls)
- [ColorPickerRoot](../components/color-picker-root)

---
title: useEffectsControls
description: Hilfsfunktionen für Schatten, Unschärfen, aufgeklappte Einträge sowie Vorschau und Speichern im Effekte-Panel.
---

# useEffectsControls

`useEffectsControls()` ist das Composable für Effekteigenschaften, das Effekte-Panels verwenden.

Es bietet Hilfsfunktionen für:

- Standardeffekte
- die unterschiedliche Logik von Schatten und Unschärfen
- den Zustand aufgeklappter Einträge
- Vorschau beim Ziehen von Werten
- Speichern nach Abschluss der Bearbeitung
- Änderungen von Effekttyp und Farbe

## Verwendung

```ts
import { useEffectsControls } from '@pairdraw/vue/controls/effects'

const effects = useEffectsControls()
```

## Einfaches Beispiel

```ts
const { effectOptions, createDefaultEffect, toggleExpand, scrubEffect, commitEffect } = useEffectsControls()
```

## Praktische Beispiele

### Standardeffekt hinzufügen

```ts
const effect = effects.createDefaultEffect()
```

### Änderung beim Ziehen als Vorschau zeigen und anschließend speichern

```ts
effects.scrubEffect(node, index, { radius: 12 })
effects.commitEffect(node, index, { radius: 12 })
```

## Siehe auch

- [PropertyListRoot](../components/property-list-root)

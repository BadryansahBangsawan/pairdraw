---
title: useCanvasInput
description: Zeigereingabe, Ziehen, Auswahl, Größenänderung, Drehung und Werkzeuge mit der Arbeitsfläche verbinden.
---

# useCanvasInput

`useCanvasInput()` verbindet Zeiger- und Mausereignisse mit der Arbeitsfläche des Editors.

Es behandelt unter anderem:

- Auswahl
- Ziehen
- Größenänderung
- Drehung
- Verschieben der Ansicht
- Zeichnen mit Zeichenstift und Stift
- Interaktion bei der Textbearbeitung
- Trefferprüfung unter Berücksichtigung des aktuellen Bereichs

## Verwendung

Dieses Composable wird gewöhnlich mit `useCanvas()` und den Trefferprüfungsfunktionen des Renderers kombiniert.

```ts
useCanvasInput(
  canvasRef,
  editor,
  hitTestSectionTitle,
  hitTestComponentLabel,
  hitTestFrameTitle,
)
```

## Einfaches Beispiel

```ts
const canvas = useCanvas(canvasRef, editor)

useCanvasInput(
  canvasRef,
  editor,
  canvas.hitTestSectionTitle,
  canvas.hitTestComponentLabel,
  canvas.hitTestFrameTitle,
)
```

## Praktische Beispiele

### Zeigerbewegung in Koordinaten der Arbeitsfläche verfolgen

```ts
useCanvasInput(
  canvasRef,
  editor,
  hitTestSectionTitle,
  hitTestComponentLabel,
  hitTestFrameTitle,
  (cx, cy) => {
    console.log(cx, cy)
  },
)
```

## Hinweise

Dieses Composable arbeitet auf einer tieferen Ebene als die meiste Panel-Logik. Es eignet sich vor allem für Editor-Shells und Container der Arbeitsfläche.

## Siehe auch

- [useCanvas](./use-canvas)
- [useEditor](./use-editor)

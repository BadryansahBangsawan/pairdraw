---
title: useCanvasInput
description: Collegare all'area di lavoro input del puntatore, trascinamento, selezione, ridimensionamento, rotazione e comportamento degli strumenti.
---

# useCanvasInput

`useCanvasInput()` collega le interazioni del puntatore e del mouse all'area di lavoro dell'editor.

Gestisce aspetti dell'interazione come:

- selezione
- trascinamento
- ridimensionamento
- rotazione
- spostamento della vista
- flussi della penna e del disegno
- interazione per la modifica del testo
- hit testing che tiene conto dell'ambito

## Uso

Di solito questo composable si usa insieme a `useCanvas()` e alle funzioni di hit testing del renderer.

```ts
useCanvasInput(
  canvasRef,
  editor,
  hitTestSectionTitle,
  hitTestComponentLabel,
  hitTestFrameTitle,
)
```

## Esempio di base

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

## Esempi pratici

### Seguire il cursore nelle coordinate dell'area di lavoro

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

## Note

Questo composable è di livello più basso rispetto alla maggior parte della logica dei pannelli. È adatto soprattutto ai contenitori dell'editor e dell'area di lavoro.

## Vedi anche

- [useCanvas](./use-canvas)
- [useEditor](./use-editor)

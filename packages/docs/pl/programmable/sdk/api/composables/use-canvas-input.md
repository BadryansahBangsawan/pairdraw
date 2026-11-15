---
title: useCanvasInput
description: Podłączenie wskaźnika, przeciągania, zaznaczenia, zmiany rozmiaru, obrotu i narzędzi do obszaru roboczego.
---

# useCanvasInput

`useCanvasInput()` łączy zdarzenia wskaźnika i myszy z obszarem roboczym edytora.

Obsługuje między innymi:

- zaznaczanie;
- przeciąganie;
- zmianę rozmiaru;
- obrót;
- przesuwanie widoku;
- rysowanie Piórem i inne tryby rysowania;
- interakcję przy edycji tekstu;
- wykrywanie obiektów z uwzględnieniem bieżącego zakresu.

## Użycie

Ten composable zwykle współpracuje z `useCanvas()` i funkcjami wykrywania trafień z renderera.

```ts
useCanvasInput(
  canvasRef,
  editor,
  hitTestSectionTitle,
  hitTestComponentLabel,
  hitTestFrameTitle,
)
```

## Podstawowy przykład

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

## Praktyczne przykłady

### Śledzenie kursora we współrzędnych obszaru roboczego

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

## Uwagi

Ten composable działa na niższym poziomie niż większość logiki paneli. Najlepiej sprawdza się w powłokach edytora i kontenerach obszaru roboczego.

## Zobacz też

- [useCanvas](./use-canvas)
- [useEditor](./use-editor)

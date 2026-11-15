---
title: useTextEdit
description: Obsługa edycji tekstu w DOM, kompozycji IME, formatowania i synchronizacji obiektów tekstowych na obszarze roboczym.
---

# useTextEdit

`useTextEdit()` łączy wejście tekstowe DOM z modelem edycji tekstu na obszarze roboczym edytora.

Koordynuje:

- wprowadzanie tekstu przez ukryte pole `textarea`;
- kompozycję IME;
- miganie kursora tekstowego;
- działanie klawiszy Delete i Backspace;
- polecenia formatowania, takie jak pogrubienie, kursywa i podkreślenie;
- zapisywanie zmian tekstu z powrotem w grafie.

## Użycie

```ts
useTextEdit(canvasRef, editor)
```

## Podstawowy przykład

Użyj go w komponencie, do którego należy obszar roboczy, razem z `useCanvas()` i `useCanvasInput()`.

## Praktyczne przykłady

### Skróty formatowania

`useTextEdit()` sam obsługuje skróty klawiszowe formatowania, takie jak pogrubienie, kursywa i podkreślenie, gdy trwa edycja tekstu.

### Synchronizacja obszaru roboczego z edytorem tekstu

Podczas pisania lub edycji sformatowanych zakresów aktualizuje tekst w grafie i przebiegi stylów.

## Uwagi

To composable integrujący obszar roboczy z edytorem, a nie ogólny composable pola tekstowego.

## Zobacz też

- [useCanvas](./use-canvas)
- [useCanvasInput](./use-canvas-input)

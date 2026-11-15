---
title: useTextEdit
description: Gestire la modifica del testo nel DOM, la composizione, la formattazione e la sincronizzazione dei nodi di testo nell'area di lavoro.
---

# useTextEdit

`useTextEdit()` fa da ponte tra l'input di testo del DOM e il modello di modifica del testo nell'area di lavoro dell'editor.

Coordina:

- l'input di testo basato su una textarea
- la composizione IME
- il lampeggio del cursore
- il comportamento di <kbd>Canc</kbd> e <kbd>Backspace</kbd>
- i comandi di formattazione come grassetto, corsivo e sottolineato
- la sincronizzazione delle modifiche al testo nel grafo

## Uso

```ts
useTextEdit(canvasRef, editor)
```

## Esempio di base

Usalo nel componente che possiede l'area di lavoro, insieme a `useCanvas()` e `useCanvasInput()`.

## Esempi pratici

### Supportare le scorciatoie di formattazione

`useTextEdit()` gestisce già le azioni di formattazione da tastiera, come grassetto, corsivo e sottolineato, mentre la modifica del testo è attiva.

### Mantenere sincronizzati area di lavoro ed editor di testo

Aggiorna il testo e le sequenze di stile nel grafo mentre l'utente scrive o modifica intervalli formattati.

## Note

È un composable di integrazione tra area di lavoro ed editor, non un composable generico per campi di testo.

## Vedi anche

- [useCanvas](./use-canvas)
- [useCanvasInput](./use-canvas-input)

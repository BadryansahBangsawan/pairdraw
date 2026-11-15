---
title: useTextEdit
description: DOM-Texteingabe, IME, Formatierung und Synchronisierung von Textobjekten auf der Arbeitsfläche verwalten.
---

# useTextEdit

`useTextEdit()` verbindet die DOM-Texteingabe mit dem Modell der Textbearbeitung auf der Arbeitsfläche.

Es koordiniert:

- Texteingabe über ein `textarea`
- IME-Komposition
- das Blinken des Cursors
- das Verhalten von Entf und Rücktaste
- Formatierungsbefehle wie fett, kursiv und unterstrichen
- das Zurückschreiben von Textänderungen in den Graphen

## Verwendung

```ts
useTextEdit(canvasRef, editor)
```

## Einfaches Beispiel

Verwenden Sie es in der Komponente, der die Arbeitsfläche gehört, zusammen mit `useCanvas()` und `useCanvasInput()`.

## Praktische Beispiele

### Tastenkürzel für Formatierung unterstützen

`useTextEdit()` verarbeitet bereits Tastenkürzel für Formatierungen wie fett, kursiv und unterstrichen, solange die Textbearbeitung aktiv ist.

### Arbeitsfläche und Texteditor synchron halten

Während die Person tippt oder formatierte Bereiche bearbeitet, aktualisiert es den Text und die Stil-Runs im Graphen.

## Hinweise

Dies ist ein Composable zur Integration von Arbeitsfläche und Editor, kein allgemeines Composable für Textfelder.

## Siehe auch

- [useCanvas](./use-canvas)
- [useCanvasInput](./use-canvas-input)

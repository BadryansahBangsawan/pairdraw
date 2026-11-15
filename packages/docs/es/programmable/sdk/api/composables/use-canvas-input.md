---
title: useCanvasInput
description: Conectar la entrada del puntero en el lienzo, el arrastre, la selección, el redimensionado, el giro y el comportamiento de las herramientas.
---

# useCanvasInput

`useCanvasInput()` conecta la interacción del puntero y del ratón con el lienzo del editor.

Se ocupa de aspectos de la interacción como:

- selección
- arrastre
- redimensionado
- giro
- desplazamiento de la vista
- flujos de pluma y dibujo
- interacción de edición de texto
- detección de impactos según el ámbito

## Uso

Este composable suele combinarse con `useCanvas()` y con las funciones de detección de impactos del renderizador.

```ts
useCanvasInput(
  canvasRef,
  editor,
  hitTestSectionTitle,
  hitTestComponentLabel,
  hitTestFrameTitle,
)
```

## Ejemplo básico

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

## Ejemplos prácticos

### Seguir el movimiento del cursor en el espacio del lienzo

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

## Notas

Este composable es de más bajo nivel que la mayor parte de la lógica de los paneles. Es más adecuado para carcasas de editor y contenedores del lienzo.

## Véase también

- [useCanvas](./use-canvas)
- [useEditor](./use-editor)
- [useTextEdit](./use-text-edit)

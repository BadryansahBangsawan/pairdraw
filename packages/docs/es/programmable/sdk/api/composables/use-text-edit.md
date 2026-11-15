---
title: useTextEdit
description: Gestionar la edición de texto en el DOM, la composición, el formato y la sincronización de los objetos de texto del lienzo.
---

# useTextEdit

`useTextEdit()` hace de puente entre la entrada de texto del DOM y el modelo de edición de texto del lienzo del editor.

Coordina:

- la entrada de texto basada en un textarea
- la composición IME
- el parpadeo del cursor
- el comportamiento de Suprimir y Retroceso
- comandos de formato como negrita, cursiva y subrayado
- la sincronización de los cambios de texto con el grafo

## Uso

```ts
useTextEdit(canvasRef, editor)
```

## Ejemplo básico

Úselo en el componente propietario del lienzo junto con `useCanvas()` y `useCanvasInput()`.

## Ejemplos prácticos

### Admitir atajos de formato

`useTextEdit()` ya gestiona las acciones de formato con el teclado, como negrita, cursiva y subrayado, mientras la edición de texto está activa.

### Mantener sincronizados el lienzo y el editor de texto

Actualiza el texto del grafo y los intervalos de estilo a medida que el usuario escribe o edita intervalos con formato.

## Notas

Es un composable de integración entre el lienzo y el editor, no un composable genérico para campos de texto.

## Véase también

- [useCanvas](./use-canvas)
- [useCanvasInput](./use-canvas-input)
- [Edición de texto](/es/user-guide/text-editing)

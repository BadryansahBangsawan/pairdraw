---
title: CanvasRoot
description: Primitiva de lienzo sin estilos para las superficies de renderizado de Pairdraw.
---

# CanvasRoot

`CanvasRoot` es la primitiva estructural del lienzo en `@pairdraw/vue`.

Úsela cuando quiera la estructura y el contexto del lienzo que proporciona el SDK, con la disposición y los estilos a cargo de la aplicación. Proporciona el contexto a sus componentes descendientes: use [CanvasSurface](./canvas-surface) dentro de este componente o acceda al contexto con [useCanvasContext](../advanced/use-canvas-context).

## Véase también

- [useCanvas](../composables/use-canvas)
- [useCanvasInput](../composables/use-canvas-input)
- [useTextEdit](../composables/use-text-edit)

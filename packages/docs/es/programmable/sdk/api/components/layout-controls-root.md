---
title: LayoutControlsRoot
description: Primitiva raíz sin estilos para los controles de disposición automática y de tamaño.
---

<script setup lang="ts">
import { data } from '#docs-api/components/layout-controls-root.data'
</script>

# LayoutControlsRoot

`LayoutControlsRoot` expone como primitiva estructural el contrato de ranura que devuelve `useLayout()`. Úselo cuando quiera una estructura reutilizable de controles de disposición con un marcado propio de la aplicación.

Los campos de anchura y altura pueden seguir siendo editables mientras su eje usa Hug o Fill. En la primera modificación numérica real, `updateAxisSize()` registra la transición de tamaño y cambia ese eje a Fixed. Combine el campo con `BindableValue` y un proveedor capaz de gestionar lotes de interacción cuando el modo de tamaño, la desvinculación de una variable y el valor numérico deban confirmarse o revertirse como un solo paso de deshacer. Dar el foco o abrir el selector no cambia el modo de tamaño.

Use `setAxisSizing('width', mode)` o `setAxisSizing('height', mode)` para los menús de tamaño. Los antiguos setters específicos de cada eje no forman parte del contrato actual.

## Referencia de API generada

Las siguientes tablas se extraen del código fuente de Vue y de JSDoc durante la compilación de la documentación.

<SdkComponentAPI :components="data.components" />

## Véase también

- [useLayout](../composables/use-layout)
- [BindableValue](/programmable/sdk/api/components/bindable-value)
- [Guía de paneles de propiedades](../../guides/property-panels)

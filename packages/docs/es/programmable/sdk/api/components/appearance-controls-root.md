---
title: AppearanceControlsRoot
description: Primitiva raíz sin estilos para los controles de opacidad, visibilidad, modo de fusión, radio de esquina y suavizado.
---

<script setup lang="ts">
import { data } from '#docs-api/components/appearance-controls-root.data'
</script>

# AppearanceControlsRoot

`AppearanceControlsRoot` expone como primitiva estructural el contrato de ranura que devuelve `useAppearance()`. Úselo cuando quiera controles de apariencia reutilizables con una presentación propia.

La raíz toma las decisiones de presentación derivadas de la selección, incluido `showIndependentCorners`. Ese estado se activa cuando el objeto seleccionado usa explícitamente esquinas independientes o cuando un objeto importado contiene valores de esquina desiguales con un indicador de radio común obsoleto. Los consumidores deben representar la interfaz a partir de este estado en lugar de mantener una ref local paralela para desplegarla.

`cornerSmoothingPercent` expone el valor normalizado de la escena como `0…100` o `MIXED`. Actualícelo mediante las acciones de esquina con valores normalizados `0…1`.

Los cambios de esquinas independientes, las ediciones del suavizado y las confirmaciones por esquina en varios objetos se agrupan en una sola entrada de deshacer, conservando el valor original de cada objeto.

## Referencia de API generada

Las siguientes tablas se extraen del código fuente de Vue y de JSDoc durante la compilación de la documentación.

<SdkComponentAPI :components="data.components" />

## Véase también

- [useAppearance](../composables/use-appearance)
- [Guía de paneles de propiedades](../../guides/property-panels)

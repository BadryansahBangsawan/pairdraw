---
title: GradientEditorBar
description: Primitiva sin estilos de la barra de degradado arrastrable.
---

# GradientEditorBar

`GradientEditorBar` es la primitiva de barra arrastrable que se usa dentro de los editores de degradados.

## Props

<SdkPropsTable
  :rows="[
    { name: 'stops', type: 'GradientStop[]', description: 'Puntos actuales del degradado.', required: true },
    { name: 'activeStopIndex', type: 'number', description: 'Índice del punto activo.', required: true },
    { name: 'barBackground', type: 'string', description: 'Cadena de fondo CSS para la barra.', required: true }
  ]"
/>

## Eventos

<SdkEventsTable
  :rows="[
    { name: 'selectStop', payload: 'index: number', description: 'Se emite cuando se selecciona un punto.' },
    { name: 'dragStop', payload: 'index: number, position: number', description: 'Se emite mientras se arrastra un punto.' }
  ]"
/>

## Ranuras

<SdkSlotsTable
  :rows="[
    { name: 'default', props: 'bar state + drag handlers', description: 'Contrato completo para representar la barra de degradado.' }
  ]"
/>

### Props de la ranura predeterminada

```ts
{
  stops: GradientStop[]
  activeStopIndex: number
  barBackground: string
  barRef: (el: unknown) => void
  onStopPointerDown: (index: number, event: PointerEvent) => void
  onPointerMove: (event: PointerEvent) => void
  onPointerUp: () => void
  draggingIndex: number | null
}
```

## Ejemplo

```vue
<GradientEditorBar
  :stops="stops"
  :active-stop-index="activeStopIndex"
  :bar-background="barBackground"
  @select-stop="selectStop"
  @drag-stop="dragStop"
  v-slot="ctx"
>
  <MyGradientBar v-bind="ctx" />
</GradientEditorBar>
```

La aplicación controla el aspecto de la barra y usa la información de la ranura para dibujar los puntos.

## Véase también

- [GradientEditorRoot](./gradient-editor-root)
- [GradientEditorStop](./gradient-editor-stop)

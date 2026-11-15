---
title: GradientEditorBar
description: Barre sans styles pour faire glisser les points d’un dégradé.
---

# GradientEditorBar

`GradientEditorBar` est la barre déplaçable utilisée dans les éditeurs de dégradé.

## Propriétés

<SdkPropsTable
  :rows="[
    { name: 'stops', type: 'GradientStop[]', description: 'Points actuels du dégradé.', required: true },
    { name: 'activeStopIndex', type: 'number', description: 'Indice du point actif.', required: true },
    { name: 'barBackground', type: 'string', description: 'Valeur CSS background de la barre.', required: true }
  ]"
/>

## Événements

<SdkEventsTable
  :rows="[
    { name: 'selectStop', payload: 'index: number', description: 'Émis lorsqu’un point est sélectionné.' },
    { name: 'dragStop', payload: 'index: number, position: number', description: 'Émis pendant le glissement d’un point.' }
  ]"
/>

## Emplacements

<SdkSlotsTable
  :rows="[
    { name: 'default', props: 'bar state + drag handlers', description: 'Contrat de rendu complet de la barre de dégradé.' }
  ]"
/>

### Propriétés de l’emplacement par défaut

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

## Exemple

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

## Voir aussi

- [GradientEditorRoot](./gradient-editor-root)
- [GradientEditorStop](./gradient-editor-stop)

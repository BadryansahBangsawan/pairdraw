---
title: GradientEditorRoot
description: Composant racine sans styles pour modifier les points d’un dégradé.
---

# GradientEditorRoot

`GradientEditorRoot` est un composant racine sans styles pour l’édition des dégradés.

Il gère :

- l’état du point actif ;
- le changement de sous-type ;
- l’ajout, la suppression et la modification des points ;
- la modification de la couleur active ;
- le fond dérivé de la barre.

## Propriétés

<SdkPropsTable
  :rows="[
    { name: 'fill', type: 'Fill', description: 'Valeur actuelle du remplissage en dégradé.', required: true }
  ]"
/>

## Événements

<SdkEventsTable
  :rows="[
    { name: 'update', payload: 'fill: Fill', description: 'Émis lorsque le remplissage en dégradé change.' }
  ]"
/>

## Emplacements

<SdkSlotsTable
  :rows="[
    { name: 'default', props: 'editor state + handlers', description: 'Contrat de rendu complet de l’éditeur de dégradé.' }
  ]"
/>

### Propriétés de l’emplacement par défaut

```ts
{
  stops: GradientStop[]
  subtype: GradientSubtype
  subtypes: Array<{ value: GradientSubtype; label: string }>
  activeStopIndex: number
  activeColor: Color
  barBackground: string
  setSubtype: (type: GradientSubtype) => void
  selectStop: (index: number) => void
  addStop: () => void
  removeStop: (index: number) => void
  updateStopPosition: (index: number, position: number) => void
  updateStopColor: (index: number, hex: string) => void
  updateStopOpacity: (index: number, opacity: number) => void
  updateActiveColor: (color: Color) => void
  dragStop: (index: number, position: number) => void
}
```

## Exemple

```vue
<GradientEditorRoot :fill="fill" @update="fill = $event" v-slot="ctx">
  <MyGradientUI v-bind="ctx" />
</GradientEditorRoot>
```

## Voir aussi

- [GradientEditorBar](./gradient-editor-bar)
- [GradientEditorStop](./gradient-editor-stop)

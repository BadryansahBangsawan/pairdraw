---
title: Pannelli delle proprietà
description: Creare pannelli delle proprietà con i composable dei controlli e i componenti elenco senza stile.
---

# Pannelli delle proprietà

In `@pairdraw/vue` i pannelli delle proprietà partono di proposito dai composable.

Se un pannello ha bisogno soprattutto di valori derivati dalla selezione e di azioni di aggiornamento, preferisci i composable. Se ha bisogno di una struttura di elenco o array riutilizzabile, usa un componente senza stile come `PropertyListRoot`.

## Composable dei controlli più comuni

Per le sezioni di proprietà standard, parti da:

- `usePosition()`
- `useLayout()`
- `useAppearance()`
- `useTypography()`
- `useExport()`

Per i pannelli in forma di elenco, usa:

- `useFillControls()`
- `useStrokeControls()`
- `useEffectsControls()`

## Campi che supportano i collegamenti

Avvolgi con `BindableValueRoot` i campi che possono fare riferimento a variabili o a token di design esterni. Il componente non impone una presentazione, ma le interfacce che supportano i collegamenti dovrebbero fare in modo che il focus non abbia effetti distruttivi:

- Mostra l'identità della variabile quando il campo è inattivo; esponi il valore risolto in un elemento di supporto, come un tooltip.
- Dare il focus al campo o aprire il selettore non deve scollegare una variabile.
- Applica `detach-on-edit`, `readonly-when-bound` o `edit-variable` solo quando l'utente modifica davvero il valore.
- Metti le azioni esplicite di scollegamento nel selettore, non in un'icona del campo che scollega con un solo clic.
- Tieni in un unico batch del provider la sostituzione del collegamento, lo scollegamento alla modifica e le modifiche su più destinazioni.

L'aspetto dell'app Pairdraw mostra a riposo una pillola viola con il nome della variabile e rivela il valore numerico risolto quando il NumberField entra in modalità di modifica. Le interfacce dell'editor personalizzate possono presentare lo stesso stato senza stile in modo diverso.

## Esempio: pannello della posizione

```vue
<script setup lang="ts">
import { usePosition } from '@pairdraw/vue/controls/position'

const { x, y, width, height, updateProp, commitProp } = usePosition()
</script>

<template>
  <div class="grid grid-cols-2 gap-2">
    <input :value="x" @input="updateProp('x', Number(($event.target as HTMLInputElement).value))" />
    <input :value="y" @input="updateProp('y', Number(($event.target as HTMLInputElement).value))" />
    <input :value="width" @input="updateProp('width', Number(($event.target as HTMLInputElement).value))" />
    <input :value="height" @input="updateProp('height', Number(($event.target as HTMLInputElement).value))" />
  </div>
</template>
```

## Esempio: pannello dei riempimenti

```vue
<script setup lang="ts">
import { PropertyListRoot } from '@pairdraw/vue/primitives/PropertyList'
import { useEditorPropertyList } from '@pairdraw/vue/controls/property-list'
import { useFillControls } from '@pairdraw/vue/controls/fill'

const fillControls = useFillControls()
const fills = useEditorPropertyList('fills')
</script>

<template>
  <PropertyListRoot
    prop-key="fills"
    :items="fills.items.value"
    :mixed="fills.isMixed.value"
    @add="fills.actions.add"
    @remove="fills.actions.remove"
    v-slot="{ items, actions }"
  >
    <div v-for="(fill, index) in items" :key="index">
      {{ fill.type }}
      <button @click="actions.remove(index)">Remove</button>
    </div>

    <button @click="actions.add(fillControls.defaultFill)">Add fill</button>
  </PropertyListRoot>
</template>
```

## Regola generale

- usa i composable per la logica di controllo diretta
- usa i componenti strutturali quando la parte difficile è coordinare elenchi, alberi o slot ripetuti

## Vedi anche

- [usePosition](../api/composables/use-position)
- [useLayout](../api/composables/use-layout)
- [useAppearance](../api/composables/use-appearance)
- [useTypography](../api/composables/use-typography)
- [useFillControls](../api/composables/use-fill-controls)
- [useStrokeControls](../api/composables/use-stroke-controls)
- [useEffectsControls](../api/composables/use-effects-controls)
- [PropertyListRoot](../api/components/property-list-root)

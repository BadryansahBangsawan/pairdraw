<script setup lang="ts" generic="K extends PropertyListKey">
import { computed } from 'vue'

import { providePropertyList } from '#vue/primitives/PropertyList/context'
import { useFlatReorderDrag } from '#vue/shared/drag'

import type {
  PropertyListActions,
  PropertyListIdentity,
  PropertyListItemFor,
  PropertyListKey,
  PropertyListPatchFor,
  PropertyListRootProps,
  PropertyListRootSlots
} from './types'

const {
  propKey,
  items: itemsProp,
  mixed = false,
  disabled: disabledProp = false,
  getKey
} = defineProps<PropertyListRootProps<K>>()
const emit = defineEmits<{
  add: [item: PropertyListItemFor<K>]
  remove: [index: number]
  update: [index: number, item: PropertyListItemFor<K>]
  patch: [index: number, changes: PropertyListPatchFor<K>]
  toggleVisibility: [index: number]
  reorder: [fromIndex: number, toIndex: number]
}>()
defineSlots<PropertyListRootSlots<K>>()

const items = computed(() => itemsProp)
const isMixed = computed(() => mixed)
const disabled = computed(() => disabledProp)

function keyOf(item: PropertyListItemFor<K>, index: number): PropertyListIdentity {
  return getKey?.(item, index) ?? index
}

const actions: PropertyListActions<K> = {
  add: (item) => {
    if (!disabled.value) emit('add', item)
  },
  remove: (index) => {
    if (!disabled.value) emit('remove', index)
  },
  update: (index, item) => {
    if (!disabled.value) emit('update', index, item)
  },
  patch: (index, changes) => {
    if (!disabled.value) emit('patch', index, changes)
  },
  toggleVisibility: (index) => {
    if (!disabled.value) emit('toggleVisibility', index)
  },
  reorder: (fromIndex, toIndex) => {
    if (!disabled.value) emit('reorder', fromIndex, toIndex)
  }
}

// Rows drag to reorder, as Figma's paint lists do; the drag lives here so every row of the list
// shares one monitor and one drop instruction.
const drag = useFlatReorderDrag({
  items: () => items.value.map((item, index) => ({ id: String(keyOf(item, index)) })),
  onMove: (sourceId, targetIndex) => {
    const fromIndex = items.value.findIndex(
      (item, index) => String(keyOf(item, index)) === sourceId
    )
    if (fromIndex !== -1) actions.reorder(fromIndex, targetIndex)
  }
})

providePropertyList({ propKey, items, isMixed, disabled, keyOf, actions, drag })
</script>

<template>
  <slot
    :items="items"
    :is-mixed="isMixed"
    :disabled="disabled"
    :key-of="keyOf"
    :actions="actions"
  />
</template>

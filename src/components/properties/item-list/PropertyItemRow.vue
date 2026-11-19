<script setup lang="ts" generic="K extends PropertyListKey">
import type { ClassValue } from 'tailwind-variants'
import { computed, type ComponentPublicInstance, type VNode } from 'vue'

import {
  PropertyListItem,
  PropertyListRemove,
  PropertyListVisibility,
  usePropertyList,
  type PropertyListItemSlotProps,
  type PropertyListKey
} from '@pairdraw/vue/primitives/PropertyList'

import Tip from '@/components/ui/overlay/Tip.vue'
import PanelItemRow from '@/components/ui/panel/PanelItemRow.vue'

const {
  propKey,
  index,
  visibilityLabel,
  removeLabel,
  showVisibility = true,
  class: className
} = defineProps<{
  propKey: K
  index: number
  visibilityLabel: string
  removeLabel: string
  showVisibility?: boolean
  class?: ClassValue
}>()

const emit = defineEmits<{
  remove: [index: number]
  toggleVisibility: [index: number]
}>()

defineSlots<{
  default(props: PropertyListItemSlotProps<K>): VNode[]
  rail?(props: PropertyListItemSlotProps<K>): VNode[]
  details?(props: PropertyListItemSlotProps<K>): VNode[]
}>()

const list = usePropertyList<K>()
const rowId = computed(() => String(list.keyOf(list.items.value[index], index)))
const drag = list.drag

function setupRow(element: Element | ComponentPublicInstance | null) {
  const node = element instanceof Element ? element : element?.$el
  drag?.setupItem(node instanceof HTMLElement ? node : null, () => ({ id: rowId.value }))
}

const dropEdge = computed(() => {
  if (!drag || drag.instructionTargetId.value !== rowId.value) return undefined
  return drag.instruction.value?.operation === 'reorder-before' ? 'before' : 'after'
})
</script>

<template>
  <div class="relative">
    <div
      v-if="dropEdge"
      class="pointer-events-none absolute inset-x-1 z-10 h-0.5 rounded-full bg-accent"
      :class="dropEdge === 'before' ? '-top-0.5' : '-bottom-0.5'"
    />
    <PropertyListItem
      v-slot="item"
      :ref="setupRow"
      :prop-key="propKey"
      :index="index"
      :class="className"
      :data-property="propKey"
      :data-index="index"
      :data-dragging="drag?.draggingId.value === rowId || undefined"
      :data-drop="dropEdge"
      as-child
    >
      <PanelItemRow>
        <slot v-bind="item" />
        <template v-if="$slots.details" #details>
          <slot name="details" v-bind="item" />
        </template>
        <template #rail="{ removeClass }">
          <slot name="rail" v-bind="item" />
          <Tip v-if="showVisibility" :label="visibilityLabel">
            <PropertyListVisibility
              :prop-key="propKey"
              :index="index"
              :aria-label="visibilityLabel"
              class="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-muted hover:bg-hover hover:text-surface"
              @toggle="emit('toggleVisibility', $event)"
            >
              <icon-lucide-eye v-if="!item.hidden" class="size-3.5" />
              <icon-lucide-eye-off v-else class="size-3.5" />
            </PropertyListVisibility>
          </Tip>
          <Tip :label="removeLabel">
            <PropertyListRemove
              :prop-key="propKey"
              :index="index"
              :aria-label="removeLabel"
              :class="[
                removeClass,
                'flex size-6 shrink-0 cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-muted hover:bg-hover hover:text-surface'
              ]"
              @remove="emit('remove', $event)"
            >
              <icon-lucide-minus class="size-3.5" />
            </PropertyListRemove>
          </Tip>
        </template>
      </PanelItemRow>
    </PropertyListItem>
  </div>
</template>

<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { isScaleAnchor, SCALE_ANCHORS, type ScaleAnchor } from '@open-pencil/core'
import { usePanelMessages } from '@open-pencil/vue/i18n'

import Tip from '@/components/ui/overlay/Tip.vue'
import theme from '@/theme/scale-anchor'

/** The point of the selection that stays put while it scales. */
const anchor = defineModel<ScaleAnchor>({ required: true })

const panels = usePanelMessages()
const styles = tv(theme)()

const labels = computed<Record<ScaleAnchor, string>>(() => ({
  'top-left': panels.value.scaleAnchorTopLeft,
  top: panels.value.scaleAnchorTop,
  'top-right': panels.value.scaleAnchorTopRight,
  left: panels.value.scaleAnchorLeft,
  center: panels.value.scaleAnchorCenter,
  right: panels.value.scaleAnchorRight,
  'bottom-left': panels.value.scaleAnchorBottomLeft,
  bottom: panels.value.scaleAnchorBottom,
  'bottom-right': panels.value.scaleAnchorBottomRight
}))

function pick(value: unknown) {
  if (isScaleAnchor(value)) anchor.value = value
}
</script>

<template>
  <RadioGroupRoot
    :model-value="anchor"
    :aria-label="panels.scaleFrom"
    data-test-id="scale-anchor-grid"
    :class="styles.root()"
    @update:model-value="pick"
  >
    <Tip v-for="item in SCALE_ANCHORS" :key="item" as-child :label="labels[item]">
      <RadioGroupItem
        :value="item"
        :aria-label="labels[item]"
        :data-test-id="`scale-anchor-${item}`"
        :class="styles.item()"
      >
        <span :class="styles.dot()" aria-hidden="true" />
      </RadioGroupItem>
    </Tip>
  </RadioGroupRoot>
</template>

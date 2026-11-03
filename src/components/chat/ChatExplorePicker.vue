<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { computed } from 'vue'

import { useExploreMessages } from '@open-pencil/vue/i18n'

import {
  EXPLORE_AXES,
  isExploreAxis,
  isExploreMode,
  MAX_VARIANTS,
  MIN_VARIANTS,
  type ExploreAxis,
  type ExploreSetting
} from '@/app/ai/explore/request'
import { chatExplorePickerTheme } from '@/components/chat/ui'
import { usePopoverUI } from '@/components/ui/overlay/popover'
import Tip from '@/components/ui/overlay/Tip.vue'
import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'

/**
 * "Let it cook" in the composer: whether the next messages ask for several variants side by side,
 * exploring layout or style, or for one design in a single pass ("Don't iterate"). The trigger
 * names the choice while it is on, so a run of messages never explores unnoticed.
 */
const { disabled = false } = defineProps<{ disabled?: boolean }>()
const setting = defineModel<ExploreSetting>({ required: true })

const messages = useExploreMessages()
const ui = chatExplorePickerTheme()
const popover = usePopoverUI({ content: ui.content() })

const axisLabels = computed<Record<ExploreAxis, string>>(() => ({
  layout: messages.value.axisLayout,
  style: messages.value.axisStyle
}))

const modeOptions = computed(() => [
  { value: 'off', label: messages.value.modeOff },
  { value: 'variants', label: messages.value.modeVariants },
  { value: 'single', label: messages.value.modeSingle }
])
const countOptions = Array.from({ length: MAX_VARIANTS - MIN_VARIANTS + 1 }, (_, index) => {
  const count = String(MIN_VARIANTS + index)
  return { value: count, label: count }
})
const axisOptions = computed(() =>
  EXPLORE_AXES.map((axis) => ({ value: axis, label: axisLabels.value[axis] }))
)

/** What the trigger shows while exploring is on; empty while it is off. */
const summary = computed(() => {
  const { mode, count, axis } = setting.value
  if (mode === 'variants') {
    return messages.value.activeVariants({ count: String(count), axis: axisLabels.value[axis] })
  }
  return mode === 'single' ? messages.value.activeSingle : ''
})
const triggerLabel = computed(() =>
  summary.value ? messages.value.letItCookState({ state: summary.value }) : messages.value.letItCook
)

function setMode(value: string) {
  if (isExploreMode(value)) setting.value = { ...setting.value, mode: value }
}

function setCount(value: string) {
  const count = Number(value)
  if (Number.isInteger(count)) setting.value = { ...setting.value, count }
}

function setAxis(value: string) {
  if (isExploreAxis(value)) setting.value = { ...setting.value, axis: value }
}
</script>

<template>
  <PopoverRoot>
    <Tip as-child :label="triggerLabel" :disabled="disabled">
      <PopoverTrigger as-child>
        <button
          type="button"
          :class="ui.trigger()"
          :disabled="disabled"
          :aria-label="triggerLabel"
          :data-state="summary ? 'on' : 'off'"
          data-test-id="chat-explore-picker"
        >
          <icon-lucide-chef-hat :class="ui.triggerIcon()" aria-hidden="true" />
          <span v-if="summary" :class="ui.triggerLabel()" aria-hidden="true">{{ summary }}</span>
        </button>
      </PopoverTrigger>
    </Tip>
    <PopoverPortal>
      <PopoverContent
        side="top"
        align="start"
        :side-offset="6"
        :class="popover.content"
        :aria-label="messages.letItCook"
      >
        <div :class="ui.header()">
          <p :class="ui.title()">
            <icon-lucide-chef-hat :class="ui.titleIcon()" aria-hidden="true" />
            {{ messages.letItCook }}
          </p>
          <p :class="ui.description()">{{ messages.letItCookDescription }}</p>
        </div>

        <SegmentedControl
          :model-value="setting.mode"
          :options="modeOptions"
          :label="messages.mode"
          @update:model-value="setMode"
        />

        <template v-if="setting.mode === 'variants'">
          <div :class="ui.field()">
            <span :class="ui.label()">{{ messages.variantCount }}</span>
            <SegmentedControl
              :model-value="String(setting.count)"
              :options="countOptions"
              :label="messages.variantCount"
              @update:model-value="setCount"
            />
          </div>
          <div :class="ui.field()">
            <span :class="ui.label()">{{ messages.axis }}</span>
            <SegmentedControl
              :model-value="setting.axis"
              :options="axisOptions"
              :label="messages.axis"
              @update:model-value="setAxis"
            />
          </div>
        </template>
        <p v-else-if="setting.mode === 'single'" :class="ui.description()">
          {{ messages.singleDescription }}
        </p>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

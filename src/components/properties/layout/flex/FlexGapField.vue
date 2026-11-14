<script setup lang="ts">
import { SelectRoot, SelectTrigger } from 'reka-ui'
import { computed, ref } from 'vue'

import { useI18n } from '@pairdraw/vue/i18n'
import { useRetainedPopup } from '@pairdraw/vue/lifecycle/retention'
import { useLayoutControlsContext } from '@pairdraw/vue/primitives/LayoutControls'

import VariableNumberField from '@/components/properties/VariableNumberField.vue'
import AppSelectContent from '@/components/ui/select/AppSelectContent.vue'
import AppSelectItem from '@/components/ui/select/AppSelectItem.vue'
import { panelFieldBase } from '@/theme/panel/field/base'

const { axis = 'primary' } = defineProps<{ axis?: 'primary' | 'counter' }>()
const ctx = useLayoutControlsContext()
const { open: popupOpen, portalActive } = useRetainedPopup()
const { panels } = useI18n()
const anchor = ref<HTMLElement | null>(null)
const prop = computed(() => (axis === 'primary' ? 'itemSpacing' : 'counterAxisSpacing'))
const horizontal = computed(() => (ctx.node.layoutMode === 'HORIZONTAL') === (axis === 'primary'))
const label = computed(() =>
  horizontal.value ? panels.value.horizontalGap : panels.value.verticalGap
)
type GapMode = 'FIXED' | 'AUTO' | 'AROUND'
const wrapped = computed(() => ctx.node.layoutWrap === 'WRAP')
const auto = computed(() => axis === 'primary' && ctx.gapAuto && !wrapped.value)
// Space around shares the free space on top of the gap, so the gap stays editable.
const around = computed(() => axis === 'primary' && ctx.node.primaryAxisAlign === 'SPACE_AROUND')
const mode = computed<GapMode>(() => {
  if (auto.value) return 'AUTO'
  return around.value ? 'AROUND' : 'FIXED'
})
// Auto gap is space between, which a wrapping layout does not offer.
const modes = computed<GapMode[]>(() =>
  wrapped.value ? ['FIXED', 'AROUND'] : ['FIXED', 'AUTO', 'AROUND']
)
const hasModes = computed(() => axis === 'primary')
function modeLabel(value: GapMode) {
  if (value === 'AUTO') return panels.value.auto
  if (value === 'AROUND') return panels.value.spaceAround
  return Math.round(ctx.node.itemSpacing)
}
function setMode(value: string) {
  if (value === 'AROUND') ctx.setAlignment('SPACE_AROUND', ctx.node.counterAxisAlign)
  else ctx.setGapAuto(value === 'AUTO')
}
</script>

<template>
  <SelectRoot v-model:open="popupOpen" :model-value="mode" @update:model-value="setMode">
    <div ref="anchor" class="min-w-0">
      <div
        v-if="auto"
        data-test-id="layout-gap-input"
        :class="[panelFieldBase, 'flex items-center text-xs']"
      >
        <span class="px-[5px] text-muted">
          <icon-lucide-align-horizontal-space-between v-if="horizontal" class="size-3.5" />
          <icon-lucide-align-vertical-space-between v-else class="size-3.5" />
        </span>
        <span class="min-w-0 flex-1 truncate">{{ panels.auto }}</span>
        <SelectTrigger
          data-test-id="layout-gap-menu"
          :aria-label="label"
          :reference="anchor ?? undefined"
          class="flex shrink-0 items-center self-stretch px-1 text-muted"
          @pointerdown.stop
        >
          <icon-lucide-chevron-down class="size-3" />
        </SelectTrigger>
      </div>
      <VariableNumberField
        v-else
        :data-test-id="axis === 'primary' ? 'layout-gap-input' : 'layout-cross-gap-input'"
        :aria-label="label"
        :model-value="Math.round(ctx.node[prop])"
        :min="0"
        :node-id="ctx.node.id"
        :binding-path="prop"
        @update:model-value="ctx.updateProp(prop, $event)"
        @commit="(value, previous) => ctx.commitProp(prop, value, previous)"
        @cancel="ctx.cancelPreview"
      >
        <template #icon>
          <template v-if="around">
            <icon-lucide-align-horizontal-space-around v-if="horizontal" class="size-3.5" />
            <icon-lucide-align-vertical-space-around v-else class="size-3.5" />
          </template>
          <template v-else>
            <icon-lucide-align-horizontal-space-between v-if="horizontal" class="size-3.5" />
            <icon-lucide-align-vertical-space-between v-else class="size-3.5" />
          </template>
        </template>
        <template v-if="hasModes" #after-variable>
          <SelectTrigger
            data-test-id="layout-gap-menu"
            :aria-label="label"
            :reference="anchor ?? undefined"
            class="flex shrink-0 items-center self-stretch px-1 text-muted"
            @pointerdown.stop
          >
            <icon-lucide-chevron-down class="size-3" />
          </SelectTrigger>
        </template>
      </VariableNumberField>
    </div>
    <AppSelectContent v-if="hasModes && portalActive" align="end">
      <AppSelectItem v-for="option in modes" :key="option" :value="option">
        {{ modeLabel(option) }}
      </AppSelectItem>
    </AppSelectContent>
  </SelectRoot>
</template>

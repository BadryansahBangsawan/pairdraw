<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { IconOption } from '@open-pencil/core/icons'
import type { IconOptions } from '@open-pencil/scene-graph/icons'
import { usePanelMessages } from '@open-pencil/vue/i18n'

import NumberField from '@/components/inputs/NumberField.vue'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup.vue'
import PanelGrid from '@/components/ui/panel/PanelGrid.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import AppSwitch from '@/components/ui/toggle/AppSwitch.vue'

/**
 * How a placed icon is drawn, for a set that draws icons with options: Material Symbols' weight,
 * fill, grade, and optical size, or SF Symbols' weight, scale, and rendering. A range that is only
 * off or on, such as fill, is a switch; other ranges are numbers, committed when typed or when a
 * scrub ends, since each change draws the icon again; choices are a list.
 */
const { controls, values } = defineProps<{
  controls: readonly IconOption[]
  values: IconOptions
}>()

const emit = defineEmits<{ change: [key: string, value: number | string] }>()

const panels = usePanelMessages()

type PanelMessage = keyof typeof panels.value

/** Names for the options the sets we draw have; another set's option keeps the name it gives. */
const OPTION_LABELS: Partial<Record<string, PanelMessage>> = {
  wght: 'iconWeight',
  weight: 'iconWeight',
  FILL: 'iconFill',
  GRAD: 'iconGrade',
  opsz: 'iconOpticalSize',
  scale: 'iconScale',
  rendering: 'iconRendering'
}

/** Names for SF Symbols' choices, by option and value. */
const VALUE_LABELS: Partial<Record<string, Partial<Record<string, PanelMessage>>>> = {
  weight: {
    ultralight: 'iconWeightUltralight',
    thin: 'iconWeightThin',
    light: 'iconWeightLight',
    regular: 'iconWeightRegular',
    medium: 'iconWeightMedium',
    semibold: 'iconWeightSemibold',
    bold: 'iconWeightBold',
    heavy: 'iconWeightHeavy',
    black: 'iconWeightBlack'
  },
  scale: { small: 'iconScaleSmall', medium: 'iconScaleMedium', large: 'iconScaleLarge' },
  rendering: {
    monochrome: 'iconRenderingMonochrome',
    hierarchical: 'iconRenderingHierarchical'
  }
}

function message(key: PanelMessage | undefined, fallback: string): string {
  const text = key ? panels.value[key] : undefined
  return typeof text === 'string' ? text : fallback
}

const rows = computed(() =>
  controls.map((option) => {
    const label = message(OPTION_LABELS[option.key], option.name)
    if ('values' in option)
      return {
        kind: 'choice' as const,
        option,
        label,
        choices: option.values.map((value) => ({
          value,
          label: message(VALUE_LABELS[option.key]?.[value], value)
        }))
      }
    const kind = option.min === 0 && option.max === 1 && option.step === 1 ? 'toggle' : 'range'
    return { kind, option, label }
  })
)

const switches = computed(() => rows.value.filter((row) => row.kind === 'toggle'))
const fields = computed(() => rows.value.filter((row) => row.kind !== 'toggle'))

/** A number being scrubbed or typed, shown until it is committed or cancelled. */
const draft = ref<{ key: string; value: number } | null>(null)
watch(
  () => values,
  () => (draft.value = null)
)

function shown(option: IconOption): number | string {
  if (draft.value?.key === option.key) return draft.value.value
  return values[option.key] ?? option.default
}

function shownNumber(option: IconOption): number {
  const value = shown(option)
  return typeof value === 'number' ? value : Number(option.default)
}

function commit(key: string, value: number) {
  draft.value = null
  if (values[key] !== value) emit('change', key, value)
}
</script>

<template>
  <div class="flex flex-col gap-2" data-property="icon-options">
    <PanelGrid v-if="fields.length > 0" :columns="2">
      <PanelFieldGroup v-for="row in fields" :key="row.option.key" :label="row.label">
        <AppSelect
          v-if="row.kind === 'choice'"
          :label="row.label"
          :model-value="String(shown(row.option))"
          :options="row.choices"
          :data-property="`icon-option-${row.option.key}`"
          @update:model-value="emit('change', row.option.key, String($event))"
        />
        <NumberField
          v-else-if="'min' in row.option"
          :model-value="shownNumber(row.option)"
          :min="row.option.min"
          :max="row.option.max"
          :step="row.option.step"
          :aria-label="row.label"
          :data-property="`icon-option-${row.option.key}`"
          @update:model-value="draft = { key: row.option.key, value: $event }"
          @commit="(value: number) => commit(row.option.key, value)"
          @cancel="draft = null"
        />
      </PanelFieldGroup>
    </PanelGrid>
    <label
      v-for="row in switches"
      :key="row.option.key"
      class="flex items-center justify-between gap-1.5 text-[11px] text-muted"
    >
      <span>{{ row.label }}</span>
      <AppSwitch
        :model-value="shown(row.option) === 1"
        :label="row.label"
        :data-property="`icon-option-${row.option.key}`"
        @update:model-value="emit('change', row.option.key, $event ? 1 : 0)"
      />
    </label>
  </div>
</template>

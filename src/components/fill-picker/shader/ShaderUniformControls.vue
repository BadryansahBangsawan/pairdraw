<script setup lang="ts">
import { computed } from 'vue'

import type { Variable, VariableType } from '@open-pencil/scene-graph'
import { colorToHex, tryParseColor } from '@open-pencil/scene-graph/color'
import type { Color } from '@open-pencil/scene-graph/primitives'
import type { ShaderUniform, ShaderUniformValue } from '@open-pencil/scene-graph/shaders'
import { useI18n, useShaderMessages } from '@open-pencil/vue/i18n'

import ColorPicker from '@/components/ColorPicker/ColorPicker.vue'
import NumberField from '@/components/inputs/NumberField.vue'
import { VariablePicker, type VariablePickerItem } from '@/components/ui/binding'
import AppSwitch from '@/components/ui/toggle/AppSwitch.vue'

/**
 * The inputs a shader declares, one row each: the value the document stores, and the variable the
 * input follows instead when it is bound. Which control a row shows comes from the declaration's
 * type, the same order the renderer packs its uniform array in.
 */
const {
  uniforms,
  values = {},
  bindings = {},
  variables,
  disabled = false
} = defineProps<{
  /** The inputs the shader's code declares, in declaration order. */
  uniforms: readonly ShaderUniform[]
  /** The values the document stores by input name. */
  values?: Readonly<Record<string, ShaderUniformValue>>
  /** The variables bound inputs follow, by input name. */
  bindings?: Readonly<Record<string, string>>
  /** Every variable a document input may point at. */
  variables: readonly Variable[]
  disabled?: boolean
}>()
const emit = defineEmits<{
  setValue: [name: string, value: ShaderUniformValue]
  bind: [name: string, variableId: string | null]
}>()

const { common, panels } = useI18n()
const shaderMessages = useShaderMessages()

/** The inputs the panel edits: the renderer supplies automatic and sampler ones itself. */
const rows = computed(() =>
  uniforms.filter((uniform) => uniform.automatic === undefined && uniform.kind !== 'sampler')
)

const TYPE_OF_KIND: Readonly<Record<ShaderUniform['kind'], VariableType | undefined>> = {
  number: 'FLOAT',
  vector: 'FLOAT',
  color: 'COLOR',
  boolean: 'BOOLEAN',
  sampler: undefined
}

const pickers = computed(() =>
  rows.value.map((uniform) => {
    const type = TYPE_OF_KIND[uniform.kind]
    const selected = bindings[uniform.name]
    const items: VariablePickerItem[] = type
      ? variables
          .filter((variable) => variable.type === type)
          .map((variable) => ({ id: variable.id, name: variable.name }))
      : []
    return { uniform, selected, items, type }
  })
)

function numberValue(uniform: ShaderUniform, at: number): number {
  const value = values[uniform.name]
  if (Array.isArray(value)) return Number(value[at] ?? 0)
  return at === 0 && typeof value === 'number' ? value : Number(uniform.default ?? 0)
}

function vectorValue(uniform: ShaderUniform): number[] {
  return Array.from({ length: uniform.components }, (_, at) => numberValue(uniform, at))
}

function booleanValue(uniform: ShaderUniform): boolean {
  const value = values[uniform.name]
  return typeof value === 'boolean' ? value : uniform.default === true
}

function colorValue(uniform: ShaderUniform): Color {
  const value = values[uniform.name]
  const parsed = typeof value === 'string' ? tryParseColor(value) : null
  return (
    parsed ??
    tryParseColor(String(uniform.default ?? '#000000')) ?? {
      r: 0,
      g: 0,
      b: 0,
      a: 1
    }
  )
}

function setColor(uniform: ShaderUniform, color: Color) {
  emit('setValue', uniform.name, colorToHex(color))
}

function setVectorComponent(uniform: ShaderUniform, at: number, next: number) {
  const value = vectorValue(uniform)
  value[at] = next
  emit('setValue', uniform.name, value)
}
</script>

<template>
  <div v-if="rows.length" class="flex flex-col gap-1" data-test-id="shader-uniforms">
    <span class="text-xs text-muted">{{ shaderMessages.inputs }}</span>
    <div
      v-for="{ uniform, selected, items, type } in pickers"
      :key="uniform.name"
      class="flex items-center gap-1.5"
      :data-test-id="`shader-uniform-${uniform.name}`"
    >
      <span class="min-w-0 flex-1 truncate text-xs" :title="uniform.name">
        {{ uniform.label ?? uniform.name }}
      </span>

      <NumberField
        v-if="uniform.kind === 'number'"
        class="w-16 flex-none"
        :model-value="numberValue(uniform, 0)"
        :min="uniform.min"
        :max="uniform.max"
        :disabled="disabled || selected !== undefined"
        @update:model-value="emit('setValue', uniform.name, $event)"
      />
      <div v-else-if="uniform.kind === 'vector'" class="flex w-32 flex-none gap-1">
        <NumberField
          v-for="at in uniform.components"
          :key="at"
          class="w-full"
          :model-value="numberValue(uniform, at - 1)"
          :disabled="disabled || selected !== undefined"
          @update:model-value="setVectorComponent(uniform, at - 1, $event)"
        />
      </div>
      <AppSwitch
        v-else-if="uniform.kind === 'boolean'"
        :model-value="booleanValue(uniform)"
        :label="uniform.label ?? uniform.name"
        :disabled="disabled || selected !== undefined"
        @update:model-value="emit('setValue', uniform.name, $event)"
      />
      <ColorPicker
        v-else
        :color="colorValue(uniform)"
        :class="{
          'pointer-events-none opacity-50': disabled || selected !== undefined
        }"
        @update="setColor(uniform, $event)"
      />

      <VariablePicker
        v-if="type"
        :items="items"
        :selected="selected"
        :state="selected ? 'bound' : 'unbound'"
        :trigger-label="shaderMessages.bindInput"
        :search-placeholder="common.search"
        :empty-label="panels.noVariablesFound"
        :detach-label="panels.detachVariable"
        :disabled="disabled"
        :aria-label="shaderMessages.bindInput"
        @select="emit('bind', uniform.name, $event)"
        @detach="emit('bind', uniform.name, null)"
      />
    </div>
  </div>
</template>

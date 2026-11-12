<script setup lang="ts">
/**
 * The controls a script's `@schema` header declares: one per `@input` line, each bindable to a
 * document variable of the same type. A value and a binding are both document data, so writing
 * one is an undo step, and the live watcher runs the script from the update it sends.
 */
import { ref } from 'vue'

import { colorToHex, parseColor } from '@open-pencil/scene-graph/color'
import type { Color } from '@open-pencil/scene-graph/primitives'
import type { ScriptInputValue } from '@open-pencil/scene-graph/script'
import type { VariableType } from '@open-pencil/scene-graph/types'
import { useEditor } from '@open-pencil/vue'
import { useI18n } from '@open-pencil/vue/i18n'
import { useSceneComputed } from '@open-pencil/vue/internal/scene-computed'

import { setScriptBinding, setScriptInput } from '@/app/code/script/inputs'
import { readScriptNodeData } from '@/app/code/script/run-node'
import { inputValue, type ScriptInputDeclaration } from '@/app/code/script/schema-header'
import NumberField from '@/components/inputs/NumberField.vue'
import { VariablePicker, type VariablePickerItem } from '@/components/ui/binding'
import AppInput from '@/components/ui/input/AppInput.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import AppSwitch from '@/components/ui/toggle/AppSwitch.vue'

const { nodeId, declarations } = defineProps<{
  nodeId: string
  declarations: readonly ScriptInputDeclaration[]
}>()

const store = useEditor()
const { code, common, panels } = useI18n()

/** A variable type can fill an input of a kind; `enum` and `ref` inputs take no variable. */
const VARIABLE_TYPES: Partial<Record<ScriptInputDeclaration['kind'], VariableType>> = {
  number: 'FLOAT',
  string: 'STRING',
  boolean: 'BOOLEAN',
  color: 'COLOR'
}

const data = useSceneComputed(() => readScriptNodeData(store.graph, nodeId))
const pickerFor = ref<string | null>(null)

function valueOf(declaration: ScriptInputDeclaration): ScriptInputValue {
  const stored = data.value?.inputs?.[declaration.name]
  return inputValue(declaration, stored) ?? ''
}

function boundTo(name: string): string | undefined {
  return data.value?.bindings?.[name]
}

function boundName(name: string): string | undefined {
  const variableId = boundTo(name)
  return variableId ? store.graph.variables.get(variableId)?.name : undefined
}

function write(declaration: ScriptInputDeclaration, value: ScriptInputValue) {
  setScriptInput(store, nodeId, declaration.name, value)
}

function variablesFor(declaration: ScriptInputDeclaration): VariablePickerItem[] {
  const type = VARIABLE_TYPES[declaration.kind]
  if (!type) return []
  const items: VariablePickerItem[] = []
  for (const variable of store.graph.variables.values()) {
    if (variable.type !== type) continue
    items.push({
      id: variable.id,
      name: variable.name,
      collection: store.graph.variableCollections.get(variable.collectionId)?.name
    })
  }
  return items
}

function writeColor(declaration: ScriptInputDeclaration, event: Event | undefined) {
  const input = event?.target as HTMLInputElement | undefined
  if (input) write(declaration, parseColor(input.value))
}

function detach(declaration: ScriptInputDeclaration) {
  setScriptBinding(store, nodeId, declaration.name, null)
  pickerFor.value = null
}
</script>

<template>
  <div v-if="declarations.length > 0" data-test-id="script-inputs" class="px-3.5 pb-2.5">
    <p class="pb-1 text-[11px] font-medium text-muted">{{ code.scriptInputs }}</p>
    <div
      v-for="declaration in declarations"
      :key="declaration.name"
      data-test-id="script-input"
      :data-input-name="declaration.name"
      class="flex items-center gap-2 py-0.5"
    >
      <span class="w-20 shrink-0 truncate text-[11px] text-muted">{{ declaration.name }}</span>
      <template v-if="boundName(declaration.name)">
        <span data-test-id="script-input-bound" class="min-w-0 flex-1 truncate text-[11px]">
          {{ boundName(declaration.name) }}
        </span>
        <button
          type="button"
          data-test-id="script-input-detach"
          class="rounded px-1.5 py-0.5 text-[11px] hover:bg-hover"
          :aria-label="code.scriptDetachInput"
          @click="detach(declaration)"
        >
          {{ code.scriptDetachInput }}
        </button>
      </template>
      <template v-else>
        <AppSwitch
          v-if="declaration.kind === 'boolean'"
          :model-value="valueOf(declaration) === true"
          :label="declaration.name"
          class="flex-1"
          @update:model-value="write(declaration, $event)"
        />
        <NumberField
          v-else-if="declaration.kind === 'number'"
          :model-value="Number(valueOf(declaration))"
          :label="declaration.name"
          class="min-w-0 flex-1"
          @update:model-value="write(declaration, $event)"
        />
        <AppSelect
          v-else-if="declaration.kind === 'enum'"
          :model-value="String(valueOf(declaration))"
          :options="(declaration.options ?? []).map((option) => ({ value: option, label: option }))"
          :label="declaration.name"
          class="min-w-0 flex-1"
          @update:model-value="write(declaration, $event)"
        />
        <AppInput
          v-else-if="declaration.kind === 'color'"
          :model-value="
            typeof valueOf(declaration) === 'object'
              ? colorToHex(valueOf(declaration) as Color)
              : ''
          "
          :aria-label="declaration.name"
          class="min-w-0 flex-1"
          @change="writeColor(declaration, $event)"
        />
        <AppInput
          v-else
          :model-value="String(valueOf(declaration))"
          :aria-label="declaration.name"
          class="min-w-0 flex-1"
          @update:model-value="write(declaration, $event)"
        />
        <button
          v-if="VARIABLE_TYPES[declaration.kind] && variablesFor(declaration).length > 0"
          type="button"
          data-test-id="script-input-bind"
          class="shrink-0 rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover"
          :aria-label="code.scriptBindInput"
          @click="pickerFor = declaration.name"
        >
          ⇄
        </button>
        <VariablePicker
          v-if="pickerFor === declaration.name"
          :open="pickerFor === declaration.name"
          :items="variablesFor(declaration)"
          state="unbound"
          :trigger-label="code.scriptBindInput"
          :search-placeholder="common.search"
          :empty-label="panels.noVariablesFound"
          :detach-label="code.scriptDetachInput"
          @select="
            (variableId) => {
              setScriptBinding(store, nodeId, declaration.name, variableId)
              pickerFor = null
            }
          "
          @detach="detach(declaration)"
          @update:open="(open) => !open && (pickerFor = null)"
        />
      </template>
    </div>
  </div>
</template>

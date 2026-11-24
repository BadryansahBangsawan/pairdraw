<script setup lang="ts">
import { computed } from 'vue'

import type { Variable } from '@pairdraw/scene-graph'
import { variableText } from '@pairdraw/scene-graph/variables'
import { useEditor } from '@pairdraw/vue'
import type { BindingProvider } from '@pairdraw/vue/controls/binding-provider'
import { useI18n } from '@pairdraw/vue/i18n'
import { BindableValueRoot } from '@pairdraw/vue/primitives/BindableValue'

import IconButton from '@/components/ui/button/IconButton.vue'
import { VARIABLE_TYPE_ICONS } from '@/components/variables/type-icons'

import BoundFieldRow from './BoundFieldRow.vue'
import { BOUND_LAYER_FIELDS, type BoundLayerField } from './fields'

/**
 * The variable a layer field follows, with its value here and a way to let go of it.
 */
const { nodeId, field, label } = defineProps<{
  nodeId: string
  field: BoundLayerField
  label: string
}>()

const editor = useEditor()
const { panels } = useI18n()
const config = BOUND_LAYER_FIELDS[field]
// The row reads the binding alone, never the field's value, so any field's provider fits.
const provider: BindingProvider<unknown> = config.useProvider()
const targets = computed(() => [{ nodeId, path: config.path }])

function valueText(variableId: string) {
  return variableText(editor.graph.resolveVariableForNode(nodeId, variableId))
}

/** A deleted variable stays bound and resolvable, so the row says why it is no longer listed. */
function deletedNotice(variable: Variable | undefined) {
  return variable?.deleted === true
    ? panels.value.variableDeleted({ name: variable.name })
    : undefined
}
</script>

<template>
  <BindableValueRoot v-slot="binding" :provider="provider" :targets="targets" :value="undefined">
    <BoundFieldRow
      v-if="binding.state !== 'unbound'"
      :label="label"
      :name="binding.variable?.name ?? binding.bindingId ?? panels.unresolvedVariable"
      :value="binding.variable ? valueText(binding.variable.id) : undefined"
      :tone="binding.state === 'unresolved' ? 'unresolved' : 'variable'"
      :deleted="binding.variable?.deleted === true"
      :deleted-label="deletedNotice(binding.variable)"
    >
      <template #icon>
        <component
          :is="VARIABLE_TYPE_ICONS[binding.variable?.type ?? 'STRING']"
          class="size-3.5 shrink-0 text-muted"
          aria-hidden="true"
        />
      </template>
      <template #actions>
        <IconButton :label="panels.detachVariable" @click="binding.actions.unbind()">
          <icon-lucide-unlink class="size-3.5" />
        </IconButton>
      </template>
    </BoundFieldRow>
  </BindableValueRoot>
</template>

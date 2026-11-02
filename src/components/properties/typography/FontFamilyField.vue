<script setup lang="ts">
import { computed } from 'vue'

import {
  useFontFamilyBindingProvider,
  type BindingTarget
} from '@open-pencil/vue/controls/binding-provider'
import { useCommonMessages, usePanelMessages } from '@open-pencil/vue/i18n'
import { BindableValueRoot } from '@open-pencil/vue/primitives/BindableValue'

import FontPicker from '@/components/font-picker/FontPicker.vue'
import VariableBindingPicker from '@/components/properties/binding/VariableBindingPicker.vue'
import { BindingPill } from '@/components/ui/binding'

/**
 * The text layers' font family: picked from the fonts, or bound to a text variable, as Figma's
 * typography panel binds it. A bound family shows the variable in place of the picker, with the
 * family it names here; the editor draws and loads whatever family a mode or edit gives it.
 */
const { nodeIds, family } = defineProps<{
  /** Every text layer the field edits; a variable binds to all of them. */
  nodeIds: readonly string[]
  /** The family the layers share, or empty when they differ. */
  family: string
}>()

const emit = defineEmits<{ select: [family: string] }>()

const panels = usePanelMessages()
const common = useCommonMessages()
const provider = useFontFamilyBindingProvider()
const targets = computed<BindingTarget[]>(() =>
  nodeIds.map((nodeId) => ({ nodeId, path: 'fontFamily' }))
)

function tooltip(name: string | undefined, resolved: unknown) {
  if (!name) return panels.value.unresolvedVariable
  return typeof resolved === 'string' ? `${name} · ${resolved}` : name
}
</script>

<template>
  <BindableValueRoot v-slot="binding" :provider="provider" :targets="targets" :value="family">
    <div class="flex min-w-0 flex-1 items-center gap-1" data-property="font-family">
      <div
        v-if="binding.variable || binding.state === 'unresolved'"
        class="flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-field bg-panel-field px-1"
        role="group"
        :aria-label="panels.fontFamily"
        data-test-id="font-family-binding"
      >
        <BindingPill
          :unresolved="binding.state === 'unresolved'"
          :label="binding.variable?.name ?? binding.bindingId ?? panels.unresolvedVariable"
          :tooltip="tooltip(binding.variable?.name, binding.resolvedValue)"
        />
        <span
          v-if="family && binding.state !== 'unresolved'"
          class="max-w-1/2 min-w-0 shrink truncate pr-1 text-xs text-muted"
        >
          {{ family }}
        </span>
      </div>
      <FontPicker
        v-else
        class="min-w-0 flex-1"
        :model-value="family"
        :label="panels.fontFamily"
        :placeholder="panels.mixed"
        @select="emit('select', $event)"
      />
      <VariableBindingPicker
        :trigger-label="panels.applyVariableToFontFamily"
        :search-placeholder="common.search"
        :empty-label="panels.noVariablesFound"
        :detach-label="panels.detachVariable"
        :close-label="common.close"
      />
    </div>
  </BindableValueRoot>
</template>

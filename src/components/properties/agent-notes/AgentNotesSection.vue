<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { useExploreMessages } from '@pairdraw/vue/i18n'

import { useSelectedAgentNotes } from '@/app/ai/notes/selection'
import IconButton from '@/components/ui/button/IconButton.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'

import AgentNotesFields, { type AgentNoteField } from './AgentNotesFields.vue'

/**
 * Notes for AI on the selected layer: context agents respect when a message concerns it, and a
 * prompt the person runs in the chat. A field commits to the layer it was focused for, so a blur
 * that a selection change causes never writes the text onto the next layer.
 */
const messages = useExploreMessages()
const { nodeId, notes, save, remove, run } = useSelectedAgentNotes()

/** The fields stay open on a layer without notes once the person asked to add some. */
const adding = ref(false)
watch(nodeId, () => (adding.value = false))
const hasNotes = computed(() => notes.value !== null)
/** The layer the fields were last focused for. */
const editingId = ref<string | null>(null)

function commit(field: AgentNoteField, value: string) {
  const id = editingId.value ?? nodeId.value
  if (id) save(id, field, value)
}

function runPrompt(prompt: string) {
  if (nodeId.value) run(nodeId.value, prompt)
}

function clear() {
  if (nodeId.value) remove(nodeId.value)
  adding.value = false
}
</script>

<template>
  <PanelSection
    v-if="nodeId"
    :label="messages.notes"
    :empty="!hasNotes && !adding"
    data-test-id="agent-notes-section"
  >
    <template #actions>
      <IconButton v-if="hasNotes || adding" :label="messages.removeNotes" @click="clear">
        <icon-lucide-minus class="size-3.5" />
      </IconButton>
      <IconButton v-else :label="messages.addNotes" @click="adding = true">
        <icon-lucide-plus class="size-3.5" />
      </IconButton>
    </template>

    <AgentNotesFields
      v-if="hasNotes || adding"
      :context="notes?.context"
      :prompt="notes?.prompt"
      :focus-on-mount="adding"
      @focusin="editingId = nodeId"
      @commit="commit"
      @run="runPrompt"
    />
  </PanelSection>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import {
  addDesignDecision,
  DESIGN_MEMORY_LIMITS,
  type DesignMemory
} from '@pairdraw/scene-graph/design-memory'
import { useDesignMemoryMessages } from '@pairdraw/vue/i18n'

import { useDesignMemory } from '@/app/editor/design-memory/use'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppBadge from '@/components/ui/feedback/AppBadge.vue'
import AppPlaceholder from '@/components/ui/feedback/AppPlaceholder.vue'
import AppTextarea from '@/components/ui/input/AppTextarea.vue'

/**
 * Decisions agents follow, in order: each can be reworded, moved, or removed, and those an agent
 * recorded say so. A reworded decision is the person's.
 */
const messages = useDesignMemoryMessages()
const { memory, change } = useDesignMemory()
const draft = ref('')
const editingId = ref<string | null>(null)
const editText = ref('')

function add() {
  if (!draft.value.trim()) return
  change((current) => addDesignDecision(current, draft.value, 'person'))
  draft.value = ''
}

function update(edit: (decisions: DesignMemory['decisions']) => DesignMemory['decisions']) {
  change((current) => ({ ...current, decisions: edit([...current.decisions]) }))
}

function remove(id: string) {
  update((decisions) => decisions.filter((decision) => decision.id !== id))
}

function move(index: number, by: -1 | 1) {
  update((decisions) => {
    const [decision] = decisions.splice(index, 1)
    if (decision) decisions.splice(index + by, 0, decision)
    return decisions
  })
}

function startEditing(id: string, text: string) {
  editingId.value = id
  editText.value = text
}

function save() {
  const id = editingId.value
  editingId.value = null
  const text = editText.value.trim().slice(0, DESIGN_MEMORY_LIMITS.decisionLength).trim()
  if (!id || !text) return
  update((decisions) =>
    decisions.map((decision) =>
      decision.id === id && decision.text !== text
        ? { ...decision, text, author: 'person' as const }
        : decision
    )
  )
}
</script>

<template>
  <div v-if="memory" class="flex flex-col gap-2" data-test-id="design-memory-decisions">
    <AppPlaceholder
      v-if="memory.decisions.length === 0"
      :label="messages.noDecisionsYet"
      :description="messages.noDecisions"
      :fill="false"
      size="compact"
    />
    <ul v-else class="flex flex-col gap-1">
      <li
        v-for="(decision, index) in memory.decisions"
        :key="decision.id"
        class="flex items-start gap-1 rounded bg-panel-field px-2 py-1.5 text-[12px]"
      >
        <AppTextarea
          v-if="editingId === decision.id"
          v-model="editText"
          :rows="2"
          :aria-label="messages.editDecision"
          :maxlength="DESIGN_MEMORY_LIMITS.decisionLength"
          class="flex-1"
          @blur="save"
          @keydown.enter.exact.prevent="save"
          @keydown.escape="editingId = null"
        />
        <button
          v-else
          type="button"
          class="flex-1 whitespace-pre-wrap text-left"
          :aria-label="`${messages.editDecision}: ${decision.text}`"
          @click="startEditing(decision.id, decision.text)"
        >
          {{ decision.text }}
        </button>
        <AppBadge v-if="decision.author === 'agent'">{{ messages.byAgent }}</AppBadge>
        <IconButton :label="messages.moveUp" :disabled="index === 0" @click="move(index, -1)">
          <icon-lucide-arrow-up class="size-3" />
        </IconButton>
        <IconButton
          :label="messages.moveDown"
          :disabled="index === memory.decisions.length - 1"
          @click="move(index, 1)"
        >
          <icon-lucide-arrow-down class="size-3" />
        </IconButton>
        <IconButton :label="messages.removeDecision" @click="remove(decision.id)">
          <icon-lucide-x class="size-3" />
        </IconButton>
      </li>
    </ul>
    <AppTextarea
      v-model="draft"
      :rows="2"
      :placeholder="messages.newDecision"
      :aria-label="messages.newDecision"
      :maxlength="DESIGN_MEMORY_LIMITS.decisionLength"
    />
    <AppButton size="sm" class="self-end" :disabled="!draft.trim()" @click="add">
      {{ messages.addDecision }}
    </AppButton>
  </div>
</template>

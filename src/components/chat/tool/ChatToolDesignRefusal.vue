<script setup lang="ts">
import { inject, ref } from 'vue'

import type { DesignMemoryGroup } from '@pairdraw/scene-graph/design-memory'
import { useDesignMemoryMessages } from '@pairdraw/vue/i18n'

import { useActiveEditorStoreRef } from '@/app/editor/active-store'
import { allowDesignMemoryValue } from '@/app/editor/design-memory/actions'
import { CHAT_NODES_LIVE } from '@/components/chat/tool/context'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'

/**
 * The values the design memory undid an agent's edit for, each with Allow, which adds it to the
 * memory so the agent's next try goes through. A conversation from another document offers none.
 */
const { refusals } = defineProps<{
  refusals: { group: DesignMemoryGroup; value: string | number }[]
}>()
const messages = useDesignMemoryMessages()
const live = inject(CHAT_NODES_LIVE, ref(true))
const activeStore = useActiveEditorStoreRef()
const allowed = ref(new Set<string>())

function allow(group: DesignMemoryGroup, value: string | number) {
  const store = activeStore.value
  if (!store || !live.value) return
  allowDesignMemoryValue(store, group, value)
  allowed.value = new Set([...allowed.value, `${group}:${value}`])
}
</script>

<template>
  <AppAlert tone="warning" :heading="messages.refused" data-slot="chat-tool-design-refusal">
    <ul class="flex flex-wrap gap-1.5">
      <li v-for="{ group, value } in refusals" :key="`${group}:${value}`">
        <AppButton
          size="xs"
          variant="outline"
          :disabled="!live || allowed.has(`${group}:${value}`)"
          @click="allow(group, value)"
        >
          {{
            allowed.has(`${group}:${value}`)
              ? messages.allowed({ value: String(value) })
              : messages.allow({ value: String(value) })
          }}
        </AppButton>
      </li>
    </ul>
  </AppAlert>
</template>

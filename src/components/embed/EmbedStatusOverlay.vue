<script setup lang="ts">
/**
 * Covers an embedded editor until its host page connects, or explains why no page can: the embed
 * link names no valid host origin. It goes once the host connects.
 */
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { useEditorMessages } from '@open-pencil/vue/i18n'

import type { EmbedStatus } from '@/app/embed'
import AppPlaceholder from '@/components/ui/feedback/AppPlaceholder.vue'
import theme from '@/theme/embed/status-overlay'

const { status } = defineProps<{ status: EmbedStatus }>()

const editorMessages = useEditorMessages()
const overlay = tv(theme)
const styles = computed(() => {
  if (status === 'connected') return null
  const slots = overlay({ status })
  return { root: slots.root(), icon: slots.icon() }
})
const copy = computed(() =>
  status === 'invalid-origin'
    ? {
        label: editorMessages.value.embedInvalidOrigin,
        description: editorMessages.value.embedInvalidOriginDescription
      }
    : {
        label: editorMessages.value.embedWaiting,
        description: editorMessages.value.embedWaitingDescription
      }
)
</script>

<template>
  <div
    v-if="styles"
    role="status"
    :class="styles.root"
    data-slot="embed-status"
    :data-status="status"
  >
    <AppPlaceholder
      label-as="h1"
      :label="copy.label"
      :description="copy.description"
      :ui="{ icon: styles.icon }"
    >
      <template #icon>
        <icon-lucide-shield-alert v-if="status === 'invalid-origin'" class="size-5" />
        <icon-lucide-plug v-else class="size-5" />
      </template>
    </AppPlaceholder>
  </div>
</template>

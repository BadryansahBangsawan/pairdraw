<script setup lang="ts">
import { useObjectUrl } from '@vueuse/core'

import { useChatContextMessages } from '@open-pencil/vue/i18n'

import type { PinnedReference } from '@/app/ai/chat/pins/types'
import IconButton from '@/components/ui/button/IconButton.vue'
import Tip from '@/components/ui/overlay/Tip.vue'

/** A pinned reference image, which its name names on hover and the person can unpin. */
const {
  reference,
  disabled = false,
  ui
} = defineProps<{
  reference: PinnedReference
  disabled?: boolean
  ui: { root: string; image: string; remove: string; icon: string }
}>()
const emit = defineEmits<{ remove: [] }>()

const messages = useChatContextMessages()
const url = useObjectUrl(() => reference.image)
</script>

<template>
  <li :class="ui.root" data-test-id="chat-pinned-reference">
    <Tip :label="reference.name" as-child>
      <img v-if="url" :src="url" :alt="reference.name" :class="ui.image" />
    </Tip>
    <IconButton
      v-if="!disabled"
      :label="messages.removeReference({ name: reference.name })"
      size="xs"
      :class="ui.remove"
      @click="emit('remove')"
    >
      <icon-lucide-x :class="ui.icon" />
    </IconButton>
  </li>
</template>

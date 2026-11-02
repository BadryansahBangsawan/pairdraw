<script setup lang="ts">
import { computed } from 'vue'

import { IS_TAURI } from '@open-pencil/core/constants'

import { fileLinkComponents } from '@/app/ai/chat/references/files'
import { referenceComponents } from '@/app/ai/chat/references/link'
import { markdownRenderKey, type MarkdownSurface } from '@/app/shell/markdown/state'
import ChatFileLink from '@/components/chat/reference/ChatFileLink.vue'
import ChatReferenceLink from '@/components/chat/reference/ChatReferenceLink.vue'
import MarkdownContent from '@/components/markdown/MarkdownContent.vue'

const {
  content,
  mode = 'static',
  surface = 'message',
  localFiles = IS_TAURI
} = defineProps<{
  content: string
  mode?: 'static' | 'streaming'
  surface?: MarkdownSurface
  /** Links to files on this computer show them in their folder; the desktop app only. */
  localFiles?: boolean
}>()

const renderKey = computed(() => markdownRenderKey({ mode, surface }))
// References to layers, pages, and skills render as chips, and on the desktop links to local
// files as links that show them; other links stay links.
const rendered = computed(() => {
  const withReferences = referenceComponents(content)
  return localFiles ? fileLinkComponents(withReferences) : withReferences
})
const components = { 'chat-reference': ChatReferenceLink, 'chat-file': ChatFileLink }
</script>

<template>
  <MarkdownContent
    :key="renderKey"
    data-slot="chat-markdown"
    :content="rendered"
    :components="components"
    :mode="mode"
    density="compact"
    highlight-code
  />
</template>

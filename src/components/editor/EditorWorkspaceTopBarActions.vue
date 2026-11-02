<script setup lang="ts">
import { formatShortcut } from '@open-pencil/vue/editor/commands'
import { useI18n } from '@open-pencil/vue/i18n'

import { CHAT_COLUMN_SHORTCUT, chatColumnOpen, toggleChatColumn } from '@/app/ai/chat/panel'
import { useEditorStore } from '@/app/editor/active-store'
import { openSettingsDialog } from '@/app/settings/dialog'
import { appMenuShortcut } from '@/app/shell/menu/shortcut'
import { CloudDocumentStatusHost } from '@/components/cloud/integration'
import CollabPanel from '@/components/collab-panel/CollabPanel.vue'
import IconButton from '@/components/ui/button/IconButton.vue'

import ZoomDropdown from './ZoomDropdown.vue'

/**
 * The open document's end of the top bar: its cloud status, who is here, the zoom, the AI chat,
 * preview, Settings, and Share last. The workspace teleports it into the bar, so it stays bound
 * to that workspace's tab.
 */
const store = useEditorStore()
const { editor, settings } = useI18n()
</script>

<template>
  <div class="flex items-center gap-1">
    <CloudDocumentStatusHost />
    <CollabPanel>
      <ZoomDropdown />
      <!-- Open, its raised pill takes a ring on the bar's backdrop, like the front tab. -->
      <IconButton
        :label="editor.toggleAIChat({ shortcut: formatShortcut(CHAT_COLUMN_SHORTCUT) ?? '' })"
        size="sm"
        side="bottom"
        toggle
        :active="chatColumnOpen"
        aria-controls="editor-chat-column"
        data-test-id="editor-toggle-chat"
        class="data-[state=on]:ring-1 data-[state=on]:ring-border"
        @click="toggleChatColumn"
      >
        <icon-lucide-sparkles class="size-4" />
      </IconButton>
      <IconButton
        :label="
          editor.startPreview({
            shortcut: formatShortcut(appMenuShortcut('toggle-preview')) ?? ''
          })
        "
        size="sm"
        side="bottom"
        data-test-id="editor-start-preview"
        @click="store.startPlay()"
      >
        <icon-lucide-play class="size-4" />
      </IconButton>
      <IconButton
        :label="settings.title"
        size="sm"
        side="bottom"
        data-test-id="app-settings-trigger"
        @click="openSettingsDialog()"
      >
        <icon-lucide-settings class="size-4" />
      </IconButton>
    </CollabPanel>
  </div>
</template>

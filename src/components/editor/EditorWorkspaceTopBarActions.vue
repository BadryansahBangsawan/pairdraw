<script setup lang="ts">
import { formatShortcut } from '@open-pencil/vue/editor/commands'
import { useI18n, useSlidesMessages } from '@open-pencil/vue/i18n'

import { CHAT_COLUMN_SHORTCUT, chatColumnOpen, toggleChatColumn } from '@/app/ai/chat/panel'
import { useEditorStore } from '@/app/editor/active-store'
import { openSettingsDialog } from '@/app/settings/dialog'
import { appMenuShortcut } from '@/app/shell/menu/shortcut'
import {
  layersPanelOpen,
  propertiesPanelOpen,
  toggleLayersPanel,
  togglePropertiesPanel
} from '@/app/shell/side-panels'
import { startPresentation } from '@/app/slides/present'
import BrowserToolbar from '@/components/browser/BrowserToolbar.vue'
import { CloudDocumentStatusHost } from '@/components/cloud/integration'
import CollabPanel from '@/components/collab-panel/CollabPanel.vue'
import IconButton from '@/components/ui/button/IconButton.vue'

import ZoomDropdown from './ZoomDropdown.vue'

/**
 * The open document's end of the top bar: its cloud status, who is here, the zoom, the side
 * panels and the AI chat, preview, Settings, and Share last. The workspace teleports it into the bar, so it stays bound
 * to that workspace's tab.
 */
const store = useEditorStore()
const { editor, settings } = useI18n()
const slides = useSlidesMessages()
</script>

<template>
  <div class="flex items-center gap-1">
    <CloudDocumentStatusHost />
    <CollabPanel>
      <BrowserToolbar />
      <ZoomDropdown />
      <!-- Open, a panel's raised pill takes a ring on the bar's backdrop, like the front tab. -->
      <IconButton
        :label="editor.toggleLayersPanel"
        size="sm"
        side="bottom"
        toggle
        :active="layersPanelOpen"
        aria-controls="editor-layers-panel"
        data-test-id="editor-toggle-layers-panel"
        class="data-[state=on]:ring-1 data-[state=on]:ring-border"
        @click="toggleLayersPanel"
      >
        <icon-lucide-panel-left class="size-4" />
      </IconButton>
      <IconButton
        :label="editor.togglePropertiesPanel"
        size="sm"
        side="bottom"
        toggle
        :active="propertiesPanelOpen"
        aria-controls="editor-properties-panel"
        data-test-id="editor-toggle-properties-panel"
        class="data-[state=on]:ring-1 data-[state=on]:ring-border"
        @click="togglePropertiesPanel"
      >
        <icon-lucide-panel-right class="size-4" />
      </IconButton>
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
        :label="slides.present({ shortcut: formatShortcut(appMenuShortcut('present')) ?? '' })"
        size="sm"
        side="bottom"
        data-test-id="editor-start-presentation"
        @click="startPresentation(store)"
      >
        <icon-lucide-presentation class="size-4" />
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

<script setup lang="ts">
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, useTemplateRef, type ComponentPublicInstance } from 'vue'

import { resolveEditorProfile } from '@open-pencil/core'
import { formatShortcut } from '@open-pencil/vue/editor/commands'
import { useViewportKind } from '@open-pencil/vue/editor/viewport-kind'
import { useI18n } from '@open-pencil/vue/i18n'

import { CHAT_COLUMN_SHORTCUT, chatColumnOpen, toggleChatColumn } from '@/app/ai/chat/panel'
import { provideTabEditorStore } from '@/app/editor/active-store'
import { appRuntimeConfig } from '@/app/runtime/config'
import { EDITOR_PANEL_LIMITS } from '@/app/shell/layout-storage'
import { appMenuShortcut } from '@/app/shell/menu/shortcut'
import type { Tab } from '@/app/tabs'
import CanvasSplitRoot from '@/components/canvas/CanvasSplitRoot.vue'
import ChatPanel from '@/components/chat/ChatPanel.vue'
import CollabPanel from '@/components/collab-panel/CollabPanel.vue'
import ActiveRoomOverlay from '@/components/collab-room/ActiveRoomOverlay.vue'
import { useRoomActions } from '@/components/collab-room/useRoomActions'
import CommentDeleteDialog from '@/components/comments/CommentDeleteDialog.vue'
import EditorCanvas from '@/components/EditorCanvas.vue'
import LayersPanel from '@/components/LayersPanel.vue'
import MobileDrawer from '@/components/MobileDrawer.vue'
import MobileHud from '@/components/MobileHud/MobileHud.vue'
import PropertiesPanel from '@/components/PropertiesPanel.vue'
import StatusesDialog from '@/components/statuses/StatusesDialog.vue'
import EditorToolbar from '@/components/toolbar/EditorToolbar.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import VariablesDialog from '@/components/variables/VariablesDialog.vue'
import splitterTheme from '@/theme/splitter'

import EditorCanvasPrompt from './EditorCanvasPrompt.vue'
import { useEditorWorkspaceLayout } from './useEditorWorkspaceLayout'
import WorkspacePill from './WorkspacePill.vue'

const showChrome = appRuntimeConfig.showChrome
/**
 * The document tab this workspace edits. WorkspaceView keys the workspace by tab, so the tab and
 * its store are fixed for its lifetime, and its editor UI stays bound to that document rather
 * than following the active tab to the next document when this one closes.
 */
const { tab } = defineProps<{ tab: Tab }>()
const store = tab.store
provideTabEditorStore(store)
const { isMobile } = useViewportKind()
const { layout: editorLayout, saveResizedLayout } = useEditorWorkspaceLayout({
  group: useTemplateRef<ComponentPublicInstance>('splitterGroup'),
  canvas: useTemplateRef('canvasPanel'),
  properties: useTemplateRef('propertiesPanel'),
  chat: useTemplateRef('chatPanel'),
  chatOpen: chatColumnOpen
})
/** Dragging the chat column shut, or open again, is the same as its toggle. */
function setChatColumnOpen(open: boolean) {
  chatColumnOpen.value = open
}
const horizontalSplitterStyles = tv(splitterTheme)({ direction: 'horizontal' })
/**
 * A canvas whose view hides the panels takes the whole window when it is the only one shown, in the
 * canvas-only layout; split view keeps the panels for the other panes.
 */
const canvasAlone = computed(
  () => !resolveEditorProfile(store.state).panels && store.visiblePaneCount.value <= 1
)
const { editor, panels } = useI18n()
// Until a room's document arrives there is nothing to edit, so its screen replaces the editor.
const { pending: roomPending } = useRoomActions()
</script>

<template>
  <div v-if="roomPending" :key="'room-' + tab.id" class="relative flex flex-1 overflow-hidden">
    <ActiveRoomOverlay />
  </div>

  <SplitterGroup
    v-else-if="!isMobile && showChrome && store.state.showUI && !canvasAlone"
    ref="splitterGroup"
    :key="tab.id"
    direction="horizontal"
    class="flex-1 overflow-hidden"
    @layout="saveResizedLayout"
  >
    <SplitterPanel
      id="layers"
      :order="1"
      size-unit="px"
      :default-size="editorLayout.layers"
      :min-size="EDITOR_PANEL_LIMITS.layers.min"
      :max-size="EDITOR_PANEL_LIMITS.layers.max"
      class="flex"
    >
      <LayersPanel />
    </SplitterPanel>
    <SplitterResizeHandle
      data-test-id="left-splitter-handle"
      :class="horizontalSplitterStyles.handle()"
    >
      <div :class="horizontalSplitterStyles.divider()" />
    </SplitterResizeHandle>
    <!-- The canvas has no size of its own: it takes what the side panels leave. -->
    <SplitterPanel id="canvas" ref="canvasPanel" :order="2" :min-size="30" class="flex">
      <div class="relative flex min-w-0 flex-1">
        <CanvasSplitRoot />
        <EditorCanvasPrompt />
        <ActiveRoomOverlay />
        <EditorToolbar />
      </div>
    </SplitterPanel>
    <SplitterResizeHandle
      data-test-id="right-splitter-handle"
      :class="horizontalSplitterStyles.handle()"
    >
      <div :class="horizontalSplitterStyles.divider()" />
    </SplitterResizeHandle>
    <SplitterPanel
      id="properties"
      ref="propertiesPanel"
      :order="3"
      size-unit="px"
      :default-size="editorLayout.properties"
      :min-size="EDITOR_PANEL_LIMITS.properties.min"
      :max-size="EDITOR_PANEL_LIMITS.properties.max"
      class="flex flex-col"
    >
      <div class="flex shrink-0 items-center gap-1 border-b border-border px-1.5 py-1.5">
        <CollabPanel class="min-w-0 flex-1" />
        <IconButton
          :label="editor.toggleAIChat({ shortcut: formatShortcut(CHAT_COLUMN_SHORTCUT) ?? '' })"
          toggle
          :active="chatColumnOpen"
          aria-controls="editor-chat-column"
          data-test-id="editor-toggle-chat"
          @click="toggleChatColumn"
        >
          <icon-lucide-sparkles class="size-3.5" />
        </IconButton>
        <IconButton
          :label="
            editor.startPreview({
              shortcut: formatShortcut(appMenuShortcut('toggle-preview')) ?? ''
            })
          "
          data-test-id="editor-start-preview"
          @click="store.startPlay()"
        >
          <icon-lucide-play class="size-3.5" />
        </IconButton>
      </div>
      <PropertiesPanel />
    </SplitterPanel>
    <SplitterResizeHandle
      v-show="chatColumnOpen"
      data-test-id="chat-splitter-handle"
      :class="horizontalSplitterStyles.handle()"
    >
      <div :class="horizontalSplitterStyles.divider()" />
    </SplitterResizeHandle>
    <!--
      The chat stays mounted while its column is closed, collapsed to nothing, so a reply that is
      running keeps its composer, queue, and permission prompts.
    -->
    <SplitterPanel
      id="chat"
      ref="chatPanel"
      :order="4"
      size-unit="px"
      collapsible
      :collapsed-size="0"
      :default-size="chatColumnOpen ? editorLayout.chat : 0"
      :min-size="EDITOR_PANEL_LIMITS.chat.min"
      :max-size="EDITOR_PANEL_LIMITS.chat.max"
      class="flex"
      @collapse="setChatColumnOpen(false)"
      @expand="setChatColumnOpen(true)"
    >
      <aside
        id="editor-chat-column"
        data-test-id="chat-column"
        :aria-label="panels.ai"
        :hidden="!chatColumnOpen"
        class="flex min-w-0 flex-1 flex-col overflow-hidden border-l border-border bg-panel"
      >
        <ChatPanel />
      </aside>
    </SplitterPanel>
  </SplitterGroup>

  <div
    v-else-if="isMobile && showChrome && store.state.showUI"
    :key="'mobile-' + tab.id"
    class="flex flex-1 overflow-hidden"
  >
    <div class="relative flex min-w-0 flex-1">
      <EditorCanvas />
      <ActiveRoomOverlay />
      <MobileHud />
      <EditorToolbar />
    </div>
    <MobileDrawer />
  </div>

  <div v-else-if="showChrome" :key="'collapsed-' + tab.id" class="flex flex-1 overflow-hidden">
    <div class="relative flex min-w-0 flex-1">
      <EditorCanvas />
      <ActiveRoomOverlay />
      <WorkspacePill
        v-if="!isMobile && canvasAlone"
        mode="preview"
        :document-name="store.state.documentName"
        :shortcut="formatShortcut(appMenuShortcut('toggle-preview')) ?? ''"
        @reset="store.resetPlay()"
        @leave="store.stopPlay()"
      />
      <WorkspacePill
        v-else-if="!isMobile"
        mode="collapsed"
        :document-name="store.state.documentName"
        :shortcut="formatShortcut(appMenuShortcut('toggle-ui')) ?? ''"
        @show-ui="store.state.showUI = true"
      />
    </div>
  </div>

  <div v-else :key="'bare-' + tab.id" class="flex flex-1 overflow-hidden">
    <div class="relative flex min-w-0 flex-1">
      <EditorCanvas />
      <ActiveRoomOverlay />
    </div>
  </div>

  <VariablesDialog />
  <StatusesDialog />
  <CommentDeleteDialog />
</template>

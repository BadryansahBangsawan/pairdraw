<script setup lang="ts">
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, useTemplateRef, type ComponentPublicInstance } from 'vue'

import { resolveEditorProfile } from '@open-pencil/core'
import { formatShortcut } from '@open-pencil/vue/editor/commands'
import { useViewportKind } from '@open-pencil/vue/editor/viewport-kind'
import { useI18n } from '@open-pencil/vue/i18n'

import { chatColumnOpen } from '@/app/ai/chat/panel'
import { isVersionHistoryOpen } from '@/app/cloud/integration'
import { provideTabEditorStore } from '@/app/editor/active-store'
import { appRuntimeConfig } from '@/app/runtime/config'
import { EDITOR_PANEL_LIMITS } from '@/app/shell/layout-storage'
import { appMenuShortcut } from '@/app/shell/menu/shortcut'
import {
  layersPanelOpen,
  openPropertiesPanelWhile,
  propertiesPanelOpen
} from '@/app/shell/side-panels'
import type { Tab } from '@/app/tabs'
import CanvasSplitRoot from '@/components/canvas/CanvasSplitRoot.vue'
import ChatPanel from '@/components/chat/ChatPanel.vue'
import ActiveRoomOverlay from '@/components/collab-room/ActiveRoomOverlay.vue'
import { useRoomActions } from '@/components/collab-room/useRoomActions'
import CommentDeleteDialog from '@/components/comments/CommentDeleteDialog.vue'
import EditorCanvas from '@/components/EditorCanvas.vue'
import LayersPanel from '@/components/LayersPanel.vue'
import MobileDrawer from '@/components/MobileDrawer.vue'
import MobileHud from '@/components/MobileHud/MobileHud.vue'
import PropertiesPanel from '@/components/PropertiesPanel.vue'
import ComponentToFrameDialog from '@/components/selection/ComponentToFrameDialog.vue'
import { SHELL_TOP_BAR_ACTIONS_ID } from '@/components/shell/top-bar'
import StatusesDialog from '@/components/statuses/StatusesDialog.vue'
import EditorToolbar from '@/components/toolbar/EditorToolbar.vue'
import VariablesDialog from '@/components/variables/VariablesDialog.vue'
import workspaceTheme from '@/theme/editor/workspace'
import splitterTheme from '@/theme/splitter'

import EditorCanvasPrompt from './EditorCanvasPrompt.vue'
import EditorWorkspaceTopBarActions from './EditorWorkspaceTopBarActions.vue'
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
const {
  layout: editorLayout,
  saveResizedLayout,
  setPanelOpen
} = useEditorWorkspaceLayout({
  group: useTemplateRef<ComponentPublicInstance>('splitterGroup'),
  layers: useTemplateRef('layersPanel'),
  canvas: useTemplateRef('canvasPanel'),
  properties: useTemplateRef('propertiesPanel'),
  chat: useTemplateRef('chatPanel'),
  layersOpen: layersPanelOpen,
  propertiesOpen: propertiesPanelOpen,
  chatOpen: chatColumnOpen
})
// The comments list and version history take the properties panel's place, so they open it.
openPropertiesPanelWhile(() => store.state.activeTool === 'COMMENT' || isVersionHistoryOpen(store))
// The handles sit on the cards' edges, which draw their own borders.
const horizontalSplitterStyles = tv(splitterTheme)({ direction: 'horizontal', seam: true })
const workspace = tv(workspaceTheme)
const workspaceStyles = workspace()
const cards = {
  layers: workspace({ side: 'layers' }).card(),
  properties: workspace({ side: 'properties' }).card(),
  chat: workspace({ side: 'chat' }).card()
}
const topBarActions = `#${SHELL_TOP_BAR_ACTIONS_ID}`
/**
 * A canvas whose view hides the panels takes the whole window when it is the only one shown, in the
 * canvas-only layout; split view keeps the panels for the other panes.
 */
const canvasAlone = computed(
  () => !resolveEditorProfile(store.state).panels && store.visiblePaneCount.value <= 1
)
const { panels } = useI18n()
// Until a room's document arrives there is nothing to edit, so its screen replaces the editor.
const { pending: roomPending } = useRoomActions()
</script>

<template>
  <div v-if="roomPending" :key="'room-' + tab.id" class="relative flex flex-1 overflow-hidden">
    <ActiveRoomOverlay />
  </div>

  <template v-else-if="!isMobile && showChrome && store.state.showUI && !canvasAlone">
    <SplitterGroup
      ref="splitterGroup"
      :key="tab.id"
      direction="horizontal"
      :class="workspaceStyles.group()"
      @layout="saveResizedLayout"
    >
      <!-- A closed side panel stays mounted, collapsed to nothing, and reopens as it was. -->
      <SplitterPanel
        id="layers"
        ref="layersPanel"
        :order="1"
        size-unit="px"
        collapsible
        :collapsed-size="0"
        :default-size="layersPanelOpen ? editorLayout.layers : 0"
        :min-size="EDITOR_PANEL_LIMITS.layers.min"
        :max-size="EDITOR_PANEL_LIMITS.layers.max"
        :class="workspaceStyles.dock()"
        @collapse="setPanelOpen('layers', false)"
        @expand="setPanelOpen('layers', true)"
      >
        <LayersPanel id="editor-layers-panel" :hidden="!layersPanelOpen" :class="cards.layers" />
      </SplitterPanel>
      <SplitterResizeHandle
        v-show="layersPanelOpen"
        data-test-id="left-splitter-handle"
        :class="horizontalSplitterStyles.handle()"
      >
        <div :class="horizontalSplitterStyles.divider()" />
      </SplitterResizeHandle>
      <!-- The canvas has no size of its own: it takes what the side panels leave. -->
      <SplitterPanel id="canvas" ref="canvasPanel" :order="2" :min-size="30" class="flex">
        <div :class="workspaceStyles.canvas()">
          <CanvasSplitRoot />
          <EditorCanvasPrompt />
          <ActiveRoomOverlay />
          <EditorToolbar />
        </div>
      </SplitterPanel>
      <SplitterResizeHandle
        v-show="propertiesPanelOpen"
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
        collapsible
        :collapsed-size="0"
        :default-size="propertiesPanelOpen ? editorLayout.properties : 0"
        :min-size="EDITOR_PANEL_LIMITS.properties.min"
        :max-size="EDITOR_PANEL_LIMITS.properties.max"
        :class="workspaceStyles.dock()"
        @collapse="setPanelOpen('properties', false)"
        @expand="setPanelOpen('properties', true)"
      >
        <PropertiesPanel
          id="editor-properties-panel"
          :hidden="!propertiesPanelOpen"
          :class="cards.properties"
        />
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
        :class="workspaceStyles.dock()"
        @collapse="setPanelOpen('chat', false)"
        @expand="setPanelOpen('chat', true)"
      >
        <aside
          id="editor-chat-column"
          data-test-id="chat-column"
          :aria-label="panels.ai"
          :hidden="!chatColumnOpen"
          :class="cards.chat"
        >
          <ChatPanel />
        </aside>
      </SplitterPanel>
    </SplitterGroup>
    <!-- The document's actions live in the top bar, bound to this tab like the panels. -->
    <Teleport defer :to="topBarActions">
      <EditorWorkspaceTopBarActions />
    </Teleport>
  </template>

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
        :rulers="appRuntimeConfig.showRulers && store.state.showRulers"
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
  <ComponentToFrameDialog />
</template>

<script setup lang="ts">
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, defineAsyncComponent, useTemplateRef, type ComponentPublicInstance } from 'vue'

import { resolveEditorProfile } from '@pairdraw/core'
import { formatShortcut } from '@pairdraw/vue/editor/commands'
import { useViewportKind } from '@pairdraw/vue/editor/viewport-kind'
import { useI18n } from '@pairdraw/vue/i18n'

import { chatColumnOpen } from '@/app/ai/chat/panel'
import { videoExportOpen } from '@/app/document/export/video/open'
import { provideTabEditorStore } from '@/app/editor/active-store'
import { appRuntimeConfig } from '@/app/runtime/config'
import { EDITOR_PANEL_LIMITS } from '@/app/shell/layout-storage'
import { appMenuShortcut } from '@/app/shell/menu/shortcut'
import { layersPanelOpen } from '@/app/shell/side-panels'
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
import ComponentToFrameDialog from '@/components/selection/ComponentToFrameDialog.vue'
import ShaderModeStage from '@/components/shader-mode/ShaderModeStage.vue'
import { SHELL_TOP_BAR_ACTIONS_ID } from '@/components/shell/top-bar'
import SlidesPresentation from '@/components/slides/SlidesPresentation.vue'
import StatusesDialog from '@/components/statuses/StatusesDialog.vue'
import EditorToolbar from '@/components/toolbar/EditorToolbar.vue'
import LazyOverlay from '@/components/ui/overlay/LazyOverlay.vue'
import workspaceTheme from '@/theme/editor/workspace'
import splitterTheme from '@/theme/splitter'

import EditorCanvasPrompt from './EditorCanvasPrompt.vue'
import EditorWorkspaceSaveFailure from './EditorWorkspaceSaveFailure.vue'
import EditorWorkspaceTopBarActions from './EditorWorkspaceTopBarActions.vue'
import { useEditorWorkspaceLayout } from './useEditorWorkspaceLayout'
import WorkspacePill from './WorkspacePill.vue'
import ZoomDropdown from './ZoomDropdown.vue'

const showChrome = appRuntimeConfig.showChrome
/** An embed has no top bar: its host page owns the document's actions. */
const hasTopBar = !appRuntimeConfig.embed
/**
 * The document tab this workspace edits. WorkspaceView keys the workspace by tab, so the tab and
 * its store are fixed for its lifetime, and its editor UI stays bound to that document rather
 * than following the active tab to the next document when this one closes.
 */
const { tab } = defineProps<{ tab: Tab }>()
const store = tab.store
provideTabEditorStore(store)
// The variables window loads with its first opening, not with the document.
// The video dialog loads the encoders, so it comes with its own chunk when first opened.
const PrototypeVideoDialog = defineAsyncComponent(
  () => import('@/components/export/PrototypeVideoDialog.vue')
)
const VariablesDialog = defineAsyncComponent(
  () => import('@/components/variables/VariablesDialog.vue')
)
const { isMobile } = useViewportKind()
const {
  layout: editorLayout,
  saveResizedLayout,
  setPanelOpen
} = useEditorWorkspaceLayout({
  group: useTemplateRef<ComponentPublicInstance>('splitterGroup'),
  layers: useTemplateRef('layersPanel'),
  canvas: useTemplateRef('canvasPanel'),
  chat: useTemplateRef('chatPanel'),
  layersOpen: layersPanelOpen,
  chatOpen: chatColumnOpen
})
// The handles sit on the cards' edges, which draw their own borders.
const horizontalSplitterStyles = tv(splitterTheme)({ direction: 'horizontal', seam: true })
const workspace = tv(workspaceTheme)
const workspaceStyles = workspace()
const cards = {
  layers: workspace({ side: 'layers' }).card(),
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
/** A presentation takes the whole window, over the top bar and every pane. */
const presenting = computed(() => store.getPresentation() !== null)
/** Shader Mode shows one shader on its own, in place of the panels and the canvas. */
const shaderMode = computed(() => {
  void store.state.sceneVersion
  return store.getShaderMode() !== null
})
// Until a room's document arrives there is nothing to edit, so its screen replaces the editor.
const { pending: roomPending } = useRoomActions()
</script>

<template>
  <div v-if="roomPending" :key="'room-' + tab.id" class="relative flex flex-1 overflow-hidden">
    <ActiveRoomOverlay />
  </div>

  <SlidesPresentation v-else-if="presenting" :key="'present-' + tab.id" />

  <ShaderModeStage v-else-if="shaderMode" :key="'shader-' + tab.id" />

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
          <EditorWorkspaceSaveFailure />
          <EditorCanvasPrompt />
          <ActiveRoomOverlay />
          <EditorToolbar />
          <div :class="workspaceStyles.zoom()" data-canvas-inset="bottom right">
            <ZoomDropdown />
          </div>
        </div>
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
        :order="3"
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
    <Teleport v-if="hasTopBar" defer :to="topBarActions">
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

  <LazyOverlay :open="store.state.variablesOpen"><VariablesDialog /></LazyOverlay>
  <LazyOverlay :open="videoExportOpen(store).value"><PrototypeVideoDialog /></LazyOverlay>
  <StatusesDialog />
  <CommentDeleteDialog />
  <ComponentToFrameDialog />
</template>

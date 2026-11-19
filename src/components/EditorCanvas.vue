<script setup lang="ts">
import {
  ContextMenuPortal,
  ContextMenuRoot,
  ContextMenuTrigger,
  PopoverContent,
  PopoverPortal,
  PopoverRoot
} from 'reka-ui'
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
  type Component
} from 'vue'
import IconLucideAlignHorizontalSpaceBetween from '~icons/lucide/align-horizontal-space-between'
import IconLucideAlignVerticalSpaceBetween from '~icons/lucide/align-vertical-space-between'
import IconLucidePanelBottom from '~icons/lucide/panel-bottom'
import IconLucidePanelLeft from '~icons/lucide/panel-left'
import IconLucidePanelRight from '~icons/lucide/panel-right'
import IconLucidePanelTop from '~icons/lucide/panel-top'

import { resolveEditorProfile } from '@pairdraw/core'
import type { PlacedStatusLabel } from '@pairdraw/core/canvas'
import {
  AUTO_LAYOUT_PADDING_EDITOR_OFFSET_X,
  AUTO_LAYOUT_PADDING_EDITOR_OFFSET_Y,
  COMPONENT_LABEL_ICON_GAP,
  COMPONENT_LABEL_ICON_SIZE,
  SECTION_TITLE_GAP,
  SECTION_TITLE_HEIGHT
} from '@pairdraw/core/constants'
import type { ViewportTransform } from '@pairdraw/core/geometry'
import { colorToCSS } from '@pairdraw/scene-graph/color'
import { PlayIslands, useCanvasInput } from '@pairdraw/vue/canvas'
import { useCanvasDrop } from '@pairdraw/vue/canvas/drop'
import { useCanvasLinks } from '@pairdraw/vue/canvas/links'
import { useCanvasVirtualReference } from '@pairdraw/vue/canvas/overlays'
import { useCanvasStatusLabels } from '@pairdraw/vue/canvas/statuses'
import { useCanvas } from '@pairdraw/vue/canvas/surface'
import { useTextEdit } from '@pairdraw/vue/canvas/text-edit'
import { toolCursor } from '@pairdraw/vue/editor/tool-cursor'
import { useViewportKind } from '@pairdraw/vue/editor/viewport-kind'
import { autoLayoutValueAnchor, type AutoLayoutValueField } from '@pairdraw/vue/shared/input'

import { useEditorStore } from '@/app/editor/active-store'
import { canvasChromeInsets } from '@/app/editor/canvas/chrome-insets'
import { useCanvasCollaborationAwareness } from '@/app/editor/canvas/collaboration-awareness'
import { createCanvasContextSelection } from '@/app/editor/canvas/context-selection'
import { reportCanvasDrawFailure } from '@/app/editor/canvas/draw-failure'
import { usePrototypeStage } from '@/app/editor/prototype/stage'
import { usePluginPointerInput } from '@/app/plugins/pointer/input'
import { useFollowView } from '@/app/presence/follow-view'
import { appRuntimeConfig } from '@/app/runtime/config'
import { appPreferences } from '@/app/settings/preferences/store'
import CommentsLayer from '@/components/comments/CommentsLayer.vue'
import PreparationOverlay from '@/components/preparation/canvas/PreparationOverlay.vue'
import FollowFrame from '@/components/presence/FollowFrame.vue'
import StatusLabelMenu from '@/components/statuses/StatusLabelMenu.vue'
import AppDropOverlay from '@/components/ui/feedback/AppDropOverlay.vue'
import { motionStyles } from '@/theme/motion/styles'
import { floatingSurface } from '@/theme/overlay'

import CanvasMenu from './canvas/CanvasMenu.vue'
import CanvasLabelEditor from './canvas/labels/CanvasLabelEditor.vue'
import { canvasLabelPresentation } from './canvas/labels/presentation'
import TextLinkEditor from './canvas/links/TextLinkEditor.vue'
import NumberField from './inputs/NumberField.vue'

const { paneId } = defineProps<{
  paneId?: string
}>()

const store = useEditorStore()
const { isMobile } = useViewportKind()
const sceneCanvasRef = ref<HTMLCanvasElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const isActivePane = computed(() => !paneId || store.activePaneId.value === paneId)
const area = useTemplateRef<HTMLElement>('area')
const followView = useFollowView(area)
const {
  letterbox,
  scrim,
  dissolvingFrom,
  frameId: previewFrameId
} = usePrototypeStage(store, canvasRef)

function activatePane() {
  if (paneId) store.setActivePane(paneId)
}

function updatePaneCursor(cx: number, cy: number) {
  if (isActivePane.value) updateCursor(cx, cy)
}

const getRenderState = paneId ? () => store.getPaneRenderState(paneId) : undefined
/** This pane's view: its pan, zoom, page, and whether it previews. */
const paneView = computed(() => (paneId ? store.getPaneRenderState(paneId) : store.state))
const paneProfile = computed(() => resolveEditorProfile(paneView.value))
/**
 * The one layer the canvas shows: the presented slide, or the frame a preview plays. Both draw
 * only that layer and its descendants, as Figma does, instead of the whole page.
 */
const sceneScopeId = computed(() => {
  void store.state.sceneVersion
  void store.state.currentPageId
  return store.getPresentation()?.slideId ?? previewFrameId.value ?? null
})
watch(sceneScopeId, () => store.requestRender())
/**
 * The room the floating chrome leaves over the canvas. Fitting a document to the whole element
 * would put its left edge under the tool rail, so the editor fits into what is reported here.
 */
function reportChromeInsets() {
  if (!area.value || !isActivePane.value) return
  store.setViewportInsets(canvasChromeInsets(area.value))
}

const onViewportResize = (width: number, height: number) => {
  if (paneId) store.resizePane(paneId, width, height)
  if (isActivePane.value) store.setViewportSize(width, height)
  reportChromeInsets()
}

onMounted(reportChromeInsets)
// The rail moves with the rulers and leaves with the chrome; the layout settles a tick later.
watch(
  [() => store.state.showRulers, () => store.state.showUI, isMobile],
  () => void nextTick(reportChromeInsets)
)

const { updateCursor } = useCanvasCollaborationAwareness(store)

const shouldSuspendRender = () =>
  store.state.preparation !== null &&
  store.state.preparation.kind !== 'font-retry' &&
  store.state.preparation.phase !== 'preparing-render'

/** The pan and zoom of the scene's last drawn frame, which preview islands follow. */
const drawnView = shallowRef<ViewportTransform | null>(null)

/**
 * Bumped when the browser takes a WebGL context away. The canvases are keyed on it, so both are
 * replaced with fresh elements: a context the browser keeps lost can never draw again.
 */
const canvasEpoch = ref(0)

// The tab's scene is presented only here once the canvas can draw, so waiting for it times out
// only while it is shown and drawing, not while the renderer and its fonts download.
let detachCanvas: (() => void) | null = null
onUnmounted(() => detachCanvas?.())
function canvasReady() {
  store.markCanvasReady()
  detachCanvas ??= store.preparationController.attachCanvas()
}

useCanvas(sceneCanvasRef, store, {
  layer: 'scene',
  onFrame: (view) => {
    drawnView.value = view
  },
  sceneRenderer: appRuntimeConfig.sceneRenderer,
  maxPixelRatio: appRuntimeConfig.maxPixelRatio,
  reducedEffects: appRuntimeConfig.reducedEffects,
  onReady: canvasReady,
  onFailed: (error) =>
    store.preparationController.failCanvas(
      new Error('The canvas could not start', { cause: error })
    ),
  shouldSuspendRender,
  showRulers: false,
  getRenderState,
  getSceneScope: () => sceneScopeId.value,
  onViewportResize,
  onPresented: ({ sceneVersion }) =>
    store.preparationController.acknowledgePresentation(sceneVersion),
  onPresentation: (colorSpace) => {
    store.state.canvasPresentation = colorSpace
  },
  onContextLost: () => {
    canvasEpoch.value += 1
  },
  onNodeDrawFailure: reportCanvasDrawFailure
})
const {
  getRenderer: getOverlayRenderer,
  hitTestSectionTitle,
  hitTestComponentLabel,
  hitTestFrameTitle,
  hitTestStatusLabel
} = useCanvas(canvasRef, store, {
  layer: 'overlays',
  // Drawn at the scene canvas's density, so the two layers line up.
  maxPixelRatio: appRuntimeConfig.maxPixelRatio,
  // The scene canvas reports a canvas that cannot start.
  onFailed: () => undefined,
  get showRulers() {
    return appRuntimeConfig.showRulers && store.state.showRulers && paneProfile.value.editChrome
  },
  shouldSuspendRender,
  getRenderState,
  onViewportResize,
  onContextLost: () => {
    canvasEpoch.value += 1
  },
  onNodeDrawFailure: reportCanvasDrawFailure
})
const { selectAtContextPoint } = createCanvasContextSelection(canvasRef, store, getOverlayRenderer)
const {
  cursorOverride,
  canvasLabelEdit,
  updateCanvasLabelEdit,
  commitCanvasLabelEdit,
  cancelCanvasLabelEdit,
  autoLayoutValueEdit,
  updateAutoLayoutValueEdit,
  commitAutoLayoutValueEdit,
  cancelAutoLayoutValueEdit,
  cleanupInteractions
} = useCanvasInput(
  canvasRef,
  store,
  hitTestSectionTitle,
  hitTestComponentLabel,
  hitTestFrameTitle,
  updatePaneCursor,
  activatePane,
  () => isActivePane.value,
  () => appPreferences.value.navigation.zoomSpeed,
  () => ({
    wheelZooms: appPreferences.value.navigation.wheelZoom,
    invert: appPreferences.value.navigation.invertZoom
  })
)

watch(isActivePane, (active) => {
  if (!active) cleanupInteractions()
})
onUnmounted(cleanupInteractions)

const {
  holder: pluginPointerHolder,
  onPointerDown: onPluginPointerDown,
  onPointerMove: onPluginPointerMove,
  onPointerUp: onPluginPointerUp,
  onPointerCancel: onPluginPointerCancel
} = usePluginPointerInput(canvasRef, store)

const openStatusLabel = shallowRef<PlacedStatusLabel | null>(null)
const { cursor: statusLabelCursor } = useCanvasStatusLabels(canvasRef, store, {
  hitTest: hitTestStatusLabel,
  onActivate: (label) => {
    activatePane()
    openStatusLabel.value = label
  }
})

useTextEdit(canvasRef, store, { isEnabled: () => isActivePane.value })
const { cursor: linkCursor } = useCanvasLinks(canvasRef, store, {
  isEnabled: () => isActivePane.value
})
const { isDraggingOver } = useCanvasDrop(canvasRef, store, activatePane)

const valueFieldIcons = {
  paddingTop: IconLucidePanelTop,
  paddingRight: IconLucidePanelRight,
  paddingBottom: IconLucidePanelBottom,
  paddingLeft: IconLucidePanelLeft
} satisfies Record<Exclude<AutoLayoutValueField, 'itemSpacing'>, Component>

const canvasLabelEditNode = computed(() => {
  const edit = canvasLabelEdit.value
  return edit ? store.graph.getNode(edit.nodeId) : null
})
const canvasLabelEditAnchor = computed(() => {
  const node = canvasLabelEditNode.value
  if (!node) return null
  const origin = store.graph.getAbsolutePosition(node.id)
  const { zoom, panX, panY } = store.state
  const kind = canvasLabelEdit.value?.kind
  // The canvas starts an upright label on a whole screen pixel; the field starts on the same one.
  const abs = {
    x: (Math.round(origin.x * zoom + panX) - panX) / zoom,
    y: (Math.round(origin.y * zoom + panY) - panY) / zoom
  }
  // A component's name starts after its diamond, which keeps its screen size at any zoom.
  if (kind === 'component-label')
    return { x: abs.x + (COMPONENT_LABEL_ICON_SIZE + COMPONENT_LABEL_ICON_GAP) / zoom, y: abs.y }
  // A section inside another draws its title inside its top-left corner instead of above it.
  const nested = node.parentId && store.graph.closest(node.parentId, (n) => n.type === 'SECTION')
  if (kind === 'section-title' && nested) {
    const inset = SECTION_TITLE_GAP / zoom
    return {
      x: abs.x + inset,
      y: abs.y + inset + (SECTION_TITLE_HEIGHT + SECTION_TITLE_GAP) / zoom
    }
  }
  return { x: abs.x, y: abs.y }
})
const canvasLabelEditReference = useCanvasVirtualReference(canvasRef, store, canvasLabelEditAnchor)
const canvasLabelEditPresentation = computed(() =>
  canvasLabelPresentation(store, canvasLabelEditNode.value ?? null, canvasLabelEdit.value?.kind)
)

const valueEditorAnchor = computed(() => {
  const edit = autoLayoutValueEdit.value
  return edit ? autoLayoutValueAnchor(store, edit.nodeId, edit.field, edit.gap) : null
})
const valueEditorReference = useCanvasVirtualReference(canvasRef, store, valueEditorAnchor)
const valueEditorIcon = computed(() => {
  const edit = autoLayoutValueEdit.value
  if (!edit) return IconLucidePanelTop
  if (edit.field !== 'itemSpacing') return valueFieldIcons[edit.field]
  return store.graph.getNode(edit.nodeId)?.layoutMode === 'VERTICAL'
    ? IconLucideAlignVerticalSpaceBetween
    : IconLucideAlignHorizontalSpaceBetween
})

const cursor = computed(() =>
  toolCursor(
    store.state.activeTool,
    statusLabelCursor.value ?? linkCursor.value ?? cursorOverride.value
  )
)

/** The page's color, which the parts around the played frame take so they read as the page. */
const pageBackground = computed(() => ({ backgroundColor: colorToCSS(store.state.pageColor) }))
</script>

<template>
  <ContextMenuRoot :modal="false">
    <ContextMenuTrigger as-child @contextmenu.capture="selectAtContextPoint">
      <div
        ref="area"
        data-test-id="canvas-area"
        :data-pane-id="paneId"
        :data-active-pane="isActivePane ? 'true' : 'false'"
        class="canvas-area relative min-h-0 min-w-0 flex-1 overflow-hidden"
        @pointerdown.capture="activatePane"
        @focusin.capture="activatePane"
        @wheel.capture="activatePane"
        @dragenter.capture="activatePane"
      >
        <canvas
          ref="sceneCanvasRef"
          :key="`scene-${canvasEpoch}`"
          :data-pane-id="paneId"
          data-test-id="scene-canvas-element"
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 size-full outline-none"
        />
        <canvas
          ref="canvasRef"
          :key="`overlays-${canvasEpoch}`"
          :data-pane-id="paneId"
          data-test-id="canvas-element"
          tabindex="-1"
          :style="{ cursor }"
          class="absolute inset-0 block size-full touch-none outline-none"
        />
        <div
          v-if="pluginPointerHolder && isActivePane"
          data-test-id="plugin-pointer-layer"
          aria-hidden="true"
          class="absolute inset-0 z-40 cursor-crosshair touch-none"
          @pointerdown="onPluginPointerDown"
          @pointermove="onPluginPointerMove"
          @pointerup="onPluginPointerUp"
          @pointercancel="onPluginPointerCancel"
        />
        <PlayIslands :view="paneView" :drawn="drawnView" :canvas="canvasRef" />
        <div
          v-for="(rect, index) in letterbox"
          :key="index"
          data-test-id="prototype-letterbox"
          aria-hidden="true"
          class="absolute z-20"
          :style="{
            ...pageBackground,
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`
          }"
        />
        <div
          v-if="scrim"
          data-test-id="prototype-scrim"
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 z-20 bg-black/40"
        />
        <img
          v-if="dissolvingFrom"
          data-test-id="prototype-dissolve"
          aria-hidden="true"
          class="pointer-events-none absolute z-30 transition-opacity duration-300"
          :src="dissolvingFrom.src"
          :style="{
            left: `${dissolvingFrom.rect.left}px`,
            top: `${dissolvingFrom.rect.top}px`,
            width: `${dissolvingFrom.rect.width}px`,
            height: `${dissolvingFrom.rect.height}px`
          }"
        />
        <AppDropOverlay :visible="isDraggingOver" />
        <StatusLabelMenu
          :label="openStatusLabel"
          :canvas="canvasRef"
          @close="openStatusLabel = null"
        />
        <CanvasLabelEditor
          :edit="canvasLabelEdit"
          :presentation="canvasLabelEditPresentation"
          :reference="canvasLabelEditReference"
          @update="updateCanvasLabelEdit"
          @commit="commitCanvasLabelEdit"
          @cancel="cancelCanvasLabelEdit"
        />
        <PopoverRoot :open="!!autoLayoutValueEdit">
          <PopoverPortal>
            <PopoverContent
              v-if="autoLayoutValueEdit && valueEditorReference"
              :reference="valueEditorReference"
              side="top"
              align="center"
              :side-offset="AUTO_LAYOUT_PADDING_EDITOR_OFFSET_Y"
              :align-offset="AUTO_LAYOUT_PADDING_EDITOR_OFFSET_X"
              :collision-padding="8"
              :class="['z-50 w-20 p-1', floatingSurface, motionStyles.floating]"
              data-test-id="auto-layout-value-editor"
              @keydown.escape.prevent="cancelAutoLayoutValueEdit"
              @open-auto-focus.prevent
            >
              <NumberField
                :model-value="autoLayoutValueEdit.value"
                :min="0"
                :step="1"
                data-test-id="auto-layout-value-input"
                @update:model-value="updateAutoLayoutValueEdit"
                @commit="(value: number) => commitAutoLayoutValueEdit(value)"
                @editing-change="
                  (editing: boolean) =>
                    !editing &&
                    autoLayoutValueEdit &&
                    commitAutoLayoutValueEdit(autoLayoutValueEdit.value)
                "
              >
                <template #icon>
                  <component :is="valueEditorIcon" class="size-3.5" />
                </template>
              </NumberField>
            </PopoverContent>
          </PopoverPortal>
        </PopoverRoot>
        <FollowFrame
          v-if="isActivePane && followView.label.value"
          :followed="followView.label.value"
          @stop="followView.stop"
        />
        <CommentsLayer v-if="isActivePane" :canvas-el="canvasRef" :drawn="drawnView" />
        <TextLinkEditor v-if="isActivePane" :canvas="canvasRef" />
        <PreparationOverlay
          v-if="store.state.preparation && store.state.preparation.kind !== 'font-retry'"
          :preparation="store.state.preparation"
        />
      </div>
    </ContextMenuTrigger>

    <ContextMenuPortal>
      <CanvasMenu />
    </ContextMenuPortal>
  </ContextMenuRoot>
</template>

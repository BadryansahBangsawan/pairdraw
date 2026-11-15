<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'

import { PlayIslands, useCanvasInput } from '@pairdraw/vue/canvas'
import { useCanvas } from '@pairdraw/vue/canvas/surface'
import { useTextEdit } from '@pairdraw/vue/canvas/text-edit'
import { toolCursor } from '@pairdraw/vue/editor/tool-cursor'

import { useEditorStore } from '@/app/editor/active-store'
import { useFollowView } from '@/app/presence/follow-view'
import PreparationOverlay from '@/components/preparation/canvas/PreparationOverlay.vue'
import FollowFrame from '@/components/presence/FollowFrame.vue'

/**
 * One WebGL canvas per stage. The app's `EditorCanvas` splits the scene and its overlays
 * across two contexts, which is right for a full-window editor but would put a page of
 * stages past the browser's context limit. This is the SDK's single-canvas path with the
 * same input handling, preview islands, follow frame, and loading overlay.
 */
const emit = defineEmits<{
  /** The pointer moved over the canvas, in canvas coordinates, for a room's cursor. */
  cursor: [x: number, y: number]
}>()

const store = useEditorStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)

const shouldSuspendRender = () =>
  store.state.preparation !== null &&
  store.state.preparation.kind !== 'font-retry' &&
  store.state.preparation.phase !== 'preparing-render'

const { hitTestSectionTitle, hitTestComponentLabel, hitTestFrameTitle } = useCanvas(
  canvasRef,
  store,
  {
    showRulers: false,
    shouldSuspendRender,
    onReady: store.markCanvasReady,
    onViewportResize: (width, height) => store.setViewportSize(width, height),
    onPresented: ({ sceneVersion }) =>
      store.preparationController.acknowledgePresentation(sceneVersion)
  }
)

const { cursorOverride } = useCanvasInput(
  canvasRef,
  store,
  hitTestSectionTitle,
  hitTestComponentLabel,
  hitTestFrameTitle,
  (x, y) => emit('cursor', x, y)
)
useTextEdit(canvasRef, store)

// Following a person or an agent frames the canvas and says who, as in the app.
const followView = useFollowView(useTemplateRef<HTMLElement>('area'), store)

const cursor = computed(() => toolCursor(store.state.activeTool, cursorOverride.value))
</script>

<template>
  <div ref="area" class="relative min-h-0 min-w-0 flex-1 overflow-hidden">
    <canvas
      ref="canvasRef"
      tabindex="-1"
      :style="{ cursor }"
      class="absolute inset-0 block size-full touch-none outline-none"
    />
    <PlayIslands :view="store.state" :canvas="canvasRef" />
    <FollowFrame
      v-if="followView.label.value"
      :followed="followView.label.value"
      @stop="followView.stop"
    />
    <PreparationOverlay
      v-if="store.state.preparation && store.state.preparation.kind !== 'font-retry'"
      :preparation="store.state.preparation"
    />
  </div>
</template>

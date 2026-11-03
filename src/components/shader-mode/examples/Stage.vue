<script setup lang="ts">
import { colorToFill } from '@open-pencil/scene-graph/color'
import type { ShaderPreset } from '@open-pencil/scene-graph/shaders'

import { provideTabEditorStore } from '@/app/editor/active-store'
import { createEditorStore } from '@/app/editor/session/create'

import ShaderModeStage from '../ShaderModeStage.vue'
import { storyShaderBackend, type StoryShaderState } from './backend'

/**
 * Shader Mode in a box of a fixed width, on a backend the story picks, so each state shows the
 * same in every browser: playing, still starting, failed, or without WebGPU.
 */
const {
  width,
  state = 'ready',
  readOnly = false
} = defineProps<{
  /** The stage's width in pixels, which decides whether the settings sit beside or below. */
  width: number
  state?: StoryShaderState
  readOnly?: boolean
}>()

const PRESET: ShaderPreset = { components: [{ type: 'Aurora' }] }
const RED = { r: 1, g: 0.3, b: 0.2, a: 1 }

const backend = storyShaderBackend(state)

const store = createEditorStore()
const layer = store.graph.createNode('RECTANGLE', store.state.currentPageId, {
  name: 'Hero',
  width: 320,
  height: 180,
  fills: [colorToFill(RED)]
})
store.setShaderPaint([layer.id], 'fills', 0, PRESET)
// Viewing a read-only document's shader is allowed; tuning it is not.
if (readOnly) store.setReadOnly(true)
store.startShaderMode({ nodeId: layer.id })
provideTabEditorStore(store)
</script>

<template>
  <div class="flex h-[560px] flex-col overflow-hidden bg-canvas" :style="{ width: `${width}px` }">
    <ShaderModeStage :backend="backend" />
  </div>
</template>

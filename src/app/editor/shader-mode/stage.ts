import { useElementSize, useEventListener } from '@vueuse/core'
import { computed, watch, type Ref } from 'vue'

import { resolveEditorProfile, type ShaderModeState } from '@pairdraw/core'
import type { ShaderPreset } from '@pairdraw/scene-graph/shaders'
import {
  fitShaderPreview,
  useShaderStage,
  type ShaderStageBackend
} from '@pairdraw/vue/canvas/surface'

import type { EditorStore } from '@/app/editor/active-store'
import { isButtonActivation, isEditing } from '@/app/shell/keyboard/focus'
import { animationsEnabled } from '@/app/shell/motion'

import { shaderModeKeyAction } from './keys'

/**
 * Shader Mode's stage: the shader the canvas focuses on, framed as large as its area holds with
 * its layer's proportions, playing on a clock its transport and keys control, and tuned through
 * the editor so every change is one undo step. Shader Mode ends by itself when its shader goes,
 * as when its layer is deleted. Someone who turned animations off finds it paused.
 */
export function useShaderModeStage(
  store: EditorStore,
  elements: {
    /** The stage, which takes Shader Mode's keys while focus is inside it. */
    root: Ref<HTMLElement | null>
    /** The area the shader is framed in. */
    area: Ref<HTMLElement | null>
    /** The canvas its frames are drawn into. */
    target: Ref<HTMLCanvasElement | null>
  },
  /** What plays the shader; the browser's WebGPU unless a story hands its own. */
  backend?: ShaderStageBackend<HTMLCanvasElement>
) {
  const mode = computed<ShaderModeState | null>(() => {
    void store.state.sceneVersion
    return store.getShaderMode()
  })
  const editable = computed(() => resolveEditorProfile(store.state).edits)

  // The view outlives its shader when the layer or paint goes; then there is nothing to show.
  watch(
    mode,
    (current) => {
      if (!current) store.stopShaderMode()
    },
    { flush: 'sync' }
  )

  // Measured inside the area's padding, which keeps room around the shader.
  const areaSize = useElementSize(elements.area)
  /** The shader's frame in its area, or null until the area is laid out. */
  const frame = computed(() => {
    const current = mode.value
    if (!current || areaSize.width.value === 0 || areaSize.height.value === 0) return null
    return fitShaderPreview(current, {
      width: areaSize.width.value,
      height: areaSize.height.value
    })
  })

  const player = useShaderStage({
    preset: () => mode.value?.preset ?? null,
    size: () => frame.value,
    target: elements.target,
    autoplay: animationsEnabled.value,
    backend
  })

  /** Changes the shader's preset as one undo step; a read-only document keeps it. */
  function setPreset(preset: ShaderPreset) {
    const current = mode.value
    if (!current || !editable.value) return
    store.setShaderPaint([current.nodeId], current.list, current.index, preset)
  }

  let playingBeforeScrub = false
  /** The clock holds still under a drag on the scrubber and plays on after it, if it was playing. */
  function scrub(active: boolean) {
    if (active) {
      playingBeforeScrub = player.clock.value.playing
      player.pause()
    } else if (playingBeforeScrub) {
      playingBeforeScrub = false
      player.play()
    }
  }

  function step(seconds: number) {
    player.pause()
    player.seek(player.clock.value.time + seconds)
  }

  useEventListener(elements.root, 'keydown', (event: KeyboardEvent) => {
    if (event.defaultPrevented || isEditing(event) || isButtonActivation(event)) return
    const action = shaderModeKeyAction(event)
    if (!action) return
    event.preventDefault()
    if (action.kind === 'toggle') player.toggle()
    else if (action.kind === 'restart') player.restart()
    else step(action.seconds)
  })

  return {
    mode,
    editable,
    frame,
    clock: player.clock,
    status: player.status,
    toggle: player.toggle,
    restart: player.restart,
    seek: player.seek,
    scrub,
    setPreset,
    leave: () => store.stopShaderMode()
  }
}

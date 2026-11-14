import type { SceneGraph } from '@pairdraw/scene-graph'
import {
  isShaderPresetPaint,
  shaderOfPaint,
  type ShaderPreset
} from '@pairdraw/scene-graph/shaders'

import type { ShaderPaintList } from '#core/editor/shaders/actions'
import type { EditorContext } from '#core/editor/types'

import type { CanvasView, ShaderView } from './types'

/** The paint lists Shader Mode looks in for a shader, in the order it looks. */
const SHADER_PAINT_LISTS: readonly ShaderPaintList[] = ['fills', 'strokes']

/**
 * What a front end shows of Shader Mode: the shader paint it focuses on, where that paint sits
 * among its layer's paints so an edit reaches it, the preset it draws, and the layer's name and
 * size, which the large preview keeps the proportions of.
 */
export interface ShaderModeState {
  nodeId: string
  /** The paint's image, which names the shader however the layer's paints are reordered. */
  image: string
  list: ShaderPaintList
  index: number
  preset: ShaderPreset
  name: string
  width: number
  height: number
}

/**
 * Which shader paint Shader Mode opens on: a layer, or else the selected layers, and one of their
 * shader paints by image, or else their topmost one.
 */
export interface ShaderModeTarget {
  nodeId?: string
  image?: string
}

/**
 * The shader paint `image` on layer `nodeId`, or, without an image, the layer's topmost shader
 * fill and then its topmost shader stroke. Null when the layer is gone or draws no such shader,
 * as after the paint was removed or replaced by another kind of paint.
 */
export function findShaderModeTarget(
  graph: SceneGraph,
  nodeId: string,
  image?: string
): ShaderModeState | null {
  const node = graph.getNode(nodeId)
  if (!node) return null
  for (const list of SHADER_PAINT_LISTS) {
    const paints = node[list]
    // The last paint draws on top, so a layer's shader is the topmost one unless named.
    for (let index = paints.length - 1; index >= 0; index--) {
      const paint = paints[index]
      if (image !== undefined && paint.imageHash !== image) continue
      const shader = shaderOfPaint(node, paint)
      // Shader Mode plays a preset; code the user wrote draws on the canvas itself.
      if (!shader || !isShaderPresetPaint(shader)) continue
      return {
        nodeId,
        image: shader.image,
        list,
        index,
        preset: shader.preset,
        name: node.name,
        width: node.width,
        height: node.height
      }
    }
  }
  return null
}

/**
 * Shader Mode: one shader paint shown large on its own, where it plays, pauses, and scrubs
 * through its animation while its settings are tuned. The canvas stays where it was, so leaving
 * returns to the design as it looked.
 */
export function createShaderModeActions(
  ctx: EditorContext,
  setCanvasView: (view: CanvasView) => void
) {
  function focused(): ShaderView | null {
    const view = ctx.state.canvasView
    return view.id === 'shader' ? view : null
  }

  /** The shader the selection opens Shader Mode on: the first selected layer that has one. */
  function selectedTarget(image?: string): ShaderModeState | null {
    for (const id of ctx.state.selectedIds) {
      const target = findShaderModeTarget(ctx.graph, id, image)
      if (target) return target
    }
    return null
  }

  /** Shader Mode on this canvas, or null while it shows something else or its shader is gone. */
  function getShaderMode(): ShaderModeState | null {
    const view = focused()
    return view ? findShaderModeTarget(ctx.graph, view.nodeId, view.image) : null
  }

  /** Whether Shader Mode can open on the selection, which needs a layer with a shader paint. */
  function canStartShaderMode(): boolean {
    return selectedTarget() !== null
  }

  /**
   * Opens Shader Mode on `target`, or on the selection's shader; false when there is no shader
   * to show.
   */
  function startShaderMode(target: ShaderModeTarget = {}): boolean {
    const found = target.nodeId
      ? findShaderModeTarget(ctx.graph, target.nodeId, target.image)
      : selectedTarget(target.image)
    if (!found) return false
    ctx.state.hoveredNodeId = null
    setCanvasView({ id: 'shader', nodeId: found.nodeId, image: found.image })
    return true
  }

  /** Leaves Shader Mode for editing. */
  function stopShaderMode(): void {
    if (focused()) setCanvasView({ id: 'edit' })
  }

  function toggleShaderMode(): void {
    if (focused()) stopShaderMode()
    else startShaderMode()
  }

  // Another document has other layers, so its arrival ends Shader Mode.
  ctx.onEditorEvent('graph:replaced', () => {
    if (!focused()) return
    ctx.state.canvasView = { id: 'edit' }
    ctx.requestRepaint()
  })

  return {
    getShaderMode,
    canStartShaderMode,
    startShaderMode,
    stopShaderMode,
    toggleShaderMode
  }
}

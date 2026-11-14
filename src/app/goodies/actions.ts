import type { ShaderPreset } from '@open-pencil/scene-graph/shaders'

import { offerStyleKit } from '@/app/ai/chat/pins/pending'
import { insertScriptNode } from '@/app/code/script/create'
import type { EditorStore } from '@/app/editor/session'

import type { GoodieScript } from './scripts'
import type { GoodieStyle } from './styles'

/** The size of the layer a shader from Goodies is placed on when nothing is selected to take it. */
const SHADER_LAYER_WIDTH = 320
const SHADER_LAYER_HEIGHT = 200

/** Opens Goodies for `store`'s document. */
export function openGoodies(store: EditorStore): void {
  store.state.goodiesOpen = true
}

/** Pins the style to the open conversation of the document's chat, which shows. */
export function pinGoodieStyle(store: EditorStore, style: GoodieStyle): void {
  offerStyleKit(store, style.kit)
}

/** Places the script in the middle of the view as a code layer and runs it there. */
export function insertGoodieScript(store: EditorStore, script: GoodieScript): string {
  return insertScriptNode(store, script.source)
}

/**
 * Gives the selected layers that have a fill the shader as their first fill, or, with none
 * selected, places a rectangle that draws it in the middle of the view. Either is one undo step.
 */
export function applyGoodieShader(store: EditorStore, preset: ShaderPreset): void {
  const filled = [...store.state.selectedIds].filter(
    (id) => (store.graph.getNode(id)?.fills.length ?? 0) > 0
  )
  if (filled.length > 0) {
    store.setShaderPaint(filled, 'fills', 0, structuredClone(preset))
    return
  }
  const { width, height } = store.getViewportSize()
  const x = (width / 2 - store.state.panX) / store.state.zoom - SHADER_LAYER_WIDTH / 2
  const y = (height / 2 - store.state.panY) / store.state.zoom - SHADER_LAYER_HEIGHT / 2
  store.undo.runBatch('Insert shader', () => {
    const id = store.createShape(
      'RECTANGLE',
      Math.round(x),
      Math.round(y),
      SHADER_LAYER_WIDTH,
      SHADER_LAYER_HEIGHT
    )
    store.setShaderPaint([id], 'fills', 0, structuredClone(preset))
    store.select([id])
  })
}

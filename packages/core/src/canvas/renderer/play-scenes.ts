import type { SceneGraph } from '@pairdraw/scene-graph'

import type { SkiaRenderer } from '#core/canvas/renderer'

import type { RenderOverlays, RenderedPlayScene } from './types'

/** The play scene a canvas last drew a frame from, and the change it showed then. */
interface DrawnPlayScene {
  scene: RenderedPlayScene
  revision: number
}

/** By canvas, the play scene each frame was last drawn from. */
const drawnByRenderer = new WeakMap<SkiaRenderer, Map<string, DrawnPlayScene>>()

function forgetTouched(r: SkiaRenderer, scene: RenderedPlayScene): void {
  for (const id of scene.touched) r.invalidateNodePicture(id)
}

/**
 * The graph a top-level frame is drawn from: its play scene's copy while play changed it, else
 * null for the document. The copy keeps the document's ids, so the drawings the canvas keeps by
 * id for the layers a change touched are dropped whenever the scene moves on or goes away.
 */
export function playSceneGraph(
  r: SkiaRenderer,
  nodeId: string,
  overlays: RenderOverlays
): SceneGraph | null {
  const scene = overlays.playScenes?.get(nodeId) ?? null
  let drawnScenes = drawnByRenderer.get(r)
  if (!scene && !drawnScenes) return null
  const drawn = drawnScenes?.get(nodeId)
  if (drawn && (drawn.scene !== scene || drawn.revision !== scene.revision)) {
    forgetTouched(r, drawn.scene)
    drawnScenes?.delete(nodeId)
    // A canvas with no changed frame left skips this lookup for every layer it draws.
    if (drawnScenes?.size === 0) drawnByRenderer.delete(r)
    drawnScenes = drawnByRenderer.get(r)
  }
  if (!scene) return null
  if (!drawnScenes) {
    drawnScenes = new Map()
    drawnByRenderer.set(r, drawnScenes)
  }
  if (!drawnScenes.has(nodeId)) {
    forgetTouched(r, scene)
    drawnScenes.set(nodeId, { scene, revision: scene.revision })
  }
  return scene.graph
}

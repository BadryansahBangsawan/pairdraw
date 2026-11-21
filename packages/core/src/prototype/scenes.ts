import type { PrototypeAction, SceneGraph } from '@pairdraw/scene-graph'
import { instanceMainComponent } from '@pairdraw/scene-graph/instances'

import { effectiveReactions } from './reactions'
import {
  changeTarget,
  createPlayScene,
  type PlayChange,
  type PlayScene,
  type PlaySceneView
} from './scene'
import { primaryAction, shownFrame, step, type PlayClick, type PlaySession } from './session'

/** How many changed frames play keeps; a frame dropped beyond them starts again as designed. */
export const PLAY_SCENE_LIMIT = 4

/**
 * An After delay reaction of an instance a frame shows: the instance, the variant it shows, whose
 * reaction it is, the action, and the delay in milliseconds.
 */
export interface PlayTimeout {
  sourceId: string
  variantId: string
  action: PrototypeAction
  delayMs: number
}

/** What a reaction did: the session after it, and the Change to it made, if it made one. */
export interface PlayStep {
  session: PlaySession
  changed: PlayChange | null
}

/**
 * The frames play changed, each kept as a private copy so the document never changes. Frames move
 * through the session as before; a Change to switches an instance on its frame's copy, which is
 * made at the first change, so a prototype without one copies nothing.
 */
export interface PlayScenes {
  /** The graph play reads a top-level frame from: its copy once changed, else the document. */
  graphFor(rootId: string): SceneGraph
  /** The changed frames the canvas draws from their copies, by frame id. */
  readonly views: ReadonlyMap<string, PlaySceneView>
  /** Runs a reaction of a layer in `rootId`, the shown frame unless a timer names another. */
  run(session: PlaySession, click: PlayClick, rootId?: string): PlayStep
  /** The After delay reactions of the instances `rootId` shows, by the variants they show now. */
  instanceTimeouts(rootId: string): PlayTimeout[]
  /** Drops the copies of frames that hold any of these document layers, after an edit to them. */
  forget(nodeIds: Iterable<string>): void
  clear(): void
}

export function createPlayScenes(
  getDocument: () => SceneGraph,
  limit = PLAY_SCENE_LIMIT
): PlayScenes {
  // Insertion order is use order: a frame changed again moves to the end, and the first goes.
  const scenes = new Map<string, PlayScene>()

  function graphFor(rootId: string): SceneGraph {
    return scenes.get(rootId)?.graph ?? getDocument()
  }

  function changeIn(rootId: string, sourceId: string, variantId: string): PlayChange | null {
    // Checked on what play shows now, so a Change to that cannot run copies nothing.
    if (!changeTarget(graphFor(rootId), rootId, sourceId, variantId)) return null
    const scene = scenes.get(rootId) ?? createPlayScene(getDocument(), rootId)
    const change = scene.changeTo(sourceId, variantId)
    scenes.delete(rootId)
    scenes.set(rootId, scene)
    for (const oldest of scenes.keys()) {
      if (scenes.size <= limit) break
      scenes.delete(oldest)
    }
    return change
  }

  return {
    graphFor,
    views: scenes,
    run(session, { sourceId, action }, rootId = shownFrame(session)) {
      if (action.type === 'NODE' && action.navigation === 'CHANGE_TO') {
        const changed = action.nodeId ? changeIn(rootId, sourceId, action.nodeId) : null
        return { session, changed }
      }
      return { session: step(getDocument(), session, action), changed: null }
    },
    instanceTimeouts(rootId) {
      const graph = graphFor(rootId)
      const timeouts: PlayTimeout[] = []
      const visit = (id: string) => {
        for (const child of graph.getChildren(id)) {
          const variantId = child.type === 'INSTANCE' && instanceMainComponent(graph, child)?.id
          if (variantId) {
            for (const reaction of effectiveReactions(graph, child)) {
              const action = reaction.trigger.type === 'AFTER_TIMEOUT' && primaryAction(reaction)
              if (action) {
                const delayMs = reaction.trigger.delay * 1000
                timeouts.push({ sourceId: child.id, variantId, action, delayMs })
              }
            }
          }
          visit(child.id)
        }
      }
      visit(rootId)
      return timeouts
    },
    forget(nodeIds) {
      const design = getDocument()
      for (const id of nodeIds) {
        for (const [rootId, scene] of scenes) {
          if (design.isDescendant(id, rootId) || scene.graph.isDescendant(id, rootId)) {
            scenes.delete(rootId)
          }
        }
      }
    },
    clear() {
      scenes.clear()
    }
  }
}

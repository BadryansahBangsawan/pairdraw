import type {
  PrototypeAction,
  PrototypeTransition,
  SceneGraph,
  SceneNode
} from '@open-pencil/scene-graph'

import { framesOnPage } from './frames'
import { primaryAction } from './reactions'

/** Where play is: the frame it shows, the frame it started from, and the frames it came through. */
export interface PlaySession {
  /** The frame the canvas fits and shows. */
  frameId: string
  /** The frame play started from, which Restart returns to. */
  startFrameId: string
  /** Frames shown before this one, oldest first; Back returns to the last. */
  history: string[]
}

/** One click's result: the action it ran, and the transition that action asked for. */
export interface PlayClick {
  action: PrototypeAction
  transition: PrototypeTransition | null
}

/**
 * The frame play starts from: the selected frame, or the frame holding the selection; otherwise
 * the page's first frame. Null when the page has no frames, so there is nothing to play.
 */
export function startFrame(graph: SceneGraph, pageId: string, selectedIds: ReadonlySet<string>) {
  const frames = framesOnPage(graph, pageId)
  const ids = new Set(frames.map((frame) => frame.id))
  for (const id of selectedIds) {
    if (ids.has(id)) return id
    const frame = topFrameOf(graph, graph.getNode(id))
    if (frame && ids.has(frame.id)) return frame.id
  }
  return frames[0]?.id ?? null
}

/**
 * The top-level frame a node sits in: the page's direct child above it, when that child is a
 * frame. Play fits and hit-tests top-level frames, as Figma's presentation does.
 */
export function topFrameOf(
  graph: SceneGraph,
  node: SceneNode | null | undefined
): SceneNode | null {
  let top = node ?? null
  while (top?.parentId) {
    const parent = graph.getNode(top.parentId)
    if (!parent || parent.type === 'CANVAS') break
    top = parent
  }
  return top?.type === 'FRAME' ? top : null
}

/** Starts playing the page from `frameId` with no history behind it. */
export function startSession(frameId: string): PlaySession {
  return { frameId, startFrameId: frameId, history: [] }
}

/** Plays again from where the session started, as Restart does. */
export function restartSession(session: PlaySession): PlaySession {
  return startSession(session.startFrameId)
}

/**
 * The reaction a click at a document point runs, as Figma resolves one: the layer under the point
 * or its nearest ancestor inside the played frame that has an `ON_CLICK` reaction, with the
 * reaction's first action.
 */
export function reactionAt(
  graph: SceneGraph,
  session: PlaySession,
  x: number,
  y: number
): PlayClick | null {
  let node = graph.hitTestDeep(x, y, session.frameId)
  while (node) {
    const reaction = node.prototypeReactions.find(
      (candidate) => candidate.trigger.type === 'ON_CLICK'
    )
    const action = reaction ? primaryAction(reaction) : null
    if (action) {
      return { action, transition: action.type === 'NODE' ? action.transition : null }
    }
    if (node.id === session.frameId) return null
    node = node.parentId ? (graph.getNode(node.parentId) ?? null) : null
  }
  return null
}

/**
 * The session after an action runs. `NAVIGATE` moves to its frame and remembers this one for
 * Back; `BACK` returns there; an action this version cannot show leaves the session as it is.
 */
export function step(
  graph: SceneGraph,
  session: PlaySession,
  action: PrototypeAction
): PlaySession {
  if (action.type === 'BACK') {
    const previous = session.history.at(-1)
    if (!previous) return session
    return { ...session, frameId: previous, history: session.history.slice(0, -1) }
  }
  if (action.type !== 'NODE' || action.navigation !== 'NAVIGATE' || !action.nodeId) return session
  if (topFrameOf(graph, graph.getNode(action.nodeId))?.id !== action.nodeId) return session
  if (action.nodeId === session.frameId) return session
  return { ...session, frameId: action.nodeId, history: [...session.history, session.frameId] }
}

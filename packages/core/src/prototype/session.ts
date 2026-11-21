import type {
  PrototypeAction,
  PrototypeReaction,
  PrototypeTransition,
  PrototypeTriggerType,
  SceneGraph,
  SceneNode
} from '@pairdraw/scene-graph'

import { framesOnPage } from './frames'
import { playHitTest } from './hit'
import { effectiveReactions } from './reactions'

/**
 * The action a reaction runs: its first, which the prototype panel edits alone in this version, as
 * Figma's first action row; `actions` keeps the array the `.fig` model and Figma's plugin API use.
 */
export function primaryAction(reaction: PrototypeReaction): PrototypeAction | null {
  return reaction.actions[0] ?? null
}

/** Where play is: the frame it shows, the frame it started from, and the frames it came through. */
export interface PlaySession {
  /** The base frame under any open overlays. */
  frameId: string
  /** The frame play started from, which Restart returns to. */
  startFrameId: string
  /** Frames shown before this one, oldest first; Back returns to the last. */
  history: string[]
  /** Overlay frames open over the base frame, bottom first; the last is the one shown. */
  overlays: string[]
}

/**
 * One reaction a pointer or a timer runs: the layer it runs from, its action, and the transition
 * that action asked for.
 */
export interface PlayClick {
  /** The layer whose reaction runs, which a Change to switches the instance of. */
  sourceId: string
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
  return { frameId, startFrameId: frameId, history: [], overlays: [] }
}

/** The frame the stage shows: the top overlay when one is open, else the base frame. */
export function shownFrame(session: PlaySession): string {
  return session.overlays.at(-1) ?? session.frameId
}

/** Plays again from where the session started, as Restart does. */
export function restartSession(session: PlaySession): PlaySession {
  return startSession(session.startFrameId)
}

/**
 * The reaction a click at a document point runs, as Figma resolves one: the layer under the point
 * or its nearest ancestor inside the shown frame that has a reaction to `trigger`, with the
 * reaction's first action. An instance runs the reactions of the variant it shows.
 */
export function reactionAt(
  graph: SceneGraph,
  session: PlaySession,
  x: number,
  y: number,
  trigger: PrototypeTriggerType = 'ON_CLICK'
): PlayClick | null {
  // A click on the frame's own background is the frame's, not a layer's; one outside it hits
  // nothing.
  let node = playHitTest(graph, shownFrame(session), x, y)
  while (node) {
    const reaction = effectiveReactions(graph, node).find(
      (candidate) => candidate.trigger.type === trigger
    )
    const action = reaction ? primaryAction(reaction) : null
    if (action) {
      return {
        sourceId: node.id,
        action,
        transition: action.type === 'NODE' ? action.transition : null
      }
    }
    if (node.id === shownFrame(session)) return null
    node = node.parentId ? (graph.getNode(node.parentId) ?? null) : null
  }
  return null
}

/**
 * The session after an action runs. `NAVIGATE` moves to its frame and remembers this one for
 * Back; `OVERLAY` opens a frame over the screen and `CLOSE` takes the top one away; `BACK`
 * returns to the previous screen and drops overlays, which are not history entries; an action
 * this version cannot show leaves the session as it is.
 */
export function step(
  graph: SceneGraph,
  session: PlaySession,
  action: PrototypeAction
): PlaySession {
  if (action.type === 'BACK') {
    const previous = session.history.at(-1)
    if (!previous) return session
    return {
      ...session,
      frameId: previous,
      history: session.history.slice(0, -1),
      overlays: []
    }
  }
  if (action.type === 'CLOSE') {
    if (session.overlays.length === 0) return session
    return { ...session, overlays: session.overlays.slice(0, -1) }
  }
  if (!action.nodeId) return session
  if (topFrameOf(graph, graph.getNode(action.nodeId))?.id !== action.nodeId) return session
  if (action.navigation === 'OVERLAY') {
    if (action.nodeId === shownFrame(session)) return session
    return { ...session, overlays: [...session.overlays, action.nodeId] }
  }
  if (action.nodeId === session.frameId) return session
  return {
    ...session,
    frameId: action.nodeId,
    history: [...session.history, session.frameId],
    overlays: []
  }
}

/**
 * The `AFTER_TIMEOUT` reactions of the frame being shown, with their delays in milliseconds:
 * what the stage schedules whenever the shown frame changes.
 */
export function timeoutReactions(
  graph: SceneGraph,
  session: PlaySession
): { action: PrototypeAction; delayMs: number }[] {
  const node = graph.getNode(shownFrame(session))
  if (!node) return []
  return node.prototypeReactions
    .filter((reaction) => reaction.trigger.type === 'AFTER_TIMEOUT')
    .map((reaction) => ({
      action: primaryAction(reaction),
      delayMs: reaction.trigger.delay * 1000
    }))
    .filter((entry): entry is { action: PrototypeAction; delayMs: number } => entry.action !== null)
}

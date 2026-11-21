import type {
  PrototypeAction,
  PrototypeOverlayPositionType,
  PrototypeTransitionType,
  SceneGraph,
  SceneNode
} from '@pairdraw/scene-graph'

import { easingAt } from './easing'
import {
  primaryAction,
  shownFrame,
  startSession,
  step,
  timeoutReactions,
  topFrameOf,
  type PlaySession
} from './session'

/** A scripted click: the layer clicked, and when, in milliseconds from the start of play. */
export interface TimelineClick {
  atMs: number
  nodeId: string
}

export interface TimelineOptions {
  /** The top-level frame play starts from. */
  startFrameId: string
  /** Clicks to run as play goes, in time order. */
  clicks?: readonly TimelineClick[]
  /** Where the timeline stops when the flow goes on longer. */
  maxMs: number
  /** How long the last frame stays once nothing else happens. */
  tailMs: number
}

/** A stretch of play: one screen held still, or a crossfade from one screen to the next. */
export type TimelineSegment =
  | { kind: 'hold'; session: PlaySession; startMs: number; endMs: number }
  | {
      kind: 'dissolve'
      from: PlaySession
      to: PlaySession
      startMs: number
      endMs: number
      /** The transition's own length, which keeps its pace when a later step cuts it short. */
      fadeMs: number
    }

/** One step play took: when, the frame it shows afterwards, what started it, and how it moved. */
export interface TimelineStep {
  atMs: number
  frameId: string
  trigger: 'AFTER_TIMEOUT' | 'ON_CLICK'
  transition: PrototypeTransitionType
}

export interface Timeline {
  segments: TimelineSegment[]
  durationMs: number
  /** Play came back to the screen it started on, so the clip repeats seamlessly. */
  loops: boolean
  /** The flow went on past `maxMs`, where the timeline stops. */
  truncated: boolean
  steps: TimelineStep[]
  /** Where each overlay frame play opened sits over the screen, from the action that opened it. */
  overlayPositions: Record<string, PrototypeOverlayPositionType>
}

/** What a timeline shows at a moment: one screen, or two mid-crossfade with `mix` of the second. */
export type TimelineFrame =
  | { session: PlaySession }
  | { from: PlaySession; to: PlaySession; mix: number }

/** Why a flow cannot be played: the start frame has nothing to follow, or anything else. */
export type TimelineErrorReason = 'nothing-to-follow' | 'invalid'

/** A flow that cannot be played as asked, with a message naming the frame or click at fault. */
export class TimelineError extends Error {
  override name = 'TimelineError'
  constructor(
    message: string,
    readonly reason: TimelineErrorReason = 'invalid'
  ) {
    super(message)
  }
}

/** Steps a timeline may take before it is refused, which stops cycles that take no time. */
const MAX_TIMELINE_STEPS = 10_000

/** How long an action's transition runs, in milliseconds; a cut takes none. */
export function transitionMs(action: PrototypeAction): number {
  if (action.type !== 'NODE' || action.transition.type === 'INSTANT') return 0
  return Math.max(0, action.transition.duration * 1000)
}

/**
 * The curve a dissolve fades along, CSS `ease-out`, which Figma's dissolve uses by default: the
 * x and y of its two cubic Bézier control points. The player draws its crossfade with
 * `DISSOLVE_EASING_CSS` and a recording samples `dissolveEasing`, so both fade alike.
 */
export const DISSOLVE_EASING = { x1: 0, y1: 0, x2: 0.58, y2: 1 } as const

/** `DISSOLVE_EASING` as a CSS timing function. */
export const DISSOLVE_EASING_CSS = `cubic-bezier(${DISSOLVE_EASING.x1}, ${DISSOLVE_EASING.y1}, ${DISSOLVE_EASING.x2}, ${DISSOLVE_EASING.y2})`

/** The share of the new screen a dissolve shows at `progress` of the way, along `DISSOLVE_EASING`. */
export function dissolveEasing(progress: number): number {
  return easingAt('EASE_OUT', progress)
}

/**
 * What play draws, as a key two sessions share when they look alike: the base frame and its
 * overlays. History only matters to Back. State that changes what a frame shows extends it here,
 * and the recorder's screen cache follows.
 */
export function sessionDrawKey(session: PlaySession): string {
  return [session.frameId, ...session.overlays].join(' ')
}

function nameOf(graph: SceneGraph, id: string): string {
  return graph.getNode(id)?.name ?? id
}

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(2)} s`
}

/** Whether `node` sits in `frameId`, or is that frame. */
function isInside(graph: SceneGraph, node: SceneNode, frameId: string): boolean {
  let current: SceneNode | undefined = node
  while (current) {
    if (current.id === frameId) return true
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return false
}

/**
 * The action a click on `nodeId` runs, as a click on the canvas resolves one: the layer or its
 * nearest ancestor inside the shown frame with an `ON_CLICK` reaction. Throws when the layer is not
 * on the shown frame; null when nothing there reacts to a click.
 */
function clickAction(
  graph: SceneGraph,
  session: PlaySession,
  click: TimelineClick,
  index: number
): PrototypeAction | null {
  const shown = shownFrame(session)
  const node = graph.getNode(click.nodeId)
  if (!node || !isInside(graph, node, shown)) {
    throw new TimelineError(
      `click ${index + 1}: '${node?.name ?? click.nodeId}' is not on the shown frame '${nameOf(graph, shown)}' at ${seconds(click.atMs)}`
    )
  }
  let current: SceneNode | undefined = node
  while (current) {
    const reaction = current.prototypeReactions.find(
      (candidate) => candidate.trigger.type === 'ON_CLICK'
    )
    const action = reaction ? primaryAction(reaction) : null
    if (action) return action
    if (current.id === shown) return null
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return null
}

interface ArmedTimer {
  atMs: number
  action: PrototypeAction
}

/** The shown frame's After delay reactions, each due `delay` after the frame finished entering. */
function armTimers(graph: SceneGraph, session: PlaySession, readyMs: number): ArmedTimer[] {
  return timeoutReactions(graph, session)
    .map(({ action, delayMs }) => ({ atMs: readyMs + delayMs, action }))
    .toSorted((a, b) => a.atMs - b.atMs)
}

/** Play at its start frame, which must be a top-level frame with something to follow. */
function startWalk(graph: SceneGraph, options: TimelineOptions): { walk: Walk; start: SceneNode } {
  const start = graph.getNode(options.startFrameId)
  if (!start || topFrameOf(graph, start)?.id !== start.id) {
    throw new TimelineError(`'${start?.name ?? options.startFrameId}' is not a top-level frame`)
  }
  const session = startSession(start.id)
  const walk: Walk = {
    graph,
    session,
    readyMs: 0,
    timers: armTimers(graph, session, 0),
    clicks: (options.clicks ?? []).toSorted((a, b) => a.atMs - b.atMs),
    clickIndex: 0,
    segments: [],
    steps: [],
    overlayPositions: {}
  }
  if (walk.timers.length === 0 && walk.clicks.length === 0) {
    throw new TimelineError(
      `'${start.name}' has no After delay interaction to follow`,
      'nothing-to-follow'
    )
  }
  return { walk, start }
}

/** Play in progress on the virtual clock: what is shown, since when, and what is due next. */
interface Walk {
  graph: SceneGraph
  session: PlaySession
  /** When the shown screen finished entering; its After delays count from here. */
  readyMs: number
  timers: ArmedTimer[]
  clicks: TimelineClick[]
  clickIndex: number
  segments: TimelineSegment[]
  steps: TimelineStep[]
  overlayPositions: Record<string, PrototypeOverlayPositionType>
}

interface WalkEvent {
  atMs: number
  action: PrototypeAction | null
  trigger: TimelineStep['trigger']
}

/** Holds the shown screen from when it finished entering until `endMs`. */
function hold(walk: Walk, endMs: number): void {
  if (endMs > walk.readyMs) {
    walk.segments.push({ kind: 'hold', session: walk.session, startMs: walk.readyMs, endMs })
  }
}

/** The earliest due timer or click, taken off its queue; null when nothing else will happen. */
function takeNextEvent(walk: Walk): WalkEvent | null {
  const timer = walk.timers.at(0)
  const click = walk.clicks.at(walk.clickIndex)
  if (timer && (!click || timer.atMs <= click.atMs)) {
    walk.timers = walk.timers.slice(1)
    return { atMs: timer.atMs, action: timer.action, trigger: 'AFTER_TIMEOUT' }
  }
  if (!click) return null
  const action = clickAction(walk.graph, walk.session, click, walk.clickIndex)
  walk.clickIndex += 1
  return { atMs: click.atMs, action, trigger: 'ON_CLICK' }
}

/** The earliest event's time without taking it, or infinity when nothing else will happen. */
function nextEventAt(walk: Walk): number {
  const timerAt = walk.timers.at(0)?.atMs ?? Number.POSITIVE_INFINITY
  const clickAt = walk.clicks.at(walk.clickIndex)?.atMs ?? Number.POSITIVE_INFINITY
  return Math.min(timerAt, clickAt)
}

/** Runs `action` at `atMs`, recording the hold before it, its crossfade, and the step. */
function advance(walk: Walk, event: WalkEvent & { action: PrototypeAction }, next: PlaySession) {
  const { atMs, action } = event
  // A step while a crossfade still runs cuts it short where it is.
  const running = walk.segments.at(-1)
  if (running?.kind === 'dissolve' && running.endMs > atMs) running.endMs = atMs
  hold(walk, atMs)
  const durationMs = transitionMs(action)
  if (durationMs > 0) {
    walk.segments.push({
      kind: 'dissolve',
      from: walk.session,
      to: next,
      startMs: atMs,
      endMs: atMs + durationMs,
      fadeMs: durationMs
    })
  }
  walk.steps.push({
    atMs,
    frameId: shownFrame(next),
    trigger: event.trigger,
    transition: durationMs > 0 && action.type === 'NODE' ? action.transition.type : 'INSTANT'
  })
  if (action.type === 'NODE' && action.navigation === 'OVERLAY' && action.nodeId) {
    walk.overlayPositions[action.nodeId] = action.overlayPosition
  }
  walk.session = next
  walk.readyMs = atMs + durationMs
  walk.timers = armTimers(walk.graph, next, walk.readyMs)
}

function finish(walk: Walk, durationMs: number, end: 'ends' | 'loops' | 'truncated'): Timeline {
  return {
    segments: walk.segments,
    durationMs,
    loops: end === 'loops',
    truncated: end === 'truncated',
    steps: walk.steps,
    overlayPositions: walk.overlayPositions
  }
}

/**
 * Plays a prototype on a virtual clock, from `startFrameId`, following its After delay
 * reactions and the scripted clicks as the player would, without waiting for real time. Each delay
 * counts from when the transition into its frame ends, as in Figma. The walk stops when play
 * returns to the screen it started on (`loops`), when nothing else will happen (the last screen is
 * held `tailMs`), or at `maxMs` (`truncated`).
 */
export function planTimeline(graph: SceneGraph, options: TimelineOptions): Timeline {
  const { walk, start } = startWalk(graph, options)
  const startKey = sessionDrawKey(walk.session)

  for (let taken = 0; taken <= MAX_TIMELINE_STEPS; taken++) {
    const dueAt = nextEventAt(walk)
    if (dueAt >= options.maxMs) {
      const endMs = Math.min(walk.readyMs + options.tailMs, options.maxMs)
      // More is due past the cap, or the cap falls before the last transition has ended.
      const truncated = dueAt !== Number.POSITIVE_INFINITY || walk.readyMs > options.maxMs
      hold(walk, truncated ? options.maxMs : endMs)
      // With no time left to hold it, the last screen still ends the timeline.
      if (!truncated && endMs <= walk.readyMs) {
        walk.segments.push({
          kind: 'hold',
          session: walk.session,
          startMs: walk.readyMs,
          endMs: walk.readyMs
        })
      }
      return truncated ? finish(walk, options.maxMs, 'truncated') : finish(walk, endMs, 'ends')
    }
    const event = takeNextEvent(walk)
    const action = event?.action
    if (!event || !action) continue
    const next = step(graph, walk.session, action)
    if (next === walk.session) continue
    advance(walk, { ...event, action }, next)

    if (sessionDrawKey(next) === startKey && walk.clickIndex >= walk.clicks.length) {
      if (walk.readyMs === 0) {
        throw new TimelineError(`The flow loops back to '${start.name}' at once`)
      }
      if (walk.readyMs > options.maxMs) return finish(walk, options.maxMs, 'truncated')
      return finish(walk, walk.readyMs, 'loops')
    }
  }
  throw new TimelineError(`The flow takes more than ${MAX_TIMELINE_STEPS} steps`)
}

/** What the timeline shows at `atMs`; past its end, the last screen it shows. */
export function frameAt(timeline: Timeline, atMs: number): TimelineFrame {
  for (const segment of timeline.segments) {
    if (atMs >= segment.endMs) continue
    if (segment.kind === 'hold') return { session: segment.session }
    const progress = (atMs - segment.startMs) / segment.fadeMs
    return { from: segment.from, to: segment.to, mix: dissolveEasing(progress) }
  }
  const last = timeline.segments.at(-1)
  if (!last) throw new TimelineError('The timeline is empty')
  return { session: last.kind === 'hold' ? last.session : last.to }
}

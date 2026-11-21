import * as v from 'valibot'

import { generateId } from '@pairdraw/scene-graph'
import type {
  PrototypeAction,
  PrototypeNavigationType,
  PrototypeOverlayPositionType,
  PrototypeReaction,
  PrototypeTransitionType,
  PrototypeTriggerType,
  SceneGraph,
  SceneNode
} from '@pairdraw/scene-graph'
import { variantSetsAround } from '@pairdraw/scene-graph/components'

import { issuePath } from '#core/figma-api/effects'
import { asInstanceEdit, sameReaction } from '#core/prototype/reactions'

/**
 * Triggers Figma's plugin API offers that a prototype in Pairdraw cannot start from, and the
 * message it gets instead.
 */
const UNSUPPORTED_TRIGGERS: Record<string, true> = {
  ON_DRAG: true,
  MOUSE_UP: true,
  MOUSE_DOWN: true,
  ON_KEY_DOWN: true
}

/** Actions Figma's plugin API offers that a prototype in Pairdraw cannot run. */
const UNSUPPORTED_ACTIONS: Record<string, true> = {
  URL: true,
  SET_VARIABLE: true,
  CONDITIONAL: true,
  SET_VARIABLE_MODE: true
}

// No `v.finite()` action: the MCP tool contract turns this schema into JSON Schema, which
// has no notion of infinities, and JSON numbers are always finite anyway.
const secondsSchema = v.pipe(v.number(), v.minValue(0))

const overlayPositionSchema = v.picklist([
  'CENTER',
  'TOP_LEFT',
  'TOP_CENTER',
  'TOP_RIGHT',
  'BOTTOM_LEFT',
  'BOTTOM_CENTER',
  'BOTTOM_RIGHT'
] satisfies PrototypeOverlayPositionType[])

const transitionSchema = v.strictObject({
  type: v.picklist(['INSTANT', 'DISSOLVE'] satisfies PrototypeTransitionType[]),
  duration: secondsSchema
})

const nodeActionSchema = v.strictObject({
  type: v.literal('NODE'),
  destinationId: v.pipe(
    v.string(),
    v.minLength(1),
    v.description(
      'NAVIGATE/OVERLAY: a top-level frame on the page; CHANGE_TO: a variant of the set the ' +
        "layer is a variant of, an instance of, or inside; SCROLL_TO: a layer in the layer's " +
        'top-level frame.'
    )
  ),
  navigation: v.picklist([
    'NAVIGATE',
    'OVERLAY',
    'CHANGE_TO',
    'SCROLL_TO'
  ] satisfies PrototypeNavigationType[]),
  transition: v.optional(transitionSchema, { type: 'INSTANT', duration: 0 }),
  overlayRelativePosition: v.optional(overlayPositionSchema, 'CENTER')
})

const actionSchema = v.variant('type', [
  nodeActionSchema,
  v.strictObject({ type: v.literal('BACK') }),
  v.strictObject({ type: v.literal('CLOSE') })
])

const triggerSchema = v.variant('type', [
  v.strictObject({ type: v.picklist(['ON_CLICK', 'ON_HOVER', 'ON_PRESS']) }),
  v.strictObject({ type: v.literal('AFTER_TIMEOUT'), timeout: secondsSchema }),
  v.strictObject({
    type: v.picklist(['MOUSE_ENTER', 'MOUSE_LEAVE']),
    delay: v.optional(secondsSchema, 0),
    // Figma's plugin API reads it; play treats both versions alike.
    deprecatedVersion: v.optional(v.boolean())
  })
])

const reactionSchema = v.strictObject({
  trigger: triggerSchema,
  actions: v.pipe(v.array(actionSchema), v.minLength(1))
})

const reactionsSchema = v.array(reactionSchema)

/** The plugin shape as a contract, for a tool that takes connections as arguments. */
export const figmaReactionsSchema = reactionsSchema

/** A reaction as Figma's plugin API reads and writes it (`Reaction` in `@figma/plugin-typings`). */
export type FigmaReaction = v.InferOutput<typeof reactionSchema>
export type FigmaReactionTrigger = FigmaReaction['trigger']
export type FigmaReactionAction = FigmaReaction['actions'][number]

/** `reaction` in the plugin shape: the trigger and every action, named as Figma names them. */
export function toFigmaReaction(reaction: PrototypeReaction): FigmaReaction {
  return { trigger: toFigmaTrigger(reaction.trigger), actions: reaction.actions.map(toFigmaAction) }
}

function toFigmaTrigger({ type, delay }: PrototypeReaction['trigger']): FigmaReactionTrigger {
  if (type === 'AFTER_TIMEOUT') return { type, timeout: delay }
  if (type === 'MOUSE_ENTER' || type === 'MOUSE_LEAVE') return { type, delay }
  return { type }
}

function toFigmaAction(action: PrototypeAction): FigmaReactionAction {
  if (action.type !== 'NODE') return { type: action.type }
  return {
    type: 'NODE',
    destinationId: action.nodeId ?? '',
    navigation: action.navigation,
    transition: { type: action.transition.type, duration: action.transition.duration },
    overlayRelativePosition: action.overlayPosition
  }
}

/** The validation context: where the reactions live, and what they may point at. */
export interface ReactionContext {
  graph: SceneGraph
  /** The layer the reactions are on, which a Change to or Scroll to destination must suit. */
  nodeId: string
  /** The page the layer is on; a navigation's destination must be a top-level frame on it. */
  pageId: string
  /** The reactions the layer has now, whose ids this keeps by position. */
  previous?: readonly PrototypeReaction[]
  /**
   * An instance's main component's reactions: a reaction kept under one of their ids that an
   * edit changed, from what the layer held at its place and from the main's, becomes the
   * instance's own, with an id of its own.
   */
  inherited?: readonly PrototypeReaction[]
}

/**
 * `value` as the layer's prototype reactions, or an error naming what Pairdraw cannot play.
 * Accepts Figma's plugin shape only: a trigger Figma offers but playback does not start from,
 * an action, transition, navigation or overlay spot outside the model, and a destination that
 * is not a top-level frame on the layer's page are refused rather than kept unplayable.
 */
export function parseFigmaReactions(value: unknown, context: ReactionContext): PrototypeReaction[] {
  const unsupported = unsupportedKind(value)
  if (unsupported) throw new Error(`Property "reactions" failed validation: ${unsupported}`)
  const result = v.safeParse(reactionsSchema, value)
  if (!result.success) {
    const [issue] = result.issues
    throw new Error(
      `Property "reactions" failed validation: ${issue.message} at ${issuePath(issue.path) || 'reactions'}`
    )
  }
  return result.output.map((reaction, index) => {
    const id = context.previous?.[index]?.id ?? generateId()
    const parsed: PrototypeReaction = {
      id,
      trigger: toTrigger(reaction.trigger),
      actions: reaction.actions.map((action) => toAction(action, context, index))
    }
    // One the layer already held unchanged stays as it was, a copy of the main's included, so
    // writing reactions back as read never re-ids a copy whose main was edited since.
    const held = context.previous?.[index]
    if (held && sameReaction(held, parsed)) return parsed
    return asInstanceEdit(parsed, context.inherited ?? [])
  })
}

function toTrigger(trigger: FigmaReactionTrigger): PrototypeReaction['trigger'] {
  const type: PrototypeTriggerType = trigger.type
  if (trigger.type === 'AFTER_TIMEOUT') return { type, delay: trigger.timeout }
  return { type, delay: 'delay' in trigger ? trigger.delay : 0 }
}

function toAction(
  action: FigmaReactionAction,
  context: ReactionContext,
  reactionIndex: number
): PrototypeAction {
  if (action.type !== 'NODE') return { type: action.type }
  assertDestination(action, context, reactionIndex)
  return {
    type: 'NODE',
    nodeId: action.destinationId,
    navigation: action.navigation,
    transition: action.transition,
    // Only an overlay uses the spot; Figma keeps CENTER on a navigation.
    overlayPosition: action.navigation === 'OVERLAY' ? action.overlayRelativePosition : 'CENTER'
  }
}

function failure(message: string): Error {
  return new Error(`Property "reactions" failed validation: ${message}`)
}

/**
 * A destination play can show: a navigation's is a frame at the top of the layer's page, a Change
 * to's a variant of a set the layer belongs to, and a Scroll to's a layer in the layer's
 * top-level frame.
 */
function assertDestination(
  action: v.InferOutput<typeof nodeActionSchema>,
  context: ReactionContext,
  index: number
): void {
  const { destinationId, navigation } = action
  const destination = context.graph.getNode(destinationId)
  const at = `reactions[${index}]`
  if (!destination) throw failure(`no layer ${destinationId} at ${at}.actions[0].destinationId`)
  if (navigation === 'CHANGE_TO') return assertVariant(destination, context, at)
  if (navigation === 'SCROLL_TO') return assertScrollTarget(destination, context, at)
  if (destination.type !== 'FRAME' || destination.parentId !== context.pageId) {
    throw failure(
      `${at} must navigate to a top-level frame on the same page, not ${destination.type} "${destination.name}"`
    )
  }
}

function assertVariant(destination: SceneNode, context: ReactionContext, at: string): void {
  const sets = variantSetsAround(context.graph, context.nodeId)
  const nearest = sets.at(0)
  if (!nearest) {
    throw failure(
      `${at}: only a variant, an instance of one, or a layer inside one can Change to another variant`
    )
  }
  const inSet = sets.some((set) => set.id === destination.parentId)
  if (destination.type !== 'COMPONENT' || !inSet) {
    throw failure(
      `${at} must Change to a variant of ${nearest.name}, not ${destination.type} "${destination.name}"`
    )
  }
}

/** The page's direct child a layer sits in, which play shows as one screen. */
function topLevelOf(graph: SceneGraph, nodeId: string, pageId: string): SceneNode | undefined {
  return graph.closest(nodeId, (node) => node.parentId === pageId)
}

function assertScrollTarget(destination: SceneNode, context: ReactionContext, at: string): void {
  const { graph, nodeId, pageId } = context
  const top = topLevelOf(graph, nodeId, pageId)
  if (!top || destination.id === top.id || !graph.isDescendant(destination.id, top.id)) {
    throw failure(
      `${at} must Scroll to a layer inside the same top-level frame, not ${destination.type} "${destination.name}"`
    )
  }
}

/** Figma's first unsupported trigger or action kind in `value`, if it has one. */
function unsupportedKind(value: unknown): string | null {
  if (!Array.isArray(value)) return null
  const reactions = value.filter(
    (reaction): reaction is Record<string, unknown> =>
      Boolean(reaction) && typeof reaction === 'object'
  )
  for (const reaction of reactions) {
    const trigger = reaction.trigger
    if (trigger && typeof trigger === 'object' && 'type' in trigger) {
      const type = trigger.type
      if (typeof type === 'string' && type in UNSUPPORTED_TRIGGERS) {
        return `a prototype starts from ON_CLICK, ON_HOVER, ON_PRESS, MOUSE_ENTER, MOUSE_LEAVE or AFTER_TIMEOUT, not ${type}`
      }
    }
    const actions = reaction.actions
    if (!Array.isArray(actions)) continue
    for (const action of actions) {
      if (action && typeof action === 'object' && 'type' in action) {
        const type = action.type
        if (typeof type === 'string' && type in UNSUPPORTED_ACTIONS) {
          return `an action is NODE, BACK or CLOSE, not ${type}`
        }
      }
    }
  }
  return null
}

import * as v from 'valibot'

import { generateId } from '@pairdraw/scene-graph'
import type {
  PrototypeAction,
  PrototypeNavigationType,
  PrototypeOverlayPositionType,
  PrototypeReaction,
  PrototypeTransitionType,
  PrototypeTriggerType,
  SceneGraph
} from '@pairdraw/scene-graph'

import { issuePath } from '#core/figma-api/effects'

/**
 * Triggers Figma's plugin API offers that a prototype in Pairdraw cannot start from, and the
 * message it gets instead. Only a click and a timeout play.
 */
const UNSUPPORTED_TRIGGERS: Record<string, true> = {
  ON_DRAG: true,
  ON_HOVER: true,
  ON_PRESS: true,
  MOUSE_ENTER: true,
  MOUSE_LEAVE: true,
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
  destinationId: v.pipe(v.string(), v.minLength(1), v.description('Top-level frame on the page.')),
  navigation: v.picklist(['NAVIGATE', 'OVERLAY'] satisfies PrototypeNavigationType[]),
  transition: v.optional(transitionSchema, { type: 'INSTANT', duration: 0 }),
  overlayRelativePosition: v.optional(overlayPositionSchema, 'CENTER')
})

const actionSchema = v.variant('type', [
  nodeActionSchema,
  v.strictObject({ type: v.literal('BACK') }),
  v.strictObject({ type: v.literal('CLOSE') })
])

const triggerSchema = v.variant('type', [
  v.strictObject({ type: v.literal('ON_CLICK') }),
  v.strictObject({ type: v.literal('AFTER_TIMEOUT'), timeout: secondsSchema })
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
  const trigger: FigmaReactionTrigger =
    reaction.trigger.type === 'AFTER_TIMEOUT'
      ? { type: 'AFTER_TIMEOUT', timeout: reaction.trigger.delay }
      : { type: 'ON_CLICK' }
  return { trigger, actions: reaction.actions.map(toFigmaAction) }
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
  /** The page the layer is on; a destination must be a top-level frame on it. */
  pageId: string
  /** The reactions the layer has now, whose ids this keeps by position. */
  previous?: readonly PrototypeReaction[]
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
    return {
      id,
      trigger: toTrigger(reaction.trigger),
      actions: reaction.actions.map((action) => toAction(action, context, index))
    }
  })
}

function toTrigger(trigger: FigmaReactionTrigger): PrototypeReaction['trigger'] {
  const type: PrototypeTriggerType = trigger.type
  return { type, delay: trigger.type === 'AFTER_TIMEOUT' ? trigger.timeout : 0 }
}

function toAction(
  action: FigmaReactionAction,
  context: ReactionContext,
  reactionIndex: number
): PrototypeAction {
  if (action.type !== 'NODE') return { type: action.type }
  assertDestination(action.destinationId, context, reactionIndex)
  return {
    type: 'NODE',
    nodeId: action.destinationId,
    navigation: action.navigation,
    transition: action.transition,
    // Only an overlay uses the spot; Figma keeps CENTER on a navigation.
    overlayPosition: action.navigation === 'OVERLAY' ? action.overlayRelativePosition : 'CENTER'
  }
}

/** A destination must be a frame at the top of the layer's page, as the play can only show one. */
function assertDestination(destinationId: string, context: ReactionContext, index: number): void {
  const destination = context.graph.getNode(destinationId)
  const at = `reactions[${index}]`
  if (!destination) {
    throw new Error(
      `Property "reactions" failed validation: no layer ${destinationId} at ${at}.actions[0].destinationId`
    )
  }
  if (destination.type !== 'FRAME' || destination.parentId !== context.pageId) {
    throw new Error(
      `Property "reactions" failed validation: ${at} must navigate to a top-level frame on the same page, not ${destination.type} "${destination.name}"`
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
        return `a prototype starts from ON_CLICK or AFTER_TIMEOUT, not ${type}`
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

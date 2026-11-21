import * as v from 'valibot'

import type { NodeChange } from '@pairdraw/kiwi/fig/codec'
import { guidToString } from '@pairdraw/kiwi/fig/guid'
import type {
  OverflowDirection,
  PrototypeAction,
  PrototypeNavigationType,
  PrototypeOverlayPositionType,
  PrototypeReaction,
  PrototypeTransitionType,
  PrototypeTrigger,
  ScrollBehavior,
  PrototypeTriggerType,
  SceneNode
} from '@pairdraw/scene-graph'
import { OVERFLOW_DIRECTIONS } from '@pairdraw/scene-graph/constants'
import type { GUID } from '@pairdraw/scene-graph/primitives'

import type { KiwiNodeChange, SceneNodeToKiwiContext } from './export/context'
import { getOrCreateNodeGuid } from './export/context'

const guidSchema = v.object({ sessionID: v.number(), localID: v.number() })
const vectorSchema = v.object({ x: v.number(), y: v.number() })

/**
 * A `.fig` action, kept loose: fields this model does not read must survive an edit and come
 * back out unchanged (`easingType`, smart-animate flags, variable targets). Enums decode as the
 * schema's names (`'DISSOLVE'`, not `1`).
 */
const actionSchema = v.looseObject({
  transitionNodeID: v.optional(guidSchema),
  transitionType: v.optional(v.string()),
  transitionDuration: v.optional(v.number()),
  connectionType: v.optional(v.string()),
  navigationType: v.optional(v.string()),
  overlayRelativePosition: v.optional(vectorSchema)
})

const eventSchema = v.looseObject({
  interactionType: v.optional(v.string()),
  interactionMaintained: v.optional(v.boolean()),
  interactionDuration: v.optional(v.number()),
  transitionTimeout: v.optional(v.number())
})

const interactionSchema = v.looseObject({
  id: v.optional(guidSchema),
  event: v.optional(eventSchema),
  actions: v.optional(v.array(actionSchema)),
  isDeleted: v.optional(v.boolean()),
  stateManagementVersion: v.optional(v.number())
})

const interactionsSchema = v.array(interactionSchema)

type FigmaAction = v.InferOutput<typeof actionSchema>
type FigmaEvent = v.InferOutput<typeof eventSchema>
type FigmaInteraction = v.InferOutput<typeof interactionSchema>

/**
 * The node actions this model edits, by the `.fig` navigation each is written as: Figma's Change
 * to is `SWAP_STATE` in the file, while `SWAP` (swap overlay) stays out of the model.
 */
const NAVIGATION_FROM_FIGMA: Readonly<Record<string, PrototypeNavigationType>> = {
  NAVIGATE: 'NAVIGATE',
  OVERLAY: 'OVERLAY',
  SWAP_STATE: 'CHANGE_TO',
  SCROLL_TO: 'SCROLL_TO'
}

const NAVIGATION_TO_FIGMA: Readonly<Record<PrototypeNavigationType, string>> = {
  NAVIGATE: 'NAVIGATE',
  OVERLAY: 'OVERLAY',
  CHANGE_TO: 'SWAP_STATE',
  SCROLL_TO: 'SCROLL_TO'
}

/** The triggers this model edits; `.fig` names them as the plugin API does. */
const MODELED_TRIGGERS: ReadonlySet<string> = new Set<PrototypeTriggerType>([
  'ON_CLICK',
  'ON_HOVER',
  'ON_PRESS',
  'MOUSE_ENTER',
  'MOUSE_LEAVE',
  'AFTER_TIMEOUT'
])

/** Triggers whose delay the file keeps in the event's `transitionTimeout`. */
const DELAYED_TRIGGERS: ReadonlySet<PrototypeTriggerType> = new Set<PrototypeTriggerType>([
  'AFTER_TIMEOUT',
  'MOUSE_ENTER',
  'MOUSE_LEAVE'
])

function isModeledTrigger(type: string | undefined): type is PrototypeTriggerType {
  return type !== undefined && MODELED_TRIGGERS.has(type)
}

/**
 * The animation play runs for a file's transition: a dissolve for Dissolve and for Smart animate,
 * the closest one play has, an eased scroll for Figma's animated scroll, and a cut for the rest.
 * Export keeps the file's own transition while the model still reads it this way, so Figma's
 * slides, Smart animate, and animated scrolls survive an edit.
 */
function transitionFromFigma(type: string | undefined): PrototypeTransitionType {
  return type === 'DISSOLVE' || type === 'SMART_ANIMATE' || type === 'SCROLL_ANIMATE'
    ? 'DISSOLVE'
    : 'INSTANT'
}

/** True when the action is one the Prototype section edits: a node action, a back or a close. */
function isModeledAction(action: FigmaAction): boolean {
  const connection = action.connectionType ?? 'INTERNAL_NODE'
  if (connection === 'BACK' || connection === 'CLOSE') return true
  if (connection !== 'INTERNAL_NODE') return false
  return Object.hasOwn(NAVIGATION_FROM_FIGMA, action.navigationType ?? 'NAVIGATE')
}

/** True when the interaction is one the Prototype section can show and edit. */
function isModeledInteraction(interaction: FigmaInteraction): boolean {
  if (interaction.isDeleted === true) return false
  if (!isModeledTrigger(interaction.event?.interactionType)) return false
  const actions = interaction.actions ?? []
  return actions.length > 0 && actions.every(isModeledAction)
}

function triggerFromFigma(event: FigmaEvent): PrototypeTrigger {
  const type = isModeledTrigger(event.interactionType) ? event.interactionType : 'ON_CLICK'
  return { type, delay: DELAYED_TRIGGERS.has(type) ? (event.transitionTimeout ?? 0) : 0 }
}

function reactionFromFigma(interaction: FigmaInteraction): PrototypeReaction | null {
  if (!isModeledInteraction(interaction)) return null
  const id = interaction.id ? guidToString(interaction.id) : null
  if (!id) return null
  const trigger = triggerFromFigma(interaction.event ?? {})
  const actions = (interaction.actions ?? []).flatMap<PrototypeAction>((action) => {
    const connection = action.connectionType ?? 'INTERNAL_NODE'
    if (connection === 'BACK') return [{ type: 'BACK' }]
    if (connection === 'CLOSE') return [{ type: 'CLOSE' }]
    return [
      {
        type: 'NODE',
        nodeId: action.transitionNodeID ? guidToString(action.transitionNodeID) : null,
        navigation: NAVIGATION_FROM_FIGMA[action.navigationType ?? 'NAVIGATE'] ?? 'NAVIGATE',
        transition: {
          type: transitionFromFigma(action.transitionType),
          duration: action.transitionDuration ?? 0
        },
        // Figma records an overlay's placement on the destination frame, not on the action; the
        // write below puts it back there.
        overlayPosition: 'CENTER'
      }
    ]
  })
  return { id, trigger, actions }
}

/** A record's `scrollDirection` as the frame's overflow; a missing or unknown one does not scroll. */
export function overflowFromFigma(scrollDirection: unknown): OverflowDirection {
  return OVERFLOW_DIRECTIONS.find((direction) => direction === scrollDirection) ?? 'NONE'
}

/** The `scrollBehavior` a record stores; the Kiwi name for fixed is the one Figma's file uses. */
export function scrollBehaviorFromFigma(value: unknown): ScrollBehavior {
  if (value === 'FIXED_WHEN_CHILD_OF_SCROLLING_FRAME') return 'FIXED'
  if (value === 'STICKY_SCROLLS') return 'STICKY_SCROLLS'
  return 'SCROLLS'
}

/** A layer's scroll behavior as the Kiwi schema stores it. */
export function scrollBehaviorToFigma(behavior: ScrollBehavior): string {
  if (behavior === 'FIXED') return 'FIXED_WHEN_CHILD_OF_SCROLLING_FRAME'
  return behavior
}

/**
 * The reactions a `.fig` record carries. Interactions this model cannot edit (hover, drag,
 * variables) stay in the record's raw payload and keep round-tripping verbatim.
 */
export function extractPrototypeReactions(nc: NodeChange): PrototypeReaction[] {
  const parsed = v.safeParse(interactionsSchema, nc.prototypeInteractions)
  if (!parsed.success) return []
  return parsed.output.flatMap((interaction) => {
    const reaction = reactionFromFigma(interaction)
    return reaction ? [reaction] : []
  })
}

function rawInteractions(node: SceneNode): FigmaInteraction[] {
  const parsed = v.safeParse(
    interactionsSchema,
    node.source.fig.rawNodeFields.prototypeInteractions
  )
  return parsed.success ? parsed.output : []
}

function reactionsAreEdited(node: SceneNode): boolean {
  return node.source.editedFields.includes('prototypeReactions')
}

/**
 * Where each frame sits when a reaction opens it as an overlay, by node ID. One pass per export.
 * The serializer hands a fresh context to every root it writes and to every copy it makes of
 * one, so the pass is kept under the property GUID map, which all of one export's contexts share.
 */
const placementsByExport = new WeakMap<
  SceneNodeToKiwiContext['propertyIdToGuid'],
  ReadonlyMap<string, PrototypeOverlayPositionType>
>()

function overlayPlacements(
  context: SceneNodeToKiwiContext
): ReadonlyMap<string, PrototypeOverlayPositionType> {
  const known = placementsByExport.get(context.propertyIdToGuid)
  if (known) return known
  const placements = new Map<string, PrototypeOverlayPositionType>()
  for (const layer of context.graph.getAllNodes()) {
    for (const reaction of layer.prototypeReactions) {
      for (const action of reaction.actions) {
        if (action.type !== 'NODE' || action.navigation !== 'OVERLAY' || !action.nodeId) continue
        placements.set(action.nodeId, action.overlayPosition)
      }
    }
  }
  placementsByExport.set(context.propertyIdToGuid, placements)
  return placements
}

/**
 * A destination frame's own prototype record: how it arrives, and where it sits. A placement the
 * file already recorded survives — editing one connection must not move a frame Figma placed.
 */
export function applyPrototypeDestination(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  nc: KiwiNodeChange
): void {
  const placement = overlayPlacements(context).get(node.id)
  if (!placement) return
  nc.navigationType = 'OVERLAY'
  if (!('overlayPositionType' in node.source.fig.rawNodeFields)) {
    nc.overlayPositionType = placement
  }
}

function parseGuid(id: string): GUID | null {
  const match = /^(\d+):(\d+)$/.exec(id)
  if (!match) return null
  return { sessionID: Number(match[1]), localID: Number(match[2]) }
}

/**
 * The file's own transition while the model still plays it as `type`, else `type` itself. A
 * Scroll to made here is written instant whatever it plays as: no Figma file shows which
 * transition Figma reads for an animated scroll made outside it, so the instant one it is known
 * to read is written.
 */
function transitionToFigma(
  type: PrototypeTransitionType,
  raw: string | undefined,
  navigation: PrototypeNavigationType
): string {
  if (raw !== undefined && transitionFromFigma(raw) === type) return raw
  if (navigation === 'SCROLL_TO') return 'INSTANT_TRANSITION'
  return type === 'DISSOLVE' ? 'DISSOLVE' : 'INSTANT_TRANSITION'
}

/** A `.fig` interaction, merged onto the raw action it came from so unknown fields survive. */
function interactionToFigma(
  reaction: PrototypeReaction,
  raw: FigmaInteraction | undefined,
  context: SceneNodeToKiwiContext,
  localIdCounter: { value: number }
): FigmaInteraction | null {
  const id = parseGuid(reaction.id)
  if (!id) return null
  const event: FigmaEvent = { ...raw?.event, interactionType: reaction.trigger.type }
  // A timeout's delay is Figma's `transitionTimeout`. A mouse enter or leave delay is read from
  // there too, but written back only where the file already stored one: where Figma saves a delay
  // it gave such a trigger is not confirmed yet, so a delay set here plays without being written.
  if (
    reaction.trigger.type === 'AFTER_TIMEOUT' ||
    (DELAYED_TRIGGERS.has(reaction.trigger.type) && raw?.event?.transitionTimeout !== undefined)
  ) {
    event.transitionTimeout = reaction.trigger.delay
  }
  const rawActions = raw?.actions ?? []
  const actions = reaction.actions.flatMap((action, index) => {
    const base = rawActions[index] ?? {}
    if (action.type === 'BACK') return [{ ...base, connectionType: 'BACK' }]
    if (action.type === 'CLOSE') return [{ ...base, connectionType: 'CLOSE' }]
    const target = action.nodeId
      ? getOrCreateNodeGuid(context, action.nodeId, localIdCounter)
      : undefined
    if (!target) return [] // A connection to a deleted frame would point at no record.
    return [
      {
        ...base,
        transitionNodeID: target,
        connectionType: 'INTERNAL_NODE',
        navigationType: NAVIGATION_TO_FIGMA[action.navigation],
        transitionType: transitionToFigma(
          action.transition.type,
          base.transitionType,
          action.navigation
        ),
        transitionDuration: action.transition.duration
      }
    ]
  })
  if (actions.length === 0) return null
  return { ...raw, id, event, actions }
}

/**
 * Writes a layer's reactions as its record's `prototypeInteractions`. An untouched imported
 * record keeps its own payload; an edited one is written from the model plus every interaction
 * the model cannot show, so the Prototype section never drops a hover, drag or variable action.
 */
export function applyPrototypeReactions(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  nc: KiwiNodeChange,
  localIdCounter: { value: number }
): void {
  const raw = rawInteractions(node)
  if (!reactionsAreEdited(node)) {
    // The raw payload already holds every interaction; writing it again would only reorder them.
    if (raw.length > 0) return
    if (node.prototypeReactions.length === 0) return
  }
  const rawById = new Map<string, FigmaInteraction>()
  for (const interaction of raw) {
    const id = interaction.id ? guidToString(interaction.id) : null
    if (id) rawById.set(id, interaction)
  }
  const written = node.prototypeReactions.flatMap((reaction) => {
    const interaction = interactionToFigma(
      reaction,
      rawById.get(reaction.id),
      context,
      localIdCounter
    )
    return interaction ? [interaction] : []
  })
  const preserved = raw.filter((interaction) => !isModeledInteraction(interaction))
  // An emptied list is a removal: a present-but-empty field would say "edited, no connections".
  if (written.length === 0 && preserved.length === 0) return
  nc.prototypeInteractions = [...written, ...preserved]
}

import * as v from 'valibot'

import type { NodeChange } from '@open-pencil/kiwi/fig/codec'
import { guidToString } from '@open-pencil/kiwi/fig/guid'
import type {
  PrototypeAction,
  PrototypeOverlayPositionType,
  PrototypeReaction,
  SceneNode
} from '@open-pencil/scene-graph'
import type { GUID } from '@open-pencil/scene-graph/primitives'

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

/** True when the action is a move to a frame or over it, or a back or close — the ones edited here. */
function isModeledAction(action: FigmaAction): boolean {
  const connection = action.connectionType ?? 'INTERNAL_NODE'
  if (connection === 'BACK' || connection === 'CLOSE') return true
  if (connection !== 'INTERNAL_NODE') return false
  const navigation = action.navigationType ?? 'NAVIGATE'
  return navigation === 'NAVIGATE' || navigation === 'OVERLAY'
}

/** True when the interaction is one the Prototype section can show and edit. */
function isModeledInteraction(interaction: FigmaInteraction): boolean {
  if (interaction.isDeleted === true) return false
  const type = interaction.event?.interactionType
  if (type !== 'ON_CLICK' && type !== 'AFTER_TIMEOUT') return false
  const actions = interaction.actions ?? []
  return actions.length > 0 && actions.every(isModeledAction)
}

function reactionFromFigma(interaction: FigmaInteraction): PrototypeReaction | null {
  if (!isModeledInteraction(interaction)) return null
  const id = interaction.id ? guidToString(interaction.id) : null
  if (!id) return null
  const event = interaction.event ?? {}
  const trigger =
    event.interactionType === 'AFTER_TIMEOUT'
      ? { type: 'AFTER_TIMEOUT' as const, delay: event.transitionTimeout ?? 0 }
      : { type: 'ON_CLICK' as const, delay: 0 }
  const actions = (interaction.actions ?? []).flatMap<PrototypeAction>((action) => {
    const connection = action.connectionType ?? 'INTERNAL_NODE'
    if (connection === 'BACK') return [{ type: 'BACK' }]
    if (connection === 'CLOSE') return [{ type: 'CLOSE' }]
    return [
      {
        type: 'NODE',
        nodeId: action.transitionNodeID ? guidToString(action.transitionNodeID) : null,
        navigation: action.navigationType === 'OVERLAY' ? 'OVERLAY' : 'NAVIGATE',
        transition: {
          type: action.transitionType === 'DISSOLVE' ? 'DISSOLVE' : 'INSTANT',
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
 * Where each frame sits when a reaction opens it as an overlay, by node ID. One pass per export:
 * a context object is one tree's write.
 */
const placementsByExport = new WeakMap<
  SceneNodeToKiwiContext,
  ReadonlyMap<string, PrototypeOverlayPositionType>
>()

function overlayPlacements(
  context: SceneNodeToKiwiContext
): ReadonlyMap<string, PrototypeOverlayPositionType> {
  const known = placementsByExport.get(context)
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
  placementsByExport.set(context, placements)
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

/** A `.fig` interaction, merged onto the raw action it came from so unknown fields survive. */
function interactionToFigma(
  reaction: PrototypeReaction,
  raw: FigmaInteraction | undefined,
  context: SceneNodeToKiwiContext,
  localIdCounter: { value: number }
): FigmaInteraction | null {
  const id = parseGuid(reaction.id)
  if (!id) return null
  const event: FigmaEvent = {
    ...raw?.event,
    interactionType: reaction.trigger.type === 'AFTER_TIMEOUT' ? 'AFTER_TIMEOUT' : 'ON_CLICK'
  }
  if (reaction.trigger.type === 'AFTER_TIMEOUT') event.transitionTimeout = reaction.trigger.delay
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
        navigationType: action.navigation,
        transitionType: action.transition.type === 'DISSOLVE' ? 'DISSOLVE' : 'INSTANT_TRANSITION',
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

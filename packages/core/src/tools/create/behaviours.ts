import * as v from 'valibot'

import type { SceneGraph, SceneNode, SlotSettings } from '@open-pencil/scene-graph'
import { behaviourSpecSchema } from '@open-pencil/scene-graph/behaviours'
import {
  slotOwner,
  slotPropertyId,
  updateSlotProperty,
  type SlotPropertyPatch
} from '@open-pencil/scene-graph/slots'

import { mergeSlotSettings, type FigmaSlotSettings } from '#core/figma-api/slots'
import { OpenPencilAPI } from '#core/openpencil-api'
import { defineTool, toolFailure, toolNumber } from '#core/tools/schema'

export const setBehaviour = defineTool({
  name: 'set_behaviour',
  description:
    'Make a main component or component set behave as a Reka UI control in preview and code, ' +
    'naming its own properties and slots: e.g. { kind: "switch", values: { value: "State" }, ' +
    'parts: { thumb: "Thumb" }, states: "Interaction" }. Variant on/off values are guessed from ' +
    'names like On and Off unless given as { property, on, off }. Pass null to remove it. ' +
    'Returns the behaviour and the required values and parts still missing; get_behaviour lists ' +
    'every kind with its values and parts.',
  execution: { kind: 'sync', mutation: 'document' },
  input: v.strictObject({
    id: v.pipe(
      v.string(),
      v.description('Main component or component set ID; a variant uses its set')
    ),
    behaviour: v.pipe(
      v.nullable(behaviourSpecSchema),
      v.description('The behaviour by property and slot names, or null to remove it')
    )
  }),
  execute: (figma, { id, behaviour }) => {
    try {
      const openpencil = new OpenPencilAPI(figma)
      if (behaviour) return openpencil.setBehaviour(id, behaviour).toJSON()
      openpencil.getBehaviour(id)?.remove()
      return { ok: true }
    } catch (error) {
      return toolFailure(error)
    }
  }
})

/** A component as a slot's preferred values store it: its key, else its id, as the panel does. */
function preferredValue(graph: SceneGraph, id: string): string {
  const component = graph.getNode(id)
  if (!component || (component.type !== 'COMPONENT' && component.type !== 'COMPONENT_SET')) {
    throw new Error(`"${id}" is not a component or component set`)
  }
  return component.componentKey ?? component.id
}

/** The settings of the slot `frame` already is, or undefined while it is not one. */
function currentSlotSettings(graph: SceneGraph, frame: SceneNode | undefined) {
  const owner = frame && slotOwner(graph, frame)
  const propertyId = frame && slotPropertyId(frame)
  if (!owner || !propertyId) return undefined
  return owner.componentPropertyDefinitions.find((definition) => definition.id === propertyId)
    ?.slotSettings
}

/** A child limit: a count sets it, null clears it, and leaving it out keeps it. */
const childLimit = (minimum: number, description: string) =>
  v.optional(
    v.nullable(
      toolNumber(v.pipe(v.number(), v.integer(), v.minValue(minimum), v.description(description)))
    )
  )

export const createSlot = defineTool({
  name: 'create_slot',
  description:
    'Make a frame inside a main component a slot, as Create slot does: instances can then hold ' +
    'their own content in it, and a behaviour can bind it as a part. preferred_ids suggests the ' +
    'components that belong in it (a table slot takes table rows), which get_components lists ' +
    'and the Add instances menu offers first; preferred_only allows nothing else. Returns the ' +
    'slot name. On a frame that is already a slot, sets its preferred components and limits; ' +
    'null clears a limit.',
  execution: { kind: 'sync', mutation: 'document' },
  input: v.strictObject({
    id: v.pipe(v.string(), v.description('Frame ID inside a main component')),
    preferred_ids: v.optional(
      v.pipe(
        v.array(v.string()),
        v.description('Component or component set IDs suggested for the slot, replacing any set')
      )
    ),
    preferred_only: v.optional(
      v.pipe(v.boolean(), v.description('Allow only instances of the preferred components'))
    ),
    min_children: childLimit(0, 'Fewest layers the slot takes, or null for no limit'),
    max_children: childLimit(1, 'Most layers the slot takes, or null for no limit')
  }),
  execute: (figma, args) => {
    try {
      const graph = figma.graph
      const preferredValues = args.preferred_ids?.map((id) => preferredValue(graph, id))
      const changes: FigmaSlotSettings = {
        allowPreferredValuesOnly: args.preferred_only,
        minChildren: args.min_children,
        maxChildren: args.max_children
      }
      const changesSettings = Object.values(changes).some((value) => value !== undefined)
      // Checked against the limits the slot keeps, before anything changes.
      const settings = mergeSlotSettings(
        currentSlotSettings(graph, graph.getNode(args.id)),
        changes
      )
      if (
        settings.minChildren !== undefined &&
        settings.maxChildren !== undefined &&
        settings.minChildren > settings.maxChildren
      ) {
        throw new Error(
          `min_children (${settings.minChildren}) must not be more than max_children (${settings.maxChildren})`
        )
      }
      const slot = new OpenPencilAPI(figma).createSlot(args.id)
      const frame = graph.getNode(args.id)
      const owner = frame && slotOwner(graph, frame)
      const propertyId = frame && slotPropertyId(frame)
      if (owner && propertyId && (preferredValues || changesSettings)) {
        // Both limits are written, so a cleared one replaces the count the slot had.
        const slotSettings: SlotSettings = {
          ...settings,
          minChildren: settings.minChildren,
          maxChildren: settings.maxChildren
        }
        const patch: SlotPropertyPatch = { slotSettings }
        if (preferredValues) patch.preferredValues = preferredValues
        updateSlotProperty(graph, owner.id, propertyId, patch)
      }
      return { slot }
    } catch (error) {
      return toolFailure(error)
    }
  }
})

export const getBehaviour = defineTool({
  name: 'get_behaviour',
  description:
    'Read the behaviour of a main component, component set, or variant by property and slot ' +
    'names, with the required values and parts still missing. Without an ID, list every ' +
    'behaviour kind with the values and parts it binds.',
  execution: { kind: 'sync', mutation: 'none' },
  input: v.strictObject({
    id: v.optional(v.pipe(v.string(), v.description('Component, set, or variant ID')))
  }),
  execute: (figma, { id }) => {
    const openpencil = new OpenPencilAPI(figma)
    if (!id) return { kinds: openpencil.behaviourKinds }
    try {
      return openpencil.getBehaviour(id)?.toJSON() ?? { behaviour: null }
    } catch (error) {
      return toolFailure(error)
    }
  }
})

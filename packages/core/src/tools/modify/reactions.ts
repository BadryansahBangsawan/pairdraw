import * as v from 'valibot'

import { figmaReactionsSchema } from '#core/figma-api/reactions'
import { defineTool, nodeIdInputSchema, nodeNotFound, toolFailure } from '#core/tools/schema'

/** Connections in Figma's plugin shape, which the layer's `reactions` reads and writes. */
const reactionsInputSchema = v.pipe(
  figmaReactionsSchema,
  v.description(
    "Prototype connections in Figma's plugin shape: [{ trigger: { type: 'ON_CLICK' } | " +
      "{ type: 'AFTER_TIMEOUT', timeout: seconds }, actions: [{ type: 'NODE', " +
      "destinationId: '<top-level frame id on the same page>', navigation: 'NAVIGATE' | " +
      "'OVERLAY', transition: { type: 'INSTANT' | 'DISSOLVE', duration: seconds }, " +
      "overlayRelativePosition?: 'CENTER' | ... } | { type: 'BACK' } | { type: 'CLOSE' }] }]"
  )
)

export const setReactions = defineTool({
  name: 'set_reactions',

  description:
    'Replace the prototype connections on a layer. Use get_reactions to read them back, and ' +
    'point a NODE action at a top-level frame on the same page. Refuses a trigger, action, ' +
    'transition, navigation or destination the prototype play cannot run.',
  execution: { kind: 'sync', mutation: 'properties' },
  input: v.strictObject({
    id: nodeIdInputSchema,
    reactions: reactionsInputSchema
  }),
  execute: (figma, { id, reactions }) => {
    const node = figma.getNodeById(id)
    if (!node) return nodeNotFound(id)
    try {
      node.reactions = reactions
    } catch (error) {
      return toolFailure(error)
    }
    return { id, reactions: node.reactions }
  }
})

import * as v from 'valibot'

import { figmaReactionsSchema } from '#core/figma-api/reactions'
import { defineTool, nodeIdInputSchema, nodeNotFound, toolFailure } from '#core/tools/schema'

/** Connections in Figma's plugin shape, which the layer's `reactions` reads and writes. */
const reactionsInputSchema = v.pipe(
  figmaReactionsSchema,
  v.description(
    "Prototype connections in Figma's plugin shape: [{ trigger: { type: 'ON_CLICK' | " +
      "'ON_HOVER' | 'ON_PRESS' } | { type: 'MOUSE_ENTER' | 'MOUSE_LEAVE', delay?: seconds } | " +
      "{ type: 'AFTER_TIMEOUT', timeout: seconds }, actions: [{ type: 'NODE', destinationId, " +
      "navigation: 'NAVIGATE' | 'OVERLAY' | 'CHANGE_TO' | 'SCROLL_TO', transition: { type: " +
      "'INSTANT' | 'DISSOLVE', duration: seconds }, overlayRelativePosition?: 'CENTER' | ... } | " +
      "{ type: 'BACK' } | { type: 'CLOSE' }] }]. NAVIGATE and OVERLAY point at a top-level frame " +
      'on the same page; CHANGE_TO at another variant of the set the layer is a variant of, an ' +
      'instance of, or inside (set it once on the main component variant and every instance ' +
      "gets it); SCROLL_TO at a layer in the layer's top-level frame. ON_HOVER and ON_PRESS undo " +
      'their action when the pointer leaves or lifts.'
  )
)

export const setReactions = defineTool({
  name: 'set_reactions',

  description:
    'Replace the prototype connections on a layer. Use get_reactions to read them back. ' +
    'Refuses a trigger, action, transition, navigation or destination the prototype play ' +
    'cannot run. Set overflow scrolling with update_node overflow_direction.',
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

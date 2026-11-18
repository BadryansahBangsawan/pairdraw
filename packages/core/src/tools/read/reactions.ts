import * as v from 'valibot'

import { defineTool, nodeIdInputSchema, nodeNotFound } from '#core/tools/schema'

export const getReactions = defineTool({
  name: 'get_reactions',

  description:
    "Get the prototype connections on a layer, in Figma's plugin shape: each trigger and its " +
    'actions, with a NODE action naming the destination frame. Empty when the layer connects ' +
    'to nothing.',
  execution: { kind: 'sync', mutation: 'none' },
  input: v.strictObject({
    id: nodeIdInputSchema
  }),
  execute: (figma, { id }) => {
    const node = figma.getNodeById(id)
    if (!node) return nodeNotFound(id)
    return { id, reactions: node.reactions }
  }
})

import * as v from 'valibot'

import { defineTool, toolNumber } from '#core/tools/schema'
import { getScriptToolHost } from '#core/tools/script/host'

const SCRIPT_EXAMPLES = `Examples: a bar chart, or a grid of swatches driven by an @input color.`

export const script = defineTool({
  name: 'script',

  description: `Create, edit, or run a code layer: a SCRIPT node whose program draws its own layers in the sandbox and runs again when it is resized or an input changes. Its source lives in the document. Declare controls with a leading @schema comment. ${SCRIPT_EXAMPLES} Output is limited to 1000 layers per run and 2 seconds, has no components, and Math.random is seeded from the node, so a run is repeatable.`,
  execution: { kind: 'async', mutation: 'document' },
  input: v.strictObject({
    action: v.pipe(
      v.picklist(['create', 'set_source', 'run']),
      v.description('create a code layer, replace and rerun its program, or run it again')
    ),
    id: v.optional(
      v.pipe(v.string(), v.description('The SCRIPT node to edit or run; required except on create'))
    ),
    source: v.optional(
      v.pipe(v.string(), v.description('The program to store; required on create and set_source'))
    ),
    x: v.optional(
      toolNumber(v.pipe(v.number(), v.description('X position in the parent or page')))
    ),
    y: v.optional(toolNumber(v.pipe(v.number(), v.description('Y position in the parent or page'))))
  }),
  execute: async (figma, args) => {
    const host = getScriptToolHost(figma.graph)
    if (!host) throw new Error('Script layers are not available in this host.')
    if (args.action === 'create') {
      if (!args.source) throw new Error('create needs a source.')
      return host.create({ source: args.source, x: args.x, y: args.y })
    }
    if (!args.id) throw new Error(`${args.action} needs the code layer's id.`)
    if (args.action === 'set_source') {
      if (args.source === undefined) throw new Error('set_source needs a source.')
      host.setSource(args.id, args.source)
    }
    return host.run(args.id)
  }
})

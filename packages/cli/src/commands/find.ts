import { defineCommand } from 'citty'

import type { FindNodeResult } from '@pairdraw/core/rpc'

import { pageOptions } from '#cli/app/target'
import { printNodeResults, printJSON } from '#cli/format'
import { loadRPCData } from '#cli/rpc-data'

export default defineCommand({
  meta: { name: 'find', description: 'Find nodes by name or type' },
  args: {
    file: {
      type: 'positional',
      description: 'Document file path (omit to connect to running app)',
      required: false
    },
    name: { type: 'string', description: 'Node name (partial match, case-insensitive)' },
    type: { type: 'string', description: 'Node type: FRAME, TEXT, RECTANGLE, INSTANCE, etc.' },
    limit: { type: 'string', description: 'Max results (default: 100)', default: '100' },
    ...pageOptions('all pages'),
    json: { type: 'boolean', description: 'Output as JSON' }
  },
  async run({ args }) {
    const results = await loadRPCData<FindNodeResult[]>(
      args.file,
      'find',
      {
        name: args.name,
        type: args.type,
        limit: args.limit ? Number(args.limit) : undefined
      },
      args
    )

    if (args.json) {
      await printJSON(results)
      return
    }

    await printNodeResults(results)
  }
})

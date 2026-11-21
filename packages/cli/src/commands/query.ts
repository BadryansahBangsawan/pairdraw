import { defineCommand } from 'citty'

import type { QueryNodeResult } from '@pairdraw/core/rpc'

import { pageOptions } from '#cli/app/target'
import { printError, printNodeResults, printJSON } from '#cli/format'
import { requireIntegerOption } from '#cli/options'
import { loadRPCData } from '#cli/rpc-data'

export default defineCommand({
  meta: {
    name: 'query',
    description: 'Query nodes using XPath selectors'
  },
  args: {
    file: {
      type: 'positional',
      description: 'Document file path (omit to connect to running app)',
      required: false
    },
    selector: {
      type: 'positional',
      description:
        'XPath selector whose tag is a node type (e.g., //FRAME[@width < 300], //TEXT[contains(@name, "Label")])',
      required: true
    },
    limit: { type: 'string', description: 'Max results (default: 1000)', default: '1000' },
    ...pageOptions('all pages'),
    json: { type: 'boolean', description: 'Output as JSON' }
  },
  async run({ args }) {
    const limit = requireIntegerOption('limit', args.limit, 1)
    const results = await loadRPCData<QueryNodeResult[] | { error: string }>(
      args.file,
      'query',
      {
        selector: args.selector,
        limit
      },
      args
    )

    if ('error' in results) {
      printError(results.error)
      process.exit(1)
    }

    if (args.json) {
      await printJSON(results)
      return
    }

    await printNodeResults(results, (n) => {
      const q = n as { width?: number; height?: number; name: string }
      return `${q.name}  ${q.width}×${q.height}`
    })
  }
})

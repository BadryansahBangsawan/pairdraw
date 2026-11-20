// eslint-disable-next-line pairdraw/no-mixed-case-acronym-identifiers -- Upstream export spelling.
import { toJsonSchema as toJSONSchema } from '@valibot/to-json-schema'
import { defineCommand } from 'citty'

import { toolChangesDocument } from '@pairdraw/core/tools'

import { appTargetOptions } from '#cli/app/target'
import { bold, dim, entity, fmtList, printError, warn, printJSON, writeStdout } from '#cli/format'
import { documentWriteOptions } from '#cli/headless'
import { readTextSource } from '#cli/input'
import { openToolSession } from '#cli/session/open'
import { previewNotice, previewOptions, previewScale } from '#cli/session/preview'
import {
  CLI_TOOLS,
  findCLITool,
  formatToolList,
  formatToolResult,
  parseToolArgsJSON,
  toolEffect,
  toolErrorMessage
} from '#cli/session/tools'

const json = { type: 'boolean', description: 'Output as JSON' } as const

const list = defineCommand({
  meta: { name: 'list', description: 'List the tools available to `tool call`' },
  args: { json },
  async run({ args }) {
    if (args.json) {
      const rows = CLI_TOOLS.map((def) => ({
        name: def.name,
        effect: toolEffect(def),
        description: def.description
      }))
      await printJSON(rows)
      return
    }
    console.log('')
    console.log(bold(`  ${CLI_TOOLS.length} tools`))
    console.log('')
    console.log(formatToolList())
    console.log('')
  }
})

const describe = defineCommand({
  meta: {
    name: 'describe',
    description: "Show a tool's description and JSON Schema for its arguments"
  },
  args: {
    name: { type: 'positional', description: 'Tool name', required: true },
    json
  },
  async run({ args }) {
    try {
      const def = findCLITool(args.name)
      const schema = toJSONSchema(def.input, { errorMode: 'ignore', typeMode: 'input' })
      if (args.json) {
        const info = {
          name: def.name,
          effect: toolEffect(def),
          description: def.description,
          schema
        }
        await printJSON(info)
        return
      }
      const header = entity('tool', def.name)
      console.log('')
      console.log(
        fmtList([{ header, details: { effect: toolEffect(def), about: def.description } }])
      )
      console.log('')
      console.log(bold('  Arguments (JSON Schema)'))
      await printJSON(schema)
      console.log('')
    } catch (error) {
      printError(error)
      process.exit(1)
    }
  }
})

async function readToolArgs(args: {
  args?: string
  'args-file'?: string
}): Promise<Record<string, unknown>> {
  const source = args['args-file'] ? await readTextSource(args['args-file']) : args.args
  return parseToolArgsJSON(source)
}

const call = defineCommand({
  meta: {
    name: 'call',
    description: 'Run one tool against the running app, or headlessly against a document file'
  },
  args: {
    name: { type: 'positional', description: 'Tool name from `tool list`', required: true },
    file: {
      type: 'positional',
      description: 'Document file path (omit to connect to running app)',
      required: false
    },
    args: { type: 'string', description: 'Tool arguments as a JSON object' },
    'args-file': {
      type: 'string',
      description: 'Read tool arguments from a JSON file, or - for stdin'
    },
    ...documentWriteOptions,
    ...previewOptions,
    ...appTargetOptions,
    json
  },
  async run({ args }) {
    try {
      if (!args.file && (args.write || args.output)) {
        throw new Error(
          '--write and --output need a document file; in the running app, use `pairdraw documents save`'
        )
      }
      const scale = previewScale(args['preview-scale'])
      const def = findCLITool(args.name)
      const toolArgs = await readToolArgs(args)
      const session = await openToolSession(args.file, args)
      const result = await session.call(def, toolArgs)
      if (args.json) await printJSON(result)
      else await writeStdout(`${formatToolResult(result)}\n`)

      // A tool that answers with an error did not do its work: the call fails, and the document is
      // left as it was rather than written back.
      const failure = toolErrorMessage(result)
      if (failure !== null) {
        printError(new Error(failure))
        process.exit(1)
      }

      if (!toolChangesDocument(def)) return
      const outPath = args.output || (args.write ? args.file : undefined)
      if (session.graph && outPath) {
        await session.save(outPath)
        if (!args.json) console.error(dim(`Written to ${outPath}`))
      } else if (session.graph && !args.json) {
        console.error(warn('Changes were not saved; pass --write or --output'))
      }
      const preview = args['preview-output']
      if (!preview || toolErrorMessage(result) !== null) return
      const notice = await previewNotice(preview, () => session.preview(scale))
      if (!args.json) console.error(notice)
    } catch (error) {
      printError(error)
      process.exit(1)
    }
  }
})

export default defineCommand({
  meta: {
    name: 'tool',
    description: 'List, describe, and call editor tools (the same set MCP exposes)'
  },
  subCommands: { list, describe, call }
})

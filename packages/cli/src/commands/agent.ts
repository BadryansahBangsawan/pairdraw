import { defineCommand } from 'citty'
import { compact } from 'es-toolkit'

import { ALL_TOOLS } from '@open-pencil/core/tools'
import { resolveAgentRoot } from '#cli/agent/paths'
import { agentToolDefinitions, parseToolNames } from '#cli/agent/policy'
import { DEFAULT_MAX_STEPS, MAX_MAX_STEPS, readAgentPrompt, runAgent } from '#cli/agent/run'
import { bold, dim, fmtList, ok, printError } from '#cli/format'

const json = { type: 'boolean', description: 'Output as JSON' } as const

/** The API key from `--api-key` or the environment, so a shell history holds no secret. */
function apiKey(flag: string | undefined): string {
  return flag?.trim() || process.env.OPENPENCIL_API_KEY?.trim() || ''
}

const run = defineCommand({
  meta: {
    description: 'Run a design agent on a document through an OpenAI-compatible model'
  },
  args: {
    prompt: { type: 'positional', description: 'What the agent should do', required: false },
    file: {
      type: 'positional',
      description: 'Document file the agent edits',
      required: true
    },
    'prompt-file': {
      type: 'string',
      description: 'Read the prompt from a file, or - for stdin'
    },
    provider: {
      type: 'string',
      description: 'Model provider (default: openai-compatible)',
      default: 'openai-compatible'
    },
    model: { type: 'string', description: 'Model ID the endpoint serves', required: false },
    'api-key': { type: 'string', description: 'API key (default: OPENPENCIL_API_KEY)' },
    'base-url': {
      type: 'string',
      description: 'OpenAI-compatible endpoint, for example https://api.openai.com/v1'
    },
    root: {
      type: 'string',
      description: 'Folder the agent may read and write (default: the working directory)'
    },
    output: { type: 'string', alias: 'o', description: 'Save the edited document here' },
    write: { type: 'boolean', description: 'Save the edited document over the input file' },
    allow: {
      type: 'string',
      description: 'Comma-separated tools to add to the default set, such as stock_photo'
    },
    deny: { type: 'string', description: 'Comma-separated tools to withhold' },
    'max-steps': {
      type: 'string',
      description: `Model turns to allow (default: ${DEFAULT_MAX_STEPS}, at most ${MAX_MAX_STEPS})`
    },
    json
  },
  async run({ args }) {
    try {
      const prompt = await readAgentPrompt({
        prompt: args.prompt,
        promptFile: args['prompt-file']
      })
      const maxSteps = args['max-steps'] === undefined ? DEFAULT_MAX_STEPS : Number(args['max-steps'])
      const result = await runAgent({
        prompt,
        file: args.file,
        provider: args.provider,
        model: args.model ?? '',
        apiKey: apiKey(args['api-key']),
        baseURL: args['base-url'] ?? '',
        root: args.root ?? resolveAgentRoot(undefined),
        ...(args.output === undefined ? {} : { output: args.output }),
        write: args.write === true,
        allow: parseToolNames(args.allow),
        deny: parseToolNames(args.deny),
        maxSteps
      })
      if (args.json) {
        console.log(JSON.stringify(result, null, 2))
        return
      }
      console.log('')
      if (result.tools.length > 0) {
        console.log(
          fmtList(
            result.tools.map((call) => ({
              header: `${call.name} ${call.ok ? dim('ok') : call.error ?? 'failed'}`,
              details: undefined
            })),
            { compact: true }
          )
        )
        console.log('')
      }
      if (result.text.trim()) console.log(result.text.trim())
      const notes = compact([
        `${result.steps} ${result.steps === 1 ? 'step' : 'steps'}`,
        result.output
      ])
      console.log('')
      if (result.output) console.log(ok(`Saved ${result.output}`))
      else if (notes.length > 0) console.log(dim(`Changes were not saved; pass --write or --output`))
      console.log('')
    } catch (error) {
      printError(error)
      process.exit(1)
    }
  }
})

const tools = defineCommand({
  meta: { description: 'List the tools an agent run can call by default' },
  args: { json },
  async run({ args }) {
    const definitions = agentToolDefinitions({ catalog: ALL_TOOLS })
    if (args.json) {
      console.log(
        JSON.stringify(
          definitions.map((definition) => ({
            name: definition.name,
            effect: definition.execution.mutation === 'none' ? 'read' : 'write',
            capabilities: definition.capabilities,
            description: definition.description
          })),
          null,
          2
        )
      )
      return
    }
    console.log('')
    console.log(bold(`  ${definitions.length} agent tools`))
    console.log('')
    console.log(
      fmtList(
        definitions.map((definition) => ({
          header: `${definition.name} ${dim(definition.capabilities.join(', '))}`,
          details: undefined
        })),
        { compact: true }
      )
    )
    console.log('')
  }
})

export default defineCommand({
  meta: {
    description: 'Drive a document from a model: run, and see which tools it may call'
  },
  subCommands: { run, tools }
})

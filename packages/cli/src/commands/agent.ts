import { defineCommand } from 'citty'
import { compact } from 'es-toolkit'

import { ALL_TOOLS } from '@pairdraw/core/tools'

import { resolveAgentRoot } from '#cli/agent/paths'
import { agentToolDefinitions, parseToolNames } from '#cli/agent/policy'
import { AGENT_PROFILES } from '#cli/agent/registry'
import { DEFAULT_MAX_STEPS, MAX_MAX_STEPS, readAgentPrompt, runAgent } from '#cli/agent/run'
import { bold, dim, fmtList, ok, printError, printJSON } from '#cli/format'

const json = { type: 'boolean', description: 'Output as JSON' } as const

/** The API key from `--api-key` or the environment, so a shell history holds no secret. */
function apiKey(flag: string | undefined): string {
  return flag?.trim() || process.env.PAIRDRAW_API_KEY?.trim() || ''
}

const run = defineCommand({
  meta: {
    name: 'run',
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
    'api-key': { type: 'string', description: 'API key (default: PAIRDRAW_API_KEY)' },
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
    agents: {
      type: 'string',
      description:
        'Comma-separated agents to run in order (default: designer); each one only narrows --allow and --deny'
    },
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
      // citty types flags without a default as always present; at runtime they can be missing.
      const optional: {
        'max-steps'?: string
        model?: string
        'base-url'?: string
        root?: string
        output?: string
        write?: boolean
      } = args
      const maxSteps =
        optional['max-steps'] === undefined ? DEFAULT_MAX_STEPS : Number(optional['max-steps'])
      const result = await runAgent({
        prompt,
        file: args.file,
        provider: args.provider,
        model: optional.model ?? '',
        apiKey: apiKey(args['api-key']),
        baseURL: optional['base-url'] ?? '',
        root: optional.root ?? resolveAgentRoot(undefined),
        ...(optional.output === undefined ? {} : { output: optional.output }),
        write: optional.write ?? false,
        allow: parseToolNames(args.allow),
        deny: parseToolNames(args.deny),
        agents: parseToolNames(args.agents),
        maxSteps
      })
      if (args.json) {
        await printJSON(result)
        return
      }
      console.log('')
      if (result.tools.length > 0) {
        console.log(
          fmtList(
            result.tools.map((call) => ({
              header: `${call.name} ${call.ok ? dim('ok') : (call.error ?? 'failed')}`,
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
      else if (notes.length > 0)
        console.log(dim(`Changes were not saved; pass --write or --output`))
      console.log('')
    } catch (error) {
      printError(error)
      process.exit(1)
    }
  }
})

const tools = defineCommand({
  meta: { name: 'tools', description: 'List the tools an agent run can call by default' },
  args: { json },
  async run({ args }) {
    const definitions = agentToolDefinitions({ catalog: ALL_TOOLS })
    if (args.json) {
      await printJSON(
        definitions.map((definition) => ({
          name: definition.name,
          effect: definition.execution.mutation === 'none' ? 'read' : 'write',
          capabilities: definition.capabilities,
          description: definition.description
        }))
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

const list = defineCommand({
  meta: { name: 'list', description: 'List the named agents a run can put in a team' },
  args: { json },
  async run({ args }) {
    if (args.json) {
      await printJSON(
        AGENT_PROFILES.map((profile) => ({
          id: profile.id,
          description: profile.description,
          readOnly: profile.readOnly,
          only: profile.only ?? null,
          deny: profile.deny,
          maxSteps: profile.maxSteps ?? null
        }))
      )
      return
    }
    console.log('')
    console.log(bold(`  ${AGENT_PROFILES.length} agents`))
    console.log('')
    console.log(
      fmtList(
        AGENT_PROFILES.map((profile) => ({
          header: `${profile.id} ${dim(profile.readOnly ? 'read-only' : 'edits')}`,
          details: [profile.description]
        })),
        { compact: true }
      )
    )
    console.log('')
  }
})

export default defineCommand({
  meta: {
    name: 'agent',
    description: 'Drive a document from a model: run, and see which tools it may call'
  },
  subCommands: { run, tools, list }
})

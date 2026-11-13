import { realpath } from 'node:fs/promises'
import { resolve } from 'node:path'

import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel, ToolSet } from 'ai'
import { generateText, stepCountIs, tool } from 'ai'
import * as v from 'valibot'

import type { FigmaAPI } from '@open-pencil/core/figma-api'
import { ALL_TOOLS, toolsToAI, type ToolDef } from '@open-pencil/core/tools'

import { executeAgentTool } from '#cli/agent/file-output'
import { resolveAgentRoot, safeOutputPath } from '#cli/agent/paths'
import { agentToolDefinitions } from '#cli/agent/policy'
import {
  type AgentProfile,
  type AgentRunRound,
  agentPrompt,
  agentSystemPrompt,
  resolveAgentProfiles,
  toolsForAgent
} from '#cli/agent/registry'
import { readTextSource } from '#cli/input'
import { openHeadlessSession, type ToolSession } from '#cli/session/open'
import { createHeadlessFigma } from '#cli/tool-data'

export const DEFAULT_MAX_STEPS = 25
export const MAX_MAX_STEPS = 1000

/** What the headless agent is told it is, independent of any locale or UI. */
const AGENT_SYSTEM_PROMPT = [
  'You are Pairdraw, a headless design agent working on one Pairdraw document.',
  'Inspect before editing, keep changes inside the request, and never claim an edit succeeded unless a tool result confirms it.',
  'Node IDs are stable strings like "12:34"; reuse the IDs a tool returns instead of guessing.'
].join(' ')

const optionsSchema = v.strictObject({
  prompt: v.pipe(v.string(), v.regex(/\S/, 'Provide a prompt')),
  file: v.pipe(v.string(), v.regex(/\S/, 'Provide a document file')),
  provider: v.string(),
  model: v.pipe(v.string(), v.regex(/\S/, 'Provide a model ID')),
  apiKey: v.string(),
  baseURL: v.string(),
  root: v.string(),
  output: v.optional(v.string()),
  write: v.boolean(),
  allow: v.array(v.string()),
  deny: v.array(v.string()),
  agents: v.array(v.string()),
  maxSteps: v.number()
})
export type AgentRunOptions = v.InferOutput<typeof optionsSchema>

interface AgentToolRun {
  name: string
  ok: boolean
  error?: string
}

export interface AgentRunResult {
  /** What the last agent said. */
  text: string
  /** Model turns across every agent. */
  steps: number
  /** Every tool call, in the order the agents made them. */
  tools: AgentToolRun[]
  rounds: AgentRunRound[]
  output?: string
}

/** The model a run uses: an [OI]-compatible endpoint chosen by `--base-url`. */
function agentModel(options: AgentRunOptions): LanguageModel {
  if (options.provider !== 'openai-compatible') {
    throw new Error(
      `Unsupported agent provider "${options.provider}"; the headless agent runs an [OI]-compatible endpoint. Pass --base-url and --model.`
    )
  }
  if (!options.apiKey.trim())
    throw new Error('Set the API key with --api-key or OPENPENCIL_API_KEY')
  if (!options.model.trim()) throw new Error('Set the model with --model')
  if (!options.baseURL.trim())
    throw new Error('--base-url is required for an [OI]-compatible agent')
  return createOpenAI({ apiKey: options.apiKey, baseURL: options.baseURL }).chat(options.model)
}

function assertMaxSteps(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > MAX_MAX_STEPS) {
    throw new Error(`--max-steps must be a whole number from 1 to ${MAX_MAX_STEPS}`)
  }
  return value
}

/** A tool may report failure by returning `{ error }` instead of throwing. */
function toolError(result: unknown): string | undefined {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return undefined
  if (!('error' in result)) return undefined
  return String(result.error)
}

/** What one agent is given for its turn on the document the run opened. */
interface AgentTurn {
  profile: AgentProfile
  prompt: string
  previous: readonly AgentRunRound[]
  model: LanguageModel
  tools: readonly ToolDef[]
  figma: FigmaAPI
  session: ToolSession
  root: string
  /** The run's ceiling, which an agent's own ceiling may only lower. */
  maxSteps: number
}

/** Run one agent's turn, and record what it said and every tool it called. */
async function runAgentTurn(turn: AgentTurn): Promise<AgentRunRound> {
  const maxSteps = Math.min(turn.maxSteps, turn.profile.maxSteps ?? turn.maxSteps)
  const calls: AgentToolRun[] = []
  let step = 0

  const aiTools: ToolSet = toolsToAI(
    [...turn.tools],
    {
      getFigma: () => turn.figma,
      getStepBudget: () => ({ current: step, max: maxSteps }),
      executeTool: async (definition, _figma, args) => {
        try {
          return await executeAgentTool(definition, args, turn.root, async () => {
            const result = await turn.session.call(definition, args)
            const error = toolError(result)
            calls.push({
              name: definition.name,
              ok: error === undefined,
              ...(error === undefined ? {} : { error })
            })
            return result
          })
        } catch (error) {
          // The tool ran, but its file output was refused, or it failed after starting.
          const message = error instanceof Error ? error.message : String(error)
          calls.push({ name: definition.name, ok: false, error: message })
          return { error: message }
        }
      }
    },
    { tool }
  )

  const generated = await generateText({
    model: turn.model,
    system: agentSystemPrompt(turn.profile, AGENT_SYSTEM_PROMPT),
    prompt: agentPrompt(turn.prompt, turn.previous),
    tools: aiTools,
    stopWhen: stepCountIs(maxSteps),
    onStepFinish: () => {
      step += 1
    }
  })

  return {
    agent: turn.profile.id,
    text: generated.text,
    steps: generated.steps.length,
    tools: calls
  }
}

/**
 * Run a team of agents on a headless document in the order the run names them. Each agent sees
 * the tools its role allows, and what the agents before it reported; the document is opened once,
 * edited in place, and saved once, as asked. Everything a tool writes, and `--output`, stays
 * inside `root`.
 */
export async function runAgent(options: AgentRunOptions): Promise<AgentRunResult> {
  const parsed = v.parse(optionsSchema, options)
  const maxSteps = assertMaxSteps(parsed.maxSteps)
  const profiles = resolveAgentProfiles(parsed.agents)
  const root = await realpath(resolveAgentRoot(parsed.root))
  const session = await openHeadlessSession(resolve(parsed.file))
  if (!session.graph) throw new Error('The headless agent needs a document file')
  const figma = await createHeadlessFigma(session.graph)
  const offered = agentToolDefinitions({
    catalog: ALL_TOOLS,
    allow: parsed.allow,
    deny: parsed.deny
  })
  const model = agentModel(parsed)
  const rounds: AgentRunRound[] = []

  for (const profile of profiles) {
    rounds.push(
      await runAgentTurn({
        profile,
        prompt: parsed.prompt,
        previous: rounds,
        model,
        tools: toolsForAgent(offered, profile),
        figma,
        session,
        root,
        maxSteps
      })
    )
  }

  let output: string | undefined
  const outputPath = parsed.output ?? (parsed.write ? parsed.file : undefined)
  if (outputPath) {
    const target = await safeOutputPath(outputPath, root)
    await session.save(target)
    output = target
  }

  return {
    text: rounds.at(-1)?.text ?? '',
    steps: rounds.reduce((total, round) => total + round.steps, 0),
    tools: rounds.flatMap((round) => round.tools),
    rounds,
    ...(output === undefined ? {} : { output })
  }
}

/** The prompt a run was given, from the argument or a file, refusing an empty one. */
export async function readAgentPrompt(input: {
  prompt?: string | undefined
  promptFile?: string | undefined
}): Promise<string> {
  const prompt = input.promptFile ? await readTextSource(input.promptFile) : (input.prompt ?? '')
  if (!prompt.trim()) throw new Error('Provide a prompt argument or --prompt-file')
  return prompt
}

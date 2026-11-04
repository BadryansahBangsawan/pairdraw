import { realpath } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { LanguageModel, ToolSet } from 'ai'
import { generateText, stepCountIs, tool } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import * as v from 'valibot'

import { ALL_TOOLS, toolsToAI } from '@open-pencil/core/tools'
import { executeAgentTool } from '#cli/agent/file-output'
import { resolveAgentRoot, safeOutputPath } from '#cli/agent/paths'
import { agentToolDefinitions } from '#cli/agent/policy'
import { openHeadlessSession } from '#cli/session/open'
import { readTextSource } from '#cli/input'
import { createHeadlessFigma } from '#cli/tool-data'

export const DEFAULT_MAX_STEPS = 25
export const MAX_MAX_STEPS = 1000

/** What the headless agent is told it is, independent of any locale or UI. */
export const AGENT_SYSTEM_PROMPT = [
  'You are Pairdraw, a headless design agent working on one OpenPencil document.',
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
  maxSteps: v.number()
})
export type AgentRunOptions = v.InferOutput<typeof optionsSchema>

export interface AgentToolRun {
  name: string
  ok: boolean
  error?: string
}
export interface AgentRunResult {
  text: string
  steps: number
  tools: AgentToolRun[]
  output?: string
}

/** The model a run uses: an OpenAI-compatible endpoint chosen by `--base-url`. */
function agentModel(options: AgentRunOptions): LanguageModel {
  if (options.provider !== 'openai-compatible') {
    throw new Error(
      `Unsupported agent provider "${options.provider}"; the headless agent runs an OpenAI-compatible endpoint. Pass --base-url and --model.`
    )
  }
  if (!options.apiKey.trim()) throw new Error('Set the API key with --api-key or OPENPENCIL_API_KEY')
  if (!options.model.trim()) throw new Error('Set the model with --model')
  if (!options.baseURL.trim()) throw new Error('--base-url is required for an OpenAI-compatible agent')
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

/**
 * Run one agent turn on a headless document. The document the user names is read from and saved
 * to as asked; everything a tool writes, and `--output`, stays inside `root`.
 */
export async function runAgent(options: AgentRunOptions): Promise<AgentRunResult> {
  const parsed = v.parse(optionsSchema, options)
  const maxSteps = assertMaxSteps(parsed.maxSteps)
  const root = await realpath(resolveAgentRoot(parsed.root))
  const file = resolve(parsed.file)
  const session = await openHeadlessSession(file)
  if (!session.graph) throw new Error('The headless agent needs a document file')
  const figma = await createHeadlessFigma(session.graph)
  const tools = agentToolDefinitions({
    catalog: ALL_TOOLS,
    allow: parsed.allow,
    deny: parsed.deny
  })
  const calls: AgentToolRun[] = []
  let step = 0

  const aiTools: ToolSet = toolsToAI(
    tools,
    {
      getFigma: () => figma,
      getStepBudget: () => ({ current: step, max: maxSteps }),
      executeTool: async (definition, _figma, args) => {
        try {
          return await executeAgentTool(definition, args, root, async () => {
            const result = await session.call(definition, args)
            const error = toolError(result)
            calls.push({ name: definition.name, ok: error === undefined, ...(error ? { error } : {}) })
            return result
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          calls.push({ name: definition.name, ok: false, error: message })
          return { error: message }
        }
      }
    },
    { tool }
  )

  const generated = await generateText({
    model: agentModel(parsed),
    system: AGENT_SYSTEM_PROMPT,
    prompt: parsed.prompt,
    tools: aiTools,
    stopWhen: stepCountIs(maxSteps),
    onStepFinish: () => {
      step += 1
    }
  })

  let output: string | undefined
  const outputPath = parsed.output ?? (parsed.write ? parsed.file : undefined)
  if (outputPath) {
    const target = await safeOutputPath(outputPath, root)
    await session.save(target)
    output = target
  }

  return {
    text: generated.text,
    steps: generated.steps.length,
    tools: calls,
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

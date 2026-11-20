import { generateText, Output } from 'ai'
import { valibotSchema } from '@ai-sdk/valibot'
import type * as v from 'valibot'

import { reasoningCallSettings, runtimeReasoningSettings } from '@/app/ai/models/reasoning/settings'
import type { AIModelRuntime, DirectAIModelRuntime } from '@/app/ai/models/runtime'

/** One question for a role's model: text and images in, text out, with none of Pairdraw's tools. */
export interface ModelQuestion {
  text: string
  images?: ReadonlyArray<{ mediaType: string; data: Uint8Array }>
  /** The most an API model may answer with; its profile's limit still applies. */
  maxOutputTokens?: number
  /**
   * `off` asks an API model not to think, for an answer of a few words. A model that always
   * thinks thinks the least it can, and keeps its profile's limit to think in.
   */
  thinking?: 'off'
  signal?: AbortSignal
}

/**
 * The shape an answer takes. An API model answers in it as structured output; a coding agent's
 * text answer is turned into it by `fromText`.
 */
export interface ModelAnswer<T> {
  schema: v.GenericSchema<unknown, T>
  /** The structured output's name, for providers that take one. */
  name: string
  fromText: (text: string) => T
}

/** What asking reaches outside the app, which tests replace. */
export interface ModelAskDependencies {
  generate?: typeof generateText
}

/** The role's model takes no question of this kind, as Pi, whose companion only runs chat turns. */
export class ModelQuestionUnsupportedError extends Error {
  constructor() {
    super('This model cannot be asked a question outside a chat.')
    this.name = 'ModelQuestionUnsupportedError'
  }
}

/** Whether `askModel` can put a question to the runtime's model. */
export function answersQuestions(runtime: AIModelRuntime): boolean {
  return runtime.kind === 'direct'
}

/** The output limit and thinking an API model is asked with. */
function callSettings(runtime: DirectAIModelRuntime, { maxOutputTokens, thinking }: ModelQuestion) {
  const { connection, profile } = runtime.role
  const thinksAnyway = thinking === 'off' && runtime.minReasoningEffort !== undefined
  return {
    maxOutputTokens:
      maxOutputTokens === undefined || thinksAnyway
        ? profile.maxOutputTokens
        : Math.min(profile.maxOutputTokens, maxOutputTokens),
    ...(thinking === 'off'
      ? reasoningCallSettings(connection.providerID, 'off', runtime.minReasoningEffort)
      : runtimeReasoningSettings(runtime))
  }
}

/**
 * Asks a role's model one question: an API model is called directly, with none of the chat's
 * tools. Given an answer's shape, the answer comes in that shape as structured output. A coding
 * agent on a role cannot be asked outside a chat yet, so it refuses as Pi does.
 */
export async function askModel(
  runtime: AIModelRuntime,
  question: ModelQuestion,
  dependencies?: ModelAskDependencies
): Promise<string>
export async function askModel<T>(
  runtime: AIModelRuntime,
  question: ModelQuestion & { answer: ModelAnswer<T> },
  dependencies?: ModelAskDependencies
): Promise<T>
export async function askModel<T>(
  runtime: AIModelRuntime,
  question: ModelQuestion & { answer?: ModelAnswer<T> },
  { generate = generateText }: ModelAskDependencies = {}
): Promise<string | T> {
  if (runtime.kind !== 'direct') throw new ModelQuestionUnsupportedError()
  const { text, images = [], signal, answer } = question
  const request = {
    model: runtime.model,
    ...callSettings(runtime, question),
    abortSignal: signal,
    messages: [
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text },
          ...images.map((image) => ({ type: 'file' as const, ...image }))
        ]
      }
    ]
  }
  if (!answer) return (await generate(request)).text
  const { output } = await generate({
    ...request,
    output: Output.object({ schema: valibotSchema(answer.schema), name: answer.name })
  })
  return output
}
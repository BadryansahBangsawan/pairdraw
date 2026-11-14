import { aiMessages } from '@pairdraw/vue/i18n'

type AIMessages = ReturnType<typeof aiMessages.get>

/** The example prompts Home and the empty page offer, in the order they show. */
export const PROMPT_EXAMPLE_IDS = ['landing', 'signIn', 'dashboard', 'pricing'] as const
export type PromptExampleId = (typeof PROMPT_EXAMPLE_IDS)[number]

interface PromptExample {
  id: PromptExampleId
  /** The chip's short name. */
  label: string
  /** What picking it writes into the prompt. */
  prompt: string
}

const EXAMPLE_MESSAGES = {
  landing: ['promptExampleLanding', 'promptExampleLandingPrompt'],
  signIn: ['promptExampleSignIn', 'promptExampleSignInPrompt'],
  dashboard: ['promptExampleDashboard', 'promptExampleDashboardPrompt'],
  pricing: ['promptExamplePricing', 'promptExamplePricingPrompt']
} as const satisfies Record<PromptExampleId, readonly [keyof AIMessages, keyof AIMessages]>

/** Each example prompt in the current language. */
export function promptExamples(messages: AIMessages = aiMessages.get()): PromptExample[] {
  return PROMPT_EXAMPLE_IDS.map((id) => {
    const [label, prompt] = EXAMPLE_MESSAGES[id]
    return { id, label: messages[label], prompt: messages[prompt] }
  })
}

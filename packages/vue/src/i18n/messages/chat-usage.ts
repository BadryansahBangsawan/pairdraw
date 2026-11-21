import { params } from '@nanostores/i18n'

import { i18n } from '#vue/i18n/create'

/** The chat's token and cost meter: what each reply spent and the conversation's running total. */
export const chatUsageMessageDefaults = {
  usageLabel: 'Token usage',
  turnTokens: params('{tokens} tokens'),
  turnTokensCost: params('{tokens} tokens · {cost}'),
  chatTokens: params('{tokens} tokens this chat'),
  chatTokensCost: params('{tokens} tokens · {cost} this chat'),
  usageInput: 'Input',
  usageCachedInput: 'Cached input',
  usageOutput: 'Output',
  usageReasoning: 'Reasoning',
  usageCost: 'Estimated cost',
  usageTurns: params('{count} replies'),
  usageHint:
    'Counted from the tokens each reply reported. Cost is an estimate at the model’s list price.',
  usageNoCost: 'No price is listed for this model, so only tokens are shown.',
  usageAgentHint: 'Counted from the tokens the agent reported. Coding agents carry no dollar price.'
} as const

export const chatUsageMessages = i18n('chatUsage', chatUsageMessageDefaults)

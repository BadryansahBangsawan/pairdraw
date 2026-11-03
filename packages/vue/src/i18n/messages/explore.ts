import { params } from '@nanostores/i18n'

import { i18n } from '#vue/i18n/create'

/** Exploring with AI: "Let it cook" variants in the chat, and the notes layers keep for agents. */
export const exploreMessageDefaults = {
  letItCook: 'Let it cook',
  letItCookState: params('Let it cook: {state}'),
  letItCookDescription:
    'Explore several directions at once. Each variant becomes a new frame beside the others.',
  mode: 'Mode',
  modeOff: 'Off',
  modeVariants: 'Variants',
  modeSingle: "Don't iterate",
  singleDescription: 'One design in a single pass, without reviewing and reworking it.',
  variantCount: 'Number of variants',
  axis: 'Explore',
  axisLayout: 'Layout',
  axisStyle: 'Style',
  activeVariants: params('{count} × {axis}'),
  activeSingle: 'One pass',
  notes: 'Notes for AI',
  notesDescription: 'Agents read these when a message concerns this layer.',
  addNotes: 'Add notes for AI',
  removeNotes: 'Remove notes for AI',
  context: 'Context',
  contextPlaceholder: 'What should agents know? For example: opens the sign-up dialog',
  prompt: 'Prompt',
  promptPlaceholder: 'A request about this layer, sent when you run it',
  runPrompt: 'Run prompt'
} as const

export const exploreMessages = i18n('explore', exploreMessageDefaults)

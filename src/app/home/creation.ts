import { aiMessages } from '@open-pencil/vue/i18n'

type AIMessages = ReturnType<typeof aiMessages.get>

/** What Home offers to start, in the order its chips show. `other` starts from the prompt alone. */
export const CREATION_KIND_IDS = [
  'landing',
  'mobile',
  'web',
  'slides',
  'dashboard',
  'other'
] as const
export type CreationKindId = (typeof CREATION_KIND_IDS)[number]

const KIND_LABELS = {
  landing: 'creationLanding',
  mobile: 'creationMobile',
  web: 'creationWeb',
  slides: 'creationSlides',
  dashboard: 'creationDashboard',
  other: 'creationOther'
} as const satisfies Record<CreationKindId, keyof AIMessages>

/**
 * What the agent is told about each kind of design, after the person's own words. It is written
 * for the agent, in the language its other instructions use; `other` adds nothing.
 */
const KIND_GUIDES: Record<Exclude<CreationKindId, 'other'>, string> = {
  landing:
    'Create one landing page as a single tall frame, with a clear hero, the sections that follow from the request, a call to action, and a footer.',
  mobile:
    'Create a cohesive mobile app flow using phone-sized frames, consistent navigation, and realistic primary, empty, and supporting states.',
  web: 'Create a web app screen in a desktop-sized frame, with its navigation, the main working area, and the states the request implies.',
  slides:
    'Create a presentation as one frame per slide, all the same size, with a title slide, one idea per slide, and consistent type and spacing.',
  dashboard:
    'Create a dashboard in a desktop-sized frame, with navigation, the key figures first, charts for what changes over time, and a table for the detail.'
}

export interface CreationKind {
  id: CreationKindId
  label: string
}

/** Each kind Home offers, named in the current language. */
export function creationKinds(messages: AIMessages = aiMessages.get()): CreationKind[] {
  return CREATION_KIND_IDS.map((id) => ({ id, label: messages[KIND_LABELS[id]] }))
}

/**
 * The prompt Home sends for `kind`: the person's text, then that kind's guide for the agent.
 * `other`, or no kind, sends the text as it is.
 */
export function promptForCreationKind(
  text: string,
  kind: CreationKindId | null,
  messages: AIMessages = aiMessages.get()
): string {
  if (!kind || kind === 'other') return text
  const heading = messages.creationGuide({ kind: messages[KIND_LABELS[kind]] })
  return `${text}\n\n${heading}\n${KIND_GUIDES[kind]}`
}

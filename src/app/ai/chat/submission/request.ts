import type { UIMessage } from 'ai'

import {
  appendFileContext,
  appendSkillContext,
  type AttachedFile,
  type InvokedSkill
} from '@/app/ai/chat/context'
import { appendPinnedContext } from '@/app/ai/chat/pins/note'
import type { ConversationPins } from '@/app/ai/chat/pins/types'
import { commandsAsText } from '@/app/ai/chat/references/command'

/** What follows the person's words in a request, for the model only. */
export interface RequestNotes {
  /** The skill the person ran by name, if they did. */
  skill: InvokedSkill | null
  /** The conversation before the request, which says what the model already heard. */
  earlier: readonly UIMessage[]
  /** What the conversation keeps pinned; absent where the caller does not track pins. */
  pins?: () => ConversationPins | undefined
}

/**
 * A request's text with its notes: the text files attached to it, the skill the person ran, and
 * the conversation's pins when they changed since the model last heard of them.
 */
export function requestText(
  text: string,
  { skill, earlier, pins }: RequestNotes,
  files?: readonly AttachedFile[]
): string {
  // A command chosen from `/` reads as typed, as agents and models run it from the text.
  const noted = appendSkillContext(appendFileContext(commandsAsText(text), files), skill)
  return pins ? appendPinnedContext(noted, earlier, pins()) : noted
}

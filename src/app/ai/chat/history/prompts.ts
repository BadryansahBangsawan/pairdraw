import type { UIMessage } from 'ai'

import { visibleUserMessageText } from '@/app/ai/chat/presentation'

/**
 * What the person sent in a conversation, oldest first, as the transcript shows each message:
 * without the notes the chat added for the model. A prompt sent twice in a row is listed once.
 */
export function sentPrompts(messages: readonly UIMessage[]): string[] {
  const prompts: string[] = []
  for (const message of messages) {
    if (message.role !== 'user') continue
    const text = message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('')
    const prompt = visibleUserMessageText(message.id, text).trim()
    if (prompt && prompts.at(-1) !== prompt) prompts.push(prompt)
  }
  return prompts
}

/**
 * Steps through sent prompts from the composer, as a shell's history does: `older` from an empty
 * field shows the latest prompt, and each further `older` the one before; `newer` walks back and
 * past the latest empties the field again. Once the shown prompt is edited, the walk ends, so
 * the arrows move the caret through the edit instead of replacing it.
 */
export function createPromptRecall(prompts: () => readonly string[]) {
  /** How far back the shown prompt is, 0 for the latest; -1 while nothing recalled is shown. */
  let index = -1
  let shown: string | null = null

  function show(list: readonly string[], next: number): string | null {
    index = next
    shown = next < 0 ? null : (list.at(-1 - next) ?? null)
    return shown
  }

  /** The prompt before the one shown, or null when Up should move the caret instead. */
  function older(current: string): string | null {
    const list = prompts()
    const browsing = shown !== null && current === shown
    if (!browsing) {
      index = -1
      shown = null
      if (current.trim()) return null
    }
    if (index + 1 >= list.length) return null
    return show(list, index + 1)
  }

  /** The prompt after the one shown, an empty field past the latest, or null when not browsing. */
  function newer(current: string): string | null {
    if (shown === null || current !== shown) return null
    return show(prompts(), index - 1) ?? ''
  }

  return { older, newer }
}

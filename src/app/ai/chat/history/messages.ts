import { isToolUIPart, type UIMessage } from 'ai'
import { toRaw } from 'vue'

import {
  attachmentsForMessage,
  setMessageAttachments
} from '@/app/ai/attachment/presentation/store'
import { visibleMessageText, setVisibleMessageText } from '@/app/ai/chat/presentation'
import { withReferenceLabels } from '@/app/ai/chat/references/link'
import { settleMessage } from '@/app/ai/reply/settle'
import { readToolChange, setToolChange } from '@/app/ai/tools/changes/store'
import type { ToolChange } from '@/app/ai/tools/changes/types'

import type { ConversationMessage } from './types'

/**
 * Copies of objects that are replaced rather than written into, by the object they copy, so a
 * save copies only what changed since the last one. Copies are never written to.
 */
function copier<T extends object>(): (value: T) => T {
  const copies = new WeakMap<T, T>()
  return (value) => {
    const raw = toRaw(value)
    const known = copies.get(raw)
    if (known) return known
    const copy = structuredClone(raw)
    copies.set(raw, copy)
    return copy
  }
}

/** The chat replaces a message to change it, except the one a reply streams into. */
const copyMessage = copier<UIMessage>()
/** The change store replaces a change when its images arrive. */
const copyChange = copier<ToolChange>()

export function snapshotMessages(messages: UIMessage[]): ConversationMessage[] {
  return messages.map((message, index) => {
    const text = message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('')
    const last = index === messages.length - 1
    return {
      message: last ? structuredClone(toRaw(message)) : copyMessage(message),
      displayText: visibleMessageText(message.id, text),
      attachments: attachmentsForMessage(message.id).value.map((attachment) =>
        structuredClone(toRaw(attachment))
      ),
      toolChanges: message.parts.flatMap((part) => {
        const change = isToolUIPart(part) ? readToolChange(part.toolCallId) : null
        return change ? [copyChange(change)] : []
      })
    }
  })
}

export function restoreMessages(messages: ConversationMessage[]): UIMessage[] {
  for (const row of messages) {
    if (row.displayText !== undefined) setVisibleMessageText(row.message.id, row.displayText)
    setMessageAttachments(row.message.id, row.attachments)
    for (const change of row.toolChanges ?? []) setToolChange(change)
  }
  // Nothing runs in a reopened conversation; a reply saved mid-way no longer reads as running.
  return messages.map((row) => settleMessage(structuredClone(row.message), { stopped: false }))
}

export function fallbackTitle(messages: UIMessage[]): string {
  const first = messages.find((message) => message.role === 'user')
  if (!first) return ''
  const text = first.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join(' ')
  return withReferenceLabels(visibleMessageText(first.id, text))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

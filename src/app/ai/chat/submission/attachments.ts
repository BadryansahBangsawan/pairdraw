import type { UIMessage } from 'ai'

import { snapshotNodes } from '@/app/ai/attachment/node/snapshot'
import { attachmentsForMessage } from '@/app/ai/attachment/presentation/store'
import type { AttachmentPresentation } from '@/app/ai/attachment/presentation/types'
import { textAttachmentPresentations } from '@/app/ai/attachment/text/prepare'
import { fileContextOf } from '@/app/ai/chat/context'
import { mentionedNodes } from '@/app/ai/chat/references/nodes'
import type { ChatSubmission } from '@/app/ai/chat/submission/types'
import type { EditorStore } from '@/app/editor/active-store'

/** Whether the message carries anything besides its text: images, layers, or files. */
export function hasAttachments(submission: ChatSubmission): boolean {
  return submission.images.length + submission.nodes.length + (submission.files?.length ?? 0) > 0
}

/** What a sent message lists before its images: previews of its layers, then its files. */
export function listedAttachments(
  editor: EditorStore,
  messageId: string,
  submission: ChatSubmission
): AttachmentPresentation[] {
  return [
    ...snapshotNodes(editor, messageId, submission.nodes),
    ...textAttachmentPresentations(messageId, submission.files ?? [])
  ]
}

/**
 * What an edited message carries: previews of the layers its new text mentions, and the files it
 * was sent with, both as the transcript lists them and as the note the model reads.
 */
export function editedAttachments(
  editor: EditorStore,
  message: UIMessage,
  text: string
): { attachments: AttachmentPresentation[]; fileNote: string } {
  const sent = message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')
  const files = attachmentsForMessage(message.id).value.filter(
    (attachment) => attachment.kind === 'file'
  )
  return {
    attachments: [
      ...snapshotNodes(editor, message.id, mentionedNodes(editor.graph, text)),
      ...files
    ],
    fileNote: fileContextOf(sent)
  }
}

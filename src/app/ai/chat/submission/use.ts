import { computed, markRaw, ref, type Ref } from 'vue'

import { designMessageWithImageFindings } from '@/app/ai/attachment/image/analyze'
import { revokeImagePreviewURL } from '@/app/ai/attachment/image/prepare'
import {
  imageDraftPresentations,
  preparedImagePresentations
} from '@/app/ai/attachment/image/presentation'
import {
  deleteMessageAttachments,
  setMessageAttachments
} from '@/app/ai/attachment/presentation/store'
import { setVisibleMessageText } from '@/app/ai/chat/presentation'
import {
  editedAttachments,
  hasAttachments,
  listedAttachments
} from '@/app/ai/chat/submission/attachments'
import { reportSubmissionError, type SubmissionErrorOptions } from '@/app/ai/chat/submission/errors'
import { prepareSubmittedImages } from '@/app/ai/chat/submission/images'
import { appendCanvasNotes, appendEditedCanvasNotes } from '@/app/ai/chat/submission/notes'
import { requestText, type RequestNotes } from '@/app/ai/chat/submission/request'
import { chatToResend } from '@/app/ai/chat/submission/resend'
import type { ChatInstance, ChatSubmission } from '@/app/ai/chat/submission/types'
import { restoreTurn, revertTurn } from '@/app/ai/reply/turns'
import { useUndoRecords } from '@/app/ai/reply/undo'
import { invokedSkill } from '@/app/ai/skills/invoke'
import type { EditorStore } from '@/app/editor/active-store'

interface SubmissionOptions extends SubmissionErrorOptions {
  chat: Ref<ChatInstance | null>
  ensureChat: () => Promise<ChatInstance | null>
  flush?: () => Promise<void>
  clearFailure: () => void
  getEditor: () => EditorStore
  /** What the conversation keeps pinned, which a request carries when it changed. */
  pins?: RequestNotes['pins']
}

export function useChatSubmission(options: SubmissionOptions) {
  const isPreparingAttachments = ref(false)
  let operationVersion = 0

  const undone = useUndoRecords(options)
  const { withTurn } = undone

  /** Redoes or undoes a reply's edits; the history change marks them, for chat and model. */
  function turnAction(act: (messageId: string) => boolean) {
    return async (messageId: string): Promise<void> => {
      if (!readyChat() || !act(messageId)) return
      await options.flush?.().catch(() => undefined)
    }
  }

  async function sendText(
    currentChat: ChatInstance,
    submission: ChatSubmission,
    dispatch: () => void
  ): Promise<void> {
    const previousIds = new Set(currentChat.messages.map((message) => message.id))
    dispatch()
    await withTurn(currentChat, () =>
      currentChat.sendMessage({ text: submission.modelText }).catch(() => undefined)
    )
    const message = currentChat.messages.find(
      (candidate) => candidate.role === 'user' && !previousIds.has(candidate.id)
    )
    if (message) setVisibleMessageText(message.id, submission.displayText)
  }

  /**
   * Shows the message at once and sends it once its images are prepared. A failure before it
   * is sent takes the message back out, so the composer can restore the draft.
   */
  async function sendAttachments(
    currentChat: ChatInstance,
    submission: ChatSubmission,
    version: number,
    dispatch: () => void
  ): Promise<void> {
    const messageId = crypto.randomUUID()
    const editor = options.getEditor()
    const listed = listedAttachments(editor, messageId, submission)
    currentChat.messages = [
      ...currentChat.messages,
      { id: messageId, role: 'user', parts: [{ type: 'text', text: submission.modelText }] }
    ]
    setVisibleMessageText(messageId, submission.displayText)
    const draftImages = imageDraftPresentations(messageId, submission.images)
    setMessageAttachments(messageId, [...listed, ...draftImages])
    // The message previews its images from their files; the composer's previews go once sent.
    const send = () => {
      dispatch()
      for (const image of submission.images) revokeImagePreviewURL(image.previewURL)
    }

    if (submission.images.length === 0) {
      send()
      await withTurn(currentChat, () =>
        currentChat.sendMessage({ messageId, text: submission.modelText }).catch(() => undefined)
      )
      return
    }

    const images = await prepareSubmittedImages(
      editor,
      submission.modelText,
      submission.images
    ).catch((error: unknown) => {
      currentChat.messages = currentChat.messages.filter((message) => message.id !== messageId)
      deleteMessageAttachments(messageId)
      throw error
    })
    const { prepared: preparedImages, findings } = images
    if (version !== operationVersion || options.chat.value !== currentChat) return

    const normalizedImages = preparedImagePresentations(
      messageId,
      submission.images,
      preparedImages
    )
    setMessageAttachments(messageId, [...listed, ...normalizedImages])
    send()
    await withTurn(currentChat, () =>
      currentChat
        .sendMessage({
          messageId,
          text: designMessageWithImageFindings(
            submission.modelText,
            submission.images.map((image) => image.file.name),
            findings
          )
        })
        .catch(() => undefined)
    )
  }

  /**
   * Resolves to false when the message never reached the chat. The composer then takes the
   * submission back, attachments included, so their previews stay alive until it decides.
   */
  async function submit(submission: ChatSubmission): Promise<boolean> {
    const status = options.chat.value?.status ?? 'ready'
    if (status === 'streaming' || status === 'submitted' || isPreparingAttachments.value) {
      if (submission.images.length > 0) options.reportError(options.messages.value.requestFailed)
      return false
    }

    const version = ++operationVersion
    // Whether the message was sent: after that, a failure must not hand it back.
    let sent = false
    const dispatch = () => {
      sent = true
    }
    isPreparingAttachments.value = submission.images.length > 0
    options.clearFailure()
    try {
      // Read before the version check below, so a cancel or newer message meanwhile wins.
      const skill = await invokedSkill(submission.displayText)
      const currentChat = await options.ensureChat()
      if (currentChat && version === operationVersion) options.chat.value = markRaw(currentChat)
      if (!currentChat || version !== operationVersion) {
        if (submission.images.length > 0) options.reportError(options.messages.value.requestFailed)
        return false
      }
      const canvas = appendCanvasNotes(options.getEditor(), submission, currentChat.messages)
      const note = undone.note(canvas, currentChat.messages)
      const notes = { skill, earlier: currentChat.messages, pins: options.pins }
      const noted = { ...submission, modelText: requestText(note.text, notes, submission.files) }
      const previousIds = new Set(currentChat.messages.map((message) => message.id))
      if (hasAttachments(submission)) await sendAttachments(currentChat, noted, version, dispatch)
      else await sendText(currentChat, noted, dispatch)
      const request = currentChat.messages.find(
        (message) => message.role === 'user' && !previousIds.has(message.id)
      )
      if (request) undone.reported(currentChat, note.reports, request.id)
      return true
    } catch (error) {
      reportSubmissionError(options, error)
      return sent
    } finally {
      await options.flush?.().catch(() => undefined)
      if (version === operationVersion) isPreparingAttachments.value = false
    }
  }

  function readyChat(): ChatInstance | null {
    const currentChat = options.chat.value
    if (!currentChat || isPreparingAttachments.value) return null
    return currentChat.status === 'ready' || currentChat.status === 'error' ? currentChat : null
  }

  /** Asks again for the last reply, undoing its edits when it can, or for an unanswered request. */
  async function regenerate(): Promise<void> {
    const currentChat = await chatToResend(options, readyChat())
    const last = currentChat?.messages.at(-1)
    if (!currentChat || !last) return
    options.clearFailure()
    if (last.role === 'assistant') revertTurn(last.id)
    try {
      await withTurn(currentChat, () =>
        currentChat.regenerate({ messageId: last.id }).catch(() => undefined)
      )
    } finally {
      await options.flush?.().catch(() => undefined)
    }
  }

  /** Replaces the last user message and asks again, undoing the old reply's edits when it can. */
  async function resend(messageId: string, text: string): Promise<void> {
    const currentChat = await chatToResend(options, readyChat())
    const trimmed = text.trim()
    if (!currentChat || !trimmed) return
    const index = currentChat.messages.findIndex((message) => message.id === messageId)
    const edited = currentChat.messages.at(index)
    const later = currentChat.messages.slice(index + 1)
    if (index === -1 || !edited || later.some((message) => message.role === 'user')) return
    options.clearFailure()
    for (const message of later) if (message.role === 'assistant') revertTurn(message.id)
    // Replies after the edited message are replaced; what it reported needs a new report.
    const earlier = currentChat.messages.slice(0, index)
    const canvas = appendEditedCanvasNotes(options.getEditor(), trimmed, edited, earlier)
    const note = undone.note(canvas, earlier)
    const notes = { skill: await invokedSkill(trimmed), earlier, pins: options.pins }
    setVisibleMessageText(messageId, trimmed)
    // The layers the edited text mentions replace the previews the message showed; the files it
    // was sent with go with its new text.
    const { attachments, fileNote } = editedAttachments(options.getEditor(), edited, trimmed)
    setMessageAttachments(messageId, attachments)
    try {
      await withTurn(currentChat, () =>
        currentChat
          .sendMessage({ messageId, text: requestText(`${note.text}${fileNote}`, notes) })
          .catch(() => undefined)
      )
      undone.reported(currentChat, note.reports, messageId)
    } finally {
      await options.flush?.().catch(() => undefined)
    }
  }

  function cancel(): void {
    operationVersion += 1
    isPreparingAttachments.value = false
  }

  const busy = computed(() => isPreparingAttachments.value)

  return {
    busy,
    cancel,
    stop: () => options.chat.value?.stop(),
    submit,
    regenerate,
    resend,
    revert: turnAction(revertTurn),
    restore: turnAction(restoreTurn)
  }
}

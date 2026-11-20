import type { UIMessage } from 'ai'
import { computed, provide, watch, type ComputedRef, type Ref } from 'vue'

import { useAIMessages } from '@pairdraw/vue/i18n'

import { leadingCommand } from '@/app/ai/chat/references/command'
import type { ChatSubmission } from '@/app/ai/chat/submission/types'
import { ModelQuestionUnsupportedError } from '@/app/ai/models/ask'
import { reviewOf } from '@/app/ai/review/message'
import {
  ReviewEmptyError,
  ReviewImagesUnreadableError,
  ReviewModelMissingError
} from '@/app/ai/review/run'
import type { useChatReview } from '@/app/ai/review/use'
import { toast } from '@/app/shell/ui'
import { CHAT_CHANGE_REVIEW } from '@/components/chat/tool/context'

interface PanelReviewOptions {
  review: ReturnType<typeof useChatReview>
  messages: Ref<readonly UIMessage[]>
  /** Whether the chat takes a message now: configured, idle, and not compacting. */
  chatIdle: ComputedRef<boolean>
  submit: (message: ChatSubmission) => void
}

/**
 * The chat panel's review wiring: the `/review` command, sending a review's findings on, the
 * change previews' Review this change, and a failed review's notice.
 */
export function usePanelReview(options: PanelReviewOptions) {
  const ai = useAIMessages()
  const { review } = options

  /**
   * The command when `message` starts with `/review`, and what to focus on after it: the Review
   * model reviews the design whatever holds the chat, so an agent's own `/review` is not offered.
   * Attached images are references the design is compared against.
   */
  function reviewCommand(message: ChatSubmission) {
    const command = leadingCommand(message.displayText)
    return command?.name === 'review' ? command : null
  }

  /** Sends a review's findings to the Design model as the person's message. */
  function fixReview(messageId: string): void {
    const found = options.messages.value.find((message) => message.id === messageId)
    const findings = found ? reviewOf(found)?.findings : undefined
    if (!findings) return
    const text = ai.value.reviewFixRequest({ findings })
    options.submit({ modelText: text, displayText: text, images: [], nodes: [] })
  }

  /** What a review that failed tells the person, by why it failed. */
  function reviewFailure(error: unknown): string {
    if (error instanceof ReviewModelMissingError) return ai.value.reviewNoModel
    if (error instanceof ReviewImagesUnreadableError) return ai.value.reviewImagesUnreadable
    if (error instanceof ReviewEmptyError) return ai.value.reviewEmpty
    if (error instanceof ModelQuestionUnsupportedError) return ai.value.reviewUnsupported
    return ai.value.reviewFailed
  }

  /**
   * Whether a review can start or send its findings on: the chat takes a message now. A reopened
   * conversation has no live chat until one is sent, and sending makes it.
   */
  const reviewReady = computed(() => options.chatIdle.value && !review.reviewing.value)
  // A change preview asks the Review model about its edit while the chat is idle.
  provide(CHAT_CHANGE_REVIEW, {
    review: (toolCallId) => void review.reviewToolChange(toolCallId),
    ready: reviewReady
  })

  watch(
    () => review.failed.value,
    (failed) => {
      if (failed) toast.error(reviewFailure(failed))
    }
  )

  return { reviewCommand, fixReview, reviewReady }
}

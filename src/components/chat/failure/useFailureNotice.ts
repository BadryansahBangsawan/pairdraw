import type { Chat } from '@ai-sdk/vue'
import type { UIMessage } from 'ai'
import { computed, watch, type ComputedRef, type Ref } from 'vue'

import { useAIMessages } from '@pairdraw/vue/i18n'

import type { useChatCompaction } from '@/app/ai/chat/compaction/use'
import type { AIChatFailure } from '@/app/ai/chat/failure'
import { cloudBillingURL } from '@/app/cloud/integration'
import { useDateFormat } from '@/app/i18n/date'
import { openSettingsDialog } from '@/app/settings/dialog'
import { openExternalLink, toast } from '@/app/shell/ui'

interface FailureNoticeOptions {
  chatFailure: Ref<AIChatFailure | null>
  chat: Ref<Chat<UIMessage> | null>
  /** The signed-out agent the chat column shows its own sign-in for; no toast then. */
  signedOutAgent: ComputedRef<unknown>
  compaction: ReturnType<typeof useChatCompaction>
  regenerate: () => Promise<void>
}

/**
 * The notice a failed reply shows, with the action that fits its reason: Retry, the provider
 * settings, the Cloud plan, or Compact and retry for a request past the model's context. The
 * notice outlives a switch to another tab, whose chat its Retry must not touch.
 */
export function useFailureNotice(options: FailureNoticeOptions) {
  const ai = useAIMessages()
  const dates = useDateFormat()
  const { chatFailure, chat } = options

  /**
   * A Cloud that bills sells more credits; a self-hosted one has only the allowance its
   * administrator set, which renews or is raised.
   */
  function cloudCreditsMessage(resetsAt: string | undefined): string {
    if (cloudBillingURL.value) return ai.value.chatCloudCreditsExhausted
    if (!resetsAt) return ai.value.chatCloudAllowanceUsed
    return ai.value.chatCloudAllowanceUsedUntil({ date: dates.format(resetsAt, 'dayTime') })
  }

  const failureMessage = computed(() => {
    switch (chatFailure.value?.reason) {
      case 'authentication':
        return ai.value.chatAuthenticationFailed
      case 'forbidden':
        return ai.value.chatForbidden
      case 'insufficient-credit':
        return ai.value.chatInsufficientCredit
      case 'cloud-credits-exhausted':
        return cloudCreditsMessage(chatFailure.value.resetsAt)
      case 'context-limit':
        return ai.value.chatContextLimit
      case 'model-not-found':
        return ai.value.chatModelNotFound
      case 'network':
        return ai.value.chatNetworkFailed
      case 'output-limit':
        return ai.value.chatOutputLimit
      case 'rate-limit':
        return ai.value.chatRateLimited
      case 'request-failed':
        return ai.value.chatRequestFailed
      case 'timeout':
        return ai.value.chatProviderStalled
      case 'agent-timeout':
        return ai.value.chatAgentStartTimeout
      case 'empty-reply':
        return ai.value.chatEmptyReply
      case 'sign-in-expired':
        return ai.value.chatSignInExpired
      case 'agent-unconfigured':
        return null
      case 'plan-forbidden':
        return ai.value.chatPlanForbidden
      default:
        return null
    }
  })
  const failureHasSettingsAction = computed(() =>
    [
      'authentication',
      'forbidden',
      'model-not-found',
      'sign-in-expired',
      'plan-forbidden'
    ].includes(chatFailure.value?.reason ?? '')
  )

  // Asking again clears the failure, and its notice goes with it.
  let failureToast: number | null = null
  /** The message the last failure stopped, which Retry sends again. */
  let failedMessageId: string | undefined
  function retryFailed(messageId: string | undefined): void {
    if (messageId && chat.value?.messages.at(-1)?.id === messageId) void options.regenerate()
  }
  function failureAction(failedId: string | undefined): { label: string; run: () => void } {
    const billingURL = cloudBillingURL.value
    if (chatFailure.value?.reason === 'cloud-credits-exhausted' && billingURL) {
      return { label: ai.value.manageCloudPlanAction, run: () => void openExternalLink(billingURL) }
    }
    if (chatFailure.value?.reason === 'context-limit') {
      return {
        label: ai.value.compactAndRetry,
        run: () => {
          // The failed request stays after the summary, so Retry sends it again.
          void options.compaction
            .compact({ trigger: 'manual', before: failedId })
            .then((compacted) => {
              if (compacted) retryFailed(failedId)
              return undefined
            })
        }
      }
    }
    return failureHasSettingsAction.value
      ? { label: ai.value.openProviderSettingsAction, run: () => openSettingsDialog('ai') }
      : { label: ai.value.retryRequest, run: () => retryFailed(failedId) }
  }
  watch(
    () => chatFailure.value?.reason,
    (reason) => {
      if (failureToast !== null) toast.remove(failureToast)
      failureToast = null
      if (!reason) return
      const failedId = chat.value?.messages.at(-1)?.id
      failedMessageId = failedId
      // The chat column shows where to sign in to the agent itself.
      if (options.signedOutAgent.value) return
      failureToast = toast.error(
        failureMessage.value ?? ai.value.chatRequestFailed,
        failureAction(failedId)
      )
    }
  )
  /** Sends the message a signed-out agent refused again, once the person signed in. */
  function retrySignedOut(): void {
    retryFailed(failedMessageId)
  }

  return { retrySignedOut }
}

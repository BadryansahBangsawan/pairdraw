import type { useI18n } from '@pairdraw/vue/i18n'

import { isMissingUpdateFeed } from './feed'

export type UpdaterMessages = ReturnType<typeof useI18n>['updates']['value']

export type UpdateFailureStep = 'check' | 'download' | 'install' | 'restart'

/**
 * Translated text for an updater failure; a missing manifest means no signed release yet, and a
 * missing feed means this build does not check for updates at all.
 */
export function updateFailureText(
  messages: UpdaterMessages,
  step: UpdateFailureStep,
  error: string
): string {
  if (step === 'download') return messages.downloadFailed({ error })
  if (step === 'install') return messages.installFailed({ error })
  if (step === 'restart') return messages.restartFailed({ error })
  if (isMissingUpdateFeed(error)) return messages.notConfigured
  if (error.toLowerCase().includes('valid release json')) return messages.unavailable
  return messages.checkFailed({ error })
}

export interface UpdateFailureNotice {
  text: string
  /** A build or copy without an update feed is a lasting fact, not an error. */
  tone: 'info' | 'error'
  /** Whether trying again could succeed. */
  retryable: boolean
}

/** How the Software Update window shows a failure: its text, tone, and whether to offer a retry. */
export function updateFailureNotice(
  messages: UpdaterMessages,
  step: UpdateFailureStep,
  error: string
): UpdateFailureNotice {
  const text = updateFailureText(messages, step, error)
  if (step === 'check' && isMissingUpdateFeed(error)) {
    return { text, tone: 'info', retryable: false }
  }
  return { text, tone: 'error', retryable: true }
}

import {
  RESTART_HEALTHY_RESET_MS,
  restartDelay,
  type RestartPolicyOptions
} from '../restart-policy'

/** Why a child is left stopped. The dev server logs it; the app shows localized copy for its own. */
export const RESTART_EXHAUSTED = 'restart-exhausted'

export interface RestartSchedulerOptions {
  /** Starts the child again. Called on the delay the policy gives. */
  retry: () => void
  /** Told why the child is not started again, and how many restarts were already used. */
  report?: (reason: typeof RESTART_EXHAUSTED, attempts: number) => void
  policy?: RestartPolicyOptions
  /** How long a child must stay up before a later crash counts as the first one. */
  healthyResetMs?: number
}

export interface RestartScheduler {
  /** Plans a restart, or reports why there is none left. */
  afterCrash: () => void
  /** Forgets the crashes, so the next one gets the first delay again. */
  afterSuccess: () => void
  /** Ends the supervision, cancelling any planned restart. */
  stop: () => void
}

/**
 * The restart cadence of a child that died: a wait that grows with each crash, and a limit after
 * which the person is told instead of the child being started every second forever.
 */
export function createRestartScheduler(options: RestartSchedulerOptions): RestartScheduler {
  let attempts = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let resetTimer: ReturnType<typeof setTimeout> | undefined
  let stopped = false
  const healthyResetMs = options.healthyResetMs ?? RESTART_HEALTHY_RESET_MS

  function clearResetTimer(): void {
    if (!resetTimer) return
    clearTimeout(resetTimer)
    resetTimer = undefined
  }

  function afterCrash(): void {
    if (stopped || timer) return
    clearResetTimer()
    const delay = restartDelay(attempts, options.policy)
    if (delay === null) {
      options.report?.(RESTART_EXHAUSTED, attempts)
      return
    }
    attempts += 1
    timer = setTimeout(() => {
      timer = undefined
      if (!stopped) options.retry()
    }, delay)
  }

  return {
    afterCrash,
    afterSuccess() {
      // A child that has only just come up has not earned a fresh set of attempts.
      if (resetTimer) return
      resetTimer = setTimeout(() => {
        resetTimer = undefined
        attempts = 0
      }, healthyResetMs)
    },
    stop() {
      stopped = true
      if (timer) clearTimeout(timer)
      timer = undefined
      clearResetTimer()
    }
  }
}

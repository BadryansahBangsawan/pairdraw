import { useIntervalFn } from '@vueuse/core'
import type { UIMessage } from 'ai'
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

import { appRuntimeConfig } from '@/app/runtime/config'

/** How long a coding agent may go without an event before the chat says it is quiet. */
export const QUIET_TURN_MS = 3 * 60_000

/** How often the quiet stretch's length refreshes while a turn runs. */
const QUIET_TICK_MS = 1_000

export type ChatTurnStatus = 'ready' | 'submitted' | 'streaming' | 'error'

export interface QuietTurnOptions {
  status: Ref<ChatTurnStatus>
  messages: Ref<readonly UIMessage[]>
  /** The agent waits on the person, which is not quiet: the answer is theirs to give. */
  waitingForPerson: Ref<boolean>
  /** Overrides the limit, as a test run's URL does. */
  limitMs?: number
  /** Reads the clock; a test passes its own. */
  now?: () => number
}

export interface QuietTurn {
  /** The agent has gone quiet for the whole limit while the turn still runs. */
  quiet: ComputedRef<boolean>
  /** When the agent last spoke or acted, for the notice's "3 min. ago". */
  silentSince: ComputedRef<Date | null>
}

/** The quiet limit this session uses, from `?quiet-turn-ms` in a test run. */
export function quietTurnLimitMs(): number {
  return appRuntimeConfig.quietTurnMs ?? QUIET_TURN_MS
}

/**
 * Tracks how long the agent running this chat has gone without a word. Every update it streams —
 * text, a thought, a tool call, a plan — reaches the transcript, so a change there is an event; a
 * permission request and its answer are events too, and a request waiting on the person is never
 * quiet. The notice is one per quiet stretch: it clears on the next event and with the turn.
 */
export function useQuietTurn({
  status,
  messages,
  waitingForPerson,
  limitMs = quietTurnLimitMs(),
  now: clock = Date.now
}: QuietTurnOptions): QuietTurn {
  const now = ref(clock())
  const lastEventAt = ref(now.value)
  const running = computed(() => status.value === 'submitted' || status.value === 'streaming')

  const tick = useIntervalFn(
    () => {
      now.value = clock()
    },
    QUIET_TICK_MS,
    { immediate: false, immediateCallback: false }
  )
  watch(
    running,
    (live) => {
      if (!live) {
        tick.pause()
        return
      }
      now.value = clock()
      lastEventAt.value = now.value
      tick.resume()
    },
    { immediate: true }
  )

  watch(
    messages,
    () => {
      now.value = clock()
      lastEventAt.value = now.value
    },
    { deep: true }
  )

  watch(waitingForPerson, () => {
    // A request arriving, and the answer leaving, are each the agent's own moment.
    now.value = clock()
    lastEventAt.value = now.value
  })

  const quiet = computed(
    () => running.value && !waitingForPerson.value && now.value - lastEventAt.value >= limitMs
  )
  const silentSince = computed<Date | null>(() =>
    quiet.value ? new Date(lastEventAt.value) : null
  )
  return { quiet, silentSince }
}

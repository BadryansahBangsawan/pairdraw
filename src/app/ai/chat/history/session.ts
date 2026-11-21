import { useThrottleFn } from '@vueuse/core'
import { shallowRef, watch } from 'vue'

import { toolChangesVersion } from '@/app/ai/tools/changes/store'

import type { HistoryChat } from './types'

/** How often a changed conversation is saved while no reply runs. */
const IDLE_SAVE_INTERVAL_MS = 500
/** How often a reply in progress is saved; it is saved once more as it ends. */
const REPLY_SAVE_INTERVAL_MS = 5_000

function replying(chat: HistoryChat): boolean {
  return chat.status === 'submitted' || chat.status === 'streaming'
}

/** Owns live subscriptions; a failed final save deliberately leaves the session attached. */
export function createHistorySession<TChat extends HistoryChat = HistoryChat>(
  reset: () => Promise<void>
) {
  const live = shallowRef<TChat | null>(null)
  let interrupted = false
  let generation = 0
  let stopWatch: (() => void) | undefined

  /** `replied` is told each time the chat finishes a reply. */
  function attach(next: TChat, flush: () => Promise<void>, replied?: () => void): void {
    if (live.value === next) return
    stopWatch?.()
    live.value = next
    const activeGeneration = ++generation
    function save() {
      if (live.value === next && generation === activeGeneration)
        void flush().catch(() => undefined)
    }
    const saveSoon = useThrottleFn(
      save,
      () => (replying(next) ? REPLY_SAVE_INTERVAL_MS : IDLE_SAVE_INTERVAL_MS),
      true,
      true
    )
    // The chat replaces a message, or the list, whenever one changes, so comparing which
    // messages the list holds finds every change without walking their parts.
    const stopMessages = watch(() => [...next.messages], saveSoon)
    const stopStatus = watch(
      () => next.status,
      (status, before) => {
        if (status === 'submitted') interrupted = false
        // A reply stopped by closing the conversation is not one to name it from.
        if (status === 'ready' && before === 'streaming' && live.value === next && !interrupted)
          replied?.()
        save()
      }
    )
    // Change previews render after their call; save them when they arrive.
    const stopChanges = watch(toolChangesVersion, saveSoon)
    stopWatch = () => {
      stopMessages()
      stopStatus()
      stopChanges()
    }
  }

  async function detach(flush: () => Promise<void>): Promise<void> {
    interrupted ||= live.value !== null && replying(live.value)
    await live.value?.stop()
    await flush()
    generation++
    stopWatch?.()
    stopWatch = undefined
    await reset()
    live.value = null
  }

  /**
   * Saves the conversation and stops following it, without stopping a reply or its runtime, so
   * another document can show while a reply keeps running and its agent session stays alive.
   */
  async function release(flush: () => Promise<void>): Promise<void> {
    generation++
    stopWatch?.()
    stopWatch = undefined
    await flush()
    live.value = null
  }

  return {
    attach,
    detach,
    release,
    get chat() {
      return live.value
    },
    /** The attached chat while it replies. */
    get replying(): TChat | null {
      const attached = live.value
      return attached && replying(attached) ? attached : null
    },
    get interrupted() {
      return interrupted || (live.value !== null && replying(live.value))
    },
    restoreInterrupted(value: boolean) {
      interrupted = value
    }
  }
}

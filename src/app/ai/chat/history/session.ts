import { useThrottleFn } from '@vueuse/core'
import { watch } from 'vue'

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
export function createHistorySession(reset: () => Promise<void>) {
  let live: HistoryChat | null = null
  let interrupted = false
  let generation = 0
  let stopWatch: (() => void) | undefined

  function attach(next: HistoryChat, flush: () => Promise<void>): void {
    if (live === next) return
    stopWatch?.()
    live = next
    const activeGeneration = ++generation
    function save() {
      if (live === next && generation === activeGeneration) void flush().catch(() => undefined)
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
      () => {
        if (next.status === 'submitted') interrupted = false
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
    interrupted ||= live?.status === 'submitted' || live?.status === 'streaming'
    await live?.stop()
    await flush()
    generation++
    stopWatch?.()
    stopWatch = undefined
    await reset()
    live = null
  }

  return {
    attach,
    detach,
    get chat() {
      return live
    },
    get interrupted() {
      return interrupted || live?.status === 'submitted' || live?.status === 'streaming'
    },
    restoreInterrupted(value: boolean) {
      interrupted = value
    }
  }
}

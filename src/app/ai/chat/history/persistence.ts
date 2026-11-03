import type { UIMessage } from 'ai'
import { ref, type Ref } from 'vue'

import { hasPins } from '@/app/ai/chat/pins/types'

import { fallbackTitle, snapshotMessages } from './messages'
import type { Conversation, ConversationStore } from './types'

interface PersistenceOptions {
  store: ConversationStore
  current: Ref<Conversation | null>
  messages: Ref<UIMessage[]>
  readOnly: Ref<boolean>
  content(): { messages: UIMessage[]; interrupted: boolean }
  /** The model profile in use, which the conversation remembers as its last. */
  profileId(): string | null
  refresh(): Promise<void>
}

/** Captures snapshots before queuing writes; failures remain visible and retryable. */
export function createHistoryPersistence(options: PersistenceOptions) {
  const storageError = ref(false)
  let writes: Promise<void> = Promise.resolve()

  /** Queues a write behind the pending ones; a failure stays visible and the next write retries. */
  function queue(write: () => Promise<void>): Promise<void> {
    writes = writes
      .catch(() => undefined)
      .then(async () => {
        await write()
        storageError.value = false
        return undefined
      })
      .catch((error) => {
        storageError.value = true
        throw error
      })
    return writes
  }

  /**
   * Saves the conversation once it holds something: a message, a title, or pins. `settle` is for
   * a change that can empty it again, as when its last pin goes: an emptied conversation is then
   * forgotten rather than listed as a blank chat, and can still be saved later.
   */
  function flush(settle = false): Promise<void> {
    const conversation = options.current.value
    if (!conversation || options.readOnly.value) return writes
    const content = options.content()
    const empty =
      !content.messages.length &&
      conversation.titleSource === 'fallback' &&
      !hasPins(conversation.pins)
    if (empty) {
      if (!settle) return writes
      return queue(async () => {
        await options.store.discard(conversation.id)
        await options.refresh()
      })
    }
    const snapshot: Conversation = {
      ...conversation,
      title:
        conversation.titleSource === 'fallback'
          ? fallbackTitle(content.messages)
          : conversation.title,
      updatedAt: new Date().toISOString(),
      profileId: options.profileId() ?? conversation.profileId,
      interrupted: content.interrupted,
      messages: snapshotMessages(content.messages)
    }
    options.current.value = snapshot
    options.messages.value = content.messages
    return queue(async () => {
      await options.store.write(snapshot)
      await options.store.select(snapshot.documentId, snapshot.id)
      await options.refresh()
    })
  }

  /**
   * Remembers a conversation's model profile without counting it as activity, queued behind the
   * pending snapshots so an earlier one cannot land after it and bring the old profile back.
   */
  function saveProfile(id: string, profileId: string): Promise<void> {
    return queue(() => options.store.setProfile(id, profileId))
  }

  return { flush, saveProfile, storageError }
}

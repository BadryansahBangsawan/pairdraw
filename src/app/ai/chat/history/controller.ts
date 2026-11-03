import type { UIMessage } from 'ai'
import { computed, ref, shallowRef, watch } from 'vue'

import { emptyPins, hasPins, type ConversationPins } from '@/app/ai/chat/pins/types'
import { setChatProjectFolder } from '@/app/ai/chat/project-folder'

import { chatDocumentId, resolveChatDocumentId, type ChatDocumentEditor } from './document'
import { createConversationStore } from './idb'
import { restoreMessages } from './messages'
import { createHistoryPersistence } from './persistence'
import { createHistorySession } from './session'
import type {
  Conversation,
  ConversationMeta,
  ConversationStore,
  HistoryChat,
  HistoryRuntime
} from './types'

const MAX_LEFT_DRAFTS = 8

/** Coordinates document ownership and serialized public conversation actions. */
export function createConversationHistory<TChat extends HistoryChat>(
  runtime: HistoryRuntime<TChat>,
  store: ConversationStore = createConversationStore()
) {
  const current = shallowRef<Conversation | null>(null)
  const messages = shallowRef<UIMessage[]>([])
  const conversations = ref<ConversationMeta[]>([])
  const readOnly = ref(false)
  const busy = ref(false)
  let ownerRecoveryId: string | null = null
  // Weak, so the history does not keep a closed document's editor alive.
  let owner: WeakRef<ChatDocumentEditor> | null = null
  let operation: Promise<unknown> = Promise.resolve()
  // Drafts left before anything saved them, kept so a reference still being described when the
  // person switched can save its draft. Few are kept: each switch away from a draft adds one.
  const leftDrafts = new Map<string, Conversation>()
  const session = createHistorySession(() => runtime.resetChat())
  const { flush, saveProfile, storageError } = createHistoryPersistence({
    store,
    current,
    messages,
    readOnly,
    refresh,
    profileId: () => runtime.profileId(),
    content: () => ({
      messages: session.chat?.messages ?? messages.value,
      interrupted: session.interrupted
    })
  })

  // A model switched mid-conversation is remembered at once, so reopening it keeps the switch
  // even when nothing was sent after it. Only the profile is written: the switch is not activity
  // that moves the conversation up the history, and it touches no messages a write could race.
  watch(
    () => runtime.profileId(),
    (profileId) => {
      const conversation = current.value
      if (!conversation || readOnly.value || !profileId || conversation.profileId === profileId)
        return
      current.value = { ...conversation, profileId }
      void saveProfile(conversation.id, profileId).catch(() => undefined)
    }
  )

  /**
   * Whether reopening the conversation should select the model it last used. Another document's
   * conversation only shows. A transcript does not restore a coding agent's session, so one that
   * already has messages continues only on a built-in model: an agent conversation, or an agent
   * profile, is left alone rather than switching the model for the next chat to something that
   * cannot continue this one.
   */
  function restorableProfile(conversation: Conversation): string | null {
    const { profileId } = conversation
    if (readOnly.value || !profileId || profileId === runtime.profileId()) return null
    if (!conversation.messages.length) return profileId
    if (conversation.backend !== 'direct') return null
    return runtime.profileBackend(profileId) === 'direct' ? profileId : null
  }

  function serialize<T>(run: () => Promise<T>): Promise<T> {
    const next = operation.then(async () => {
      busy.value = true
      try {
        return await run()
      } finally {
        busy.value = false
      }
    })
    operation = next.catch(() => undefined)
    return next
  }

  async function refresh() {
    conversations.value = await store.list()
  }
  async function detach() {
    const leaving = readOnly.value ? null : current.value
    await session.detach(flush)
    const left = current.value
    if (!leaving || left?.id !== leaving.id || left.messages.length || hasPins(left.pins)) return
    if (left.titleSource !== 'fallback') return
    leftDrafts.delete(left.id)
    leftDrafts.set(left.id, left)
    const oldest = leftDrafts.keys().next().value
    if (leftDrafts.size > MAX_LEFT_DRAFTS && oldest !== undefined) leftDrafts.delete(oldest)
  }

  async function activate(conversation: Conversation) {
    const editor = runtime.getEditor()
    owner = new WeakRef(editor)
    ownerRecoveryId = editor.getRecoveryId()
    session.restoreInterrupted(conversation.interrupted)
    readOnly.value = conversation.documentId !== chatDocumentId(editor)
    const profileId = restorableProfile(conversation)
    if (profileId) runtime.restoreProfile(profileId)
    current.value = conversation
    messages.value = restoreMessages(conversation.messages)
    if (conversation.messages.length || conversation.titleSource !== 'fallback') {
      await store.select(conversation.documentId, conversation.id)
    }
  }

  async function createDraft() {
    const editor = runtime.getEditor()
    const now = new Date().toISOString()
    await activate({
      id: crypto.randomUUID(),
      documentId: await resolveChatDocumentId(editor, store),
      documentName: editor.state.documentName,
      title: '',
      titleSource: 'fallback',
      createdAt: now,
      updatedAt: now,
      profileId: runtime.profileId(),
      backend: runtime.backend(),
      interrupted: false,
      messages: []
    })
    await refresh()
  }

  function isIdentityChange(editor: ChatDocumentEditor, documentId: string) {
    return (
      owner?.deref() === editor &&
      ownerRecoveryId === editor.getRecoveryId() &&
      current.value &&
      !readOnly.value &&
      current.value.documentId !== documentId
    )
  }

  async function reassignDocument(editor: ChatDocumentEditor, documentId: string) {
    if (!current.value) return
    await flush()
    await store.reassignDocument(current.value.documentId, documentId, editor.state.documentName)
    current.value = { ...current.value, documentId, documentName: editor.state.documentName }
    await refresh()
  }

  async function loadDocument() {
    const editor = runtime.getEditor()
    const documentId = await resolveChatDocumentId(editor, store)
    if (isIdentityChange(editor, documentId)) await reassignDocument(editor, documentId)
    if (current.value?.documentId === documentId) {
      readOnly.value = false
      owner = new WeakRef(editor)
      ownerRecoveryId = editor.getRecoveryId()
      return
    }
    await detach()
    const id = await store.getSelected(documentId)
    const conversation = id ? await store.read(id) : null
    if (conversation?.documentId === documentId) await activate(conversation)
    else await createDraft()
    await refresh()
  }

  function ensureChat() {
    return serialize(async () => {
      if (readOnly.value && owner?.deref() === runtime.getEditor()) return null
      await loadDocument()
      // A restored transcript does not restore an external agent session.
      if (
        current.value?.messages.length &&
        !session.chat &&
        (runtime.backend() !== 'direct' || current.value.backend !== 'direct')
      )
        return null
      const editor = runtime.getEditor()
      const next = await runtime.ensureChat(messages.value, current.value?.id)
      if (runtime.getEditor() !== editor) {
        await next?.stop()
        await runtime.resetChat()
        return null
      }
      if (next) session.attach(next, flush)
      return next
    })
  }

  function initialize() {
    return serialize(loadDocument)
  }
  function newChat() {
    return serialize(async () => {
      await detach()
      await createDraft()
    })
  }
  function open(id: string) {
    return serialize(async () => {
      if (current.value?.id === id) return
      await detach()
      const conversation = await store.read(id)
      if (conversation) await activate(conversation)
    })
  }
  function rename(id: string, title: string) {
    return serialize(async () => {
      if (current.value?.id === id && current.value.messages.length === 0 && title.trim()) {
        current.value = { ...current.value, title: title.trim(), titleSource: 'manual' }
        await flush()
      }
      await store.rename(id, title)
      if (current.value?.id === id && title.trim())
        current.value = { ...current.value, title: title.trim(), titleSource: 'manual' }
      await refresh()
    })
  }
  /**
   * Changes what a conversation keeps pinned. A reference still being described when the person
   * switched conversations lands in the one it was pinned to, even a draft nothing saved yet. A
   * conversation the change leaves empty is forgotten rather than listed as a blank chat.
   */
  function updatePins(id: string, change: (pins: ConversationPins) => ConversationPins) {
    return serialize(async () => {
      const conversation = current.value
      if (conversation?.id === id) {
        if (readOnly.value) return
        current.value = { ...conversation, pins: change(conversation.pins ?? emptyPins()) }
        await flush(true)
        return
      }
      const saved = (await store.read(id)) ?? leftDrafts.get(id)
      if (!saved) throw new Error('The conversation the pin belongs to no longer exists')
      leftDrafts.delete(id)
      const next = { ...saved, pins: change(saved.pins ?? emptyPins()) }
      if (next.messages.length || next.titleSource !== 'fallback' || hasPins(next.pins))
        await store.write(next)
      else await store.discard(id)
      await refresh()
    })
  }
  function remove(id: string) {
    return serialize(async () => {
      if (current.value?.id === id) {
        await detach()
        current.value = null
        messages.value = []
      }
      leftDrafts.delete(id)
      await store.remove(id)
      // A deleted chat leaves no path to the person's project behind.
      setChatProjectFolder(id, null)
      if (!current.value) await createDraft()
      await refresh()
    })
  }

  const pins = computed(() => current.value?.pins ?? emptyPins())

  return {
    current,
    pins,
    updatePins,
    messages,
    conversations,
    readOnly,
    busy,
    storageError,
    initialize,
    ensureChat,
    flush,
    newChat,
    open,
    rename,
    remove
  }
}

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
  /**
   * The shown conversation belongs to another document and its reply runs on. The panel keeps it
   * visible with a notice, and sending waits until its document shows again.
   */
  const away = ref(false)
  let ownerRecoveryId: string | null = null
  // Weak, so the history does not keep a closed document's editor alive.
  let owner: WeakRef<ChatDocumentEditor> | null = null
  let operation: Promise<unknown> = Promise.resolve()
  // Drafts left before anything saved them, kept so a reference still being described when the
  // person switched can save its draft. Few are kept: each switch away from a draft adds one.
  const leftDrafts = new Map<string, Conversation>()
  const session = createHistorySession<TChat>(() => runtime.resetChat())
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
    away.value = false
    rememberLeftDraft(leaving)
  }

  /**
   * Leaves the conversation without stopping a reply or the chat runtime, so a reply keeps running
   * while another document shows and its agent session waits for the document to show again.
   */
  async function release() {
    const leaving = readOnly.value ? null : current.value
    await session.release(flush)
    away.value = false
    rememberLeftDraft(leaving)
  }

  /** Keeps an unsaved, empty conversation of the document being left for a late pin. */
  function rememberLeftDraft(leaving: Conversation | null) {
    const left = current.value
    if (!leaving || left?.id !== leaving.id || left.messages.length || hasPins(left.pins)) return
    if (left.titleSource !== 'fallback') return
    leftDrafts.delete(left.id)
    leftDrafts.set(left.id, left)
    const oldest = leftDrafts.keys().next().value
    if (leftDrafts.size > MAX_LEFT_DRAFTS && oldest !== undefined) leftDrafts.delete(oldest)
  }

  /** Takes back the chat the runtime kept for this conversation, as when its document shows again. */
  function resumeLiveChat(conversation: Conversation) {
    if (session.chat) return
    const resumed = runtime.resumeChat(conversation.id)
    if (resumed) session.attach(resumed, flush)
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
    resumeLiveChat(conversation)
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

  /** Shows the conversation in front live again: the document showing now is its own. */
  function focusDocument(editor: ChatDocumentEditor) {
    readOnly.value = false
    owner = new WeakRef(editor)
    ownerRecoveryId = editor.getRecoveryId()
    away.value = false
    if (current.value) resumeLiveChat(current.value)
  }

  /**
   * Whether the conversation in front keeps showing: its reply runs in a document whose tab is
   * still open. A closed tab, like Stop, New chat, or another conversation, may end the reply.
   */
  function keepsReplyInFront(): boolean {
    if (!session.replying || !current.value || readOnly.value) return false
    const runningEditor = owner?.deref()
    return !runningEditor || runtime.isDocumentOpen(runningEditor)
  }

  async function loadDocument() {
    const editor = runtime.getEditor()
    const documentId = await resolveChatDocumentId(editor, store)
    // Saved under a new identity, the same document keeps its conversation, even mid-reply.
    if (isIdentityChange(editor, documentId)) await reassignDocument(editor, documentId)
    if (current.value?.documentId === documentId) {
      focusDocument(editor)
      return
    }
    if (away.value) {
      if (!session.replying) {
        await endAway()
        return
      }
      if (keepsReplyInFront()) return
      away.value = false
    }
    // A reply in progress keeps its conversation and agent session while another document shows.
    if (keepsReplyInFront()) {
      away.value = true
      return
    }
    const runningEditor = owner?.deref()
    if (runningEditor && !runtime.isDocumentOpen(runningEditor)) await detach()
    else await release()
    const id = await store.getSelected(documentId)
    const conversation = id ? await store.read(id) : null
    if (conversation?.documentId === documentId) await activate(conversation)
    else await createDraft()
    await refresh()
  }

  /**
   * The running conversation's reply ended while another document showed: its panel returns to
   * the document in front. The chat and agent session stay for when that conversation shows again.
   */
  async function endAway() {
    away.value = false
    await loadDocument()
  }

  function ensureChat() {
    return serialize(async () => {
      if (readOnly.value && owner?.deref() === runtime.getEditor()) return null
      await loadDocument()
      // A reply running in another document's chat keeps this document from taking the runtime.
      if (away.value) return null
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
        // Another document came to the front while the chat was taken up. A reply already
        // running is not this call's to end: it keeps going where it started, and the
        // conversation showing it stays away until that document shows again.
        if (next?.status === 'submitted' || next?.status === 'streaming') return null
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

  /**
   * The chat still replying in the conversation this document shows, without starting a chat, so
   * a chat view shown again takes up the reply it left.
   */
  function runningChat(): TChat | null {
    if (readOnly.value || owner?.deref() !== runtime.getEditor()) return null
    return session.replying
  }
  /**
   * The live chat of the conversation showing, without starting one. While another document's
   * reply runs it is that reply, so the panel can keep showing it stream.
   */
  function liveChat(): TChat | null {
    if (readOnly.value && !away.value) return null
    if (!away.value && owner?.deref() !== runtime.getEditor()) return null
    return session.chat
  }
  /** The editor of the conversation showing, which while away is another document's. */
  function documentEditor(): ChatDocumentEditor | null {
    return owner?.deref() ?? null
  }
  // A reply that ends while another document shows hands its panel back to that document.
  watch(
    () => session.chat?.status,
    (status) => {
      if (!away.value || status === 'submitted' || status === 'streaming') return
      void serialize(endAway).catch(() => undefined)
    }
  )
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
    away,
    busy,
    storageError,
    initialize,
    ensureChat,
    runningChat,
    liveChat,
    documentEditor,
    flush,
    newChat,
    open,
    rename,
    remove
  }
}

import type { DBSchema } from 'idb'
import * as v from 'valibot'

import { conversationPinsSchema } from '@/app/ai/chat/pins/schema'
import type { RunTrace, TraceAsset, TraceStore } from '@/app/ai/chat/trace/types'
import { APP_DATABASE_NAMES, defineAppDatabase, connectAppDatabase } from '@/app/storage/idb'

import { fromStorableBlobs, toStorableBlobs } from './blobs'
import type { Conversation, ConversationMeta, ConversationStore } from './types'

/**
 * A browser file the chat knows by id, as metadata only. A live handle cannot be stored:
 * Chromium crashes when deserializing one from IndexedDB, so only name and file facts survive.
 */
type StoredChatFile = Readonly<{
  name: string
  kind: FileSystemHandleKind
  size: number
  lastModified: number
}>

interface ChatDatabase extends DBSchema {
  conversations: { key: string; value: ConversationMeta; indexes: { document: string } }
  /** `Conversation['messages']` with each Blob stored as bytes (`./blobs`). */
  messages: { key: string; value: unknown }
  files: { key: string; value: StoredChatFile }
  deleted: { key: string; value: true }
  selected: { key: string; value: string }
  /** Each run a conversation sent, removed with the conversation (`@/app/ai/chat/trace`). */
  runs: { key: [string, string]; value: RunTrace; indexes: { conversation: string } }
  /** Instructions and tool sets runs share, under their fingerprints. */
  traceAssets: { key: string; value: TraceAsset }
  /** `Conversation['pins']` with each Blob stored as bytes (`./blobs`), under the conversation. */
  pins: { key: string; value: unknown }
}

const definition = defineAppDatabase<ChatDatabase>({
  name: APP_DATABASE_NAMES.chats,
  version: 6,
  callbacks: {
    upgrade(database, oldVersion, _newVersion, transaction) {
      if (oldVersion < 1) {
        database
          .createObjectStore('conversations', { keyPath: 'id' })
          .createIndex('document', 'documentId')
        database.createObjectStore('messages')
        database.createObjectStore('selected')
      }
      if (oldVersion < 2) database.createObjectStore('deleted')
      if (oldVersion < 3) database.createObjectStore('files')
      if (oldVersion < 4) {
        database
          .createObjectStore('runs', { keyPath: ['conversationId', 'runId'] })
          .createIndex('conversation', 'conversationId')
        database.createObjectStore('traceAssets')
      }
      if (oldVersion < 5) database.createObjectStore('pins')
      // The files store kept live handles, which Chromium cannot read back without crashing the
      // browser, so they go.
      if (oldVersion >= 1 && oldVersion < 6) {
        void transaction.objectStore('files').clear()
      }
    }
  }
})

/** Stored pins, or none when they are missing or no longer read as pins. */
function restorePins(stored: unknown): Conversation['pins'] {
  if (stored === undefined) return undefined
  const parsed = v.safeParse(conversationPinsSchema, fromStorableBlobs(stored))
  return parsed.success ? parsed.output : undefined
}

/** The facts a stored row keeps about a handle. */
async function chatFileFacts(handle: FileSystemFileHandle): Promise<StoredChatFile> {
  const file = await handle.getFile()
  return { name: handle.name, kind: handle.kind, size: file.size, lastModified: file.lastModified }
}

function factsMatch(saved: StoredChatFile, facts: StoredChatFile): boolean {
  return (
    saved.name === facts.name &&
    saved.kind === facts.kind &&
    saved.size === facts.size &&
    saved.lastModified === facts.lastModified
  )
}

/**
 * Whether a stored file row and a handle are the same file. A handle kept in this session is
 * compared by its entry, so a save that changes size or lastModified keeps the same chat id; only
 * facts match after a restart, when no live handle survives. When they match, returns the handle's
 * facts so the caller can register the handle and refresh stale stored facts.
 */
async function sameChatFile(
  liveChatHandles: Map<string, FileSystemFileHandle>,
  id: string,
  saved: StoredChatFile,
  handle: FileSystemFileHandle
): Promise<StoredChatFile | null> {
  const live = liveChatHandles.get(id)
  if (live) {
    try {
      if (!(await live.isSameEntry(handle))) return null
      return await chatFileFacts(handle)
    } catch {
      return null
    }
  }
  const facts = await chatFileFacts(handle)
  return factsMatch(saved, facts) ? facts : null
}

/** Transcript snapshots and Blob previews are committed atomically with their list metadata. */
export function createConversationStore(): ConversationStore {
  const database = connectAppDatabase(definition)
  const getDatabase = () => database.open()
  /** Live handles for file rows resolved in this session, keyed by row id. Never stored in IDB. */
  const liveChatHandles = new Map<string, FileSystemFileHandle>()
  return {
    async list(documentId) {
      const db = await getDatabase()
      const rows =
        documentId === undefined
          ? await db.getAll('conversations')
          : await db.getAllFromIndex('conversations', 'document', documentId)
      return rows.toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    },
    async read(id) {
      const transaction = (await getDatabase()).transaction(['conversations', 'messages', 'pins'])
      const meta = await transaction.objectStore('conversations').get(id)
      const messages = await transaction.objectStore('messages').get(id)
      const pins = restorePins(await transaction.objectStore('pins').get(id))
      await transaction.done
      if (!meta) return null
      // Written only by `write` below, from `Conversation['messages']`.
      const restored = fromStorableBlobs(messages ?? []) as Conversation['messages']
      return pins ? { ...meta, messages: restored, pins } : { ...meta, messages: restored }
    },
    async write(conversation) {
      const { messages, pins, ...meta } = conversation
      // Before the transaction opens: awaiting anything but its own requests would end it.
      const stored = await toStorableBlobs(messages)
      const storedPins = pins ? await toStorableBlobs(pins) : undefined
      const transaction = (await getDatabase()).transaction(
        ['conversations', 'messages', 'deleted', 'pins'],
        'readwrite'
      )
      if (await transaction.objectStore('deleted').get(meta.id)) {
        await transaction.done
        throw new Error('Conversation was deleted')
      }
      const existing = await transaction.objectStore('conversations').get(meta.id)
      if (existing) {
        meta.documentId = existing.documentId
        meta.documentName = existing.documentName
      }
      // A delayed streaming snapshot must not undo a manual rename.
      if (existing?.titleSource === 'manual') {
        meta.title = existing.title
        meta.titleSource = 'manual'
      }
      await transaction.objectStore('conversations').put(meta)
      await transaction.objectStore('messages').put(stored, meta.id)
      if (storedPins === undefined) await transaction.objectStore('pins').delete(meta.id)
      else await transaction.objectStore('pins').put(storedPins, meta.id)
      await transaction.done
    },
    async rename(id, title) {
      const trimmed = title.trim()
      if (!trimmed) return
      const transaction = (await getDatabase()).transaction('conversations', 'readwrite')
      const meta = await transaction.store.get(id)
      if (meta) await transaction.store.put({ ...meta, title: trimmed, titleSource: 'manual' })
      await transaction.done
    },
    async setProfile(id, profileId) {
      const transaction = (await getDatabase()).transaction('conversations', 'readwrite')
      const meta = await transaction.store.get(id)
      if (meta) await transaction.store.put({ ...meta, profileId })
      await transaction.done
    },
    async remove(id) {
      const transaction = (await getDatabase()).transaction(
        ['conversations', 'messages', 'selected', 'deleted', 'runs', 'pins'],
        'readwrite'
      )
      await transaction.objectStore('deleted').put(true, id)
      await transaction.objectStore('conversations').delete(id)
      await transaction.objectStore('messages').delete(id)
      await transaction.objectStore('pins').delete(id)
      let run = await transaction.objectStore('runs').index('conversation').openCursor(id)
      while (run) {
        await run.delete()
        run = await run.continue()
      }
      let cursor = await transaction.objectStore('selected').openCursor()
      while (cursor) {
        if (cursor.value === id) await cursor.delete()
        cursor = await cursor.continue()
      }
      await transaction.done
    },
    async discard(id) {
      const transaction = (await getDatabase()).transaction(
        ['conversations', 'messages', 'selected', 'pins'],
        'readwrite'
      )
      await transaction.objectStore('conversations').delete(id)
      await transaction.objectStore('messages').delete(id)
      await transaction.objectStore('pins').delete(id)
      let cursor = await transaction.objectStore('selected').openCursor()
      while (cursor) {
        if (cursor.value === id) await cursor.delete()
        cursor = await cursor.continue()
      }
      await transaction.done
    },
    async resolveFile(handle) {
      return navigator.locks.request('open-pencil-chat-file-identity', async () => {
        const db = await getDatabase()
        // isSameEntry is asynchronous and must run outside an IDB transaction.
        const transaction = db.transaction('files')
        const keys = await transaction.store.getAllKeys()
        const files = await transaction.store.getAll()
        await transaction.done
        for (const [index, saved] of files.entries()) {
          const id = String(keys[index])
          try {
            const facts = await sameChatFile(liveChatHandles, id, saved, handle)
            if (facts) {
              liveChatHandles.set(id, handle)
              if (!factsMatch(saved, facts)) await db.put('files', facts, id)
              return id
            }
          } catch {
            console.warn('[Chat history] Could not compare a saved file handle')
          }
        }
        const id = `browser-file:${crypto.randomUUID()}`
        const facts = await chatFileFacts(handle)
        await db.put('files', facts, id)
        liveChatHandles.set(id, handle)
        return id
      })
    },
    async reassignDocument(from, to, name) {
      const transaction = (await getDatabase()).transaction(
        ['conversations', 'selected'],
        'readwrite'
      )
      const rows = await transaction.objectStore('conversations').index('document').getAll(from)
      for (const row of rows) {
        await transaction
          .objectStore('conversations')
          .put({ ...row, documentId: to, documentName: name })
      }
      const selected = await transaction.objectStore('selected').get(from)
      if (selected) await transaction.objectStore('selected').put(selected, to)
      if (from !== to) await transaction.objectStore('selected').delete(from)
      await transaction.done
    },
    async getSelected(documentId) {
      return (await (await getDatabase()).get('selected', documentId)) ?? null
    },
    async select(documentId, id) {
      const transaction = (await getDatabase()).transaction(
        ['conversations', 'selected'],
        'readwrite'
      )
      const meta = await transaction.objectStore('conversations').get(id)
      if (!meta || meta.documentId !== documentId) {
        transaction.abort()
        await transaction.done.catch(() => undefined)
        throw new Error('Conversation belongs to a different document')
      }
      await transaction.objectStore('selected').put(id, documentId)
      await transaction.done
    }
  }
}

/** Run traces live in the chat database, beside the conversations they belong to. */
export function createTraceStore(): TraceStore {
  const database = connectAppDatabase(definition)
  const getDatabase = () => database.open()
  return {
    async putRun(run) {
      const transaction = (await getDatabase()).transaction(['deleted', 'runs'], 'readwrite')
      // A run still streaming when its conversation is deleted must not outlive it.
      if (!(await transaction.objectStore('deleted').get(run.conversationId))) {
        await transaction.objectStore('runs').put(run)
      }
      await transaction.done
    },
    async listRuns(conversationId) {
      const runs = await (
        await getDatabase()
      ).getAllFromIndex('runs', 'conversation', conversationId)
      return runs.toSorted((left, right) => left.startedAt.localeCompare(right.startedAt))
    },
    async putAsset(hash, asset) {
      await (await getDatabase()).put('traceAssets', asset, hash)
    },
    async getAsset(hash) {
      return (await getDatabase()).get('traceAssets', hash)
    }
  }
}

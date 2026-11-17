import 'fake-indexeddb/auto'
import { describe, expect, test } from 'bun:test'

import type { UIMessage } from 'ai'
import { reactive } from 'vue'

import { VisionModelUnavailableError } from '@/app/ai/attachment/image/analyze'
import type { PreparedImageAttachment } from '@/app/ai/attachment/image/types'
import { createConversationHistory } from '@/app/ai/chat/history/controller'
import type { ChatDocumentEditor } from '@/app/ai/chat/history/document'
import { createConversationStore } from '@/app/ai/chat/history/idb'
import { MAX_PINNED_REFERENCES } from '@/app/ai/chat/pins/limits'
import type { PinReferenceDependencies } from '@/app/ai/chat/pins/references'
import { useConversationPins } from '@/app/ai/chat/pins/use'
import { createDeferred } from '@/app/runtime/deferred'

import { expectDefined } from '#tests/helpers/assert'

function editor(): ChatDocumentEditor {
  const id = crypto.randomUUID()
  return {
    state: { documentName: 'Landing' },
    getRecoveryId: () => id,
    getSourceIdentity: () => ({ path: null, handle: null }),
    getDocumentFilePath: () => null,
    getStorageBinding: () => null
  }
}

function prepared(): PreparedImageAttachment {
  return {
    data: new Uint8Array([1]),
    blob: new Blob(['png'], { type: 'image/png' }),
    mediaType: 'image/png',
    originalWidth: 20,
    originalHeight: 10,
    width: 20,
    height: 10
  }
}

/** Describes each image once `wait` settles, or fails with `fail`. */
function vision(options: { fail?: Error; wait?: Promise<unknown> } = {}): PinReferenceDependencies {
  return {
    prepare: async () => prepared(),
    describe: async () => {
      await options.wait
      if (options.fail) throw options.fail
      return 'Soft beige, rounded cards.'
    }
  }
}

function fixture(dependencies = vision()) {
  const active = editor()
  const store = createConversationStore()
  const chat = reactive({
    messages: [] as UIMessage[],
    status: 'ready' as const,
    stop: async () => undefined
  })
  const history = createConversationHistory(
    {
      getEditor: () => active,
      ensureChat: async () => chat,
      resumeChat: () => null,
      isDocumentOpen: () => true,
      resetChat: async () => undefined,
      profileId: () => null,
      restoreProfile: () => undefined,
      profileBackend: () => 'direct',
      backend: () => 'direct'
    },
    store
  )
  const pins = useConversationPins(history, dependencies)
  return { history, store, pins }
}

const png = (name: string) => new File(['png'], name, { type: 'image/png' })
const kit = { name: 'Brand', colors: [{ name: 'Accent', hex: '#FF5B2E' }], fonts: [], notes: '' }

describe('pins per conversation', () => {
  test('a pinned kit and image are saved with an unsent chat and come back with it', async () => {
    const f = fixture()
    await f.history.initialize()
    const id = expectDefined(f.history.current.value, 'draft').id
    await f.pins.setStyleKit(kit)
    await f.pins.addReferences([png('mood.png')])

    const saved = expectDefined(await f.store.read(id), 'saved conversation')
    expect(saved.pins?.styleKit).toEqual(kit)
    expect(saved.pins?.references.map((reference) => reference.findings)).toEqual([
      'Soft beige, rounded cards.'
    ])
    expect(await saved.pins?.references[0]?.image.text()).toBe('png')

    await f.history.newChat()
    expect(f.history.pins.value).toEqual({ styleKit: null, references: [] })
    await f.history.open(id)
    expect(f.history.pins.value.styleKit?.name).toBe('Brand')
    expect(f.history.pins.value.references).toHaveLength(1)
  })

  test('unpinning the last item of an unsent chat leaves no blank chat in the history', async () => {
    const f = fixture()
    await f.history.initialize()
    const id = expectDefined(f.history.current.value, 'draft').id
    await f.pins.setStyleKit(kit)
    const listed = () => f.history.conversations.value.map((conversation) => conversation.id)
    expect(listed()).toContain(id)

    await f.pins.setStyleKit(null)
    expect(await f.store.read(id)).toBeNull()
    expect(listed()).not.toContain(id)
    // The draft stays open and can still be saved.
    await f.pins.setStyleKit(kit)
    expect((await f.store.read(id))?.pins?.styleKit).toEqual(kit)
  })

  test('an image pinned to a fresh chat lands there after a switch', async () => {
    const { promise: wait, resolve: release } = createDeferred<undefined>()
    const f = fixture(vision({ wait }))
    await f.history.initialize()
    const first = expectDefined(f.history.current.value, 'first').id
    const pinning = f.pins.addReferences([png('late.png')])
    await f.history.newChat()
    release(undefined)
    await pinning

    expect(f.pins.failure.value).toBeNull()
    expect((await f.store.read(first))?.pins?.references.map((ref) => ref.name)).toEqual([
      'late.png'
    ])
    expect(f.history.conversations.value.map((conversation) => conversation.id)).toContain(first)
  })

  test('a pin that fails after a switch explains itself in its own chat', async () => {
    const { promise: wait, resolve: release } = createDeferred<undefined>()
    const f = fixture(vision({ wait, fail: new Error('offline') }))
    await f.history.initialize()
    await f.pins.setStyleKit(kit)
    const first = expectDefined(f.history.current.value, 'first').id
    const pinning = f.pins.addReferences([png('late.png')])
    await f.history.newChat()
    release(undefined)
    await pinning

    expect(f.pins.failure.value).toBeNull()
    await f.history.open(first)
    expect(f.pins.failure.value).toBe('failed')
  })

  test('a pin whose chat was deleted meanwhile says it failed', async () => {
    const { promise: wait, resolve: release } = createDeferred<undefined>()
    const f = fixture(vision({ wait }))
    await f.history.initialize()
    await f.pins.setStyleKit(kit)
    const first = expectDefined(f.history.current.value, 'first').id
    const pinning = f.pins.addReferences([png('late.png')])
    await f.history.remove(first)
    release(undefined)
    await pinning

    expect(await f.store.read(first)).toBeNull()
    expect(f.history.conversations.value.map((conversation) => conversation.id)).not.toContain(
      first
    )
  })

  test('a reference described after a switch lands in the chat it was pinned to', async () => {
    const { promise: wait, resolve: release } = createDeferred<undefined>()
    const f = fixture(vision({ wait }))
    await f.history.initialize()
    await f.pins.setStyleKit(kit)
    const first = expectDefined(f.history.current.value, 'first').id
    const pinning = f.pins.addReferences([png('late.png')])
    expect(f.pins.pending.value.map((entry) => entry.name)).toEqual(['late.png'])
    await f.history.newChat()
    expect(f.pins.pending.value).toEqual([])
    release(undefined)
    await pinning

    expect(f.history.pins.value.references).toEqual([])
    expect((await f.store.read(first))?.pins?.references.map((ref) => ref.name)).toEqual([
      'late.png'
    ])
  })

  test('explains why an image was not pinned', async () => {
    const f = fixture(vision({ fail: new VisionModelUnavailableError() }))
    await f.history.initialize()
    await f.pins.addReferences([png('a.png')])
    expect(f.pins.failure.value).toBe('vision-unavailable')
    expect(f.history.pins.value.references).toEqual([])

    await f.pins.addReferences([new File(['x'], 'notes.txt', { type: 'text/plain' })])
    expect(f.pins.failure.value).toBe('unsupported')
  })

  test('keeps to the image limit', async () => {
    const f = fixture()
    await f.history.initialize()
    const files = Array.from({ length: MAX_PINNED_REFERENCES + 1 }, (_, index) =>
      png(`${index}.png`)
    )
    await f.pins.addReferences(files)
    expect(f.pins.failure.value).toBe('too-many')
    expect(f.history.pins.value.references).toHaveLength(MAX_PINNED_REFERENCES)
    expect(f.pins.remaining.value).toBe(0)
  })
})

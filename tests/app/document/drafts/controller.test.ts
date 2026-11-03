import { describe, expect, test } from 'bun:test'

import { nextTick, reactive, ref } from 'vue'

import { createDocumentDraft, type DraftWriter } from '@/app/document/drafts/controller'
import type { DraftWriteInput } from '@/app/document/drafts/store'

function memoryWriter() {
  const drafts = new Map<string, DraftWriteInput>()
  const writer: DraftWriter = {
    async write(input) {
      drafts.set(input.id, input)
    },
    async remove(id) {
      drafts.delete(id)
    },
    async exists(id) {
      return drafts.has(id)
    }
  }
  return { drafts, writer }
}

/** A draft kept from an earlier session, as Home opens it. */
function keptDraft(id: string, revision: number): DraftWriteInput {
  return { id, name: 'Kept', figBytes: new Uint8Array([revision]) }
}

/** A new document; its drafts hold the revision they were built at, to show which one was kept. */
function setup({ writer = memoryWriter().writer }: { writer?: DraftWriter } = {}) {
  const state = reactive({ documentName: 'Untitled' })
  const version = ref(0)
  const saved: number[] = []
  let sourceless = true
  const enabled = ref(true)
  let ids = 0
  const draft = createDocumentDraft({
    state,
    version: () => version.value,
    buildFigFile: async () => new Uint8Array([version.value]),
    isSourceless: () => sourceless,
    isEnabled: () => enabled.value,
    markSaved: (revision) => saved.push(revision),
    writer,
    createId: () => `draft-${++ids}`
  })
  return {
    state,
    version,
    saved,
    draft,
    enabled,
    setSourceless: (value: boolean) => (sourceless = value)
  }
}

describe('document draft controller', () => {
  test('an untouched document is no draft; its first change makes one and counts as saved', async () => {
    const { drafts, writer } = memoryWriter()
    const { version, saved, draft } = setup({ writer })
    await draft.persistNow()
    expect(drafts.size).toBe(0)
    expect(draft.getDraftId()).toBeNull()

    version.value = 2
    await draft.persistNow()
    expect(draft.getDraftId()).toBe('draft-1')
    expect(drafts.get('draft-1')?.figBytes[0]).toBe(2)
    expect(saved).toEqual([2])

    version.value = 3
    await draft.persistNow()
    // Later changes go to the same draft.
    expect(drafts.size).toBe(1)
    expect(drafts.get('draft-1')?.figBytes[0]).toBe(3)
    draft.dispose()
  })

  test('keeps the document’s name with the draft', async () => {
    const { drafts, writer } = memoryWriter()
    const { state, version, draft } = setup({ writer })
    state.documentName = 'Landing page'
    version.value = 1
    await draft.persistNow()
    expect(drafts.get('draft-1')?.name).toBe('Landing page')
    draft.dispose()
  })

  test('the draft goes once the document saves to a place of its own', async () => {
    const { drafts, writer } = memoryWriter()
    const { version, draft, setSourceless } = setup({ writer })
    version.value = 1
    await draft.persistNow()
    expect(drafts.size).toBe(1)

    // A copy saved elsewhere leaves the document a draft.
    await draft.release()
    expect(drafts.size).toBe(1)

    setSourceless(false)
    await draft.release()
    expect(drafts.size).toBe(0)
    expect(draft.getDraftId()).toBeNull()
    expect(draft.keepsChanges()).toBe(false)

    version.value = 2
    await draft.persistNow()
    expect(drafts.size).toBe(0)
    draft.dispose()
  })

  test('a write in flight when the document is saved elsewhere leaves no draft behind', async () => {
    const memory = memoryWriter()
    let release: () => void = () => undefined
    const writer: DraftWriter = {
      async write(input) {
        await new Promise<void>((resolve) => {
          release = resolve
        })
        await memory.writer.write(input)
      },
      remove: memory.writer.remove
    }
    const { version, draft, setSourceless } = setup({ writer })
    version.value = 1
    const writing = draft.persistNow()
    await nextTick()
    setSourceless(false)
    const releasing = draft.release()
    release()
    await writing
    await releasing
    expect(memory.drafts.size).toBe(0)
    draft.dispose()
  })

  test('opening a draft continues it without writing it again', async () => {
    const { drafts, writer } = memoryWriter()
    const { version, saved, draft } = setup({ writer })
    drafts.set('opened', keptDraft('opened', 4))
    version.value = 4
    draft.adopt('opened')
    await draft.persistNow()
    expect(drafts.get('opened')?.figBytes[0]).toBe(4)
    expect(saved).toEqual([])

    version.value = 5
    await draft.persistNow()
    expect([...drafts.keys()]).toEqual(['opened'])
    draft.dispose()
  })

  test('a write that a newer draft overtook still leaves the latest changes saved', async () => {
    const memory = memoryWriter()
    let hold = true
    let release: () => void = () => undefined
    const writer: DraftWriter = {
      async write(input) {
        if (hold) {
          hold = false
          await new Promise<void>((resolve) => {
            release = resolve
          })
        }
        await memory.writer.write(input)
      },
      remove: memory.writer.remove,
      exists: memory.writer.exists
    }
    const { version, saved, draft } = setup({ writer })
    memory.drafts.set('opened', keptDraft('opened', 0))
    version.value = 1
    const stale = draft.persistNow()
    await nextTick()
    draft.adopt('opened')
    version.value = 2
    const latest = draft.persistNow()
    release()
    await stale
    await latest
    expect(memory.drafts.get('opened')?.figBytes[0]).toBe(2)
    // The overtaken write leaves no draft of its own behind.
    expect([...memory.drafts.keys()]).toEqual(['opened'])
    expect(saved).toEqual([2])
    draft.dispose()
  })

  test('discarding deletes a draft the document started', async () => {
    const { drafts, writer } = memoryWriter()
    const { version, draft } = setup({ writer })
    version.value = 1
    await draft.persistNow()
    await draft.discard()
    expect(drafts.size).toBe(0)
    draft.dispose()
  })

  test('discarding a draft opened from Home keeps what it last held', async () => {
    const { drafts, writer } = memoryWriter()
    const { version, draft } = setup({ writer })
    drafts.set('opened', keptDraft('opened', 3))
    version.value = 3
    draft.adopt('opened')
    version.value = 4
    await draft.persistNow()
    version.value = 5

    await draft.discard()
    expect(drafts.get('opened')?.figBytes[0]).toBe(4)
    draft.dispose()
  })

  test('a draft deleted elsewhere is not written back; its changes go to recovery', async () => {
    const { drafts, writer } = memoryWriter()
    const { version, saved, draft } = setup({ writer })
    version.value = 1
    await draft.persistNow()
    expect(draft.keepsChanges()).toBe(true)

    // Another window deletes the draft.
    drafts.delete('draft-1')
    version.value = 2
    await draft.persistNow()
    expect(drafts.size).toBe(0)
    expect(draft.getDraftId()).toBeNull()
    expect(draft.keepsChanges()).toBe(false)
    expect(saved).toEqual([1])

    version.value = 3
    await draft.persistNow()
    expect(drafts.size).toBe(0)
    draft.dispose()
  })

  test('a suspended or disabled document keeps no draft', async () => {
    const { drafts, writer } = memoryWriter()
    const { version, draft, enabled } = setup({ writer })
    draft.suspend(true)
    version.value = 1
    await draft.persistNow()
    expect(drafts.size).toBe(0)
    expect(draft.keepsChanges()).toBe(false)

    draft.suspend(false)
    enabled.value = false
    await draft.persistNow()
    expect(drafts.size).toBe(0)

    enabled.value = true
    await draft.persistNow()
    expect(drafts.size).toBe(1)
    draft.dispose()
  })

  test('a failed write leaves the changes to recovery until a write succeeds', async () => {
    let fail = true
    const memory = memoryWriter()
    const writer: DraftWriter = {
      async write(input) {
        if (fail) throw new Error('quota exceeded')
        await memory.writer.write(input)
      },
      remove: memory.writer.remove
    }
    const { version, saved, draft } = setup({ writer })
    expect(draft.keepsChanges()).toBe(true)
    version.value = 1
    await expect(draft.persistNow()).rejects.toThrow('quota exceeded')
    expect(draft.keepsChanges()).toBe(false)
    expect(saved).toEqual([])

    fail = false
    await draft.persistNow()
    expect(draft.keepsChanges()).toBe(true)
    expect(saved).toEqual([1])
    draft.dispose()
  })
})

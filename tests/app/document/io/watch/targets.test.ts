import { describe, expect, test } from 'bun:test'

import { watchBrowserFile } from '@/app/document/io/watch/targets'

import { asDouble } from '#tests/helpers/doubles'

/** The poll interval a test asks for, so a few polls fit in a few milliseconds. */
const POLL_MS = 5

/** A handle over a file whose contents never change, counting how often the file is read. */
function fakeHandle() {
  const reads = { count: 0 }
  const handle = asDouble<FileSystemFileHandle>({
    getFile: async () => {
      reads.count += 1
      return asDouble<File>({ lastModified: 1 })
    }
  })
  return { handle, reads }
}

async function wait(ms: number) {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

/** Stands a document with the given visibility in for the browser's, returning its removal. */
function installDocument(isVisible: () => boolean) {
  const before = globalThis.document
  globalThis.document = asDouble<Document>({
    get visibilityState(): DocumentVisibilityState {
      return isVisible() ? 'visible' : 'hidden'
    }
  })
  return () => {
    if (before === undefined) delete (globalThis as { document?: Document }).document
    else globalThis.document = before
  }
}

function watch(handle: FileSystemFileHandle) {
  return watchBrowserFile(
    handle,
    () => handle,
    () => 0,
    () => undefined,
    () => undefined,
    {
      pollMs: POLL_MS
    }
  )
}

describe('watching an open file in the browser', () => {
  test('does not read the file while the tab is hidden', async () => {
    let visible = false
    const restore = installDocument(() => visible)
    try {
      const { handle, reads } = fakeHandle()
      const stop = await watch(handle)
      // The handle is read once to learn the file's time; nothing after that while hidden.
      expect(reads.count).toBe(1)
      await wait(POLL_MS * 8)
      expect(reads.count).toBe(1)

      // Shown again, it reads the file on the next tick rather than staying asleep.
      visible = true
      await wait(POLL_MS * 8)
      expect(reads.count).toBeGreaterThan(1)
      stop()
    } finally {
      restore()
    }
  })

  test('reads the file while the tab is visible', async () => {
    const restore = installDocument(() => true)
    try {
      const { handle, reads } = fakeHandle()
      const stop = await watch(handle)
      await wait(POLL_MS * 8)
      expect(reads.count).toBeGreaterThan(1)
      stop()
    } finally {
      restore()
    }
  })
})

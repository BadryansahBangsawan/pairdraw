import { afterEach, expect, test } from 'bun:test'

import { readFixtureArrayBuffer } from '#core-tests/helpers/fig/fixtures'
import {
  HEAVY_DOCUMENT_TIMEOUT_MS,
  HEAVY_TEST_TIMEOUT_MS,
  runsHeavyTests
} from '#core-tests/helpers/test-utils'

import { exportFigFile } from '@pairdraw/core/io/formats/fig'
import { parseFigBuffer } from '@pairdraw/fig'
import { initCodec } from '@pairdraw/kiwi/fig/codec'

import { readerDiagnostics, registerReaderSession } from '#core/kiwi/fig/session/document-state'
import { openReaderSession } from '#core/kiwi/fig/session/reader'

// Each full material3.fig graph takes gigabytes, and the collector does not run on its own
// between steps, so release them explicitly.
afterEach(() => {
  Bun.gc(true)
})

// material3.fig retains overrides on 58114:20598 that address 57994:10133, a node the
// archive no longer contains. Figma keeps such records; opening the file must not. They are
// recorded on the Examples page, so load that page rather than all thirty-three: reading the
// whole document takes twenty seconds of fixture work to check three records.
test.if(runsHeavyTests)(
  'opening a file skips overrides against deleted nodes and reports them',
  () => {
    const reader = openReaderSession(readFixtureArrayBuffer('material3.fig'), 'none')
    const page = reader.pages.find((candidate) => candidate.name === 'Examples')
    if (!page) throw new Error('material3.fig has no Examples page')
    reader.populate(page.sourceId)
    const stale = reader.diagnostics.filter(
      (entry) =>
        (entry.kind === 'property' || entry.kind === 'assignment') &&
        entry.diagnostic.ownerId === '58114:20598' &&
        entry.diagnostic.reason === 'missing-target'
    )
    expect(stale.length).toBeGreaterThan(0)
    expect(reader.graph.getPages().length).toBeGreaterThan(1)
  },
  HEAVY_TEST_TIMEOUT_MS
)

// The Internal Only Canvas keeps instances of deleted components. Export loads every page,
// so an edited document must still export and reopen with those instances intact.
// Each step keeps only what the next one checks, so one full graph is alive at a time.
async function exportEditedDocument(): Promise<{ bytes: Uint8Array; orphanCount: number }> {
  await initCodec()
  const reader = openReaderSession(readFixtureArrayBuffer('material3.fig'), 'first-page')
  const page = reader.graph.getPages()[0]
  reader.graph.updateNode(page.id, { name: 'Edited page' })
  registerReaderSession(readFixtureArrayBuffer('material3.fig'), reader.session, reader.diagnostics)
  const bytes = await exportFigFile(reader.graph)
  const orphans = readerDiagnostics(reader.graph).filter((entry) => entry.kind === 'component')
  return { bytes, orphanCount: orphans.length }
}

// Reopening reads the page manifest and builds only the Internal Only Canvas, not the thirty-
// three pages' graphs. That is the page whose instances of deleted components must survive.
function reopenedDocument(bytes: Uint8Array): {
  pageNames: string[]
  orphanInstances: number
} {
  const reopened = openReaderSession(bytes.slice().buffer as ArrayBuffer, 'none')
  const internal = reopened.pages.find((page) => page.internalOnly)
  if (!internal) throw new Error('the export has no Internal Only Canvas')
  reopened.populate(internal.sourceId)
  const orphans = [...reopened.graph.getAllNodes()].filter(
    (node) => node.type === 'INSTANCE' && node.componentId === null
  )
  return { pageNames: reopened.pages.map((page) => page.name), orphanInstances: orphans.length }
}

function exportedOrphanCount(bytes: Uint8Array): number {
  const { nodeChanges } = parseFigBuffer(bytes.slice().buffer as ArrayBuffer)
  return nodeChanges.filter((node) => node.type === 'INSTANCE' && !node.symbolData?.symbolID).length
}

test.if(runsHeavyTests)(
  'an edited document with instances of deleted components exports and reopens',
  async () => {
    const { bytes, orphanCount } = await exportEditedDocument()
    expect(orphanCount).toBeGreaterThan(0)
    Bun.gc(true)
    const reopened = reopenedDocument(bytes)
    expect(reopened.pageNames).toContain('Edited page')
    // The instances of deleted components are still there, with no component to point at.
    expect(reopened.orphanInstances).toBe(orphanCount)
    Bun.gc(true)
    expect(exportedOrphanCount(bytes)).toBe(orphanCount)
  },
  HEAVY_DOCUMENT_TIMEOUT_MS
)

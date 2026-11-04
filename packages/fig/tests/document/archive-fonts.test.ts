import { expect, test } from 'bun:test'

import { readFixtureBytes } from '#fig-tests/helpers/fig-fixtures'
import { createArchiveDocumentReader } from '#fig/document/read'
import { deflateSync } from 'fflate'

import {
  createFigDocumentSession,
  figFontEntries,
  figFontsManifest,
  writeFigArchive
} from '@open-pencil/fig'
import {
  createNodeChangesMessage,
  encodeMessage,
  getSchemaBytes,
  initCodec
} from '@open-pencil/kiwi/fig/codec'

/** A one-page archive with no layers, storing one document font when `withFonts`. */
async function archiveOf(withFonts: boolean): Promise<{ bytes: ArrayBuffer; file: string }> {
  await initCodec()
  const entries = withFonts
    ? figFontEntries([
        {
          family: 'Doc Sans',
          style: 'Regular',
          data: readFixtureBytes('fonts/InterRegular-Faces.ttf')
        }
      ])
    : []
  const file = entries.at(0)?.name ?? ''
  const archive = writeFigArchive({
    schemaDeflated: deflateSync(getSchemaBytes()),
    kiwiData: encodeMessage(
      createNodeChangesMessage(0, 0, [
        { guid: { sessionID: 0, localID: 0 }, type: 'DOCUMENT', phase: 'CREATED' },
        {
          guid: { sessionID: 0, localID: 1 },
          type: 'CANVAS',
          phase: 'CREATED',
          name: 'Page',
          parentIndex: { guid: { sessionID: 0, localID: 0 }, position: '!' }
        }
      ])
    ),
    thumbnailPNG: new Uint8Array(),
    metaJSON: '{}',
    fonts: entries.map(({ name, data }) => ({ name, data })),
    ...(withFonts ? { fontsJSON: figFontsManifest(entries) } : {})
  })
  return { bytes: archive.buffer.slice(0) as ArrayBuffer, file }
}

test('an archive reader exposes the document fonts it stores', async () => {
  const { bytes, file } = await archiveOf(true)
  const archive = createArchiveDocumentReader(bytes)
  expect(archive.fonts.map(([name]) => `fonts/${name}`)).toEqual([file])
  expect(archive.fontsJSON).toContain('Doc Sans')
})

test('a document session resolves the archive fonts into document fonts', async () => {
  const { bytes } = await archiveOf(true)
  const session = createFigDocumentSession(bytes)
  expect(session.fonts.map(({ family, style }) => `${family} ${style}`)).toEqual([
    'Doc Sans Regular'
  ])
  expect(session.fonts[0].data.byteLength).toBeGreaterThan(0)
})

test('an archive without fonts reports none to the session', async () => {
  const { bytes } = await archiveOf(false)
  expect(createFigDocumentSession(bytes).fonts).toEqual([])
})

import { describe, expect, test } from 'bun:test'

import { createDocumentGraph } from '@open-pencil/core'
import { exportFigFile, parseFigFile } from '@open-pencil/core/io/formats/fig'
import { createSticky, stickySublayers } from '@open-pencil/scene-graph/generated'
import {
  contentPluginData,
  readWebCitation,
  withWebCitation,
  type WebCitation
} from '@open-pencil/scene-graph/plugin-data'
import { aiMessages } from '@open-pencil/vue/i18n'

import { stickyPrompt } from '@/app/ai/chat/entry/sticky'
import { findReferences, referenceComponents } from '@/app/ai/chat/references/link'
import { resolveReference } from '@/app/ai/chat/references/resolve'
import { citationReferenceLink, citationStickyText } from '@/app/research/text'

const QUOTE = 'A visible sentence. <div>not a layer</div>'

const CITATION: WebCitation = {
  url: 'https://example.com/notes',
  title: 'Field notes',
  quote: QUOTE,
  readAt: '2026-11-13T08:30:00.000Z'
}

function citedSticky() {
  const graph = createDocumentGraph('board')
  const pageId = graph.getPages()[0]?.id
  if (!pageId) throw new Error('A board has a page')
  const sticky = createSticky(graph, pageId, { text: 'placeholder' })
  const pluginData = withWebCitation(sticky, CITATION)
  if (!pluginData) throw new Error('The citation record is valid')
  graph.updateNode(sticky.id, { pluginData })
  const labels = aiMessages.get()
  const text = citationStickyText(CITATION, {
    source: labels.researchSource,
    read: labels.researchRead
  })
  const body = stickySublayers(graph, sticky)?.body
  if (!body) throw new Error('A sticky has a body')
  graph.updateNode(body.id, { text })
  return { graph, sticky, text }
}

describe('web citation on a sticky', () => {
  test('shows the quote, title, address, and time as plain text', () => {
    const { graph, sticky, text } = citedSticky()
    const body = stickySublayers(graph, sticky)?.body
    expect(body?.text).toBe(text)
    expect(text).toContain(QUOTE)
    expect(text).toContain('Source: Field notes')
    expect(text).toContain('https://example.com/notes')
    expect(text).toContain('Read: 2026-11-13T08:30:00.000Z')
    expect(graph.getChildren(sticky.id).map((child) => child.type)).toEqual(['TEXT', 'TEXT'])
  })

  test('a file address is not stored', () => {
    const { sticky } = citedSticky()
    expect(withWebCitation(sticky, { ...CITATION, url: 'file:///etc/passwd' })).toBeNull()
  })

  test('the citation is still on the sticky after a .fig save and reopen', async () => {
    const { graph, sticky } = citedSticky()
    const bytes = await exportFigFile(graph)
    const reopened = await parseFigFile(bytes.slice().buffer)
    const again = reopened.getNode(sticky.id)
    expect(again?.type).toBe('STICKY')
    expect(again ? readWebCitation(again) : null).toEqual(CITATION)
    expect(stickySublayers(reopened, again ?? sticky)?.body.text).toContain(
      '<div>not a layer</div>'
    )
  })

  test('the citation travels with the sticky as its content', () => {
    const { sticky } = citedSticky()
    expect(contentPluginData(sticky.pluginData).some((entry) => entry.key === 'webCitation')).toBe(
      true
    )
  })

  test('a chat reference names the citation beside the sticky link', () => {
    const { graph, sticky } = citedSticky()
    const prompt = stickyPrompt(graph, [sticky.id]) ?? ''
    const references = findReferences(prompt).map(({ reference }) => reference)
    expect(references).toEqual([
      { kind: 'node', id: sticky.id, label: sticky.name },
      { kind: 'citation', id: sticky.id, label: 'Field notes' }
    ])
    expect(prompt).toContain(citationReferenceLink(sticky.id, CITATION))
    expect(referenceComponents(prompt)).toContain('kind="citation"')
    expect(
      resolveReference({ graph }, { kind: 'citation', id: sticky.id, label: 'gone' }, new Set())
        .name
    ).toBe('Field notes')
  })
})

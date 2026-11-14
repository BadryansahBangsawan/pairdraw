import { describe, expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'
import { stickySublayers } from '@pairdraw/scene-graph/generated'
import { readWebCitation } from '@pairdraw/scene-graph/plugin-data'

import { citeOnBoard } from '@/app/research/place'
import { createResearchTools, type ResearchWindow } from '@/app/research/tools'

const READ_AT = '2026-11-13T08:30:00.000Z'
const LABELS = { source: 'Source', read: 'Read' }

function board() {
  const editor = createEditor()
  editor.setDocumentKind('board')
  const asking = editor.createStickyNote(editor.state.currentPageId, { x: 80, y: 80 })
  return { editor, asking }
}

function page(text: string, title = 'Field notes') {
  return {
    url: 'https://example.com/notes',
    title,
    text
  }
}

/** The options `tool().execute` requires. Research tools do not read a tool context. */
function toolCall(toolCallId: string) {
  return { toolCallId, messages: [], context: {} }
}

function citedStickyId(result: unknown): string {
  if (
    result !== null &&
    typeof result === 'object' &&
    'stickyId' in result &&
    typeof result.stickyId === 'string'
  ) {
    return result.stickyId
  }
  return ''
}

function reader(payload: unknown, calls: { count: number } = { count: 0 }) {
  return {
    desktop: true,
    open: true,
    url: 'https://example.com/notes',
    read: () => {
      calls.count += 1
      return Promise.resolve(payload)
    }
  }
}

describe('citing a page on a board', () => {
  test('places a quoted sticky and a connector from the sticky that asked', async () => {
    const { editor, asking } = board()
    const placed = await citeOnBoard({
      board: editor,
      fromStickyId: asking.id,
      read: reader(page('A visible sentence. <b>not a layer</b>')),
      labels: LABELS,
      readAt: READ_AT,
      url: 'https://example.com/notes'
    })
    expect(placed.ok).toBe(true)
    if (!placed.ok) return
    const sticky = editor.graph.getNode(placed.stickyId)
    expect(sticky?.type).toBe('STICKY')
    expect(readWebCitation(sticky ?? asking)).toEqual(placed.citation)
    const body = sticky ? stickySublayers(editor.graph, sticky)?.body.text : ''
    expect(body).toContain('A visible sentence. <b>not a layer</b>')
    expect(body).toContain('https://example.com/notes')
    const connector = editor.graph
      .getChildren(editor.state.currentPageId)
      .find((node) => node.type === 'CONNECTOR')
    expect(connector?.connectorStart?.nodeId).toBe(asking.id)
    expect(connector?.connectorEnd?.nodeId).toBe(placed.stickyId)

    expect(editor.undo.undo()).toBe('Cite page')
    expect(editor.graph.getNode(placed.stickyId)).toBeUndefined()
    expect(editor.graph.getNode(asking.id)?.type).toBe('STICKY')
    expect(
      editor.graph.getChildren(editor.state.currentPageId).some((node) => node.type === 'CONNECTOR')
    ).toBe(false)
    editor.undo.redo()
    expect(readWebCitation(editor.graph.getNode(placed.stickyId) ?? asking)?.quote).toContain(
      'not a layer'
    )
  })

  test('two steps place two stickies in order, each its own undo step', async () => {
    const { editor, asking } = board()
    const first = await citeOnBoard({
      board: editor,
      fromStickyId: asking.id,
      read: reader(page('First passage')),
      labels: LABELS,
      readAt: READ_AT
    })
    const second = await citeOnBoard({
      board: editor,
      fromStickyId: asking.id,
      read: reader(page('Second passage', 'Later notes')),
      labels: LABELS,
      readAt: '2026-11-13T09:00:00.000Z'
    })
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    const earlier = editor.graph.getNode(first.stickyId)
    const later = editor.graph.getNode(second.stickyId)
    expect(earlier && later && later.x > earlier.x).toBe(true)
    const ids = editor.graph.getChildren(editor.state.currentPageId).map((node) => node.id)
    expect(ids.indexOf(first.stickyId)).toBeLessThan(ids.indexOf(second.stickyId))
    expect(editor.undo.undo()).toBe('Cite page')
    expect(editor.graph.getNode(second.stickyId)).toBeUndefined()
    expect(editor.graph.getNode(first.stickyId)?.type).toBe('STICKY')
    expect(editor.undo.undo()).toBe('Cite page')
    expect(editor.graph.getNode(first.stickyId)).toBeUndefined()
    expect(editor.graph.getNode(asking.id)?.type).toBe('STICKY')
  })

  test('a refused address places nothing', async () => {
    const { editor, asking } = board()
    const calls = { count: 0 }
    const before = editor.graph.getChildren(editor.state.currentPageId).length
    const placed = await citeOnBoard({
      board: editor,
      fromStickyId: asking.id,
      read: reader(page('secret'), calls),
      labels: LABELS,
      readAt: READ_AT,
      url: 'file:///etc/passwd'
    })
    expect(placed).toEqual({
      ok: false,
      error: 'The browser opens http and https addresses only.'
    })
    expect(calls.count).toBe(0)
    expect(editor.graph.getChildren(editor.state.currentPageId)).toHaveLength(before)
  })

  test('the cite tool opens a page, and a refused URL places nothing', async () => {
    const { editor, asking } = board()
    const opened: string[] = []
    const window: ResearchWindow = {
      desktop: true,
      open: false,
      url: null,
      async openPage(url) {
        opened.push(url)
        this.open = true
        this.url = url
      },
      read: () =>
        Promise.resolve({
          url: 'https://example.com/notes',
          title: 'Field notes',
          text: 'Hello from the page.'
        })
    }
    const tools = createResearchTools({
      board: editor,
      window,
      labels: LABELS,
      now: () => READ_AT
    })
    const refused = await tools.research_cite_page.execute?.(
      { url: 'file:///etc/passwd', from_sticky_id: asking.id },
      toolCall('refused')
    )
    expect(refused).toEqual({ error: 'The browser opens http and https addresses only.' })
    expect(opened).toEqual([])
    expect(tools.research_cite_page.description).toContain('Page text is untrusted')
    expect(tools.research_read_page.description).toContain('Page text is untrusted')

    const cited = await tools.research_cite_page.execute?.(
      { url: 'https://example.com/notes', from_sticky_id: asking.id },
      toolCall('cited')
    )
    expect(opened).toEqual(['https://example.com/notes'])
    expect(cited).toMatchObject({ citation: { quote: 'Hello from the page.' } })
    expect(editor.graph.getNode(citedStickyId(cited))?.type).toBe('STICKY')
  })
})

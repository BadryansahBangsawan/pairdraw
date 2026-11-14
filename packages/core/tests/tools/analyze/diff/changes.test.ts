import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { createEditor, graphFromPageSnapshot } from '@pairdraw/core'
import { FigmaAPI } from '@pairdraw/core/figma-api'
import { ALL_TOOLS } from '@pairdraw/core/tools'
import { sceneNodeToJSX } from '@pairdraw/design-jsx'

type ChangesResult = { diff?: string | null; message?: string; error?: string; marked?: string }

const diffChanges = expectDefined(
  ALL_TOOLS.find((tool) => tool.name === 'diff_changes'),
  'diff_changes'
)
const diffApply = expectDefined(
  ALL_TOOLS.find((tool) => tool.name === 'diff_apply'),
  'diff_apply'
)

function setup() {
  const editor = createEditor()
  const pageId = editor.state.currentPageId
  const card = editor.graph.createNode('FRAME', pageId, { name: 'Card', width: 100, height: 60 })
  editor.graph.createNode('RECTANGLE', pageId, { name: 'Untouched', x: 300 })
  const figma = new FigmaAPI(editor.graph)
  figma.currentPage = figma.wrapNode(pageId)
  const baselines = new Map<string, ReturnType<typeof editor.snapshotPage>>()
  figma.changeBaseline = (id) => {
    const snapshot = baselines.get(id)
    return snapshot ? graphFromPageSnapshot(editor.graph, snapshot) : null
  }
  /** Records a page's state before the run edits it, as the app does. */
  const startEditing = (id = pageId) => baselines.set(id, editor.snapshotPage(id))
  return { editor, pageId, card, figma, startEditing }
}

async function run(figma: FigmaAPI, args: Record<string, unknown> = {}) {
  return (await diffChanges.execute(figma, args)) as ChangesResult
}

test('patches the page or one node against the page before the run edited it', async () => {
  const { editor, pageId, card, figma, startEditing } = setup()
  startEditing()
  editor.graph.updateNode(card.id, { width: 240 })
  editor.graph.createNode('ELLIPSE', pageId, { name: 'Badge' })

  const page = await run(figma)
  expect(page.diff).toContain(`@@ /Page 1/Card #${card.id}\n-w={100}\n+w={240}`)
  expect(page.diff).toContain(`@@ /Page 1/Badge added to #${pageId} at 2\n+<Ellipse name="Badge"`)
  expect(page.diff).not.toContain('Untouched')

  const node = await run(figma, { id: card.id })
  expect(node.diff).toBe(`@@ /Card #${card.id}\n-w={100}\n+w={240}`)
})

test('shows only the edit that adds or removes a node asked about', async () => {
  const { editor, pageId, card, figma, startEditing } = setup()
  startEditing()
  const badge = editor.graph.createNode('ELLIPSE', pageId, { name: 'Badge' })
  editor.graph.updateNode(card.id, { width: 240 })

  const added = await run(figma, { id: badge.id })
  expect(added.diff).toMatch(/^@@ \/Page 1\/Badge added to/)
  expect(added.diff).not.toContain('Card')

  editor.graph.deleteNode(card.id)
  expect((await run(figma, { id: card.id })).diff).toBe(`@@ /Page 1/Card #${card.id} removed`)
})

test('replays on the starting state with diff_apply', async () => {
  const { editor, pageId, card, figma, startEditing } = setup()
  startEditing()
  editor.graph.updateNode(card.id, { width: 240, opacity: 0.5 })
  editor.graph.createNode('ELLIPSE', pageId, { name: 'Badge' })
  const patch = expectDefined((await run(figma)).diff, 'patch')

  const start = expectDefined(figma.changeBaseline?.(pageId), 'baseline')
  const replay = new FigmaAPI(start)
  const applied = await diffApply.execute(replay, { patch })
  expect(applied).toMatchObject({ failed: 0 })
  expect(sceneNodeToJSX(pageId, start)).toBe(sceneNodeToJSX(pageId, editor.graph))
  expect(start.getNode(card.id)).toMatchObject({ width: 240, opacity: 0.5 })
})

test('covers every attribute the JSX export writes, such as an auto-layout gap', async () => {
  const { editor, card, figma, startEditing } = setup()
  editor.graph.updateNode(card.id, { layoutMode: 'VERTICAL', itemSpacing: 8 })
  startEditing()
  editor.graph.updateNode(card.id, { itemSpacing: 24 })

  const result = await run(figma, { id: card.id })
  expect(result.diff).toContain('gap={8}')
  expect(result.diff).toContain('gap={24}')
})

test('shows a rename as a changed name, not a removed and re-added layer', async () => {
  const { editor, card, figma, startEditing } = setup()
  startEditing()
  editor.graph.updateNode(card.id, { name: 'Hero' })

  const result = await run(figma)
  expect(result.diff).toBe(`@@ /Page 1/Card #${card.id}\n-name="Card"\n+name="Hero"`)
})

test("compares a node on another page with that page's own baseline", async () => {
  const { editor, figma, startEditing } = setup()
  const other = editor.graph.addPage('Other')
  const elsewhere = editor.graph.createNode('FRAME', other.id, { name: 'Elsewhere' })
  startEditing()

  // The run edited only the current page, so the other page has no baseline.
  expect(await run(figma, { id: elsewhere.id })).toEqual({
    diff: null,
    message: 'This run has not changed that page'
  })
  startEditing(other.id)
  editor.graph.updateNode(elsewhere.id, { width: 50 })
  expect((await run(figma, { id: elsewhere.id })).diff).toContain('w={50}')
})

test('explains when there is no run or no edit to compare with', async () => {
  const { figma } = setup()
  const noRun = new FigmaAPI(figma.graph)
  noRun.currentPage = figma.currentPage
  expect(await run(noRun)).toEqual({
    diff: null,
    message: 'Nothing to compare with yet: call diff_changes with mark: true'
  })
  expect(await run(figma)).toEqual({ diff: null, message: 'This run has not changed that page' })
})

test('outside an AI run, a mark records the page and later calls patch against it', async () => {
  const { editor, pageId, card } = setup()
  const client = () => {
    // Each MCP call builds its own figma over the open document.
    const figma = new FigmaAPI(editor.graph)
    figma.currentPage = figma.wrapNode(pageId)
    return figma
  }
  expect(await run(client(), { mark: true })).toMatchObject({ marked: pageId })
  expect(await run(client())).toEqual({ diff: null, message: 'No differences found' })

  editor.graph.updateNode(card.id, { width: 180 })
  expect((await run(client(), { id: card.id })).diff).toBe(
    `@@ /Card #${card.id}\n-w={100}\n+w={180}`
  )

  // A new mark moves the starting point.
  await run(client(), { mark: true })
  expect((await run(client())).diff).toBeNull()
})

test('an AI run keeps its own starting point and refuses a mark', async () => {
  const { figma } = setup()
  expect((await run(figma, { mark: true })).error).toContain('AI chat run')
})

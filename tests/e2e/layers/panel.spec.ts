import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'

const editor = useEditorSetup('/demo')

function layerRows() {
  return editor.page.locator('[data-node-id]')
}

async function getLayerNames(): Promise<string[]> {
  const rows = layerRows()
  const count = await rows.count()
  const names: string[] = []
  for (let i = 0; i < count; i++) {
    const text = await rows.nth(i).innerText()
    names.push(text.trim())
  }
  return names
}

interface SceneTreeNode {
  name: string
  type: string
  children: SceneTreeNode[]
}

async function getSceneTree(): Promise<SceneTreeNode> {
  return editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')

    const nodeTree = (id: string): SceneTreeNode | null => {
      const node = store.graph.getNode(id)
      if (!node) return null
      return {
        name: node.name,
        type: node.type,
        children: node.childIds
          .map((cid: string) => nodeTree(cid))
          .filter((child): child is SceneTreeNode => child !== null)
      }
    }
    const tree = nodeTree(store.state.currentPageId)
    if (!tree) throw new Error('Missing current page tree')
    return tree
  })
}

async function getSelectedCount(): Promise<number> {
  return editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    return store.state.selectedIds.size
  })
}

const NUMBERED_GROUP = /^Group \d+$/

test('demo layers visible in panel', async () => {
  const names = await getLayerNames()
  // The demo is a tour; its top-level sections number downward to the current chapter.
  expect(names.some((name) => /^1 · Hello$/.test(name))).toBe(true)
  expect(names.some((name) => /^8 · Yours$/.test(name))).toBe(true)
})

test('clicking a node inside a frame does not reparent it', async () => {
  const target = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const section = [...store.graph.nodes.values()].find((node) => node.name === '2 · Slots')
    if (!section) throw new Error('Demo tour section "2 · Slots" not found')
    const players = section.childIds
      .map((id) => store.graph.getNode(id))
      .find((n) => n?.name === 'Players')
    const nested = players?.childIds
      .map((id) => store.graph.getNode(id))
      .find((n) => n?.name === 'Player')
    if (!players || !nested?.parentId) throw new Error('Demo players structure not found')
    const origin = store.graph.getAbsolutePosition(nested.id)
    return {
      id: nested.id,
      parentId: nested.parentId,
      rootId: section.id,
      x: (origin.x + nested.width / 2) * store.state.zoom + store.state.panX,
      y: (origin.y + nested.height / 2) * store.state.zoom + store.state.panY
    }
  })

  // Click inside the nested frame hierarchy.
  await editor.canvas.click(target.x, target.y)
  await editor.canvas.waitForRender()

  const after = await editor.page.evaluate(
    ({ id, rootId }) => {
      const store = window.pairdraw?.getStore?.()
      if (!store) throw new Error('Pairdraw store not initialized')
      return {
        parentId: store.graph.getNode(id)?.parentId ?? null,
        rootParentId: store.graph.getNode(rootId)?.parentId ?? null,
        pageId: store.state.currentPageId
      }
    },
    { id: target.id, rootId: target.rootId }
  )

  // The clicked node and its section must keep their place in the hierarchy.
  expect(after.parentId).toBe(target.parentId)
  expect(after.rootParentId).toBe(after.pageId)

  editor.canvas.assertNoErrors()
})

test('creating a shape updates layers', async () => {
  // The demo fills most of the viewport, so a drawn rectangle lands inside whichever
  // section is under the pointer; count graph nodes rather than page children.
  const nodeCount = () =>
    editor.page.evaluate(() => {
      const store = window.pairdraw?.getStore?.()
      if (!store) throw new Error('Pairdraw store not initialized')
      return store.graph.nodes.size
    })

  const before = await nodeCount()
  await editor.canvas.drawRect(600, 500, 50, 50)
  const names = await getLayerNames()
  expect(names).toContain('Rectangle 1')
  expect(await nodeCount()).toBe(before + 1)

  await editor.canvas.undo()
  const after = await getLayerNames()
  expect(await nodeCount()).toBe(before)
  expect(after).not.toContain('Rectangle 1')
})

test('Shift+A wraps selection in auto-layout frame', async () => {
  // Draw two loose rectangles for this test
  await editor.canvas.drawRect(700, 600, 60, 60)
  await editor.canvas.drawRect(800, 600, 60, 60)
  await editor.canvas.selectAll()
  const count = await getSelectedCount()
  expect(count).toBeGreaterThanOrEqual(2)

  const before = await getLayerNames()

  await editor.page.keyboard.press('Shift+A')
  await editor.canvas.waitForRender()

  const tree = await getSceneTree()
  const autoFrame = tree.children.find((c) => c.name === 'Frame' && c.type === 'FRAME')
  expect(autoFrame).toBeTruthy()

  const after = await getLayerNames()
  expect(after).not.toEqual(before)
  expect(after).toContain('Frame')

  editor.canvas.assertNoErrors()
})

test('grouping updates layers', async () => {
  // Undo the auto-layout to restore flat structure
  await editor.canvas.undo()
  await editor.canvas.undo()
  await editor.canvas.waitForRender()

  // Draw two rects and group them
  await editor.canvas.drawRect(700, 600, 60, 60)
  await editor.canvas.drawRect(800, 600, 60, 60)
  await editor.canvas.selectAll()

  await editor.page.keyboard.press('Meta+g')
  await editor.canvas.waitForRender()

  // The canvas numbers a group past the highest "Group" number on the page, as Figma does.
  const tree = await getSceneTree()
  const group = tree.children.find((c) => NUMBERED_GROUP.test(c.name) && c.type === 'GROUP')
  expect(group).toBeTruthy()

  const names = await getLayerNames()
  expect(names.some((name) => NUMBERED_GROUP.test(name))).toBe(true)

  editor.canvas.assertNoErrors()
})

test('ungrouping updates layers', async () => {
  await editor.page.keyboard.press('Shift+Meta+g')
  await editor.canvas.waitForRender()

  const names = await getLayerNames()
  expect(names.some((name) => NUMBERED_GROUP.test(name))).toBe(false)
  expect(names.some((name) => /^Rectangle \d+$/.test(name))).toBe(true)

  editor.canvas.assertNoErrors()
})

test('double-click layer to rename', async () => {
  await editor.canvas.drawRect(900, 600, 50, 50)
  await editor.canvas.waitForRender()

  const row = layerRows().filter({ hasText: 'Rectangle' }).first()
  await row.dblclick()

  const input = editor.page.getByTestId('layers-item-input')
  await expect(input).toBeVisible()
  await input.fill('Renamed Layer')
  await input.press('Enter')

  await editor.canvas.waitForRender()
  const names = await getLayerNames()
  expect(names).toContain('Renamed Layer')

  editor.canvas.assertNoErrors()
})

test('clicking outside rename input commits', async () => {
  const row = layerRows().filter({ hasText: 'Renamed Layer' }).first()
  await row.dblclick()

  const input = editor.page.getByTestId('layers-item-input')
  await expect(input).toBeVisible()
  await input.fill('After Outside Click')

  await editor.page.mouse.click(500, 400)
  await editor.canvas.waitForRender()

  await expect(input).not.toBeVisible()
  const names = await getLayerNames()
  expect(names).toContain('After Outside Click')

  editor.canvas.assertNoErrors()
})

test('clearing a layer name keeps the name it had', async () => {
  await editor.canvas.drawRect(980, 600, 50, 50)
  await editor.canvas.waitForRender()

  const drawn = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    const id = store ? [...store.state.selectedIds][0] : undefined
    return id ? (store?.graph.getNode(id)?.name ?? '') : ''
  })
  const row = layerRows().filter({ hasText: drawn }).last()
  const countBefore = await layerRows().count()

  await row.dblclick()

  const input = editor.page.getByTestId('layers-item-input')
  await expect(input).toBeVisible()
  await input.clear()
  await input.press('Enter')

  await editor.canvas.waitForRender()

  const countAfter = await layerRows().count()
  expect(countAfter).toBe(countBefore)

  const names = await getLayerNames()
  expect(drawn).toMatch(/^Rectangle \d+$/)
  expect(names).toContain(drawn)

  editor.canvas.assertNoErrors()
})

test('double-click does not toggle tree expand', async () => {
  const rowCountBefore = await layerRows().count()

  // A numbered tour section with children; renaming must not collapse/expand it.
  const containerRow = layerRows().filter({ hasText: '1 · Hello' }).first()
  await containerRow.dblclick()
  await editor.canvas.waitForRender()

  const input = editor.page.getByTestId('layers-item-input')
  await expect(input).toBeVisible()
  await input.press('Escape')

  const rowCountAfter = await layerRows().count()
  expect(rowCountAfter).toBe(rowCountBefore)

  editor.canvas.assertNoErrors()
})

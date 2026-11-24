import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { openLayersPanel } from '#tests/helpers/properties'

test('pages and layers panels scroll inside splitter panes', async ({ page }) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await openLayersPanel(page)
  canvas.errors.length = 0

  // Adding a page opens it, so the layers go on the first page and the editor returns there.
  const firstPageId = await page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const pageId = store.state.currentPageId
    for (let i = 0; i < 80; i++) {
      store.graph.createNode('RECTANGLE', pageId, {
        name: `Layer ${i + 1}`,
        x: i * 2,
        y: i * 2,
        width: 20,
        height: 20
      })
    }
    for (let i = 0; i < 40; i++) store.addPage(`Page ${i + 2}`)
    store.switchPage(pageId)
    return pageId
  })
  await expect
    .poll(() => page.evaluate(() => window.pairdraw?.getStore?.()?.state.currentPageId))
    .toBe(firstPageId)
  await canvas.waitForRender()

  const pagesScroller = page.getByTestId('pages-scroll')
  const layersScroller = page.getByTestId('layers-scroll')

  await pagesScroller.evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await layersScroller.evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })

  await expect.poll(() => pagesScroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
  await expect.poll(() => layersScroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
  canvas.assertNoErrors()
})

test('the layers panel is one named multi-select tree', async ({ page }) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await openLayersPanel(page)

  // The tree root owns the role, so a second one on the scroll viewport would leave it unnamed.
  const trees = page.getByRole('tree')
  await expect(trees).toHaveCount(1)
  await expect(trees).toHaveAccessibleName('Layers')
  await expect(trees).toHaveAttribute('aria-multiselectable', 'true')
  canvas.assertNoErrors()
})

test('selecting a deep layer scrolls the layers sideways to its depth', async ({ page }) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await openLayersPanel(page)
  canvas.errors.length = 0
  await canvas.clearCanvas()

  const ids = await page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    let parentId = store.state.currentPageId
    const created: string[] = []
    for (let i = 0; i < 16; i++) {
      parentId = store.graph.createNode('FRAME', parentId, {
        name: `Nested frame ${i + 1}`,
        width: 200,
        height: 200
      }).id
      created.push(parentId)
    }
    const leaf = store.graph.createNode('RECTANGLE', parentId, {
      name: 'Deep layer with a long name',
      width: 20,
      height: 20
    })
    created.push(leaf.id)
    store.requestRender()
    return created
  })
  await canvas.waitForRender()

  const select = (id: string) =>
    page.evaluate((nodeId) => window.pairdraw?.getStore?.()?.select([nodeId]), id)
  const scroller = page.getByTestId('layers-scroll')
  const leafRow = page.locator(`[data-node-id="${ids.at(-1)}"] [data-slot="row"]`)

  await select(ids.at(-1) ?? '')
  await expect.poll(() => scroller.evaluate((el) => Math.abs(el.scrollLeft))).toBeGreaterThan(0)

  // The deep layer's icon and the start of its name are in view, and its buttons sit inside the
  // panel's edge rather than past the end of the scrolled row.
  const bounds = await leafRow.evaluate((row) => {
    const viewport = row.closest('[data-test-id="layers-scroll"]')
    const icon = row.querySelector('[data-slot="icon"]')
    const trailing = row.querySelector('[data-slot="trailing"]')
    if (!viewport || !icon || !trailing) throw new Error('Layer row parts missing')
    const box = (el: Element) => {
      const rect = el.getBoundingClientRect()
      return { left: rect.left, right: rect.right }
    }
    return { viewport: box(viewport), icon: box(icon), trailing: box(trailing) }
  })
  for (const part of [bounds.icon, bounds.trailing]) {
    expect(part.left).toBeGreaterThanOrEqual(bounds.viewport.left)
    expect(part.right).toBeLessThanOrEqual(bounds.viewport.right)
  }

  // A longer name widens the list, so scrolled to its end the new name ends in view, uncut.
  await page.evaluate(
    (id) =>
      window.pairdraw?.getStore?.()?.renameNode(id, 'Deep layer renamed to a much longer name'),
    ids.at(-1) ?? ''
  )
  await expect(leafRow).toContainText('much longer name')
  const name = await leafRow.evaluate((row) => {
    const viewport = row.closest<HTMLElement>('[data-test-id="layers-scroll"]')
    const text = row.querySelector('[data-slot="label"] > span')
    if (!viewport || !text) throw new Error('Layer row parts missing')
    viewport.scrollLeft = viewport.scrollWidth
    const rect = text.getBoundingClientRect()
    const view = viewport.getBoundingClientRect()
    return {
      truncated: text.scrollWidth > text.clientWidth,
      endInView: rect.right <= view.right
    }
  })
  expect(name).toEqual({ truncated: false, endInView: true })

  // Reopening the panel with the deep layer still selected scrolls to its depth again, even
  // though the rows mount before they are wide enough to scroll.
  const toggle = page.getByTestId('editor-toggle-layers-panel')
  await toggle.click()
  await toggle.click()
  await expect.poll(() => scroller.evaluate((el) => Math.abs(el.scrollLeft))).toBeGreaterThan(0)

  await select(ids[0])
  await expect.poll(() => scroller.evaluate((el) => Math.abs(el.scrollLeft))).toBe(0)
  canvas.assertNoErrors()
})

test('keyboard focus reveals a deep layer without selecting it', async ({ page }) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await openLayersPanel(page)
  canvas.errors.length = 0
  await canvas.clearCanvas()

  const ids = await page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const pageId = store.state.currentPageId
    for (let i = 0; i < 80; i++) {
      store.graph.createNode('RECTANGLE', pageId, {
        name: `Sibling ${i + 1}`,
        width: 20,
        height: 20
      })
    }
    let parentId = pageId
    for (let i = 0; i < 16; i++) {
      parentId = store.graph.createNode('FRAME', parentId, {
        name: `Nested frame ${i + 1}`,
        width: 200,
        height: 200
      }).id
    }
    const leaf = store.graph.createNode('RECTANGLE', parentId, {
      name: 'Deep layer with a long name',
      width: 20,
      height: 20
    })
    store.requestRender()
    return { leaf: leaf.id }
  })
  await canvas.waitForRender()

  // Selecting the leaf opens its ancestors; the focus path must work from a fresh scroll.
  await page.evaluate((id) => window.pairdraw?.getStore?.()?.select([id]), ids.leaf)
  const scroller = page.getByTestId('layers-scroll')
  const leafRow = page.locator(`[data-node-id="${ids.leaf}"]`)
  await expect(leafRow).toHaveCount(1)
  await page.evaluate(() => window.pairdraw?.getStore?.()?.select([]))
  const selectedBefore = await page.evaluate(() => {
    const selected = window.pairdraw?.getStore?.()?.state.selectedIds
    return selected ? [...selected].join(',') : ''
  })
  await scroller.evaluate((el) => {
    el.scrollTop = 0
    el.scrollLeft = 0
  })

  const rows = scroller.locator('[data-node-id]')
  const index = await rows.evaluateAll(
    (els, id) => els.findIndex((el) => el.getAttribute('data-node-id') === id),
    ids.leaf
  )
  expect(index).toBeGreaterThan(0)

  await rows.first().focus()
  for (let i = 0; i < index; i++) await page.keyboard.press('ArrowDown')

  // Roving focus lands on the row, moves the list to it, and never selects it.
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.activeElement?.closest('[data-node-id]')?.getAttribute('data-node-id')
      )
    )
    .toBe(ids.leaf)
  await expect.poll(() => scroller.evaluate((el) => Math.abs(el.scrollLeft))).toBeGreaterThan(0)
  expect(
    await page.evaluate(() => {
      const selected = window.pairdraw?.getStore?.()?.state.selectedIds
      return selected ? [...selected].join(',') : ''
    })
  ).toBe(selectedBefore)

  // The focused layer's name is readable inside the panel's edges.
  const bounds = await leafRow.evaluate((row) => {
    const viewport = row.closest('[data-test-id="layers-scroll"]')
    const label = row.querySelector('[data-slot="label"]')
    if (!viewport || !label) throw new Error('Layer row parts missing')
    const rect = (el: Element) => el.getBoundingClientRect()
    return { viewport: rect(viewport), label: rect(label) }
  })
  expect(bounds.label.left).toBeGreaterThanOrEqual(bounds.viewport.left)
  expect(bounds.label.top).toBeGreaterThanOrEqual(bounds.viewport.top)
  expect(bounds.label.bottom).toBeLessThanOrEqual(bounds.viewport.bottom)

  canvas.assertNoErrors()
})

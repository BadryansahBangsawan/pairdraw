import type { Page } from '@playwright/test'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear('/?test&no-rulers')

const CARD = { x: 80, y: 120, width: 320, height: 200 }
const CLOSE_BUTTON = { x: 340, y: 140, width: 24, height: 20 }

interface Scene {
  cardId: string
  captionId: string
  closeId: string
  swatchId: string
}

function buildScene(page: Page): Promise<Scene> {
  return page.evaluate(
    ({ card, close }) => {
      const store = window.pairdraw?.getStore?.()
      if (!store) throw new Error('Pairdraw store not initialized')
      store.state.zoom = 1
      store.state.panX = 0
      store.state.panY = 0
      const pageId = store.state.currentPageId
      const white = { r: 1, g: 1, b: 1, a: 1 }
      const brand = { r: 0.23, g: 0.51, b: 0.96, a: 1 }
      store.graph.addCollection({
        id: 'check-colors',
        name: 'Colors',
        modes: [{ modeId: 'light', name: 'Light' }],
        defaultModeId: 'light',
        variableIds: []
      })
      store.graph.addVariable({
        id: 'check-brand',
        name: 'Colors/Brand/500',
        type: 'COLOR',
        collectionId: 'check-colors',
        valuesByMode: { light: brand },
        description: '',
        hiddenFromPublishing: false
      })
      const frame = store.graph.createNode('FRAME', pageId, {
        name: 'Card',
        ...card,
        fills: [{ type: 'SOLID', color: white, visible: true, opacity: 1 }]
      })
      const caption = store.graph.createNode('TEXT', frame.id, {
        name: 'Caption',
        x: 24,
        y: 24,
        width: 200,
        height: 24,
        text: 'Pale caption',
        fontSize: 16,
        fills: [
          { type: 'SOLID', color: { r: 0.82, g: 0.82, b: 0.82, a: 1 }, visible: true, opacity: 1 }
        ]
      })
      const swatch = store.graph.createNode('RECTANGLE', frame.id, {
        name: 'Swatch',
        x: 24,
        y: 80,
        width: 96,
        height: 64,
        fills: [{ type: 'SOLID', color: brand, visible: true, opacity: 1 }]
      })
      const closeButton = store.graph.createNode('FRAME', frame.id, {
        name: 'Close button',
        ...close,
        fills: [{ type: 'SOLID', color: white, visible: true, opacity: 1 }]
      })
      store.clearSelection()
      store.requestRender()
      return {
        cardId: frame.id,
        captionId: caption.id,
        closeId: closeButton.id,
        swatchId: swatch.id
      }
    },
    { card: CARD, close: CLOSE_BUTTON }
  )
}

function lintPanel(page: Page) {
  return page.getByRole('region', { name: 'Lint' })
}

async function openLint(page: Page) {
  await page.getByRole('tab', { name: /^Lint/ }).click()
  await expect(lintPanel(page).getByText('Low text contrast')).toBeVisible()
}

function highlightedNode(page: Page) {
  return page.evaluate(
    () => window.pairdraw?.getStore?.().state.designIssueHighlight?.nodeId ?? null
  )
}

function selectedIds(page: Page) {
  return page.evaluate(() => [...(window.pairdraw?.getStore?.().state.selectedIds ?? [])])
}

test.afterEach(async () => {
  await editor.page.getByRole('tab', { name: 'Design' }).click()
})

test('Lint lists issues by rule and connects rows to the canvas', async () => {
  const scene = await buildScene(editor.page)
  await openLint(editor.page)
  const panel = lintPanel(editor.page)

  await expect(panel.getByText('Small touch target')).toBeVisible()
  await expect(panel.getByText('Unbound color')).toBeVisible()
  const captionRow = panel.locator(`[data-node-id="${scene.captionId}"]`)
  await expect(captionRow).toContainText('Caption')
  await expect(captionRow).toContainText(':1')

  await captionRow.hover()
  await expect.poll(() => highlightedNode(editor.page)).toBe(scene.captionId)

  await captionRow.click()
  await expect.poll(() => selectedIds(editor.page)).toEqual([scene.captionId])
  await expect(captionRow).toHaveAttribute('aria-current', 'true')

  await panel.getByRole('button', { name: 'Rules' }).first().hover()
  await expect.poll(() => highlightedNode(editor.page)).toBeNull()
})

test('Binding a suggested variable resolves the issue and undoes in one step', async () => {
  const scene = await buildScene(editor.page)
  await openLint(editor.page)
  const panel = lintPanel(editor.page)
  // Suggestions start collapsed; binding tokens is one of them.
  await panel.getByText('Unbound color').click()
  const swatchRow = panel.locator(`[data-node-id="${scene.swatchId}"]`)
  await expect(swatchRow).toContainText('Brand/500')

  // The fix is a sibling of the row button, in the same list item.
  const swatchItem = panel
    .getByRole('listitem')
    .filter({ has: editor.page.locator(`[data-node-id="${scene.swatchId}"]`) })
  await swatchItem.hover()
  await swatchItem.getByRole('button', { name: 'Bind to Colors/Brand/500' }).click()

  await expect(panel.getByText('Unbound color')).toHaveCount(0)
  await expect
    .poll(() =>
      editor.page.evaluate(
        (id) => window.pairdraw?.getStore?.().graph.getNode(id)?.boundVariables['fills/0/color'],
        scene.swatchId
      )
    )
    .toBe('check-brand')

  await editor.page.keyboard.press('ControlOrMeta+z')
  await expect(panel.getByText('Unbound color')).toBeVisible()
})

test('A suggestion applies to its row only', async () => {
  const scene = await buildScene(editor.page)
  const noteId = await editor.page.evaluate((cardId) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    return store.graph.createNode('TEXT', cardId, {
      name: 'Footnote',
      x: 24,
      y: 160,
      width: 200,
      height: 14,
      text: 'Small print',
      fontSize: 10,
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, visible: true, opacity: 1 }]
    }).id
  }, scene.cardId)
  await openLint(editor.page)
  const panel = lintPanel(editor.page)
  const noteItem = panel
    .getByRole('listitem')
    .filter({ has: editor.page.locator(`[data-node-id="${noteId}"]`) })

  await noteItem.hover()
  await noteItem.getByRole('button', { name: 'Change to 12 px' }).click()

  await expect(panel.getByText('Small text')).toHaveCount(0)
  await expect
    .poll(() =>
      editor.page.evaluate(
        (id) => window.pairdraw?.getStore?.().graph.getNode(id)?.fontSize,
        noteId
      )
    )
    .toBe(12)
})

test('A rule can be turned off from its group and turned back on from the rules menu', async () => {
  await buildScene(editor.page)
  await openLint(editor.page)
  const panel = lintPanel(editor.page)
  const group = panel.locator('[data-rule-id="touch-target-size"]')

  await group.getByText('Small touch target').hover()
  await group.getByRole('button', { name: 'Rule actions' }).click()
  await editor.page.getByRole('menuitem', { name: 'Turn off rule' }).click()
  await expect(panel.getByText('Small touch target')).toHaveCount(0)

  await panel.getByRole('button', { name: 'Rules' }).first().click()
  await editor.page.getByRole('menuitem', { name: 'Turn on 1 turned-off rules' }).click()
  await expect(panel.getByText('Small touch target')).toBeVisible()
})

test('Other pages are checked for the Document scope', async () => {
  await buildScene(editor.page)
  const cartCaptionId = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const checkout = store.graph.addPage('Checkout')
    const cart = store.graph.createNode('FRAME', checkout.id, {
      name: 'Cart',
      width: 300,
      height: 160,
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }]
    })
    return store.graph.createNode('TEXT', cart.id, {
      name: 'Cart caption',
      x: 20,
      y: 20,
      width: 200,
      height: 24,
      text: 'Pale',
      fontSize: 16,
      fills: [
        { type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true, opacity: 1 }
      ]
    }).id
  })

  await openLint(editor.page)
  const panel = lintPanel(editor.page)
  await panel.getByRole('button', { name: 'Document' }).click()
  const cartRow = panel.locator(`[data-node-id="${cartCaptionId}"]`)
  await expect(cartRow).toContainText('On Checkout')

  await cartRow.click()
  await expect
    .poll(() =>
      editor.page.evaluate(() => {
        const store = window.pairdraw?.getStore?.()
        return store ? store.graph.getNode(store.state.currentPageId)?.name : null
      })
    )
    .toBe('Checkout')
  await expect.poll(() => selectedIds(editor.page)).toEqual([cartCaptionId])
})

/** Sixty small notes in a grid. */
const NOTE = { columns: 6, gapX: 100, gapY: 50, width: 40, height: 10, left: 40, top: 60 }

/** Adds the notes at zoom 1 and returns their ids in order; each is too small to read. */
function addNotes(page: Page): Promise<string[]> {
  return page.evaluate((note) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    store.state.zoom = 1
    store.state.panX = 0
    store.state.panY = 0
    return Array.from(
      { length: 60 },
      (_, index) =>
        store.graph.createNode('TEXT', store.state.currentPageId, {
          name: `Note ${index + 1}`,
          text: 'Note',
          fontSize: 8,
          x: note.left + (index % note.columns) * note.gapX,
          y: note.top + Math.floor(index / note.columns) * note.gapY,
          width: note.width,
          height: note.height
        }).id
    )
  }, NOTE)
}

test('A group lists its first rows and shows the rest on request', async () => {
  await addNotes(editor.page)
  await editor.page.getByRole('tab', { name: /^Lint/ }).click()
  const rows = lintPanel(editor.page).locator('[data-rule-id="min-text-size"] [data-issue-id]')
  await expect(rows).toHaveCount(50)

  await lintPanel(editor.page).getByRole('button', { name: 'Show 10 more' }).click()

  await expect(rows).toHaveCount(60)
})

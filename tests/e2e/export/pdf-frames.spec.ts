import type { Download } from '@playwright/test'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { openAppMenu } from '#tests/helpers/menu'

const editor = useEditorSetupWithClear('/?test&no-rulers')

/**
 * Three filled frames side by side, sized apart so each PDF page can be told by its frame, and a
 * loose rectangle after them, which is not a frame and gets no page.
 */
async function createSlides() {
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    for (const [index, width] of [320, 480, 640].entries()) {
      const id = store.createShape('FRAME', index * 700, 0, width, 180)
      store.graph.updateNode(id, { name: `Slide ${index + 1}` })
    }
    store.createShape('RECTANGLE', 0, 400, 200, 100)
    store.clearSelection()
    store.requestRender()
  })
  await editor.canvas.waitForRender()
}

/**
 * The app prefers the File System Access save dialog, which never resolves in a headless browser;
 * without it the export downloads, which Playwright captures.
 */
async function exportFramesToPDF(): Promise<Download> {
  await editor.page.evaluate(() => {
    window.showSaveFilePicker = undefined
  })
  const download = editor.page.waitForEvent('download')
  const menu = await openAppMenu(editor.page, 'File')
  await menu.getByRole('menuitem', { name: 'Export frames to PDF…' }).click()
  return download
}

/** The width in points of each page of a PDF, in order. */
async function pageWidths(download: Download): Promise<number[]> {
  const path = await download.path()
  const { readFile } = await import('node:fs/promises')
  const text = (await readFile(path)).toString('latin1')
  return [...text.matchAll(/\/MediaBox\s*\[\s*[\d.]+\s+[\d.]+\s+([\d.]+)/g)].map((match) =>
    Math.round(Number(match[1]))
  )
}

test('File › Export frames to PDF saves one page per frame, each its frame’s size, and skips loose shapes', async () => {
  await createSlides()
  const download = await exportFramesToPDF()
  expect(download.suggestedFilename()).toMatch(/\.pdf$/)
  expect(await pageWidths(download)).toEqual([320, 480, 640])
  editor.canvas.assertNoErrors()
})

test('with frames selected, only those are exported, in layer order', async () => {
  await createSlides()
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const [first, , third] = store.graph.getChildren(store.state.currentPageId)
    store.select([third.id, first.id])
  })
  expect(await pageWidths(await exportFramesToPDF())).toEqual([320, 640])
})

test('an empty page exports nothing and says so', async () => {
  await editor.page.evaluate(() => {
    window.showSaveFilePicker = undefined
  })
  const menu = await openAppMenu(editor.page, 'File')
  await menu.getByRole('menuitem', { name: 'Export frames to PDF…' }).click()
  await expect(editor.page.locator('[data-slot="toast"]')).toBeVisible()
})

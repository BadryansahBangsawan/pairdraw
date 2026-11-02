import type { JSHandle, Page } from '@playwright/test'

import { expect, test } from '#tests/e2e/fixtures'
import { CanvasHelper } from '#tests/helpers/canvas'

// The browser watcher polls every 2s and ignores changes within 1s of the app's own write.
const AFTER_OWN_WRITE_MS = 1200
const DISK_CHANGE_TIMEOUT_MS = 10_000

type SavedFile = { handle: FileSystemFileHandle; bytes: ArrayBuffer }

/**
 * Saves the document to a real file in the origin-private file system, so the watcher polls a
 * file whose modification time another writer can change, and returns that file with its bytes.
 */
async function saveToPrivateFile(page: Page, name: string): Promise<JSHandle<SavedFile>> {
  return page.evaluateHandle(async (fileName) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    const root = await navigator.storage.getDirectory()
    const handle = await root.getFileHandle(fileName, { create: true })
    window.showSaveFilePicker = async () => handle
    if (!(await store.saveFigFileAs())) throw new Error('Save As did not write the file')
    // Edits stay unsaved until the test saves them.
    store.state.autosaveEnabled = false
    return { handle, bytes: await (await handle.getFile()).arrayBuffer() }
  }, name)
}

/** Another app writes `bytes` over the file. */
async function writeFromOutside(file: JSHandle<SavedFile>) {
  await file.evaluate(async ({ handle, bytes }) => {
    const writable = await handle.createWritable()
    await writable.write(bytes)
    await writable.close()
  })
}

function layerCount(page: Page) {
  return page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    return store.graph.getPages().reduce((total, page) => total + page.childIds.length, 0)
  })
}

function hasUnsavedChanges(page: Page) {
  return page.evaluate(() => window.openPencil?.getStore?.().hasUnsavedChanges())
}

async function addRectangle(page: Page) {
  await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    store.createShape('RECTANGLE', 100, 100, 100, 100)
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await new CanvasHelper(page).waitForInit()
})

test('a change on disk reloads a document without unsaved edits', async ({ page }) => {
  const original = await saveToPrivateFile(page, 'disk-change-clean.fig')
  await addRectangle(page)
  await page.evaluate(async () => {
    await window.openPencil?.getStore?.().saveFigFile()
  })
  expect(await layerCount(page)).toBe(1)
  await page.waitForTimeout(AFTER_OWN_WRITE_MS)

  await writeFromOutside(original)

  await expect.poll(() => layerCount(page), { timeout: DISK_CHANGE_TIMEOUT_MS }).toBe(0)
  await expect(page.getByRole('alertdialog')).not.toBeVisible()
  expect(await hasUnsavedChanges(page)).toBe(false)
})

test('a change on disk asks before discarding unsaved edits', async ({ page }) => {
  const original = await saveToPrivateFile(page, 'disk-change-dirty.fig')
  await page.waitForTimeout(AFTER_OWN_WRITE_MS)
  await addRectangle(page)
  expect(await hasUnsavedChanges(page)).toBe(true)

  await writeFromOutside(original)
  const dialog = page.getByRole('alertdialog', { name: /disk-change-dirty/ })
  await expect(dialog).toBeVisible({ timeout: DISK_CHANGE_TIMEOUT_MS })
  // Return keeps the edits.
  await expect(dialog.getByRole('button', { name: 'Ignore' })).toBeFocused()
  await dialog.getByRole('button', { name: 'Ignore' }).click()

  await expect(dialog).not.toBeVisible()
  expect(await layerCount(page)).toBe(1)
  expect(await hasUnsavedChanges(page)).toBe(true)

  // Ignoring answers that change only; the next one asks again.
  await writeFromOutside(original)
  await expect(dialog).toBeVisible({ timeout: DISK_CHANGE_TIMEOUT_MS })
  await dialog.getByRole('button', { name: 'Reload' }).click()

  await expect(dialog).not.toBeVisible()
  await expect.poll(() => layerCount(page)).toBe(0)
  expect(await hasUnsavedChanges(page)).toBe(false)
})

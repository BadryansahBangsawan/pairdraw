import type { Page } from '@playwright/test'

import { expect, test } from '#tests/e2e/fixtures'
import { CanvasHelper } from '#tests/helpers/canvas'

const FILE_NAME = 'recovered-changes.fig'

/**
 * Saves the document to a real file in the origin-private file system, which keeps the same
 * entry across a reload, with autosave off so later edits stay unsaved.
 */
async function saveToPrivateFile(page: Page) {
  await page.evaluate(async (name) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    const root = await navigator.storage.getDirectory()
    const handle = await root.getFileHandle(name, { create: true })
    window.showSaveFilePicker = async () => handle
    if (!(await store.saveFigFileAs())) throw new Error('Save As did not write the file')
    store.state.autosaveEnabled = false
  }, FILE_NAME)
}

/** Edits the file and backs the unsaved edit up, as a crash or a closed window would leave it. */
async function leaveUnsavedEdit(page: Page) {
  await page.evaluate(async () => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    const id = store.createShape('RECTANGLE', 100, 100, 120, 80)
    store.updateNode(id, { name: 'Recovered rectangle' })
    await store.persistRecoveryNow()
  })
}

/** Opens the same file again through File > Open. */
async function reopenFile(page: Page) {
  await page.evaluate(async (name) => {
    const root = await navigator.storage.getDirectory()
    const handle = await root.getFileHandle(name)
    window.showOpenFilePicker = async () => [handle]
  }, FILE_NAME)
  await page.keyboard.press('ControlOrMeta+KeyO')
}

function layerCount(page: Page) {
  return page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    return store.graph.getPages().reduce((total, page) => total + page.childIds.length, 0)
  })
}

function documentName(page: Page) {
  return page.evaluate(() => window.pairdraw?.getStore?.()?.state.documentName ?? null)
}

function fileSize(page: Page) {
  return page.evaluate(async (name) => {
    const root = await navigator.storage.getDirectory()
    return (await (await root.getFileHandle(name)).getFile()).size
  }, FILE_NAME)
}

async function restart(page: Page) {
  page.once('dialog', (dialog) => dialog.accept())
  await page.reload()
  await new CanvasHelper(page).waitForInit()
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  await saveToPrivateFile(page)
  await leaveUnsavedEdit(page)
  await restart(page)
})

test('a file’s backup is offered when the file opens, not at startup', async ({ page }) => {
  await expect(page.getByRole('alertdialog', { name: 'Recover unsaved work' })).toBeHidden()
  await reopenFile(page)
  await expect(page.getByRole('alertdialog', { name: 'Recovered changes' })).toBeVisible()
})

test('Save puts the recovered changes into the file', async ({ page }) => {
  const before = await fileSize(page)
  await reopenFile(page)
  const dialog = page.getByRole('alertdialog', { name: 'Recovered changes' })
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(dialog).toBeHidden()
  await expect.poll(() => layerCount(page)).toBe(1)
  await expect.poll(() => fileSize(page)).not.toBe(before)
  await expect(page.getByRole('img', { name: 'Unsaved changes' })).toBeHidden()

  // The backup is spent: opening the file again asks nothing.
  await restart(page)
  await reopenFile(page)
  await expect.poll(() => layerCount(page)).toBe(1)
  await expect(page.getByRole('alertdialog', { name: 'Recovered changes' })).toBeHidden()
})

test('Save As opens the recovered changes apart and leaves the file as it was', async ({
  page
}) => {
  const before = await fileSize(page)
  await reopenFile(page)
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const handle = await root.getFileHandle('recovered-copy.fig', { create: true })
    window.showSaveFilePicker = async () => handle
  })
  const dialog = page.getByRole('alertdialog', { name: 'Recovered changes' })
  await expect(dialog).toBeVisible()
  const tabs = page.getByTestId('tabbar-tab')
  const tabsBefore = await tabs.count()
  await dialog.getByRole('button', { name: 'Save As…' }).click()

  await expect(dialog).toBeHidden()
  // The recovered changes open in a tab of their own, saved as the new file.
  await expect(tabs).toHaveCount(tabsBefore + 1)
  await expect.poll(() => documentName(page)).toBe('recovered-copy')
  await expect.poll(() => layerCount(page)).toBe(1)
  expect(await fileSize(page)).toBe(before)
})

test('Don’t Save keeps the file as it is on disk and drops the backup', async ({ page }) => {
  await reopenFile(page)
  const dialog = page.getByRole('alertdialog', { name: 'Recovered changes' })
  await dialog.getByRole('button', { name: 'Don’t Save' }).click()

  await expect(dialog).toBeHidden()
  expect(await layerCount(page)).toBe(0)
  await restart(page)
  await reopenFile(page)
  await expect.poll(() => layerCount(page)).toBe(0)
  await expect(page.getByRole('alertdialog', { name: 'Recovered changes' })).toBeHidden()
})

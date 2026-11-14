import type { Page } from '@playwright/test'

import { expect, test } from '#tests/e2e/fixtures'
import { CanvasHelper } from '#tests/helpers/canvas'

/** Test runs keep no drafts unless their URL asks for them. */
const DRAFTS_URL = '/?test&drafts'

async function addRectangle(page: Page, name: string) {
  await page.evaluate((layerName) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    const id = store.createShape('RECTANGLE', 100, 100, 120, 80)
    store.updateNode(id, { name: layerName })
  }, name)
}

/** Writes the draft now rather than after the edit settles. */
async function keepDraft(page: Page) {
  await page.evaluate(async () => {
    await window.pairdraw?.getStore?.().persistDraftNow()
  })
}

function unsavedMark(page: Page) {
  return page.getByRole('img', { name: 'Unsaved changes' })
}

async function showDrafts(page: Page) {
  const home = page.getByTestId('recent-files-home')
  await home.getByRole('navigation').getByRole('button', { name: 'Drafts' }).click()
  return home.getByTestId('home-drafts')
}

test.beforeEach(async ({ page }) => {
  await page.goto(DRAFTS_URL)
  await new CanvasHelper(page).waitForInit()
})

test('a new design keeps its changes as a draft and closes without asking', async ({ page }) => {
  await addRectangle(page, 'Draft rectangle')
  await keepDraft(page)
  await expect(unsavedMark(page)).toBeHidden()

  await page.getByTestId('tabbar-close').click()
  await expect(page.getByRole('alertdialog')).toBeHidden()
  const drafts = await showDrafts(page)
  const entry = drafts.getByRole('button', { name: /^Untitled/ })
  await expect(entry).toBeVisible()

  await entry.click()
  await expect(page.getByTestId('recent-files-home')).toBeHidden()
  await expect(page.getByText('Draft rectangle')).toBeVisible()
  await expect(unsavedMark(page)).toBeHidden()
})

test('a draft outlasts a reload and opens from Home without the recovery dialog', async ({
  page
}) => {
  await addRectangle(page, 'Reloaded draft rectangle')
  // A draft is written shortly after the edit, which takes the unsaved mark away.
  await expect(unsavedMark(page)).toBeHidden({ timeout: 15_000 })

  await page.reload()
  await new CanvasHelper(page).waitForInit()
  await expect(page.getByRole('alertdialog', { name: 'Recover unsaved work' })).toBeHidden()
  await page.getByTestId('tabbar-new').click()
  const drafts = await showDrafts(page)
  await drafts.getByRole('button', { name: /^Untitled/ }).click()
  await expect(page.getByText('Reloaded draft rectangle')).toBeVisible()
})

test('Delete draft removes it from Home and closes its tab', async ({ page }) => {
  await addRectangle(page, 'Doomed rectangle')
  await keepDraft(page)
  await page.getByTestId('tabbar-new').click()
  const drafts = await showDrafts(page)
  const tabs = page.getByTestId('tabbar-tab')
  const tabsBefore = await tabs.count()
  await drafts.getByTestId('home-document-actions').click()
  await page.getByRole('menuitem', { name: 'Delete draft' }).click()
  const confirm = page.getByRole('alertdialog')
  await confirm.getByRole('button', { name: 'Delete draft' }).click()

  await expect(drafts.getByRole('button', { name: /^Untitled/ })).toBeHidden()
  await expect(drafts.getByRole('heading', { name: 'No drafts yet' })).toBeVisible()
  await expect(tabs).toHaveCount(tabsBefore - 1)
})

test('saving a draft to a file takes it out of Drafts', async ({ page }) => {
  await addRectangle(page, 'Promoted rectangle')
  await keepDraft(page)
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const handle = await root.getFileHandle('promoted.fig', { create: true })
    window.showSaveFilePicker = async () => handle
    const store = window.pairdraw?.getStore?.()
    if (!(await store?.saveFigFileAs())) throw new Error('Save As did not write the file')
  })

  await page.getByTestId('tabbar-new').click()
  const drafts = await showDrafts(page)
  await expect(drafts.getByRole('heading', { name: 'No drafts yet' })).toBeVisible()
})

test('Save As on Home saves a closed draft to a file and takes it out of Drafts', async ({
  page
}) => {
  await addRectangle(page, 'Saved from Home')
  await keepDraft(page)
  await page.getByTestId('tabbar-close').click()
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const handle = await root.getFileHandle('from-home.fig', { create: true })
    window.showSaveFilePicker = async () => handle
  })
  const drafts = await showDrafts(page)
  await drafts.getByTestId('home-document-actions').click()
  await page.getByRole('menuitem', { name: 'Save As…' }).click()

  await expect(drafts.getByRole('heading', { name: 'No drafts yet' })).toBeVisible()
  const size = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    return (await (await root.getFileHandle('from-home.fig')).getFile()).size
  })
  expect(size).toBeGreaterThan(0)
})

test('a test run without the drafts flag keeps a new document unsaved', async ({ page }) => {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  await addRectangle(page, 'Unsaved rectangle')
  await keepDraft(page)
  await expect(unsavedMark(page)).toBeVisible()
})

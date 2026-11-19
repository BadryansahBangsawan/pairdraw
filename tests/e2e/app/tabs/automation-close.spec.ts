import type { Page } from '@playwright/test'
import * as v from 'valibot'

import { expect, test } from '#tests/e2e/fixtures'
import { CanvasHelper } from '#tests/helpers/canvas'
import { openLayersPanel } from '#tests/helpers/properties'

const listedDocumentsSchema = v.object({
  ok: v.literal(true),
  result: v.object({
    documents: v.array(v.object({ id: v.string(), active: v.boolean() }))
  })
})

const closeRefusalSchema = v.object({
  closed: v.literal(false),
  reason: v.string()
})

/** Test runs keep no drafts unless their URL asks for them. */
const DRAFTS_URL = '/?test&drafts'

const CLOSED_FILE = 'closed-by-agent.fig'
const KEPT_FILE = 'kept-copy.fig'
const DISCARDED_FILE = 'discarded-by-person.fig'

/** Sends an automation request the way the MCP bridge delivers it. */
function automation(page: Page, command: string, args: unknown = {}) {
  return page.evaluate(([name, payload]) => window.pairdraw?.test?.automation?.(name, payload), [
    command,
    args
  ] as const)
}

/** The document in front, as `list_documents` names it for a later `document_id`. */
async function activeDocumentId(page: Page): Promise<string> {
  const parsed = v.safeParse(listedDocumentsSchema, await automation(page, 'list_documents'))
  if (!parsed.success) throw new Error('list_documents returned an unexpected shape')
  const active = parsed.output.result.documents.find((document) => document.active)
  if (!active) throw new Error('No document is in front')
  return active.id
}

/**
 * Anonymous close, with the refusal read inside the page. The reason does not survive the
 * evaluate boundary on a thrown error.
 */
function refusedAnonymousClose(page: Page) {
  return page.evaluate(async () => {
    try {
      await window.pairdraw?.test?.automation?.('close_file', { unsaved: 'discard' })
      return { closed: true }
    } catch (error) {
      const reason =
        typeof error === 'object' &&
        error !== null &&
        'reason' in error &&
        typeof error.reason === 'string'
          ? error.reason
          : ''
      return { closed: false, reason }
    }
  })
}

/** Closes the document in front by the id `list_documents` returned. */
async function closeActiveDocument(page: Page) {
  await automation(page, 'close_file', {
    unsaved: 'discard',
    document_id: await activeDocumentId(page)
  })
}

async function addRectangle(page: Page, name: string) {
  await page.evaluate((layerName) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    const id = store.createShape('RECTANGLE', 100, 100, 120, 80)
    store.updateNode(id, { name: layerName })
  }, name)
}

async function keepDraft(page: Page) {
  await page.evaluate(async () => {
    await window.pairdraw?.getStore?.().persistDraftNow()
  })
}

/** Saves the document to a real file in the origin-private file system, with autosave off. */
async function saveToPrivateFile(page: Page, name: string) {
  await page.evaluate(async (fileName) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    const root = await navigator.storage.getDirectory()
    const handle = await root.getFileHandle(fileName, { create: true })
    window.showSaveFilePicker = async () => handle
    if (!(await store.saveFigFileAs())) throw new Error('Save As did not write the file')
    store.state.autosaveEnabled = false
  }, name)
}

async function privateFileBytes(page: Page, name: string) {
  return page.evaluate(async (fileName) => {
    const root = await navigator.storage.getDirectory()
    const file = await (await root.getFileHandle(fileName)).getFile()
    return Array.from(new Uint8Array(await file.arrayBuffer()))
  }, name)
}

/** Opens the private file through File > Open, as the person does. */
async function openPrivateFile(page: Page, name: string) {
  await page.evaluate(async (fileName) => {
    const root = await navigator.storage.getDirectory()
    const handle = await root.getFileHandle(fileName)
    window.showOpenFilePicker = async () => [handle]
  }, name)
  await page.keyboard.press('ControlOrMeta+KeyO')
}

/** How many recovery copies this device keeps, as the startup offer lists them. */
function recoveryCopies(page: Page) {
  return page.evaluate(async () => {
    const request = indexedDB.open('pairdraw-recovery')
    const opening = Promise.withResolvers<IDBDatabase>()
    request.onsuccess = () => opening.resolve(request.result)
    request.onerror = () => opening.reject(request.error)
    const database = await opening.promise
    try {
      if (!database.objectStoreNames.contains('meta')) return 0
      const countRequest = database.transaction('meta').objectStore('meta').count()
      const counting = Promise.withResolvers<number>()
      countRequest.onsuccess = () => counting.resolve(countRequest.result)
      countRequest.onerror = () => counting.reject(countRequest.error)
      return await counting.promise
    } finally {
      database.close()
    }
  })
}

function layerCount(page: Page) {
  return page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    return store.graph.getPages().reduce((total, page) => total + page.childIds.length, 0)
  })
}

async function showDrafts(page: Page) {
  const home = page.getByTestId('recent-files-home')
  await home.getByTestId('home-tab-drafts').click()
  return home.getByTestId('home-drafts')
}

async function reload(page: Page) {
  page.once('dialog', (dialog) => dialog.accept())
  await page.reload()
  // A reload starts on the File view; a recovery dialog may be up, so leave the panels alone.
  await new CanvasHelper(page).waitForInit({ designPanel: false })
}

test('an agent closing an untitled document leaves its work in Drafts', async ({ page }) => {
  await page.goto(DRAFTS_URL)
  await new CanvasHelper(page).waitForInit()
  await openLayersPanel(page)
  await addRectangle(page, 'Work kept for Home')
  await keepDraft(page)

  const tabs = page.getByTestId('tabbar-tab')
  const openTabs = await tabs.count()
  const refused = v.safeParse(closeRefusalSchema, await refusedAnonymousClose(page))
  if (!refused.success) throw new Error('anonymous close was not refused')
  expect(refused.output.reason).toBe('not-owned')
  await expect(tabs).toHaveCount(openTabs)
  await expect(page.getByText('Work kept for Home')).toBeVisible()

  await closeActiveDocument(page)

  await expect(page.getByTestId('recent-files-home')).toBeVisible()
  await expect(page.getByTestId('tabbar-tab')).toHaveCount(1)
  const drafts = await showDrafts(page)
  const entry = drafts.getByRole('button', { name: /^Untitled/ })
  await expect(entry).toBeVisible()

  await entry.click()
  await expect(page.getByText('Work kept for Home')).toBeVisible()
})

test('an agent closing a saved file leaves its unsaved work recoverable', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  await openLayersPanel(page)
  await saveToPrivateFile(page, CLOSED_FILE)
  await addRectangle(page, 'Unsaved in the closed file')
  await page.evaluate(async () => {
    await window.pairdraw?.getStore?.().persistRecoveryNow()
  })
  expect(await recoveryCopies(page)).toBe(1)

  await closeActiveDocument(page)

  await expect(page.getByTestId('recent-files-home')).toBeVisible()
  expect(await recoveryCopies(page)).toBe(1)

  await reload(page)
  await openPrivateFile(page, CLOSED_FILE)
  const dialog = page.getByRole('alertdialog', { name: 'Recovered changes' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Unsaved in the closed file')).toBeVisible()
})

test('another document opens apart from one restored from Recover', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  await openLayersPanel(page)
  await addRectangle(page, 'Retained recovery rectangle')
  await page.evaluate(async () => {
    await window.pairdraw?.getStore?.().persistRecoveryNow()
  })

  // A file to open later, made from a document of its own, so it holds real `.fig` bytes.
  await automation(page, 'new_document')
  await addRectangle(page, 'Second document')
  await saveToPrivateFile(page, KEPT_FILE)
  const bytes = await privateFileBytes(page, KEPT_FILE)
  await automation(page, 'close_file', { unsaved: 'discard' })
  await page.route('**/e2e/kept-copy.fig', (route) =>
    route.fulfill({ body: Buffer.from(bytes), contentType: 'application/octet-stream' })
  )

  await reload(page)
  const recover = page.getByRole('alertdialog', { name: 'Recover unsaved work' })
  await expect(recover).toBeVisible()
  await recover.getByRole('button', { name: 'Restore' }).click()
  await expect(page.getByText('Retained recovery rectangle')).toBeVisible()
  const copies = await recoveryCopies(page)
  expect(copies).toBe(1)

  await automation(page, 'open_file', { path: '/e2e/kept-copy.fig' })
  await expect(page.getByText('Second document')).toBeVisible()
  const restored = page.getByRole('tab', { name: /Untitled/ })
  await expect(restored).toBeVisible()
  await restored.click()
  await expect(page.getByText('Retained recovery rectangle')).toBeVisible()
  expect(await recoveryCopies(page)).toBe(copies)

  await openPrivateFile(page, KEPT_FILE)
  await expect(page.getByText('Second document')).toBeVisible()
  await expect(restored).toBeVisible()
  await restored.click()
  await expect(page.getByText('Retained recovery rectangle')).toBeVisible()
  expect(await recoveryCopies(page)).toBe(copies)
})

test('the person’s Don’t Save drops the copy', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  await openLayersPanel(page)
  await saveToPrivateFile(page, DISCARDED_FILE)
  await addRectangle(page, 'Discarded rectangle')
  await page.evaluate(async () => {
    await window.pairdraw?.getStore?.().persistRecoveryNow()
  })
  expect(await recoveryCopies(page)).toBe(1)

  await page.getByTestId('tabbar-close').click()
  const ask = page.getByRole('alertdialog', { name: /Save changes to/ })
  await ask.getByRole('button', { name: 'Don’t Save' }).click()

  await expect(page.getByTestId('recent-files-home')).toBeVisible()
  expect(await recoveryCopies(page)).toBe(0)

  await reload(page)
  await openPrivateFile(page, DISCARDED_FILE)
  await expect(page.getByRole('alertdialog', { name: 'Recovered changes' })).toBeHidden()
  expect(await layerCount(page)).toBe(0)
})

test('deleting a draft from Home does not bring it back in Recover', async ({ page }) => {
  await page.goto(DRAFTS_URL)
  await new CanvasHelper(page).waitForInit()
  await openLayersPanel(page)
  await addRectangle(page, 'Deleted draft rectangle')
  await keepDraft(page)

  await page.getByTestId('tabbar-new').click()
  const drafts = await showDrafts(page)
  await drafts.getByTestId('home-document-actions').click()
  await page.getByRole('menuitem', { name: 'Delete draft' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete draft' }).click()
  await expect(drafts.getByRole('heading', { name: 'No drafts yet' })).toBeVisible()

  await reload(page)
  await expect(page.getByRole('alertdialog', { name: 'Recover unsaved work' })).toBeHidden()
  await page.getByTestId('tabbar-new').click()
  const afterReload = await showDrafts(page)
  await expect(afterReload.getByRole('heading', { name: 'No drafts yet' })).toBeVisible()
})

test('a failed open keeps the previous tab and leaves no copy behind', async ({ page }) => {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  await openLayersPanel(page)
  await addRectangle(page, 'Survives a failed open')
  await page.evaluate(async () => {
    await window.pairdraw?.getStore?.().persistRecoveryNow()
  })
  expect(await recoveryCopies(page)).toBe(1)
  const tabs = page.getByTestId('tabbar-tab')
  const tabsBefore = await tabs.count()

  await page.route('**/e2e/broken.fig', (route) =>
    route.fulfill({
      body: Buffer.from('not a design file'),
      contentType: 'application/octet-stream'
    })
  )
  const failure = await page.evaluate(async () => {
    try {
      await window.pairdraw?.test?.automation?.('open_file', { path: '/e2e/broken.fig' })
      return null
    } catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
  })
  expect(failure).toBeTruthy()

  await expect(page.getByText('Survives a failed open')).toBeVisible()
  await expect(tabs).toHaveCount(tabsBefore)
  // A copy the failed tab queued would land after recovery's debounce, not before it.
  await page.waitForTimeout(4000)
  expect(await recoveryCopies(page)).toBe(1)
})

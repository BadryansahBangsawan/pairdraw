import { readFile } from 'node:fs/promises'

import type { Page } from '@playwright/test'

import { expect, test } from '#tests/e2e/fixtures'
import { waitForHome } from '#tests/helpers/boot'

/** Three recent files whose name, last use, and first use each put them in a different order. */
const RECENT = [
  {
    id: 'local:/Brochure.fig',
    kind: 'local',
    path: '/Brochure.fig',
    name: 'Brochure',
    updatedAt: '2026-03-03T00:00:00.000Z',
    createdAt: '2026-01-02T00:00:00.000Z'
  },
  {
    id: 'local:/Avatar.fig',
    kind: 'local',
    path: '/Avatar.fig',
    name: 'Avatar',
    updatedAt: '2026-03-02T00:00:00.000Z',
    createdAt: '2026-01-03T00:00:00.000Z'
  },
  {
    id: 'storage:s3-compatible:catalog',
    kind: 'storage',
    providerId: 's3-compatible',
    documentId: 'catalog',
    name: 'Catalog',
    updatedAt: '2026-03-01T00:00:00.000Z'
  }
]

test.use({
  storageState: async ({ baseURL }, use) => {
    if (!baseURL) throw new Error('Browser test baseURL is required')
    await use({
      cookies: [],
      origins: [
        {
          origin: new URL(baseURL).origin,
          localStorage: [
            {
              name: 'pairdraw:preferences:v1',
              value: JSON.stringify({ version: 1, onboarding: { aiSetup: 'done' } })
            },
            { name: 'pairdraw:recent-documents', value: JSON.stringify(RECENT) }
          ]
        }
      ]
    })
  }
})

async function openRecent(page: Page) {
  await page.goto('/?recent-files')
  const home = page.getByTestId('recent-files-home')
  await waitForHome(page)
  return home
}

function entries(page: Page) {
  return page.getByTestId('recent-files-home').locator('[data-slot="document-entry"]')
}

async function names(page: Page) {
  return entries(page).locator('[data-slot="name"]').allTextContents()
}

function selected(page: Page) {
  return entries(page).and(page.locator('[data-selected]'))
}

test('sorts recent files by name, last use, and when they were added, and keeps the order', async ({
  page
}) => {
  await openRecent(page)
  expect(await names(page)).toEqual(['Brochure', 'Avatar', 'Catalog'])

  await page.getByRole('button', { name: /^Sort by/ }).click()
  await page.getByRole('menuitemradio', { name: 'Name' }).click()
  expect(await names(page)).toEqual(['Avatar', 'Brochure', 'Catalog'])

  await page.getByRole('button', { name: /^Sort by/ }).click()
  await page.getByRole('menuitemradio', { name: 'Created' }).click()
  // A file kept before creation dates counts as added when it was last used.
  expect(await names(page)).toEqual(['Catalog', 'Avatar', 'Brochure'])

  await page.reload()
  await expect(entries(page)).toHaveCount(3)
  expect(await names(page)).toEqual(['Catalog', 'Avatar', 'Brochure'])
})

test('Cmd/Ctrl+click and Shift+click select files that are removed from Recents together', async ({
  page
}) => {
  await openRecent(page)
  const brochure = entries(page).filter({ hasText: 'Brochure' }).getByRole('button').first()
  const catalog = entries(page).filter({ hasText: 'Catalog' }).getByRole('button').first()

  await brochure.click({ modifiers: ['ControlOrMeta'] })
  const bar = page.getByRole('group', { name: 'Selected files' })
  await expect(bar).toBeVisible()
  await expect(selected(page)).toHaveCount(1)
  // Opening is what a plain click does, so the selection did not open anything.
  await waitForHome(page)

  await catalog.click({ modifiers: ['Shift'] })
  await expect(selected(page)).toHaveCount(3)

  await catalog.click({ modifiers: ['ControlOrMeta'] })
  await expect(selected(page)).toHaveCount(2)

  await page.keyboard.press('Escape')
  await expect(bar).toBeHidden()

  await brochure.click({ modifiers: ['ControlOrMeta'] })
  await catalog.click({ modifiers: ['ControlOrMeta'] })
  await bar.getByRole('button', { name: 'Remove from Recents' }).click()
  await expect(bar).toBeHidden()
  expect(await names(page)).toEqual(['Avatar'])

  await page.reload()
  await expect(entries(page)).toHaveCount(1)
})

test('Cmd/Ctrl+A selects every listed file and Select all fills a partial selection', async ({
  page
}) => {
  await openRecent(page)
  const avatar = entries(page).filter({ hasText: 'Avatar' }).getByRole('button').first()
  await avatar.click({ modifiers: ['ControlOrMeta'] })
  const bar = page.getByRole('group', { name: 'Selected files' })
  await bar.getByRole('button', { name: 'Select all' }).click()
  await expect(selected(page)).toHaveCount(3)
  await expect(bar.getByRole('button', { name: 'Select all' })).toBeHidden()

  await bar.getByRole('button', { name: 'Clear selection' }).click()
  await expect(bar).toBeHidden()

  // The keys follow a mouse selection without focusing the list first.
  await avatar.click({ modifiers: ['ControlOrMeta'] })
  await page.keyboard.press('ControlOrMeta+KeyA')
  await expect(selected(page)).toHaveCount(3)
})

test('a file’s menu removes just that file from Recents and keeps the others', async ({ page }) => {
  await openRecent(page)
  await entries(page).filter({ hasText: 'Avatar' }).click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Remove from Recents' }).click()
  expect(await names(page)).toEqual(['Brochure', 'Catalog'])
})

test('Save As is offered for a stored file, and not for a disk file the browser cannot read', async ({
  page
}) => {
  await openRecent(page)
  await entries(page).filter({ hasText: 'Catalog' }).click({ button: 'right' })
  await expect(page.getByRole('menuitem', { name: 'Save As…' })).toBeVisible()
  await page.keyboard.press('Escape')

  await entries(page).filter({ hasText: 'Brochure' }).click({ button: 'right' })
  await expect(page.getByRole('menuitem', { name: 'Remove from Recents' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Save As…' })).toBeHidden()
})

test('Save As downloads a copy of a stored recent file without opening it', async ({ page }) => {
  // Without a save picker the browser downloads the copy.
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true })
  })
  await openRecent(page)
  // This device keeps changes to Catalog that its provider has not got, so the copy needs no
  // provider and carries them.
  await page.evaluate(async () => {
    const request = indexedDB.open('pairdraw-cloud-local', 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains('meta')) {
        database.createObjectStore('meta', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('fig')) database.createObjectStore('fig')
      if (!database.objectStoreNames.contains('thumb')) database.createObjectStore('thumb')
    }
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('The local store did not open'))
    })
    const transaction = database.transaction(['meta', 'fig'], 'readwrite')
    transaction.objectStore('meta').put({
      id: 'catalog',
      providerId: 's3-compatible',
      name: 'Catalog',
      updatedAt: '2026-03-01T00:00:00.000Z',
      revision: 1,
      syncStatus: 'pending',
      lastSyncedAt: null,
      lastSyncError: null,
      tombstoned: false,
      hasFig: true,
      hasThumb: false
    })
    transaction.objectStore('fig').put(new Uint8Array([7, 8, 9]), 'catalog')
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('The local copy was not written'))
    })
    database.close()
  })

  await entries(page).filter({ hasText: 'Catalog' }).click({ button: 'right' })
  const download = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Save As…' }).click()
  const saved = await download
  expect(saved.suggestedFilename()).toBe('Catalog.fig')
  const path = await saved.path()
  expect([...(await readFile(path))]).toEqual([7, 8, 9])
  // Saving a copy leaves Home as it was.
  await waitForHome(page)
  expect(await names(page)).toEqual(['Brochure', 'Avatar', 'Catalog'])
})

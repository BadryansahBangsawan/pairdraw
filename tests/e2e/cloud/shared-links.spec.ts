import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { expect, test, type Page } from '@playwright/test'

import { CLOUD_DISCOVERY_PATH, type DocumentPermission } from '@pairdraw/cloud/contract'

import { CanvasHelper } from '#tests/helpers/canvas'
import { cloudDiscoveryFixture } from '#tests/helpers/cloud/discovery'
import { toolbarToolTestId } from '#tests/helpers/test-ids'

const OBJECTS = 'https://objects.example.com'
const SHARE_ID = '3f0f4f4e-5d3c-4f1b-9a0e-2a8c0d6b7e11'
const DOCUMENT_ID = '3f0f4f4e-5d3c-4f1b-9a0e-2a8c0d6b7e12'
const WORKSPACE_ID = '3f0f4f4e-5d3c-4f1b-9a0e-2a8c0d6b7e13'
const REVISION_ID = '3f0f4f4e-5d3c-4f1b-9a0e-2a8c0d6b7e14'
const SECRET = 'a'.repeat(48)
const FIXTURE = 'tests/fixtures/circle-text.fig'

/** The stored file as the server describes it, with where to download it. */
async function storedDocument() {
  const bytes = await readFile(FIXTURE)
  const now = new Date().toISOString()
  return {
    bytes,
    download: {
      document: {
        id: DOCUMENT_ID,
        workspaceId: WORKSPACE_ID,
        name: 'Poster',
        currentRevisionId: REVISION_ID,
        version: 1,
        createdAt: now,
        updatedAt: now
      },
      revisionId: REVISION_ID,
      byteSize: bytes.byteLength,
      checksum: createHash('sha256').update(bytes).digest('base64'),
      contentType: 'application/octet-stream',
      download: {
        url: `${OBJECTS}/poster.fig`,
        method: 'GET',
        headers: {},
        expiresAt: new Date(Date.now() + 60_000).toISOString()
      },
      images: []
    }
  }
}

const RELAY = 'wss://relay.example.com/collaboration'
const GUEST = { kind: 'guest', guestId: 'guest-1', name: 'Guest' } as const

/**
 * The page's own address as a Cloud server, answering a link and a public document with the
 * fixture file, and counting what the editor asked for that it has no answer to. The link is a
 * snapshot unless `live` names the permission of a live link, whose room is on a relay that
 * takes the connection and never answers.
 */
async function routeSharedCloud(
  page: Page,
  origin: string,
  live?: Exclude<DocumentPermission, 'edit'>
) {
  const { bytes, download } = await storedDocument()
  const unexpected: string[] = []
  const answers: Record<string, unknown> = {
    [`GET ${CLOUD_DISCOVERY_PATH}`]: cloudDiscoveryFixture(origin),
    [`POST /api/shares/${SHARE_ID}/document`]: {
      resolution: {
        documentId: DOCUMENT_ID,
        permission: live ?? 'view',
        principal: GUEST,
        roomEpoch: 0,
        revisionId: live ? null : REVISION_ID
      },
      document: download
    },
    [`POST /api/shares/${SHARE_ID}/collaboration-ticket`]: {
      ticket: {
        token: 'ticket',
        provider: 'relay',
        serverURL: `${RELAY}?document=${DOCUMENT_ID}`,
        documentId: DOCUMENT_ID,
        roomId: `cloud:${DOCUMENT_ID}:0`,
        roomKey: 'k'.repeat(43),
        principal: GUEST,
        permission: live ?? 'view',
        roomEpoch: 0,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        serverEnforcedWrites: true
      }
    },
    [`POST /api/public/documents/${DOCUMENT_ID}/document`]: {
      document: download
    }
  }
  // The relay takes the connection and stays silent: the tab joins as the ticket says.
  await page.routeWebSocket(`${RELAY}**`, () => undefined)
  await page.route(
    (url) =>
      url.origin === origin &&
      (url.pathname.startsWith('/api/') || url.pathname === CLOUD_DISCOVERY_PATH),
    async (route) => {
      const request = route.request()
      const key = `${request.method()} ${new URL(request.url()).pathname}`
      if (!(key in answers)) {
        unexpected.push(key)
        return route.fulfill({
          status: 404,
          json: { error: { code: 'not_found' } }
        })
      }
      return route.fulfill({ json: answers[key] })
    }
  )
  await page.route(`${OBJECTS}/**`, (route) =>
    route.fulfill({
      headers: { 'Access-Control-Allow-Origin': '*' },
      contentType: 'application/octet-stream',
      body: bytes
    })
  )
  return { unexpected, bytes }
}

async function downloadFig(page: Page) {
  // Without a save picker the browser downloads the file.
  await page.evaluate(() => Reflect.deleteProperty(window, 'showSaveFilePicker'))
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('cloud-shared-link-download').click()
  ])
  return download
}

test('a snapshot link opens the shared version read-only and downloads it as .fig', async ({
  page,
  baseURL
}) => {
  const origin = new URL(baseURL ?? '').origin
  const cloud = await routeSharedCloud(page, origin)
  await page.goto(`/share/${SHARE_ID}?test#${SECRET}`)
  await new CanvasHelper(page).waitForInit()

  const status = page.getByTestId('cloud-shared-link-status')
  await expect(status).toContainText('Snapshot')
  // Read-only, without comments: the toolbar keeps only tools that change nothing.
  await expect(page.getByTestId(toolbarToolTestId('COMMENT'))).toHaveCount(0)
  await expect(page.getByTestId(toolbarToolTestId('SELECT'))).toBeVisible()
  // The secret leaves the address at once.
  expect(new URL(page.url()).hash).toBe('')

  const download = await downloadFig(page)
  expect(download.suggestedFilename()).toBe('Poster.fig')
  expect(await readFile(await download.path())).toEqual(cloud.bytes)
  expect(cloud.unexpected).toEqual([])
})

test('a public profile’s document opens read-only for someone signed out', async ({
  page,
  baseURL
}) => {
  const origin = new URL(baseURL ?? '').origin
  const cloud = await routeSharedCloud(page, origin)
  await page.goto(`/view/${DOCUMENT_ID}?test`)
  await new CanvasHelper(page).waitForInit()

  await expect(page.getByTestId('cloud-shared-link-status')).toContainText('View only')
  const download = await downloadFig(page)
  expect(download.suggestedFilename()).toBe('Poster.fig')
  expect(cloud.unexpected).toEqual([])
})

test('a comment link offers only looking and commenting, and keeps deleting with editors', async ({
  page,
  baseURL
}) => {
  const origin = new URL(baseURL ?? '').origin
  const cloud = await routeSharedCloud(page, origin, 'comment')
  await page.goto(`/share/${SHARE_ID}?test#${SECRET}`)
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()

  await expect(page.getByTestId('cloud-shared-link-status')).toContainText('Can comment')
  const comment = page.getByTestId(toolbarToolTestId('COMMENT'))
  await expect(comment).toBeVisible()
  for (const tool of ['SELECT', 'HAND'] as const) {
    await expect(page.getByTestId(toolbarToolTestId(tool))).toBeVisible()
  }
  for (const tool of ['RECTANGLE', 'FRAME', 'TEXT', 'PEN'] as const) {
    await expect(page.getByTestId(toolbarToolTestId(tool))).toHaveCount(0)
  }
  // Edit shortcuts change nothing: R leaves the tool as it was.
  await page.keyboard.press('KeyR')
  await expect(page.getByTestId(toolbarToolTestId('SELECT'))).toHaveAttribute(
    'aria-pressed',
    'true'
  )

  await comment.click()
  const box = await canvas.canvas.boundingBox()
  if (!box) throw new Error('The canvas has no bounds')
  await page.mouse.click(box.x + 200, box.y + 200)
  const composer = page.getByRole('textbox', { name: 'Add a comment' })
  await expect(composer).toBeFocused()
  await composer.fill('Tighten the spacing')
  await composer.press('Enter')
  const pins = page.locator('[data-slot="comment-pin"]:not([data-draft])')
  await expect(pins).toHaveCount(1)

  // Resolving is offered; deleting stays with people who can edit.
  await page.keyboard.press('Escape')
  await pins.first().click({ button: 'right' })
  const menu = page.getByRole('menu')
  await expect(menu.locator('[data-command="comment-resolve"]')).toHaveCount(1)
  await expect(menu.locator('[data-command="comment-delete"]')).toHaveCount(0)
  expect(cloud.unexpected).toEqual([])
})

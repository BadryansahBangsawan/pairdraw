import { readFile } from 'node:fs/promises'

import type { JSHandle, Page } from '@playwright/test'

import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'
import { openDesignPanel } from '#tests/helpers/properties'
import { EDITOR_BOOT_WAIT_MS } from '#tests/helpers/timeouts'

/**
 * A host page embeds the editor in an iframe and drives it over the embed protocol. The host is
 * served by the test at the app's port on `127.0.0.1`, so it is a different origin from the app on
 * `localhost` (plain http is accepted on loopback), exactly as a third-party page would be.
 */

type Reply = {
  id?: number
  ok?: boolean
  result?: unknown
  error?: { code: string }
  event?: string
  data?: unknown
}

/** The host page's end of the session, living in the host page. */
interface EmbedClient {
  messages: Reply[]
  request(method: string, params?: unknown): Promise<Reply>
}

/** Opens a blank host page at its own origin, the app's with the other loopback name. */
async function openHost(page: Page): Promise<{ host: string; app: string }> {
  const appURL = new URL(test.info().project.use.baseURL ?? '')
  const app = appURL.origin
  appURL.hostname = appURL.hostname === '127.0.0.1' ? 'localhost' : '127.0.0.1'
  const host = appURL.origin
  // The host page is answered by the test, so Chromium cannot place it on loopback and would block
  // its frame on the app as a request into the local network; the host is allowed that, as a page
  // its user trusted would be.
  await page.context().grantPermissions(['local-network-access'], { origin: host })
  await page.route(`${host}/embed-host`, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><head><title>Host</title></head><body></body></html>'
    })
  )
  await page.goto(`${host}/embed-host`)
  return { host, app }
}

/**
 * Adds the editor's iframe, answers its `ready` with a port, and resolves with a client for that
 * port. The listener is in place before the frame loads, so the announcement cannot be missed.
 */
function embed(
  page: Page,
  src: string,
  options: { editable?: boolean } = {}
): Promise<JSHandle<EmbedClient>> {
  return page.evaluateHandle(
    ({ src, editable }) =>
      new Promise<EmbedClient>((resolve) => {
        const embedOrigin = new URL(src).origin
        const frame = document.createElement('iframe')
        frame.title = 'Embedded editor'
        frame.src = src
        frame.width = '1000'
        frame.height = '700'
        window.addEventListener('message', (event: MessageEvent<unknown>) => {
          const data = event.data
          if (event.origin !== embedOrigin || event.source !== frame.contentWindow) return
          if (typeof data !== 'object' || data === null || !('type' in data)) return
          if (data.type !== 'ready') return
          const channel = new MessageChannel()
          const messages: Reply[] = []
          const waiting = new Map<number, (reply: Reply) => void>()
          let nextId = 0
          channel.port1.addEventListener('message', (message: MessageEvent<Reply>) => {
            messages.push(message.data)
            const id = message.data.id
            if (id !== undefined) waiting.get(id)?.(message.data)
          })
          channel.port1.start()
          frame.contentWindow?.postMessage(
            { protocol: 'pairdraw-embed', type: 'connect', version: 1, editable },
            embedOrigin,
            [channel.port2]
          )
          resolve({
            messages,
            request: (method, params) =>
              new Promise<Reply>((answer) => {
                const id = ++nextId
                waiting.set(id, answer)
                channel.port1.postMessage({ id, method, params })
              })
          })
        })
        document.body.append(frame)
      }),
    { src, editable: options.editable ?? false }
  )
}

function request(client: JSHandle<EmbedClient>, method: string, params?: unknown): Promise<Reply> {
  return client.evaluate((embedded, args) => embedded.request(args.method, args.params), {
    method,
    params
  })
}

function load(client: JSHandle<EmbedClient>, name: string, bytes: number[]): Promise<Reply> {
  return client.evaluate(
    (embedded, args) =>
      embedded.request('load', { name: args.name, data: new Uint8Array(args.bytes) }),
    { name, bytes }
  )
}

function events(client: JSHandle<EmbedClient>, name: string): Promise<Reply[]> {
  return client.evaluate(
    (embedded, event) => embedded.messages.filter((message) => message.event === event),
    name
  )
}

const embeddedFrame = (page: Page) => page.frameLocator('iframe[title="Embedded editor"]')

test.describe('embed mode', () => {
  // The first frame of the app a cold dev server serves takes most of a test's 15 s, which the
  // first test here used up before its own steps began. The shared setup boots the app once under
  // the boot budget, so each embed below loads an app the server has already built.
  useEditorSetup()

  test('the host shows its document read-only and drives the editor over the port', async ({
    page
  }) => {
    const { host, app } = await openHost(page)
    const client = await embed(page, `${app}/?test&embed&origin=${encodeURIComponent(host)}`)
    const frame = embeddedFrame(page)

    await expect.poll(() => events(client, 'connected')).toHaveLength(1)
    expect((await events(client, 'connected'))[0].data).toEqual({
      version: 1,
      editable: false,
      allowEdit: false
    })
    // The embed shows a bare canvas: no Home, tabs, or top bar, and the waiting overlay is gone.
    await expect(frame.getByTestId('canvas-element')).toBeVisible()
    await expect(frame.locator('[data-slot="embed-status"]')).toHaveCount(0)
    await expect(frame.getByTestId('tabbar-tab')).toHaveCount(0)

    const bytes = [...(await readFile('tests/fixtures/circle-text.fig'))]
    expect(await load(client, 'circle-text.fig', bytes)).toMatchObject({
      ok: true,
      result: { name: 'circle-text' }
    })
    const pages = await request(client, 'getPages')
    expect(pages.ok).toBe(true)

    // Selecting works read-only, and the host hears about it.
    await frame.getByTestId('canvas-element').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('ControlOrMeta+a')
    await expect
      .poll(async () => (await request(client, 'getSelection')).result)
      .not.toEqual({ nodeIds: [] })
    const selected = (await request(client, 'getSelection')).result
    await expect.poll(() => events(client, 'selectionchange')).not.toHaveLength(0)

    // Deleting does nothing in a read-only embed: the layers are still there to select.
    await page.keyboard.press('Delete')
    expect((await request(client, 'getSelection')).result).toEqual(selected)
    // `documentchange` comes 250 ms after edits settle, so the host waits well past that before
    // concluding that none is coming.
    await page.waitForTimeout(1000)
    expect(await events(client, 'documentchange')).toEqual([])

    // Editing needs the URL's permission, which this embed does not have.
    expect(await request(client, 'setEditable', { editable: true })).toMatchObject({
      ok: false,
      error: { code: 'edit-not-allowed' }
    })

    const image = await client.evaluate(async (embedded) => {
      const reply = await embedded.request('exportImage', { format: 'PNG', scale: 1 })
      const result = reply.result
      if (!reply.ok || typeof result !== 'object' || result === null || !('data' in result))
        return null
      return result.data instanceof Uint8Array ? [...result.data.subarray(0, 4)] : null
    })
    expect(image).toEqual([0x89, 0x50, 0x4e, 0x47])

    const document = await client.evaluate(async (embedded) => {
      const reply = await embedded.request('getDocument')
      const result = reply.result
      if (typeof result !== 'object' || result === null || !('data' in result)) return 0
      return result.data instanceof Uint8Array ? result.data.byteLength : 0
    })
    expect(document).toBeGreaterThan(0)

    expect(await request(client, 'launch-missiles')).toMatchObject({
      ok: false,
      error: { code: 'unknown-method' }
    })
  })

  test('a host the URL allows can edit, and hears about each change', async ({ page }) => {
    const { host, app } = await openHost(page)
    const client = await embed(
      page,
      `${app}/?test&embed&allow-edit&origin=${encodeURIComponent(host)}`,
      { editable: true }
    )
    const frame = embeddedFrame(page)
    await expect.poll(() => events(client, 'connected')).toHaveLength(1)
    expect((await events(client, 'connected'))[0].data).toMatchObject({
      editable: true,
      allowEdit: true
    })

    const bytes = [...(await readFile('tests/fixtures/circle-text.fig'))]
    expect((await load(client, 'circle-text.fig', bytes)).ok).toBe(true)
    await frame.getByTestId('canvas-element').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('ControlOrMeta+a')
    await expect
      .poll(async () => (await request(client, 'getSelection')).result)
      .not.toEqual({ nodeIds: [] })
    await page.keyboard.press('Delete')
    await expect.poll(() => events(client, 'documentchange')).not.toHaveLength(0)
    await expect
      .poll(async () => (await request(client, 'getSelection')).result)
      .toEqual({ nodeIds: [] })

    // The host can hand the document back to read-only at any time.
    expect(await request(client, 'setEditable', { editable: false })).toMatchObject({
      ok: true,
      result: { editable: false }
    })
    await expect.poll(() => events(client, 'editablechange')).toHaveLength(1)
  })

  test('`chrome` keeps the panels without a top bar, and no key opens or closes a tab', async ({
    page
  }) => {
    const warnings: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'warning') warnings.push(message.text())
    })
    const { host, app } = await openHost(page)
    const client = await embed(page, `${app}/?test&embed&chrome&origin=${encodeURIComponent(host)}`)
    const frame = embeddedFrame(page)
    await expect.poll(() => events(client, 'connected')).toHaveLength(1)

    await expect(frame.getByTestId('layers-panel')).toBeVisible()
    await openDesignPanel(frame)
    await expect(frame.getByTestId('properties-panel')).toBeVisible()
    await expect(frame.locator('[data-slot="top-bar"]')).toHaveCount(0)
    // The document's top-bar actions are not teleported into a top bar that is not there.
    expect(warnings.filter((text) => text.includes('Teleport'))).toEqual([])

    const bytes = [...(await readFile('tests/fixtures/circle-text.fig'))]
    expect((await load(client, 'circle-text.fig', bytes)).ok).toBe(true)
    await frame.getByTestId('canvas-element').click({ position: { x: 5, y: 5 } })
    for (const keys of ['ControlOrMeta+w', 'ControlOrMeta+t', 'ControlOrMeta+n']) {
      await page.keyboard.press(keys)
    }
    // The document the host loaded is still the one shown: no Home, New file tab, or new design.
    await expect(frame.getByTestId('canvas-element')).toBeVisible()
    const shown = await request(client, 'getPages')
    expect(shown.ok).toBe(true)
    expect(await request(client, 'getDocument')).toMatchObject({
      ok: true,
      result: { name: 'circle-text' }
    })
  })

  test('a page at another origin than the URL names cannot connect', async ({ page }) => {
    const { app } = await openHost(page)
    // The embed waits for https://elsewhere.example, so this host never hears `ready`, and its
    // `connect` is ignored.
    await page.evaluate(
      (src) =>
        new Promise<void>((resolve) => {
          const frame = document.createElement('iframe')
          frame.title = 'Embedded editor'
          frame.src = src
          frame.addEventListener('load', () => resolve(), { once: true })
          document.body.append(frame)
        }),
      `${app}/?test&embed&origin=${encodeURIComponent('https://elsewhere.example')}`
    )
    const status = embeddedFrame(page).locator('[data-slot="embed-status"]')
    await expect(status).toHaveAttribute('data-status', 'waiting', {
      timeout: EDITOR_BOOT_WAIT_MS
    })
    const answered = await page.evaluate(
      (embedOrigin) =>
        new Promise<boolean>((resolve) => {
          const frame = document.querySelector('iframe')
          const channel = new MessageChannel()
          channel.port1.addEventListener('message', () => resolve(true))
          channel.port1.start()
          frame?.contentWindow?.postMessage(
            { protocol: 'pairdraw-embed', type: 'connect', version: 1 },
            embedOrigin,
            [channel.port2]
          )
          // The session's first message would come within a frame or two of an accepted connect.
          setTimeout(() => resolve(false), 1000)
        }),
      app
    )
    expect(answered).toBe(false)
    await expect(status).toHaveAttribute('data-status', 'waiting')
  })

  test('a link without a valid origin explains that it cannot connect', async ({ page }) => {
    await page.goto('/?test&embed&origin=*')
    const status = page.locator('[data-slot="embed-status"]')
    await expect(status).toHaveAttribute('data-status', 'invalid-origin')
    await expect(status.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

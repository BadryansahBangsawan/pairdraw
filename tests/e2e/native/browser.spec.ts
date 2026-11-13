import { strict as assert } from 'node:assert'
import { createServer, type Server } from 'node:http'

import { invokeNative } from '#tests/helpers/tauri/invoke'

const PAGE = `<!doctype html>
<html><head><title>Native Browser Probe</title></head>
<body>
  <p id="state">ready</p>
  <button id="change">Change</button>
  <script>
    document.getElementById('change').addEventListener('click', () => {
      document.getElementById('state').textContent = 'clicked'
    })
  </script>
</body></html>`

let server: Server
let pageURL = ''

describe('native built-in browser', () => {
  before(async () => {
    server = createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      response.end(PAGE)
    })
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => resolve())
    })
    const address = server.address()
    assert.ok(address && typeof address === 'object')
    pageURL = `http://127.0.0.1:${address.port}/`
  })

  after(async () => {
    await invokeNative('browser_close').catch(() => undefined)
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it('loads a page the separate WebView shows and acts on it', async function () {
    this.timeout(120_000)
    await browser.waitUntil(
      async () => browser.execute(() => Boolean(window.openPencil?.getStore?.())),
      { timeout: 30_000, timeoutMsg: 'OpenPencil editor did not initialize' }
    )

    await invokeNative('browser_open', { url: pageURL })

    // The page is its own WebView: ask that window for its URL, title, and innerText until
    // the load finishes. One page round trip keeps the driver's per-command hook out of it.
    const page = (await browser.executeAsync((done) => {
      const core = window.__TAURI__?.core
      if (!core) {
        done({ error: 'native test requires app.withGlobalTauri' })
        return
      }
      const started = Date.now()
      const read = () => {
        void core
          .invoke<string>('browser_page_text')
          .then((raw) => {
            const value = JSON.parse(raw) as { url: string; title: string; text: string }
            if (value.title === 'Native Browser Probe' && value.text.includes('ready')) {
              done(value)
              return
            }
            if (Date.now() - started > 20_000) {
              done({ error: `page did not load: ${raw}` })
              return
            }
            setTimeout(read, 100)
          })
          .catch((error: unknown) => {
            if (Date.now() - started > 20_000) {
              done({ error: String(error) })
              return
            }
            setTimeout(read, 100)
          })
      }
      read()
    })) as { url?: string; title?: string; text?: string; error?: string }

    assert.equal(page.error, undefined)
    assert.equal(page.url, pageURL)
    assert.equal(page.title, 'Native Browser Probe')
    assert.match(page.text ?? '', /ready/)

    const result = await invokeNative<string>('browser_act', {
      kind: 'click',
      selector: '#change',
      text: '',
      key: '',
      dx: 0,
      dy: 0
    })
    assert.deepEqual(JSON.parse(result), { code: 'ok' })

    const after = (await browser.executeAsync((done) => {
      const core = window.__TAURI__?.core
      if (!core) {
        done({ error: 'native test requires app.withGlobalTauri' })
        return
      }
      const started = Date.now()
      const read = () => {
        void core
          .invoke<string>('browser_page_text')
          .then((raw) => {
            const value = JSON.parse(raw) as { text: string }
            if (value.text.includes('clicked')) {
              done({ text: value.text })
              return
            }
            if (Date.now() - started > 10_000) {
              done({ error: `click did not land: ${raw}` })
              return
            }
            setTimeout(read, 100)
          })
          .catch((error: unknown) => done({ error: String(error) }))
      }
      read()
    })) as { text?: string; error?: string }

    assert.equal(after.error, undefined)
    assert.match(after.text ?? '', /clicked/)
  })

  it('refuses an address the window does not open', async () => {
    await assert.rejects(
      invokeNative('browser_open', { url: 'file:///etc/hosts' }),
      /http and https addresses only/
    )
  })
})

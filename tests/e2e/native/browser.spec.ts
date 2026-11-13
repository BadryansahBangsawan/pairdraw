import { strict as assert } from 'node:assert'
import { createServer, type Server } from 'node:http'

import * as v from 'valibot'

import { invokeNative } from '#tests/helpers/tauri/invoke'

const pageReportSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.object({ url: v.string(), title: v.string(), text: v.string() })
)

const pageTextSchema = v.pipe(v.string(), v.parseJson(), v.object({ text: v.string() }))

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
    await new Promise<void>((resolve) => {
      server.close(() => {
        resolve()
      })
    })
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
      const read = async () => {
        try {
          const raw = await core.invoke<string>('browser_page_text')
          if (raw.includes('"title":"Native Browser Probe"') && raw.includes('"text":"ready')) {
            done({ raw })
            return
          }
          if (Date.now() - started > 20_000) {
            done({ error: `page did not load: ${raw}` })
            return
          }
          setTimeout(() => {
            void read()
          }, 100)
        } catch (error) {
          if (Date.now() - started > 20_000) {
            done({ error: String(error) })
            return
          }
          setTimeout(() => {
            void read()
          }, 100)
        }
      }
      void read()
    })) as { raw?: string; error?: string }

    assert.equal(page.error, undefined)
    assert.ok(page.raw)
    const report = v.parse(pageReportSchema, page.raw)
    assert.equal(report.url, pageURL)
    assert.equal(report.title, 'Native Browser Probe')
    assert.match(report.text, /ready/)

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
      const read = async () => {
        try {
          const raw = await core.invoke<string>('browser_page_text')
          if (raw.includes('"text":"clicked')) {
            done({ raw })
            return
          }
          if (Date.now() - started > 10_000) {
            done({ error: `click did not land: ${raw}` })
            return
          }
          setTimeout(() => {
            void read()
          }, 100)
        } catch (error) {
          done({ error: String(error) })
        }
      }
      void read()
    })) as { raw?: string; error?: string }

    assert.equal(after.error, undefined)
    assert.ok(after.raw)
    assert.match(v.parse(pageTextSchema, after.raw).text, /clicked/)
  })

  it('refuses an address the window does not open', async () => {
    await assert.rejects(
      invokeNative('browser_open', { url: 'file:///etc/hosts' }),
      /http and https addresses only/
    )
  })
})

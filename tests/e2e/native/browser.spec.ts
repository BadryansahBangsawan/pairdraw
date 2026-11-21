import { strict as assert } from 'node:assert'
import { createServer, type Server } from 'node:http'

import { toUint8Array } from 'js-base64'
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

/**
 * A page several screens tall: a block at the top-left an element pick can land on, and a black
 * band that ends the page, so a picture that stops short of the end shows no black at its bottom.
 */
const TALL_PAGE = `<!doctype html>
<html><head><title>Native Browser Tall</title>
<style>body { margin: 0 } #target { position: absolute; left: 0; top: 0; width: 240px; height: 120px; background: #1e88e5 }</style>
</head>
<body>
  <div id="target">Pick me</div>
  <div style="height: 3000px; background: linear-gradient(#e53935, #3949ab)"></div>
  <div id="end" style="height: 40px; background: #000; color: #fff">end of page</div>
</body></html>`

/** The page refuses every script and every DOM write a string could make. */
const STRICT_HEADERS = {
  'content-security-policy':
    "script-src 'none'; require-trusted-types-for 'script'; trusted-types 'none'"
}

let server: Server
let pageURL = ''

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

interface Picture {
  width: number
  height: number
  /** RGBA of the middle of the bottom row. */
  bottom: number[]
}

/**
 * A browser screenshot, decoded in the editor's WebView. For `element`, the page's `#target` is
 * clicked once the pick is waiting; the click lands at the top-left, where the pick reads it.
 */
async function takePicture(kind: 'visible' | 'full' | 'element'): Promise<Picture> {
  const taken = (await browser.executeAsync((kind, done) => {
    const core = window.__TAURI__?.core
    if (!core) {
      done({ error: 'native test requires app.withGlobalTauri' })
      return
    }
    const shot = core.invoke<string>('browser_screenshot', { kind })
    if (kind === 'element') {
      setTimeout(() => {
        void core.invoke('browser_act', {
          kind: 'click',
          selector: '#target',
          text: '',
          key: '',
          dx: 0,
          dy: 0
        })
      }, 500)
    }
    const decode = async () => {
      const encoded = await shot
      const image = await createImageBitmap(
        await (await fetch(`data:image/png;base64,${encoded}`)).blob()
      )
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('no 2D context')
      context.drawImage(image, 0, 0)
      const bottom = Array.from(
        context.getImageData(Math.floor(image.width / 2), image.height - 1, 1, 1).data
      )
      return { encoded, width: image.width, height: image.height, bottom }
    }
    const run = async () => {
      try {
        done(await decode())
      } catch (error) {
        done({ error: String(error) })
      }
    }
    void run()
  }, kind)) as Partial<Picture> & { encoded?: string; error?: string }
  assert.equal(taken.error, undefined, `${kind} picture`)
  assert.ok(taken.encoded && taken.width && taken.height && taken.bottom)
  assert.deepEqual(Array.from(toUint8Array(taken.encoded).subarray(0, 8)), PNG_SIGNATURE)
  return { width: taken.width, height: taken.height, bottom: taken.bottom }
}

/** Waits until the browser window reports the page with `title`. */
async function waitForBrowserTitle(title: string): Promise<void> {
  const reported = (await browser.executeAsync((title, done) => {
    const core = window.__TAURI__?.core
    if (!core) {
      done({ error: 'native test requires app.withGlobalTauri' })
      return
    }
    const started = Date.now()
    const read = async () => {
      const raw = await core.invoke<string>('browser_page_text').catch(String)
      if (raw.includes(`"title":"${title}"`)) {
        done({})
        return
      }
      if (Date.now() - started > 20_000) {
        done({ error: `page did not load: ${raw}` })
        return
      }
      setTimeout(() => {
        void read()
      }, 100)
    }
    void read()
  }, title)) as { error?: string }
  assert.equal(reported.error, undefined)
}

describe('native built-in browser', () => {
  before(async () => {
    server = createServer((request, response) => {
      const tall = request.url?.startsWith('/tall') === true
      const strict = request.url === '/tall-strict'
      response.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        ...(strict ? STRICT_HEADERS : {})
      })
      response.end(tall ? TALL_PAGE : PAGE)
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
      async () => browser.execute(() => Boolean(window.pairdraw?.getStore?.())),
      { timeout: 30_000, timeoutMsg: 'Pairdraw editor did not initialize' }
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

  it('takes a picture of the view, the whole page, and a picked element', async function () {
    this.timeout(120_000)
    await invokeNative('browser_navigate', { url: new URL('/tall', pageURL).href })
    await waitForBrowserTitle('Native Browser Tall')

    // The view's last row is the page, not an empty strip below the viewport.
    const view = await takePicture('visible')
    assert.ok(view.height < view.width * 2, `the view is ${view.width}x${view.height}`)
    assert.ok(
      view.bottom.slice(0, 3).some((channel) => channel < 200),
      `the bottom of the view is ${view.bottom.join(',')}`
    )

    // The page is 3040 points tall in a window 1024 wide. The picture holds all of it, down to
    // the black band that ends the page.
    const page = await takePicture('full')
    assert.equal(page.width, view.width)
    assert.equal(page.height * 1024, page.width * 3040, `the page is ${page.width}x${page.height}`)
    assert.ok(
      page.bottom.slice(0, 3).every((channel) => channel < 40),
      `the bottom of the page is ${page.bottom.join(',')}`
    )

    // The view is the size it was before the full-page picture.
    const after = await takePicture('visible')
    assert.deepEqual([after.width, after.height], [view.width, view.height])

    // At 125% the page is 3800 points tall, still in one picture to its end.
    await invokeNative('browser_set_zoom', { percent: 125 })
    try {
      const zoomed = await takePicture('full')
      const expected = (zoomed.width * 3040 * 1.25) / 1024
      assert.ok(
        Math.abs(zoomed.height - expected) < expected * 0.01,
        `the zoomed page is ${zoomed.width}x${zoomed.height}`
      )
      assert.ok(
        zoomed.bottom.slice(0, 3).every((channel) => channel < 40),
        `the bottom of the zoomed page is ${zoomed.bottom.join(',')}`
      )
    } finally {
      await invokeNative('browser_set_zoom', { percent: 100 })
    }

    // 240x120 points at the screen's scale, all of it the block's blue.
    const picked = await takePicture('element')
    assert.equal(picked.width, picked.height * 2)
    assert.ok(picked.width >= 240, `the element is ${picked.width}x${picked.height}`)
    const [red, green, blue] = picked.bottom
    assert.ok(red < 80 && green > 100 && blue > 180, `the element is ${picked.bottom.join(',')}`)
  })

  it('imports the page, also when its policy refuses scripts', async function () {
    this.timeout(60_000)
    for (const path of ['/tall', '/tall-strict']) {
      await invokeNative('browser_navigate', { url: new URL(path, pageURL).href })
      await waitForBrowserTitle('Native Browser Tall')
      const html = await invokeNative<string>('browser_capture_page')
      assert.match(html, /end of page/, `${path} capture`)
    }
  })

  it('refuses an address the window does not open', async () => {
    await assert.rejects(
      invokeNative('browser_open', { url: 'file:///etc/hosts' }),
      /http and https addresses only/
    )
  })
})

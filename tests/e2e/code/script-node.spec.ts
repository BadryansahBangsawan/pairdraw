import type { exportFigFile as ExportFigFile } from '@pairdraw/core/io/formats/fig'
import type { SceneGraph } from '@pairdraw/scene-graph'
import type {
  PAIRDRAW_PLUGIN_DATA as PluginDataFields,
  readPluginData as ReadPluginData,
  withPluginData as WithPluginData
} from '@pairdraw/scene-graph/plugin-data'

import { expect, test, useFreshEditor } from '#tests/e2e/fixtures'
import { openAppMenu } from '#tests/helpers/menu'

type PluginDataModule = {
  readPluginData: typeof ReadPluginData
  withPluginData: typeof WithPluginData
  PAIRDRAW_PLUGIN_DATA: typeof PluginDataFields
}

const editor = useFreshEditor()

/** Types of the selected script layer's children, as the canvas graph holds them. */
function scriptOutputTypes(): Promise<string[]> {
  return editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const node = store.graph.getNode([...store.state.selectedIds][0] ?? '')
    if (!node) return []
    return node.childIds.map((id) => store.graph.getNode(id)?.type ?? 'MISSING')
  })
}

/** Names of the selected script layer's children. */
function scriptChildNames(): Promise<string[]> {
  return editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const node = store.graph.getNode([...store.state.selectedIds][0] ?? '')
    if (!node) return []
    return node.childIds.map((id) => store.graph.getNode(id)?.name ?? 'MISSING')
  })
}

/** The Design panel section a script layer owns, found by its label. */
function scriptSection() {
  return editor.page.getByRole('region', { name: 'Script layer', exact: true })
}

test('Insert Script places a script layer whose starter program draws and runs again', async () => {
  const object = await openAppMenu(editor.page, 'Object')
  await object.getByRole('menuitem', { name: 'Insert Script…' }).click()

  const section = scriptSection()
  await expect(section).toBeVisible()
  const source = section.getByTestId('script-source')
  await expect(source).toHaveValue(/pencil\.frame/)
  await expect(editor.page.getByTestId('script-error')).toHaveCount(0)

  // The starter run draws through the sandbox iframe, so its layers arrive after insert.
  await expect.poll(() => scriptOutputTypes()).toEqual(['FRAME'])
})

test('a failing script shows its error in the panel and on the layer', async () => {
  const object = await openAppMenu(editor.page, 'Object')
  await object.getByRole('menuitem', { name: 'Insert Script…' }).click()

  const section = scriptSection()
  await section.getByTestId('script-source').fill('throw new Error("boom")')
  await section.getByTestId('script-source').blur()

  const error = editor.page.getByTestId('script-error')
  await expect(error).toContainText('boom')

  await expect.poll(() => scriptChildNames()).toEqual(['Script error'])
})

/** How long a resize or an input edit waits before it runs a script on its own. */
const SCRIPT_LIVE_DEBOUNCE_MS = 300

/** A rect this name is the sign that the source actually ran. */
const OPEN_MARKER = 'GVOpenMarker'

/** A rect this name is the sign that a script after a timed-out one still ran. */
const AFTER_LOOP_MARKER = 'GVAfterLoop'

const SCRIPT_PROBE = 'https://gv-script-probe.invalid/leak'
const WORKER_PROBE = 'https://gv-worker-probe.invalid/leak'
const APP_DB = 'gv-app-store'
const APP_CACHE = 'gv-app-cache'
const APP_SECRET = 'APP_SECRET_GV'
const APP_CACHE_BODY = 'APP_CACHE_GV'

/** Every layer name in the open document. */
function layerNames(): Promise<string[]> {
  return editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    return [...store.graph.nodes.values()].map((node) => node.name)
  })
}

/** Text a script drew, which is how a run reports what it managed to reach. */
function drawnText(): Promise<string[]> {
  return editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    return [...store.graph.nodes.values()].flatMap((node) => (node.text ? [node.text] : []))
  })
}

/**
 * Writes `source` onto a new script layer and selects it, without asking it to run. Creating the
 * layer is not a run; Run is a separate click.
 */
async function placeScript(source: string) {
  await editor.page.evaluate(async (nextSource) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const pluginDataURL = '/packages/scene-graph/src/plugin-data/index.ts'
    const pluginData = (await import(/* @vite-ignore */ pluginDataURL)) as PluginDataModule
    const node = store.graph.createNode('SCRIPT', store.state.currentPageId, {
      name: 'Probe',
      x: 40,
      y: 40,
      width: 320,
      height: 200,
      pluginData: pluginData.withPluginData([], pluginData.PAIRDRAW_PLUGIN_DATA.script, {
        version: 1,
        source: nextSource
      })
    })
    store.select([node.id])
  }, source)
}

test('opening a document that already holds a script does not run it', async () => {
  test.setTimeout(60_000)
  const bytes = await editor.page.evaluate(async () => {
    const pluginDataURL = '/packages/scene-graph/src/plugin-data/index.ts'
    const sceneGraphURL = '/packages/scene-graph/src/index.ts'
    const figExportURL = '/packages/core/src/io/formats/fig/index.ts'
    const pluginData = (await import(/* @vite-ignore */ pluginDataURL)) as PluginDataModule
    const { SceneGraph: SceneGraphCtor } = (await import(/* @vite-ignore */ sceneGraphURL)) as {
      SceneGraph: new () => SceneGraph
    }
    const { exportFigFile } = (await import(/* @vite-ignore */ figExportURL)) as {
      exportFigFile: typeof ExportFigFile
    }
    const graph = new SceneGraphCtor()
    const page = graph.getPages()[0]
    if (!page) throw new Error('The script fixture has no page')
    graph.createNode('SCRIPT', page.id, {
      name: 'Dormant',
      x: 40,
      y: 40,
      width: 200,
      height: 120,
      pluginData: pluginData.withPluginData([], pluginData.PAIRDRAW_PLUGIN_DATA.script, {
        version: 1,
        source:
          "return pencil.rect({ name: 'GVOpenMarker', width: 32, height: 32, fill: '#ff00aa' })"
      })
    })
    return [...(await exportFigFile(graph))]
  })

  const opened = await editor.page.evaluate(async (saved) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    await store.openFigFile(new File([new Uint8Array(saved)], 'dormant-script.fig'))
    const pluginDataURL = '/packages/scene-graph/src/plugin-data/index.ts'
    const pluginData = (await import(/* @vite-ignore */ pluginDataURL)) as PluginDataModule
    const script = [...store.graph.nodes.values()].find((node) => node.type === 'SCRIPT')
    const data = script
      ? pluginData.readPluginData(script.pluginData, pluginData.PAIRDRAW_PLUGIN_DATA.script)
      : undefined
    return {
      source: data?.source ?? '',
      children: script?.childIds.map((id) => store.graph.getNode(id)?.name ?? 'MISSING') ?? []
    }
  }, bytes)

  expect(opened.source).toContain(OPEN_MARKER)
  // The live watcher waits 300ms after a resize or new inputs. Opening has to stay idle past that.
  await editor.page.waitForTimeout(SCRIPT_LIVE_DEBOUNCE_MS + 2_000)
  expect(await layerNames()).not.toContain(OPEN_MARKER)
  const stillIdle = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const script = [...store.graph.nodes.values()].find((node) => node.type === 'SCRIPT')
    return script?.childIds.map((id) => store.graph.getNode(id)?.name ?? 'MISSING') ?? ['NO SCRIPT']
  })
  expect(stillIdle).toEqual([])

  await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const script = [...store.graph.nodes.values()].find((node) => node.type === 'SCRIPT')
    if (!script) throw new Error('Opened document has no script node')
    store.select([script.id])
  })
  await scriptSection().getByTestId('script-run').click()
  await expect.poll(() => layerNames()).toContain(OPEN_MARKER)
})

test('an endless loop ends in the host timeout and a later script still runs', async () => {
  test.setTimeout(60_000)
  await placeScript('while (true) {}')
  const section = scriptSection()
  await expect(section).toBeVisible()

  const started = Date.now()
  await section.getByTestId('script-run').click()
  const error = editor.page.getByTestId('script-error')
  await expect(error).toContainText('Script timed out.', { timeout: 12_000 })
  const elapsed = Date.now() - started
  expect(elapsed).toBeLessThan(8_000)
  await expect(editor.page.getByTestId('editor-root')).toBeVisible()
  await expect(section.getByTestId('script-run')).toBeEnabled()

  await section
    .getByTestId('script-source')
    .fill(
      `return pencil.rect({ name: '${AFTER_LOOP_MARKER}', width: 20, height: 20, fill: '#00cc66' })`
    )
  await section.getByTestId('script-source').blur()
  await expect.poll(() => layerNames(), { timeout: 12_000 }).toContain(AFTER_LOOP_MARKER)
  await expect(editor.page.getByTestId('editor-root')).toBeVisible()
})

test('a script cannot reach the network or the app storage', async () => {
  test.setTimeout(60_000)
  const requests: string[] = []
  editor.page.on('request', (request) => {
    const url = request.url()
    if (url.includes('gv-script-probe.invalid') || url.includes('gv-worker-probe.invalid')) {
      requests.push(url)
    }
  })

  await editor.page.evaluate(
    async ({ dbName, cacheName, secret, cacheBody }) => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(dbName)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
        request.onblocked = () => resolve()
      })
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(dbName, 1)
        request.onerror = () => reject(request.error)
        request.onupgradeneeded = () => {
          request.result.createObjectStore('kv', { keyPath: 'id' })
        }
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction('kv', 'readwrite')
          tx.objectStore('kv').put({ id: 'sentinel', secret })
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
        }
      })
      await caches.delete(cacheName)
      const cache = await caches.open(cacheName)
      await cache.put('https://app-cache.invalid/secret', new Response(cacheBody))
    },
    {
      dbName: APP_DB,
      cacheName: APP_CACHE,
      secret: APP_SECRET,
      cacheBody: APP_CACHE_BODY
    }
  )

  const workerSource = `
    void (async () => {
      try {
        await fetch(${JSON.stringify(WORKER_PROBE)})
      } catch {
        // A blocked fetch is the result; the page watches the request list.
      }
      try {
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open(${JSON.stringify(APP_DB)})
          request.onerror = () => reject(request.error)
          request.onsuccess = () => resolve(request.result)
        })
        if (db.objectStoreNames.contains('kv')) {
          await new Promise((resolve) => {
            const tx = db.transaction('kv', 'readwrite')
            const store = tx.objectStore('kv')
            const read = store.get('sentinel')
            read.onerror = () => resolve('error')
            read.onsuccess = () => {
              store.put({ id: 'script-wrote', secret: 'from-script' })
              resolve('done')
            }
          })
        }
      } catch {
        // Opening the database failed closed.
      }
      try {
        const cache = await caches.open(${JSON.stringify(APP_CACHE)})
        await cache.put('https://app-cache.invalid/script', new Response('from-script'))
      } catch {
        // Cache storage failed closed.
      }
    })()
  `
  // The host runs the body synchronously, so the parent waits in place while the nested worker,
  // which has its own event loop, tries the network and the app's storage.
  const source = `
    let fetchState = 'reached'
    try {
      fetch(${JSON.stringify(SCRIPT_PROBE)})
    } catch {
      fetchState = 'blocked'
    }
    let workerState = 'started'
    try {
      const blob = new Blob([${JSON.stringify(workerSource)}], { type: 'text/javascript' })
      new Worker(URL.createObjectURL(blob))
    } catch {
      workerState = 'blocked'
    }
    let idbState = 'started'
    try {
      indexedDB.open(${JSON.stringify(APP_DB)})
    } catch {
      idbState = 'blocked'
    }
    let cacheState = 'started'
    try {
      void caches.open(${JSON.stringify(APP_CACHE)})
    } catch {
      cacheState = 'blocked'
    }
    const start = Date.now()
    while (Date.now() - start < 1000) {}
    return pencil.text({
      name: 'Isolation',
      text: fetchState + '|' + workerState + '|' + idbState + '|' + cacheState,
      width: 640,
      height: 40
    })
  `
  await placeScript(source)
  const section = scriptSection()
  await expect(section).toBeVisible()
  await section.getByTestId('script-run').click()
  await expect
    .poll(() => drawnText(), { timeout: 12_000 })
    .toEqual(expect.arrayContaining([expect.stringMatching(/^blocked\|/)]))

  const storage = await editor.page.evaluate(
    async ({ dbName, cacheName }) => {
      const ids = await new Promise<string[]>((resolve, reject) => {
        const request = indexedDB.open(dbName)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          if (!db.objectStoreNames.contains('kv')) {
            db.close()
            resolve([])
            return
          }
          const read = db.transaction('kv', 'readonly').objectStore('kv').getAll()
          read.onerror = () => reject(read.error)
          read.onsuccess = () => {
            const rows: unknown = read.result
            db.close()
            resolve(
              Array.isArray(rows)
                ? rows.flatMap((row) =>
                    typeof row === 'object' &&
                    row !== null &&
                    'id' in row &&
                    typeof row.id === 'string'
                      ? [row.id]
                      : []
                  )
                : []
            )
          }
        }
      })
      const cache = await caches.open(cacheName)
      const keys = await cache.keys()
      const secret = await cache.match('https://app-cache.invalid/secret')
      return {
        ids,
        cacheUrls: keys.map((key) => key.url),
        cacheBody: secret ? await secret.text() : null
      }
    },
    { dbName: APP_DB, cacheName: APP_CACHE }
  )

  expect(requests).toEqual([])
  expect(storage.ids).toEqual(['sentinel'])
  expect(storage.cacheUrls).toEqual(['https://app-cache.invalid/secret'])
  expect(storage.cacheBody).toBe(APP_CACHE_BODY)
  expect(await drawnText()).not.toEqual(
    expect.arrayContaining([expect.stringContaining(APP_SECRET)])
  )
  expect(await drawnText()).not.toEqual(
    expect.arrayContaining([expect.stringContaining(APP_CACHE_BODY)])
  )
})

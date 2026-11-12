import type { Browser, Page } from '@playwright/test'

import { expect, test } from '#tests/e2e/fixtures'
import { CanvasHelper } from '#tests/helpers/canvas'

/** A deterministic chart: no `Math.random`, so every run draws the same pixels. */
const CHART = `return pencil.frame({ name: 'Chart', width: 320, height: 200 }, [
  pencil.rect({ name: 'Background', width: 320, height: 200, radius: 12, fill: '#ffffff' }),
  pencil.text({
    name: 'Caption',
    x: 24,
    y: 24,
    width: 240,
    height: 24,
    text: 'Weekly builds',
    fontSize: 18,
    fill: '#111827'
  }),
  pencil.rect({ name: 'Bar 1', x: 24, y: 112, width: 40, height: 64, radius: 6, fill: '#5b73f2' }),
  pencil.rect({ name: 'Bar 2', x: 80, y: 96, width: 40, height: 80, radius: 6, fill: '#a5b4fc' }),
  pencil.rect({ name: 'Bar 3', x: 136, y: 128, width: 40, height: 48, radius: 6, fill: '#5b73f2' }),
  pencil.rect({ name: 'Bar 4', x: 192, y: 64, width: 40, height: 112, radius: 6, fill: '#a5b4fc' })
])`

/**
 * Opens a fresh editor page. The page is created inside the test rather than in a hook, because a
 * cold dev server's first load transforms the whole app and outruns the suite's 15 s hook budget.
 */
async function openEditor(browser: Browser): Promise<{ page: Page; canvas: CanvasHelper }> {
  test.setTimeout(90_000)
  const page = await browser.newPage()
  await page.goto('/?test&no-rulers')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  return { page, canvas }
}

/**
 * Runs `source` on a script layer through the same entry point the panel uses, deselects it so the
 * snapshot shows the drawing rather than its handles, and returns the names the run left behind.
 */
async function runScript(page: Page, source: string): Promise<string[]> {
  return page.evaluate(async (nextSource: string) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const createURL = '/src/app/code/script/create.ts'
    const runURL = '/src/app/code/script/run-node.ts'
    const { setScriptSource } = (await import(/* @vite-ignore */ createURL)) as {
      setScriptSource: (target: unknown, id: string, source: string) => void
    }
    const { runScriptNode } = (await import(/* @vite-ignore */ runURL)) as {
      runScriptNode: (graph: unknown, id: string, pageId: string) => Promise<unknown>
    }

    const pageId = store.state.currentPageId
    const node = store.graph.createNode('SCRIPT', pageId, {
      name: 'Script',
      x: 40,
      y: 40,
      width: 340,
      height: 220
    })
    setScriptSource(store, node.id, nextSource)
    await runScriptNode(store.graph, node.id, pageId)
    store.clearSelection()
    store.requestRender()
    const children = store.graph.getNode(node.id)?.childIds ?? []
    return children.map((childId) => store.graph.getNode(childId)?.name ?? 'MISSING')
  }, source)
}

test('a script draws its layers on the canvas', async ({ browser }) => {
  const { page, canvas } = await openEditor(browser)
  expect(await runScript(page, CHART)).toEqual(['Chart'])
  await canvas.waitForRender()
  canvas.assertNoErrors()
  expect(await canvas.screenshotCanvasRegion()).toMatchSnapshot('script-output.png')
  await page.close()
})

test('a failing script draws its error on the layer', async ({ browser }) => {
  const { page, canvas } = await openEditor(browser)
  expect(await runScript(page, 'throw new Error("boom")')).toEqual(['Script error'])
  await canvas.waitForRender()
  canvas.assertNoErrors()
  expect(await canvas.screenshotCanvasRegion()).toMatchSnapshot('script-error.png')
  await page.close()
})

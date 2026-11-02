import type { Download } from '@playwright/test'
import { strFromU8, unzipSync } from 'fflate'
import { toUint8Array } from 'js-base64'

import type { ExportSetting } from '@open-pencil/scene-graph'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { propertyItems } from '#tests/helpers/properties'

const editor = useEditorSetupWithClear('/?test&no-rulers')

/** A 1×1 PNG, so the card has an image that HTML can embed or write beside the page. */
const PIXEL_PNG = [
  ...toUint8Array(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
  )
]

function exportButton() {
  return editor.page.getByTestId('export-button')
}

function exportItems() {
  return propertyItems(editor.page, 'exportSettings')
}

/**
 * The app prefers the File System Access save dialog, which never resolves in a headless browser;
 * without it the export downloads, which Playwright captures.
 */
async function forceBlobDownload() {
  await editor.page.evaluate(() => {
    window.showSaveFilePicker = undefined
  })
}

async function downloadedBytes(download: Download): Promise<Uint8Array> {
  const { readFile } = await import('node:fs/promises')
  return new Uint8Array(await readFile(await download.path()))
}

/** A card with a photo, selected, with the export settings under test. */
async function createCard(settings: ExportSetting[]) {
  await editor.page.evaluate(
    ({ nodeSettings, png }) => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('OpenPencil store not initialized')
      const id = store.createShape('FRAME', 100, 100, 200, 120)
      store.graph.updateNode(id, { name: 'Pricing card', exportSettings: nodeSettings })
      store.graph.images.set('pixel', new Uint8Array(png))
      store.graph.createNode('RECTANGLE', id, {
        name: 'Photo',
        width: 40,
        height: 40,
        fills: [
          {
            type: 'IMAGE',
            imageHash: 'pixel',
            imageScaleMode: 'FILL',
            color: { r: 0, g: 0, b: 0, a: 0 },
            opacity: 1,
            visible: true
          }
        ]
      })
      store.select([id])
      store.requestRender()
    },
    { nodeSettings: settings, png: PIXEL_PNG }
  )
  await editor.canvas.waitForRender()
}

test.beforeEach(async () => {
  await forceBlobDownload()
})

test('HTML export writes layer names and leaves layer IDs out by default', async () => {
  await createCard([{ scale: 1, format: 'html' }])

  const [download] = await Promise.all([
    editor.page.waitForEvent('download'),
    exportButton().click()
  ])
  expect(download.suggestedFilename()).toBe('Pricing card.html')
  const html = strFromU8(await downloadedBytes(download))
  expect(html).toContain('<!doctype html>')
  expect(html).toContain('data-name="Pricing card"')
  expect(html).not.toContain('data-open-pencil-node-id')
  expect(html).toContain('data:image/png;base64,')
  editor.canvas.assertNoErrors()
})

test('a JPG row takes a quality, saved with the layer', async () => {
  await createCard([{ scale: 1, format: 'jpg' }])

  const quality = exportItems().first().getByRole('spinbutton', { name: 'Quality' })
  await expect(quality).toHaveCount(1)
  await quality.dblclick()
  await editor.page.keyboard.press('ControlOrMeta+A')
  await editor.page.keyboard.type('55')
  await editor.page.keyboard.press('Enter')

  await expect
    .poll(() =>
      editor.page.evaluate(() => {
        const store = window.openPencil?.getStore?.()
        const id = [...(store?.state.selectedIds ?? [])][0]
        return id ? store?.graph.getNode(id)?.exportSettings : undefined
      })
    )
    .toEqual([{ scale: 1, format: 'jpg', quality: 55 }])
  await expect(quality).toHaveAttribute('aria-valuenow', '55')

  const [download] = await Promise.all([
    editor.page.waitForEvent('download'),
    exportButton().click()
  ])
  expect(download.suggestedFilename()).toBe('Pricing card@1x.jpg')
  editor.canvas.assertNoErrors()
})

/** The width in points of each page of a PDF, in order. */
function pageWidths(bytes: Uint8Array): number[] {
  const text = new TextDecoder('latin1').decode(bytes)
  return [...text.matchAll(/\/MediaBox\s*\[\s*[\d.]+\s+[\d.]+\s+([\d.]+)/g)].map((match) =>
    Math.round(Number(match[1]))
  )
}

test('a PDF row exports several selected layers as one PDF in selection order', async () => {
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const ids = [320, 480, 640].map((width, index) => {
      const id = store.createShape('FRAME', index * 700, 0, width, 180)
      store.graph.updateNode(id, {
        name: `Slide ${index + 1}`,
        exportSettings: [{ scale: 1, format: 'pdf' }]
      })
      return id
    })
    const [first, second, third] = ids
    // Selected last to first, which the PDF's pages follow.
    store.select([third, first, second])
    store.requestRender()
  })
  await editor.canvas.waitForRender()

  await expect(editor.page.getByTestId('export-pdf-pages')).toBeVisible()
  const [download] = await Promise.all([
    editor.page.waitForEvent('download'),
    exportButton().click()
  ])
  expect(download.suggestedFilename()).toMatch(/\.pdf$/)
  expect(pageWidths(await downloadedBytes(download))).toEqual([640, 320, 480])
  editor.canvas.assertNoErrors()
})

test('the Code panel exports the selection as HTML', async () => {
  await createCard([])
  await editor.page.getByTestId('properties-tab-code').click()
  await editor.page.getByTestId('code-panel-source').click()
  await editor.page.getByRole('option', { name: 'HTML' }).click()

  const [download] = await Promise.all([
    editor.page.waitForEvent('download'),
    editor.page.getByTestId('code-panel-export-html').click()
  ])
  expect(download.suggestedFilename()).toBe('Pricing card.html')
  expect(strFromU8(await downloadedBytes(download))).toContain('data-name="Pricing card"')
  editor.canvas.assertNoErrors()
})

test('Vue components draw icons from the chosen package', async () => {
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const card = store.createShape('FRAME', 100, 100, 120, 40)
    store.graph.updateNode(card, { name: 'Card', layoutMode: 'HORIZONTAL' })
    const icon = store.graph.createNode('FRAME', card, { name: 'bell', width: 16, height: 16 })
    store.graph.updateNode(icon.id, {
      pluginData: [
        { pluginId: 'open-pencil', key: 'icon', value: JSON.stringify({ name: 'lucide:bell' }) }
      ]
    })
    store.graph.createNode('VECTOR', icon.id, { name: 'path', width: 16, height: 16 })
    store.select([card])
    store.requestRender()
  })
  await editor.canvas.waitForRender()
  await editor.page.getByTestId('properties-tab-code').click()
  await editor.page.getByTestId('code-panel-source').click()
  await editor.page.getByRole('option', { name: 'Vue' }).click()

  const code = editor.page.locator('[data-slot="code-editor"] .cm-content')
  await expect(code).toContainText('@iconify/vue')
  await editor.page.getByTestId('code-panel-icon-package').click()
  await editor.page.getByRole('option', { name: 'Lucide' }).click()
  await expect(code).toContainText('lucide-vue-next')
  await expect(code).toContainText('<LucideBell')
  editor.canvas.assertNoErrors()
})

// Last, since the HTML settings it changes are remembered for every later export.
test('HTML export options make a fragment with separate image files in a zip', async () => {
  await createCard([{ scale: 1, format: 'html' }])
  await editor.page.getByTestId('properties-tab-design').click()

  await exportItems().first().getByTestId('html-export-options').click()
  const popover = editor.page.getByTestId('html-export-options-popover')
  await expect(popover).toBeVisible()
  await popover.getByRole('switch', { name: 'Include HTML scaffold' }).click()
  await popover.getByText('Separate files').click()
  await popover.getByRole('switch', { name: 'Layer IDs as attributes' }).click()
  await editor.page.keyboard.press('Escape')

  const [download] = await Promise.all([
    editor.page.waitForEvent('download'),
    exportButton().click()
  ])
  expect(download.suggestedFilename()).toBe('Pricing card.zip')
  const files = unzipSync(await downloadedBytes(download))
  expect(Object.keys(files).sort()).toEqual([
    'Pricing card.assets/images/image-1.png',
    'Pricing card.html'
  ])
  const html = strFromU8(files['Pricing card.html'] ?? new Uint8Array())
  expect(html).not.toContain('<!doctype html>')
  expect(html).toContain('Pricing card.assets/images/image-1.png')
  expect(html).toContain('data-open-pencil-node-id')
  editor.canvas.assertNoErrors()
})

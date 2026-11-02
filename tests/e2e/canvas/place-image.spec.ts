import { toUint8Array } from 'js-base64'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { openAppMenu } from '#tests/helpers/menu'
import { getPageChildren, getSelectedIds } from '#tests/helpers/store'

const editor = useEditorSetupWithClear('/?test&no-rulers')

/** A file as the picker is given it. */
interface FilePayload {
  name: string
  mimeType: string
  buffer: Buffer
}

/** A 1 × 1 PNG. */
const PNG = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
)
const SVG =
  '<svg width="40" height="20" viewBox="0 0 40 20"><rect width="40" height="20" fill="#0c8"/></svg>'

const IMAGES: FilePayload[] = [
  { name: 'mark.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(SVG) },
  { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from(PNG) }
]

function placeImageButton() {
  return editor.page.getByTestId('toolbar').getByRole('button', { name: 'Place image…' })
}

/** Runs `open`, which should show the file picker, and picks `files` in it. */
async function pickFiles(open: () => Promise<void>, files: FilePayload[]) {
  const chooser = editor.page.waitForEvent('filechooser')
  await open()
  const picker = await chooser
  expect(picker.isMultiple()).toBe(true)
  await picker.setFiles(files)
}

function placed() {
  return editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    return {
      nodes: store.graph
        .getChildren(store.state.currentPageId)
        .map((node) => ({ name: node.name, type: node.type })),
      undoLabel: store.undo.undoLabel
    }
  })
}

test('the toolbar places picked images and SVG files, selected, as one undo step', async () => {
  await pickFiles(() => placeImageButton().click(), IMAGES)

  await expect.poll(async () => (await getPageChildren(editor.page)).length).toBe(2)
  expect(await placed()).toEqual({
    nodes: [
      { name: 'mark', type: 'FRAME' },
      { name: 'photo', type: 'RECTANGLE' }
    ],
    undoLabel: 'Place files'
  })
  expect(await getSelectedIds(editor.page)).toBe(2)

  await editor.canvas.undo()
  expect(await getPageChildren(editor.page)).toEqual([])
  editor.canvas.assertNoErrors()
})

test('File › Place image… opens the same picker', async () => {
  const [svg] = IMAGES
  await pickFiles(async () => {
    const menu = await openAppMenu(editor.page, 'File')
    await menu.getByRole('menuitem', { name: 'Place image…' }).click()
  }, [svg])

  await expect.poll(async () => (await getPageChildren(editor.page)).length).toBe(1)
})

test('Mod+Shift+K opens the picker from the canvas', async () => {
  const [, png] = IMAGES
  await editor.canvas.click(400, 300)
  await pickFiles(() => editor.page.keyboard.press('ControlOrMeta+Shift+KeyK'), [png])

  await expect.poll(async () => (await getPageChildren(editor.page)).length).toBe(1)
})

test('a file that is not an image places nothing and reports it', async () => {
  await pickFiles(
    () => placeImageButton().click(),
    [{ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('notes') }]
  )

  await expect(editor.page.locator('[data-slot="toast"][data-tone="error"]')).toBeVisible()
  expect(await getPageChildren(editor.page)).toEqual([])
})

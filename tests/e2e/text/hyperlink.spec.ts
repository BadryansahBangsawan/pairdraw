import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'
import { expectDefined } from '#tests/helpers/assert'
import { openAppMenu } from '#tests/helpers/menu'
import { getEditingTextId, getNodeById, getSelectedNode } from '#tests/helpers/store'

/** A script address, which links must refuse; the tests never run it. */
// eslint-disable-next-line no-script-url -- Rejection fixture; this URL is never executed.
const SCRIPT_URL = 'javascript:alert(1)'

const editor = useEditorSetup()
let textId = ''

/** Where the text "Read the docs" sits on the canvas, at zoom 1. */
const TEXT = { x: 200, y: 200, width: 220, height: 30 }
/** A point on "docs", the last word, which ends about 135 px into the box. */
const DOCS = { x: TEXT.x + 115, y: TEXT.y + 15 }
/** A point on "Read", the first word. */
const READ = { x: TEXT.x + 20, y: TEXT.y + 15 }

async function linksOf(id: string) {
  const node = expectDefined(await getNodeById(editor.page, id), 'text node')
  return node.styleRuns.flatMap((run) =>
    run.style.hyperlink ? [{ start: run.start, length: run.length, link: run.style.hyperlink }] : []
  )
}

function linkEditor() {
  return editor.page.getByRole('dialog', { name: 'Link' })
}

function typography() {
  return editor.page.getByRole('region', { name: 'Typography' })
}

async function modifierClick(x: number, y: number) {
  const origin = await editor.canvas.pointerOrigin()
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'
  await editor.page.keyboard.down(modifier)
  await editor.page.mouse.click(origin.x + x, origin.y + y)
  await editor.page.keyboard.up(modifier)
}

test.beforeAll(async () => {
  await editor.canvas.clearCanvas()
  textId = await editor.page.evaluate((box) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    store.state.zoom = 1
    store.state.panX = 0
    store.state.panY = 0
    const id = store.createShape('TEXT', box.x, box.y, box.width, box.height)
    store.graph.updateNode(id, { text: 'Read the docs', fontSize: 20 })
    store.select([id])
    return id
  }, TEXT)
  await editor.canvas.waitForRender()
  // Sites a followed link opens answer locally, so the spec never leaves the machine.
  await editor.page
    .context()
    .route('https://example.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Docs</title>' })
    )
})

test('adds a link to the selected text from the typography panel', async () => {
  await typography().getByRole('button', { name: 'Add link' }).click()
  await expect(linkEditor()).toBeVisible()

  await linkEditor().getByRole('textbox', { name: 'Link address' }).fill('example.com/docs')
  await editor.page.keyboard.press('Enter')

  await expect(linkEditor()).toHaveCount(0)
  expect(await linksOf(textId)).toEqual([
    { start: 0, length: 13, link: { type: 'URL', value: 'https://example.com/docs' } }
  ])
  // Focus goes back to the button that opened the editor, which says the text now links.
  const edit = typography().getByRole('button', { name: 'Edit link' })
  await expect(edit).toBeFocused()
  await expect(edit).toHaveAttribute('aria-haspopup', 'dialog')
  await expect(edit).toHaveAttribute('aria-expanded', 'false')
  await expect(edit).not.toHaveAttribute('aria-pressed')
  editor.canvas.assertNoErrors()
})

test('refuses a script address and keeps the editor open', async () => {
  await typography().getByRole('button', { name: 'Edit link' }).click()
  const field = linkEditor().getByRole('textbox', { name: 'Link address' })
  await field.fill(SCRIPT_URL)
  await editor.page.keyboard.press('Enter')

  await expect(field).toHaveAttribute('aria-invalid', 'true')
  expect((await linksOf(textId))[0]?.link.value).toBe('https://example.com/docs')
  await editor.page.keyboard.press('Escape')
  await expect(linkEditor()).toHaveCount(0)
})

test('opens the link with a modifier click and selects without one', async () => {
  const popup = editor.page.waitForEvent('popup')
  await modifierClick(DOCS.x, DOCS.y)
  const opened = await popup
  expect(opened.url()).toBe('https://example.com/docs')
  await opened.close()

  let popups = 0
  editor.page.on('popup', () => popups++)
  await editor.canvas.click(DOCS.x, DOCS.y)
  await editor.canvas.waitForRender()
  expect(popups).toBe(0)
  expect((await getSelectedNode(editor.page))?.id).toBe(textId)
})

test('links only the selected word while the text is edited', async () => {
  await editor.canvas.click(TEXT.x + 300, TEXT.y + 200)
  await editor.page.evaluate((id) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    store.setTextHyperlink(id, null, [0, 13])
  }, textId)
  await editor.canvas.dblclick(READ.x, READ.y)
  await expect.poll(() => getEditingTextId(editor.page)).toBe(textId)

  await typography().getByRole('button', { name: 'Add link' }).click()
  await linkEditor().getByRole('textbox', { name: 'Link address' }).fill('https://example.com')
  await linkEditor().getByRole('button', { name: 'Apply' }).click()

  expect(await linksOf(textId)).toEqual([
    { start: 0, length: 4, link: { type: 'URL', value: 'https://example.com' } }
  ])
  // Focus went back to the panel's link button; a click on empty canvas ends the edit.
  await editor.canvas.click(TEXT.x + 300, TEXT.y + 200)
  await expect.poll(() => getEditingTextId(editor.page)).toBeNull()
})

test('removes the link from the canvas menu and undoes the removal', async () => {
  await editor.canvas.click(READ.x, READ.y)
  const origin = await editor.canvas.pointerOrigin()
  await editor.page.mouse.click(origin.x + READ.x, origin.y + READ.y, { button: 'right' })
  await editor.page.getByRole('menuitem', { name: 'Remove link' }).click()

  expect(await linksOf(textId)).toEqual([])
  await editor.canvas.undo()
  expect(await linksOf(textId)).toHaveLength(1)
})

test('shows a hand over a link only while the modifier is held', async () => {
  const element = editor.page.getByTestId('canvas-element')
  const origin = await editor.canvas.pointerOrigin()
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'
  await editor.page.mouse.move(origin.x + READ.x, origin.y + READ.y)
  await expect(element).not.toHaveCSS('cursor', 'pointer')

  await editor.page.keyboard.down(modifier)
  await expect(element).toHaveCSS('cursor', 'pointer')
  await editor.page.mouse.move(origin.x + TEXT.x + 300, origin.y + TEXT.y + 200)
  await expect(element).not.toHaveCSS('cursor', 'pointer')
  await editor.page.keyboard.up(modifier)
})

test('opens a link with a plain click in Preview', async () => {
  await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    store.togglePlay()
  })
  await editor.canvas.waitForRender()
  const element = editor.page.getByTestId('canvas-element')
  const origin = await editor.canvas.pointerOrigin()
  await editor.page.mouse.move(origin.x + READ.x, origin.y + READ.y)
  await expect(element).toHaveCSS('cursor', 'pointer')

  const popup = editor.page.waitForEvent('popup')
  await editor.page.mouse.click(origin.x + READ.x, origin.y + READ.y)
  const opened = await popup
  expect(opened.url()).toBe('https://example.com/')
  // A document's link gets no handle back to the editor.
  expect(await opened.evaluate(() => window.opener)).toBeNull()
  await opened.close()

  await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    store.togglePlay()
  })
  await editor.canvas.waitForRender()
})

test('adds a link from the canvas menu', async () => {
  await editor.page.evaluate((id) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    store.setTextHyperlink(id, null, [0, 13])
    store.select([id])
  }, textId)
  const origin = await editor.canvas.pointerOrigin()
  await editor.page.mouse.click(origin.x + DOCS.x, origin.y + DOCS.y, { button: 'right' })
  await editor.page.getByRole('menuitem', { name: 'Add link' }).click()

  await expect(linkEditor()).toBeVisible()
  await linkEditor().getByRole('textbox', { name: 'Link address' }).fill('hello@example.com')
  await editor.page.keyboard.press('Enter')

  await expect(linkEditor()).toHaveCount(0)
  expect(await linksOf(textId)).toEqual([
    { start: 0, length: 13, link: { type: 'URL', value: 'mailto:hello@example.com' } }
  ])
  // Opened from the canvas, the editor gives focus back to the canvas.
  await expect(editor.page.getByTestId('canvas-element')).toBeFocused()
})

test('adds a link from the Text menu', async () => {
  await editor.page.evaluate((id) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    store.setTextHyperlink(id, null, [0, 13])
    store.select([id])
  }, textId)

  await openAppMenu(editor.page, 'Text')
  await editor.page.getByRole('menuitem', { name: 'Add link' }).click()
  await expect(linkEditor()).toBeVisible()

  await linkEditor().getByRole('textbox', { name: 'Link address' }).fill('example.com/docs')
  await editor.page.keyboard.press('Enter')

  await expect(linkEditor()).toHaveCount(0)
  expect(await linksOf(textId)).toEqual([
    { start: 0, length: 13, link: { type: 'URL', value: 'https://example.com/docs' } }
  ])
  editor.canvas.assertNoErrors()
})

import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'

const editor = useEditorSetup()

function sheet() {
  return editor.page.getByRole('dialog', { name: 'Keyboard shortcuts' })
}

async function openSheet() {
  await editor.page.keyboard.press('Shift+Slash')
  await expect(sheet()).toBeVisible()
}

async function activeTool() {
  return editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    return store.state.activeTool
  })
}

async function closeSheet() {
  await editor.page.keyboard.press('Escape')
  await expect(sheet()).toBeHidden()
}

test('? opens the shortcut sheet, which lists the menus’ keys', async () => {
  await openSheet()
  await expect(sheet().getByRole('searchbox')).toBeFocused()
  await expect(sheet().getByRole('heading', { name: 'Arrange' })).toBeVisible()
  await closeSheet()
})

test('? opens the sheet on layouts that type it with another key', async () => {
  // German: Shift and the key right of 0 (code Minus) types ?.
  await editor.page.evaluate(() => {
    const init = { key: '?', code: 'Minus', shiftKey: true, bubbles: true, cancelable: true }
    document.body.dispatchEvent(new KeyboardEvent('keydown', init))
  })
  await expect(sheet()).toBeVisible()
  await closeSheet()
})

test('Shift and the US ? key leave the sheet closed where they type another character', async () => {
  // German: Shift and the US ? key (code Slash) types _.
  await editor.page.evaluate(async () => {
    const init = { key: '_', code: 'Slash', shiftKey: true, bubbles: true, cancelable: true }
    document.body.dispatchEvent(new KeyboardEvent('keydown', init))
    // Give a sheet that did open the frames it needs to render before asserting it did not.
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    })
  })
  await expect(sheet()).toBeHidden()
})

test('the toolbar’s keyboard button opens the sheet', async () => {
  const button = editor.page
    .getByTestId('toolbar')
    .getByRole('button', { name: 'Keyboard shortcuts' })
  await expect(button).toHaveAttribute('aria-haspopup', 'dialog')
  await expect(button).not.toHaveAttribute('aria-pressed')
  await button.click()
  await expect(sheet()).toBeVisible()
  await closeSheet()
})

test('searching narrows the sheet to matching shortcuts', async () => {
  await openSheet()
  const terms = sheet().getByRole('term')
  await expect.poll(() => terms.count()).toBeGreaterThan(0)
  const all = await terms.count()
  await sheet().getByRole('searchbox').fill('align')
  await expect.poll(() => terms.count()).toBeLessThan(all)
  await expect(terms.first()).toBeVisible()

  await sheet().getByRole('searchbox').fill('no shortcut is called this')
  await expect(terms).toHaveCount(0)
  await closeSheet()
})

test('canvas keys stay off while the sheet is open', async () => {
  await editor.page.keyboard.press('v')
  await openSheet()
  // Off the search field, which would take the key as typing before the canvas could.
  const close = sheet().getByRole('button', { name: 'Close' })
  await close.focus()
  await expect(close).toBeFocused()
  await editor.page.keyboard.press('r')
  expect(await activeTool()).toBe('SELECT')
  await expect(sheet()).toBeVisible()
  await closeSheet()
})

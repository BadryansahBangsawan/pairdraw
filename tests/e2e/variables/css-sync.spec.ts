import { expect, test, useFreshEditor } from '#tests/e2e/fixtures'

// A fresh page per test: a dialog left open by one test makes the next one's launcher unreachable,
// and the linked stylesheet, variables, watch option, and recovery copy of the last document all
// live in the app's state or storage.
const editor = useFreshEditor()

// A fresh context re-fetches the app, so its boot alone can outlast the 15s project budget.
test.describe.configure({ timeout: 45_000 })

const STYLESHEET = [
  '/* App theme */',
  ':root {',
  '  --brand: #ff5b2e;',
  '  --gap: 1rem;',
  '}',
  '.dark {',
  '  --brand: #ffffff;',
  '}',
  ''
].join('\n')

/**
 * Stands in for the browser's file picker with a stylesheet the page can read and write, keeping
 * what is written on the root element, since the picker itself cannot be driven.
 */
async function stubStylesheet(text: string) {
  await editor.page.evaluate((initial: string) => {
    const root = document.documentElement
    root.dataset.cssSyncText = initial
    const handle = {
      kind: 'file',
      name: 'globals.css',
      getFile: async () =>
        new File([root.dataset.cssSyncText ?? ''], 'globals.css', { type: 'text/css' }),
      createWritable: async () => ({
        write: async (data: string) => {
          root.dataset.cssSyncText = data
        },
        close: async () => undefined
      })
    }
    Object.defineProperty(window, 'showOpenFilePicker', {
      configurable: true,
      value: async () => [handle]
    })
  }, text)
}

function writtenStylesheet() {
  return editor.page.evaluate(() => document.documentElement.dataset.cssSyncText ?? '')
}

async function openVariables() {
  await editor.page
    .getByRole('region', { name: 'Variables' })
    .getByRole('button', { name: 'Open variables' })
    .click()
  const dialog = editor.page.getByTestId('variables-dialog')
  await expect(dialog).toBeVisible()
  return dialog
}

test('a stylesheet’s custom properties import as a collection with a mode per condition', async () => {
  await stubStylesheet(STYLESHEET)
  const dialog = await openVariables()

  await dialog.getByTestId('variables-css-sync').click()
  await editor.page.getByTestId('variables-css-import').click()

  const importDialog = editor.page.getByTestId('variables-import-dialog')
  await expect(importDialog.getByTestId('variables-import-summary')).toHaveText(
    '2 to add · 0 to update · 0 skipped'
  )
  await importDialog.getByTestId('variables-import-confirm').click()
  await expect(importDialog).toBeHidden()

  await expect(dialog.getByTestId('variable-row')).toHaveCount(2)
  const stylesheet = dialog.getByTestId('token-output')
  await expect(stylesheet).toContainText(/--brand: #ff5b2e/i)
  await expect(stylesheet).toContainText(/\.dark[^}]*--brand: #ffffff/i)
  editor.canvas.assertNoErrors()
  // The next test opens the dialog from the panel again.
  await editor.page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('pull brings in what changed in the linked stylesheet, and push writes variables back in place', async () => {
  await stubStylesheet(STYLESHEET)
  const dialog = await openVariables()
  await dialog.getByTestId('variables-css-sync').click()
  await editor.page.getByTestId('variables-css-import').click()
  const importDialog = editor.page.getByTestId('variables-import-dialog')
  await importDialog.getByTestId('variables-import-confirm').click()
  await expect(importDialog).toBeHidden()

  // The developer changes the file; pulling it updates the variable it names.
  await editor.page.evaluate(() => {
    const root = document.documentElement
    root.dataset.cssSyncText = (root.dataset.cssSyncText ?? '').replace('#ff5b2e', '#0066cc')
  })
  await dialog.getByTestId('variables-css-sync').click()
  await expect(editor.page.getByTestId('variables-css-linked')).toHaveText('Linked to globals.css')
  // A change made only in the file comes in at once, without a preview.
  await editor.page.getByTestId('variables-css-pull').click()
  await expect(importDialog).toBeHidden()
  await expect(dialog.getByTestId('token-output')).toContainText(/--brand: #0066cc/i)

  // A variable the designer adds is written into the file's own :root block.
  await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const [collection] = store.graph.variableCollections.values()
    if (!collection) throw new Error('No collection')
    store.graph.createVariable('Radius', 'FLOAT', collection.id, 8)
    store.state.sceneVersion++
  })
  await dialog.getByTestId('variables-css-sync').click()
  await editor.page.getByTestId('variables-css-push').click()
  await expect(
    editor.page
      .locator('[data-slot="toast"]')
      .filter({ hasText: 'Variables written to globals.css: 0 changed, 1 new.' })
  ).toBeVisible()

  const written = await writtenStylesheet()
  expect(
    written.startsWith('/* App theme */\n:root {\n  --brand: #0066cc;\n  --gap: 1rem;\n')
  ).toBe(true)
  expect(written).toContain('  --radius: 8px;\n}')
  expect(written).toContain('.dark {\n  --brand: #ffffff;\n}')
})

test('a value changed in the file and on the canvas opens for review, and code wins by default', async () => {
  await stubStylesheet(STYLESHEET)
  const dialog = await openVariables()
  await dialog.getByTestId('variables-css-sync').click()
  await editor.page.getByTestId('variables-css-import').click()
  const importDialog = editor.page.getByTestId('variables-import-dialog')
  await importDialog.getByTestId('variables-import-confirm').click()
  await expect(importDialog).toBeHidden()

  await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const brand = [...store.graph.variables.values()].find((entry) => entry.name === 'brand')
    const [collection] = store.graph.variableCollections.values()
    if (!brand || !collection) throw new Error('No brand')
    store.updateVariableValue(brand.id, collection.defaultModeId, { r: 0, g: 0, b: 1, a: 1 })
    const root = document.documentElement
    root.dataset.cssSyncText = (root.dataset.cssSyncText ?? '').replace('#ff5b2e', '#00ff00')
  })
  // Until the file is read again, the row shows only the canvas edit.
  await expect(dialog.getByTestId('variable-sync-drift').first()).toHaveAttribute(
    'data-kind',
    'canvas'
  )

  await dialog.getByTestId('variables-css-sync').click()
  await editor.page.getByTestId('variables-css-pull').click()
  const review = editor.page.getByTestId('variables-sync-review')
  await expect(review.getByTestId('variables-sync-row')).toHaveCount(1)
  await expect(review.getByTestId('variables-sync-row')).toHaveAttribute('data-kind', 'conflict')
  await review.getByTestId('variables-sync-apply').click()
  await expect(review).toBeHidden()
  await expect(dialog.getByTestId('token-output')).toContainText(/--brand: #00ff00/i)
  await expect(dialog.getByTestId('variables-sync-status')).toContainText('In sync')
})

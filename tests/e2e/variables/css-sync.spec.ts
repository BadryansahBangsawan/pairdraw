import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'

const editor = useEditorSetup()

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

test('pull shows what changed in the linked stylesheet, and push writes variables back in place', async () => {
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
  await editor.page.getByTestId('variables-css-pull').click()
  await expect(importDialog.getByTestId('variables-import-summary')).toHaveText(
    '0 to add · 2 to update · 0 skipped'
  )
  await importDialog.getByTestId('variables-import-confirm').click()
  await expect(dialog.getByTestId('token-output')).toContainText(/--brand: #0066cc/i)

  // A variable the designer adds is written into the file's own :root block.
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
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

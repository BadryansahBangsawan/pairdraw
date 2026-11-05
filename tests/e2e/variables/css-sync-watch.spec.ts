import type { Locator } from '@playwright/test'

import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'

// The linked-stylesheet watch: when the option is on, an external change to the file pulls its
// custom properties into the document; when off, the same change is left alone.

const editor = useEditorSetup()

const STYLESHEET = ['/* App theme */', ':root {', '  --brand: #ff5b2e;', '}', ''].join('\n')

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

async function changeStylesheet(next: string) {
  await editor.page.evaluate((css: string) => {
    document.documentElement.dataset.cssSyncText = css
  }, next)
}

async function openVariables(): Promise<Locator> {
  await editor.page
    .getByRole('region', { name: 'Variables' })
    .getByRole('button', { name: 'Open variables' })
    .click()
  const dialog = editor.page.getByTestId('variables-dialog')
  await expect(dialog).toBeVisible()
  return dialog
}

async function linkAndConfirm(dialog: Locator) {
  await dialog.getByTestId('variables-css-sync').click()
  await editor.page.getByTestId('variables-css-import').click()
  const importDialog = editor.page.getByTestId('variables-import-dialog')
  await expect(importDialog).toBeVisible()
  await importDialog.getByTestId('variables-import-confirm').click()
  await expect(importDialog).toBeHidden()
}

async function setWatching(dialog: Locator, on: boolean) {
  await dialog.getByTestId('variables-css-sync').click()
  const item = editor.page.getByTestId('variables-css-watch')
  const checked = await item.getAttribute('data-state')
  if (checked !== (on ? 'checked' : 'unchecked')) await item.click()
  // Dismiss the menu without closing the dialog, so the token output stays visible.
  await dialog.click({ position: { x: 10, y: 10 } })
}

test('watching pulls an external change, off leaves later changes alone', async () => {
  await stubStylesheet(STYLESHEET)
  const dialog = await openVariables()
  await linkAndConfirm(dialog)
  await setWatching(dialog, true)
  await changeStylesheet(STYLESHEET.replace('#ff5b2e', '#0066cc'))

  const output = dialog.getByTestId('token-output')
  await expect(async () => {
    await expect(output).toContainText(/--brand: #0066cc/i)
  }).toPass()

  await setWatching(dialog, false)
  await changeStylesheet('/* App theme */\n:root {\n  --brand: #123456;\n}\n')
  await editor.page.waitForTimeout(3000)
  await expect(output).toContainText(/--brand: #0066cc/i)
  await expect(output).not.toContainText(/#123456/i)
  editor.canvas.assertNoErrors()
})

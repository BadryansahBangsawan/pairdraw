import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'

const editor = useEditorSetup()

test('a resolver picked alone offers the folder that holds the files it refers to', async () => {
  await editor.page
    .getByRole('region', { name: 'Variables' })
    .getByRole('button', { name: 'Open variables' })
    .click()
  const dialog = editor.page.getByTestId('variables-dialog')
  await expect(dialog).toBeVisible()

  const resolver = JSON.stringify({
    version: '2025-11-01',
    sets: { Core: { sources: [{ $ref: 'Core/Mode 1.tokens.json' }] } },
    resolutionOrder: [{ $ref: '#/sets/Core' }]
  })
  const tokens = JSON.stringify({ gap: { $type: 'number', $value: 4 } })
  const resolverFile = {
    name: 'tokens.resolver.json',
    mimeType: 'application/json',
    buffer: Buffer.from(resolver)
  }

  const chooser = editor.page.waitForEvent('filechooser')
  await dialog.getByTestId('variables-import-tokens').click()
  await (await chooser).setFiles([resolverFile])

  const importDialog = editor.page.getByTestId('variables-import-dialog')
  await expect(importDialog.getByTestId('variables-import-summary')).toHaveText('')
  const folderButton = importDialog.getByTestId('variables-import-folder')
  await expect(folderButton).toBeVisible()

  const folderChooser = editor.page.waitForEvent('filechooser')
  await folderButton.click()
  const picked = await folderChooser
  // The folder input is what carries the files' paths, which a resolver's refs need.
  await expect
    .poll(() => picked.element().evaluate((el) => (el as HTMLInputElement).webkitdirectory))
    .toBe(true)
  // A directory input only takes a real folder, which also gives the files their paths.
  const folder = await mkdtemp(join(tmpdir(), 'pairdraw-tokens-'))
  try {
    await writeFile(join(folder, 'tokens.resolver.json'), resolver)
    await mkdir(join(folder, 'Core'))
    await writeFile(join(folder, 'Core', 'Mode 1.tokens.json'), tokens)
    await picked.setFiles(folder)

    await expect(importDialog.getByTestId('variables-import-summary')).toHaveText(
      '1 to add · 0 to update · 0 skipped'
    )
    await importDialog.getByTestId('variables-import-confirm').click()
    await expect(importDialog).toBeHidden()
    await expect(dialog.getByTestId('variable-row')).toHaveCount(1)
  } finally {
    // Deleted once the browser has read them, not before.
    await rm(folder, { recursive: true, force: true })
  }
  editor.canvas.assertNoErrors()
})

import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'
import { expectDefined } from '#tests/helpers/assert'
import { waitForAppBoot } from '#tests/helpers/boot'
import { toolbarToolTestId } from '#tests/helpers/test-ids'

const editor = useEditorSetup()

const commentTool = () => editor.page.getByTestId(toolbarToolTestId('COMMENT'))
const list = () => editor.page.locator('[data-slot="comments-panel"]')
const items = () => list().locator('[data-slot="comment-list-item"]')
const pins = () => editor.page.locator('[data-slot="comment-pin"]:not([data-draft])')

/** The document's comment threads as the document node holds them. */
async function documentComments() {
  return editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const root = store.graph.getNode(store.graph.rootId)
    const entry = root?.pluginData?.find((item) => item.key === 'comments')
    if (!entry) return []
    const parsed: unknown = JSON.parse(entry.value)
    if (!Array.isArray(parsed)) throw new Error('Comments are not a list')
    // Deleted threads stay in the document, marked, so the data keeps them apart.
    return parsed.map((thread: { resolved?: boolean; deleted?: boolean; text?: string }) => ({
      resolved: thread.resolved === true,
      deleted: thread.deleted === true,
      text: thread.text ?? ''
    }))
  })
}

async function placeComment(x: number, y: number, text: string) {
  const box = expectDefined(await editor.canvas.canvas.boundingBox(), 'canvas bounds')
  await editor.page.mouse.click(box.x + x, box.y + y)
  const composer = editor.page.getByRole('textbox', { name: 'Add a comment' })
  await expect(composer).toBeFocused()
  await composer.fill(text)
  await composer.press('Enter')
}

test('a recovery keeps resolved threads resolved and deleted ones gone', async () => {
  await editor.canvas.drawRect(100, 100, 200, 150)
  await editor.page.keyboard.press('KeyC')
  await expect(list()).toBeVisible()

  await placeComment(120, 120, 'keep me')
  await editor.page.keyboard.press('Escape')
  await placeComment(320, 170, 'resolve me')
  await editor.page.keyboard.press('Escape')
  await placeComment(500, 320, 'delete me')
  await editor.page.keyboard.press('Escape')
  await expect(items()).toHaveCount(3)

  await items().filter({ hasText: 'resolve me' }).hover()
  await items()
    .filter({ hasText: 'resolve me' })
    .locator('[data-command="comment-resolve"]')
    .click()
  await expect(items()).toHaveCount(2)

  await pins().last().click({ button: 'right' })
  await editor.page.getByRole('menu').locator('[data-command="comment-delete"]').click()
  await editor.page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
  await expect(items()).toHaveCount(1)

  await expect
    .poll(async () =>
      (await documentComments())
        .filter((thread) => !thread.deleted)
        .map((thread) => thread.resolved)
        .sort()
    )
    .toEqual([false, true])

  await editor.page.evaluate(async () => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    await store.persistRecoveryNow()
  })

  editor.page.once('dialog', (dialog) => dialog.accept())
  await editor.page.reload()
  // The dialog is drawn after the app boots, which is slower than a default assertion on a cold CI job.
  await waitForAppBoot(editor.page)
  await expect(editor.page.getByRole('alertdialog', { name: 'Recover unsaved work' })).toBeVisible()
  await editor.page.getByRole('button', { name: 'Restore' }).click()
  await expect(editor.page.getByText('keep me')).toBeVisible()

  const threads = await documentComments()
  expect(
    threads
      .filter((thread) => !thread.deleted)
      .map((thread) => thread.text)
      .sort()
  ).toEqual(['keep me', 'resolve me'])
  expect(threads.find((thread) => thread.text === 'resolve me')?.resolved).toBe(true)
  expect(threads.find((thread) => thread.text === 'keep me')?.resolved).toBe(false)
  expect(threads.find((thread) => thread.text === 'delete me')?.deleted).toBe(true)

  await commentTool().click()
  await expect(items()).toHaveCount(1)
  await expect(items().first()).toContainText('keep me')
})

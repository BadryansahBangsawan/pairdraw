import { expect, test } from '@playwright/test'

import { askFor, chatWithAgent, openDocuments } from '#tests/helpers/agents/chat'

/**
 * Seam: the chat's own coding agent edits one document while the person watches another.
 * Catches a notice whose Show acts in a tab that is not in front, and one that does not say
 * which document holds the layers.
 */
test.skip(process.platform === 'win32', 'The stand-in agent is a shell script')

test('a notice for edits in another document names it, and Show brings it to front', async ({
  page,
  baseURL
}) => {
  test.setTimeout(180_000)
  const { chat, stop } = await chatWithAgent(page, baseURL)
  try {
    const tabs = page.getByTestId('tabbar-tab')
    await chat.submit(`Start a document for the profile.\n${askFor({ name: 'new_document' })}`)
    await expect(tabs).toHaveCount(2, { timeout: 60_000 })
    await expect(tabs.nth(1)).toHaveAttribute('data-active', '')
    // The document the agent started has a name the notice can be told apart by.
    const edited = 'Company profile'
    await page.evaluate((name) => window.pairdraw?.getStore?.()?.renameDocument(name), edited)

    // The person goes back to the document they were in, and the agent edits the other one.
    await tabs.first().click()
    await expect(tabs.first()).toHaveAttribute('data-active', '')
    const other = (await openDocuments(page)).find((document) => !document.active)
    if (!other) throw new Error('The agent opened no second document')
    await chat.submit(
      [
        'Add a card to the document you started.',
        askFor({
          name: 'create_shape',
          arguments: {
            document_id: other.id,
            type: 'RECTANGLE',
            x: 40,
            y: 40,
            width: 120,
            height: 80,
            name: 'Card'
          }
        })
      ].join('\n')
    )

    const toast = page.locator('[data-slot="toast"]').filter({ hasText: 'AI edits done' })
    await expect(toast).toBeVisible({ timeout: 60_000 })
    await expect(toast).toContainText(edited)

    await toast.getByRole('button', { name: 'Show' }).click()
    await expect(tabs.nth(1)).toHaveAttribute('data-active', '')
    const selected = page.getByTestId('layers-item').and(page.locator('[data-selected]'))
    await expect(selected.filter({ hasText: 'Card' })).toBeVisible()
  } finally {
    stop()
  }
})

import { expect, test } from '@playwright/test'

import { waitForHome } from '#tests/helpers/boot'
import { openChatEditor } from '#tests/helpers/chat/fixture'

for (const width of [390, 1280]) {
  test(`home view selection remains selected and persists at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/?recent-files')
    const home = page.getByTestId('recent-files-home')
    await waitForHome(page)
    const grid = home.getByRole('button', { name: 'Grid view', exact: true })
    const list = home.getByRole('button', { name: 'List view', exact: true })
    await expect(grid).toHaveCount(1)
    await expect(grid).toHaveAttribute('aria-pressed', 'true')
    await grid.click()
    await expect(grid).toHaveAttribute('aria-pressed', 'true')
    await list.click()
    await expect(list).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await waitForHome(page)
    await expect(list).toHaveAttribute('aria-pressed', 'true')
  })
}

test('a prompt on Home opens a new design whose chat sends it', async ({ page }) => {
  const chat = await openChatEditor(page)
  await chat.configureOpenRouter('sk-or-test-key-12345')
  await chat.closeChat()

  await page.getByTestId('tabbar-new').click()
  const home = page.getByTestId('recent-files-home')
  const prompt = home.getByRole('textbox', { name: 'Describe a design' })
  await expect(home.getByRole('button', { name: 'Send message' })).toBeDisabled()
  await prompt.fill('A pricing page with three plans')
  await prompt.press('Enter')

  // The New file tab turned into the design, and its chat opened with the prompt sent.
  await expect(home).toBeHidden()
  await expect(page.getByTestId('tabbar-tab')).toHaveCount(2)
  await expect(chat.chatColumn).toBeVisible()
  // Landing page is chosen until the person picks another kind, so its guide goes along.
  await expect(chat.userMessage()).toContainText('A pricing page with three plans')
  await expect(chat.userMessage()).toContainText('Creation guide — Landing page:')
  await expect(chat.assistantMessage()).not.toBeEmpty()

  // The first document's chat never received it.
  await page.getByTestId('tabbar-tab').first().click()
  await expect(chat.chatColumn).toBeVisible()
  await expect(page.getByTestId('chat-message-user')).toHaveCount(0)
})

test('without a model, a prompt on Home offers AI setup and stays when setup is closed', async ({
  page
}) => {
  await openChatEditor(page)
  await page.getByTestId('tabbar-new').click()
  const home = page.getByTestId('recent-files-home')
  const prompt = home.getByRole('textbox', { name: 'Describe a design' })
  await prompt.fill('A sign-in screen')
  await prompt.press('Enter')

  const setup = page.getByTestId('ai-setup-dialog')
  await expect(setup).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(setup).toBeHidden()

  await expect(home).toBeVisible()
  await expect(prompt).toHaveValue('A sign-in screen')
  await expect(page.getByTestId('tabbar-tab')).toHaveCount(2)
})

test('Tab on Home moves focus instead of stepping layers', async ({ page }) => {
  await page.goto('/?recent-files')
  await waitForHome(page)
  // No editor is open, so nothing should claim Tab for layer selection.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.keyboard.press('Tab')
  await expect.poll(() => page.evaluate(() => document.activeElement === document.body)).toBe(false)
})

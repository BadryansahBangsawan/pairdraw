import { expect, test } from '#tests/helpers/chat/fixture'

test('⌘J opens and closes the chat column beside Design', async ({ chat }) => {
  await chat.designTab.waitFor()
  await expect(chat.chatColumn).toBeHidden()
  await chat.page.keyboard.press('ControlOrMeta+j')
  await expect(chat.chatColumn).toBeVisible()
  await expect(chat.chatToggle).toHaveAttribute('aria-pressed', 'true')
  // The design stays in view beside the chat.
  await expect(chat.designTab).toHaveAttribute('data-state', 'active')
  await expect(chat.page.getByTestId('properties-panel')).toBeVisible()
  await chat.page.keyboard.press('ControlOrMeta+j')
  await expect(chat.chatColumn).toBeHidden()
  await expect(chat.chatToggle).toHaveAttribute('aria-pressed', 'false')
  await expect(chat.designTab).toHaveAttribute('data-state', 'active')
})

test('the chat column directs provider setup to unified settings', async ({ chat }) => {
  await chat.openChat()
  await expect(chat.page.getByText('Connect an AI provider to start chatting.')).toBeVisible()
  await expect(chat.page.getByTestId('provider-setup-open-settings')).toBeVisible()
  await expect(chat.apiKeyInput).toBeHidden()
})

test('saving an API key in Settings opens the chat interface', async ({ chat }) => {
  await chat.openChat()
  await chat.page.getByTestId('provider-setup-open-settings').click()
  await expect(chat.page.getByTestId('app-settings-dialog')).toBeVisible()
  await chat.page.locator('[data-model-id]').first().click()
  await chat.page.getByTestId('settings-model-provider').click()
  await chat.page.getByRole('option', { name: 'OpenRouter' }).click()
  await chat.page.getByLabel('Name').fill('Claude Sonnet')
  await chat.apiKeyInput.fill('sk-or-test-key-12345')
  await chat.page.getByRole('button', { name: 'Save model' }).click()
  await chat.page.getByTestId('app-settings-done').click()

  await expect(chat.input).toBeVisible()
  await expect(chat.page.getByText('Describe what you want to create or change.')).toBeVisible()
})

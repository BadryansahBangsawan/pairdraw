import { expect, test } from '#tests/helpers/chat/fixture'

test('/ offers the built-in skills, and running one sends its instructions', async ({
  configuredChat: chat
}) => {
  const { page } = chat
  await chat.input.click()
  await page.keyboard.type('/skill:dark')
  const option = page.getByRole('option', { name: /skill:dark-mode/ })
  // The list shows the app's own summary in the user's language, not the SKILL.md description.
  await expect(option).toContainText('Add a dark mode with color variables.')
  await expect(option).not.toContainText('Convert an existing design')
  await option.click()
  await page.keyboard.type('convert the pricing page')
  await expect(chat.input).toHaveText('/skill:dark-mode convert the pricing page')
  await page.keyboard.press('Enter')

  await expect(chat.userMessage()).toContainText('/skill:dark-mode convert the pricing page')
  const request = await page.evaluate(() => document.documentElement.dataset.lastChatRequest)
  expect(request).toContain('<skill name="dark-mode">')
  expect(request).toContain('# Dark mode')
})

test('Pick a skill starts the message with the skill, replacing one picked before', async ({
  configuredChat: chat
}) => {
  const { page } = chat
  const picker = page.getByTestId('chat-skill-picker')

  await chat.input.click()
  await page.keyboard.type('tidy the hero')
  await picker.click()
  const menu = page.getByRole('menu', { name: 'Pick a skill' })
  await expect(menu.getByRole('group').filter({ hasText: 'Built-in' })).toBeVisible()
  await menu.getByRole('menuitem', { name: /^layout/ }).click()
  await expect(menu).toBeHidden()
  await expect(chat.input).toHaveText('/skill:layout tidy the hero')
  await expect(chat.input).toBeFocused()

  await picker.click()
  await page.getByRole('menuitem', { name: /^restyle/ }).click()
  await expect(chat.input).toHaveText('/skill:restyle tidy the hero')
})

test('Pick a skill leads to the skills in Settings', async ({ configuredChat: chat }) => {
  const { page } = chat
  await page.getByTestId('chat-skill-picker').click()
  await page.getByRole('menuitem', { name: 'Manage skills…' }).click()
  const panel = page.getByTestId('settings-skills-panel')
  await expect(panel.locator('[data-group="builtin"]')).toBeVisible()

  // With the built-in skills off and none of the user's own, the menu says so.
  await panel
    .locator('[data-group="builtin"]')
    .getByRole('switch', { name: 'Built-in', exact: true })
    .click()
  await page.getByTestId('app-settings-done').click()
  await page.getByTestId('chat-skill-picker').click()
  const menu = page.getByRole('menu', { name: 'Pick a skill' })
  await expect(menu).toContainText('No skills are turned on.')
  await expect(menu).toHaveAccessibleDescription('No skills are turned on.')
})

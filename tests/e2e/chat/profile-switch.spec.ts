import type { Page } from '@playwright/test'

import { expect, test } from '#tests/helpers/chat/fixture'
import type { ChatHarness } from '#tests/helpers/chat/harness'

/**
 * Adds a second model beside the configured OpenRouter one: another built-in model, or a coding
 * agent, which keeps its conversation in its own session.
 */
async function addProfile(page: Page, name: string, providerID: string) {
  await page.evaluate(
    async ({ name, providerID }) => {
      const storePath = '/src/app/ai/models/store.ts'
      const store = await import(storePath)
      const settings = store.modelSettingsSnapshot()
      const [profile] = settings.models
      // The configured model's own connection, which holds its key; a fresh install also keeps an
      // unused default connection first.
      const connection = settings.connections.find(
        (entry: { id: string }) => entry.id === profile?.connectionId
      )
      if (!connection || !profile) throw new Error('Expected a configured model')
      const suffix = name.toLowerCase().replaceAll(/\W+/g, '-')
      settings.connections.push({ ...connection, id: `connection-${suffix}`, providerID })
      settings.models.push({
        ...profile,
        id: `model-${suffix}`,
        name,
        connectionId: `connection-${suffix}`
      })
      store.replaceAIModelSettings(settings)
    },
    { name, providerID }
  )
}

async function chooseProfile(chat: ChatHarness, name: string) {
  await chat.profileTrigger.click()
  // Each option starts with the model's name, then what it runs.
  await chat.page.getByRole('option', { name: new RegExp(`^${name}`) }).click()
}

async function sendAndWait(chat: ChatHarness, text: string) {
  await chat.submit(text)
  await expect(chat.assistantMessage()).toContainText(text)
}

test('switching to a coding agent mid-conversation asks first', async ({
  configuredChat: chat
}) => {
  await addProfile(chat.page, 'Claude Code', 'acp:claude-code')
  await sendAndWait(chat, 'Draw a card')

  await chooseProfile(chat, 'Claude Code')
  const warning = chat.page.getByRole('alertdialog')
  await expect(warning).toBeVisible()
  await expect(warning).toContainText('won’t see the messages above')
  await warning.getByRole('button', { name: 'Cancel' }).click()
  await expect(warning).toBeHidden()
  await expect(chat.profileTrigger).toContainText('Claude Sonnet')

  await chooseProfile(chat, 'Claude Code')
  await chat.page.getByRole('alertdialog').getByRole('button', { name: 'Switch' }).click()
  await expect(chat.profileTrigger).toContainText('Claude Code')
})

test('switching models before the first message or between built-in models does not ask', async ({
  configuredChat: chat
}) => {
  await addProfile(chat.page, 'Claude Code', 'acp:claude-code')
  await addProfile(chat.page, 'Fast model', 'openrouter')

  await chooseProfile(chat, 'Claude Code')
  await expect(chat.profileTrigger).toContainText('Claude Code')
  await chooseProfile(chat, 'Claude Sonnet')
  await expect(chat.profileTrigger).toContainText('Claude Sonnet')

  await sendAndWait(chat, 'Draw a card')
  await chooseProfile(chat, 'Fast model')
  await expect(chat.page.getByRole('alertdialog')).toHaveCount(0)
  await expect(chat.profileTrigger).toContainText('Fast model')
})

test('reopening a conversation selects the model it used', async ({ configuredChat: chat }) => {
  const { page } = chat
  await addProfile(page, 'Fast model', 'openrouter')
  await sendAndWait(chat, 'Create the first dashboard')

  await page.getByRole('button', { name: 'New chat', exact: true }).first().click()
  await chooseProfile(chat, 'Fast model')
  await sendAndWait(chat, 'Create the second dashboard')
  await expect(chat.profileTrigger).toContainText('Fast model')

  await page.getByRole('button', { name: 'Conversation history', exact: true }).click()
  await page.getByRole('button', { name: 'Create the first dashboard', exact: true }).click()
  await expect(chat.profileTrigger).toContainText('Claude Sonnet')
})

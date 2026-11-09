import { expect, test } from '@playwright/test'

import { waitForAppBoot } from '#tests/helpers/boot'
import { waitForDemo } from '#tests/helpers/demo'

// `?test` suppresses the first-run lookup, so these load the app as a person would, with none
// of the stored preferences the other browser tests start from. The browser has no companion,
// so no coding agent can be found either.
test.use({ storageState: { cookies: [], origins: [] } })

test('a fresh install opens no setup dialog, then or after a reload', async ({ page }) => {
  await page.goto('/')
  await waitForAppBoot(page)
  // The lookup starts with the workspace, so anything it opened shows once Home is there.
  const home = page.getByTestId('recent-files-home')
  await expect(home).toBeVisible()
  const setup = page.getByTestId('ai-setup-dialog')
  await expect(setup).toHaveCount(0)

  await page.reload()
  await waitForAppBoot(page)
  await expect(home).toBeVisible()
  await expect(setup).toHaveCount(0)
})

test('a first visit to the demo opens no setup dialog over the tour', async ({ page }) => {
  await page.goto('/demo')
  await waitForDemo(page)
  await expect(page.getByTestId('ai-setup-dialog')).toHaveCount(0)
})

const CONFIGURED_MODEL_SETTINGS = {
  version: 1,
  connections: [
    {
      id: 'connection-anthropic',
      providerID: 'anthropic',
      customBaseURL: '',
      customAPIType: 'completions',
      credentialProfileId: 'connection-anthropic'
    }
  ],
  models: [
    {
      id: 'model-sonnet',
      name: 'Claude Sonnet 5',
      connectionId: 'connection-anthropic',
      modelID: 'claude-sonnet-5',
      customModelID: '',
      capabilities: ['tools', 'vision']
    }
  ],
  assignments: { design: 'model-sonnet', review: 'design', fast: 'design', vision: 'design' }
}

test.describe('an install with a configured model', () => {
  test.use({
    storageState: async ({ baseURL }, use) => {
      if (!baseURL) throw new Error('Browser test baseURL is required')
      await use({
        cookies: [],
        origins: [
          {
            origin: new URL(baseURL).origin,
            localStorage: [
              {
                name: 'open-pencil:ai-model-settings',
                value: JSON.stringify(CONFIGURED_MODEL_SETTINGS)
              }
            ]
          }
        ]
      })
    }
  })

  test('never sees a setup dialog', async ({ page }) => {
    await page.goto('/')
    await waitForAppBoot(page)
    await expect(page.getByTestId('recent-files-home')).toBeVisible()
    await expect(page.getByTestId('ai-setup-dialog')).toHaveCount(0)
  })
})

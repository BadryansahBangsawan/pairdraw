import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

async function openModels(page: Page) {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  await page.getByTestId('app-settings-trigger').click()
  await page.getByTestId('settings-section-ai').click()
}

test('an unreadable saved key marks its model row instead of failing Settings', async ({
  page
}) => {
  await openModels(page)
  await page.locator('[data-model-id]').first().click()
  await page.getByTestId('settings-model-provider').click()
  await page.getByRole('option', { name: 'OpenRouter' }).click()
  await page.getByTestId('provider-settings-api-key').fill('sk-or-unreadable')
  await page.getByRole('button', { name: 'Save model' }).click()
  await expect(page.getByTestId('settings-model-list')).toContainText('Connected')

  // A stored key that can no longer be decrypted, as after browser data from an older session.
  await page.addInitScript(() => {
    crypto.subtle.decrypt = () => Promise.reject(new DOMException('', 'OperationError'))
  })
  await openModels(page)
  const row = page.getByTestId('settings-model-list').locator('[data-model-id]').first()
  await expect(row).toContainText('Unavailable')
  await expect(page.getByText('Browser credential operation failed')).toHaveCount(0)
})

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'POST, OPTIONS'
}

test('a provider preset tests its key against its own endpoint and shows as connected', async ({
  page
}) => {
  const requests: { model: unknown; authorization: string | undefined }[] = []
  await page.route('https://api.x.ai/v1/**', async (route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS })
      return
    }
    const body: unknown = request.postDataJSON()
    requests.push({
      model: typeof body === 'object' && body !== null && 'model' in body ? body.model : null,
      authorization: request.headers().authorization
    })
    await route.fulfill({
      headers: CORS_HEADERS,
      json: {
        id: 'chatcmpl-preset',
        object: 'chat.completion',
        created: 0,
        model: 'grok-4.7',
        choices: [
          { index: 0, message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
      }
    })
  })

  await openModels(page)
  await page.getByTestId('settings-add-model').click()
  const editor = page.getByTestId('settings-model-editor')
  // The newer presets wait behind the same chooser as the other API accounts.
  await editor.locator('[data-provider="xai"]').click()
  await page.getByTestId('provider-settings-api-key').fill('xai-e2e-key')
  await editor.getByRole('button', { name: 'Test connection' }).click()
  await expect(editor.getByText('Connected successfully. Model is reachable.')).toBeVisible()
  expect(requests).toContainEqual({ model: 'grok-4.7', authorization: 'Bearer xai-e2e-key' })

  await page.getByRole('button', { name: 'Save model' }).click()
  const row = page.getByTestId('settings-model-list').locator('[data-model-id]', {
    hasText: 'Grok 4.7'
  })
  await expect(row).toContainText('xAI')
  await expect(row.getByText('Connected', { exact: true })).toBeVisible()
})

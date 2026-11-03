import { expect, test, type Page, type Route } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'POST, OPTIONS'
}

const CLAUDE_MESSAGE = {
  id: 'msg_e2e',
  type: 'message',
  role: 'assistant',
  model: 'claude-sonnet-5-5',
  content: [{ type: 'text', text: 'OK' }],
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: { input_tokens: 1, output_tokens: 1 }
}

type Sent = { url: string; headers: Record<string, string>; body: unknown }

async function answerClaude(route: Route, sent: Sent[]): Promise<void> {
  const request = route.request()
  if (request.method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: CORS_HEADERS })
    return
  }
  sent.push({ url: request.url(), headers: request.headers(), body: request.postDataJSON() })
  await route.fulfill({ headers: CORS_HEADERS, json: CLAUDE_MESSAGE })
}

async function addModel(page: Page, providerID: string) {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  await page.getByTestId('app-settings-trigger').click()
  await page.getByTestId('settings-section-ai').click()
  await page.getByTestId('settings-add-model').click()
  const editor = page.getByTestId('settings-model-editor')
  await editor.locator(`[data-provider="${providerID}"]`).click()
  return editor
}

test('a Bedrock model tests its API key against the chosen region and saves it', async ({
  page
}) => {
  const sent: Sent[] = []
  await page.route('https://bedrock-mantle.eu-west-1.api.aws/anthropic/v1/**', (route) =>
    answerClaude(route, sent)
  )

  const editor = await addModel(page, 'amazon-bedrock')
  await page.getByTestId('provider-settings-bedrock-region').click()
  await page.getByRole('option', { name: 'eu-west-1', exact: true }).click()
  await page.getByTestId('provider-settings-api-key').fill('ABSK-e2e-key')
  await editor.getByRole('button', { name: 'Test connection' }).click()
  await expect(editor.getByText('Connected successfully. Model is reachable.')).toBeVisible()
  expect(sent[0]?.url).toBe('https://bedrock-mantle.eu-west-1.api.aws/anthropic/v1/messages')
  expect(sent[0]?.headers['x-api-key']).toBe('ABSK-e2e-key')
  expect(sent[0]?.body).toMatchObject({ model: 'anthropic.claude-sonnet-5-5' })

  await editor.getByRole('textbox', { name: 'Name', exact: true }).fill('Bedrock Sonnet')
  await page.getByRole('button', { name: 'Save model' }).click()
  const row = page
    .getByTestId('settings-model-list')
    .locator('[data-model-id]', { hasText: 'Bedrock Sonnet' })
  await expect(row).toContainText('Amazon Bedrock')
  await expect(row.getByText('Connected', { exact: true })).toBeVisible()

  // The region is kept with the connection and shown again when the model is edited.
  await row.click()
  await expect(page.getByTestId('provider-settings-bedrock-region')).toContainText('eu-west-1')
})

test('a Bedrock model offers AWS access keys only in the desktop app', async ({ page }) => {
  await addModel(page, 'amazon-bedrock')
  const auth = page.getByTestId('provider-settings-bedrock-auth')
  await expect(auth.locator('button', { hasText: 'AWS access keys' })).toBeDisabled()
  await expect(
    page.getByText(
      'AWS access keys work in the desktop app only. In the browser, use a Bedrock API key.'
    )
  ).toBeVisible()
})

test('a Vertex AI model sends Claude to its project and location with an access token', async ({
  page
}) => {
  const sent: Sent[] = []
  await page.route('https://aiplatform.us.rep.googleapis.com/v1/projects/**', (route) =>
    answerClaude(route, sent)
  )

  const editor = await addModel(page, 'google-vertex')
  const project = page.getByTestId('provider-settings-vertex-project')
  await project.fill('')
  await project.blur()
  await expect(editor.getByText('Claude models on Vertex AI need a project ID.')).toBeVisible()
  await project.fill('design-team')
  await page.getByTestId('provider-settings-vertex-location').click()
  await page.getByRole('option', { name: 'us', exact: true }).click()
  await page.getByTestId('provider-settings-api-key').fill('ya29.e2e-token')
  await editor.getByRole('button', { name: 'Test connection' }).click()
  await expect(editor.getByText('Connected successfully. Model is reachable.')).toBeVisible()

  expect(sent[0]?.url).toBe(
    'https://aiplatform.us.rep.googleapis.com/v1/projects/design-team/locations/us/publishers/anthropic/models/claude-sonnet-5-5:rawPredict'
  )
  expect(sent[0]?.headers.authorization).toBe('Bearer ya29.e2e-token')
  expect(sent[0]?.headers['anthropic-version']).toBeUndefined()
  expect(sent[0]?.body).toMatchObject({ anthropic_version: 'vertex-2023-10-16' })
  expect(sent[0]?.body).not.toHaveProperty('model')

  await editor.getByRole('textbox', { name: 'Name', exact: true }).fill('Vertex Sonnet')
  await page.getByRole('button', { name: 'Save model' }).click()
  const row = page
    .getByTestId('settings-model-list')
    .locator('[data-model-id]', { hasText: 'Vertex Sonnet' })
  await expect(row).toContainText('Google Vertex AI')
  await row.click()
  await expect(page.getByTestId('provider-settings-vertex-project')).toHaveValue('design-team')
  await expect(page.getByTestId('provider-settings-vertex-location')).toContainText('us')
})

test('two Bedrock models in the default region share one saved key', async ({ page }) => {
  const editor = await addModel(page, 'amazon-bedrock')
  await expect(page.getByTestId('provider-settings-bedrock-region')).toContainText('us-east-1')
  await page.getByTestId('provider-settings-api-key').fill('ABSK-e2e-key')
  await editor.getByRole('textbox', { name: 'Name', exact: true }).fill('Bedrock Sonnet')
  await page.getByRole('button', { name: 'Save model' }).click()
  await expect(
    page
      .getByTestId('settings-model-list')
      .locator('[data-model-id]', { hasText: 'Bedrock Sonnet' })
  ).toBeVisible()

  // Picking another region and coming back keeps the same connection and its key.
  await page.getByTestId('settings-add-model').click()
  await page
    .getByTestId('settings-model-editor')
    .locator('[data-provider="amazon-bedrock"]')
    .click()
  await page.getByTestId('provider-settings-bedrock-region').click()
  await page.getByRole('option', { name: 'eu-west-1', exact: true }).click()
  await page.getByTestId('provider-settings-bedrock-region').click()
  await page.getByRole('option', { name: 'us-east-1', exact: true }).click()
  await expect(page.getByTestId('provider-settings-api-key')).toHaveAttribute(
    'placeholder',
    'Key saved — enter new to replace'
  )
})

test('a Vertex AI Claude model is not saved without a project or with an API key', async ({
  page
}) => {
  const editor = await addModel(page, 'google-vertex')
  const unsaved = page.locator('[data-model-id]', { hasText: 'Vertex Sonnet' })
  await expect(editor.getByText('Claude models on Vertex AI need a project ID.')).toBeVisible()
  await expect(page.getByTestId('provider-settings-vertex-location')).toBeDisabled()
  await editor.getByRole('textbox', { name: 'Name', exact: true }).fill('Vertex Sonnet')
  await page.getByTestId('provider-settings-api-key').fill('ya29.e2e-token')
  await page.getByRole('button', { name: 'Save model' }).click()
  await expect(page.getByTestId('provider-settings-vertex-project')).toHaveAttribute(
    'aria-invalid',
    'true'
  )
  await expect(unsaved).toHaveCount(0)
  await expect(editor).toBeVisible()

  // A mistyped project is refused instead of falling back to express mode.
  await page.getByTestId('provider-settings-vertex-project').fill('My-Project')
  await page.getByRole('button', { name: 'Save model' }).click()
  await expect(
    editor.getByText('Enter a project ID with lowercase letters, digits, and hyphens.')
  ).toBeVisible()
  await expect(unsaved).toHaveCount(0)
  await expect(editor).toBeVisible()

  // An API key reaches Gemini only.
  await page.getByTestId('provider-settings-vertex-project').fill('design-team')
  await expect(page.getByTestId('provider-settings-vertex-location')).toBeEnabled()
  await page.getByTestId('provider-settings-api-key').fill('AIza-e2e-key')
  await page.getByRole('button', { name: 'Save model' }).click()
  await expect(
    editor.getByText(
      'Claude on Vertex AI needs an access token. An API key reaches Gemini models only.'
    )
  ).toBeVisible()
  await expect(unsaved).toHaveCount(0)
  await expect(editor).toBeVisible()
})

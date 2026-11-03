import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import * as v from 'valibot'

import { CanvasHelper } from '#tests/helpers/canvas'
import { createTestMCPServer } from '#tests/helpers/mcp/external-server'

const ORIGIN = 'https://mcp.e2e.test'
const SERVER_URL = `${ORIGIN}/mcp`
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'authorization, content-type, accept, mcp-protocol-version, mcp-session-id, last-event-id',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  'access-control-expose-headers': 'mcp-session-id, www-authenticate'
}

const formSchema = v.pipe(v.string(), v.parseJson())

/**
 * Stands in for a hosted MCP server and its authorization server: dynamic client registration,
 * an authorization page that redirects straight back with a code, and a token endpoint. Tool
 * requests need the issued access token.
 */
async function serveOAuthMCP(context: BrowserContext) {
  const mcp = createTestMCPServer([
    { name: 'search_pages', description: 'Searches pages', call: () => ({ content: [] }) }
  ])
  const seen = { registrations: 0, tokenRequests: 0, authorized: [] as string[] }
  await context.route(`${ORIGIN}/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS })
      return
    }
    if (url.pathname.startsWith('/.well-known/oauth-protected-resource')) {
      await route.fulfill({
        headers: CORS_HEADERS,
        json: { resource: SERVER_URL, authorization_servers: [ORIGIN] }
      })
      return
    }
    if (
      url.pathname.startsWith('/.well-known/oauth-authorization-server') ||
      url.pathname.startsWith('/.well-known/openid-configuration')
    ) {
      await route.fulfill({
        headers: CORS_HEADERS,
        json: {
          issuer: ORIGIN,
          authorization_endpoint: `${ORIGIN}/authorize`,
          token_endpoint: `${ORIGIN}/token`,
          registration_endpoint: `${ORIGIN}/register`,
          response_types_supported: ['code'],
          grant_types_supported: ['authorization_code', 'refresh_token'],
          code_challenge_methods_supported: ['S256'],
          token_endpoint_auth_methods_supported: ['none']
        }
      })
      return
    }
    if (url.pathname === '/register') {
      seen.registrations++
      const body = v.safeParse(formSchema, request.postData() ?? '')
      await route.fulfill({
        status: 201,
        headers: CORS_HEADERS,
        json: {
          ...(body.success && typeof body.output === 'object' ? body.output : {}),
          client_id: 'e2e-client'
        }
      })
      return
    }
    if (url.pathname === '/authorize') {
      await route.fulfill({
        contentType: 'text/html',
        body: `<script>
          const params = new URLSearchParams(location.search)
          const back = new URL(params.get('redirect_uri'))
          back.searchParams.set('code', 'e2e-code')
          back.searchParams.set('state', params.get('state'))
          location.replace(back.href)
        </script>`
      })
      return
    }
    if (url.pathname === '/token') {
      seen.tokenRequests++
      await route.fulfill({
        headers: CORS_HEADERS,
        json: {
          access_token: 'e2e-access',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'e2e-refresh'
        }
      })
      return
    }
    if (url.pathname === '/mcp') {
      const authorization = request.headers().authorization ?? ''
      if (authorization !== 'Bearer e2e-access') {
        await route.fulfill({
          status: 401,
          headers: {
            ...CORS_HEADERS,
            'www-authenticate': `Bearer resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource/mcp"`
          }
        })
        return
      }
      seen.authorized.push(authorization)
      if (request.method() !== 'POST') {
        await route.fulfill({ status: 405, headers: CORS_HEADERS })
        return
      }
      const body = v.safeParse(formSchema, request.postData() ?? '')
      const reply = body.success ? mcp.answer(body.output) : null
      await route.fulfill(
        reply
          ? { headers: { ...CORS_HEADERS, 'mcp-session-id': 'e2e-session' }, json: reply }
          : { status: 202, headers: CORS_HEADERS }
      )
      return
    }
    await route.fulfill({ status: 404, headers: CORS_HEADERS })
  })
  return seen
}

async function openMCPSettings(page: Page) {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,')
  await page.getByTestId('settings-section-mcp').click()
  return page.getByTestId('app-settings-dialog')
}

test('an OAuth MCP connection signs in through the browser and reaches the server’s tools', async ({
  page,
  context
}) => {
  const seen = await serveOAuthMCP(context)
  const settings = await openMCPSettings(page)

  await settings.getByRole('button', { name: 'Add connection', exact: true }).click()
  await settings.getByLabel('Connection name', { exact: true }).fill('Docs workspace')
  await settings.getByLabel('MCP server URL', { exact: true }).fill(SERVER_URL)
  await settings.getByRole('button', { name: 'OAuth sign-in', exact: true }).click()
  const signIn = settings.getByRole('button', { name: 'Sign in', exact: true })
  // Sign-in acts on the saved connection, so an unsaved one waits.
  await expect(signIn).toBeDisabled()
  await settings.getByRole('switch', { name: 'Enable for AI chat and agents' }).click()
  await settings.getByRole('button', { name: 'Save', exact: true }).click()

  await settings.getByRole('button', { name: /Docs workspace/ }).click()
  await expect(signIn).toBeEnabled()
  const popup = page.waitForEvent('popup')
  await signIn.click()
  await (await popup).waitForEvent('close')
  await expect(settings.getByRole('status').filter({ hasText: 'Signed in' })).toBeVisible()
  expect(seen.registrations).toBe(1)
  expect(seen.tokenRequests).toBe(1)

  await settings.getByTestId('provider-test-connection').click()
  await expect(settings.getByTestId('provider-test-connection-result')).toHaveAttribute(
    'data-tone',
    'success'
  )
  expect(seen.authorized.length).toBeGreaterThan(0)
  await expect(settings).not.toContainText('e2e-access')
})

test('local commands are offered only by the desktop app', async ({ page }) => {
  const settings = await openMCPSettings(page)
  await settings.getByRole('button', { name: 'Add connection', exact: true }).click()
  await expect(settings.getByRole('button', { name: 'Local command', exact: true })).toBeDisabled()
  await expect(settings.getByLabel('MCP server URL', { exact: true })).toBeVisible()
})

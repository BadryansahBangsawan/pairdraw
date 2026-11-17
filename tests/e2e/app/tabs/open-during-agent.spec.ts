import { readFile } from 'node:fs/promises'

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'
import type { Page } from '@playwright/test'
import * as v from 'valibot'

import { parseDiscoveryInfo } from '@pairdraw/mcp/discovery'

import { devMCPDiscoveryPath } from '@/app/automation/bridge/discovery-path'
import { devAutomationRoute } from '@/app/automation/bridge/portless-route'

import { expect, test } from '#tests/e2e/fixtures'

/**
 * Seam: an outside MCP client edits while the person uses Home and the tab bar.
 * Catches a document that is open for the agent but never becomes the visible,
 * active, editable tab. Misses a desktop-only file claim that the browser has not.
 */

const LAYER = 'Sift — Dashboard'
const OPEN_WAIT_MS = 4_000

/** The finished design from the live app: seven large screens, each with text and a card. */
const SCREENS = [
  'Sift — Performance',
  'Sift — Uninstaller',
  'Sift — Settings',
  'Sift — Onboarding',
  'Sift — Dashboard',
  'Sift — Installers',
  'Sift — System'
]

const textPartSchema = v.object({ type: v.literal('text'), text: v.string() })
const healthSchema = v.object({ status: v.string() })
const createdSchema = v.object({
  created: v.boolean(),
  target: v.object({ documentId: v.string(), documentName: v.string() })
})
const listedSchema = v.object({
  documents: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      active: v.boolean()
    })
  )
})

type ListedDocument = v.InferOutput<typeof listedSchema>['documents'][number]

function mcpPort(): string {
  return process.env.PAIRDRAW_TEST_MCP_PORT ?? '7691'
}

/** The dev server's discovery file for this test's MCP port, never the owner's. */
function discoveryPath(): string {
  const port = Number(mcpPort())
  return devMCPDiscoveryPath(devAutomationRoute(undefined, port).runtimeId)
}

async function connectClient(): Promise<Client> {
  const info = parseDiscoveryInfo(await readFile(discoveryPath(), 'utf8'))
  if (!info || info.httpPort !== Number(mcpPort())) {
    throw new Error('The test MCP server has no discovery file')
  }
  const client = new Client({ name: 'open-during-agent', version: '0.0.0' })
  const headers: Record<string, string> = {}
  if (info.authToken) headers.Authorization = `Bearer ${info.authToken}`
  const transport = new StreamableHTTPClientTransport(
    new URL(`http://127.0.0.1:${info.httpPort}/mcp`),
    {
      requestInit: { headers }
    }
  )
  await client.connect(transport)
  return client
}

function toolText(result: { isError?: boolean; content: unknown[] }): string {
  for (const part of result.content) {
    const parsed = v.safeParse(textPartSchema, part)
    if (parsed.success) return parsed.output.text
  }
  throw new Error(result.isError ? 'MCP tool failed' : 'MCP tool returned no text')
}

function toolData<T>(
  result: { isError?: boolean; content: unknown[] },
  schema: v.GenericSchema<unknown, T>
): T {
  const text = toolText(result)
  if (result.isError) throw new Error('MCP tool failed')
  const parsed = v.safeParse(v.pipe(v.string(), v.parseJson(), schema), text)
  if (!parsed.success) throw new Error('MCP tool returned an unexpected result')
  return parsed.output
}

async function callTool<T>(
  client: Client,
  name: string,
  args: Record<string, unknown>,
  schema: v.GenericSchema<unknown, T>
): Promise<T> {
  const result = await client.callTool({ name, arguments: args })
  return toolData({ isError: result.isError, content: result.content }, schema)
}

function listDocuments(client: Client): Promise<ListedDocument[]> {
  return callTool(client, 'list_documents', {}, listedSchema).then((result) => result.documents)
}

async function appConnected(): Promise<boolean> {
  const response = await fetch(`http://127.0.0.1:${mcpPort()}/health`)
  if (!response.ok) return false
  const parsed = v.safeParse(v.pipe(v.string(), v.parseJson(), healthSchema), await response.text())
  return parsed.success && parsed.output.status === 'ok'
}

/** Keeps editing `documentId` while the person tries to open something. */
function keepEditing(client: Client, documentId: string): Promise<void> {
  return (async () => {
    for (let index = 0; index < 6; index += 1) {
      await callTool(
        client,
        'create_shape',
        {
          document_id: documentId,
          type: 'ELLIPSE',
          x: 20 + index * 16,
          y: 20,
          width: 12,
          height: 12,
          name: `Edit ${index}`
        },
        v.object({ id: v.string() })
      )
    }
  })()
}

/** One screen of the finished design: a titled frame, a card, and a chart, at the live size. */
function screenJSX(name: string, y: number): string {
  const title = name.replace(/^Sift — /, '')
  return `<Frame name="${name}" x={0} y={${y}} w={1512} h={982} bg="#F4F5F7" flex="col" gap={24} p={32}>
  <Text name="Title" size={32} weight="bold" color="#111827">${title}</Text>
  <Frame name="Card" w={420} h={160} bg="#FFFFFF" rounded={16} flex="col" gap={8} p={20}>
    <Text name="Label" size={14} color="#6B7280">${title}</Text>
    <Text name="Value" size={28} weight="medium" color="#111827">128 active</Text>
  </Frame>
  <Rectangle name="Chart" w={720} h={280} bg="#E5E7EB" />
</Frame>`
}

/**
 * Renders the seven screens onto whichever tab is in front. An agent designing while Home is
 * in front lands them on Home's store, which the tab bar does not show as a document.
 */
async function designWhileHomeIsInFront(client: Client): Promise<void> {
  const jsx = `<>${SCREENS.map((name, index) => screenJSX(name, index * 1040)).join('\n')}</>`
  const rendered = await callTool(
    client,
    'render',
    { jsx },
    v.object({
      id: v.string(),
      name: v.string(),
      siblings: v.optional(v.array(v.object({ id: v.string(), name: v.string() })))
    })
  )
  const names = [rendered.name, ...(rendered.siblings?.map((sibling) => sibling.name) ?? [])]
  if (names.length !== SCREENS.length) throw new Error('The design did not render seven screens')
}

async function activeDocumentId(client: Client): Promise<string> {
  const active = (await listDocuments(client)).find((document) => document.active)
  if (!active) throw new Error('The agent edit has no document')
  return active.id
}

async function showDrafts(page: Page) {
  await page.getByRole('tab', { name: 'Home' }).click()
  await expect(page.getByTestId('recent-files-home')).toBeVisible()
  await page.getByTestId('home-tab-drafts').click()
  return page.getByTestId('home-drafts')
}

/** The document the person asked for is the tab in front, and its layer can be selected. */
async function expectOpenDocument(page: Page, layer: string): Promise<void> {
  await expect(page.getByTestId('recent-files-home')).toBeHidden({ timeout: OPEN_WAIT_MS })
  const active = page.locator('[data-slot="tab-item"][data-active]').getByTestId('tabbar-tab')
  await expect(active).toBeVisible({ timeout: OPEN_WAIT_MS })
  const row = page.getByTestId('layers-panel').getByTestId('layers-item').filter({ hasText: layer })
  await row.scrollIntoViewIfNeeded()
  await expect(row).toBeVisible({ timeout: OPEN_WAIT_MS })
  await row.click()
  await expect(row).toHaveAttribute('data-selected', 'true')
}

/** Every screen of the finished design is in the open document. */
async function expectScreens(page: Page): Promise<void> {
  for (const screen of SCREENS) {
    const row = page
      .getByTestId('layers-panel')
      .getByTestId('layers-item')
      .filter({ hasText: screen })
    await row.scrollIntoViewIfNeeded()
    await expect(row).toBeVisible({ timeout: OPEN_WAIT_MS })
  }
}

/** Leaves the open document for Home, comes back, opens another document, and comes back again. */
async function leaveAndReturn(page: Page, layer: string): Promise<void> {
  const tabs = page.getByTestId('tabbar-tab')
  await expect(tabs).toHaveCount(2)
  const agentTab = tabs.nth(1)
  await page.getByRole('tab', { name: 'Home' }).click()
  await expect(page.getByTestId('recent-files-home')).toBeVisible()
  await agentTab.click()
  await expectOpenDocument(page, layer)

  await page.getByRole('tab', { name: 'Home' }).click()
  await page.getByTestId('home-new-design').click()
  await expect(page.getByTestId('recent-files-home')).toBeHidden({ timeout: OPEN_WAIT_MS })
  await agentTab.click()
  await expectOpenDocument(page, layer)
}

async function closeClient(client: Client): Promise<void> {
  await client.close().catch((error: unknown) => {
    if (!(error instanceof Error) || !/closed/i.test(error.message)) throw error
  })
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await expect(page.getByTestId('recent-files-home')).toBeVisible({ timeout: 20_000 })
  await expect.poll(appConnected, { timeout: 20_000 }).toBe(true)
})

test('an agent editing while Home is in front lets the person open that draft', async ({
  page
}) => {
  const client = await connectClient()
  try {
    await page.getByRole('tab', { name: 'Home' }).click()
    await expect(page.getByTestId('recent-files-home')).toBeVisible()
    await designWhileHomeIsInFront(client)
    const editing = keepEditing(client, await activeDocumentId(client))
    await page.getByTestId('home-tab-drafts').click()
    const entry = page.getByTestId('home-drafts').getByRole('button', { name: /^Untitled/ })
    await expect(entry).toBeVisible({ timeout: 15_000 })
    await entry.click()
    await expectOpenDocument(page, LAYER)
    await expectScreens(page)
    await leaveAndReturn(page, LAYER)
    await editing
  } finally {
    await closeClient(client)
  }
})

test('an agent creating a document shows it as a tab the person can open from Home', async ({
  page
}) => {
  const client = await connectClient()
  try {
    const tabs = page.getByTestId('tabbar-tab')
    const tabsBefore = await tabs.count()
    const created = await callTool(client, 'new_document', {}, createdSchema)
    await expect(tabs).toHaveCount(tabsBefore + 1, { timeout: OPEN_WAIT_MS })
    await callTool(
      client,
      'create_shape',
      {
        document_id: created.target.documentId,
        type: 'RECTANGLE',
        x: 16,
        y: 16,
        width: 64,
        height: 40,
        name: LAYER
      },
      v.object({ name: v.string() })
    )
    const editing = keepEditing(client, created.target.documentId)
    const drafts = await showDrafts(page)
    const entry = drafts.getByRole('button', {
      name: new RegExp(`^${created.target.documentName}`)
    })
    await expect(entry).toBeVisible({ timeout: 15_000 })
    await entry.click()
    await expectOpenDocument(page, LAYER)
    await leaveAndReturn(page, LAYER)
    await editing
  } finally {
    await closeClient(client)
  }
})

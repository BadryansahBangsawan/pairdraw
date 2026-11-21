import { afterEach, describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'

import { MCP_AGENT_HEADER } from '@pairdraw/core/constants'

import { startServer, type ServerHandle } from '#mcp/server'
import { SKILL_FILE_PATHS, skillResourceURI } from '#mcp/skill/content'
import { SKILL_PROMPT_NAME } from '#mcp/skill/register'
import { createToolDescriptors } from '#mcp/tool/manifest'
import type { MCPAgentKind } from '#mcp/tool/registration'
import type { MCPToolScope } from '#mcp/tool/scope'

const AUTH_TOKEN = 'skill-test-token'
// A socket of its own, never the running app's default one.
const SOCKET_DIR = join(tmpdir(), `pairdraw-test-skill-${process.pid}`)
let socketCount = 0

async function testSocketPath(): Promise<string | null> {
  if (process.platform === 'win32') return null
  await mkdir(SOCKET_DIR, { recursive: true })
  return join(SOCKET_DIR, `skill-${++socketCount}.sock`)
}

const contexts: { client: Client; handle: ServerHandle }[] = []

afterEach(async () => {
  for (const { client, handle } of contexts.splice(0)) {
    await client.close().catch(() => undefined)
    await handle.close()
  }
  await rm(SOCKET_DIR, { recursive: true, force: true })
})

async function connect(
  options: { scope?: MCPToolScope; disabledTools?: string[] } = {},
  agentKind?: MCPAgentKind
) {
  const handle = await startServer({
    httpPort: 0,
    withTcp: true,
    socketPath: await testSocketPath(),
    authToken: AUTH_TOKEN,
    enableEval: false,
    mcpRoot: null,
    ...options
  })
  const client = new Client({ name: 'skill-test', version: '0.0.0' })
  contexts.push({ client, handle })
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${handle.httpPort}/mcp`), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          ...(agentKind ? { [MCP_AGENT_HEADER]: agentKind } : {})
        }
      }
    })
  )
  return client
}

function expectDefined<T>(value: T | null | undefined, label: string): NonNullable<T> {
  if (value == null) throw new Error(`${label} was expected to be defined`)
  return value
}

/** The workspace root, found by its lockfile rather than by counting directories. */
function workspaceRoot(): string {
  for (let dir = import.meta.dir; ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'bun.lock'))) return dir
    if (dirname(dir) === dir) throw new Error(`No workspace root above ${import.meta.dir}`)
  }
}

/** The installable skill's file in the repository, which the server must serve unchanged. */
function skillSource(path: string): Promise<string> {
  return readFile(join(workspaceRoot(), 'skills/pairdraw', path), 'utf8')
}

function text(content: readonly { type: string; text?: string }[]): string {
  return content.map((block) => (block.type === 'text' ? (block.text ?? '') : '')).join('\n')
}

describe('MCP agent skill', () => {
  test('tells clients where the skill is in the server instructions', async () => {
    const client = await connect()
    const instructions = expectDefined(client.getInstructions(), 'server instructions')
    // Codex shows only the first 512 characters; they must already point at the skill.
    const visible = instructions.slice(0, 512)
    expect(visible).toContain('read_skill')
    expect(visible).toContain(skillResourceURI('SKILL.md'))
  })

  test('read_skill returns SKILL.md by default and each reference by path', async () => {
    const client = await connect()
    const skill = await client.callTool({ name: 'read_skill', arguments: {} })
    expect(skill.isError).not.toBe(true)
    expect(text(skill.content)).toBe(await skillSource('SKILL.md'))

    const reference = await client.callTool({
      name: 'read_skill',
      arguments: { path: 'references/design-authoring.md' }
    })
    expect(text(reference.content)).toBe(await skillSource('references/design-authoring.md'))
  })

  test('read_skill rejects paths outside the skill', async () => {
    const client = await connect()
    for (const path of ['../package.json', '/etc/passwd', 'references/missing.md']) {
      const result = await client.callTool({ name: 'read_skill', arguments: { path } })
      expect(result.isError).toBe(true)
    }
  })

  test('serves every skill file as a Markdown resource', async () => {
    const client = await connect()
    const { resources } = await client.listResources()
    expect(resources.map((resource) => resource.uri).toSorted()).toEqual(
      SKILL_FILE_PATHS.map(skillResourceURI).toSorted()
    )
    for (const path of SKILL_FILE_PATHS) {
      const { contents } = await client.readResource({ uri: skillResourceURI(path) })
      expect(contents).toEqual([
        { uri: skillResourceURI(path), mimeType: 'text/markdown', text: await skillSource(path) }
      ])
    }
  })

  test('the design prompt loads the skill with an optional task', async () => {
    const client = await connect()
    const { prompts } = await client.listPrompts()
    const prompt = expectDefined(
      prompts.find((entry) => entry.name === SKILL_PROMPT_NAME),
      'design prompt'
    )
    expect(prompt.arguments?.map((argument) => argument.name)).toEqual(['task'])

    const withTask = await client.getPrompt({
      name: SKILL_PROMPT_NAME,
      arguments: { task: 'a pricing page' }
    })
    const body = withTask.messages
      .map((message) => (message.content.type === 'text' ? message.content.text : ''))
      .join('\n')
    expect(body).toContain(await skillSource('SKILL.md'))
    expect(body).toContain(await skillSource('references/design-authoring.md'))
    expect(withTask.messages.at(-1)?.content).toMatchObject({
      type: 'text',
      text: expect.stringContaining('a pricing page')
    })

    const withoutTask = await client.getPrompt({ name: SKILL_PROMPT_NAME, arguments: {} })
    expect(withoutTask.messages).toHaveLength(withTask.messages.length)
  })

  test('the skill stays readable as resources when read_skill is off', async () => {
    for (const options of [{ disabledTools: ['read_skill'] }, { scope: 'selection' as const }]) {
      const client = await connect(options)
      const { tools } = await client.listTools()
      expect(tools.some((tool) => tool.name === 'read_skill')).toBe(false)
      const { resources } = await client.listResources()
      expect(resources).toHaveLength(SKILL_FILE_PATHS.length)
    }
  })

  test('instructions name only the tools the session exposes', async () => {
    const toolNames = createToolDescriptors(true).map((descriptor) => descriptor.name)
    for (const options of [
      {},
      { scope: 'selection' as const },
      {
        disabledTools: [
          'read_skill',
          'list_documents',
          'undo',
          'redo',
          'get_codegen_prompt',
          'get_design_memory'
        ]
      }
    ]) {
      const client = await connect(options)
      const instructions = expectDefined(client.getInstructions(), 'server instructions')
      const exposed = new Set((await client.listTools()).tools.map((tool) => tool.name))
      const named = toolNames.filter((name) => new RegExp(`\\b${name}\\b`).test(instructions))
      expect(named.filter((name) => !exposed.has(name))).toEqual([])
      // The resources stay on, so the skill is always reachable through them.
      expect(instructions.slice(0, 512)).toContain(skillResourceURI('SKILL.md'))
    }
  })

  test('instructions point agents at the design memory when the tool is exposed', async () => {
    const client = await connect()
    expect(client.getInstructions()).toContain('get_design_memory')
  })

  test('app chats get no skill paragraph; their prompt already carries the reference', async () => {
    for (const kind of ['acp', 'harness'] as const) {
      const client = await connect({}, kind)
      const instructions = expectDefined(client.getInstructions(), 'server instructions')
      expect(instructions).toContain('Pairdraw is a design editor')
      expect(instructions).not.toContain('read_skill')
      expect(instructions).not.toContain(skillResourceURI('SKILL.md'))
    }
    const external = await connect({}, 'mcp')
    expect(external.getInstructions()).toContain('read_skill')
  })
})

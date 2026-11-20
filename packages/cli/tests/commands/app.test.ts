import { afterAll, beforeAll, beforeEach, describe, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import * as v from 'valibot'

import { CLI_ENTRY } from '#cli-tests/helpers/paths'

setDefaultTimeout(60_000)

const TOKEN = 'cli-app-test-token'
const TARGET = {
  documentId: 'doc-2',
  documentName: 'Landing',
  pageId: '0:1',
  pageName: 'Page 1'
}

const requestSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.object({ command: v.string(), args: v.record(v.string(), v.unknown()) })
)

const agentSchema = v.object({
  session: v.pipe(v.string(), v.minLength(1)),
  kind: v.literal('mcp'),
  client: v.literal('CLI')
})

type Request = v.InferOutput<typeof requestSchema>

const requests: Request[] = []
const responses = new Map<string, unknown>()
let server: Server
let discoveryPath: string

beforeAll(async () => {
  server = createServer((request, response) => {
    let body = ''
    request.on('data', (chunk: Buffer) => {
      body += chunk.toString()
    })
    request.on('end', () => {
      const parsed = v.parse(requestSchema, body)
      requests.push(parsed)
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(
        JSON.stringify({ ok: true, result: responses.get(parsed.command) ?? {}, target: TARGET })
      )
    })
  })
  await new Promise<void>((done) => {
    server.listen(0, '127.0.0.1', done)
  })
  const dir = await mkdtemp(join(tmpdir(), 'pairdraw-cli-app-'))
  discoveryPath = join(dir, 'discovery.json')
  await writeFile(
    discoveryPath,
    JSON.stringify({
      pid: process.pid,
      socketPath: join(dir, 'missing.sock'),
      httpPort: (server.address() as AddressInfo).port,
      authRequired: true,
      authToken: TOKEN,
      version: '0.0.0-test',
      startedAt: new Date().toISOString()
    })
  )
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  requests.length = 0
  responses.clear()
})

/** The process session is not part of the command's own arguments. */
function commandArgs(request: Request | undefined): Record<string, unknown> {
  const args = request?.args ?? {}
  const { agent: _agent, ...rest } = args
  return rest
}

function expectProcessAgent(request: Request | undefined): v.InferOutput<typeof agentSchema> {
  const parsed = v.safeParse(agentSchema, request?.args.agent)
  expect(parsed.success).toBe(true)
  if (!parsed.success) throw new Error('The app call had no session')
  return parsed.output
}

async function cli(args: string[], env: Record<string, string> = {}) {
  const proc = Bun.spawn([process.execPath, CLI_ENTRY, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, PAIRDRAW_MCP_DISCOVERY_PATH: discoveryPath, ...env }
  })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ])
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited }
}

describe('app session', () => {
  test('one process sends the same session on every app call', async () => {
    const proc = Bun.spawn(
      [
        process.execPath,
        '-e',
        "import { rpc } from '#cli/app/client'; await rpc('list_documents', {}); await rpc('tool', { name: 'get_selection', args: {} });"
      ],
      {
        cwd: dirname(dirname(CLI_ENTRY)),
        stdout: 'pipe',
        stderr: 'pipe',
        env: { ...process.env, PAIRDRAW_MCP_DISCOVERY_PATH: discoveryPath }
      }
    )
    const stderr = await new Response(proc.stderr).text()
    const exitCode = await proc.exited
    expect(exitCode, stderr).toBe(0)

    expect(requests.map((request) => request.command)).toEqual(['list_documents', 'tool'])
    expect(commandArgs(requests[1])).toEqual({ name: 'get_selection', args: {} })
    const first = expectProcessAgent(requests[0])
    expect(first).toEqual({ session: 'cli', kind: 'mcp', client: 'CLI' })
    expect(expectProcessAgent(requests[1])).toEqual(first)
  })

  test('uses PAIRDRAW_SESSION when it names a session, and cli otherwise', async () => {
    await cli(['documents', 'list'])
    expect(expectProcessAgent(requests[0])).toEqual({ session: 'cli', kind: 'mcp', client: 'CLI' })

    requests.length = 0
    await cli(['documents', 'list'], { PAIRDRAW_SESSION: '  side-by-side  ' })
    expect(expectProcessAgent(requests[0])).toEqual({
      session: 'side-by-side',
      kind: 'mcp',
      client: 'CLI'
    })

    requests.length = 0
    await cli(['documents', 'list'], { PAIRDRAW_SESSION: 'x'.repeat(129) })
    expect(expectProcessAgent(requests[0]).session).toBe('cli')

    requests.length = 0
    await cli(['documents', 'list'], { PAIRDRAW_SESSION: '   ' })
    expect(expectProcessAgent(requests[0]).session).toBe('cli')
  })
})

describe('documents CLI', () => {
  test('opens files by absolute path and reports the target document', async () => {
    const opened = await cli(['documents', 'open', 'designs/landing.fig', '--json'])
    expect(opened.exitCode).toBe(0)
    expect(requests.map((request) => request.command)).toEqual(['open_file'])
    expect(commandArgs(requests[0])).toEqual({ path: resolve('designs/landing.fig') })
    expectProcessAgent(requests[0])
    expect(JSON.parse(opened.stdout)).toEqual({ result: {}, target: TARGET })
  })

  test('saves, closes, and activates a targeted document', async () => {
    await cli(['documents', 'save', '--document-id', 'doc-2', '--path', 'out.fig'])
    await cli(['documents', 'close', '--document-id', 'doc-2', '--discard'])
    await cli(['documents', 'activate', 'doc-2', '--page-id', '0:1'])
    expect(requests.map((request) => request.command)).toEqual([
      'save_file',
      'close_file',
      'activate_document'
    ])
    expect(commandArgs(requests[0])).toEqual({
      document_id: 'doc-2',
      path: resolve('out.fig')
    })
    expect(commandArgs(requests[1])).toEqual({ document_id: 'doc-2', unsaved: 'discard' })
    expect(commandArgs(requests[2])).toEqual({ document_id: 'doc-2', page_id: '0:1' })
    const first = expectProcessAgent(requests[0])
    // Separate processes share the cli session unless PAIRDRAW_SESSION names another.
    expect(first.session).toBe('cli')
    expect(expectProcessAgent(requests[1]).session).toBe('cli')
    expect(expectProcessAgent(requests[2]).session).toBe('cli')
  })

  test('close --save forwards the save choice and an absolute path', async () => {
    await cli(['documents', 'close', '--save', '--path', 'draft.fig'])
    expect(requests.map((request) => request.command)).toEqual(['close_file'])
    expect(commandArgs(requests[0])).toEqual({ unsaved: 'save', path: resolve('draft.fig') })
    expectProcessAgent(requests[0])
    const both = await cli(['documents', 'close', '--save', '--discard'])
    expect(both.exitCode).toBe(1)
  })
})

describe('--page and --page-id', () => {
  const documents = [
    {
      id: 'doc-2',
      name: 'Landing',
      active: true,
      current_page_id: '0:1',
      current_page_name: 'Page 1',
      pages: [
        { id: '0:1', name: 'Page 1' },
        { id: '0:2', name: 'Worklist' }
      ]
    }
  ]

  test('a page name reaches the app as the page ID of the document it was found in, for reads, scripts, and tools alike', async () => {
    responses.set('list_documents', { documents })
    responses.set('tree', { page: { id: '0:2', name: 'Worklist', type: 'CANVAS' }, children: [] })
    await cli(['tree', '--page', 'Worklist'])
    await cli(['eval', '--page', 'Worklist', '-c', 'return 1'])
    await cli(['tool', 'call', 'get_selection', '--page', 'Worklist'])
    expect(
      requests
        .filter((request) => request.command !== 'list_documents')
        .map((request) => ({ command: request.command, args: commandArgs(request) }))
    ).toEqual([
      { command: 'tree', args: { document_id: 'doc-2', page_id: '0:2' } },
      { command: 'eval', args: { code: 'return 1', document_id: 'doc-2', page_id: '0:2' } },
      {
        command: 'tool',
        args: { document_id: 'doc-2', page_id: '0:2', name: 'get_selection', args: {} }
      }
    ])
  })

  test('cannot be passed together', async () => {
    const both = await cli(['find', '--page', 'Worklist', '--page-id', '0:2'])
    expect(both.exitCode).toBe(1)
    expect(both.stderr).toContain('--page and --page-id cannot be used together.')
    expect(requests).toEqual([])
  })
})

describe('history CLI', () => {
  test('reports the undone change', async () => {
    responses.set('undo', { applied: true, label: 'Agent: set_opacity' })
    const undone = await cli(['undo', '--document-id', 'doc-2'])
    expect(undone.exitCode).toBe(0)
    expect(undone.stdout).toContain('Undid: Agent: set_opacity')
    expect(requests.map((request) => request.command)).toEqual(['undo'])
    expect(commandArgs(requests[0])).toEqual({ document_id: 'doc-2' })
    expectProcessAgent(requests[0])
  })
})

describe('settings CLI', () => {
  test('sets a dotted key as a nested patch with a JSON or string value', async () => {
    responses.set('update_settings', {
      settings: { appearance: { theme: 'light' }, editing: { snapping: { pixelGrid: false } } }
    })
    await cli(['settings', 'set', 'editing.snapping.pixelGrid', 'false'])
    const theme = await cli(['settings', 'set', 'appearance.theme', 'light'])
    expect(theme.exitCode).toBe(0)
    expect(requests.map((request) => request.command)).toEqual([
      'update_settings',
      'update_settings'
    ])
    expect(commandArgs(requests[0])).toEqual({
      settings: { editing: { snapping: { pixelGrid: false } } }
    })
    expect(commandArgs(requests[1])).toEqual({ settings: { appearance: { theme: 'light' } } })
    expectProcessAgent(requests[0])
    expectProcessAgent(requests[1])
  })

  test('reads one setting by dotted key and rejects unknown keys', async () => {
    responses.set('get_settings', { settings: { appearance: { theme: 'auto' } } })
    const theme = await cli(['settings', 'get', 'appearance.theme'])
    expect(theme.stdout).toBe('auto')

    const inherited = await cli(['settings', 'get', 'appearance.constructor'])
    expect(inherited.exitCode).toBe(1)

    const missing = await cli(['settings', 'get', 'appearance.font'])
    expect(missing.exitCode).toBe(1)
    expect(missing.stderr).toContain('Unknown setting "appearance.font"')
  })
})

import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as v from 'valibot'

import { CLI_ENTRY, FIXTURES } from '#cli-tests/helpers/paths'

setDefaultTimeout(60_000)

const FIXTURE = join(FIXTURES, 'gold-preview.fig')

const requestSchema = v.object({
  tools: v.optional(
    v.array(v.object({ function: v.optional(v.object({ name: v.optional(v.string()) })) }))
  ),
  messages: v.optional(
    v.array(
      v.object({
        role: v.optional(v.string()),
        content: v.optional(v.nullable(v.union([v.string(), v.array(v.unknown())])))
      })
    )
  )
})
const roundSchema = v.object({
  agent: v.string(),
  text: v.string(),
  steps: v.number(),
  tools: v.array(v.object({ name: v.string(), ok: v.boolean(), error: v.optional(v.string()) }))
})
const runSchema = v.object({
  text: v.string(),
  steps: v.number(),
  tools: v.array(v.object({ name: v.string(), ok: v.boolean(), error: v.optional(v.string()) })),
  rounds: v.array(roundSchema),
  output: v.optional(v.string())
})
type AgentRun = v.InferOutput<typeof runSchema>
type ScriptStep = { call: { name: string; args: Record<string, unknown> } } | { text: string }

/** One request the run made, as the fake endpoint saw it. */
interface RequestRecord {
  tools: string[]
  /** The user turn's text, so a test can read what a later agent was told. */
  prompt: string
}

interface ProviderState {
  url: string
  requests: RequestRecord[]
  stop(): void
}

/** A fake [OI]-compatible endpoint that answers from a scripted list of tool calls and replies. */
function startProvider(script: ScriptStep[]): ProviderState {
  const requests: RequestRecord[] = []
  const server = Bun.serve({
    port: 0,
    async fetch(request: Request) {
      const body = v.safeParse(
        v.pipe(v.string(), v.parseJson(), requestSchema),
        await request.text()
      )
      if (!body.success) return Response.json({ error: { message: 'bad request' } }, { status: 400 })
      const tools = (body.output.tools ?? []).flatMap((entry) =>
        entry.function?.name === undefined ? [] : [entry.function.name]
      )
      const prompt =
        body.output.messages?.findLast((message) => message.role === 'user')?.content?.toString() ??
        ''
      requests.push({ tools, prompt })

      const next = script.shift()
      if (!next) return Response.json({ error: { message: 'script exhausted' } }, { status: 500 })
      const message =
        'text' in next
          ? { role: 'assistant', content: next.text }
          : {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: `call-${next.call.name}`,
                  type: 'function',
                  function: { name: next.call.name, arguments: JSON.stringify(next.call.args) }
                }
              ]
            }
      return Response.json({
        id: 'chatcmpl-agent-test',
        object: 'chat.completion',
        choices: [{ index: 0, message, finish_reason: 'text' in next ? 'stop' : 'tool_calls' }]
      })
    }
  })
  return {
    url: `http://127.0.0.1:${server.port}/v1`,
    requests,
    stop: () => server.stop()
  }
}

async function cli(args: string[]) {
  const proc = Bun.spawn([process.execPath, CLI_ENTRY, ...args], { stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ])
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited }
}

function parseRun(text: string): AgentRun {
  return v.parse(v.pipe(v.string(), v.parseJson(), runSchema), text)
}

/** The arguments shared by the end-to-end runs, so each test only adds what it is about. */
function runArgs(provider: ProviderState, dir: string, extra: string[]) {
  return [
    'agent',
    'run',
    'Make the page',
    FIXTURE,
    '--base-url',
    provider.url,
    '--model',
    'mock',
    '--api-key',
    'test-key',
    '--root',
    dir,
    ...extra,
    '--json'
  ]
}

describe('headless agent CLI', () => {
  let dir = ''
  let provider: ProviderState | undefined

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'pairdraw-agent-'))
  })

  afterAll(() => provider?.stop())

  test('runs the model tool calls on a headless document and saves them', async () => {
    provider = startProvider([
      { call: { name: 'create_page', args: { name: 'Agent page' } } },
      { text: 'Created the page.' }
    ])
    const output = join(dir, 'out.fig')
    const run = await cli(runArgs(provider, dir, ['--output', output]))
    expect(run.stderr).toBe('')
    expect(run.exitCode).toBe(0)
    const result = parseRun(run.stdout)
    expect(result.text).toBe('Created the page.')
    expect(result.steps).toBe(2)
    expect(result.tools).toEqual([{ name: 'create_page', ok: true }])
    expect(result.rounds.map((round) => round.agent)).toEqual(['designer'])

    const pages = await cli(['tool', 'call', 'list_pages', output, '--json'])
    expect(pages.stdout).toContain('Agent page')
  })

  test('offers the designer default tools, never eval or a network tool', () => {
    const offered = provider?.requests[0]?.tools ?? []
    expect(offered).toContain('create_page')
    expect(offered).not.toContain('eval')
    expect(offered).not.toContain('stock_photo')
  })

  test('writes a tool file inside the root and refuses a path that leaves it', async () => {
    provider = startProvider([
      { call: { name: 'export_svg', args: { path: 'art/board.svg' } } },
      { call: { name: 'export_svg', args: { path: '../escaped.svg' } } },
      { text: 'Finished.' }
    ])
    const run = await cli(runArgs(provider, dir, ['--allow', 'export_svg', '--max-steps', '3']))
    expect(run.exitCode).toBe(0)
    const result = parseRun(run.stdout)
    expect(result.tools[0]).toEqual({ name: 'export_svg', ok: true })
    expect(result.tools[1]?.ok).toBe(false)
    expect(result.tools[1]?.error).toContain('outside the allowed root')
  })

  test('runs a designer then a reviewer with only reads, and tells the reviewer what was done', async () => {
    provider = startProvider([
      { call: { name: 'create_page', args: { name: 'Reviewed page' } } },
      { text: 'Created the page.' },
      { text: 'The page needs a heading.' }
    ])
    const run = await cli(
      runArgs(provider, dir, ['--agents', 'designer,reviewer', '--output', join(dir, 'team.fig')])
    )
    expect(run.stderr).toBe('')
    expect(run.exitCode).toBe(0)
    const result = parseRun(run.stdout)
    expect(result.rounds.map((round) => round.agent)).toEqual(['designer', 'reviewer'])
    expect(result.rounds.map((round) => round.text)).toEqual([
      'Created the page.',
      'The page needs a heading.'
    ])
    expect(result.text).toBe('The page needs a heading.')

    // The designer's turn spans two requests when a tool result comes back; the reviewer's is last.
    const reviewer = provider.requests.at(-1)
    expect(reviewer?.tools).not.toContain('create_page')
    expect(reviewer?.tools).not.toContain('set_text')
    expect(reviewer?.tools).toContain('get_node')
    expect(reviewer?.prompt).toContain('Agents before you in this run:')
    expect(reviewer?.prompt).toContain('designer: Created the page.')
  })

  test('never offers a reviewer a tool the run withheld, however it is named', async () => {
    provider = startProvider([{ text: 'Nothing to report.' }])
    const run = await cli(
      runArgs(provider, dir, ['--agents', 'reviewer', '--deny', 'get_node', '--allow', 'stock_photo'])
    )
    expect(run.exitCode).toBe(0)
    const offered = provider.requests[0]?.tools ?? []
    expect(offered).not.toContain('get_node')
    expect(offered).not.toContain('stock_photo')
    expect(offered).not.toContain('eval')
  })

  test('refuses an agent this build does not know', async () => {
    provider = startProvider([{ text: 'unused' }])
    const run = await cli(runArgs(provider, dir, ['--agents', 'designer,illustrator']))
    expect(run.exitCode).toBe(1)
    expect(run.stderr).toContain('Unknown agent "illustrator"')
  })

  test('lists the named agents', async () => {
    const listed = await cli(['agent', 'list', '--json'])
    expect(listed.exitCode).toBe(0)
    expect(listed.stdout).toContain('"designer"')
    expect(listed.stdout).toContain('"reviewer"')
    expect(listed.stdout).toContain('"typesetter"')
  })

  test('reports the missing key and the missing endpoint before running', async () => {
    const missingKey = await cli([
      'agent',
      'run',
      'Do it',
      FIXTURE,
      '--base-url',
      'http://127.0.0.1:1',
      '--model',
      'mock'
    ])
    expect(missingKey.exitCode).toBe(1)
    expect(missingKey.stderr).toContain('PAIRDRAW_API_KEY')

    const missingURL = await cli([
      'agent',
      'run',
      'Do it',
      FIXTURE,
      '--model',
      'mock',
      '--api-key',
      'key'
    ])
    expect(missingURL.exitCode).toBe(1)
    expect(missingURL.stderr).toContain('--base-url')
  })
})

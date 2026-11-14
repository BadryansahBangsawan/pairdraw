import { describe, expect, test } from 'bun:test'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { ToolDef } from '@pairdraw/core/tools'
import { SceneGraph } from '@pairdraw/scene-graph'

import type { ToolSession } from '#cli/session/open'
import { createShell, runShell, type ShellOptions } from '#cli/shell/run'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47])

/** A headless session that records what the shell asks of it instead of editing a document. */
function recordingSession(overrides: Partial<ToolSession> = {}) {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = []
  const saves: Array<string | undefined> = []
  let previews = 0
  const session: ToolSession = {
    label: 'design.fig',
    graph: new SceneGraph(),
    call(def: ToolDef, args: Record<string, unknown>) {
      calls.push({ name: def.name, args })
      return Promise.resolve({ ok: def.name })
    },
    preview() {
      previews++
      return Promise.resolve(PNG)
    },
    save(path) {
      saves.push(path)
      return Promise.resolve()
    },
    ...overrides
  }
  return { session, calls, saves, previews: () => previews }
}

async function* linesOf(lines: string[]): AsyncIterable<string> {
  for (const line of lines) yield await Promise.resolve(line)
}

async function shell(session: ToolSession, lines: string[], options: Partial<ShellOptions> = {}) {
  const out: string[] = []
  const err: string[] = []
  const result = await runShell(
    session,
    linesOf(lines),
    { out: (text) => out.push(text), err: (text) => err.push(text) },
    { previewScale: 1, interactive: false, savePath: 'design.fig', ...options }
  )
  return { result, out: out.join('\n'), err: err.join('\n') }
}

describe('pairdraw shell', () => {
  test('runs every tool on the same session and stops at exit()', async () => {
    const { session, calls, saves } = recordingSession()
    const { result, out } = await shell(session, [
      'list_pages',
      'create_page {"name": "Home"}',
      'save()',
      'exit()',
      'create_page {"name": "Never"}'
    ])
    expect(calls).toEqual([
      { name: 'list_pages', args: {} },
      { name: 'create_page', args: { name: 'Home' } }
    ])
    expect(saves).toEqual(['design.fig'])
    expect(result).toEqual({ failures: 0, unsaved: false })
    expect(out).toContain('"ok": "create_page"')
  })

  test('reports a failing line and carries on, counting the failure', async () => {
    const { session, calls } = recordingSession({
      call: (def) =>
        def.name === 'set_fill'
          ? Promise.reject(new Error('Node not found: 9:9'))
          : Promise.resolve({ error: 'Page "Missing" not found' })
    })
    const { result, err, out } = await shell(session, [
      'not_a_tool',
      'set_fill {"id": "9:9", "color": "#ff0000"}',
      'switch_page {"page": "Missing"}',
      'create_page [1]'
    ])
    expect(err).toContain('Unknown tool "not_a_tool"')
    expect(err).toContain('Node not found: 9:9')
    expect(err).toContain('Tool arguments must be a JSON object')
    expect(out).toContain('Page \\"Missing\\" not found')
    expect(result.failures).toBe(4)
    expect(calls).toEqual([])
  })

  test('writes a preview PNG after each change, and only after a change', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-shell-preview-'))
    const previewPath = join(dir, 'preview.png')
    const { session, previews } = recordingSession()
    const { err } = await shell(session, ['list_pages', 'create_page {"name": "A"}'], {
      previewOutput: previewPath
    })
    expect(previews()).toBe(1)
    expect(new Uint8Array(await readFile(previewPath))).toEqual(PNG)
    expect(err).toContain(`Preview: ${previewPath}`)
  })

  test('keeps the change when its preview cannot be drawn', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-shell-preview-'))
    const { session } = recordingSession({
      preview: () => Promise.reject(new Error('No visible nodes to export'))
    })
    const { result, err } = await shell(session, ['create_page {"name": "A"}'], {
      previewOutput: join(dir, 'preview.png')
    })
    expect(err).toContain('No preview: No visible nodes to export')
    expect(result).toEqual({ failures: 0, unsaved: true })
  })

  test('preview() writes on demand and needs a path when none was given at start', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-shell-preview-'))
    const target = join(dir, 'now.png')
    const { session } = recordingSession()
    const { result, err } = await shell(session, [
      'preview()',
      `preview(${JSON.stringify(target)})`
    ])
    expect(err).toContain('start with --preview-output')
    expect(new Uint8Array(await readFile(target))).toEqual(PNG)
    expect(result.failures).toBe(1)
  })

  test('saves only as .fig, and asks for a path a headless document lacks', async () => {
    const { session, saves } = recordingSession()
    const { result, err } = await shell(
      session,
      ['save()', 'save("copy.pen")', 'save("copy.fig")'],
      { savePath: 'design.pen' }
    )
    expect(err).toContain('save("design.fig")')
    expect(err).toContain('save("copy.fig")')
    expect(saves).toEqual(['copy.fig'])
    expect(result.failures).toBe(2)

    const unnamed = recordingSession()
    const { err: unnamedErr } = await shell(unnamed.session, ['save()'], { savePath: undefined })
    expect(unnamedErr).toContain('has no .fig path yet')
    expect(unnamed.saves).toEqual([])
  })

  test('an app session saves to the document the app has open', async () => {
    const { session, saves } = recordingSession({ graph: null, label: 'app' })
    const { result, err } = await shell(session, ['create_page {"name": "A"}', 'save()'], {
      savePath: undefined
    })
    expect(saves).toEqual([undefined])
    expect(err).toContain('Saved document')
    // The app keeps its own unsaved state; the shell has nothing to lose on exit.
    expect(result.unsaved).toBe(false)
  })

  test('an interactive exit() asks again before discarding unsaved changes', async () => {
    const { session, calls } = recordingSession()
    const { result, err } = await shell(
      session,
      ['create_page {"name": "A"}', 'exit()', 'create_page {"name": "B"}', 'exit()', 'exit()'],
      { interactive: true }
    )
    expect(err).toContain('Run save() first, or run exit() again to discard them')
    // A command between the two exits withdraws the first one.
    expect(calls.map((call) => call.args.name)).toEqual(['A', 'B'])
    expect(result.unsaved).toBe(true)
    expect(err).toContain('Changes were not saved')
  })

  test('Ctrl+C or Ctrl+D on an empty line leaves as exit() does', async () => {
    const err: string[] = []
    const output = { out: () => undefined, err: (text: string) => err.push(text) }
    const options = { previewScale: 1, interactive: true, savePath: 'design.fig' }

    // Nothing to lose: the first press leaves.
    expect(createShell(recordingSession().session, output, options).leave('Ctrl+C')).toBe(true)

    const shell = createShell(recordingSession().session, output, options)
    await shell.line('create_page {"name": "A"}')
    expect(shell.leave('Ctrl+C')).toBe(false)
    expect(err.join('\n')).toContain('Run save() first, or press Ctrl+C again to discard them')
    // A command between the two presses withdraws the first one.
    await shell.line('create_page {"name": "B"}')
    expect(shell.leave('Ctrl+D')).toBe(false)
    expect(err.join('\n')).toContain('or press Ctrl+D again')
    // A second request in any of the ways discards the changes.
    expect(await shell.line('exit()')).toBe(true)
    expect(shell.finish()).toEqual({ failures: 0, unsaved: true })
    expect(err.join('\n')).toContain('Changes were not saved')

    const saved = createShell(recordingSession().session, output, options)
    await saved.line('create_page {"name": "C"}')
    await saved.line('save()')
    expect(saved.leave('Ctrl+C')).toBe(true)
  })

  test('a piped shell leaves on the first Ctrl+C or Ctrl+D', async () => {
    const shell = createShell(
      recordingSession().session,
      { out: () => undefined, err: () => undefined },
      { previewScale: 1, interactive: false, savePath: 'design.fig' }
    )
    await shell.line('create_page {"name": "A"}')
    expect(shell.leave('Ctrl+C')).toBe(true)
    expect(shell.leave('Ctrl+D')).toBe(true)
  })

  test('a script piped in exits at once and warns that its changes were not saved', async () => {
    const { session } = recordingSession()
    const { result, err } = await shell(session, ['create_page {"name": "A"}', 'exit()'])
    expect(result.unsaved).toBe(true)
    expect(err).toContain('Changes were not saved')
    expect(err).not.toContain('exit() again')
  })

  test('lists the tools and describes one', async () => {
    const { session } = recordingSession()
    const { out, result } = await shell(session, ['tools()', 'help("set_fill")', 'help()'])
    expect(out).toContain('set_fill')
    expect(out).toContain('[write]')
    expect(out).toContain('save()')
    expect(result.failures).toBe(0)
  })
})

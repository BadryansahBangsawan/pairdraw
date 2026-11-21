import { afterAll, describe, expect, setDefaultTimeout, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CLI_ENTRY } from '#cli-tests/helpers/paths'
import { runCommand } from 'citty'

import { BUILTIN_IO_FORMATS, IORegistry } from '@pairdraw/core/io'
import { SceneGraph, type Fill } from '@pairdraw/scene-graph'

import exportCommand from '#cli/commands/export'

setDefaultTimeout(60_000)

/** The folders the tests write documents and videos into, removed when they finish. */
const folders: string[] = []
afterAll(async () => {
  await Promise.all(folders.map((folder) => rm(folder, { recursive: true, force: true })))
})

/** Headless MP4 needs an ffmpeg with libx264 on the path, which this machine may not have. */
const hasFFmpeg = spawnSync('ffmpeg', ['-hide_banner', '-encoders'], {
  encoding: 'utf8'
}).stdout?.includes('libx264')

function solid(r: number, g: number, b: number): Fill[] {
  return [
    { type: 'SOLID', color: { r, g, b, a: 1 }, opacity: 1, visible: true, blendMode: 'NORMAL' }
  ]
}

/** A `.fig` whose Intro frame dissolves to Outro after half a second; Outro leads nowhere. */
async function writeFlowFig(): Promise<string> {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const intro = graph.createNode('FRAME', pageId, {
    name: 'Intro',
    width: 60,
    height: 40,
    fills: solid(1, 0, 0)
  })
  const outro = graph.createNode('FRAME', pageId, {
    name: 'Outro',
    x: 100,
    width: 60,
    height: 40,
    fills: solid(0, 0, 1)
  })
  graph.updateNode(intro.id, {
    prototypeReactions: [
      {
        id: '9:1',
        trigger: { type: 'AFTER_TIMEOUT', delay: 0.5 },
        actions: [
          {
            type: 'NODE',
            nodeId: outro.id,
            navigation: 'NAVIGATE',
            transition: { type: 'DISSOLVE', duration: 0.2 },
            overlayPosition: 'CENTER'
          }
        ]
      }
    ]
  })
  const folder = await mkdtemp(join(tmpdir(), 'pairdraw-video-test-'))
  folders.push(folder)
  const path = join(folder, 'flow.fig')
  const written = await new IORegistry(BUILTIN_IO_FORMATS).writeDocument('fig', graph)
  await Bun.write(path, written.data)
  return path
}

describe('export a prototype video', () => {
  test('records the prototype from the start frame to a GIF beside the document', async () => {
    const file = await writeFlowFig()
    const output = join(file, '..', 'flow.gif')

    await runCommand(exportCommand, {
      rawArgs: [file, '-f', 'gif', '--start', 'Intro', '--fps', '10', '--tail', '0.3']
    })

    const gif = await readFile(output)
    expect(new TextDecoder().decode(gif.subarray(0, 6))).toBe('GIF89a')
    // The logical screen is the start frame at scale 1.
    expect(gif[6] | (gif[7] << 8)).toBe(60)
    expect(gif[8] | (gif[9] << 8)).toBe(40)
  })

  test('says why when the start frame has nothing to follow', async () => {
    const file = await writeFlowFig()
    const output = join(file, '..', 'still.gif')
    const proc = Bun.spawn(
      [process.execPath, CLI_ENTRY, 'export', file, '-f', 'gif', '--start', 'Outro', '-o', output],
      { stdout: 'pipe', stderr: 'pipe' }
    )
    const stderr = await new Response(proc.stderr).text()

    expect(await proc.exited).toBe(1)
    expect(stderr).toContain("'Outro' has no After delay interaction to follow")
    expect(await Bun.file(output).exists()).toBe(false)
  })

  test('says which formats work when this engine cannot encode MP4', async () => {
    const file = await writeFlowFig()
    const output = join(file, '..', 'flow.mp4')
    // No ffmpeg on the path, and Bun has no WebCodecs, so only a GIF can be recorded here.
    const proc = Bun.spawn([process.execPath, CLI_ENTRY, 'export', file, '-f', 'mp4', '-o', output], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, PATH: '' }
    })
    const stderr = await new Response(proc.stderr).text()

    expect(await proc.exited).toBe(1)
    expect(stderr).toContain('MP4 can’t be encoded here at 60×40. Formats that work here: GIF.')
    expect(await Bun.file(output).exists()).toBe(false)
  })

  test.skipIf(!hasFFmpeg)('records an MP4 from a file through ffmpeg', async () => {
    const file = await writeFlowFig()
    const output = join(file, '..', 'flow.mp4')

    await runCommand(exportCommand, {
      rawArgs: [file, '-f', 'mp4', '--start', 'Intro', '--fps', '10', '-o', output]
    })

    const mp4 = await readFile(output)
    // An MP4 starts with its `ftyp` box.
    expect(new TextDecoder().decode(mp4.subarray(4, 8))).toBe('ftyp')
  })
})

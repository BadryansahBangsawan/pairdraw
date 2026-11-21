import { describe, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CLI_ENTRY } from '#cli-tests/helpers/paths'
import { runCommand } from 'citty'

import { BUILTIN_IO_FORMATS, IORegistry } from '@pairdraw/core/io'
import { SceneGraph, type Fill } from '@pairdraw/scene-graph'

import exportCommand from '#cli/commands/export'

setDefaultTimeout(60_000)

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
  const path = join(await mkdtemp(join(tmpdir(), 'pairdraw-video-')), 'flow.fig')
  const written = await new IORegistry(BUILTIN_IO_FORMATS).writeDocument('fig', graph)
  await Bun.write(path, written.data)
  return path
}

describe('export -f gif', () => {
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
})

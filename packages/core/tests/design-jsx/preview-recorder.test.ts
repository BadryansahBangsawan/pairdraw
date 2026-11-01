import { afterEach, describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { createJSXPreviewRecorder, stageJSXPreview } from '@pairdraw/core/design-jsx'
import { initCanvasKit } from '@pairdraw/core/io/formats/raster'
import { createStreamingJSXParser } from '@pairdraw/design-jsx'
import { SceneGraph } from '@pairdraw/scene-graph'

const cleanups: (() => void)[] = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
})

/** A preview of `jsx` staged on its own new document. */
async function staged(jsx: string) {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const tree = expectDefined(createStreamingJSXParser().append(jsx).tree, 'tree')
  return expectDefined(await stageJSXPreview(graph, tree, {}, pageId), 'staged preview')
}

async function recorder() {
  const ck = await initCanvasKit()
  const created = createJSXPreviewRecorder(ck)
  cleanups.push(() => created.destroy())
  return created
}

function width(picture: { cullRect(): Float32Array }): number {
  const [left, , right] = picture.cullRect()
  return right - left
}

describe('JSX preview recorder', () => {
  test('records each preview at its own size while reusing one renderer', async () => {
    const record = await recorder()
    const signal = new AbortController().signal
    const short = await staged('<Text size={16}>Hi</Text>')
    const long = await staged('<Text size={16}>A much longer line of preview text</Text>')

    const first = expectDefined(await record.record(short, signal), 'short picture')
    const second = expectDefined(await record.record(long, signal), 'long picture')
    const again = expectDefined(await record.record(short, signal), 'short picture again')
    try {
      expect(width(second)).toBeGreaterThan(width(first) * 4)
      expect(width(again)).toBeCloseTo(width(first))
    } finally {
      for (const picture of [first, second, again]) picture.delete()
    }
  })

  test('records nothing once destroyed', async () => {
    const record = await recorder()
    record.destroy()
    const preview = await staged('<Frame w={40} h={40} bg="#FF0000" />')
    expect(await record.record(preview, new AbortController().signal)).toBeNull()
  })
})

import { expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'
import { exportFigFile, isFigPagePending } from '@pairdraw/core/io/formats/fig'
import { initCodec } from '@pairdraw/kiwi/fig/codec'
import { SceneGraph } from '@pairdraw/scene-graph'

import { readFigDocument } from '@/app/document/io/fig'

import { repoPath } from '#tests/helpers/paths'

test('reads a .fig with every page left to load as it is shown', async () => {
  const bytes = await Bun.file(repoPath('tests/fixtures/slots.fig')).arrayBuffer()

  const graph = await readFigDocument(new File([bytes], 'slots.fig'))

  const pages = graph.getPages()
  expect(pages.length).toBeGreaterThan(0)
  expect(
    pages.filter((page) => !isFigPagePending(graph, page.id)).map((page) => page.name)
  ).toEqual([])
})

test('leaves a Cover page unread until it is shown, then shows its layers', async () => {
  await initCodec()
  const source = new SceneGraph()
  const cover = source.addPage('Cover')
  source.createNode('FRAME', cover.id, { name: 'Cover art', width: 1920, height: 960 })
  const bytes = await exportFigFile(source)

  const graph = await readFigDocument(new File([bytes.slice()], 'cover.fig'))
  const opened = graph.getPages().find((page) => page.name === 'Cover')
  if (!opened) throw new Error('Expected the Cover page')
  expect(isFigPagePending(graph, opened.id)).toBe(true)
  expect(graph.getChildren(opened.id)).toEqual([])

  const editor = createEditor({ graph })
  await editor.switchPage(opened.id)

  expect(isFigPagePending(graph, opened.id)).toBe(false)
  expect(graph.getChildren(opened.id).map((node) => node.name)).toEqual(['Cover art'])
  editor.dispose()
})

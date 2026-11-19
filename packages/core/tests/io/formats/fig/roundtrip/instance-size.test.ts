import { expect, setDefaultTimeout, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { computeAllLayouts } from '@pairdraw/core/layout'
import { exportFigFile, readFigFile } from '@pairdraw/core/io/formats/fig'
import { initCodec } from '@pairdraw/kiwi/fig/codec'
import { SceneGraph } from '@pairdraw/scene-graph'

import { populateAllFigPages } from '#core/io/formats/fig'

setDefaultTimeout(60_000)

test('a hug instance keeps its own height, while its text takes the component size', async () => {
  await initCodec()
  const graph = new SceneGraph()
  const [page] = graph.getPages()
  const component = graph.createNode('COMPONENT', page.id, {
    name: 'Tip',
    width: 320,
    height: 60,
    layoutMode: 'VERTICAL',
    primaryAxisSizing: 'HUG',
    paddingTop: 20,
    paddingBottom: 20
  })
  graph.createNode('TEXT', component.id, {
    name: 'Body',
    text: 'One line.',
    width: 280,
    height: 20,
    textAutoResize: 'HEIGHT'
  })
  const instance = expectDefined(graph.createInstance(component.id, page.id), 'instance')
  // The hug frame is taller than its component's, as longer text in it would make it.
  graph.updateNode(instance.id, { height: 120 })

  const bytes = await exportFigFile(graph)
  const reopened = await readFigFile(new File([bytes.slice()], 'Tip.fig'))
  populateAllFigPages(reopened)
  const reopenedInstance = expectDefined(
    [...reopened.getAllNodes()].find((node) => node.type === 'INSTANCE'),
    'reopened instance'
  )
  expect(reopenedInstance.height).toBe(120)
  // A layer that is not an instance is written without a size of its own, as Figma writes it:
  // the text comes back at its component's height.
  computeAllLayouts(reopened)
  expect(reopened.getChildren(reopenedInstance.id)[0]?.height).toBe(20)
})

import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { buildFigmaClipboardHTML, importClipboardNodes } from '@pairdraw/core/clipboard'
import { createEditor } from '@pairdraw/core/editor'
import { parseFigmaClipboard } from '@pairdraw/fig/clipboard'
import { initCodec } from '@pairdraw/kiwi/fig/codec'
import { SceneGraph, generateId, type SceneNode } from '@pairdraw/scene-graph'

/** A design with two frames, the first holding a button that navigates to the second. */
function design() {
  const editor = createEditor()
  const graph = editor.graph
  const pageId = graph.getPages()[0].id
  const home = graph.createNode('FRAME', pageId, { name: 'Home', width: 300, height: 200 })
  const details = graph.createNode('FRAME', pageId, {
    name: 'Details',
    x: 400,
    width: 300,
    height: 200
  })
  const button = graph.createNode('RECTANGLE', home.id, {
    name: 'Open',
    x: 20,
    y: 20,
    width: 60,
    height: 40
  })
  graph.updateNode(button.id, {
    prototypeReactions: [
      {
        id: generateId(),
        trigger: { type: 'ON_CLICK', delay: 0 },
        actions: [
          {
            type: 'NODE',
            nodeId: details.id,
            navigation: 'NAVIGATE',
            transition: { type: 'INSTANT', duration: 0 },
            overlayPosition: 'CENTER'
          }
        ]
      }
    ]
  })
  return { graph, home, details, button }
}

function destinationOf(node: SceneNode): string | null {
  const action = node.prototypeReactions[0]?.actions[0]
  return action?.type === 'NODE' ? action.nodeId : null
}

test('a pasted frame keeps its reaction, joined to the pasted frame it names', async () => {
  await initCodec()
  const { graph, home, details } = design()
  const html = expectDefined(
    await buildFigmaClipboardHTML([home, details], graph),
    'clipboard html'
  )
  const parsed = expectDefined(await parseFigmaClipboard(html), 'parsed clipboard')

  const pasted = new SceneGraph()
  importClipboardNodes(parsed.nodes, pasted, pasted.getPages()[0].id, 0, 0, parsed.blobs)
  const pastedHome = expectDefined(
    [...pasted.getAllNodes()].find((node) => node.name === 'Home'),
    'pasted home'
  )
  const pastedDetails = expectDefined(
    [...pasted.getAllNodes()].find((node) => node.name === 'Details'),
    'pasted details'
  )
  const pastedButton = expectDefined(
    pasted.getChildren(pastedHome.id).find((node) => node.name === 'Open'),
    'pasted button'
  )

  expect(destinationOf(pastedButton)).toBe(pastedDetails.id)
  expect(pastedButton.prototypeReactions[0]?.actions[0]).toMatchObject({
    type: 'NODE',
    navigation: 'NAVIGATE'
  })
})

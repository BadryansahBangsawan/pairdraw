import { beforeAll, describe, expect, test } from 'bun:test'

import { nodeChangeToProps, sceneNodeToKiwi } from '#fig/node-change/index'

import { initCodec, type NodeChange } from '@pairdraw/kiwi/fig/codec'
import { SceneGraph } from '@pairdraw/scene-graph'

function textRecord(name: string, autoRename: boolean) {
  const graph = new SceneGraph()
  const node = graph.createNode('TEXT', graph.getPages()[0].id, { name, autoRename })
  return sceneNodeToKiwi(node, { sessionID: 1, localID: 1 }, 0, { value: 2 }, graph, [])[0]
}

describe('a text layer named by its text in .fig', () => {
  beforeAll(() => initCodec())

  test('exports a renamed text layer as not following its text', () => {
    expect(textRecord('Heading', false)?.autoRename).toBe(false)
  })

  test('leaves a layer that still follows its text out of the file', () => {
    expect(textRecord('Text', true)?.autoRename).toBeUndefined()
  })

  test('imports the name and whether it follows the text', () => {
    const change = {
      type: 'TEXT',
      name: 'Imported heading',
      textData: { characters: 'Imported heading' }
    } as NodeChange
    expect(nodeChangeToProps(change, [])).toMatchObject({
      name: 'Imported heading',
      autoRename: true
    })
    expect(nodeChangeToProps({ ...change, autoRename: false }, [])).toMatchObject({
      name: 'Imported heading',
      autoRename: false
    })
  })
})

import { describe, expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'
import { exportFigFile, parseFigFile } from '@pairdraw/core/io/formats/fig'
import { initCodec } from '@pairdraw/kiwi/fig/codec'
import type { SceneGraph } from '@pairdraw/scene-graph'
import {
  addDesignDecision,
  allowDesignValue,
  createDesignMemory,
  pinDesignExample,
  readDesignMemory,
  writeDesignMemory
} from '@pairdraw/scene-graph/design-memory'

function layerTypes(graph: SceneGraph): string[] {
  return [...graph.nodes.values()].map((node) => `${node.type}:${node.name}`).sort()
}

describe('.fig round trip of the design memory', () => {
  test('keeps the memory and adds no layer or page to the file', async () => {
    await initCodec()
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const card = editor.graph.createNode('FRAME', pageId, { name: 'Card' })
    const plain = await parseFigFile((await exportFigFile(editor.graph)).slice().buffer)

    let memory = allowDesignValue(createDesignMemory(), 'colors', '#1A73E8')
    memory = addDesignDecision(memory, 'Cards keep 16 px padding.', 'person')
    memory = pinDesignExample(memory, card.id)
    writeDesignMemory(editor.graph, memory)
    const reopened = await parseFigFile((await exportFigFile(editor.graph)).slice().buffer)

    const kept = readDesignMemory(reopened)
    expect(kept?.colors.values).toEqual(['#1A73E8'])
    expect(kept?.decisions.map(({ text }) => text)).toEqual(['Cards keep 16 px padding.'])
    expect(kept?.examples.map(({ nodeId }) => reopened.getNode(nodeId)?.name)).toEqual(['Card'])
    expect(layerTypes(reopened)).toEqual(layerTypes(plain))
  })
})

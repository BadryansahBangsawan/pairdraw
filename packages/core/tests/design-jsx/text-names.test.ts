import { describe, expect, test } from 'bun:test'

import { getNodeOrThrow } from '#core-tests/helpers/assert'

import { renderJSX } from '@pairdraw/core/design-jsx'
import { SceneGraph } from '@pairdraw/scene-graph'

const CONTENT = `
  <Frame name="Board">
    <Text>Unnamed text</Text>
    <Text name="Chosen">Other text</Text>
    <Text>First line
second line</Text>
    <Text />
  </Frame>`

describe('text layers in design JSX', () => {
  test('are named by their characters until a name is given', async () => {
    const graph = new SceneGraph()
    const [result] = await renderJSX(graph, CONTENT)
    const [unnamed, named, multiline, empty] = graph.getChildren(
      getNodeOrThrow(graph, result.id).id
    )
    expect(unnamed).toMatchObject({ name: 'Unnamed text', autoRename: true })
    expect(named).toMatchObject({ name: 'Chosen', autoRename: false })
    expect(multiline).toMatchObject({ name: 'First line second line', autoRename: true })
    expect(empty).toMatchObject({ name: 'Text', autoRename: true })
  })
})

import { expect, test } from 'bun:test'

import { penDocumentFromGraph } from '@pairdraw/pen'
import { SceneGraph } from '@pairdraw/scene-graph'

const RED = { r: 1, g: 0, b: 0, a: 1 }
const BLUE = { r: 0, g: 0, b: 1, a: 1 }

/**
 * A color a `.fig` file keeps deleted, bound to a layer: `.pen` has no deleted state, so the
 * variable is not written and the layer takes the color it resolved to.
 */
function graphWithDeletedVariables() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0].id
  const colors = graph.createCollection('Colors')
  graph.createVariable('Live', 'COLOR', colors.id, RED)
  const gone = graph.createVariable('Gone', 'COLOR', colors.id, BLUE)
  graph.addVariable({ ...gone, deleted: true })
  const removed = graph.createCollection('Removed')
  const orphan = graph.createVariable('Orphan', 'COLOR', removed.id, RED)
  graph.addCollection({ ...removed, deleted: true })
  graph.addVariable({ ...orphan, deleted: true })
  const node = graph.createNode('RECTANGLE', page, {
    name: 'Bound',
    fills: [{ type: 'SOLID', color: BLUE, visible: true, opacity: 1 }],
    boundVariables: { 'fills/0/color': gone.id }
  })
  return { graph, node, gone }
}

test('a deleted variable is written as the value it resolved to, not as a token', () => {
  const { graph } = graphWithDeletedVariables()
  const document = penDocumentFromGraph(graph)
  expect(Object.keys(document.variables ?? {})).toEqual(['Live'])
  const written = document.children?.[0]
  expect(written?.fill).toMatchObject({ type: 'color', color: '#0000FF' })
})

test('a deleted collection and its variables are left out of the file', () => {
  const { graph } = graphWithDeletedVariables()
  const document = penDocumentFromGraph(graph)
  expect(Object.keys(document.themes ?? {})).toEqual(['Colors'])
  expect(Object.values(document.variables ?? {}).map((variable) => variable.value)).not.toContain(
    '$Orphan'
  )
})

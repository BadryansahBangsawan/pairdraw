import { beforeAll, describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { exportFigFile, parseFigFile } from '@pairdraw/core/io/formats/fig'
import { initCodec } from '@pairdraw/kiwi/fig/codec'
import { SceneGraph, type SceneNode } from '@pairdraw/scene-graph'
import { recordInstanceOverride } from '@pairdraw/scene-graph/instances'

import { releaseFigPopulationWorker } from '#core/kiwi/fig/population/client'

beforeAll(async () => {
  await initCodec()
})

async function reopen(graph: SceneGraph) {
  // Without its archive the export encodes every record, which is what this checks.
  releaseFigPopulationWorker(graph)
  const bytes = await exportFigFile(graph)
  return { reopened: await parseFigFile(bytes.slice().buffer) }
}

function named(graph: SceneGraph, name: string): SceneNode {
  return expectDefined([...graph.getAllNodes()].find((node) => node.name === name))
}

describe('an instance that sets one collection’s mode, saved as .fig', () => {
  test('keeps its modes and the component’s mode in the other collection', async () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const theme = graph.createCollection('Theme')
    const density = graph.createCollection('Density')
    const dark = expectDefined(graph.createMode(theme.id, 'Dark'))
    const compact = expectDefined(graph.createMode(density.id, 'Compact'))
    graph.createVariable('Surface', 'COLOR', theme.id, { r: 1, g: 1, b: 1, a: 1 })
    graph.createVariable('Gap', 'FLOAT', density.id, 8)
    const component = graph.createNode('COMPONENT', pageId, {
      name: 'Card',
      variableModes: { [density.id]: compact }
    })
    const instance = expectDefined(graph.createInstance(component.id, pageId, { x: 200 }))
    graph.updateNode(instance.id, {
      name: 'Dark card',
      variableModes: { [theme.id]: dark, [density.id]: compact }
    })
    recordInstanceOverride(graph, instance.id, ['variableModes'])

    const { reopened } = await reopen(graph)
    const card = named(reopened, 'Dark card')
    const reopenedTheme = expectDefined(
      [...reopened.variableCollections.values()].find((item) => item.name === 'Theme')
    )
    const reopenedDensity = expectDefined(
      [...reopened.variableCollections.values()].find((item) => item.name === 'Density')
    )
    expect(card.variableModes[reopenedTheme.id]).toBe(
      expectDefined(reopenedTheme.modes.find((mode) => mode.name === 'Dark')).modeId
    )
    expect(card.variableModes[reopenedDensity.id]).toBe(
      expectDefined(reopenedDensity.modes.find((mode) => mode.name === 'Compact')).modeId
    )
  })
})

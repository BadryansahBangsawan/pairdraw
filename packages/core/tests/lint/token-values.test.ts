import { describe, expect, test } from 'bun:test'

import { applyLintFixes, createLinter, graphFixTarget, type LintMessage } from '@pairdraw/core/lint'
import { SceneGraph } from '@pairdraw/scene-graph'

function lint(graph: SceneGraph, rule: string): LintMessage[] {
  const pageId = graph.getPages()[0].id
  return createLinter({ rules: [rule], config: { rules: { [rule]: 'warning' } } }).lintGraph(
    graph,
    [pageId]
  ).messages
}

describe('no-unbound-token-values', () => {
  function addNumber(graph: SceneGraph, id: string, name: string, value: number) {
    if (!graph.variableCollections.has('sizes'))
      graph.addCollection({
        id: 'sizes',
        name: 'Sizes',
        modes: [{ modeId: 'base', name: 'Base' }],
        defaultModeId: 'base',
        variableIds: []
      })
    graph.addVariable({
      id,
      name,
      type: 'FLOAT',
      collectionId: 'sizes',
      valuesByMode: { base: value },
      description: '',
      hiddenFromPublishing: false
    })
  }

  test('reports a radius, gap, or font size that equals one token of its kind', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    addNumber(graph, 'radius-md', 'radius/md', 8)
    addNumber(graph, 'spacing-4', 'spacing/4', 16)
    addNumber(graph, 'text-lg', 'text/lg', 18)
    const card = graph.createNode('FRAME', pageId, {
      name: 'Card',
      cornerRadius: 8,
      layoutMode: 'VERTICAL',
      itemSpacing: 16
    })
    graph.createNode('TEXT', card.id, { name: 'Title', text: 'Hi', fontSize: 18 })
    graph.createNode('RECTANGLE', pageId, { name: 'Chip', cornerRadius: 16 })

    const messages = lint(graph, 'no-unbound-token-values')

    expect(messages.map((message) => [message.nodeId === card.id, message.fix])).toEqual([
      [
        true,
        expect.objectContaining({
          kind: 'bind-variable',
          path: 'cornerRadius',
          variableId: 'radius-md'
        })
      ],
      [
        true,
        expect.objectContaining({
          kind: 'bind-variable',
          path: 'itemSpacing',
          variableId: 'spacing-4'
        })
      ],
      [
        false,
        expect.objectContaining({ kind: 'bind-variable', path: 'fontSize', variableId: 'text-lg' })
      ]
    ])
  })

  test('stays quiet for bound values, and only suggests where several tokens match', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    addNumber(graph, 'radius-md', 'radius/md', 8)
    addNumber(graph, 'radius-card', 'radius/card', 8)
    addNumber(graph, 'spacing-2', 'spacing/2', 8)
    const card = graph.createNode('FRAME', pageId, { name: 'Card', cornerRadius: 8 })
    const bound = graph.createNode('RECTANGLE', pageId, { name: 'Bound', cornerRadius: 8 })
    graph.bindVariable(bound.id, 'cornerRadius', 'radius-md')

    const messages = lint(graph, 'no-unbound-token-values')

    expect(messages.map((message) => message.nodeId)).toEqual([card.id])
    expect(messages[0]?.fix).toBeUndefined()
    expect(
      messages[0]?.suggestions?.map((fix) => fix.kind === 'bind-variable' && fix.variableId)
    ).toEqual(['radius-md', 'radius-card'])
  })

  test('leaves a font size a text style supplies to the style', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    addNumber(graph, 'text-base', 'text/base', 16)
    graph.createNode('TEXT', pageId, {
      name: 'Styled',
      text: 'Hi',
      fontSize: 16,
      textStyleId: 'style:body'
    })
    expect(lint(graph, 'no-unbound-token-values')).toEqual([])
  })
})

describe('lint_fix for token values', () => {
  test('never binds a font size a text style supplies', () => {
    const graph = new SceneGraph()
    graph.addCollection({
      id: 'sizes',
      name: 'Sizes',
      modes: [{ modeId: 'base', name: 'Base' }],
      defaultModeId: 'base',
      variableIds: []
    })
    graph.addVariable({
      id: 'text-base',
      name: 'text/base',
      type: 'FLOAT',
      collectionId: 'sizes',
      valuesByMode: { base: 16 },
      description: '',
      hiddenFromPublishing: false
    })
    const text = graph.createNode('TEXT', graph.getPages()[0].id, {
      text: 'Hi',
      fontSize: 16,
      textStyleId: 'style:body'
    })
    const fix = {
      kind: 'bind-variable' as const,
      path: 'fontSize',
      variableId: 'text-base',
      variableName: 'text/base'
    }
    expect(applyLintFixes(graphFixTarget(graph), [{ nodeId: text.id, fix }])).toBe(0)
  })
})

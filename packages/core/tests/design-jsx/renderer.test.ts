import { describe, expect, test } from 'bun:test'

import { renderJSX, renderTree } from '@pairdraw/core/design-jsx'
import type { TreeNode } from '@pairdraw/design-jsx'
import { SceneGraph } from '@pairdraw/scene-graph'

describe('renderTree onNode', () => {
  test('reports every element with the layer rendered from it', async () => {
    const graph = new SceneGraph()
    const text: TreeNode = {
      type: 'text',
      props: { name: 'Title' },
      children: ['Hi'],
      source: { line: 2 }
    }
    const root: TreeNode = {
      type: 'frame',
      props: { name: 'Card' },
      children: [text],
      source: { line: 1 }
    }
    const seen: Array<[number | undefined, string]> = []

    const result = await renderTree(graph, root, {
      onNode: (tree, node) => seen.push([tree.source?.line, node.name])
    })

    expect(seen).toEqual([
      [2, 'Title'],
      [1, 'Card']
    ])
    expect(graph.getNode(result.id)?.name).toBe('Card')
  })
})

describe('renderTree sizing', () => {
  test('text in a frame without auto layout takes its content size', async () => {
    const graph = new SceneGraph()
    const root: TreeNode = {
      type: 'frame',
      props: { w: 300, h: 200 },
      children: [{ type: 'text', props: { size: 28 }, children: ['Hello world'] }]
    }

    const result = await renderTree(graph, root)
    const text = graph.getNode(graph.getNode(result.id)?.childIds[0] ?? '')

    expect(text?.textAutoResize).toBe('WIDTH_AND_HEIGHT')
    expect(text?.width).not.toBe(100)
    expect(text?.height).toBeLessThan(100)
    expect(text?.width).toBeGreaterThan(text?.height ?? 0)
  })
})

describe('renderJSX fragment roots', () => {
  test('an instance written before the component its ref() marks finds it, in written order', async () => {
    const graph = new SceneGraph()
    const roots = await renderJSX(
      graph,
      `const card = ref()
return <>
  <Frame name="Start" w={200} h={100} />
  <Instance name="Card copy" of={card} />
  <Component ref={card} name="Card" w={100} h={50} />
</>`
    )

    expect(roots.map((root) => root.name)).toEqual(['Start', 'Card copy', 'Card'])
    const [, copy, card] = roots
    expect(graph.getNode(copy.id)?.componentId).toBe(card.id)
    const pageId = graph.getPages()[0].id
    expect(graph.getChildren(pageId).map((node) => node.name)).toEqual([
      'Start',
      'Card copy',
      'Card'
    ])
  })
})

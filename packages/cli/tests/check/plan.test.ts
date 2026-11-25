import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

import { framesToCheck, isDesignFile } from '#cli/check/plan'

function document() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  graph.createNode('FRAME', page.id, { name: 'Home', width: 100, height: 100 })
  const section = graph.createNode('SECTION', page.id, { name: 'Flow', width: 400, height: 400 })
  graph.createNode('FRAME', section.id, { name: 'Settings', width: 100, height: 100 })
  graph.createNode('COMPONENT', page.id, { name: 'Button', width: 40, height: 20 })
  graph.createNode('INSTANCE', page.id, { name: 'Button copy', width: 40, height: 20 })
  graph.createNode('RECTANGLE', page.id, { name: 'Decoration', width: 10, height: 10 })
  graph.createNode('FRAME', page.id, { name: 'Hidden', width: 10, height: 10, visible: false })
  const nested = graph.createNode('FRAME', page.id, { name: 'Parent', width: 100, height: 100 })
  graph.createNode('FRAME', nested.id, { name: 'Inner', width: 10, height: 10 })
  const second = graph.addPage('Page 2')
  graph.createNode('FRAME', second.id, { name: 'Checkout', width: 100, height: 100 })
  return graph
}

describe('which frames a check renders', () => {
  test('top-level frames and components, section children, in document order', () => {
    const { frames } = framesToCheck(document(), 8)
    expect(frames.map((frame) => frame.name)).toEqual([
      'Home',
      'Settings',
      'Button',
      'Parent',
      'Checkout'
    ])
  })

  test('instances, plain layers, invisible filters, and frame children are left out', () => {
    const { frames } = framesToCheck(document(), 8)
    const names = frames.map((frame) => frame.name)
    expect(names).not.toContain('Button copy')
    expect(names).not.toContain('Decoration')
    expect(names).not.toContain('Hidden')
    expect(names).not.toContain('Inner')
  })

  test('the limit counts every page and the rest are counted, not dropped silently', () => {
    const { frames, skipped } = framesToCheck(document(), 2)
    expect(frames.map((frame) => frame.name)).toEqual(['Home', 'Settings'])
    expect(skipped).toBe(3)
  })

  test('a design file is a .fig or a .pen, whatever its case', () => {
    expect(isDesignFile('designs/home.pen')).toBe(true)
    expect(isDesignFile('designs/Home.FIG')).toBe(true)
    expect(isDesignFile('designs/home.drawio')).toBe(false)
    expect(isDesignFile('README.md')).toBe(false)
  })
})

import { describe, expect, test } from 'bun:test'

import {
  checkDesignEdit,
  checkDesignValues,
  DesignMemoryRefusalError,
  resolveDesignRules,
  type DesignEdit
} from '@pairdraw/core/design-memory'
import { SceneGraph, type SceneNode, type Variable } from '@pairdraw/scene-graph'
import {
  allowDesignValue,
  createDesignMemory,
  writeDesignMemory,
  type DesignMemory
} from '@pairdraw/scene-graph/design-memory'

const BRAND = { r: 26 / 255, g: 115 / 255, b: 232 / 255, a: 1 }
const BRAND_DARK = { r: 138 / 255, g: 180 / 255, b: 248 / 255, a: 1 }
const PINK = { r: 1, g: 0, b: 170 / 255, a: 1 }

function solid(color: SceneNode['fills'][number]['color']): SceneNode['fills'] {
  return [{ type: 'SOLID', visible: true, opacity: 1, color }]
}

function documentWithSystem(memory: DesignMemory = createDesignMemory()) {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  graph.addCollection({
    id: 'tokens',
    name: 'Tokens',
    modes: [
      { modeId: 'light', name: 'Light' },
      { modeId: 'dark', name: 'Dark' }
    ],
    defaultModeId: 'light',
    variableIds: []
  })
  const variable = (fields: Pick<Variable, 'id' | 'name' | 'type' | 'valuesByMode'> & Partial<Variable>) =>
    graph.addVariable({
      collectionId: 'tokens',
      description: '',
      hiddenFromPublishing: false,
      ...fields
    })
  variable({ id: 'brand', name: 'Color/Brand', type: 'COLOR', valuesByMode: { light: BRAND, dark: BRAND_DARK } })
  variable({ id: 'gap-m', name: 'Space/M', type: 'FLOAT', scopes: ['GAP'], valuesByMode: { light: 16, dark: 16 } })
  variable({ id: 'any', name: 'Anything', type: 'FLOAT', valuesByMode: { light: 13, dark: 13 } })
  const heading = graph.createNode('TEXT', pageId, {
    name: 'Heading',
    sharedStyleType: 'TEXT',
    fontFamily: 'Inter',
    fontSize: 24
  })
  graph.updateNode(heading.id, { source: { ...heading.source, id: 'S:heading' } })
  writeDesignMemory(graph, memory)
  return { graph, pageId }
}

function created(...nodes: SceneNode[]): DesignEdit {
  return { created: nodes, updated: [] }
}

describe('checking an agent edit against the design memory', () => {
  test('a document without a memory judges nothing', () => {
    const graph = new SceneGraph()
    const card = graph.createNode('RECTANGLE', graph.getPages()[0].id, { fills: solid(PINK) })
    expect(checkDesignEdit(graph, created(card))).toBeNull()
  })

  test('refuses an off-system color and names the nearest variable', () => {
    const { graph, pageId } = documentWithSystem()
    const card = graph.createNode('RECTANGLE', pageId, { name: 'Card', fills: solid(PINK) })
    const findings = checkDesignEdit(graph, created(card))
    expect(findings?.refused).toHaveLength(1)
    expect(findings?.refused[0]).toMatchObject({
      group: 'colors',
      severity: 'refuse',
      nodeId: card.id,
      path: 'fills/0/color',
      value: '#FF00AA',
      nearest: { variableId: 'brand', name: 'Color/Brand' }
    })
  })

  test("allows every mode's value of a color variable, a bound paint, and a color within tolerance", () => {
    const { graph, pageId } = documentWithSystem()
    const light = graph.createNode('RECTANGLE', pageId, { fills: solid(BRAND) })
    const dark = graph.createNode('RECTANGLE', pageId, { fills: solid(BRAND_DARK) })
    const near = graph.createNode('RECTANGLE', pageId, {
      fills: solid({ r: 27 / 255, g: 115 / 255, b: 232 / 255, a: 1 })
    })
    const bound = graph.createNode('RECTANGLE', pageId, {
      fills: solid(PINK),
      boundVariables: { 'fills/0/color': 'brand' }
    })
    expect(checkDesignEdit(graph, created(light, dark, near, bound))).toEqual({
      refused: [],
      warnings: [],
      rules: expect.anything()
    })
  })

  test('refuses a font no text style or allowed value names, ignoring case', () => {
    const { graph, pageId } = documentWithSystem()
    const allowed = graph.createNode('TEXT', pageId, { fontFamily: 'inter', fontSize: 24, fills: solid(BRAND) })
    const off = graph.createNode('TEXT', pageId, {
      name: 'Title',
      fontFamily: 'Comic Sans MS',
      fontSize: 24,
      fills: solid(BRAND)
    })
    const findings = checkDesignEdit(graph, created(allowed, off))
    expect(findings?.refused.map(({ nodeId, group, value }) => ({ nodeId, group, value }))).toEqual([
      { nodeId: off.id, group: 'fonts', value: 'Comic Sans MS' }
    ])
    if (!findings) throw new Error('expected findings')
    expect(new DesignMemoryRefusalError(findings.refused, findings.rules ?? undefined).message).toContain(
      'allowed: Inter'
    )
  })

  test('only warns about off-scale spacing, with the nearest step from a GAP variable', () => {
    const { graph, pageId } = documentWithSystem()
    const stack = graph.createNode('FRAME', pageId, { layoutMode: 'VERTICAL', itemSpacing: 13 })
    const findings = checkDesignEdit(graph, created(stack))
    expect(findings?.refused).toEqual([])
    expect(findings?.warnings).toEqual([
      expect.objectContaining({ group: 'spacing', path: 'itemSpacing', value: 13, nearest: expect.objectContaining({ value: 16 }) })
    ])
  })

  test('a group with nothing to allow checks nothing, and a variable for every scope allows nothing', () => {
    const { graph, pageId } = documentWithSystem()
    const card = graph.createNode('RECTANGLE', pageId, { cornerRadius: 13, width: 100, height: 100 })
    expect(checkDesignEdit(graph, created(card))?.warnings).toEqual([])
  })

  test('a pill radius and zero are never off-scale', () => {
    const memory = allowDesignValue(createDesignMemory(), 'radius', 8)
    const { graph, pageId } = documentWithSystem(memory)
    const pill = graph.createNode('RECTANGLE', pageId, { cornerRadius: 20, width: 120, height: 40 })
    const square = graph.createNode('RECTANGLE', pageId, { cornerRadius: 0 })
    const odd = graph.createNode('RECTANGLE', pageId, { cornerRadius: 6, width: 120, height: 40 })
    const findings = checkDesignEdit(graph, created(pill, square, odd))
    expect(findings?.warnings.map(({ nodeId }) => nodeId)).toEqual([odd.id])
  })

  test('a changed layer is judged only on the fields the edit changed, for values it did not have', () => {
    const { graph, pageId } = documentWithSystem()
    const old = graph.createNode('RECTANGLE', pageId, { name: 'Old', fills: solid(PINK) })
    const renamed: DesignEdit = {
      created: [],
      updated: [{ id: old.id, before: { name: 'Old' }, after: { name: 'Renamed' } }]
    }
    expect(checkDesignEdit(graph, renamed)?.refused).toEqual([])
    const before = graph.getNode(old.id)?.fills
    graph.updateNode(old.id, { fills: [...solid(PINK), ...solid({ r: 0, g: 1, b: 0, a: 1 })] })
    const repainted: DesignEdit = {
      created: [],
      updated: [{ id: old.id, before: { fills: before }, after: { fills: graph.getNode(old.id)?.fills } }]
    }
    expect(checkDesignEdit(graph, repainted)?.refused.map(({ path }) => path)).toEqual(['fills/1/color'])
  })

  test("an instance's layers are judged only on the fields it overrides", () => {
    const memory = { ...createDesignMemory(), colors: { fromSystem: false, values: ['#00FF00'], enforce: 'refuse' as const } }
    const { graph, pageId } = documentWithSystem(memory)
    const component = graph.createNode('COMPONENT', pageId, { name: 'Button', fills: solid(PINK) })
    graph.createNode('RECTANGLE', component.id, { name: 'Bg', fills: solid(PINK) })
    const instance = graph.createInstance(component.id, pageId)
    if (!instance) throw new Error('no instance')
    const layers = [instance, ...instance.childIds.flatMap((id) => graph.getNode(id) ?? [])]
    expect(checkDesignEdit(graph, created(...layers))?.refused).toEqual([])
  })

  test('attached fill styles are the system; gradient stops and imported content only warn', () => {
    const { graph, pageId } = documentWithSystem()
    const styled = graph.createNode('RECTANGLE', pageId, { fills: solid(PINK), fillStyleId: 'S:fill' })
    const gradient = graph.createNode('RECTANGLE', pageId, {
      fills: [
        {
          type: 'GRADIENT_LINEAR',
          visible: true,
          opacity: 1,
          color: PINK,
          gradientStops: [{ position: 0, color: PINK }]
        }
      ]
    })
    const findings = checkDesignEdit(graph, created(styled, gradient))
    expect(findings?.refused).toEqual([])
    expect(findings?.warnings.map(({ nodeId }) => nodeId)).toEqual([gradient.id])

    const photo = graph.createNode('RECTANGLE', pageId, { fills: solid(PINK) })
    const imported = checkDesignEdit(graph, created(photo), { warnOnly: true })
    expect(imported?.refused).toEqual([])
    expect(imported?.warnings).toHaveLength(1)
  })
})

describe('checking proposed values', () => {
  test('says which values are allowed and what to use instead', () => {
    const { graph } = documentWithSystem()
    const rules = resolveDesignRules(graph, createDesignMemory())
    const verdicts = checkDesignValues(rules, {
      colors: ['#1a73e8', 'hotpink', 'not a color'],
      fonts: ['Inter', 'Papyrus'],
      spacing: [16, 13]
    })
    expect(verdicts.map(({ value, verdict }) => [value, verdict])).toEqual([
      ['#1A73E8', 'ok'],
      ['#FF69B4', 'refuse'],
      ['not a color', 'invalid'],
      ['Inter', 'ok'],
      ['Papyrus', 'refuse'],
      [16, 'ok'],
      [13, 'warn']
    ])
  })
})

import { afterEach, describe, expect, test } from 'bun:test'

import { createEditor, executeAtomicTool, type Editor } from '@pairdraw/core'
import { createDesignGuard, DesignMemoryRefusalError } from '@pairdraw/core/design-memory'
import { FigmaAPI } from '@pairdraw/core/figma-api'
import { ALL_TOOLS, isAtomicTool, type ToolDef } from '@pairdraw/core/tools'
import type { SceneNode } from '@pairdraw/scene-graph'
import {
  allowDesignValue,
  createDesignMemory,
  readDesignMemory,
  type DesignMemory
} from '@pairdraw/scene-graph/design-memory'

/**
 * Seam: an agent's tool call as the app runs it (`runEditorTool`): an atomic tool inside
 * `executeAtomicTool` with the guard's field check, any other in `recordEditAsync` with
 * rollback and the guard's change check, both refusing.
 * Catches agents widening the rules (variables, the memory itself) and the guard refusing what
 * the agent never chose (tool defaults, layers the document already had).
 */

const BRAND = { r: 26 / 255, g: 115 / 255, b: 232 / 255, a: 1 }
const PINK = { r: 1, g: 0, b: 170 / 255, a: 1 }

let editor: Editor

afterEach(() => editor.dispose())

function tool(name: string): ToolDef {
  const def = ALL_TOOLS.find((candidate) => candidate.name === name)
  if (!def) throw new Error(`Missing ${name}`)
  return def
}

function solid(color: SceneNode['fills'][number]['color']): SceneNode['fills'] {
  return [{ type: 'SOLID', visible: true, opacity: 1, color }]
}

/** A document whose memory allows its one brand variable and Inter, with a person's layers. */
function setup(memory: DesignMemory = allowDesignValue(createDesignMemory(), 'fonts', 'Inter')) {
  editor = createEditor()
  const { graph } = editor
  const pageId = editor.state.currentPageId
  graph.addCollection({
    id: 'tokens',
    name: 'Tokens',
    modes: [{ modeId: 'light', name: 'Light' }],
    defaultModeId: 'light',
    variableIds: []
  })
  graph.addVariable({
    id: 'brand',
    name: 'Color/Brand',
    type: 'COLOR',
    collectionId: 'tokens',
    valuesByMode: { light: BRAND },
    description: '',
    hiddenFromPublishing: false
  })
  editor.setDesignMemory(memory)
  // The person painted these before the memory existed.
  const pink = graph.createNode('RECTANGLE', pageId, { name: 'Pink', fills: solid(PINK), x: 0 })
  const other = graph.createNode('RECTANGLE', pageId, { name: 'Other', fills: solid(PINK), x: 50 })
  editor.undo.clear()
  return { graph, pageId, figma: new FigmaAPI(graph), pink, other }
}

/** Runs a tool as an agent: refused calls come back as their error, nothing else changed. */
async function agentCall(figma: FigmaAPI, name: string, args: Record<string, unknown>) {
  const def = tool(name)
  const guard = createDesignGuard(editor.graph, { content: def.content, args })
  try {
    await def.loadFonts(figma, args)
    if (isAtomicTool(def)) {
      return guard.annotate(
        editor.recordEdit({ label: `Agent: ${name}`, push: false }, () =>
          executeAtomicTool(editor, figma, def, args, { verify: guard.verifyFields })
        )
      )
    }
    const result = await editor.recordEditAsync(
      { label: `Agent: ${name}`, rollbackOnThrow: true, verify: guard.verifyChange },
      async () => def.execute(figma, args)
    )
    return guard.annotate(result)
  } catch (error) {
    if (error instanceof DesignMemoryRefusalError) return error.toResult()
    throw error
  }
}

const refused = (result: unknown) =>
  typeof result === 'object' && result !== null && 'error' in result

describe('agents cannot widen the design memory', () => {
  test('a color variable with an off-system value is refused, and so is using it after', async () => {
    const { graph, figma, pageId } = setup()
    // Even a color the person's layers already use does not join the system through a token.
    for (const value of ['#00FF7F', '#FF00AA']) {
      const created = await agentCall(figma, 'create_variable', {
        name: 'Color/Hot',
        type: 'COLOR',
        collection_id: 'tokens',
        value
      })
      expect(refused(created)).toBe(true)
    }
    expect([...graph.variables.values()].map(({ name }) => name)).toEqual(['Color/Brand'])
    const card = graph.createNode('RECTANGLE', pageId, { name: 'Card', fills: solid(BRAND) })
    editor.undo.clear()
    expect(refused(await agentCall(figma, 'set_fill', { id: card.id, color: '#00FF7F' }))).toBe(
      true
    )
  })

  test("changing an allowed variable to an off-system value is refused and leaves it", async () => {
    const { graph, figma } = setup()
    const result = await agentCall(figma, 'set_variable', {
      id: 'brand',
      mode: 'light',
      value: '#00FF7F'
    })
    expect(refused(result)).toBe(true)
    expect(graph.variables.get('brand')?.valuesByMode.light).toEqual(BRAND)
  })

  test('a token made and used in the same call is judged by the rules before the call', async () => {
    const { graph, figma } = setup()
    const result = await agentCall(figma, 'eval', {
      code: `
        const collection = figma.variables.getVariableCollectionById('tokens')
        const hot = figma.variables.createVariable('Color/Hot', collection, 'COLOR')
        hot.setValueForMode('light', { r: 0, g: 1, b: 0.5, a: 1 })
        const card = figma.createRectangle()
        card.fills = [figma.variables.setBoundVariableForPaint(
          { type: 'SOLID', color: { r: 0, g: 1, b: 0.5 } }, 'color', hot)]
      `
    })
    expect(refused(result)).toBe(true)
    expect(graph.variables.size).toBe(1)
  })

  test('binding a layer to an allowed variable stays free', async () => {
    const { figma, pageId, graph } = setup()
    const card = graph.createNode('RECTANGLE', pageId, { name: 'Card', fills: solid(BRAND) })
    const result = await agentCall(figma, 'bind_variable', {
      node_id: card.id,
      field: 'fills/0/color',
      variable_id: 'brand'
    })
    expect(refused(result)).toBe(false)
  })
})

describe('a value let through once does not vouch for writing it again', () => {
  const card = (graph: ReturnType<typeof setup>['graph'], pageId: string, name: string) => {
    const node = graph.createNode('RECTANGLE', pageId, { name, fills: solid(BRAND) })
    editor.undo.clear()
    return node
  }

  test('a color the person used elsewhere is still refused when written', async () => {
    const { graph, figma, pageId } = setup()
    const target = card(graph, pageId, 'Card')
    expect(refused(await agentCall(figma, 'set_fill', { id: target.id, color: '#FF00AA' }))).toBe(
      true
    )
  })

  test('a gradient stop that only warned does not let the color in as a fill', async () => {
    const { graph, figma, pageId } = setup()
    const glow = card(graph, pageId, 'Glow')
    const gradient = await agentCall(figma, 'set_fill', {
      id: glow.id,
      color: '#00FF7F',
      color_end: '#1A73E8',
      gradient: 'top-bottom'
    })
    expect(refused(gradient)).toBe(false)
    const target = card(graph, pageId, 'Card')
    expect(refused(await agentCall(figma, 'set_fill', { id: target.id, color: '#00FF7F' }))).toBe(
      true
    )
  })

  test('a shadow color that only warned does not let the color in as a fill', async () => {
    const { graph, figma, pageId } = setup()
    const lifted = card(graph, pageId, 'Lifted')
    const shadow = await agentCall(figma, 'set_effects', {
      id: lifted.id,
      type: 'DROP_SHADOW',
      color: '#00FF7F'
    })
    expect(refused(shadow)).toBe(false)
    const target = card(graph, pageId, 'Card')
    expect(refused(await agentCall(figma, 'set_fill', { id: target.id, color: '#00FF7F' }))).toBe(
      true
    )
  })

  test('an imported SVG that only warned does not let its colors into written layers', async () => {
    const { figma } = setup()
    const svg = await agentCall(figma, 'import_svg', {
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#00FF7F"/></svg>'
    })
    expect(refused(svg)).toBe(false)
    const rendered = await agentCall(figma, 'render', { jsx: '<Frame bg="#00FF7F" w={40} h={40} />' })
    expect(refused(rendered)).toBe(true)
  })
})

describe('a value that only warned on a layer does not vouch for that layer’s paint', () => {
  const layer = (graph: ReturnType<typeof setup>['graph'], pageId: string, type: 'RECTANGLE' | 'TEXT') => {
    const node = graph.createNode(type, pageId, { name: 'Card', fills: solid(BRAND), fontFamily: 'Inter' })
    editor.undo.clear()
    return node
  }

  test('a gradient stop, then the same color as the fill', async () => {
    const { graph, figma, pageId } = setup()
    const card = layer(graph, pageId, 'RECTANGLE')
    const gradient = await agentCall(figma, 'set_fill', {
      id: card.id,
      color: '#00FF7F',
      color_end: '#1A73E8',
      gradient: 'top-bottom'
    })
    expect(refused(gradient)).toBe(false)
    expect(refused(await agentCall(figma, 'set_fill', { id: card.id, color: '#00FF7F' }))).toBe(true)
  })

  test('a shadow, then the same color as the fill', async () => {
    const { graph, figma, pageId } = setup()
    const card = layer(graph, pageId, 'RECTANGLE')
    await agentCall(figma, 'set_effects', { id: card.id, type: 'DROP_SHADOW', color: '#00FF7F' })
    expect(refused(await agentCall(figma, 'set_fill', { id: card.id, color: '#00FF7F' }))).toBe(true)
  })

  test('a shadow, then the same color as stroke and fill through eval', async () => {
    const { graph, figma, pageId } = setup()
    const card = layer(graph, pageId, 'RECTANGLE')
    await agentCall(figma, 'set_effects', { id: card.id, type: 'DROP_SHADOW', color: '#00FF7F' })
    const result = await agentCall(figma, 'eval', {
      code: `
        const card = figma.getNodeById('${card.id}')
        card.strokes = [{ type: 'SOLID', color: { r: 0, g: 1, b: 0.498 } }]
        card.fills = [{ type: 'SOLID', color: { r: 0, g: 1, b: 0.498 } }]
      `
    })
    expect(refused(result)).toBe(true)
  })

  test('a shadow on a text layer, then the same color as its fill', async () => {
    const { graph, figma, pageId } = setup()
    const text = layer(graph, pageId, 'TEXT')
    await agentCall(figma, 'set_effects', { id: text.id, type: 'DROP_SHADOW', color: '#00FF7F' })
    expect(refused(await agentCall(figma, 'set_fill', { id: text.id, color: '#00FF7F' }))).toBe(true)
  })
})

describe('rescoping a variable cannot widen the rules', () => {
  test('a font family variable made from an unscoped one is refused', async () => {
    const { graph, figma } = setup()
    const made = await agentCall(figma, 'eval', {
      code: `
        const collection = figma.variables.getVariableCollectionById('tokens')
        const sneaky = figma.variables.createVariable('Font/Sneaky', collection, 'STRING')
        sneaky.setValueForMode('light', 'Comic Sans MS')
        return sneaky.id
      `
    })
    expect(refused(made)).toBe(false)
    const id = [...graph.variables.values()].find((variable) => variable.name === 'Font/Sneaky')?.id
    const rescoped = await agentCall(figma, 'eval', {
      code: `figma.variables.getVariableById('${id}').scopes = ['FONT_FAMILY']`
    })
    expect(rescoped).toMatchObject({ error: expect.stringContaining('Comic Sans MS') })
    expect(graph.variables.get(id ?? '')?.scopes).not.toEqual(['FONT_FAMILY'])
    const verdicts = await agentCall(figma, 'check_design_values', { fonts: ['Comic Sans MS'] })
    expect(verdicts).toMatchObject({ verdicts: [{ verdict: 'refuse' }] })
  })

  test('a number rescoped into a scale only warns', async () => {
    const memory = allowDesignValue(allowDesignValue(createDesignMemory(), 'spacing', 16), 'fonts', 'Inter')
    const { graph, figma } = setup(memory)
    await agentCall(figma, 'eval', {
      code: `
        const collection = figma.variables.getVariableCollectionById('tokens')
        const odd = figma.variables.createVariable('Space/Odd', collection, 'FLOAT')
        odd.setValueForMode('light', 13)
      `
    })
    const id = [...graph.variables.values()].find((variable) => variable.name === 'Space/Odd')?.id
    const rescoped = await agentCall(figma, 'eval', {
      code: `figma.variables.getVariableById('${id}').scopes = ['GAP']`
    })
    expect(rescoped).toMatchObject({
      design_memory: { violations: [expect.objectContaining({ group: 'spacing', value: 13 })] }
    })
  })
})

describe('agents cannot change or remove the design memory itself', () => {
  test('clearing the memory through plugin data is refused, and the memory stays', async () => {
    const { graph, figma } = setup()
    const result = await agentCall(figma, 'eval', {
      code: "figma.root.setPluginData('designMemory', '')"
    })
    expect(result).toMatchObject({ error: expect.stringContaining('cannot change') })
    expect(readDesignMemory(graph)).not.toBeNull()
  })

  test('switching a group off through plugin data is refused', async () => {
    const { graph, figma } = setup()
    const before = readDesignMemory(graph)
    const result = await agentCall(figma, 'eval', {
      code: `
        const memory = JSON.parse(figma.root.getPluginData('designMemory'))
        memory.colors.enforce = 'off'
        figma.root.setPluginData('designMemory', JSON.stringify(memory))
      `
    })
    expect(refused(result)).toBe(true)
    expect(readDesignMemory(graph)).toEqual(before)
  })

  test('recording a decision and pinning an example is allowed', async () => {
    const { graph, figma, pink } = setup()
    const result = await agentCall(figma, 'record_design_decision', {
      text: 'Cards use the brand color.',
      example_node_id: pink.id
    })
    expect(refused(result)).toBe(false)
    expect(readDesignMemory(graph)?.decisions.at(-1)?.author).toBe('agent')
  })
})

describe('agents are judged only on values they brought in', () => {
  test.each(['FRAME', 'RECTANGLE', 'ELLIPSE', 'TEXT', 'LINE', 'STAR', 'POLYGON', 'SECTION'])(
    'create_shape %s succeeds with Pairdraw defaults, which only warn',
    async (type) => {
      const { figma } = setup()
      const result = await agentCall(figma, 'create_shape', {
        type,
        x: 400,
        y: 0,
        width: 40,
        height: 40
      })
      expect(refused(result)).toBe(false)
    }
  )

  test.each([
    ['boolean_union', (ids: string[]) => ({ ids })],
    ['flatten_nodes', (ids: string[]) => ({ ids })],
    ['group_nodes', (ids: string[]) => ({ ids })],
    ['node_to_component', (ids: string[]) => ({ ids })],
    ['create_component', (ids: string[]) => ({ id: ids[0] })],
    ['clone_node', (ids: string[]) => ({ id: ids[0] })]
  ] as const)('%s of the person’s layers succeeds', async (name, args) => {
    const { figma, pink, other } = setup()
    const result = await agentCall(figma, name, args([pink.id, other.id]))
    expect(refused(result)).toBe(false)
  })

  test('instances, variants and rendered JSX without colors succeed', async () => {
    const { figma, pink, other } = setup()
    const second = await agentCall(figma, 'create_component', { id: other.id })
    const component = await agentCall(figma, 'create_component', { id: pink.id })
    expect(refused(component)).toBe(false)
    const componentId = (component as { id: string }).id
    expect(await agentCall(figma, 'create_instance', { component_id: componentId })).not.toHaveProperty(
      'error'
    )
    expect(await agentCall(figma, 'combine_as_variants', {
      ids: [componentId, (second as { id: string }).id]
    })).not.toHaveProperty(
      'error'
    )
    const rendered = await agentCall(figma, 'render', {
      jsx: '<Frame name="Card" flex="col" p={16}><Text>Hello</Text><Rectangle w={40} h={40} /></Frame>'
    })
    expect(rendered).not.toHaveProperty('error')
  })

  test('a color no layer had before is still refused on a new layer', async () => {
    const { figma, graph, pageId } = setup()
    const card = graph.createNode('RECTANGLE', pageId, { name: 'Card', fills: solid(BRAND) })
    editor.undo.clear()
    const result = await agentCall(figma, 'set_fill', { id: card.id, color: '#00FF7F' })
    expect(refused(result)).toBe(true)
  })
})

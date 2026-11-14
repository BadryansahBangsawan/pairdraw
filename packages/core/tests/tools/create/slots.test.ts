import { describe, expect, test } from 'bun:test'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { ALL_TOOLS } from '@pairdraw/core/tools'
import { SceneGraph } from '@pairdraw/scene-graph'

function tool(name: string) {
  const found = ALL_TOOLS.find((item) => item.name === name)
  if (!found) throw new Error(`No tool ${name}`)
  return (figma: FigmaAPI, args: Record<string, unknown>) => found.execute(figma, args)
}
const createSlot = tool('create_slot')
const getComponents = tool('get_components')

/** A Table component with a Rows frame, and a Row component that belongs in it. */
function table() {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const row = figma.createComponent()
  row.name = 'Row'
  const cell = figma.createComponent()
  cell.name = 'Cell'
  const component = figma.createComponent()
  component.name = 'Table'
  const rows = figma.createFrame()
  rows.name = 'Rows'
  component.appendChild(rows)
  return { graph, figma, component, rows, row, cell }
}

function slotDefinition(graph: SceneGraph, componentId: string) {
  return graph
    .getNode(componentId)
    ?.componentPropertyDefinitions.find((definition) => definition.type === 'SLOT')
}

describe('slot preferred components for agents', () => {
  test('create_slot stores the preferred components, the preferred-only rule, and limits', () => {
    const { graph, figma, component, rows, row } = table()
    expect(
      createSlot(figma, {
        id: rows.id,
        preferred_ids: [row.id],
        preferred_only: true,
        min_children: 1,
        max_children: 20
      })
    ).toEqual({ slot: 'Rows' })
    expect(slotDefinition(graph, component.id)).toMatchObject({
      preferredValues: [row.id],
      slotSettings: { allowPreferredValuesOnly: true, minChildren: 1, maxChildren: 20 }
    })
  })

  test('create_slot on an existing slot replaces its preferred components', () => {
    const { graph, figma, component, rows, row, cell } = table()
    createSlot(figma, { id: rows.id, preferred_ids: [row.id] })
    expect(createSlot(figma, { id: rows.id, preferred_ids: [cell.id] })).toEqual({ slot: 'Rows' })
    expect(slotDefinition(graph, component.id)?.preferredValues).toEqual([cell.id])
  })

  test('create_slot refuses a preferred ID that is not a component, changing nothing', () => {
    const { graph, figma, component, rows } = table()
    expect(createSlot(figma, { id: rows.id, preferred_ids: [rows.id] })).toEqual({
      error: `"${rows.id}" is not a component or component set`
    })
    expect(slotDefinition(graph, component.id)).toBeUndefined()
    expect(createSlot(figma, { id: rows.id, min_children: 3, max_children: 2 })).toEqual({
      error: 'min_children (3) must not be more than max_children (2)'
    })
    expect(slotDefinition(graph, component.id)).toBeUndefined()
  })

  test('create_slot checks a new limit against the one the slot keeps', () => {
    const { graph, figma, component, rows } = table()
    createSlot(figma, { id: rows.id, max_children: 2 })
    expect(createSlot(figma, { id: rows.id, min_children: 5 })).toEqual({
      error: 'min_children (5) must not be more than max_children (2)'
    })
    expect(slotDefinition(graph, component.id)?.slotSettings).toMatchObject({ maxChildren: 2 })
    expect(slotDefinition(graph, component.id)?.slotSettings?.minChildren).toBeUndefined()
  })

  test('create_slot clears a limit given null and keeps the others', () => {
    const { graph, figma, component, rows } = table()
    createSlot(figma, { id: rows.id, min_children: 1, max_children: 2 })
    expect(createSlot(figma, { id: rows.id, max_children: null, min_children: 5 })).toEqual({
      slot: 'Rows'
    })
    const settings = slotDefinition(graph, component.id)?.slotSettings
    expect(settings?.minChildren).toBe(5)
    expect(settings?.maxChildren).toBeUndefined()
  })

  test('get_components lists each slot with its preferred components by name', async () => {
    const { figma, rows, row } = table()
    createSlot(figma, { id: rows.id, preferred_ids: [row.id], preferred_only: true })
    const result = (await getComponents(figma, { source: 'document' })) as {
      components: Array<{ name: string; slots?: unknown }>
    }
    const byName = new Map(result.components.map((item) => [item.name, item]))
    expect(byName.get('Table')?.slots).toEqual([
      { name: 'Rows', preferred: [{ id: row.id, name: 'Row' }], preferredOnly: true }
    ])
    expect(byName.get('Row')).not.toHaveProperty('slots')
  })

  test('get_components keeps a preferred value it cannot resolve as its key', async () => {
    const { graph, figma, component, rows } = table()
    createSlot(figma, { id: rows.id })
    const definition = slotDefinition(graph, component.id)
    if (!definition) throw new Error('slot missing')
    graph.updateNode(component.id, {
      componentPropertyDefinitions: [{ ...definition, preferredValues: ['library-key'] }]
    })
    const result = (await getComponents(figma, { source: 'document', name: 'Table' })) as {
      components: Array<{ slots?: Array<{ preferred: unknown }> }>
    }
    expect(result.components[0]?.slots?.[0]?.preferred).toEqual([{ key: 'library-key' }])
  })
})
